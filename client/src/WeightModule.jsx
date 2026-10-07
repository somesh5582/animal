import { useMemo, useState } from 'react';
import { Icon } from './Icons.jsx';

const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatWeight(value) {
  return `${numberFormatter.format(Number(value) || 0)} kg`;
}

function animalLabel(species, breed) {
  return breed ? `${breed} ${species}` : species;
}

function entryOrder(a, b) {
  return b.weightDate.localeCompare(a.weightDate) || b.id - a.id;
}

function latestMeasurement(entries, type) {
  const measurements = entries
    .filter((entry) => entry.measurementType === type)
    .sort(entryOrder);

  return {
    entry: measurements[0] || null,
    change: measurements.length > 1
      ? Number(measurements[0].weightKg) - Number(measurements[1].weightKg)
      : null,
  };
}

function SummaryCard({ label, value, note }) {
  return (
    <article className="stat-card stat-card--weight">
      <div className="stat-card__top">
        <span>{label}</span>
        <span className="stat-card__icon"><Icon name="weight" size={20} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function MeasurementValue({ measurement }) {
  if (!measurement.entry) {
    return <span className="muted-value">Not recorded</span>;
  }

  return (
    <div className="measurement-value">
      <strong>{formatWeight(measurement.entry.weightKg)}</strong>
      {measurement.change !== null && (
        <small className={measurement.change < 0 ? 'change--loss' : 'change--gain'}>
          {measurement.change >= 0 ? '+' : ''}{formatWeight(measurement.change)}
        </small>
      )}
    </div>
  );
}

export function WeightPage({ canManage, inventory, onAdd, onDelete, onEdit, weights }) {
  const summary = useMemo(() => ({
    taggedAnimals: new Set(
      weights.map((entry) => entry.animalTag.trim().toLowerCase()).filter(Boolean),
    ).size,
    weeklyEntries: weights.filter((entry) => entry.measurementType === 'weekly').length,
    monthlyEntries: weights.filter((entry) => entry.measurementType === 'monthly').length,
  }), [weights]);

  const animals = useMemo(() => {
    const grouped = new Map();

    for (const entry of weights) {
      const tag = entry.animalTag.trim();
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (!grouped.has(key)) grouped.set(key, { tag, entries: [] });
      grouped.get(key).entries.push(entry);
    }

    return [...grouped.values()].map(({ tag, entries }) => {
      const sortedEntries = [...entries].sort(entryOrder);
      return {
        tag,
        latest: sortedEntries[0],
        weekly: latestMeasurement(entries, 'weekly'),
        monthly: latestMeasurement(entries, 'monthly'),
      };
    }).sort((a, b) => entryOrder(a.latest, b.latest));
  }, [weights]);

  if (weights.length === 0) {
    return (
      <section className="panel page-panel">
        <div className="empty-state">
          <span className="empty-state__icon"><Icon name="weight" size={28} /></span>
          <h3>No weight entries yet</h3>
          <p>{inventory.length > 0
            ? 'Record a weekly or monthly weight against an animal ID to start monitoring growth.'
            : 'Add livestock to inventory before recording animal weights.'}</p>
          {canManage && inventory.length > 0 && (
            <button className="button button--primary" onClick={onAdd} type="button">
              <Icon name="plus" size={17} /> Record first weight
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="stats-grid weight-stats" aria-label="Weight summary">
        <SummaryCard label="Tagged animals" note="Individual animals monitored" value={numberFormatter.format(summary.taggedAnimals)} />
        <SummaryCard label="Weekly values" note="Measurements recorded by week" value={numberFormatter.format(summary.weeklyEntries)} />
        <SummaryCard label="Monthly values" note="Measurements recorded by month" value={numberFormatter.format(summary.monthlyEntries)} />
      </section>

      {animals.length > 0 && (
        <section className="panel animal-progress">
          <div className="panel__heading">
            <div><span className="eyebrow">Growth tracking</span><h3>Animal progress by ID / tag</h3></div>
            <span className="record-count">{animals.length} animals</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Animal ID / tag</th>
                  <th>Livestock</th>
                  <th>Latest weight</th>
                  <th>Weekly value</th>
                  <th>Monthly value</th>
                  <th>Last measured</th>
                </tr>
              </thead>
              <tbody>
                {animals.map((animal) => (
                  <tr key={animal.tag.toLowerCase()}>
                    <td><strong className="animal-tag">{animal.tag}</strong></td>
                    <td>
                      <div className="primary-cell">
                        <span className="batch-id batch-id--weight">#{String(animal.latest.purchaseId).padStart(3, '0')}</span>
                        <div><strong>{animalLabel(animal.latest.species, animal.latest.breed)}</strong><small>{animal.latest.supplier}</small></div>
                      </div>
                    </td>
                    <td><strong className="weight-value">{formatWeight(animal.latest.weightKg)}</strong></td>
                    <td><MeasurementValue measurement={animal.weekly} /></td>
                    <td><MeasurementValue measurement={animal.monthly} /></td>
                    <td>{formatDate(animal.latest.weightDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel page-panel weight-history">
        <div className="panel__heading">
          <div><span className="eyebrow">Measurements</span><h3>Complete weight history</h3></div>
          <span className="record-count">{weights.length} entries</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Animal ID / tag</th>
                <th>Frequency</th>
                <th>Weight date</th>
                <th>Animal / batch</th>
                <th>Weight</th>
                <th>Notes</th>
                {canManage && <th><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {weights.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.animalTag
                    ? <strong className="animal-tag">{entry.animalTag}</strong>
                    : <span className="muted-value">Legacy untagged</span>}</td>
                  <td><span className={`measurement-type measurement-type--${entry.measurementType}`}>{entry.measurementType}</span></td>
                  <td>{formatDate(entry.weightDate)}</td>
                  <td>
                    <div className="primary-cell">
                      <span className="batch-id batch-id--weight">#{String(entry.purchaseId).padStart(3, '0')}</span>
                      <div><strong>{animalLabel(entry.species, entry.breed)}</strong><small>{entry.supplier}</small></div>
                    </div>
                  </td>
                  <td><strong className="weight-value">{formatWeight(entry.weightKg)}</strong></td>
                  <td><span className="table-notes">{entry.notes || '—'}</span></td>
                  {canManage && <td>
                    <div className="weight-row-actions">
                      <button
                        aria-label={`Edit weight entry ${entry.id}`}
                        className="button button--ghost"
                        onClick={() => onEdit(entry)}
                        title="Edit weight entry"
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Delete weight entry ${entry.id}`}
                        className="icon-button"
                        onClick={() => onDelete(entry)}
                        title="Delete weight entry"
                        type="button"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Field({ hint, label, children }) {
  return (
    <label className="field">
      <span>{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}

export function WeightForm({ initial = {}, inventory, onClose, onSubmit, purchases, weights }) {
  const isEdit = Boolean(initial.id);
  const batchOptions = useMemo(() => {
    if (!isEdit || inventory.some((batch) => batch.id === initial.purchaseId)) return inventory;
    const currentBatch = purchases.find((batch) => batch.id === initial.purchaseId);
    return currentBatch ? [currentBatch, ...inventory] : inventory;
  }, [initial.purchaseId, inventory, isEdit, purchases]);
  const [form, setForm] = useState({
    weightDate: initial.weightDate || today(),
    purchaseId: initial.purchaseId ? String(initial.purchaseId) : (inventory[0] ? String(inventory[0].id) : ''),
    animalTag: initial.animalTag || '',
    measurementType: initial.measurementType || 'weekly',
    weightKg: initial.weightKg == null ? '' : String(initial.weightKg),
    notes: initial.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedBatch = batchOptions.find((batch) => batch.id === Number(form.purchaseId));
  const knownAnimals = useMemo(() => {
    const tags = new Map();
    for (const entry of weights) {
      const isInStock = inventory.some((batch) => batch.id === entry.purchaseId);
      if (entry.animalTag && isInStock) {
        tags.set(entry.animalTag.toLowerCase(), entry.animalTag);
      }
    }
    return [...tags.values()].sort((a, b) => a.localeCompare(b));
  }, [inventory, weights]);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => {
      if (name !== 'animalTag') return { ...current, [name]: value };

      const existingEntry = weights.find(
        (entry) => entry.id !== initial.id
          && entry.animalTag.toLowerCase() === value.trim().toLowerCase()
          && inventory.some((batch) => batch.id === entry.purchaseId),
      );
      return {
        ...current,
        animalTag: value,
        purchaseId: existingEntry ? String(existingEntry.purchaseId) : current.purchaseId,
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
        <div>
          <span className="eyebrow">Herd monitoring</span>
          <h2>{isEdit ? 'Edit animal weight' : 'Record animal weight'}</h2>
          <p>{isEdit ? 'Correct this animal weight entry and save the updated details.' : 'Add a weekly or monthly weight value for an identified animal.'}</p>
        </div>
        <button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
      </div>
      <div className="modal__body">
        {error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}
        <div className="form-grid">
          <Field label="Animal ID / tag">
            <input autoFocus list="known-animal-tags" maxLength="60" name="animalTag" onChange={change} placeholder="e.g. TAG-104" required value={form.animalTag} />
            <datalist id="known-animal-tags">
              {knownAnimals.map((tag) => <option key={tag} value={tag} />)}
            </datalist>
          </Field>
          <Field label="Purchase batch">
            <select name="purchaseId" onChange={change} required value={form.purchaseId}>
              {batchOptions.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  #{String(batch.id).padStart(3, '0')} · {animalLabel(batch.species, batch.breed)} · {batch.availableQuantity ?? 0} available
                </option>
              ))}
            </select>
          </Field>
          <Field label="Measurement frequency">
            <select name="measurementType" onChange={change} required value={form.measurementType}>
              <option value="weekly">Weekly weight</option>
              <option value="monthly">Monthly weight</option>
            </select>
          </Field>
          <Field label="Measurement date"><input name="weightDate" onChange={change} required type="date" value={form.weightDate} /></Field>
          <Field label="Weight (kg)"><input inputMode="decimal" min="0.01" name="weightKg" onChange={change} placeholder="0.00" required step="0.01" type="number" value={form.weightKg} /></Field>
          <Field hint="Optional" label="Notes"><input maxLength="500" name="notes" onChange={change} placeholder="Condition, feed, or health notes" value={form.notes} /></Field>
        </div>
        {selectedBatch && (
          <div className="calculation-strip weight-batch-strip">
            <span>Multiple {form.measurementType} values allowed for this animal ID</span>
            <strong>{animalLabel(selectedBatch.species, selectedBatch.breed)}</strong>
          </div>
        )}
      </div>
      <div className="modal__footer">
        <button className="button button--ghost" onClick={onClose} type="button">Cancel</button>
        <button className="button button--primary" disabled={saving || (!isEdit && inventory.length === 0) || !form.purchaseId} type="submit">
          {saving ? 'Saving…' : isEdit ? 'Save weight changes' : `Save ${form.measurementType} weight`} <Icon name="check" size={17} />
        </button>
      </div>
    </form>
  );
}
