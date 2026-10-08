import { useMemo, useState } from 'react';
import { Icon } from './Icons.jsx';

export function TagsPage({ canManage, tags, onAdd, onEdit, onDelete }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return tags;
    return tags.filter((tag) => [tag.code, tag.label, tag.notes]
      .some((value) => String(value || '').toLocaleLowerCase().includes(q)));
  }, [tags, query]);

  if (tags.length === 0) {
    return (
      <section className="panel page-panel">
        <div className="empty-state">
          <span className="empty-state__icon"><Icon name="herd" size={28} /></span>
          <h3>No tags defined</h3>
          <p>Create animal ID tags here. They appear as suggestions when recording weights.</p>
          {canManage && <button className="button button--primary" onClick={onAdd} type="button"><Icon name="plus" size={17} /> Add first tag</button>}
        </div>
      </section>
    );
  }

  return (
    <div className="tags-page">
      <section className="panel tags-toolbar">
        <div><span className="eyebrow">Master data</span><h2>Animal ID tags</h2><p>Predefined tags used across the app. Edit the values any time.</p></div>
        <label className="field tags-search"><span className="sr-only">Search tags</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Search code, label, or notes" value={query} /></label>
      </section>

      <section className="panel page-panel">
        <div className="panel__heading"><div><span className="eyebrow">Tags</span><h3>Tag list</h3></div><span className="record-count">{filtered.length} of {tags.length} tags</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Label</th><th>Notes</th>{canManage && <th><span className="sr-only">Actions</span></th>}</tr></thead>
            <tbody>
              {filtered.map((tag) => (
                <tr key={tag.id}>
                  <td><strong className="animal-tag">{tag.code}</strong></td>
                  <td>{tag.label || '—'}</td>
                  <td><span className="table-notes">{tag.notes || '—'}</span></td>
                  {canManage && <td>
                    <div className="row-actions">
                      <button className="button button--soft" onClick={() => onEdit(tag)} title="Edit tag" type="button">Edit</button>
                      <button aria-label={`Delete tag ${tag.code}`} className="icon-button" onClick={() => onDelete(tag)} title="Delete tag" type="button"><Icon name="trash" size={17} /></button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Field({ className = '', hint, label, children }) {
  return <label className={`field ${className}`}><span>{label}{hint && <small>{hint}</small>}</span>{children}</label>;
}

export function TagForm({ initial = {}, onClose, onSubmit }) {
  const isEdit = Boolean(initial.id);
  const [form, setForm] = useState({
    code: initial.code || '',
    label: initial.label || '',
    notes: initial.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
    } catch (submissionError) {
      setError(submissionError.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="modal__header">
        <div><span className="eyebrow">Master data</span><h2>{isEdit ? 'Edit tag' : 'Add tag'}</h2><p>{isEdit ? 'Update this animal ID tag.' : 'Create a new animal ID tag.'}</p></div>
        <button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
      </div>
      <div className="modal__body">
        {error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}
        <div className="form-grid">
          <Field label="Tag code"><input autoFocus maxLength="60" name="code" onChange={change} placeholder="e.g. TAG-01" required value={form.code} /></Field>
          <Field hint="Optional" label="Label"><input maxLength="100" name="label" onChange={change} placeholder="e.g. Front shed goat" value={form.label} /></Field>
          <Field className="field--full" hint="Optional" label="Notes"><textarea maxLength="500" name="notes" onChange={change} placeholder="Any details about this tag" rows="3" value={form.notes} /></Field>
        </div>
      </div>
      <div className="modal__footer">
        <button className="button button--ghost" onClick={onClose} type="button">Cancel</button>
        <button className="button button--primary" disabled={saving} type="submit">{saving ? 'Saving…' : (isEdit ? 'Save changes' : 'Save tag')} <Icon name="check" size={17} /></button>
      </div>
    </form>
  );
}
