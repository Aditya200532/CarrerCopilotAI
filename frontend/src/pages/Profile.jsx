import { useState } from 'react';
import { Plus, Trash2, Save, Github, Linkedin, Globe } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useFetch } from '../hooks/useApi.js';
import { PageLoader, ErrorBanner, SectionHeader, Badge } from '../components/ui.jsx';

const EMPTY = {
  headline: '', graduationYear: null, education: [], targetRoles: [],
  programmingLanguages: [], frameworks: [], databases: [], tools: [],
  projects: [], certifications: [], links: { github: '', linkedin: '', portfolio: '' },
};

export default function Profile() {
  const { data: initial, loading, error } = useFetch(() => endpoints.profile.get(), []);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const profile = form || (initial ? { ...EMPTY, ...initial } : null);
  if (loading) return <PageLoader />;
  if (error) return <ErrorBanner message={error} />;
  if (!profile) return null;

  const set = (patch) => { setForm({ ...profile, ...patch }); setSaved(false); };

  const save = async () => {
    setSaving(true); setSaveError(null);
    try {
      const payload = { ...profile };
      delete payload._id; delete payload.user; delete payload.createdAt; delete payload.updatedAt; delete payload.__v;
      const res = await endpoints.profile.update(payload);
      setForm({ ...EMPTY, ...res.data });
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Student Profile</h1>
          <p className="page-subtitle">This data powers skill matching, gap analysis and your roadmap.</p>
        </div>
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save profile'}
        </button>
      </div>

      <ErrorBanner message={saveError} />
      {saved && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Profile saved.</div>}

      {/* Basics */}
      <section className="card p-6">
        <SectionHeader title="Basics" />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Headline</label>
            <input className="input" value={profile.headline || ''} onChange={(e) => set({ headline: e.target.value })}
              placeholder="Final-year IT student targeting backend roles" />
          </div>
          <div>
            <label className="label">Graduation year</label>
            <input className="input" type="number" value={profile.graduationYear ?? ''}
              onChange={(e) => set({ graduationYear: e.target.value ? Number(e.target.value) : null })} placeholder="2026" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Target roles (comma separated)</label>
            <input className="input" value={(profile.targetRoles || []).join(', ')}
              onChange={(e) => set({ targetRoles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              placeholder="Java Backend Developer, Full Stack Developer" />
          </div>
        </div>
      </section>

      {/* Education */}
      <section className="card p-6">
        <SectionHeader title="Education" action={
          <button className="btn-secondary" onClick={() => set({ education: [...(profile.education || []), { degree: '', field: '', institution: '', startYear: null, endYear: null, cgpa: null }] })}>
            <Plus size={16} /> Add
          </button>} />
        <div className="space-y-4">
          {(profile.education || []).map((ed, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-6">
              <input className="input md:col-span-2" placeholder="Degree (B.Tech)" value={ed.degree || ''}
                onChange={(e) => updateAt(profile, set, 'education', i, { degree: e.target.value })} />
              <input className="input" placeholder="Field (IT)" value={ed.field || ''}
                onChange={(e) => updateAt(profile, set, 'education', i, { field: e.target.value })} />
              <input className="input md:col-span-2" placeholder="Institution" value={ed.institution || ''}
                onChange={(e) => updateAt(profile, set, 'education', i, { institution: e.target.value })} />
              <div className="flex gap-2">
                <input className="input" type="number" step="0.01" placeholder="CGPA" value={ed.cgpa ?? ''}
                  onChange={(e) => updateAt(profile, set, 'education', i, { cgpa: e.target.value ? Number(e.target.value) : null })} />
                <button className="btn-ghost text-rose-500" onClick={() => set({ education: profile.education.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
          {!profile.education?.length && <p className="text-sm text-slate-400">No education added yet.</p>}
        </div>
      </section>

      {/* Skills */}
      <section className="card p-6">
        <SectionHeader title="Technical skills" subtitle="Rate each 1–5; matching only uses names." />
        <div className="grid gap-6 md:grid-cols-3">
          <SkillGroup label="Programming languages" items={profile.programmingLanguages} field="programmingLanguages" profile={profile} set={set} />
          <SkillGroup label="Frameworks" items={profile.frameworks} field="frameworks" profile={profile} set={set} />
          <SkillGroup label="Databases" items={profile.databases} field="databases" profile={profile} set={set} />
        </div>
        <div className="mt-6">
          <label className="label">Tools (comma separated)</label>
          <input className="input" value={(profile.tools || []).join(', ')}
            onChange={(e) => set({ tools: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="git, docker, postman" />
        </div>
      </section>

      {/* Projects */}
      <section className="card p-6">
        <SectionHeader title="Projects" action={
          <button className="btn-secondary" onClick={() => set({ projects: [...(profile.projects || []), { title: '', description: '', techStack: [], link: '' }] })}>
            <Plus size={16} /> Add project
          </button>} />
        <div className="space-y-4">
          {(profile.projects || []).map((p, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="flex gap-3">
                <input className="input" placeholder="Project title" value={p.title || ''}
                  onChange={(e) => updateAt(profile, set, 'projects', i, { title: e.target.value })} />
                <input className="input" placeholder="Link (GitHub)" value={p.link || ''}
                  onChange={(e) => updateAt(profile, set, 'projects', i, { link: e.target.value })} />
                <button className="btn-ghost text-rose-500" onClick={() => set({ projects: profile.projects.filter((_, j) => j !== i) })}><Trash2 size={16} /></button>
              </div>
              <textarea className="input mt-3" rows={2} placeholder="What does it do? What did you build?" value={p.description || ''}
                onChange={(e) => updateAt(profile, set, 'projects', i, { description: e.target.value })} />
              <input className="input mt-3" placeholder="Tech stack (comma separated)" value={(p.techStack || []).join(', ')}
                onChange={(e) => updateAt(profile, set, 'projects', i, { techStack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            </div>
          ))}
          {!profile.projects?.length && <p className="text-sm text-slate-400">Add projects — interviewers ask about them first.</p>}
        </div>
      </section>

      {/* Links */}
      <section className="card p-6">
        <SectionHeader title="Links" />
        <div className="grid gap-4 md:grid-cols-3">
          <LinkInput icon={Github} placeholder="github.com/you" value={profile.links?.github} onChange={(v) => set({ links: { ...profile.links, github: v } })} />
          <LinkInput icon={Linkedin} placeholder="linkedin.com/in/you" value={profile.links?.linkedin} onChange={(v) => set({ links: { ...profile.links, linkedin: v } })} />
          <LinkInput icon={Globe} placeholder="portfolio.dev" value={profile.links?.portfolio} onChange={(v) => set({ links: { ...profile.links, portfolio: v } })} />
        </div>
      </section>
    </div>
  );
}

function updateAt(profile, set, field, index, patch) {
  const items = [...profile[field]];
  items[index] = { ...items[index], ...patch };
  set({ [field]: items });
}

function SkillGroup({ label, items = [], field, profile, set }) {
  const [name, setName] = useState('');
  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    set({ [field]: [...items, { name: trimmed, proficiency: 3 }] });
    setName('');
  };
  return (
    <div>
      <label className="label">{label}</label>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {items.map((s, i) => (
          <span key={i} className="badge bg-slate-100 text-slate-700 ring-1 ring-slate-200">
            {s.name}
            <select className="ml-1 bg-transparent text-xs font-semibold text-brand-600 outline-none" value={s.proficiency}
              onChange={(e) => updateAt(profile, set, field, i, { proficiency: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="ml-1 text-slate-400 hover:text-rose-500" onClick={() => set({ [field]: items.filter((_, j) => j !== i) })}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input" placeholder={`Add ${label.toLowerCase()}…`} value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button className="btn-secondary shrink-0" onClick={add}><Plus size={16} /></button>
      </div>
    </div>
  );
}

function LinkInput({ icon: Icon, placeholder, value, onChange }) {
  return (
    <div className="relative">
      <Icon size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
      <input className="input !pl-10" placeholder={placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
