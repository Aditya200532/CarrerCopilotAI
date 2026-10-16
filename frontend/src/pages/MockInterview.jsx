import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, Loader2, PlayCircle, FileText } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch } from '../hooks/useApi.js';
import { PageLoader, ErrorBanner, Badge, SectionHeader, EmptyState } from '../components/ui.jsx';
import { Pagination } from '../components/Pagination.jsx';

export default function MockInterview() {
  const { data: rounds } = useFetch(() => endpoints.interviews.rounds(), []);
  const [page, setPage] = useState(1);
  const { data: interviews, meta, refetch } = useFetch(() => endpoints.interviews.list({ page }), [page]);

  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [selected, setSelected] = useState(['resume', 'dsa']);
  const [settings, setSettings] = useState({ maxQuestionsPerRound: 3, difficulty: 'mixed', allowFollowUps: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const toggleRound = (r) =>
    setSelected((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));

  const start = async () => {
    setBusy(true); setError(null);
    try {
      const res = await endpoints.interviews.create({ targetRole, rounds: selected, settings });
      // Client-side nav (not window.location): a full page load to this deep
      // path breaks on static hosts without an SPA fallback.
      navigate(`/mock-interview/${res.data.interviewId}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">AI Mock Interview</h1>
        <p className="page-subtitle">A live, turn-based interview over WebSockets — the AI asks, follows up on your answers, and writes a full debrief.</p>
      </div>

      <ErrorBanner message={error} />

      <div className="card p-6">
        <SectionHeader title="Set up your interview" />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Target role</label>
            <input className="input" list="role-options" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
            <datalist id="role-options">
              {['Software Engineer', 'Java Backend Developer', 'Full Stack Developer', 'Frontend Developer', 'Data Engineer'].map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label">Questions per round</label>
            <select className="input" value={settings.maxQuestionsPerRound}
              onChange={(e) => setSettings({ ...settings, maxQuestionsPerRound: Number(e.target.value) })}>
              {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <label className="label">Rounds (pick one or more)</label>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {(rounds || []).map((r) => (
              <button key={r.round} type="button" onClick={() => toggleRound(r.round)}
                className={`rounded-xl border p-3.5 text-left transition ${selected.includes(r.round) ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-300' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{r.label}</span>
                  <input type="checkbox" readOnly checked={selected.includes(r.round)} className="h-4 w-4 accent-brand-600" />
                </div>
                <p className="mt-1 text-xs text-slate-500">{r.focus?.[0] || r.round}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-6">
          <div>
            <label className="label">Difficulty</label>
            <select className="input !w-40" value={settings.difficulty}
              onChange={(e) => setSettings({ ...settings, difficulty: e.target.value })}>
              {['easy', 'medium', 'hard', 'mixed'].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={settings.allowFollowUps}
              onChange={(e) => setSettings({ ...settings, allowFollowUps: e.target.checked })} />
            Allow follow-up questions
          </label>
          <button className="btn-primary ml-auto" onClick={start} disabled={busy || selected.length === 0}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
            Start interview
          </button>
        </div>
      </div>

      <div className="card p-6">
        <SectionHeader title="Interview history" />
        {interviews?.length ? (
          <>
            <ul className="divide-y divide-slate-100">
              {interviews.map((iv) => (
                <li key={iv._id}>
                  <Link to={iv.status === 'completed' ? `/interview-report/${iv._id}` : `/mock-interview/${iv._id}`}
                    className="flex items-center justify-between py-3.5 transition hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        {iv.status === 'completed' ? <FileText size={16} /> : <PlayCircle size={16} />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{iv.targetRole}</div>
                        <div className="text-xs text-slate-400">
                          {(iv.rounds || []).map((r) => r.type).join(' · ')} — {new Date(iv.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {iv.report?.overallRating && <Badge tone="violet">{iv.report.overallRating}/10</Badge>}
                      <Badge tone={iv.status === 'completed' ? 'green' : iv.status === 'in_progress' ? 'blue' : iv.status === 'abandoned' ? 'slate' : 'amber'}>
                        {iv.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination meta={meta} onChange={setPage} />
          </>
        ) : (
          <EmptyState icon={Video} title="No interviews yet" subtitle="Configure your first mock interview above." />
        )}
      </div>
    </div>
  );
}
