import { useEffect, useState } from 'react';
import { authApi } from './authApi.js';
import { Icon } from './Icons.jsx';

function AuthForm({ mode, onAuthenticated }) {
  const setup = mode === 'setup';
  const [form, setForm] = useState({ username: '', displayName: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (setup && form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const result = setup
        ? await authApi.setup({ username: form.username, displayName: form.displayName, password: form.password })
        : await authApi.login({ username: form.username, password: form.password });
      onAuthenticated(result.user);
    } catch (submissionError) {
      setError(submissionError.message);
      setSaving(false);
    }
  }

  return (
    <form className="auth-card" onSubmit={submit}>
      <div className="auth-brand"><span><Icon name="herd" size={31} /></span><div><strong>CSR AGRO VENTURES</strong><small>Livestock manager</small></div></div>
      <div className="auth-card__heading"><span className="eyebrow">{setup ? 'First-time setup' : 'Secure access'}</span><h1>{setup ? 'Create administrator' : 'Welcome back'}</h1><p>{setup ? 'Create the first administrator account to protect this application.' : 'Sign in with your username and password.'}</p></div>
      {error && <div className="form-error" role="alert"><Icon name="alert" size={17} />{error}</div>}
      <div className="auth-fields">
        {setup && <label className="field"><span>Display name</span><input autoFocus maxLength="100" name="displayName" onChange={change} placeholder="Administrator name" required value={form.displayName} /></label>}
        <label className="field"><span>Username</span><input autoComplete="username" autoFocus={!setup} maxLength="60" minLength="3" name="username" onChange={change} pattern="[A-Za-z0-9._-]+" placeholder="Username" required value={form.username} /></label>
        <label className="field"><span>Password</span><input autoComplete={setup ? 'new-password' : 'current-password'} maxLength="128" minLength="10" name="password" onChange={change} placeholder="Minimum 10 characters" required type="password" value={form.password} /></label>
        {setup && <label className="field"><span>Confirm password</span><input autoComplete="new-password" maxLength="128" minLength="10" name="confirmPassword" onChange={change} placeholder="Enter password again" required type="password" value={form.confirmPassword} /></label>}
      </div>
      <button className="button button--primary button--full auth-submit" disabled={saving} type="submit">{saving ? 'Please wait…' : setup ? 'Create admin and continue' : 'Sign in'} <Icon name="arrow" size={17} /></button>
      <p className="auth-security-note">Passwords are securely hashed. Sessions use protected HTTP-only cookies.</p>
    </form>
  );
}

export function AuthGate({ children }) {
  const [state, setState] = useState({ loading: true, setupRequired: false, user: null, error: '' });

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const status = await authApi.status();
        if (!active) return;
        if (status.setupRequired) {
          setState({ loading: false, setupRequired: true, user: null, error: '' });
          return;
        }
        try {
          const result = await authApi.me();
          if (active) setState({ loading: false, setupRequired: false, user: result.user, error: '' });
        } catch {
          if (active) setState({ loading: false, setupRequired: false, user: null, error: '' });
        }
      } catch (error) {
        if (active) setState({ loading: false, setupRequired: false, user: null, error: error.message });
      }
    }
    check();
    return () => { active = false; };
  }, []);

  if (state.loading) return <div className="auth-screen"><div className="loading-state"><span className="loader" /><strong>Checking secure access…</strong></div></div>;
  if (state.error) return <div className="auth-screen"><div className="auth-card auth-card--error"><Icon name="alert" size={30} /><h1>Application unavailable</h1><p>{state.error}</p><button className="button button--primary" onClick={() => window.location.reload()} type="button">Retry</button></div></div>;
  if (!state.user) return <div className="auth-screen"><AuthForm mode={state.setupRequired ? 'setup' : 'login'} onAuthenticated={(user) => setState({ loading: false, setupRequired: false, user, error: '' })} /></div>;

  return children({
    user: state.user,
    onLogout: async () => {
      try { await authApi.logout(); } finally { setState({ loading: false, setupRequired: false, user: null, error: '' }); }
    },
  });
}
