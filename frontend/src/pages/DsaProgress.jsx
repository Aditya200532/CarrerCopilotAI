import { useState } from 'react';
import { Plus, Code2, Trash2, TrendingDown, TrendingUp, Lightbulb } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch } from '../hooks/useApi.js';
import { PageLoader, ErrorBanner, Badge, Progress, SectionHeader, StatCard, EmptyState } from '../components/ui.jsx';
import { Pagination } from '../components/Pagination.jsx';

const DIFF_TONE = { easy: 'green', medium: 'amber', hard: 'red' };
const STATUS_TONE = { solved: 'green', attempted: 'blue', revisit: 'amber' };

export default function DsaProgress() {
  const { data: topics } = useFetch(() => endpoints.dsa.topics(), []);
  const { data: stats, loading, error, refetch } = useFetch(() => endpoints.dsa.stats(), []);
  const [page, setPage] = useState(1);
  const [topicFilter, setTopicFilter] = useState('');
  const { data: problems, meta } = useFetch(
    () => endpoints.dsa.list({ page, limit: 10, ...(topicFilter ? { topic: topicFilter } : {}) }),
    [page, topicFilter]
  );
  const [showAdd, setShowAdd] = useState(false);

  const remove = async (id) => {
    await endpoints.dsa.remove(id);
    refetch();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">DSA Progress</h1>
          <p className="page-subtitle">Log problems you solve anywhere — we track topic strengths, not judge your code.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Log a problem</button>
      </div>

      <ErrorBanner message={error} onRetry={refetch} />

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Code2} label="Solved" value={stats.totals.solved} sub={`${stats.totals.logged} logged`} />
            <StatCard icon={TrendingUp} label="Strong topics" tone="text-emerald-600 bg-emerald-50"
              value={stats.strongAreas.length} sub={stats.strongAreas.slice(0, 2).map((s) => s.topic).join(', ') || '—'} />
            <StatCard icon={TrendingDown} label="Weak topics" tone="text-rose-600 bg-rose-50"
              value={stats.weakAreas.length} sub={stats.weakAreas.slice(0, 2).map((w) => w.topic).join(', ') || '—'} />
            <StatCard icon={Lightbulb} label="Difficulty mix" tone="text-amber-600 bg-amber-50"
              value={`${stats.totals.easy}/${stats.totals.medium}/${stats.totals.hard}`} sub="easy / medium / hard" />
          </div>

          {/* Topic grid */}
          <div className="card p-6">
            <SectionHeader title="Topic strengths" subtitle="Score = solve ratio weighted by difficulty, penalized by revisits & attempts" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {stats.topics.map((t) => (
                <button key={t.topic}
                  onClick={() => { setTopicFilter(topicFilter === t.topic ? '' : t.topic); setPage(1); }}
                  className={`rounded-xl border p-3 text-left transition ${topicFilter === t.topic ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold capitalize text-slate-700">{t.topic.replace(/-/g, ' ')}</span>
                    {t.confidence === 'no-data'
                      ? <Badge tone="slate">new</Badge>
                      : <span className={`text-xs font-bold ${t.score >= 75 ? 'text-emerald-600' : t.score >= 55 ? 'text-amber-600' : 'text-rose-600'}`}>{t.score}</span>}
                  </div>
                  <Progress value={t.score} className="mt-2"
                    tone={t.score >= 75 ? 'bg-emerald-500' : t.score >= 55 ? 'bg-amber-500' : t.score > 0 ? 'bg-rose-500' : 'bg-slate-200'} />
                  <div className="mt-1 text-[11px] text-slate-400">{t.total} problems{t.confidence === 'low-data' ? ' · low data' : ''}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {stats.recommendations?.length > 0 && (
            <div className="card p-6">
              <SectionHeader title="What to focus on next" subtitle="Feeds directly into roadmap generation" />
              <ul className="space-y-3">
                {stats.recommendations.map((r, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2">
                      <Badge tone="red">{r.topic.replace(/-/g, ' ')}</Badge>
                      <span className="text-sm text-slate-500">{r.reason}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{r.action}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Problem log */}
          <div className="card p-6">
            <SectionHeader title="Problem log"
              subtitle={topicFilter ? `Filtered: ${topicFilter.replace(/-/g, ' ')} (click topic again to clear)` : 'Everything you have logged'} />
            {problems?.length ? (
              <>
                <ul className="divide-y divide-slate-100">
                  {problems.map((p) => (
                    <li key={p._id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        {p.url ? (
                          <a href={p.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-brand-600 hover:underline">{p.title}</a>
                        ) : (
                          <span className="text-sm font-medium text-slate-800">{p.title}</span>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <Badge tone={DIFF_TONE[p.difficulty]}>{p.difficulty}</Badge>
                          <Badge tone="slate">{p.topic.replace(/-/g, ' ')}</Badge>
                          <span>{p.platform}</span>
                          {p.attempts > 1 && <span>{p.attempts} attempts</span>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                        <button className="btn-ghost !px-2 text-rose-500" onClick={() => remove(p._id)}><Trash2 size={15} /></button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Pagination meta={meta} onChange={setPage} />
              </>
            ) : (
              <EmptyState icon={Code2} title="Nothing logged yet"
                subtitle="Solved something on LeetCode or GfG? Log it here to build your topic profile."
                action={<button className="btn-primary" onClick={() => setShowAdd(true)}>Log your first problem</button>} />
            )}
          </div>
        </>
      )}

      {showAdd && <AddProblemModal topics={topics || []} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); refetch(); }} />}
    </div>
  );
}

function AddProblemModal({ topics, onClose, onAdded }) {
  const [form, setForm] = useState({
    title: '', platform: 'leetcode', url: '', topic: 'arrays', difficulty: 'medium', status: 'solved', attempts: 1, notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await endpoints.dsa.add(form);
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Log a problem</h2>
        <ErrorBanner message={error} />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Problem title *</label>
            <input className="input" required value={form.title} onChange={set('title')} placeholder="Two Sum" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Platform</label>
              <select className="input" value={form.platform} onChange={set('platform')}>
                {['leetcode', 'geeksforgeeks', 'codeforces', 'hackerrank', 'other'].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Topic *</label>
              <select className="input" value={form.topic} onChange={set('topic')}>
                {topics.map((t) => <option key={t} value={t}>{t.replace(/-/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={set('difficulty')}>
                {['easy', 'medium', 'hard'].map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {['solved', 'attempted', 'revisit'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">URL</label>
            <input className="input" value={form.url} onChange={set('url')} placeholder="https://leetcode.com/problems/…" />
          </div>
          <div>
            <label className="label">Notes (approach, what you learned)</label>
            <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Log problem'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
