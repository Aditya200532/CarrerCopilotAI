import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send, SkipForward, Loader2, Radio, CheckCircle2, XCircle, Flag } from 'lucide-react';
import { endpoints, socketOrigin } from '../api/client.js';
import { Badge } from '../components/ui.jsx';
import { useFetch } from '../hooks/useApi.js';

/**
 * Live interview room.
 * Talks to the "/interview" socket namespace:
 *   client → interview:start / interview:answer / interview:skip / interview:end
 *   server → interview:state / interview:question / interview:thinking /
 *            interview:round-complete / interview:complete
 */
export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: interview } = useFetch(() => endpoints.interviews.get(id), [id]);

  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [started, setStarted] = useState(false);
  const [state, setState] = useState(null); // rounds overview
  const [question, setQuestion] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [answer, setAnswer] = useState('');
  const [transcript, setTranscript] = useState([]);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [ending, setEnding] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('cp_token');
    const socket = io(`${socketOrigin}/interview`, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => setError(err.message));

    socket.on('interview:state', (s) => setState(s));
    socket.on('interview:thinking', () => { setThinking(true); setQuestion(null); });
    socket.on('interview:question', (q) => {
      setThinking(false);
      setQuestion(q);
      setTranscript((t) => [...t, { role: 'interviewer', ...q }]);
    });
    socket.on('interview:round-complete', (r) => {
      setToast(`Round complete: ${r.round} (${r.questionsAsked} questions)`);
      setTimeout(() => setToast(null), 3000);
    });
    socket.on('interview:complete', () => {
      setQuestion(null);
      setThinking(false);
      navigate(`/interview-report/${id}?queued=1`);
    });

    return () => socket.disconnect();
  }, [id, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, thinking]);

  const startInterview = () => {
    setError(null);
    socketRef.current?.emit('interview:start', { interviewId: id }, (res) => {
      if (res?.error) return setError(res.error);
      setStarted(true);
    });
  };

  const sendAnswer = () => {
    const text = answer.trim();
    if (!text || !question) return;
    setTranscript((t) => [...t, { role: 'you', text }]);
    setAnswer('');
    setQuestion(null);
    setThinking(true);
    socketRef.current?.emit('interview:answer', { interviewId: id, questionId: question.questionId, text }, (res) => {
      if (res?.error) {
        setError(res.error);
        setThinking(false);
      }
    });
  };

  const skip = () => {
    setQuestion(null);
    setThinking(true);
    socketRef.current?.emit('interview:skip', { interviewId: id });
  };

  const endInterview = () => {
    setEnding(true);
    socketRef.current?.emit('interview:end', { interviewId: id }, (res) => {
      if (res?.error) { setError(res.error); setEnding(false); }
    });
  };

  if (!interview) return null;

  const isDone = interview.status === 'completed' || interview.status === 'abandoned';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="flex items-center gap-2">
            <Radio size={16} className={connected ? 'text-emerald-500' : 'text-slate-300'} />
            <h1 className="font-bold text-slate-900">{interview.targetRole} — Mock Interview</h1>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {(state?.rounds || interview.rounds || []).map((r) => (
              <Badge key={r.type}
                tone={r.status === 'completed' ? 'green' : (state?.currentRound === r.type ? 'brand' : 'slate')}>
                {r.status === 'completed' && <CheckCircle2 size={11} />}
                {r.type}
              </Badge>
            ))}
          </div>
        </div>
        <button className="btn-secondary !border-rose-200 !text-rose-600 hover:!bg-rose-50" onClick={endInterview} disabled={ending}>
          <Flag size={15} /> {ending ? 'Finishing…' : 'End & get report'}
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span><XCircle size={14} className="mr-1 inline" />{error}</span>
          <button className="font-semibold underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {toast && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{toast}</div>
      )}

      {/* Pre-start screen */}
      {!started && !isDone && (
        <div className="card flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Radio size={26} /></div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Ready when you are</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              The AI interviewer will ask questions round by round and follow up on your answers — like a real interview.
              Answer out loud to yourself first, then type your response.
            </p>
          </div>
          <button className="btn-primary !px-8" onClick={startInterview} disabled={!connected}>
            {!connected ? 'Connecting…' : 'Begin interview'}
          </button>
        </div>
      )}

      {isDone && !started && (
        <div className="card flex flex-col items-center gap-4 p-12 text-center">
          <CheckCircle2 size={36} className="text-emerald-500" />
          <h2 className="text-lg font-bold">This interview is {interview.status}</h2>
          <button className="btn-primary" onClick={() => navigate(`/interview-report/${id}`)}>View report</button>
        </div>
      )}

      {/* Conversation */}
      {started && (
        <div className="card flex flex-col">
          <div className="max-h-[50vh] min-h-64 space-y-4 overflow-y-auto p-6">
            {transcript.map((m, i) =>
              m.role === 'interviewer' ? (
                <div key={i} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">AI</div>
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                    <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      {m.roundLabel || m.round} {m.kind === 'followup' && <Badge tone="violet">follow-up</Badge>}
                      {m.difficulty && <Badge tone={m.difficulty === 'hard' ? 'red' : m.difficulty === 'medium' ? 'amber' : 'green'}>{m.difficulty}</Badge>}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-800">{m.text}</p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-sm leading-relaxed text-white">{m.text}</div>
                </div>
              )
            )}
            {thinking && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Interviewer is thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Answer box */}
          <div className="border-t border-slate-100 p-4">
            {question ? (
              <div className="flex items-end gap-2">
                <textarea
                  className="input max-h-40 min-h-16 flex-1 resize-y"
                  rows={2}
                  placeholder="Type your answer… (be specific — follow-ups probe depth)"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendAnswer(); }}
                />
                <div className="flex flex-col gap-2">
                  <button className="btn-primary" onClick={sendAnswer} disabled={!answer.trim()}><Send size={15} /> Answer</button>
                  <button className="btn-secondary !py-1.5 !text-xs" onClick={skip}><SkipForward size={13} /> Skip</button>
                </div>
              </div>
            ) : (
              !thinking && <div className="py-3 text-center text-sm text-slate-400">Waiting for the next question…</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
