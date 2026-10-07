import { useMemo, useState } from 'react';
import { Icon } from './Icons.jsx';
import { buildLatestWeightMap, findLatestWeight } from './roomWeight.js';

const numberFormatter = new Intl.NumberFormat('en-IN');

function formatDateTime(value) {
  if (!value) return '—';
  const datePart = value.slice(0, 10);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${datePart}T00:00:00`));
}

function formatWeight(value) {
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value))} kg`;
}

function animalLabel(species, breed) {
  return breed ? `${breed} ${species}` : species;
}

function isRoomAvailable(room) {
  return Boolean(room.isUnlimited) || Number(room.availableCapacity) > 0;
}

function SummaryCard({ icon, label, note, value, tone = '' }) {
  return (
    <article className={`stat-card room-stat ${tone ? `room-stat--${tone}` : ''}`}>
      <div className="stat-card__top">
        <span>{label}</span>
        <span className="stat-card__icon"><Icon name={icon} size={20} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

export function RoomsPage({
  assignments,
  canManage,
  inventory,
  onAddRoom,
  onAssign,
  onDeleteRoom,
  onEditRoom,
  onMove,
  onUnassign,
  rooms,
  weights,
}) {
  const [tagFilter, setTagFilter] = useState('');
  const assignmentsByRoom = useMemo(() => {
    const grouped = new Map();
    for (const assignment of assignments) {
      const roomAssignments = grouped.get(assignment.roomId) || [];
      roomAssignments.push(assignment);
      grouped.set(assignment.roomId, roomAssignments);
    }
    return grouped;
  }, [assignments]);
  const latestWeightByAnimal = useMemo(
    () => buildLatestWeightMap(weights),
    [weights],
  );
  const filteredAssignments = useMemo(() => {
    const query = tagFilter.trim().toLocaleLowerCase();
    if (!query) return assignments;
    return assignments.filter((assignment) => (
      assignment.animalTag.toLocaleLowerCase().includes(query)
      || assignment.roomName.toLocaleLowerCase().includes(query)
    ));
  }, [assignments, tagFilter]);

  const finiteAvailable = rooms.reduce((sum, room) => (
    room.isUnlimited ? sum : sum + Number(room.availableCapacity || 0)
  ), 0);
  const unlimitedRooms = rooms.filter((room) => room.isUnlimited).length;
  const availableRooms = rooms.filter(isRoomAvailable);

  if (rooms.length === 0) {
    return (
      <section className="panel page-panel">
        <div className="empty-state">
          <span className="empty-state__icon room-empty-icon"><Icon name="room" size={28} /></span>
          <h3>No rooms created</h3>
          <p>Create a room before mapping animal IDs or tags to their location.</p>
          {canManage && <button className="button button--primary" onClick={onAddRoom} type="button"><Icon name="plus" size={17} /> Add first room</button>}
        </div>
      </section>
    );
  }

  return (
    <div className="rooms-page">
      <section className="stats-grid room-stats" aria-label="Room occupancy summary">
        <SummaryCard icon="room" label="Rooms" note={`${unlimitedRooms} unlimited capacity`} value={numberFormatter.format(rooms.length)} />
        <SummaryCard icon="herd" label="Animals assigned" note="Current ID / tag mappings" tone="blue" value={numberFormatter.format(assignments.length)} />
        <SummaryCard icon="inventory" label="Finite spaces available" note="Excludes unlimited rooms" tone="green" value={numberFormatter.format(finiteAvailable)} />
        <SummaryCard icon="reports" label="Unassigned capacity" note={`${availableRooms.length} rooms accepting animals`} tone="sand" value={numberFormatter.format(availableRooms.length)} />
      </section>

      <section className="room-section-heading">
        <div><span className="eyebrow">Housing overview</span><h2>Room occupancy</h2><p>See where each animal is located and which rooms have space.</p></div>
        {canManage && <button className="button button--primary" disabled={inventory.length === 0 || availableRooms.length === 0} onClick={() => onAssign({})} type="button"><Icon name="plus" size={17} /> Map animal to room</button>}
      </section>

      <section className="room-card-grid">
        {rooms.map((room) => {
          const roomAssignments = assignmentsByRoom.get(room.id) || [];
          const percentage = room.isUnlimited || room.capacity === 0
            ? 0
            : Math.min(100, (room.occupancy / room.capacity) * 100);
          const full = !room.isUnlimited && room.availableCapacity <= 0;
          return (
            <article className="panel room-card" key={room.id}>
              <div className="room-card__top">
                <span className="room-card__icon"><Icon name="room" size={23} /></span>
                <div><h3>{room.name}</h3><span>{room.description || 'No room description'}</span></div>
                <span className={`room-availability ${full ? 'room-availability--full' : ''}`}>{full ? 'Full' : 'Available'}</span>
              </div>
              <div className="room-card__occupancy">
                <div><strong>{room.occupancy}</strong><span>{room.isUnlimited ? 'animals · unlimited' : `of ${room.capacity} occupied`}</span></div>
                {!room.isUnlimited && <span>{room.availableCapacity} spaces free</span>}
              </div>
              {!room.isUnlimited && <div className="progress-track room-capacity-track"><span style={{ width: `${percentage}%` }} /></div>}
              <div className="room-animal-dashboard" aria-label={`Animals inside ${room.name}`}>
                {roomAssignments.length === 0
                  ? <div className="room-animal-empty"><Icon name="herd" size={20} /><span>No animals assigned</span></div>
                  : roomAssignments.map((assignment) => {
                    const latestWeight = findLatestWeight(latestWeightByAnimal, assignment);
                    return (
                      <article className="room-animal-tile" key={assignment.id}>
                        <div className="room-animal-tile__top">
                          <span className="room-animal-avatar"><Icon name="herd" size={18} /></span>
                          <div><strong>{assignment.animalTag}</strong><span>{animalLabel(assignment.species, assignment.breed)}</span></div>
                        </div>
                        <div className="room-animal-tile__weight">
                          <span>Current weight</span>
                          {latestWeight
                            ? <><strong>{formatWeight(latestWeight.weightKg)}</strong><small>{formatDateTime(latestWeight.weightDate)}</small></>
                            : <strong className="room-weight-missing">Weight not recorded</strong>}
                        </div>
                      </article>
                    );
                  })}
              </div>
              {canManage && <div className="room-card__actions">
                <button className="button button--soft" disabled={full || inventory.length === 0} onClick={() => onAssign({ roomId: room.id })} type="button">Assign animal</button>
                <button className="button button--soft" onClick={() => onEditRoom(room)} type="button">Edit</button>
                <button className="button button--ghost" disabled={room.occupancy > 0} onClick={() => onDeleteRoom(room)} title={room.occupancy > 0 ? 'Unassign animals before deleting this room' : 'Delete room'} type="button">Delete</button>
              </div>}
            </article>
          );
        })}
      </section>

      <section className="panel room-assignment-panel">
        <div className="panel__heading room-assignment-heading">
          <div><span className="eyebrow">Animal locations</span><h3>ID / tag to room mapping</h3></div>
          <label className="room-search"><span className="sr-only">Search by animal ID or room</span><input onChange={(event) => setTagFilter(event.target.value)} placeholder="Search animal ID or room" value={tagFilter} /></label>
          <span className="record-count">{filteredAssignments.length} assigned</span>
        </div>
        {assignments.length === 0 ? (
          <div className="analytics-empty analytics-empty--large"><Icon name="room" size={29} /><strong>No animals mapped to rooms</strong><span>Use “Map animal to room” to add the first location.</span></div>
        ) : filteredAssignments.length === 0 ? (
          <div className="analytics-empty"><Icon name="room" size={27} /><strong>No matching assignment</strong><span>Try another animal ID or room name.</span></div>
        ) : (
          <div className="table-wrap">
            <table className="room-assignment-table">
              <thead><tr><th>Animal ID / tag</th><th>Current room</th><th>Batch / livestock</th><th>Supplier</th><th>Assigned</th><th>Notes</th>{canManage && <th>Actions</th>}</tr></thead>
              <tbody>
                {filteredAssignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td><strong className="animal-tag">{assignment.animalTag}</strong></td>
                    <td><span className="room-name-badge"><Icon name="room" size={14} />{assignment.roomName}</span></td>
                    <td><div className="primary-cell"><span className="batch-id batch-id--room">#{String(assignment.purchaseId).padStart(3, '0')}</span><div><strong>{animalLabel(assignment.species, assignment.breed)}</strong></div></div></td>
                    <td>{assignment.supplier}</td>
                    <td>{formatDateTime(assignment.assignedAt)}</td>
                    <td><span className="table-notes">{assignment.notes || '—'}</span></td>
                    {canManage && <td><div className="room-row-actions"><button className="button button--soft" onClick={() => onMove(assignment)} type="button">Move</button><button className="button button--ghost" onClick={() => onUnassign(assignment)} type="button">Unassign</button></div></td>}
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

export function RoomForm({ initial = {}, onClose, onSubmit }) {
  const isEdit = Boolean(initial.id);
  const [form, setForm] = useState({
    id: initial.id || null,
    name: initial.name || '',
    capacity: String(initial.capacity ?? 0),
    description: initial.description || '',
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
      <div className="modal__header"><div><span className="eyebrow">Housing setup</span><h2>{isEdit ? 'Edit livestock room' : 'Create livestock room'}</h2><p>{isEdit ? 'Update the room name, animal capacity, or description.' : 'Add a named room before assigning animal IDs or tags.'}</p></div><button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button></div>
      <div className="modal__body">
        {error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}
        <div className="form-grid">
          <Field label="Room name"><input autoFocus maxLength="100" name="name" onChange={change} placeholder="e.g. Room A" required value={form.name} /></Field>
          <Field hint={isEdit ? `0 means unlimited · current occupancy ${initial.occupancy}` : '0 means unlimited'} label="Animal capacity"><input inputMode="numeric" min="0" name="capacity" onChange={change} step="1" type="number" value={form.capacity} /></Field>
          <Field className="field--full" hint="Optional" label="Room description"><textarea maxLength="500" name="description" onChange={change} placeholder="Location, facilities, or room purpose" rows="3" value={form.description} /></Field>
        </div>
      </div>
      <div className="modal__footer"><button className="button button--ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary" disabled={saving} type="submit">{saving ? 'Saving…' : isEdit ? 'Save room changes' : 'Create room'} <Icon name="check" size={17} /></button></div>
    </form>
  );
}

export function RoomAssignmentForm({ assignments, initial = {}, inventory, onClose, onSubmit, rooms, treatments, weights }) {
  const isMove = Boolean(initial.id);
  const availableRooms = rooms.filter((room) => room.isUnlimited || room.availableCapacity > 0 || room.id === initial.roomId);
  const firstRoom = availableRooms.find((room) => room.id !== initial.roomId) || availableRooms[0];
  const [form, setForm] = useState({
    id: initial.id || null,
    roomId: initial.roomId ? String(initial.roomId) : initial.preferredRoomId ? String(initial.preferredRoomId) : firstRoom ? String(firstRoom.id) : '',
    purchaseId: initial.purchaseId ? String(initial.purchaseId) : inventory[0] ? String(inventory[0].id) : '',
    animalTag: initial.animalTag || '',
    notes: initial.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const knownAnimals = useMemo(() => {
    const assignedTags = new Set(assignments.filter((item) => item.id !== initial.id).map((item) => item.animalTag.toLocaleLowerCase()));
    const tags = new Map();
    for (const entry of [...weights, ...treatments]) {
      if (!entry.animalTag || assignedTags.has(entry.animalTag.toLocaleLowerCase())) continue;
      if (!inventory.some((batch) => batch.id === entry.purchaseId)) continue;
      const key = entry.animalTag.trim().toLocaleLowerCase();
      if (!tags.has(key)) tags.set(key, { tag: entry.animalTag, purchaseId: entry.purchaseId });
    }
    return [...tags.values()].sort((a, b) => a.tag.localeCompare(b.tag));
  }, [assignments, initial.id, inventory, treatments, weights]);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => {
      if (name !== 'animalTag') return { ...current, [name]: value };
      const known = knownAnimals.find((animal) => animal.tag.toLocaleLowerCase() === value.trim().toLocaleLowerCase());
      return { ...current, animalTag: value, purchaseId: known ? String(known.purchaseId) : current.purchaseId };
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
      <div className="modal__header"><div><span className="eyebrow">Animal location</span><h2>{isMove ? 'Move animal to another room' : 'Map animal to room'}</h2><p>{isMove ? `${initial.animalTag} is currently in ${initial.roomName}.` : 'Assign one animal ID or tag to its current room.'}</p></div><button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button></div>
      <div className="modal__body">
        {error && <div className="form-error"><Icon name="alert" size={17} />{error}</div>}
        <div className="form-grid">
          {!isMove && (
            <>
              <Field label="Animal ID / tag"><input autoFocus list="room-animal-tags" maxLength="60" name="animalTag" onChange={change} placeholder="e.g. TAG-104" required value={form.animalTag} /><datalist id="room-animal-tags">{knownAnimals.map((animal) => <option key={animal.tag} value={animal.tag} />)}</datalist></Field>
              <Field label="Purchase batch"><select name="purchaseId" onChange={change} required value={form.purchaseId}>{inventory.map((batch) => <option key={batch.id} value={batch.id}>#{String(batch.id).padStart(3, '0')} · {animalLabel(batch.species, batch.breed)} · {batch.availableQuantity} available</option>)}</select></Field>
            </>
          )}
          <Field label={isMove ? 'Move to room' : 'Room'}><select autoFocus={isMove} name="roomId" onChange={change} required value={form.roomId}>{availableRooms.map((room) => <option key={room.id} value={room.id}>{room.name} · {room.isUnlimited ? `${room.occupancy} occupied · unlimited` : `${room.availableCapacity} spaces available`}</option>)}</select></Field>
          {!isMove && <Field hint="Optional" label="Assignment notes"><input maxLength="500" name="notes" onChange={change} placeholder="Location details or observations" value={form.notes} /></Field>}
        </div>
      </div>
      <div className="modal__footer"><button className="button button--ghost" onClick={onClose} type="button">Cancel</button><button className="button button--primary" disabled={saving || !form.roomId} type="submit">{saving ? 'Saving…' : isMove ? 'Move animal' : 'Map animal'} <Icon name="check" size={17} /></button></div>
    </form>
  );
}
