import { useMemo, useState } from 'react';
import { Icon } from './Icons.jsx';

const currency = import.meta.env.VITE_CURRENCY || 'INR';
const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat('en-IN');

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

export function ExpenditurePage({ canManage, expenditures, onAdd, onDelete }) {
  const currentDate = today();
  const monthPrefix = currentDate.slice(0, 7);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', query: '' });

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLocaleLowerCase();
    return expenditures.filter((entry) => {
      if (filters.startDate && entry.expenditureDate < filters.startDate) return false;
      if (filters.endDate && entry.expenditureDate > filters.endDate) return false;
      if (!query) return true;
      return [entry.purpose, entry.paidTo, entry.remarks]
        .some((value) => String(value || '').toLocaleLowerCase().includes(query));
    });
  }, [expenditures, filters]);

  const todayRows = expenditures.filter((entry) => entry.expenditureDate === currentDate);
  const monthRows = expenditures.filter((entry) => entry.expenditureDate.startsWith(monthPrefix));
  const invalidRange = Boolean(filters.startDate && filters.endDate && filters.startDate > filters.endDate);

  function change(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  if (expenditures.length === 0) {
    return (
      <section className="panel page-panel">
        <div className="empty-state">
          <span className="empty-state__icon expenditure-empty-icon"><Icon name="expenditure" size={28} /></span>
          <h3>No expenditures recorded</h3>
          <p>Add day-to-day business expenses with the purpose, payee, amount, and remarks.</p>
          {canManage && <button className="button button--primary" onClick={onAdd} type="button"><Icon name="plus" size={17} /> Add first expenditure</button>}
        </div>
      </section>
    );
  }

  return (
    <div className="expenditure-page">
      <section className="stats-grid expenditure-stats" aria-label="Expenditure summary">
        <SummaryCard icon="calendar" label="Today" note={`${todayRows.length} records on ${formatDate(currentDate)}`} tone="orange" value={formatMoney(sumAmount(todayRows))} />
        <SummaryCard icon="calendar" label="This month" note={`${monthRows.length} records in current month`} tone="red" value={formatMoney(sumAmount(monthRows))} />
        <SummaryCard icon="expenditure" label="Filtered total" note={`${filtered.length} matching records`} tone="blue" value={formatMoney(sumAmount(filtered))} />
        <SummaryCard icon="reports" label="All records" note="Complete expenditure ledger" value={numberFormatter.format(expenditures.length)} />
      </section>

      <section className="panel expenditure-filter-panel">
        <div className="expenditure-filter-heading"><div><span className="eyebrow">Find expenses</span><h2>Filter expenditure history</h2></div><button className="button button--ghost" onClick={() => setFilters({ startDate: '', endDate: '', query: '' })} type="button">Clear filters</button></div>
        <div className="expenditure-filter-grid">
          <label className="field"><span>From date</span><input max={filters.endDate || undefined} name="startDate" onChange={change} type="date" value={filters.startDate} /></label>
          <label className="field"><span>To date</span><input min={filters.startDate || undefined} name="endDate" onChange={change} type="date" value={filters.endDate} /></label>
          <label className="field"><span>Purpose, paid to, or remarks</span><input name="query" onChange={change} placeholder="Search expenditure" value={filters.query} /></label>
        </div>
        {invalidRange && <div className="form-error expenditure-filter-error"><Icon name="alert" size={17} />Start date must be on or before end date.</div>}
      </section>

      <section className="panel expenditure-history">
        <div className="panel__heading"><div><span className="eyebrow">Expense ledger</span><h3>Day-to-day expenditures</h3></div><span className="record-count">{invalidRange ? 0 : filtered.length} records</span></div>
        {invalidRange || filtered.length === 0 ? (
          <div className="analytics-empty analytics-empty--large"><Icon name="expenditure" size={29} /><strong>No matching expenditures</strong><span>{invalidRange ? 'Correct the date range to view results.' : 'Adjust or clear the filters and try again.'}</span></div>
        ) : (
          <div className="table-wrap">
            <table className="expenditure-table">
              <thead><tr><th>Date</th><th>Purpose</th><th>Paid to / whom</th><th>Amount</th><th>Remarks / description</th>{canManage && <th><span className="sr-only">Actions</span></th>}</tr></thead>
              <tbody>{filtered.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.expenditureDate)}</td>
                  <td><strong className="expenditure-purpose">{entry.purpose}</strong></td>
                  <td>{entry.paidTo}</td>
                  <td><strong className="expenditure-amount">{formatMoney(entry.amount)}</strong></td>
                  <td><span className="expenditure-remarks">{entry.remarks || '—'}</span></td>
                  {canManage && <td><button aria-label={`Delete expenditure ${entry.id}`} className="icon-button" onClick={() => onDelete(entry)} title="Delete expenditure" type="button"><Icon name="trash" size={17} /></button></td>}
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

export function ExpenditureForm({ onClose, onSubmit }) {
  const [form, setForm] = useState({ expenditureDate: today(), purpose: '', paidTo: '', amount: '', remarks: '' });
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
      <div className="modal__header"><div><span className="eyebrow">Operating expense</span><h2>Add day-to-day expenditure</h2><p>Record who was paid, why, and the amount spent.</p></div><button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button></div>
      <div className="modal__body">
        {error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}
        <div className="form-grid">
          <Field label="Expenditure date"><input name="expenditureDate" onChange={change} required type="date" value={form.expenditureDate} /></Field>
          <Field label="Amount"><input autoFocus inputMode="decimal" min="0.01" name="amount" onChange={change} placeholder="0.00" required step="0.01" type="number" value={form.amount} /></Field>
          <Field label="Purpose"><input maxLength="100" name="purpose" onChange={change} placeholder="e.g. Electricity, transport, repairs" required value={form.purpose} /></Field>
          <Field label="Paid to / whom"><input maxLength="100" name="paidTo" onChange={change} placeholder="Person, vendor, or company" required value={form.paidTo} /></Field>
          <Field className="field--full" hint="Optional" label="Remarks / description"><textarea maxLength="500" name="remarks" onChange={change} placeholder="Add invoice, payment, or expense details" rows="3" value={form.remarks} /></Field>
        </div>
        <div className="calculation-strip expenditure-amount-strip"><span>Expenditure amount</span><strong>{formatMoney(form.amount)}</strong></div>
      </div>
      <div className="modal__footer"><button className="button button--ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save expenditure'} <Icon name="check" size={17} /></button></div>
    </form>
  );
}
