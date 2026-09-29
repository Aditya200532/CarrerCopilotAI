import { Interview, InterviewQuestion, InterviewResponse, AIAnalysis } from '../../src/models/index.js';
import { aiService } from '../../src/ai/aiService.js';
import { emit, EVENTS } from '../../src/events/bus.js';

/**
 * Processor: interview-report
 * Payload: { userId, interviewId, analysisId }
 * Builds the Q/A transcript, asks the AI service for the debrief, stores it on
 * the Interview (read path) and in AIAnalysis (audit path), then emits the event.
 */
export async function processInterviewReport(job) {
  const { userId, interviewId, analysisId } = job.data;
  const analysis = await AIAnalysis.findById(analysisId);
  const interview = await Interview.findById(interviewId);
  if (!analysis || !interview) throw new Error('interview or analysis record missing');

  analysis.status = 'processing';
  analysis.startedAt = new Date();
  analysis.attempts += 1;
  await analysis.save();

  try {
    const questions = await InterviewQuestion.find({ interview: interviewId }).sort({ askedAt: 1 }).lean();
    const responses = await InterviewResponse.find({ interview: interviewId }).lean();
    const responseByQuestion = new Map(responses.map((r) => [String(r.question), r]));

    const transcript = questions
      .map((q) => {
        const a = responseByQuestion.get(String(q._id));
        return `[${q.round}] ${q.kind === 'followup' ? 'FOLLOW-UP: ' : 'Q: '}${q.text}\nA: ${a?.text || '(no answer recorded)'}`;
      })
      .join('\n\n');

    const report = await aiService.generateInterviewReport({
      role: interview.targetRole,
      transcript,
      qaCount: questions.length,
    });

    interview.report = {
      overallRating: report.overallRating,
      verdict: report.verdict,
      strengths: report.strengths,
      improvements: report.improvements,
      technicalFeedback: report.technicalFeedback,
      recommendedTopics: report.recommendedTopics,
      roundSummaries: report.roundSummaries,
      generatedAt: new Date(),
    };
    interview.reportAnalysis = analysisId;
    if (interview.status !== 'completed') interview.status = 'completed';
    await interview.save();

    analysis.status = 'completed';
    analysis.result = report;
    analysis.completedAt = new Date();
    await analysis.save();

    emit(EVENTS.INTERVIEW_REPORT_READY, { userId, interviewId, verdict: report.verdict });
    return { interviewId };
  } catch (err) {
    if (analysis.attempts >= 2) {
      analysis.status = 'failed';
      analysis.error = err.message;
      await analysis.save();
      emit(EVENTS.ANALYSIS_FAILED, { userId, analysisType: 'interview-report', analysisId, error: err.message });
    }
    throw err;
  }
}
