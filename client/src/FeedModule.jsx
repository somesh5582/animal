import { useMemo, useState } from 'react';
import { Icon } from './Icons.jsx';

export const FEED_SLOTS = [
  { id: 'morning', label: 'Morning', defaultTime: '07:00' },
  { id: 'afternoon', label: 'Afternoon', defaultTime: '13:00' },
  { id: 'evening', label: 'Evening', defaultTime: '18:00' },
];

const numberFormatter = new Intl.NumberFormat('en-IN');

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function currentTime() {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function formatTime(value) {
  if (!value) return '—';
  const [hour, minute] = value.split(':').map(Number);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function animalLabel(species, breed) {
  return breed ? `${breed} ${species}` : species;
}

function slotLabel(slot) {
  return FEED_SLOTS.find((item) => item.id === slot)?.label || slot;
}

function SummaryCard({ icon, label, value, note, tone = '' }) {
  return (
    <article className={`stat-card feed-stat ${tone ? `feed-stat--${tone}` : ''}`}>
      <div className="stat-card__top">
        <span>{label}</span>
        <span className="stat-card__icon"><Icon name={icon} size={20} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function FeedPage({ canManage, feeds, inventory, onAdd, onDelete }) {
  const [selectedDate, setSelectedDate] = useState(today());
  const liveBatchIds = useMemo(
    () => new Set(inventory.map((batch) => batch.id)),
    [inventory],
  );
  const dailyFeeds = useMemo(
    () => feeds.filter((feed) => feed.feedDate === selectedDate && liveBatchIds.has(feed.purchaseId)),
    [feeds, liveBatchIds, selectedDate],
  );

  const expectedSlots = inventory.length * FEED_SLOTS.length;
  const completedSlots = dailyFeeds.length;
  const pendingSlots = Math.max(0, expectedSlots - completedSlots);
  const basketTotal = dailyFeeds.reduce((sum, feed) => sum + Number(feed.basketCount || 0), 0);
  const completedBatches = inventory.filter((batch) => (
    FEED_SLOTS.every((slot) => dailyFeeds.some(
      (feed) => feed.purchaseId === batch.id && feed.slot === slot.id,
    ))
  )).length;

  if (inventory.length === 0 && feeds.length === 0) {
    return (
      <section className="panel page-panel">
        <div className="empty-state">
          <span className="empty-state__icon feed-empty-icon"><Icon name="feed" size={28} /></span>
          <h3>No livestock available for feeding</h3>
          <p>Add a livestock purchase before recording daily feed baskets.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="feed-page">
      <section className="feed-day-toolbar panel">
        <div>
          <span className="eyebrow">Daily feeding plan</span>
          <h2>Three meals per live batch</h2>
          <p>Record Morning, Afternoon, and Evening feed with time and basket quantity.</p>
        </div>
        <label className="field feed-date-field">
          <span>Schedule date</span>
          <input onChange={(event) => setSelectedDate(event.target.value)} type="date" value={selectedDate} />
        </label>
      </section>

      <section className="stats-grid feed-stats" aria-label="Daily feed summary">
        <SummaryCard icon="check" label="Completed slots" note={`${completedBatches} of ${inventory.length} batches complete`} tone="green" value={`${completedSlots} / ${expectedSlots}`} />
        <SummaryCard icon="calendar" label="Pending slots" note="Morning, afternoon, or evening" tone={pendingSlots > 0 ? 'orange' : 'green'} value={numberFormatter.format(pendingSlots)} />
        <SummaryCard icon="feed" label="Baskets used" note={`For ${formatDate(selectedDate)}`} tone="sand" value={numberFormatter.format(basketTotal)} />
        <SummaryCard icon="inventory" label="Live batches" note="Currently requiring daily feed" tone="blue" value={numberFormatter.format(inventory.length)} />
      </section>

      <section className="feed-schedule-grid">
        {inventory.map((batch) => {
          const batchFeeds = dailyFeeds.filter((feed) => feed.purchaseId === batch.id);
          const isComplete = batchFeeds.length === FEED_SLOTS.length;
          return (
            <article className="panel feed-batch-card" key={batch.id}>
              <div className="feed-batch-card__heading">
                <span className="batch-id batch-id--feed">#{String(batch.id).padStart(3, '0')}</span>
                <div><h3>{animalLabel(batch.species, batch.breed)}</h3><span>{batch.availableQuantity} animals · {batch.supplier}</span></div>
                <span className={`feed-completion ${isComplete ? 'feed-completion--done' : ''}`}>{isComplete ? 'Complete' : `${FEED_SLOTS.length - batchFeeds.length} pending`}</span>
              </div>
              <div className="feed-slot-list">
                {FEED_SLOTS.map((slot) => {
                  const entry = batchFeeds.find((feed) => feed.slot === slot.id);
                  return (
                    <div className={`feed-slot ${entry ? 'feed-slot--recorded' : ''}`} key={slot.id}>
                      <span className="feed-slot__icon"><Icon name={entry ? 'check' : 'calendar'} size={17} /></span>
                      <div><strong>{slot.label}</strong>{entry ? <span>{formatTime(entry.feedTime)} · {entry.basketCount} basket{entry.basketCount === 1 ? '' : 's'}</span> : <span>Not recorded</span>}</div>
                      {entry && <span className="feed-slot__status">Done</span>}
                      {!entry && canManage && (
                        <button className="button button--soft feed-slot__action" onClick={() => onAdd({ feedDate: selectedDate, purchaseId: batch.id, slot: slot.id })} type="button">Record</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>

      {inventory.length === 0 && (
        <section className="panel feed-no-live"><Icon name="inventory" size={24} /><div><strong>No current live batches</strong><span>Historical feed records remain available below.</span></div></section>
      )}

      <section className="panel feed-history">
        <div className="panel__heading">
          <div><span className="eyebrow">Feed ledger</span><h3>Complete feeding history</h3></div>
          <span className="record-count">{feeds.length} records</span>
        </div>
        {feeds.length === 0 ? (
          <div className="analytics-empty analytics-empty--large"><Icon name="feed" size={29} /><strong>No feed entries yet</strong><span>Use a pending meal slot above to record the first basket entry.</span></div>
        ) : (
          <div className="table-wrap">
            <table className="feed-history-table">
              <thead><tr><th>Date</th><th>Time</th><th>Meal</th><th>Batch / livestock</th><th>Baskets</th><th>Feed description</th><th>Notes</th>{canManage && <th><span className="sr-only">Actions</span></th>}</tr></thead>
              <tbody>
                {feeds.map((feed) => (
                  <tr key={feed.id}>
                    <td>{formatDate(feed.feedDate)}</td>
                    <td><strong>{formatTime(feed.feedTime)}</strong></td>
                    <td><span className={`meal-slot meal-slot--${feed.slot}`}>{slotLabel(feed.slot)}</span></td>
                    <td><div className="primary-cell"><span className="batch-id batch-id--feed">#{String(feed.purchaseId).padStart(3, '0')}</span><div><strong>{animalLabel(feed.species, feed.breed)}</strong><small>{feed.supplier}</small></div></div></td>
                    <td><strong className="basket-value">{numberFormatter.format(feed.basketCount)} baskets</strong></td>
                    <td><span className="feed-description">{feed.feedDescription || '—'}</span></td>
                    <td><span className="table-notes">{feed.notes || '—'}</span></td>
                    {canManage && <td><button aria-label={`Delete feed entry ${feed.id}`} className="icon-button" onClick={() => onDelete(feed)} title="Delete feed entry" type="button"><Icon name="trash" size={17} /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
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

export function FeedForm({ initial = {}, inventory, onClose, onSubmit }) {
  const initialSlot = FEED_SLOTS.some((slot) => slot.id === initial.slot) ? initial.slot : 'morning';
  const [form, setForm] = useState({
    feedDate: initial.feedDate || today(),
    feedTime: initial.feedTime || FEED_SLOTS.find((slot) => slot.id === initialSlot)?.defaultTime || currentTime(),
    purchaseId: initial.purchaseId ? String(initial.purchaseId) : inventory[0] ? String(inventory[0].id) : '',
    slot: initialSlot,
    basketCount: '',
    feedDescription: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedBatch = inventory.find((batch) => batch.id === Number(form.purchaseId));

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => {
      if (name !== 'slot') return { ...current, [name]: value };
      const previousDefault = FEED_SLOTS.find((slot) => slot.id === current.slot)?.defaultTime;
      const nextDefault = FEED_SLOTS.find((slot) => slot.id === value)?.defaultTime;
      return { ...current, slot: value, feedTime: current.feedTime === previousDefault ? nextDefault : current.feedTime };
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
        <div><span className="eyebrow">Daily nutrition</span><h2>Record feed baskets</h2><p>Add one of three daily meal entries for a live livestock batch.</p></div>
        <button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
      </div>
      <div className="modal__body">
        {error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}
        <div className="feed-slot-selector" role="group" aria-label="Meal slot">
          {FEED_SLOTS.map((slot) => (
            <button className={form.slot === slot.id ? 'feed-slot-choice feed-slot-choice--active' : 'feed-slot-choice'} key={slot.id} onClick={() => change({ target: { name: 'slot', value: slot.id } })} type="button"><Icon name="feed" size={18} /><span>{slot.label}</span><small>{formatTime(slot.defaultTime)}</small></button>
          ))}
        </div>
        <div className="form-grid">
          <Field label="Feed date"><input name="feedDate" onChange={change} required type="date" value={form.feedDate} /></Field>
          <Field label="Feeding time"><input name="feedTime" onChange={change} required type="time" value={form.feedTime} /></Field>
          <Field label="Purchase batch"><select name="purchaseId" onChange={change} required value={form.purchaseId}>{inventory.map((batch) => <option key={batch.id} value={batch.id}>#{String(batch.id).padStart(3, '0')} · {animalLabel(batch.species, batch.breed)} · {batch.availableQuantity} animals</option>)}</select></Field>
          <Field label="Number of baskets"><input autoFocus inputMode="numeric" min="1" name="basketCount" onChange={change} placeholder="0" required step="1" type="number" value={form.basketCount} /></Field>
          <Field className="field--full" hint="Optional" label="Feed description"><textarea maxLength="500" name="feedDescription" onChange={change} placeholder="e.g. Green fodder, dry feed, or mixed ration" rows="2" value={form.feedDescription} /></Field>
          <Field className="field--full" hint="Optional" label="Notes"><textarea maxLength="500" name="notes" onChange={change} placeholder="Consumption, leftovers, or observations" rows="2" value={form.notes} /></Field>
        </div>
        {selectedBatch && <div className="calculation-strip feed-batch-strip"><span>{slotLabel(form.slot)} meal</span><strong>{animalLabel(selectedBatch.species, selectedBatch.breed)} · {selectedBatch.availableQuantity} animals</strong></div>}
      </div>
      <div className="modal__footer"><button className="button button--ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary" disabled={saving || inventory.length === 0} type="submit">{saving ? 'Saving…' : 'Save feed entry'} <Icon name="check" size={17} /></button></div>
    </form>
  );
}
