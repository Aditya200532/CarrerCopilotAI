import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Briefcase, MapPin, Building2, Loader2 } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch } from '../hooks/useApi.js';
import { PageLoader, ErrorBanner, Badge, EmptyState } from '../components/ui.jsx';
import { Pagination } from '../components/Pagination.jsx';

const TYPES = ['', 'internship', 'full-time', 'placement'];

export default function JobExplorer() {
  const [filters, setFilters] = useState({ search: '', type: '', page: 1, mine: 'false' });
  const [showAdd, setShowAdd] = useState(false);

  const { data, meta, loading, error, refetch } = useFetch(
    () => endpoints.jobs.list(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))),
    [JSON.stringify(filters)]
  );

  const setFilter = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Job Explorer</h1>
          <p className="page-subtitle">Paste job descriptions, search roles and run transparent skill matches.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus size={16} /> Add job description</button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative min-w-56 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
          <input className="input !pl-9" placeholder="Search title, company or keywords…"
            value={filters.search} onChange={(e) => setFilter({ search: e.target.value })} />
        </div>
        <select className="input !w-auto" value={filters.type} onChange={(e) => setFilter({ type: e.target.value })}>
          <option value="">All types</option>
          {TYPES.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-brand-600"
            checked={filters.mine === 'true'}
            onChange={(e) => setFilter({ mine: e.target.checked ? 'true' : 'false' })} />
          My uploads only
        </label>
      </div>

      <ErrorBanner message={error} onRetry={refetch} />
      {loading && <PageLoader label="Searching jobs…" />}

      {!loading && data && (
        <>
          {data.length === 0 ? (
            <EmptyState icon={Briefcase} title="No jobs found"
              subtitle="Paste a job description from any hiring page to analyze it against your profile."
              action={<button className="btn-primary" onClick={() => setShowAdd(true)}>Add job description</button>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.map((job) => (
                <Link key={job._id} to={`/jobs/${job._id}`} className="card p-5 transition hover:border-brand-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">{job.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {job.company && <span className="inline-flex items-center gap-1"><Building2 size={12} />{job.company}</span>}
                        {job.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{job.location}</span>}
                      </div>
                    </div>
                    <Badge tone={job.type === 'internship' ? 'blue' : job.type === 'full-time' ? 'green' : 'violet'}>{job.type}</Badge>
                  </div>
                  {job.requiredSkills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.requiredSkills.slice(0, 6).map((s) => <Badge key={s} tone="slate">{s}</Badge>)}
                      {job.requiredSkills.length > 6 && <Badge tone="slate">+{job.requiredSkills.length - 6}</Badge>}
                    </div>
                  )}
                  {(!job.requiredSkills || job.requiredSkills.length === 0) && (
                    job.skillsExtractedAt ? (
                      <div className="mt-3 text-xs text-slate-400">
                        No skills identified from this description — paste a fuller JD for a real gap analysis.
                      </div>
                    ) : (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-600">
                        <Loader2 size={12} className="animate-spin" /> AI extracting required skills…
                      </div>
                    )
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Server-side pagination — we never load the full collection. */}
      <Pagination meta={meta} onChange={(page) => setFilters({ ...filters, page })} />

      {showAdd && <AddJobModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); refetch(); }} />}
    </div>
  );
}

function AddJobModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', company: '', location: '', type: 'placement', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await endpoints.jobs.create(form);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900">Add job description</h2>
        <p className="mb-4 text-sm text-slate-500">
          Paste the full JD — an AI worker extracts required skills in the background (cached by JD text, so duplicates cost nothing).
        </p>
        <ErrorBanner message={error} />
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Job title *</label>
              <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Java Backend Developer" />
            </div>
            <div>
              <label className="label">Company</label>
              <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {['placement', 'internship', 'full-time', 'other'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Job description * (paste full JD, min 50 chars)</label>
            <textarea className="input font-mono !text-xs" rows={10} required value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Responsibilities: ... Requirements: ..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save & extract skills'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
