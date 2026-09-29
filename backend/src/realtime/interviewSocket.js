import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { interviewService } from '../services/interviewService.js';
import { getStrategy } from '../interviews/strategies.js';
import { InterviewQuestion } from '../models/index.js';

/**
 * Live mock-interview engine (socket.io "/interview" namespace).
 *
 * Flow per round:
 *   start → strategy generates questions → ask Q1 → student answers →
 *   optional follow-up (depth-limited) → next question → round complete →
 *   next round → all rounds done → report enqueued (async via BullMQ).
 *
 * Session state is in-memory (single interview at a time per socket) but the
 * full transcript persists to MongoDB after every turn, so a reconnect can
 * resume from the DB.
 */

const MAX_FOLLOWUP_DEPTH = 2;

export function registerInterviewNamespace(io) {
  const nsp = io.of('/interview');

  nsp.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, env.jwtSecret);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  nsp.on('connection', (socket) => {
    const sessions = new Map(); // interviewId -> engine state

    socket.on('interview:start', async ({ interviewId }, ack) => {
      try {
        const interview = await interviewService.getOwned(interviewId, socket.data.userId);
        if (interview.status === 'completed' || interview.status === 'abandoned') {
          return safeAck(ack, { error: `Interview is ${interview.status}` });
        }

        // Recover already-asked primary questions per round (supports reconnect).
        const asked = await InterviewQuestion.find({ interview: interview._id, kind: 'primary' })
          .select('round text').lean();
        const askedByRound = {};
        for (const q of asked) (askedByRound[q.round] ||= []).push(q.text);

        const state = {
          interview,
          roundIdx: interview.rounds.findIndex((r) => r.status !== 'completed'),
          askedByRound,
          questionQueue: [],
          askedCount: 0,
          followupDepth: 0,
          currentQuestionId: null,
          currentQuestionText: null,
        };
        if (state.roundIdx < 0) {
          return safeAck(ack, { error: 'All rounds already completed' });
        }
        sessions.set(String(interview._id), state);

        interview.status = 'in_progress';
        if (!interview.startedAt) interview.startedAt = new Date();
        const active = interview.rounds[state.roundIdx];
        active.status = 'active';
        active.startedAt = new Date();
        await interview.save();

        safeAck(ack, { ok: true, round: active.type, totalRounds: interview.rounds.length });
        socket.emit('interview:state', publicState(state));
        await askNextQuestion(socket, state);
      } catch (err) {
        safeAck(ack, { error: err.message });
      }
    });

    socket.on('interview:answer', async ({ interviewId, questionId, text }, ack) => {
      const state = sessions.get(String(interviewId));
      if (!state) return safeAck(ack, { error: 'No active session — call interview:start first' });
      if (!text || String(text).trim().length < 2) {
        return safeAck(ack, { error: 'Answer is too short' });
      }
      try {
        await interviewService.recordResponse(state.interview, questionId, socket.data.userId, String(text).trim());
        safeAck(ack, { ok: true });

        const allowFollowUps = state.interview.settings.allowFollowUps !== false;
        if (allowFollowUps && state.followupDepth < MAX_FOLLOWUP_DEPTH) {
          await askFollowUp(socket, state, String(text).trim());
        } else {
          await askNextQuestion(socket, state);
        }
      } catch (err) {
        safeAck(ack, { error: err.message });
      }
    });

    socket.on('interview:skip', async ({ interviewId }, ack) => {
      const state = sessions.get(String(interviewId));
      if (!state) return safeAck(ack, { error: 'No active session' });
      safeAck(ack, { ok: true });
      state.followupDepth = 0;
      await askNextQuestion(socket, state);
    });

    socket.on('interview:end', async ({ interviewId }, ack) => {
      const state = sessions.get(String(interviewId));
      if (!state) return safeAck(ack, { error: 'No active session' });
      try {
        const interview = await interviewService.getOwned(interviewId, socket.data.userId);
        interview.status = 'completed';
        interview.completedAt = new Date();
        for (const r of interview.rounds) {
          if (r.status !== 'completed') { r.status = 'completed'; r.completedAt = new Date(); }
        }
        await interview.save();
        const analysisId = await interviewService.enqueueReport(interview);
        sessions.delete(String(interviewId));
        safeAck(ack, { ok: true, reportAnalysisId: String(analysisId) });
        socket.emit('interview:complete', { interviewId, reportStatus: 'queued' });
      } catch (err) {
        safeAck(ack, { error: err.message });
      }
    });

    socket.on('disconnect', () => sessions.clear());
  });

  // ---- engine helpers -----------------------------------------------------

  async function askNextQuestion(socket, state) {
    const roundState = state.interview.rounds[state.roundIdx];
    const strategy = getStrategy(roundState.type);
    const maxQ = state.interview.settings.maxQuestionsPerRound || 3;

    if (state.questionQueue.length === 0) {
      if (state.askedCount >= maxQ) return completeRound(socket, state);
      socket.emit('interview:thinking', { round: roundState.type });
      const ctx = await interviewService.buildContext(state.interview);
      ctx.askedBefore = state.askedByRound[roundState.type] || [];
      const out = await strategy.generateQuestions(ctx);
      state.questionQueue = (out.questions || []).slice(0, maxQ - state.askedCount);
      if (state.questionQueue.length === 0) return completeRound(socket, state);
    }

    const q = state.questionQueue.shift();
    state.askedCount += 1;
    state.followupDepth = 0;
    (state.askedByRound[roundState.type] ||= []).push(q.text);

    const doc = await interviewService.recordQuestion(state.interview._id, {
      round: roundState.type, kind: 'primary', text: q.text,
      topic: q.topic, difficulty: q.difficulty, fromCache: Boolean(q.cached),
    });
    roundState.questionsAsked = (roundState.questionsAsked || 0) + 1;
    await state.interview.save();

    state.currentQuestionId = doc._id;
    state.currentQuestionText = q.text;
    socket.emit('interview:question', {
      questionId: String(doc._id),
      round: roundState.type,
      roundLabel: strategy.label,
      text: q.text,
      topic: q.topic,
      difficulty: q.difficulty,
      questionNumber: state.askedCount,
      totalQuestions: maxQ,
    });
  }

  async function askFollowUp(socket, state, answerText) {
    const roundState = state.interview.rounds[state.roundIdx];
    const strategy = getStrategy(roundState.type);
    socket.emit('interview:thinking', { round: roundState.type, followUp: true });

    const fu = await strategy.generateFollowUp({
      questionText: state.currentQuestionText,
      answerText,
    });
    const doc = await interviewService.recordQuestion(state.interview._id, {
      round: roundState.type, kind: 'followup', parent: state.currentQuestionId,
      text: fu.text, topic: fu.topic,
    });

    state.followupDepth += 1;
    state.currentQuestionId = doc._id;
    state.currentQuestionText = fu.text;
    socket.emit('interview:question', {
      questionId: String(doc._id),
      round: roundState.type,
      roundLabel: strategy.label,
      text: fu.text,
      topic: fu.topic,
      kind: 'followup',
      questionNumber: state.askedCount,
    });
  }

  async function completeRound(socket, state) {
    const roundState = state.interview.rounds[state.roundIdx];
    const allDone = await interviewService.completeRound(state.interview, roundState.type);
    socket.emit('interview:round-complete', {
      round: roundState.type,
      questionsAsked: state.askedCount,
      interviewComplete: allDone,
    });

    if (allDone) {
      const analysisId = await interviewService.enqueueReport(state.interview);
      socket.emit('interview:complete', {
        interviewId: String(state.interview._id),
        reportStatus: 'queued',
        reportAnalysisId: String(analysisId),
      });
      state.questionQueue = [];
      return;
    }

    // Advance to next round and keep the momentum going.
    state.roundIdx += 1;
    state.askedCount = 0;
    state.questionQueue = [];
    const next = state.interview.rounds[state.roundIdx];
    next.status = 'active';
    next.startedAt = new Date();
    await state.interview.save();
    socket.emit('interview:state', publicState(state));
    await askNextQuestion(socket, state);
  }

  function publicState(state) {
    return {
      interviewId: String(state.interview._id),
      targetRole: state.interview.targetRole,
      currentRound: state.interview.rounds[state.roundIdx]?.type,
      rounds: state.interview.rounds.map((r) => ({ type: r.type, status: r.status, questionsAsked: r.questionsAsked || 0 })),
    };
  }
}

function safeAck(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}
