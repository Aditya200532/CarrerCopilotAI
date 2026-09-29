import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CheckCircle2, TrendingUp, MessageSquareText, Sparkles, Award,
} from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch } from '../hooks/useApi.js';
import { PageLoader, ErrorBanner, Badge, SectionHeader, EmptyState } from '../components/ui.jsx';

const VERDICTS = {
  'not-ready': { tone: 'red', label: 'Not ready yet' },
  'needs-practice': { tone: 'amber', label: 'Needs practice' },
  ready: { tone: 'blue', label: 'Ready' },
  strong: { tone: 'green', label: 'Strong candidate' },
};

export default function InterviewReport() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data, loading, error, refetch } = useFetch(() => endpoints.interviews.report(id), [id]);

  // If we just arrived from the interview room, the report is being generated
  // asynchronously — poll the REST endpoint until it lands.
  if (!loading && data && !data.interview.report && params.get('queued')) {
    setTimeout(refetch, 3000);
  }

  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!data) return null;

  const { interview, transcript } = data;
  const report = interview.report;

  return (
    <div className="space-y-6">
      <Link to="/mock-interview" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft size={16} /> All interviews
      </Link>

      <div>
        <h1 className="page-title">Interview Report — {interview.targetRole}</h1>
        <p className="page-subtitle">
          {new Date(interview.completedAt || interview.createdAt).toLocaleString()} · {transcript?.length || 0} questions
        </p>
      </div>

      {!report && (
        <div className="card flex flex-col items-center gap-3 p-12 text-center">
          <Loader2 className="animate-spin text-brand-600" size={32} />
          <h2 className="text-lg font-bold">Generating your report…</h2>
          <p className="max-w-md text-sm text-slate-500">
            The AI worker is reviewing your full transcript in the background queue. This page refreshes automatically,
            and you'll get a notification when it's ready.
          </p>
        </div>
      )}

      {report && (
        <>
          {/* Score header */}
          <div className="card flex flex-wrap items-center justify-between gap-6 p-6">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3.5"
                    strokeDasharray={`${(report.overallRating / 10) * 100} 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-slate-800">
                  {report.overallRating}<span className="text-xs font-medium text-slate-400">/10</span>
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">Overall rating</div>
                <Badge tone={VERDICTS[report.verdict]?.tone || 'slate'}>
                  <Award size={12} /> {VERDICTS[report.verdict]?.label || report.verdict}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/roadmap" className="btn-secondary"><TrendingUp size={16} /> Update roadmap</Link>
              <Link to="/mock-interview" className="btn-primary">Practice again</Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <ReportBlock icon={CheckCircle2} tone="text-emerald-600" title="Areas of strength" items={report.strengths} />
            <ReportBlock icon={TrendingUp} tone="text-amber-600" title="Areas requiring practice" items={report.improvements} />
            <ReportBlock icon={MessageSquareText} tone="text-sky-600" title="Technical feedback" items={report.technicalFeedback} />
            <ReportBlock icon={Sparkles} tone="text-violet-600" title="Recommended topics" items={report.recommendedTopics} />
          </div>

          {report.roundSummaries?.length > 0 && (
            <div className="card p-6">
              <SectionHeader title="Round-wise summary" />
              <ul className="space-y-3">
                {report.roundSummaries.map((rs, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize text-slate-800">{rs.round?.replace(/-/g, ' ')}</span>
                      <Badge tone={rs.rating >= 7 ? 'green' : rs.rating >= 5 ? 'amber' : 'red'}>{rs.rating}/10</Badge>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500">{rs.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Transcript */}
          <div className="card p-6">
            <SectionHeader title="Full transcript" subtitle="Every question, follow-up and your answers" />
            {transcript?.length ? (
              <ul className="space-y-4">
                {transcript.map((t) => (
                  <li key={t._id} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      <Badge tone="slate">{t.round}</Badge>
                      {t.kind === 'followup' && <Badge tone="violet">follow-up</Badge>}
                      {t.topic && <span>{t.topic}</span>}
                    </div>
                    <div className="text-sm font-semibold text-slate-800">Q: {t.text}</div>
                    <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                      <span className="font-medium text-slate-500">Your answer: </span>
                      {t.answer || <em className="text-slate-400">(skipped / not answered)</em>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No transcript recorded" />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ReportBlock({ icon: Icon, tone, title, items }) {
  return (
    <div className="card p-6">
      <div className={`mb-3 flex items-center gap-2 text-sm font-bold ${tone}`}><Icon size={17} /> {title}</div>
      {items?.length ? (
        <ul className="space-y-2">
          {items.map((it, i) => <li key={i} className="text-sm leading-relaxed text-slate-600">• {it}</li>)}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">—</p>
      )}
    </div>
  );
}
