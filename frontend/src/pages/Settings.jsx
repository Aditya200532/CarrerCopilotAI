import { useState } from 'react';
import { KeyRound, Cpu, ShieldCheck } from 'lucide-react';
import { endpoints } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useApi.js';
import { SectionHeader, Badge, ErrorBanner } from '../components/ui.jsx';

export default function Settings() {
  const { user } = useAuth();
  const { data: aiStatus } = useFetch(() => endpoints.ai.status().catch(() => null), []);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);

  const changePassword = async (e) => {
    e.preventDefault();
    setError(null); setMsg(null);
    if (pw.newPassword !== pw.confirm) return setError('New passwords do not match');
    if (pw.newPassword.length < 8) return setError('Password must be at least 8 characters');
    setBusy(true);
    try {
      await endpoints.auth.changePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setMsg('Password updated successfully.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Account and platform status.</p>
      </div>

      {/* Account */}
      <div className="card p-6">
        <SectionHeader title="Account" />
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5"><span className="text-slate-500">Name</span><span className="font-medium">{user?.name}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-slate-500">Email</span><span className="font-medium">{user?.email}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-slate-500">Role</span><Badge tone="brand">{user?.role}</Badge></div>
        </div>
      </div>

      {/* AI status */}
      <div className="card p-6">
        <SectionHeader title="AI engine" subtitle="Whether responses come from a live LLM or the built-in local fallback." />
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${aiStatus?.data?.llmConfigured ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Cpu size={20} />
          </div>
          <div className="text-sm">
            <div className="font-semibold text-slate-800">
              Mode: {aiStatus?.data?.mode === 'llm' ? 'Live LLM' : aiStatus ? 'Local fallback' : 'checking…'}
            </div>
            <div className="text-xs text-slate-500">
              {aiStatus?.data?.llmConfigured
                ? 'OPENAI_API_KEY configured — full AI analysis, caching active for reusable answers.'
                : 'Set OPENAI_API_KEY in backend/.env to enable LLM-powered analysis. All features still work with deterministic local analyzers.'}
            </div>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="card p-6">
        <SectionHeader title="Change password" subtitle={<span className="inline-flex items-center gap-1"><ShieldCheck size={13} /> JWT sessions stay valid until they expire.</span>} />
        <ErrorBanner message={error} />
        {msg && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>}
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label"><KeyRound size={13} className="mr-1 inline" />Current password</label>
            <input className="input" type="password" required value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">New password</label>
              <input className="input" type="password" required value={pw.newPassword}
                onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type="password" required value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  );
}
