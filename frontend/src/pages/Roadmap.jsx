import { useEffect, useState } from 'react';
import { Map, Loader2, CheckCircle2, Circle, PlayCircle, Sparkles, CalendarDays } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch, useAnalysisPolling } from '../hooks/useApi.js';
import { PageLoader, ErrorBanner, Badge, Progress, SectionHeader, EmptyState } from '../components/ui.jsx';

const CATEGORY_TONES = {
  dsa: 'violet', language: 'blue', sql: 'amber', backend: 'green',
  'system-design': 'red', lld: 'brand', project: 'blue', aptitude: 'slate',
  'soft-skills': 'amber', other: 'slate',
};

export default function Roadmap() {
  const { data: plan, loading, error, refetch } = useFetch(() => endpoints.plan.active(), []);
  const { data: jobs } = useFetch(() => endpoints.jobs.list({ limit: 50 }), []);
  const [jobId, setJobId] = useState('');
  const [weeks, setWeeks] = useState(6);
  const [requesting, setRequesting] = useState(false);
  const [analysisId, setAnalysisId] = useState(null);
  const [requestError, setRequestError] = useState(null);

  const { analysis } = useAnalysisPolling(analysisId, { intervalMs: 2500 });
  const generating = analysis?.status === 'queued' || analysis?.status === 'processing';

  // When generation completes, reload the plan.
  useEffect(() => {
    if (analysis?.status === 'completed') {
      setAnalysisId(null);
      refetch();
    }
  }, [analysis?.status]);

  const generate = async () => {
    setRequesting(true); setRequestError(null);
    try {
      const res = await endpoints.analysis.requestRoadmap({ jobId: jobId || null, weeksAvailable: Number(weeks) });
      setAnalysisId(res.data.analysisId);
    } catch (err) {
      setRequestError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  const toggleTask = async (task) => {
    const next = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed';
    await endpoints.plan.updateTask(task._id, next);
    refetch();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Preparation Roadmap</h1>
        <p className="page-subtitle">Generated from your skill gaps, DSA weak areas and target role — by the background AI worker.</p>
      </div>

      {/* Generator */}
      <div className="card p-6">
        <SectionHeader title={plan ? 'Regenerate roadmap' : 'Generate your roadmap'}
          subtitle={plan ? 'Regenerating archives the current plan and replaces its tasks.' : 'Pick a target job (optional) and your available time.'} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="label">Target job (optional)</label>
            <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">General — use my target roles</option>
              {(jobs || []).map((j) => <option key={j._id} value={j._id}>{j.title}{j.company ? ` — ${j.company}` : ''}</option>)}
            </select>
          </div>
          <div className="w-36">
            <label className="label">Weeks available</label>
            <input className="input" type="number" min={1} max={24} value={weeks} onChange={(e) => setWeeks(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={generate} disabled={requesting || generating}>
            {requesting || generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'AI worker generating…' : 'Generate roadmap'}
          </button>
        </div>
        <ErrorBanner message={requestError || (analysis?.status === 'failed' ? analysis.error : null)} />
        {generating && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
            <Loader2 size={16} className="animate-spin" />
            Your roadmap is being generated in the background queue. You can navigate away — we'll notify you when it's ready.
          </div>
        )}
      </div>

      {!plan && !generating && (
        <EmptyState icon={Map} title="No active roadmap"
          subtitle="Generate one above — it combines your skill-gap results and DSA weak areas into prioritized tasks." />
      )}

      {plan && (
        <>
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-lg font-bold text-slate-900">{plan.plan.title}</h2>
                {plan.plan.targetRole && <Badge tone="brand">{plan.plan.targetRole}</Badge>}
                {plan.plan.overview && <p className="mt-3 text-sm leading-relaxed text-slate-600">{plan.plan.overview}</p>}
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-brand-600">{plan.progress.percent}%</div>
                <div className="text-xs text-slate-400">{plan.progress.completed} of {plan.progress.total} tasks done</div>
                {plan.plan.targetDate && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                    <CalendarDays size={12} /> target {new Date(plan.plan.targetDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
            <Progress value={plan.progress.percent} className="mt-4" />
          </div>

          <div className="card p-6">
            <SectionHeader title="Tasks" subtitle="Click a task to cycle: pending → in progress → completed" />
            <ul className="space-y-3">
              {plan.tasks.map((t) => (
                <li key={t._id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    t.status === 'completed' ? 'border-emerald-200 bg-emerald-50/40' : t.status === 'in_progress' ? 'border-sky-200 bg-sky-50/40' : 'border-slate-200 hover:border-brand-300'
                  }`}
                  onClick={() => toggleTask(t)}>
                  <span className="mt-0.5 shrink-0">
                    {t.status === 'completed' ? <CheckCircle2 size={20} className="text-emerald-500" />
                      : t.status === 'in_progress' ? <PlayCircle size={20} className="text-sky-500" />
                      : <Circle size={20} className="text-slate-300" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-semibold ${t.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{t.title}</span>
                      <Badge tone={CATEGORY_TONES[t.category] || 'slate'}>{t.category}</Badge>
                      <Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'slate'}>{t.priority}</Badge>
                    </div>
                    {t.description && <p className="mt-1 text-sm text-slate-500">{t.description}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-400">
                      {t.estimatedHours ? <span>~{t.estimatedHours}h</span> : null}
                      {t.dueDate ? <span>due {new Date(t.dueDate).toLocaleDateString()}</span> : null}
                      {t.topic ? <span>topic: {t.topic}</span> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
