import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AnalyticsDashboard from './analytics/AnalyticsDashboard.jsx';
import { api } from './api.js';
import { ExpenditureForm, ExpenditurePage } from './ExpenditureModule.jsx';
import { FeedForm, FeedPage } from './FeedModule.jsx';
import { Icon } from './Icons.jsx';
import ReportsPage from './reports/ReportsPage.jsx';
import { RoomAssignmentForm, RoomForm, RoomsPage } from './RoomModule.jsx';
import { ShedConstructionForm, ShedConstructionPage } from './ShedConstructionModule.jsx';
import { TagForm, TagsPage } from './TagsModule.jsx';
import { TreatmentForm, TreatmentPage } from './TreatmentModule.jsx';
import { EditAccessForm, ResetPasswordForm, UserForm, UsersPage } from './UserModule.jsx';
import { WeightForm, WeightPage } from './WeightModule.jsx';

const currency = import.meta.env.VITE_CURRENCY || 'INR';
const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat('en-IN');

const navigation = [
  { id: 'dashboard', label: 'Overview', icon: 'dashboard' },
  { id: 'analytics', label: 'Analytics', icon: 'trending' },
  { id: 'purchases', label: 'Purchases', icon: 'purchases' },
  { id: 'sales', label: 'Sales', icon: 'sales' },
  { id: 'expenditures', label: 'Expenses', icon: 'expenditure' },
  { id: 'inventory', label: 'Inventory', icon: 'inventory' },
  { id: 'rooms', label: 'Rooms', icon: 'room' },
  { id: 'shed-constructions', label: 'Shed costs', icon: 'room' },
  { id: 'feeds', label: 'Feed', icon: 'feed' },
  { id: 'weights', label: 'Weights', icon: 'weight' },
  { id: 'tags', label: 'Tags', icon: 'herd' },
  { id: 'treatments', label: 'Treatments', icon: 'treatment' },
  { id: 'reports', label: 'Reports', icon: 'reports' },
  { id: 'users', label: 'Users', icon: 'users', adminOnly: true },
];

const pageCopy = {
  dashboard: ['Farm overview', 'A clear view of your herd and business'],
  analytics: ['Analytics dashboard', 'Management, financial, and animal performance insights'],
  purchases: ['Purchase ledger', 'Track every incoming livestock batch'],
  sales: ['Sales ledger', 'Review customers, revenue, and realized profit'],
  expenditures: ['Day-to-day expenditures', 'Track operational payments and expense descriptions'],
  inventory: ['Live inventory', 'Animals currently available for sale'],
  rooms: ['Animal rooms', 'Map each animal ID or tag to its current room'],
  'shed-constructions': ['Shed construction costs', 'Track building expenses by category'],
  feeds: ['Daily feed', 'Track three timed meals and basket quantities'],
  weights: ['Animal weights', 'Record and review livestock weight measurements'],
  tags: ['Animal ID tags', 'Manage the predefined tags used when recording weights'],
  treatments: ['Animal treatments', 'Record ID-based medical care and follow-ups'],
  reports: ['Reports', 'Filter, review, and print livestock records'],
  users: ['User management', 'Create users and control application access'],
};

const emptyDashboard = {
  totalPurchased: 0,
  purchaseInvestment: 0,
  totalSold: 0,
  salesRevenue: 0,
  currentStock: 0,
  inventoryValue: 0,
  realizedProfit: 0,
};

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function animalLabel(species, breed) {
  return breed ? `${breed} ${species}` : species;
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand__mark"><Icon name="herd" size={compact ? 24 : 30} /></span>
      <span className="brand__words">
        <strong>CSR AGRO VENTURES</strong>
        {!compact && <small>Livestock manager</small>}
      </span>
    </div>
  );
}

