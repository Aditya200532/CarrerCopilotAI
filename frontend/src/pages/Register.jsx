import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorBanner } from '../components/ui.jsx';
import { AuthShell } from './Login.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setBusy(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <AuthShell title="Create your account" subtitle="Start your personalized placement journey.">
      <ErrorBanner message={error} />
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input" required value={form.name} onChange={set('name')} placeholder="Aditi Sharma" />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={form.email} onChange={set('email')} placeholder="you@college.edu" />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" required value={form.password} onChange={set('password')} placeholder="Min 8 characters" />
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input className="input" type="password" required value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
