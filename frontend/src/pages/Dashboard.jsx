import { Link } from 'react-router-dom';
import {
  Target, Code2, Map, FileSearch, Video, Briefcase, ChevronRight, Flame, AlertTriangle,
} from 'lucide-react';
import { useFetch } from '../hooks/useApi.js';
import { endpoints } from '../api/client.js';
import { PageLoader, ErrorBanner, StatCard, Progress, Badge, SectionHeader, EmptyState } from '../components/ui.jsx';

export default function Dashboard() {
  const { data: stats, loading, error, refetch } = useFetch(() => endpoints.dashboard.stats(), []);

  if (loading) return <PageLoader label="Loading your dashboard…" />;
  if (error) return <ErrorBanner message={error} onRetry={refetch} />;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {stats.targetRoles?.length ? `Targeting: ${stats.targetRoles.join(', ')}` : 'Set your target roles in Profile to personalize everything.'}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Map} label="Plan progress" tone="text-brand-600 bg-brand-50"
          value={stats.plan ? `${stats.plan.progress.percent}%` : '—'}
          sub={stats.plan ? `${stats.plan.progress.completed}/${stats.plan.progress.total} tasks` : 'No active plan'} />
        <StatCard icon={Code2} label="DSA problems" tone="text-emerald-600 bg-emerald-50"
          value={stats.dsa.solved} sub={`${stats.dsa.logged} logged`} />
        <StatCard icon={FileSearch} label="Resume readiness" tone="text-violet-600 bg-violet-50"
          value={stats.resume.readinessScore != null ? `${stats.resume.readinessScore}/10` : '—'}
          sub={stats.resume.analyzed ? 'Analyzed' : 'Not analyzed yet'} />
        <StatCard icon={Briefcase} label="Saved jobs" tone="text-sky-600 bg-sky-50"
          value={stats.savedJobs} sub={`${stats.unreadNotifications} unread alerts`} />
      </div>

      {/* Profile completeness nudge */}
      {stats.profileComplete < 100 && (
        <Link to="/profile" className="card flex items-center justify-between p-5 transition hover:border-brand-300">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle size={20} /></div>
            <div>
              <div className="text-sm font-semibold">Complete your profile ({stats.profileComplete}%)</div>
              <div className="text-xs text-slate-500">Better profile → better gap analysis and roadmaps.</div>
            </div>
          </div>
          <Progress value={stats.profileComplete} className="!w-32" tone="bg-amber-500" />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming tasks */}
        <div className="card p-6 lg:col-span-2">
          <SectionHeader title="Upcoming tasks" subtitle="From your active preparation plan"
            action={<Link to="/roadmap" className="btn-ghost text-brand-600">Open roadmap <ChevronRight size={16} /></Link>} />
          {stats.upcomingTasks?.length ? (
            <ul className="divide-y divide-slate-100">
              {stats.upcomingTasks.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">{t.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <Badge tone={t.priority === 'high' ? 'red' : t.priority === 'medium' ? 'amber' : 'slate'}>{t.priority}</Badge>
                      <span className="uppercase">{t.category}</span>
                      {t.dueDate && <span>due {new Date(t.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Badge tone={t.status === 'in_progress' ? 'blue' : 'slate'}>{t.status.replace('_', ' ')}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Map} title="No active plan"
              subtitle="Generate a personalized roadmap from your skill gap analysis."
              action={<Link to="/roadmap" className="btn-primary">Create roadmap</Link>} />
          )}
        </div>

        {/* DSA weak areas */}
        <div className="card p-6">
          <SectionHeader title="DSA weak areas"
            action={<Link to="/dsa" className="btn-ghost text-brand-600">All stats</Link>} />
          {stats.dsa.weakAreas?.length ? (
            <ul className="space-y-3">
              {stats.dsa.weakAreas.map((w) => (
                <li key={w.topic}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-slate-700">{w.topic.replace(/-/g, ' ')}</span>
                    <span className="text-xs font-semibold text-rose-600">{w.score}/100</span>
                  </div>
                  <Progress value={w.score} tone="bg-rose-500" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              {stats.dsa.logged === 0
                ? 'Log solved problems to see topic-wise strengths.'
                : 'No weak areas detected yet. Keep going!'}
            </p>
          )}
          <Link to="/dsa" className="btn-secondary mt-5 w-full"><Flame size={16} /> Log DSA progress</Link>
        </div>
      </div>

      {/* Recent interviews + quick actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <SectionHeader title="Recent mock interviews"
            action={<Link to="/mock-interview" className="btn-ghost text-brand-600">Start new <ChevronRight size={16} /></Link>} />
          {stats.recentInterviews?.length ? (
            <ul className="divide-y divide-slate-100">
              {stats.recentInterviews.map((iv) => (
                <li key={iv._id}>
                  <Link to={iv.status === 'completed' ? `/interview-report/${iv._id}` : `/mock-interview/${iv._id}`}
                    className="flex items-center justify-between py-3 transition hover:bg-slate-50">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{iv.targetRole}</div>
                      <div className="text-xs text-slate-400">
                        {iv.rounds?.length || 0} rounds · {new Date(iv.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {iv.report?.overallRating && <Badge tone="violet">{iv.report.overallRating}/10</Badge>}
                      <Badge tone={iv.status === 'completed' ? 'green' : iv.status === 'in_progress' ? 'blue' : 'slate'}>{iv.status}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Video} title="No interviews yet"
              subtitle="Practice with an AI interviewer across resume, DSA, SQL, backend, LLD and system-design rounds."
              action={<Link to="/mock-interview" className="btn-primary">Start a mock interview</Link>} />
          )}
        </div>

        <div className="card p-6">
          <SectionHeader title="Quick actions" />
          <div className="space-y-2.5">
            <QuickAction to="/resume-analyzer" icon={FileSearch} label="Upload / re-analyze resume" />
            <QuickAction to="/jobs" icon={Briefcase} label="Add a job description" />
            <QuickAction to="/skill-gap" icon={Target} label="Run skill-gap analysis" />
            <QuickAction to="/mock-interview" icon={Video} label="Practice interview" />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700">
      <Icon size={18} className="text-brand-600" /> {label}
      <ChevronRight size={16} className="ml-auto text-slate-300" />
    </Link>
  );
}