function NavItems({ activePage, currentUser, canAccess, onNavigate, mobile = false }) {
  const itemRefs = useRef([]);
  const availableNavigation = navigation.filter((item) => {
    if (item.adminOnly) return currentUser?.role === 'admin';
    return canAccess ? canAccess(item.id) : true;
  });

  useEffect(() => {
    const activeIndex = availableNavigation.findIndex((item) => item.id === activePage);
    const activeButton = itemRefs.current[activeIndex];
    if (activeButton && activeButton.offsetParent !== null) {
      activeButton.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activePage]);

  function moveTo(index) {
    const nextIndex = (index + availableNavigation.length) % availableNavigation.length;
    const nextItem = availableNavigation[nextIndex];
    const nextButton = itemRefs.current[nextIndex];
    onNavigate(nextItem.id);
    nextButton?.focus();
    nextButton?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function handleKeyDown(event, index) {
    const nextKey = mobile ? 'ArrowRight' : 'ArrowDown';
    const previousKey = mobile ? 'ArrowLeft' : 'ArrowUp';
    let nextIndex = null;

    if (event.key === nextKey) nextIndex = index + 1;
    else if (event.key === previousKey) nextIndex = index - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = availableNavigation.length - 1;

    if (nextIndex == null) return;
    event.preventDefault();
    moveTo(nextIndex);
  }

  return availableNavigation.map((item, index) => (
    <button
      aria-current={activePage === item.id ? 'page' : undefined}
      className={`nav-item ${activePage === item.id ? 'nav-item--active' : ''}`}
      key={item.id}
      onClick={() => onNavigate(item.id)}
      onKeyDown={(event) => handleKeyDown(event, index)}
      ref={(button) => { itemRefs.current[index] = button; }}
      tabIndex={activePage === item.id ? 0 : -1}
      type="button"
    >
      <Icon name={item.icon} size={mobile ? 19 : 20} />
      <span>{item.label}</span>
    </button>
  ));
}

function StatCard({ icon, label, value, note, tone = 'green' }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__top">
        <span>{label}</span>
        <span className="stat-card__icon"><Icon name={icon} size={20} /></span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function EmptyState({ icon, title, message, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Icon name={icon} size={28} /></span>
      <h3>{title}</h3>
      <p>{message}</p>
      {onAction && (
        <button className="button button--primary" onClick={onAction} type="button">
          <Icon name="plus" size={17} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

function Dashboard({ canManage, dashboard, purchases, sales, inventory, onAddPurchase, onAddSale }) {
  const activities = useMemo(() => [
    ...purchases.map((purchase) => ({
      id: `purchase-${purchase.id}`,
      type: 'purchase',
      date: purchase.purchaseDate,
      title: `${formatNumber(purchase.quantity)} ${animalLabel(purchase.species, purchase.breed)}`,
      party: purchase.supplier,
      amount: purchase.totalCost,
    })),
    ...sales.map((sale) => ({
      id: `sale-${sale.id}`,
      type: 'sale',
      date: sale.saleDate,
      title: `${formatNumber(sale.quantity)} ${animalLabel(sale.species, sale.breed)}`,
      party: sale.customer,
      amount: sale.revenue,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6), [purchases, sales]);

  const speciesSummary = useMemo(() => {
    const grouped = new Map();
    for (const batch of inventory) {
      const current = grouped.get(batch.species) || { quantity: 0, value: 0 };
      current.quantity += batch.availableQuantity;
      current.value += batch.availableQuantity * batch.landedUnitCost;
      grouped.set(batch.species, current);
    }
    return [...grouped.entries()]
      .map(([species, details]) => ({ species, ...details }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [inventory]);

  return (
    <>
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Today at a glance</span>
          <h2>Your herd, accounted for.</h2>
          <p>Record every animal from purchase to sale and know where your money stands.</p>
        </div>
        {canManage && <div className="hero-panel__actions">
          <button className="button button--light" onClick={onAddPurchase} type="button">
            <Icon name="plus" size={17} /> New purchase
          </button>
          <button
            className="button button--outline-light"
            disabled={inventory.length === 0}
            onClick={onAddSale}
            type="button"
          >
            Record sale <Icon name="arrow" size={17} />
          </button>
        </div>}
        <StatCard
          icon="herd"
          label="Animals in stock"
          value={formatNumber(dashboard.currentStock)}
          note={`${formatNumber(dashboard.totalPurchased)} purchased · ${formatNumber(dashboard.totalSold)} sold`}
        />
        <StatCard
          icon="wallet"
          label="Inventory value"
          value={formatMoney(dashboard.inventoryValue)}
          note={`${formatMoney(dashboard.purchaseInvestment)} invested in purchases`}
          tone="sand"
        />
        <StatCard
          icon="sales"
          label="Sales revenue"
          value={formatMoney(dashboard.salesRevenue)}
          note={`Across ${formatNumber(dashboard.totalSold)} animals sold`}
          tone="blue"
        />
        <StatCard
          icon="trending"
          label="Realized profit"
          value={formatMoney(dashboard.realizedProfit)}
          note="Revenue less landed purchase cost"
          tone={dashboard.realizedProfit < 0 ? 'red' : 'orange'}
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Movement</span>
              <h3>Recent activity</h3>
            </div>
            <span className="record-count">{activities.length} records</span>
          </div>
          {activities.length === 0 ? (
            <EmptyState
              actionLabel="Add first purchase"
              icon="calendar"
              message="Purchases and sales will appear here as you record them."
              onAction={canManage ? onAddPurchase : undefined}
              title="No activity yet"
            />
          ) : (
            <div className="activity-list">
              {activities.map((activity) => (
                <div className="activity-row" key={activity.id}>
                  <span className={`activity-row__icon activity-row__icon--${activity.type}`}>
                    <Icon name={activity.type === 'purchase' ? 'purchases' : 'sales'} size={18} />
                  </span>
                  <div className="activity-row__main">
                    <strong>{activity.title}</strong>
                    <span>{activity.type === 'purchase' ? 'From' : 'To'} {activity.party}</span>
                  </div>
                  <div className="activity-row__value">
                    <strong>{activity.type === 'purchase' ? '−' : '+'}{formatMoney(activity.amount)}</strong>
                    <span>{formatDate(activity.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Composition</span>
              <h3>Stock by species</h3>
            </div>
            <span className="record-count">{speciesSummary.length} types</span>
          </div>
          {speciesSummary.length === 0 ? (
            <EmptyState
              icon="inventory"
              message="Available animals will be grouped by species here."
              title="No stock available"
            />
          ) : (
            <div className="species-list">
              {speciesSummary.map((item) => {
                const percentage = dashboard.currentStock
                  ? Math.round((item.quantity / dashboard.currentStock) * 100)
                  : 0;
                return (
                  <div className="species-row" key={item.species}>
                    <div className="species-row__meta">
                      <strong>{item.species}</strong>
                      <span>{formatNumber(item.quantity)} animals · {formatMoney(item.value)}</span>
                    </div>
                    <span>{percentage}%</span>
                    <div className="progress-track">
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </>
  );
}

function PurchasesPage({ canManage, purchases, onAdd, onDelete, onEdit }) {
  if (purchases.length === 0) {
    return (
      <section className="panel page-panel">
        <EmptyState
          actionLabel="Record a purchase"
          icon="purchases"
          message="Add an incoming livestock batch to begin tracking stock and cost."
          onAction={canManage ? onAdd : undefined}
          title="Your purchase ledger is empty"
        />
      </section>
    );
  }

  return (
    <section className="panel page-panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Batch</th>
              <th>Purchase date</th>
              <th>Supplier</th>
              <th>Quantity</th>
              <th>Available</th>
              <th>Total cost</th>
              {canManage && <th><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase) => (
              <tr key={purchase.id}>
                <td>
                  <div className="primary-cell">
                    <span className="batch-id">#{String(purchase.id).padStart(3, '0')}</span>
                    <div><strong>{animalLabel(purchase.species, purchase.breed)}</strong><small>{purchase.notes || 'No notes'}</small></div>
                  </div>
                </td>
                <td>{formatDate(purchase.purchaseDate)}</td>
                <td>{purchase.supplier}</td>
                <td>{formatNumber(purchase.quantity)}</td>
                <td><span className={`stock-pill ${purchase.availableQuantity === 0 ? 'stock-pill--empty' : ''}`}>{formatNumber(purchase.availableQuantity)} left</span></td>
                <td><strong>{formatMoney(purchase.totalCost)}</strong><small className="cell-note">{formatMoney(purchase.landedUnitCost)} each landed</small></td>
                {canManage && <td>
                  <div className="row-actions">
                    <button
                      className="button button--soft"
                      onClick={() => onEdit(purchase)}
                      title="Edit purchase"
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      aria-label={`Delete purchase batch ${purchase.id}`}
                      className="icon-button"
                      disabled={purchase.soldQuantity > 0}
                      onClick={() => onDelete(purchase)}
                      title={purchase.soldQuantity > 0 ? 'Delete linked sales first' : 'Delete purchase'}
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
  );
}

function SalesPage({ canManage, sales, onAdd, onDelete, onViewInvoice }) {
  if (sales.length === 0) {
    return (
      <section className="panel page-panel">
        <EmptyState
          actionLabel="Record a sale"
          icon="sales"
          message="Once livestock is in stock, record a sale to track revenue and profit."
          onAction={canManage ? onAdd : undefined}
          title="No sales recorded"
        />
      </section>
    );
  }

  return (
    <section className="panel page-panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sale</th>
              <th>Sale date</th>
              <th>Customer</th>
              <th>Quantity</th>
              <th>Revenue</th>
              <th>Profit</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>
                  <div className="primary-cell">
                    <span className="batch-id batch-id--sale">#{String(sale.id).padStart(3, '0')}</span>
                    <div><strong>{animalLabel(sale.species, sale.breed)}</strong><small>From batch #{String(sale.purchaseId).padStart(3, '0')}</small></div>
                  </div>
                </td>
                <td>{formatDate(sale.saleDate)}</td>
                <td>{sale.customer}</td>
                <td>{formatNumber(sale.quantity)}</td>
                <td><strong>{formatMoney(sale.revenue)}</strong><small className="cell-note">{formatMoney(sale.unitPrice)} each</small></td>
                <td><span className={`profit-value ${sale.profit < 0 ? 'profit-value--negative' : ''}`}>{sale.profit >= 0 ? '+' : ''}{formatMoney(sale.profit)}</span></td>
                <td>
                  <div className="sale-row-actions">
                    <button
                      aria-label={`View invoice for sale ${sale.id}`}
                      className="button button--ghost sale-invoice-button"
                      onClick={() => onViewInvoice(sale)}
                      title="View and print customer invoice"
                      type="button"
                    >
                      <Icon name="reports" size={16} /> Invoice
                    </button>
                    {canManage && (
                      <button
                        aria-label={`Delete sale ${sale.id}`}
                        className="icon-button"
                        onClick={() => onDelete(sale)}
                        title="Delete sale and return animals to stock"
                        type="button"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InventoryPage({ canManage, inventory, onAddSale, onAddPurchase }) {
  if (inventory.length === 0) {
    return (
      <section className="panel page-panel">
        <EmptyState
          actionLabel="Add livestock"
          icon="inventory"
          message="Add a purchase batch to place animals into available inventory."
          onAction={canManage ? onAddPurchase : undefined}
          title="No livestock in stock"
        />
      </section>
    );
  }

  return (
    <div className="inventory-grid">
      {inventory.map((batch) => {
        const soldPercentage = Math.round((batch.soldQuantity / batch.quantity) * 100);
        return (
          <article className="inventory-card" key={batch.id}>
            <div className="inventory-card__top">
              <span className="animal-avatar"><Icon name="herd" size={25} /></span>
              <div>
                <span className="eyebrow">Batch #{String(batch.id).padStart(3, '0')}</span>
                <h3>{animalLabel(batch.species, batch.breed)}</h3>
              </div>
              <span className="stock-pill">In stock</span>
            </div>
            <div className="inventory-card__quantity">
              <strong>{formatNumber(batch.availableQuantity)}</strong>
              <span>of {formatNumber(batch.quantity)} animals available</span>
            </div>
            <div className="progress-track progress-track--large">
              <span style={{ width: `${100 - soldPercentage}%` }} />
            </div>
            <dl className="inventory-card__details">
              <div><dt>Supplier</dt><dd>{batch.supplier}</dd></div>
              <div><dt>Purchased</dt><dd>{formatDate(batch.purchaseDate)}</dd></div>
              <div><dt>Landed cost</dt><dd>{formatMoney(batch.landedUnitCost)} / head</dd></div>
              <div><dt>Stock value</dt><dd>{formatMoney(batch.availableQuantity * batch.landedUnitCost)}</dd></div>
            </dl>
            {canManage && <button className="button button--soft button--full" onClick={() => onAddSale(batch.id)} type="button">
              Sell from this batch <Icon name="arrow" size={17} />
            </button>}
          </article>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}{hint && <small>{hint}</small>}</span>
      {children}
    </label>
  );
}

function FormError({ message }) {
  if (!message) return null;
  return <div className="form-error"><Icon name="alert" size={17} />{message}</div>;
}

function PurchaseForm({ initial, onClose, onSubmit }) {
  const isEditing = Boolean(initial);
  const [form, setForm] = useState({
    purchaseDate: initial?.purchaseDate ?? today(),
    supplier: initial?.supplier ?? '',
    species: initial?.species ?? '',
    breed: initial?.breed ?? '',
    quantity: initial ? String(initial.quantity) : '',
    unitCost: initial ? String(initial.unitCost) : '',
    transportCost: initial ? String(initial.transportCost) : '0',
    notes: initial?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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

  const estimatedTotal = (Number(form.quantity) || 0) * (Number(form.unitCost) || 0)
    + (Number(form.transportCost) || 0);

  return (
    <form onSubmit={submit}>
      <div className="modal__header">
        <div><span className="eyebrow">Incoming stock</span><h2>{isEditing ? 'Edit purchase' : 'Record purchase'}</h2><p>{isEditing ? 'Update the details of this livestock batch.' : 'Create a livestock batch and add it to inventory.'}</p></div>
        <button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
      </div>
      <div className="modal__body">
        <FormError message={error} />
        <div className="form-grid">
          <Field label="Purchase date"><input name="purchaseDate" onChange={change} required type="date" value={form.purchaseDate} /></Field>
          <Field label="Supplier"><input autoFocus name="supplier" onChange={change} placeholder="e.g. Green Valley Farm" required value={form.supplier} /></Field>
          <Field label="Species"><input name="species" onChange={change} placeholder="e.g. Cattle" required value={form.species} /></Field>
          <Field label="Breed" hint="Optional"><input name="breed" onChange={change} placeholder="e.g. Gir" value={form.breed} /></Field>
          <Field label="Number of animals"><input min="1" name="quantity" onChange={change} placeholder="0" required type="number" value={form.quantity} /></Field>
          <Field label="Cost per animal"><input inputMode="decimal" min="0" name="unitCost" onChange={change} placeholder="0.00" required step="0.01" type="number" value={form.unitCost} /></Field>
          <Field label="Transport & other costs"><input inputMode="decimal" min="0" name="transportCost" onChange={change} step="0.01" type="number" value={form.transportCost} /></Field>
          <Field label="Notes" hint="Optional"><input name="notes" onChange={change} placeholder="Health, tags, or payment details" value={form.notes} /></Field>
        </div>
        <div className="calculation-strip"><span>Estimated total investment</span><strong>{formatMoney(estimatedTotal)}</strong></div>
      </div>
      <div className="modal__footer">
        <button className="button button--ghost" onClick={onClose} type="button">Cancel</button>
        <button className="button button--primary" disabled={saving} type="submit">{saving ? 'Saving…' : (isEditing ? 'Save changes' : 'Save purchase')}<Icon name="check" size={17} /></button>
      </div>
    </form>
  );
}

function SaleForm({ initialPurchaseId, inventory, onClose, onSubmit }) {
  const initialBatch = inventory.find((batch) => batch.id === initialPurchaseId) || inventory[0];
  const [form, setForm] = useState({
    saleDate: today(),
    customer: '',
    purchaseId: initialBatch ? String(initialBatch.id) : '',
    quantity: '',
    unitPrice: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selectedBatch = inventory.find((batch) => batch.id === Number(form.purchaseId));

  function change(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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

  const quantity = Number(form.quantity) || 0;
  const price = Number(form.unitPrice) || 0;
  const estimatedRevenue = quantity * price;
  const estimatedProfit = selectedBatch
    ? quantity * (price - selectedBatch.landedUnitCost)
    : 0;

  return (
    <form onSubmit={submit}>
      <div className="modal__header">
        <div><span className="eyebrow">Outgoing stock</span><h2>Record sale</h2><p>Sell animals from an available purchase batch.</p></div>
        <button aria-label="Close" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
      </div>
      <div className="modal__body">
        <FormError message={error} />
        <div className="form-grid">
          <Field label="Sale date"><input name="saleDate" onChange={change} required type="date" value={form.saleDate} /></Field>
          <Field label="Customer"><input autoFocus name="customer" onChange={change} placeholder="e.g. Sunrise Dairy" required value={form.customer} /></Field>
          <Field label="Purchase batch">
            <select name="purchaseId" onChange={change} required value={form.purchaseId}>
              {inventory.map((batch) => <option key={batch.id} value={batch.id}>#{String(batch.id).padStart(3, '0')} · {animalLabel(batch.species, batch.breed)} · {batch.availableQuantity} available</option>)}
            </select>
          </Field>
          <Field label="Number of animals" hint={selectedBatch ? `Max ${selectedBatch.availableQuantity}` : ''}><input max={selectedBatch?.availableQuantity} min="1" name="quantity" onChange={change} placeholder="0" required type="number" value={form.quantity} /></Field>
          <Field label="Price per animal"><input inputMode="decimal" min="0" name="unitPrice" onChange={change} placeholder="0.00" required step="0.01" type="number" value={form.unitPrice} /></Field>
          <Field label="Notes" hint="Optional"><input name="notes" onChange={change} placeholder="Payment or delivery details" value={form.notes} /></Field>
        </div>
        <div className="calculation-grid">
          <div><span>Estimated revenue</span><strong>{formatMoney(estimatedRevenue)}</strong></div>
          <div><span>Estimated profit</span><strong className={estimatedProfit < 0 ? 'negative' : 'positive'}>{estimatedProfit >= 0 ? '+' : ''}{formatMoney(estimatedProfit)}</strong></div>
        </div>
      </div>
      <div className="modal__footer">
        <button className="button button--ghost" onClick={onClose} type="button">Cancel</button>
        <button className="button button--primary" disabled={saving || inventory.length === 0} type="submit">{saving ? 'Saving…' : 'Complete sale'}<Icon name="check" size={17} /></button>
      </div>
    </form>
  );
}

function SaleInvoice({ onClose, sale }) {
  const invoiceNumber = `INV-${String(sale.id).padStart(5, '0')}`;

  return (
    <div className="sale-invoice">
      <div className="modal__header no-print">
        <div><span className="eyebrow">Customer document</span><h2>Sales invoice</h2><p>Review or print this invoice for the customer.</p></div>
        <button aria-label="Close invoice" className="icon-button" onClick={onClose} type="button"><Icon name="close" /></button>
      </div>
      <article className="invoice-document">
        <header className="invoice-header">
          <div className="invoice-brand">
            <span className="brand__mark"><Icon name="herd" size={30} /></span>
            <div><strong>CSR AGRO VENTURES</strong><span>Livestock sales invoice</span></div>
          </div>
          <div className="invoice-number"><span>Invoice</span><strong>{invoiceNumber}</strong></div>
        </header>

        <section className="invoice-parties">
          <div><span>Bill to</span><strong>{sale.customer}</strong></div>
          <dl>
            <div><dt>Invoice date</dt><dd>{formatDate(sale.saleDate)}</dd></div>
            <div><dt>Sale reference</dt><dd>#{String(sale.id).padStart(3, '0')}</dd></div>
            <div><dt>Source batch</dt><dd>#{String(sale.purchaseId).padStart(3, '0')}</dd></div>
          </dl>
        </section>

        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead><tr><th>Description</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead>
            <tbody><tr>
              <td><strong>{animalLabel(sale.species, sale.breed)}</strong><small>Livestock from batch #{String(sale.purchaseId).padStart(3, '0')}</small></td>
              <td>{formatNumber(sale.quantity)}</td>
              <td>{formatMoney(sale.unitPrice)}</td>
              <td><strong>{formatMoney(sale.revenue)}</strong></td>
            </tr></tbody>
          </table>
        </div>

        <section className="invoice-summary">
          {sale.notes ? <div className="invoice-notes"><span>Notes</span><p>{sale.notes}</p></div> : <div />}
          <dl><div><dt>Total amount</dt><dd>{formatMoney(sale.revenue)}</dd></div></dl>
        </section>
        <footer className="invoice-footer">Thank you for your business.</footer>
      </article>
      <div className="modal__footer no-print">
        <button className="button button--ghost" onClick={onClose} type="button">Close</button>
        <button className="button button--primary" onClick={() => window.print()} type="button"><Icon name="reports" size={17} /> Print invoice</button>
      </div>
    </div>
  );
}

export default function App({ currentUser, onLogout }) {
  const canManage = currentUser?.role === 'admin';
  // Admins and legacy users (null allowedModules) see everything. Dashboard and
  // the admin-only Users page are handled separately. Staff see only granted modules.
  const allowedModules = currentUser?.allowedModules ?? null;
  const canAccess = useCallback((moduleId) => {
    if (currentUser?.role === 'admin') return true;
    if (moduleId === 'dashboard') return true;
    if (moduleId === 'users') return false;
    if (allowedModules == null) return true;
    return allowedModules.includes(moduleId);
  }, [currentUser, allowedModules]);
  const [activePage, setActivePage] = useState('dashboard');
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [weights, setWeights] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [roomAssignments, setRoomAssignments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [shedConstructions, setShedConstructions] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [invoiceSale, setInvoiceSale] = useState(null);
  const [weightInitial, setWeightInitial] = useState({});
  const [feedInitial, setFeedInitial] = useState({});
  const [roomInitial, setRoomInitial] = useState({});
  const [roomAssignmentInitial, setRoomAssignmentInitial] = useState({});
  const [purchaseInitial, setPurchaseInitial] = useState(null);
  const [tagInitial, setTagInitial] = useState({});
  const [userModal, setUserModal] = useState(null);
  const [userRefreshKey, setUserRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    setError('');
    // Only request modules the current user can access; a staff user without a
    // module would otherwise get a 403 that rejects the whole batch. Each fetch
    // is independent so one failure doesn't blank the rest.
    const tasks = [
      ['dashboard', () => api.getDashboard(), setDashboard, emptyDashboard],
      ['purchases', () => api.getPurchases(), setPurchases, []],
      ['sales', () => api.getSales(), setSales, []],
      ['inventory', () => api.getInventory(), setInventory, []],
      ['weights', () => api.getWeights(), setWeights, []],
      ['treatments', () => api.getTreatments(), setTreatments, []],
      ['feeds', () => api.getFeeds(), setFeeds, []],
      ['rooms', () => api.getRooms(), setRooms, []],
      ['rooms', () => api.getRoomAssignments(), setRoomAssignments, []],
      ['expenditures', () => api.getExpenditures(), setExpenditures, []],
      ['shed-constructions', () => api.getShedConstructions(), setShedConstructions, []],
      // Tags feed the weights form too, so fetch when the user can access either.
      [['tags', 'weights'], () => api.getTags(), setTags, []],
    ];
    try {
      await Promise.all(tasks.map(async ([moduleId, fetcher, setter, fallback]) => {
        const moduleIds = Array.isArray(moduleId) ? moduleId : [moduleId];
        if (!moduleIds.some((id) => canAccess(id))) {
          setter(fallback);
          return;
        }
        try {
          setter(await fetcher());
        } catch {
          // A denied or failed module should not break the rest of the app.
          setter(fallback);
        }
      }));
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!canManage) {
      setModal(null);
      setUserModal(null);
      if (activePage === 'users') setActivePage('dashboard');
    }
    // Bounce staff away from any module they are not allowed to view.
    if (!canAccess(activePage)) setActivePage('dashboard');
  }, [activePage, canManage, canAccess]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function openPurchase(purchase = null) {
    setPurchaseInitial(purchase);
    setModal('purchase');
  }

  async function savePurchase(purchase) {
    if (purchaseInitial) {
      await api.updatePurchase(purchaseInitial.id, purchase);
    } else {
      await api.createPurchase(purchase);
    }
    setModal(null);
    setPurchaseInitial(null);
    setNotice(purchaseInitial ? 'Purchase updated.' : 'Purchase saved and inventory updated.');
    await loadData();
  }

  async function addSale(sale) {
    await api.createSale(sale);
    setModal(null);
    setNotice('Sale recorded and profit updated.');
    await loadData();
  }

  function openWeight(initial = {}) {
    setWeightInitial(initial);
    setModal('weight');
  }

  async function saveWeight(weight) {
    if (weightInitial.id) {
      await api.updateWeight(weightInitial.id, weight);
      setNotice('Weight entry updated.');
    } else {
      await api.createWeight(weight);
      setNotice('Animal weight recorded.');
    }
    setModal(null);
    setWeightInitial({});
    await loadData();
  }

  async function addTreatment(treatment) {
    await api.createTreatment(treatment);
    setModal(null);
    setNotice('Medical treatment recorded.');
    await loadData();
  }

  function openFeed(initial = {}) {
    setFeedInitial(initial);
    setModal('feed');
  }

  async function addFeed(feed) {
    await api.createFeed(feed);
    setModal(null);
    setNotice('Feed basket entry recorded.');
    await loadData();
  }

  async function removeFeed(feed) {
    if (!window.confirm(`Delete the ${feed.slot} feed entry for batch #${String(feed.purchaseId).padStart(3, '0')}?`)) return;
    try {
      await api.deleteFeed(feed.id);
      setNotice('Feed entry deleted.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function addExpenditure(expenditure) {
    await api.createExpenditure(expenditure);
    setModal(null);
    setNotice('Expenditure recorded.');
    await loadData();
  }

  async function removeExpenditure(expenditure) {
    if (!window.confirm(`Delete the ${expenditure.purpose} expenditure of ${formatMoney(expenditure.amount)}?`)) return;
    try {
      await api.deleteExpenditure(expenditure.id);
      setNotice('Expenditure deleted.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function addShedConstruction(entry) {
    await api.createShedConstruction(entry);
    setModal(null);
    setNotice('Shed construction cost recorded.');
    await loadData();
  }

  async function removeShedConstruction(entry) {
    if (!window.confirm(`Delete the ${entry.category} construction cost of ${formatMoney(entry.amount)}?`)) return;
    try {
      await api.deleteShedConstruction(entry.id);
      setNotice('Shed construction cost deleted.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function openTag(initial = {}) {
    setTagInitial(initial);
    setModal('tag');
  }

  async function saveTag(tag) {
    if (tagInitial.id) {
      await api.updateTag(tagInitial.id, tag);
      setNotice('Tag updated.');
    } else {
      await api.createTag(tag);
      setNotice('Tag added.');
    }
    setModal(null);
    setTagInitial({});
    await loadData();
  }

  async function removeTag(tag) {
    if (!window.confirm(`Delete tag ${tag.code}?`)) return;
    try {
      await api.deleteTag(tag.id);
      setNotice('Tag deleted.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function openRoom(initial = {}) {
    setRoomInitial(initial);
    setModal('room');
  }

  async function saveRoom(room) {
    if (room.id) {
      await api.updateRoom(room.id, room);
      setNotice('Room updated.');
    } else {
      await api.createRoom(room);
      setNotice('Room created.');
    }
    setModal(null);
    await loadData();
  }

  async function removeRoom(room) {
    if (!window.confirm(`Delete ${room.name}?`)) return;
    try {
      await api.deleteRoom(room.id);
      setNotice('Room deleted.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function openRoomAssignment(initial = {}) {
    setRoomAssignmentInitial(initial);
    setModal('room-assignment');
  }

  async function saveRoomAssignment(assignment) {
    if (assignment.id) {
      await api.moveRoomAssignment(assignment.id, assignment.roomId);
      setNotice('Animal moved to the selected room.');
    } else {
      await api.createRoomAssignment(assignment);
      setNotice('Animal mapped to room.');
    }
    setModal(null);
    await loadData();
  }

  async function unassignRoom(assignment) {
    if (!window.confirm(`Unassign ${assignment.animalTag} from ${assignment.roomName}?`)) return;
    try {
      await api.deleteRoomAssignment(assignment.id);
      setNotice('Animal unassigned from room.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function removeTreatment(treatment) {
    if (!window.confirm(`Delete the treatment record for ${treatment.animalTag}?`)) return;
    try {
      await api.deleteTreatment(treatment.id);
      setNotice('Treatment record deleted.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function removeWeight(weight) {
    if (!window.confirm(`Delete the ${weight.weightKg} kg weight entry?`)) return;
    try {
      await api.deleteWeight(weight.id);
      setNotice('Weight entry deleted.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function removePurchase(purchase) {
    if (!window.confirm(`Delete purchase batch #${String(purchase.id).padStart(3, '0')}?`)) return;
    try {
      await api.deletePurchase(purchase.id);
      setNotice('Purchase deleted.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function removeSale(sale) {
    if (!window.confirm(`Delete sale #${String(sale.id).padStart(3, '0')} and return its animals to stock?`)) return;
    try {
      await api.deleteSale(sale.id);
      setNotice('Sale deleted and inventory restored.');
      await loadData();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  const [title, subtitle] = pageCopy[activePage];
  const pageAction = !canManage
    ? null
    : activePage === 'purchases'
      ? { label: 'New purchase', action: () => openPurchase() }
      : activePage === 'sales'
      ? { label: 'Record sale', action: () => setModal('sale'), disabled: inventory.length === 0 }
      : activePage === 'expenditures'
        ? { label: 'Add expenditure', action: () => setModal('expenditure') }
        : activePage === 'shed-constructions'
          ? { label: 'Add construction cost', action: () => setModal('shed-construction') }
        : activePage === 'rooms'
          ? { label: 'Add room', action: () => openRoom() }
          : activePage === 'feeds'
            ? { label: 'Record feed', action: () => openFeed(), disabled: inventory.length === 0 }
            : activePage === 'weights'
              ? { label: 'Record weight', action: () => openWeight(), disabled: inventory.length === 0 }
              : activePage === 'tags'
                ? { label: 'Add tag', action: () => openTag() }
              : activePage === 'treatments'
                ? { label: 'Record treatment', action: () => setModal('treatment'), disabled: inventory.length === 0 }
                : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav aria-label="Main navigation"><NavItems activePage={activePage} canAccess={canAccess} currentUser={currentUser} onNavigate={setActivePage} /></nav>
        <div className="sidebar__account">
          <span className="sidebar__avatar">{currentUser.displayName.slice(0, 1).toUpperCase()}</span>
          <div><strong>{currentUser.displayName}</strong><small>{currentUser.role}</small></div>
          <button aria-label="Sign out" className="sidebar__logout" onClick={onLogout} title="Sign out" type="button"><Icon name="logout" size={18} /></button>
        </div>
        <div className="sidebar__footer">
          <span className="status-dot" />
          <div><strong>Local database</strong><small>Your records stay on this device</small></div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><Brand compact /></div>
          <div className="topbar__title"><h1>{title}</h1><p>{subtitle}</p></div>
          {pageAction && (
            <button className="button button--primary topbar__action" disabled={pageAction.disabled} onClick={pageAction.action} type="button">
              <Icon name="plus" size={17} /> {pageAction.label}
            </button>
          )}
        </header>

        <main>
          {error && <div className="error-banner" role="alert"><Icon name="alert" size={19} /><span>{error}</span><button onClick={() => setError('')} type="button"><Icon name="close" size={17} /></button></div>}
          {loading ? (
            <div className="loading-state"><span className="loader" /><strong>Opening your ledger…</strong></div>
          ) : (
            <>
              {activePage === 'dashboard' && <Dashboard canManage={canManage} dashboard={dashboard} inventory={inventory} onAddPurchase={() => openPurchase()} onAddSale={() => setModal('sale')} purchases={purchases} sales={sales} />}
              {activePage === 'analytics' && canAccess('analytics') && <AnalyticsDashboard assignments={roomAssignments} dashboard={dashboard} inventory={inventory} purchases={purchases} rooms={rooms} sales={sales} weights={weights} />}
              {activePage === 'purchases' && canAccess('purchases') && <PurchasesPage canManage={canManage} onAdd={() => openPurchase()} onDelete={removePurchase} onEdit={openPurchase} purchases={purchases} />}
              {activePage === 'sales' && canAccess('sales') && <SalesPage canManage={canManage} onAdd={inventory.length > 0 ? () => setModal('sale') : null} onDelete={removeSale} onViewInvoice={setInvoiceSale} sales={sales} />}
              {activePage === 'expenditures' && canAccess('expenditures') && <ExpenditurePage canManage={canManage} expenditures={expenditures} onAdd={() => setModal('expenditure')} onDelete={removeExpenditure} />}
              {activePage === 'shed-constructions' && canAccess('shed-constructions') && <ShedConstructionPage canManage={canManage} entries={shedConstructions} onAdd={() => setModal('shed-construction')} onDelete={removeShedConstruction} />}
              {activePage === 'inventory' && canAccess('inventory') && <InventoryPage canManage={canManage} inventory={inventory} onAddPurchase={() => openPurchase()} onAddSale={(batchId) => setModal(`sale:${batchId}`)} />}
              {activePage === 'rooms' && canAccess('rooms') && <RoomsPage assignments={roomAssignments} canManage={canManage} inventory={inventory} onAddRoom={() => openRoom()} onAssign={openRoomAssignment} onDeleteRoom={removeRoom} onEditRoom={openRoom} onMove={openRoomAssignment} onUnassign={unassignRoom} rooms={rooms} weights={weights} />}
              {activePage === 'feeds' && canAccess('feeds') && <FeedPage canManage={canManage} feeds={feeds} inventory={inventory} onAdd={openFeed} onDelete={removeFeed} />}
              {activePage === 'weights' && canAccess('weights') && <WeightPage canManage={canManage} inventory={inventory} onAdd={() => openWeight()} onDelete={removeWeight} onEdit={openWeight} weights={weights} />}
              {activePage === 'tags' && canAccess('tags') && <TagsPage canManage={canManage} onAdd={() => openTag()} onDelete={removeTag} onEdit={openTag} tags={tags} />}
              {activePage === 'treatments' && canAccess('treatments') && <TreatmentPage canManage={canManage} inventory={inventory} onAdd={() => setModal('treatment')} onDelete={removeTreatment} treatments={treatments} />}
              {activePage === 'reports' && canAccess('reports') && <ReportsPage />}
              {activePage === 'users' && currentUser.role === 'admin' && <UsersPage currentUser={currentUser} key={userRefreshKey} onAdd={() => setUserModal({ type: 'create' })} onEditAccess={(user, refresh) => setUserModal({ type: 'access', user, refresh })} onReset={(user, refresh) => setUserModal({ type: 'reset', user, refresh })} />}
            </>
          )}
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="mobile-nav"><NavItems activePage={activePage} canAccess={canAccess} currentUser={currentUser} mobile onNavigate={setActivePage} /></nav>

      {canManage && modal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setModal(null); }} role="presentation">
          <section aria-modal="true" className="modal" role="dialog">
            {modal === 'purchase'
              ? <PurchaseForm initial={purchaseInitial} onClose={() => { setModal(null); setPurchaseInitial(null); }} onSubmit={savePurchase} />
              : modal.startsWith('sale')
                ? <SaleForm initialPurchaseId={Number(modal.split(':')[1]) || null} inventory={inventory} onClose={() => setModal(null)} onSubmit={addSale} />
                : modal === 'weight'
                  ? <WeightForm initial={weightInitial} inventory={inventory} onClose={() => setModal(null)} onSubmit={saveWeight} purchases={purchases} tags={tags} weights={weights} />
                  : modal === 'treatment'
                    ? <TreatmentForm inventory={inventory} onClose={() => setModal(null)} onSubmit={addTreatment} treatments={treatments} weights={weights} />
                    : modal === 'feed'
                      ? <FeedForm initial={feedInitial} inventory={inventory} onClose={() => setModal(null)} onSubmit={addFeed} />
                      : modal === 'room'
                        ? <RoomForm initial={roomInitial} onClose={() => setModal(null)} onSubmit={saveRoom} />
                        : modal === 'room-assignment'
                          ? <RoomAssignmentForm assignments={roomAssignments} initial={roomAssignmentInitial} inventory={inventory} onClose={() => setModal(null)} onSubmit={saveRoomAssignment} rooms={rooms} treatments={treatments} weights={weights} />
                          : modal === 'expenditure'
                            ? <ExpenditureForm onClose={() => setModal(null)} onSubmit={addExpenditure} />
                            : modal === 'shed-construction'
                              ? <ShedConstructionForm onClose={() => setModal(null)} onSubmit={addShedConstruction} />
                              : modal === 'tag'
                                ? <TagForm initial={tagInitial} onClose={() => { setModal(null); setTagInitial({}); }} onSubmit={saveTag} />
                                : null}
          </section>
        </div>
      )}

      {invoiceSale && (
        <div className="modal-backdrop invoice-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setInvoiceSale(null); }} role="presentation">
          <section aria-label={`Invoice INV-${String(invoiceSale.id).padStart(5, '0')}`} aria-modal="true" className="modal invoice-modal" role="dialog">
            <SaleInvoice onClose={() => setInvoiceSale(null)} sale={invoiceSale} />
          </section>
        </div>
      )}

      {canManage && userModal && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setUserModal(null); }} role="presentation">
          <section aria-modal="true" className="modal" role="dialog">
            {userModal.type === 'create'
              ? <UserForm onClose={() => setUserModal(null)} onCreated={() => { setUserModal(null); setUserRefreshKey((value) => value + 1); }} />
              : userModal.type === 'access'
                ? <EditAccessForm onClose={() => setUserModal(null)} onSaved={async () => { setUserModal(null); await userModal.refresh?.(); }} user={userModal.user} />
                : <ResetPasswordForm onClose={() => setUserModal(null)} onReset={async () => { setUserModal(null); await userModal.refresh?.(); }} user={userModal.user} />}
          </section>
        </div>
      )}

      {notice && <div className="toast" role="status"><span><Icon name="check" size={17} /></span>{notice}</div>}
    </div>
  );
}
