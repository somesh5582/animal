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

function animalLabel(species, breed) {
  return breed ? `${breed} ${species}` : species;
}

function followUpStatus(followUpDate, currentDate) {
  if (!followUpDate) return { label: 'No follow-up', tone: 'none' };
  if (followUpDate < currentDate) return { label: 'Overdue', tone: 'overdue' };
  if (followUpDate === currentDate) return { label: 'Due today', tone: 'due' };
  return { label: 'Scheduled', tone: 'scheduled' };
}

function SummaryCard({ icon, label, value, note, tone = '' }) {
  return (
    <article className={`stat-card treatment-stat ${tone ? `treatment-stat--${tone}` : ''}`}>
      <div className="stat-card__top">
        <span>{label}</span>
        <span className="stat-card__icon"><Icon name={icon} size={20} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function FollowUpBadge({ followUpDate, currentDate }) {
  const status = followUpStatus(followUpDate, currentDate);
  return (
    <div className="follow-up-cell">
      <span className={`follow-up-badge follow-up-badge--${status.tone}`}>{status.label}</span>
      {followUpDate && <small>{formatDate(followUpDate)}</small>}
    </div>
  );
}

export function TreatmentPage({ canManage, inventory, onAdd, onDelete, treatments }) {
  const currentDate = today();
  const [tagFilter, setTagFilter] = useState('');
  const filteredTreatments = useMemo(() => {
    const query = tagFilter.trim().toLocaleLowerCase();
    if (!query) return treatments;
    return treatments.filter((treatment) => treatment.animalTag.toLocaleLowerCase().includes(query));
  }, [tagFilter, treatments]);

  const summary = useMemo(() => ({
    total: treatments.length,
    animals: new Set(treatments.map((item) => item.animalTag.trim().toLocaleLowerCase()).filter(Boolean)).size,
    cost: treatments.reduce((sum, item) => sum + Number(item.treatmentCost || 0), 0),
    due: treatments.filter((item) => item.followUpDate && item.followUpDate <= currentDate).length,
  }), [currentDate, treatments]);

  if (treatments.length === 0) {
    return (
      <section className="panel page-panel">
        <div className="empty-state">
          <span className="empty-state__icon treatment-empty-icon"><Icon name="treatment" size={28} /></span>
          <h3>No treatment history yet</h3>
          <p>{inventory.length > 0
            ? 'Record treatment details against an animal ID or tag.'
            : 'Add livestock to inventory before recording treatment.'}</p>
          {canManage && inventory.length > 0 && (
            <button className="button button--primary" onClick={onAdd} type="button">
              <Icon name="plus" size={17} /> Record first treatment
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="stats-grid treatment-stats" aria-label="Treatment summary">
        <SummaryCard icon="treatment" label="Treatment records" note="Complete medical history" value={numberFormatter.format(summary.total)} />
        <SummaryCard icon="herd" label="Animals treated" note="Unique animal IDs / tags" value={numberFormatter.format(summary.animals)} />
        <SummaryCard icon="wallet" label="Treatment cost" note="Across all recorded treatments" tone="sand" value={formatMoney(summary.cost)} />
        <SummaryCard icon="calendar" label="Follow-ups due" note="Due today or overdue" tone={summary.due > 0 ? 'red' : 'green'} value={numberFormatter.format(summary.due)} />
      </section>

      <section className="panel treatment-history">
        <div className="panel__heading treatment-history__heading">
          <div><span className="eyebrow">Medical records</span><h3>Treatment history</h3></div>
          <label className="treatment-search">
            <span className="sr-only">Filter treatments by animal ID or tag</span>
            <input onChange={(event) => setTagFilter(event.target.value)} placeholder="Filter by animal ID / tag" value={tagFilter} />
          </label>
          <span className="record-count">{filteredTreatments.length} records</span>
        </div>
        {filteredTreatments.length === 0 ? (
          <div className="analytics-empty analytics-empty--large"><Icon name="treatment" size={29} /><strong>No matching animal treatment</strong><span>Try another ID or clear the filter.</span></div>
        ) : (
          <div className="table-wrap">
            <table className="treatment-table">
              <thead>
                <tr><th>Animal ID / tag</th><th>Treatment date</th><th>Animal / batch</th><th>Treatment description</th><th>Medicine / dosage</th><th>Veterinarian</th><th>Cost</th><th>Follow-up</th><th>Notes</th>{canManage && <th><span className="sr-only">Actions</span></th>}</tr>
              </thead>
              <tbody>
                {filteredTreatments.map((treatment) => (
                  <tr key={treatment.id}>
                    <td><strong className="animal-tag">{treatment.animalTag}</strong></td>
                    <td>{formatDate(treatment.treatmentDate)}</td>
                    <td>
                      <div className="primary-cell">
                        <span className="batch-id batch-id--treatment">#{String(treatment.purchaseId).padStart(3, '0')}</span>
                        <div><strong>{animalLabel(treatment.species, treatment.breed)}</strong><small>{treatment.supplier}</small></div>
                      </div>
                    </td>
                    <td><span className="treatment-description">{treatment.treatmentDescription}</span></td>
                    <td>
                      <div className="treatment-detail"><strong>{treatment.medicine || '—'}</strong><span>{treatment.dosage || 'No dosage recorded'}</span></div>
                    </td>
                    <td>{treatment.veterinarian || '—'}</td>
                    <td><strong>{formatMoney(treatment.treatmentCost)}</strong></td>
                    <td><FollowUpBadge currentDate={currentDate} followUpDate={treatment.followUpDate} /></td>
                    <td><span className="table-notes">{treatment.notes || '—'}</span></td>
                    {canManage && <td>
                      <button aria-label={`Delete treatment record ${treatment.id}`} className="icon-button" onClick={() => onDelete(treatment)} title="Delete treatment record" type="button"><Icon name="trash" size={17} /></button>
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function Field({ className = '', hint, label, children }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}

export function TreatmentForm({ inventory, onClose, onSubmit, treatments, weights }) {
  const [form, setForm] = useState({
    treatmentDate: today(),
    purchaseId: inventory[0] ? String(inventory[0].id) : '',
    animalTag: '',
    treatmentDescription: '',
    medicine: '',
    dosage: '',
    veterinarian: '',
    treatmentCost: '0',
    followUpDate: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedBatch = inventory.find((batch) => batch.id === Number(form.purchaseId));

  const knownAnimals = useMemo(() => {
    const tags = new Map();
    for (const entry of [...weights, ...treatments]) {
      if (!entry.animalTag || !inventory.some((batch) => batch.id === entry.purchaseId)) continue;
      const key = entry.animalTag.trim().toLocaleLowerCase();
      if (!tags.has(key)) tags.set(key, { tag: entry.animalTag, purchaseId: entry.purchaseId });
    }
    return [...tags.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }, [inventory, treatments, weights]);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => {
      if (name !== 'animalTag') return { ...current, [name]: value };
      const knownAnimal = knownAnimals.find((item) => item.tag.toLocaleLowerCase() === value.trim().toLocaleLowerCase());
      return {
        ...current,
        animalTag: value,
        purchaseId: knownAnimal ? String(knownAnimal.purchaseId) : current.purchaseId,
      };
    });
  }

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
        <div><span className="eyebrow">Animal healthcare</span><h2>Record medical treatment</h2><p>Add treatment details to an identified animal’s medical history.</p></div>
        <button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
      </div>
      <div className="modal__body">
        {error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}
        <div className="form-grid">
          <Field label="Animal ID / tag">
            <input autoFocus list="treatment-animal-tags" maxLength="60" name="animalTag" onChange={change} placeholder="e.g. TAG-104" required value={form.animalTag} />
            <datalist id="treatment-animal-tags">{knownAnimals.map((animal) => <option key={animal.tag} value={animal.tag} />)}</datalist>
          </Field>
          <Field label="Purchase batch">
            <select name="purchaseId" onChange={change} required value={form.purchaseId}>
              {inventory.map((batch) => <option key={batch.id} value={batch.id}>#{String(batch.id).padStart(3, '0')} · {animalLabel(batch.species, batch.breed)} · {batch.availableQuantity} available</option>)}
            </select>
          </Field>
          <Field label="Treatment date"><input name="treatmentDate" onChange={change} required type="date" value={form.treatmentDate} /></Field>
          <Field label="Follow-up date" hint="Optional"><input min={form.treatmentDate} name="followUpDate" onChange={change} type="date" value={form.followUpDate} /></Field>
          <Field className="field--full" label="Treatment description"><textarea maxLength="500" name="treatmentDescription" onChange={change} placeholder="Describe the condition and treatment provided" required rows="3" value={form.treatmentDescription} /></Field>
          <Field label="Medicine" hint="Optional"><input maxLength="100" name="medicine" onChange={change} placeholder="Medicine or vaccine" value={form.medicine} /></Field>
          <Field label="Dosage" hint="Optional"><input maxLength="100" name="dosage" onChange={change} placeholder="e.g. 10 ml once daily" value={form.dosage} /></Field>
          <Field label="Veterinarian" hint="Optional"><input maxLength="100" name="veterinarian" onChange={change} placeholder="Doctor or clinic name" value={form.veterinarian} /></Field>
          <Field label="Treatment cost"><input inputMode="decimal" min="0" name="treatmentCost" onChange={change} step="0.01" type="number" value={form.treatmentCost} /></Field>
          <Field className="field--full" label="Additional notes" hint="Optional"><textarea maxLength="500" name="notes" onChange={change} placeholder="Recovery instructions or observations" rows="2" value={form.notes} /></Field>
        </div>
        {selectedBatch && <div className="calculation-strip treatment-batch-strip"><span>Selected livestock</span><strong>{animalLabel(selectedBatch.species, selectedBatch.breed)}</strong></div>}
      </div>
      <div className="modal__footer">
        <button className="button button--ghost" onClick={onClose} type="button">Cancel</button>
        <button className="button button--primary" disabled={saving || inventory.length === 0} type="submit">{saving ? 'Saving…' : 'Save treatment'} <Icon name="check" size={17} /></button>
      </div>
    </form>
  );
}
