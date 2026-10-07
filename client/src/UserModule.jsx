import { useCallback, useEffect, useState } from 'react';
import { authApi } from './authApi.js';
import { Icon } from './Icons.jsx';

// Modules a staff user can be granted. Dashboard is always available and Users
// is admin-only, so neither appears here. Must match ACCESS_MODULES in
// server/src/app.js and the navigation ids in App.jsx.
export const ACCESS_MODULES = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'sales', label: 'Sales' },
  { id: 'expenditures', label: 'Expenses' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'rooms', label: 'Rooms' },
  { id: 'shed-constructions', label: 'Shed costs' },
  { id: 'feeds', label: 'Feed' },
  { id: 'weights', label: 'Weights' },
  { id: 'treatments', label: 'Treatments' },
  { id: 'reports', label: 'Reports' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function ModuleChecklist({ selected, onToggle }) {
  const allSelected = ACCESS_MODULES.every((module) => selected.includes(module.id));
  function toggleAll() {
    onToggle(allSelected ? [] : ACCESS_MODULES.map((module) => module.id));
  }
  return (
    <div className="module-access">
      <div className="module-access__head">
        <span>Module access <small>Dashboard is always available</small></span>
        <button className="button button--ghost" onClick={toggleAll} type="button">
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>
      <div className="module-access__grid">
        {ACCESS_MODULES.map((module) => (
          <label className="module-access__item" key={module.id}>
            <input
              checked={selected.includes(module.id)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selected, module.id]
                  : selected.filter((id) => id !== module.id);
                onToggle(next);
              }}
              type="checkbox"
            />
            <span>{module.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function UsersPage({ currentUser, onAdd, onReset, onEditAccess }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setUsers(await authApi.listUsers()); }
    catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  async function toggle(user) {
    if (!window.confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.displayName}?`)) return;
    try {
      await authApi.setUserActive(user.id, !user.isActive);
      await loadUsers();
    } catch (toggleError) { setError(toggleError.message); }
  }

  return (
    <div className="users-page">
      <section className="panel users-toolbar"><div><span className="eyebrow">Access control</span><h2>Application users</h2><p>Create staff or administrators and control their access.</p></div><button className="button button--primary" onClick={onAdd} type="button"><Icon name="plus" size={17} /> Create user</button></section>
      {error && <div className="report-alert report-alert--error" role="alert"><Icon name="alert" size={19} /><span>{error}</span><button className="button button--ghost" onClick={loadUsers} type="button">Retry</button></div>}
      <section className="stats-grid user-stats" aria-label="User summary">
        <article className="stat-card"><div className="stat-card__top"><span>Total users</span><span className="stat-card__icon"><Icon name="users" size={20} /></span></div><strong>{users.length}</strong><small>All accounts</small></article>
        <article className="stat-card stat-card--blue"><div className="stat-card__top"><span>Active users</span><span className="stat-card__icon"><Icon name="check" size={20} /></span></div><strong>{users.filter((user) => user.isActive).length}</strong><small>Can sign in</small></article>
        <article className="stat-card stat-card--orange"><div className="stat-card__top"><span>Administrators</span><span className="stat-card__icon"><Icon name="users" size={20} /></span></div><strong>{users.filter((user) => user.role === 'admin').length}</strong><small>Manage user access</small></article>
      </section>
      <section className="panel user-list-panel">
        <div className="panel__heading"><div><span className="eyebrow">Accounts</span><h3>User access list</h3></div><span className="record-count">{users.length} users</span></div>
        {loading ? <div className="loading-state users-loading"><span className="loader" /><strong>Loading users…</strong></div> : (
          <div className="table-wrap"><table className="user-table"><thead><tr><th>User</th><th>Username</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong>{user.id === currentUser.id && <small className="cell-note">Current account</small>}</td><td>{user.username}</td><td><span className={`user-role user-role--${user.role}`}>{user.role}</span></td><td><span className={`user-status ${user.isActive ? 'user-status--active' : ''}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td><td>{formatDate(user.createdAt)}</td><td><div className="user-actions"><button className="button button--soft" onClick={() => onReset(user, loadUsers)} type="button">Reset password</button>{user.role === 'staff' && <button className="button button--soft" onClick={() => onEditAccess(user, loadUsers)} type="button">Edit access</button>}<button className="button button--ghost" disabled={user.id === currentUser.id} onClick={() => toggle(user)} type="button">{user.isActive ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
    </div>
  );
}

function FormShell({ title, description, error, children, onClose, onSubmit, saving, submitLabel }) {
  return <form onSubmit={onSubmit}><div className="modal__header"><div><span className="eyebrow">User administration</span><h2>{title}</h2><p>{description}</p></div><button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button></div><div className="modal__body">{error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}{children}</div><div className="modal__footer"><button className="button button--ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary" disabled={saving} type="submit">{saving ? 'Saving…' : submitLabel} <Icon name="check" size={17} /></button></div></form>;
}

export function UserForm({ onClose, onCreated }) {
  const [form, setForm] = useState({
    displayName: '', username: '', role: 'staff', password: '', confirmPassword: '',
    allowedModules: ACCESS_MODULES.map((module) => module.id),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const setModules = (allowedModules) => setForm((current) => ({ ...current, allowedModules }));
  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      // Admins are unrestricted, so only send a module list for staff.
      const payload = form.role === 'admin' ? { ...form, allowedModules: [] } : form;
      await authApi.createUser(payload);
      onCreated();
    } catch (submissionError) { setError(submissionError.message); setSaving(false); }
  }
  return (
    <FormShell description="Create a staff or administrator account." error={error} onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Create user" title="Create application user">
      <div className="form-grid">
        <label className="field"><span>Display name</span><input autoFocus maxLength="100" name="displayName" onChange={change} required value={form.displayName} /></label>
        <label className="field"><span>Username</span><input maxLength="60" minLength="3" name="username" onChange={change} pattern="[A-Za-z0-9._-]+" required value={form.username} /></label>
        <label className="field"><span>Role</span><select name="role" onChange={change} value={form.role}><option value="staff">Staff</option><option value="admin">Administrator</option></select></label>
        <label className="field"><span>Password</span><input minLength="6" name="password" onChange={change} required type="password" value={form.password} /></label>
        <label className="field"><span>Confirm password</span><input minLength="6" name="confirmPassword" onChange={change} required type="password" value={form.confirmPassword} /></label>
      </div>
      {form.role === 'staff'
        ? <ModuleChecklist onToggle={setModules} selected={form.allowedModules} />
        : <p className="module-access-note"><Icon name="check" size={15} /> Administrators have access to all modules.</p>}
    </FormShell>
  );
}

export function EditAccessForm({ onClose, onSaved, user }) {
  const [selected, setSelected] = useState(
    Array.isArray(user.allowedModules)
      ? user.allowedModules
      : ACCESS_MODULES.map((module) => module.id),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await authApi.updateUserModules(user.id, selected);
      onSaved();
    } catch (submissionError) { setError(submissionError.message); setSaving(false); }
  }
  return (
    <FormShell description={`Choose which modules ${user.displayName} can access.`} error={error} onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Save access" title="Edit module access">
      <ModuleChecklist onToggle={setSelected} selected={selected} />
    </FormShell>
  );
}

export function ResetPasswordForm({ onClose, onReset, user }) {
  const [passwords, setPasswords] = useState({ password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = (event) => setPasswords((current) => ({ ...current, [event.target.name]: event.target.value }));
  async function submit(event) { event.preventDefault(); setError(''); if (passwords.password !== passwords.confirmPassword) { setError('Passwords do not match.'); return; } setSaving(true); try { await authApi.resetPassword(user.id, passwords.password); onReset(); } catch (submissionError) { setError(submissionError.message); setSaving(false); } }
  return <FormShell description={`Set a new password for ${user.displayName}. Their existing sessions will be signed out.`} error={error} onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Reset password" title="Reset user password"><div className="form-grid"><label className="field"><span>New password</span><input autoFocus minLength="6" name="password" onChange={change} required type="password" value={passwords.password} /></label><label className="field"><span>Confirm password</span><input minLength="6" name="confirmPassword" onChange={change} required type="password" value={passwords.confirmPassword} /></label></div></FormShell>;
}
