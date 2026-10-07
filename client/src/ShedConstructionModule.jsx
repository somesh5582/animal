import { useMemo, useState } from 'react';
import { Icon } from './Icons.jsx';

const currency = import.meta.env.VITE_CURRENCY || 'INR';
const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat('en-IN');

// Keep in sync with SHED_CONSTRUCTION_CATEGORIES in server/src/app.js.
export const SHED_CONSTRUCTION_CATEGORIES = [
  'Materials',
  'Labor',
  'Roofing',
  'Flooring',
  'Electrical',
  'Plumbing & Water',
  'Fencing',
  'Equipment & Fittings',
  'Transport',
  'Food',
  'Other',
];

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function sumAmount(rows) {
  return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
}

function SummaryCard({ icon, label, note, value, tone = '' }) {
  return (
    <article className={`stat-card expenditure-stat ${tone ? `expenditure-stat--${tone}` : ''}`}>
      <div className="stat-card__top">
        <span>{label}</span>
        <span className="stat-card__icon"><Icon name={icon} size={20} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function ShedConstructionPage({ canManage, entries, onAdd, onDelete }) {
  const currentDate = today();
  const monthPrefix = currentDate.slice(0, 7);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', category: '', query: '' });

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase();
    return entries.filter((entry) => {
      if (filters.startDate && entry.constructionDate < filters.startDate) return false;
      if (filters.endDate && entry.constructionDate > filters.endDate) return false;
      if (filters.category && entry.category !== filters.category) return false;
      if (!query) return true;
      return [entry.shedName, entry.category, entry.paidTo, entry.remarks]
        .some((value) => String(value || '').toLocaleLowerCase().includes(query));
    });
  }, [entries, filters]);

  const todayRows = entries.filter((entry) => entry.constructionDate === currentDate);
  const monthRows = entries.filter((entry) => entry.constructionDate.startsWith(monthPrefix));
  const invalidRange = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);

  const byCategory = useMemo(() => {
    const grouped = new Map();
    for (const entry of filtered) {
      grouped.set(entry.category, (grouped.get(entry.category) || 0) + Number(entry.amount || 0));
    }
    return [...grouped.entries()].sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  function change(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  if (entries.length === 0) {
    return (
      <section className="panel page-panel">
        <div className="empty-state">
          <span className="empty-state__icon expenditure-empty-icon"><Icon name="room" size={28} /></span>
          <h3>No shed construction costs recorded</h3>
          <p>Track money spent building sheds — materials, labor, roofing, and more — grouped by category.</p>
          {canManage && <button className="button button--primary" onClick={onAdd} type="button"><Icon name="plus" size={17} /> Add first construction cost</button>}
        </div>
      </section>
    );
  }

  return (
    <div className="expenditure-page">
      <section className="stats-grid expenditure-stats" aria-label="Shed construction summary">
        <SummaryCard icon="calendar" label="Today" note={`${todayRows.length} records on ${formatDate(currentDate)}`} tone="orange" value={formatMoney(sumAmount(todayRows))} />
        <SummaryCard icon="calendar" label="This month" note={`${monthRows.length} records in current month`} tone="red" value={formatMoney(sumAmount(monthRows))} />
        <SummaryCard icon="room" label="Filtered total" note={`${filtered.length} matching records`} tone="blue" value={formatMoney(sumAmount(filtered))} />
        <SummaryCard icon="reports" label="All records" note="Complete shed construction ledger" value={numberFormatter.format(entries.length)} />
      </section>

      <section className="panel expenditure-filter-panel">
        <div className="expenditure-filter-heading"><div><span className="eyebrow">Find construction costs</span><h2>Filter construction history</h2></div><button className="button button--ghost" onClick={() => setFilters({ startDate: '', endDate: '', category: '', query: '' })} type="button">Clear filters</button></div>
        <div className="expenditure-filter-grid">
          <label className="field"><span>From date</span><input max={filters.endDate || undefined} name="startDate" onChange={change} type="date" value={filters.startDate} /></label>
          <label className="field"><span>To date</span><input min={filters.startDate || undefined} name="endDate" onChange={change} type="date" value={filters.endDate} /></label>
          <label className="field"><span>Category</span>
            <select name="category" onChange={change} value={filters.category}>
              <option value="">All categories</option>
              {SHED_CONSTRUCTION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="field"><span>Shed, paid to, or remarks</span><input name="query" onChange={change} placeholder="Search construction cost" value={filters.query} /></label>
        </div>
        {invalidRange && <div className="form-error expenditure-filter-error"><Icon name="alert" size={17} />Start date must be on or before end date.</div>}
      </section>

      {byCategory.length > 0 && !invalidRange && (
        <section className="panel">
          <div className="panel__heading"><div><span className="eyebrow">Breakdown</span><h3>Spend by category</h3></div><span className="record-count">{byCategory.length} categories</span></div>
          <div className="species-list">
            {byCategory.map(([category, amount]) => {
              const total = sumAmount(filtered) || 1;
              const percentage = Math.round((amount / total) * 100);
              return (
                <div className="species-row" key={category}>
                  <div className="species-row__meta"><strong>{category}</strong><span>{formatMoney(amount)}</span></div>
                  <span>{percentage}%</span>
                  <div className="progress-track"><span style={{ width: `${percentage}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel expenditure-history">
        <div className="panel__heading"><div><span className="eyebrow">Construction ledger</span><h3>Shed construction expenditures</h3></div><span className="record-count">{invalidRange ? 0 : filtered.length} records</span></div>
        {invalidRange || filtered.length === 0 ? (
          <div className="analytics-empty analytics-empty--large"><Icon name="room" size={29} /><strong>No matching construction costs</strong><span>{invalidRange ? 'Correct the date range to view results.' : 'Adjust or clear the filters and try again.'}</span></div>
        ) : (
          <div className="table-wrap">
            <table className="expenditure-table">
              <thead><tr><th>Date</th><th>Shed</th><th>Category</th><th>Paid to / whom</th><th>Amount</th><th>Remarks / description</th>{canManage && <th><span className="sr-only">Actions</span></th>}</tr></thead>
              <tbody>{filtered.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.constructionDate)}</td>
                  <td><strong className="expenditure-purpose">{entry.shedName || '—'}</strong></td>
                  <td><span className="stock-pill">{entry.category}</span></td>
                  <td>{entry.paidTo}</td>
                  <td><strong className="expenditure-amount">{formatMoney(entry.amount)}</strong></td>
                  <td><span className="expenditure-remarks">{entry.remarks || '—'}</span></td>
                  {canManage && <td><button aria-label={`Delete construction cost ${entry.id}`} className="icon-button" onClick={() => onDelete(entry)} title="Delete construction cost" type="button"><Icon name="trash" size={17} /></button></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ className = '', hint, label, children }) {
  return <label className={`field ${className}`}><span>{label}{hint && <small>{hint}</small>}</span>{children}</label>;
}

export function ShedConstructionForm({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    constructionDate: today(),
    shedName: '',
    category: SHED_CONSTRUCTION_CATEGORIES[0],
    paidTo: '',
    amount: '',
    remarks: '',
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
      <div className="modal__header"><div><span className="eyebrow">Construction expense</span><h2>Add shed construction cost</h2><p>Record what was built or bought, the category, who was paid, and the amount.</p></div><button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button></div>
      <div className="modal__body">
        {error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}
        <div className="form-grid">
          <Field label="Construction date"><input name="constructionDate" onChange={change} required type="date" value={form.constructionDate} /></Field>
          <Field label="Amount"><input autoFocus inputMode="decimal" min="0.01" name="amount" onChange={change} placeholder="0.00" required step="0.01" type="number" value={form.amount} /></Field>
          <Field label="Category">
            <select name="category" onChange={change} required value={form.category}>
              {SHED_CONSTRUCTION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </Field>
          <Field hint="Optional" label="Shed name / label"><input maxLength="100" name="shedName" onChange={change} placeholder="e.g. Shed A, North shed" value={form.shedName} /></Field>
          <Field label="Paid to / whom"><input maxLength="100" name="paidTo" onChange={change} placeholder="Contractor, vendor, or worker" required value={form.paidTo} /></Field>
          <Field className="field--full" hint="Optional" label="Remarks / description"><textarea maxLength="500" name="remarks" onChange={change} placeholder="Add material, quantity, or payment details" rows="3" value={form.remarks} /></Field>
        </div>
        <div className="calculation-strip expenditure-amount-strip"><span>Construction amount</span><strong>{formatMoney(form.amount)}</strong></div>
      </div>
      <div className="modal__footer"><button className="button button--ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save construction cost'} <Icon name="check" size={17} /></button></div>
    </form>
  );
}
