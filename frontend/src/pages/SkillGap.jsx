import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Loader2, CheckCircle2, XCircle, Zap, Sparkles } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch, useAnalysisPolling } from '../hooks/useApi.js';
import { ErrorBanner, Badge, Progress, SectionHeader, PageLoader, EmptyState } from '../components/ui.jsx';

export default function SkillGap() {
  const { data: jobs, loading: jobsLoading } = useFetch(() => endpoints.jobs.list({ limit: 50, mine: 'false' }), []);
  const { data: latest } = useFetch(() => endpoints.analysis.latest('skill-gap').catch(() => ({ data: null })), []);

  const [jobId, setJobId] = useState('');
  const [analysisId, setAnalysisId] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const [requesting, setRequesting] = useState(false);

  const { analysis, done } = useAnalysisPolling(analysisId);
  const result = analysis?.result || latest?.result || null;
  const status = analysisId ? analysis?.status : null;

  const request = async () => {
    if (!jobId) return;
    setRequesting(true); setRequestError(null);
    try {
      const res = await endpoints.analysis.requestSkillGap(jobId);
      setAnalysisId(res.data.analysisId);
    } catch (err) {
      setRequestError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  if (jobsLoading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Skill Gap Analysis</h1>
        <p className="page-subtitle">
          Deterministic comparison of your skills (profile + resume) against a target job, with AI prioritization on top.
        </p>
      </div>

      <div className="card p-6">
        <SectionHeader title="Choose a target job" />
        {!jobs?.length ? (
          <EmptyState icon={Target} title="No jobs yet"
            subtitle="Add job descriptions first, then compare your profile against them."
            action={<Link to="/jobs" className="btn-primary">Go to Job Explorer</Link>} />
        ) : (
          <div className="flex flex-wrap gap-3">
            <select className="input max-w-md flex-1" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">Select a job…</option>
              {jobs.map((j) => (
                <option key={j._id} value={j._id}>{j.title}{j.company ? ` — ${j.company}` : ''}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={request} disabled={!jobId || requesting}>
              {requesting || status === 'queued' || status === 'processing'
                ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
              Analyze gap
            </button>
          </div>
        )}
        <ErrorBanner message={requestError} />
        {(status === 'queued' || status === 'processing') && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            <Loader2 size={16} className="animate-spin" />
            {status === 'queued' ? 'Queued — waiting for an AI worker…' : 'Worker is analyzing your profile vs the job…'}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-6">
          <div className="card p-6">
            <SectionHeader
              title={`Gap vs "${result.job?.title || 'target job'}"`}
              subtitle={result.comparison?.summary}
              action={result.job?.id ? <Link to={`/jobs/${result.job.id}`} className="btn-ghost text-brand-600">View job</Link> : null} />

            <div className="mb-6">
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-600">Required-skill coverage</span>
                <span className="font-bold text-brand-600">{result.comparison?.coveragePercent}%</span>
              </div>
              <Progress value={result.comparison?.coveragePercent} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <GapColumn tone="green" icon={CheckCircle2} title="You already have" items={result.comparison?.matched} />
              <GapColumn tone="red" icon={XCircle} title="You need to learn" items={result.comparison?.missing} />
            </div>

            {result.dsaWeakAreas?.length > 0 && (
              <div className="mt-6 rounded-xl bg-amber-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <Zap size={16} /> DSA weak areas factored into your plan
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.dsaWeakAreas.map((t) => <Badge key={t} tone="amber">{t.replace(/-/g, ' ')}</Badge>)}
                </div>
              </div>
            )}
          </div>

          {result.advice && (
            <div className="card p-6">
              <SectionHeader title="AI prioritization" subtitle="Which gaps to close first, and why" />
              <p className="mb-5 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {result.advice.overallAssessment}
              </p>
              {result.advice.reasoning?.length > 0 && (
                <ol className="space-y-3">
                  {result.advice.reasoning.map((r, i) => (
                    <li key={i} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</span>
                      <div>
                        <span className="text-sm font-semibold capitalize text-slate-800">{r.skill}</span>
                        <p className="mt-0.5 text-sm text-slate-500">{r.why}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {result.advice.quickWins?.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700"><Sparkles size={14} /> Quick wins</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.advice.quickWins.map((s) => <Badge key={s} tone="green">{s}</Badge>)}
                  </div>
                </div>
              )}
              {result.missingCount === 0 && null}
              <div className="mt-6 flex justify-end">
                <Link to="/roadmap" className="btn-primary">Turn this gap into a roadmap →</Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GapColumn({ tone, icon: Icon, title, items }) {
  const color = { green: 'text-emerald-600', red: 'text-rose-600' }[tone];
  return (
    <div>
      <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${color}`}><Icon size={16} /> {title}</div>
      {items?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => <Badge key={s} tone={tone}>{s}</Badge>)}
        </div>
      ) : (
        <p className="text-sm text-slate-400">None</p>
      )}
    </div>
  );
}
