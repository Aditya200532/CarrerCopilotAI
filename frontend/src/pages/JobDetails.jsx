import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, MapPin, CheckCircle2, XCircle, Star, Target, Loader2 } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch } from '../hooks/useApi.js';
import { PageLoader, ErrorBanner, Badge, Progress, SectionHeader } from '../components/ui.jsx';

export default function JobDetails() {
  const { id } = useParams();
  const { data: job, loading, error, refetch } = useFetch(() => endpoints.jobs.get(id), [id]);
  const [match, setMatch] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const runMatch = async () => {
    setMatchLoading(true);
    try {
      const res = await endpoints.jobs.match(id);
      setMatch(res.data);
    } finally {
      setMatchLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!job) return null;

  // Only "extracting" while the worker hasn't run yet — a finished extraction that found
  // nothing shouldn't keep the button disabled forever.
  const extracting = !job.requiredSkills?.length && !job.skillsExtractedAt;

  return (
    <div className="space-y-6">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> Back to jobs
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              {job.company && <span className="inline-flex items-center gap-1.5"><Building2 size={14} />{job.company}</span>}
              {job.location && <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{job.location}</span>}
              <Badge tone={job.type === 'internship' ? 'blue' : 'green'}>{job.type}</Badge>
              <Badge tone="slate">{job.experienceLevel}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={runMatch} disabled={matchLoading || extracting}>
              {matchLoading ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
              Match against my profile
            </button>
            <Link to="/skill-gap" className="btn-secondary">Full gap analysis</Link>
          </div>
        </div>

        {extracting && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <Loader2 size={16} className="animate-spin" />
            AI worker is extracting required skills from the description… refresh in a few seconds.
            <button className="ml-auto font-semibold underline" onClick={refetch}>Refresh</button>
          </div>
        )}

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Required skills</div>
            <div className="flex flex-wrap gap-1.5">
              {(job.requiredSkills || []).map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
              {!job.requiredSkills?.length && (
                <span className="text-sm text-slate-400">
                  {job.skillsExtractedAt ? 'None found in this description — paste a fuller JD.' : '—'}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Nice to have</div>
            <div className="flex flex-wrap gap-1.5">
              {(job.niceToHaveSkills || []).map((s) => <Badge key={s} tone="violet">{s}</Badge>)}
              {!job.niceToHaveSkills?.length && <span className="text-sm text-slate-400">—</span>}
            </div>
          </div>
        </div>

        {job.responsibilities?.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-slate-700">Responsibilities</div>
            <ul className="space-y-1 text-sm text-slate-600">
              {job.responsibilities.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </div>
        )}

        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">Full job description</summary>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm text-slate-600">{job.description}</pre>
        </details>
      </div>

      {/* Transparent match — every row explainable, no black-box score */}
      {match && (
        <div className="card p-6">
          <SectionHeader title={`Your match — ${match.comparison.coveragePercent}% coverage`}
            subtitle={match.comparison.summary} />
          <Progress value={match.comparison.coveragePercent} className="mb-6" />
          <div className="grid gap-6 md:grid-cols-2">
            <MatchColumn tone="green" icon={CheckCircle2} title="Skills you already have" items={match.comparison.matched} />
            <MatchColumn tone="red" icon={XCircle} title="Skills to learn (required)" items={match.comparison.missing} />
            <MatchColumn tone="blue" icon={Star} title="Bonus skills you have" items={match.comparison.bonusMatched} />
            <MatchColumn tone="slate" icon={Star} title="Bonus skills missing" items={match.comparison.bonusMissing} />
          </div>
          {match.comparison.missing.length > 0 && (
            <div className="mt-6 flex items-center justify-between rounded-xl bg-brand-50 px-5 py-4">
              <div className="text-sm text-brand-800">
                Missing {match.comparison.missing.length} required skill{match.comparison.missing.length > 1 ? 's' : ''}?
                Generate a roadmap that targets exactly these gaps.
              </div>
              <Link to="/roadmap" className="btn-primary shrink-0">Build my roadmap</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchColumn({ tone, icon: Icon, title, items }) {
  const color = { green: 'text-emerald-600', red: 'text-rose-600', blue: 'text-sky-600', slate: 'text-slate-400' }[tone];
  return (
    <div>
      <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${color}`}><Icon size={16} /> {title}</div>
      {items?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((s) => <Badge key={s} tone={tone === 'slate' ? 'slate' : tone}>{s}</Badge>)}
        </div>
      ) : (
        <p className="text-sm text-slate-400">None</p>
      )}
    </div>
  );
}
