import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch } from '../hooks/useApi.js';
import { PageLoader, ErrorBanner, Badge, EmptyState } from '../components/ui.jsx';
import { Pagination } from '../components/Pagination.jsx';

const TYPE_TONES = {
  'analysis-complete': 'green',
  'analysis-failed': 'red',
  'interview-scheduled': 'blue',
  'interview-report-ready': 'violet',
  'task-completed': 'amber',
  'plan-generated': 'brand',
  system: 'slate',
};

export default function Notifications() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const { data, meta, loading, error, refetch } = useFetch(
    () => endpoints.notifications.list({ page, unread: onlyUnread ? 'true' : undefined }),
    [page, onlyUnread]
  );
  const [busyId, setBusyId] = useState(null);

  const markAll = async () => {
    await endpoints.notifications.markAllRead();
    refetch();
  };

  const open = async (n) => {
    if (!n.read) {
      setBusyId(n._id);
      await endpoints.notifications.markRead(n._id).catch(() => {});
      setBusyId(null);
    }
    if (n.link) navigate(n.link);
    else refetch();
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Delivered through the event-driven notification service{meta ? ` · ${meta.total} total` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={onlyUnread}
              onChange={(e) => { setOnlyUnread(e.target.checked); setPage(1); }} />
            Unread only
          </label>
          <button className="btn-secondary" onClick={markAll}><CheckCheck size={16} /> Mark all read</button>
        </div>
      </div>

      <ErrorBanner message={error} onRetry={refetch} />

      {data?.length ? (
        <div className="card divide-y divide-slate-100">
          {data.map((n) => (
            <button key={n._id} onClick={() => open(n)}
              className={`flex w-full items-start gap-4 p-5 text-left transition hover:bg-slate-50 ${n.read ? 'opacity-60' : ''}`}>
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${n.read ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-600'}`}>
                {busyId === n._id ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{n.title}</span>
                  <Badge tone={TYPE_TONES[n.type] || 'slate'}>{n.type.replace(/-/g, ' ')}</Badge>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                </div>
                <p className="mt-1 text-sm text-slate-500">{n.message}</p>
                <div className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bell} title={onlyUnread ? 'No unread notifications' : 'Nothing yet'}
          subtitle="Analysis completions, interview reports and task milestones show up here — and in the topbar bell in realtime." />
      )}

      <Pagination meta={meta} onChange={setPage} />
    </div>
  );
}
