import { useMemo } from 'react';
import { Icon } from '../Icons.jsx';
import { buildAnalytics } from './analyticsDomain.js';

const currency = import.meta.env.VITE_CURRENCY || 'INR';
const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const integerFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function money(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function number(value) {
  return numberFormatter.format(Number(value) || 0);
}

function integer(value) {
  return integerFormatter.format(Number(value) || 0);
}

function percent(value) {
  return value == null ? 'Unavailable' : `${number(value)}%`;
}

function kilograms(value) {
  return value == null ? 'Unavailable' : `${number(value)} kg`;
}

function signedKilograms(value) {
  if (value == null) return 'Unavailable';
  return `${value >= 0 ? '+' : ''}${number(value)} kg`;
}

function formatDate(value) {
  if (!value) return '—';
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function MetricCard({ icon, label, note, tone = '', value }) {
  return (
    <article className={`analytics-metric ${tone ? `analytics-metric--${tone}` : ''}`}>
      <span className="analytics-metric__icon"><Icon name={icon} size={21} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description, badge }) {
  return (
    <div className="analytics-heading">
      <div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      {badge && <span className="record-count">{badge}</span>}
    </div>
  );
}

function FinancialTrend({ financial }) {
  return (
    <article className="panel analytics-panel analytics-trend-panel">
      <SectionHeading
        description="Purchase investment compared with sales revenue for the latest six calendar months."
        eyebrow="Monthly movement"
        title="Financial trend"
      />
      <div className="chart-legend" aria-hidden="true">
        <span><i className="legend-swatch legend-swatch--purchase" />Purchases</span>
        <span><i className="legend-swatch legend-swatch--revenue" />Revenue</span>
      </div>
      <div
        aria-label="Six-month purchase cost and sales revenue chart"
        className="financial-chart"
        role="img"
      >
        {financial.months.map((month) => {
          const purchaseHeight = (month.purchaseCost / financial.maxActivity) * 100;
          const revenueHeight = (month.revenue / financial.maxActivity) * 100;
          return (
            <div className="financial-chart__month" key={month.key}>
              <div className="financial-chart__bars">
                <span
                  aria-label={`${month.label} purchases ${money(month.purchaseCost)}`}
                  className="financial-bar financial-bar--purchase"
                  style={{ height: `${purchaseHeight}%` }}
                  title={`${month.label} purchases: ${money(month.purchaseCost)}`}
                />
                <span
                  aria-label={`${month.label} revenue ${money(month.revenue)}`}
                  className="financial-bar financial-bar--revenue"
                  style={{ height: `${revenueHeight}%` }}
                  title={`${month.label} revenue: ${money(month.revenue)}`}
                />
              </div>
              <strong>{month.label}</strong>
              <small className={month.profit < 0 ? 'negative' : 'positive'}>{month.profit >= 0 ? '+' : ''}{money(month.profit)}</small>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function MonthlyTable({ months }) {
  return (
    <article className="panel analytics-panel analytics-monthly-table">
      <SectionHeading
        description="Profit, margin, and transaction cash movement by month."
        eyebrow="Month detail"
        title="Financial performance"
      />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Month</th><th>Purchases</th><th>Revenue</th><th>COGS</th><th>Profit</th><th>Margin</th><th>Cash movement</th></tr></thead>
          <tbody>
            {months.map((month) => (
              <tr key={month.key}>
                <td><strong>{month.label}</strong></td>
                <td>{money(month.purchaseCost)}</td>
                <td>{money(month.revenue)}</td>
                <td>{money(month.cost)}</td>
                <td><strong className={month.profit < 0 ? 'negative' : 'positive'}>{money(month.profit)}</strong></td>
                <td>{percent(month.margin)}</td>
                <td><strong className={month.cashMovement < 0 ? 'negative' : 'positive'}>{money(month.cashMovement)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function SpeciesPanel({ management }) {
  return (
    <article className="panel analytics-panel">
      <SectionHeading
        badge={`${management.species.length} species`}
        description="Current heads and carrying value by species."
        eyebrow="Inventory mix"
        title="Stock composition"
      />
      {management.species.length === 0 ? (
        <div className="analytics-empty"><Icon name="inventory" size={27} /><strong>No current inventory</strong><span>Species composition will appear after a purchase.</span></div>
      ) : (
        <div className="analytics-species-list">
          {management.species.map((species) => {
            const quantityShare = management.currentStock > 0
              ? (species.quantity / management.currentStock) * 100
              : 0;
            return (
              <div className="analytics-species-row" key={species.name.toLocaleLowerCase()}>
                <div><strong>{species.name}</strong><span>{integer(species.quantity)} animals · {species.batches} batches</span></div>
                <div><strong>{money(species.value)}</strong><span>{number(quantityShare)}% of stock</span></div>
                <div className="progress-track"><span style={{ width: `${quantityShare}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

function StockAgePanel({ stockAge }) {
  return (
    <article className="panel analytics-panel stock-age-panel">
      <SectionHeading
        description="Weighted by animals remaining in each purchase batch."
        eyebrow="Inventory age"
        title="Stock holding period"
      />
      <div className="stock-age-value">
        <span className="analytics-metric__icon"><Icon name="calendar" size={24} /></span>
        <div><strong>{stockAge.averageDays == null ? 'Unavailable' : `${integer(stockAge.averageDays)} days`}</strong><span>Average current stock age</span></div>
      </div>
      <div className="stock-age-detail">
        <span>Oldest live batch</span>
        {stockAge.oldest ? (
          <div>
            <strong>#{String(stockAge.oldest.batch.id).padStart(3, '0')} · {stockAge.oldest.batch.species}</strong>
            <span>{integer(stockAge.oldest.days)} days · purchased {formatDate(stockAge.oldest.batch.purchaseDate)}</span>
          </div>
        ) : <strong>No live batches</strong>}
      </div>
    </article>
  );
}

function RoomOccupancyAnalytics({ roomOccupancy }) {
  const { summary } = roomOccupancy;
  return (
    <section className="analytics-section">
      <SectionHeading
        badge={`${summary.roomCount} rooms`}
        description="Room-wise animal IDs with latest recorded weights and capacity status."
        eyebrow="Housing analytics"
        title="Room occupancy and animal weights"
      />
      <div className="analytics-metric-grid">
        <MetricCard icon="room" label="Rooms" note={`${summary.unlimitedRoomCount} unlimited · ${summary.fullRoomCount} full`} value={integer(summary.roomCount)} />
        <MetricCard icon="herd" label="Animals assigned" note="Current room mappings" tone="blue" value={integer(summary.assignedCount)} />
        <MetricCard icon="inventory" label="Finite utilization" note={`${summary.finiteAvailable} finite spaces available`} tone="orange" value={percent(summary.utilization)} />
        <MetricCard icon="weight" label="Weights missing" note="Assigned IDs without a weight record" tone={summary.missingWeightCount > 0 ? 'red' : ''} value={integer(summary.missingWeightCount)} />
      </div>

      {roomOccupancy.rooms.length === 0 ? (
        <article className="panel analytics-empty analytics-empty--large"><Icon name="room" size={29} /><strong>No rooms available</strong><span>Create rooms and map animal IDs to see room-wise analytics.</span></article>
      ) : (
        <div className="analytics-room-grid">
          {roomOccupancy.rooms.map((room) => {
            const full = !room.isUnlimited && room.availableCapacity === 0;
            return (
              <article className="panel analytics-room-card" key={room.id}>
                <div className="analytics-room-card__header">
                  <span className="room-card__icon"><Icon name="room" size={22} /></span>
                  <div><h3>{room.name}</h3><span>{room.description || 'No room description'}</span></div>
                  <span className={`room-availability ${full ? 'room-availability--full' : ''}`}>{room.isUnlimited ? 'Unlimited' : full ? 'Full' : `${room.availableCapacity} free`}</span>
                </div>
                <div className="analytics-room-card__summary">
                  <strong>{integer(room.occupancy)}</strong>
                  <span>{room.isUnlimited ? 'animals assigned · unlimited capacity' : `of ${integer(room.capacity)} spaces occupied`}</span>
                  {room.missingWeightCount > 0 && <em>{room.missingWeightCount} weight{room.missingWeightCount === 1 ? '' : 's'} missing</em>}
                </div>
                {!room.isUnlimited && <div className="progress-track"><span style={{ width: `${Math.min(100, room.occupancyPercent || 0)}%` }} /></div>}
                {room.animals.length === 0 ? (
                  <div className="analytics-room-empty"><Icon name="herd" size={21} /><span>No animal IDs assigned</span></div>
                ) : (
                  <div className="analytics-room-animal-list">
                    {room.animals.map((animal) => (
                      <div className="analytics-room-animal" key={animal.assignmentId}>
                        <div className="analytics-room-animal__identity"><strong>{animal.tag}</strong><span>{animal.breed ? `${animal.breed} ${animal.species}` : animal.species}</span></div>
                        <div className="analytics-room-animal__weight">
                          {animal.latestWeight
                            ? <><strong>{kilograms(animal.latestWeight.weightKg)}</strong><span>{formatDate(animal.latestWeight.weightDate)}</span></>
                            : <strong className="room-weight-missing">Weight not recorded</strong>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AnimalPerformance({ animalPerformance }) {
  return (
    <section className="analytics-section">
      <SectionHeading
        badge={`${animalPerformance.summary.animalCount} tagged animals`}
        description="Growth is calculated from each animal’s earliest and latest recorded weights using actual elapsed days."
        eyebrow="Animal performance"
        title="ID-wise weight growth"
      />
      <div className="analytics-metric-grid analytics-metric-grid--animal">
        <MetricCard icon="herd" label="Animals monitored" note={`${integer(animalPerformance.summary.readingCount)} total readings`} value={integer(animalPerformance.summary.animalCount)} />
        <MetricCard icon="weight" label="Average latest weight" note="Across tagged animals" tone="blue" value={kilograms(animalPerformance.summary.averageLatestWeight)} />
        <MetricCard icon="trending" label="Average daily gain" note="Animals with multiple dates" tone="orange" value={animalPerformance.summary.averageDailyGain == null ? 'Unavailable' : `${number(animalPerformance.summary.averageDailyGain)} kg/day`} />
        <MetricCard icon="trending" label="Growth status" note={`${animalPerformance.summary.losing} losing · others unchanged/new`} value={`${animalPerformance.summary.gaining} gaining`} />
      </div>
      <article className="panel analytics-animal-table">
        {animalPerformance.animals.length === 0 ? (
          <div className="analytics-empty analytics-empty--large"><Icon name="weight" size={29} /><strong>No tagged weight history</strong><span>Add at least one animal ID weight entry to see performance.</span></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Animal ID</th><th>Livestock</th><th>Latest weight</th><th>Total gain</th><th>Growth</th><th>Daily gain</th><th>Latest interval</th><th>Readings</th><th>Coverage</th></tr></thead>
              <tbody>
                {animalPerformance.animals.map((animal) => (
                  <tr key={animal.tag.toLocaleLowerCase()}>
                    <td><strong className="animal-tag">{animal.tag}</strong><small className="cell-note">Batch #{String(animal.purchaseId).padStart(3, '0')}</small></td>
                    <td>{animal.breed ? `${animal.breed} ${animal.species}` : animal.species}</td>
                    <td><strong className="weight-value">{kilograms(animal.latest.weightKg)}</strong><small className="cell-note">{formatDate(animal.latest.weightDate)}</small></td>
                    <td><strong className={animal.gain < 0 ? 'negative' : 'positive'}>{signedKilograms(animal.gain)}</strong></td>
                    <td>{percent(animal.growthPercent)}</td>
                    <td>{animal.dailyGain == null ? 'Unavailable' : `${number(animal.dailyGain)} kg/day`}</td>
                    <td><span className={animal.intervalGain < 0 ? 'negative' : 'positive'}>{signedKilograms(animal.intervalGain)}</span></td>
                    <td>{integer(animal.readingCount)}</td>
                    <td><span className="cadence-count">{animal.weeklyCount}W</span> <span className="cadence-count cadence-count--monthly">{animal.monthlyCount}M</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

export default function AnalyticsDashboard({ assignments, dashboard, inventory, purchases, rooms, sales, weights }) {
  const asOf = useMemo(() => new Date(), []);
  const analytics = useMemo(() => buildAnalytics({
    assignments,
    dashboard,
    inventory,
    purchases,
    rooms,
    sales,
    weights,
  }, asOf), [asOf, assignments, dashboard, inventory, purchases, rooms, sales, weights]);

  const { management, financial, roomOccupancy, animalPerformance } = analytics;

  return (
    <div className="analytics-page">
      <section className="analytics-hero">
        <div><span className="eyebrow">Combined intelligence</span><h2>Management at a glance.</h2><p>Financial performance, inventory health, and animal growth in one decision-ready dashboard.</p></div>
        <div className="analytics-hero__value"><span>Realized profit</span><strong className={financial.realizedProfit < 0 ? 'negative' : ''}>{money(financial.realizedProfit)}</strong><small>{percent(financial.realizedMargin)} margin on sales</small></div>
      </section>

      <section className="analytics-section">
        <SectionHeading description="Current operational position across the full livestock business." eyebrow="Management dashboard" title="Business health" />
        <div className="analytics-metric-grid">
          <MetricCard icon="herd" label="Current stock" note={`${integer(management.totalSold)} sold of ${integer(management.totalPurchased)} purchased`} value={integer(management.currentStock)} />
          <MetricCard icon="wallet" label="Inventory value" note={`${money(management.averageCarryingCost || 0)} average per head`} tone="sand" value={money(management.inventoryValue)} />
          <MetricCard icon="sales" label="Sell-through rate" note={`${management.supplierCount} suppliers · ${management.customerCount} customers`} tone="blue" value={percent(management.sellThrough)} />
          <MetricCard icon="calendar" label="Average stock age" note={management.stockAge.oldest ? `Oldest batch: ${integer(management.stockAge.oldest.days)} days` : 'No live batches'} tone="orange" value={management.stockAge.averageDays == null ? 'Unavailable' : `${integer(management.stockAge.averageDays)} days`} />
        </div>
        <div className="analytics-two-column"><SpeciesPanel management={management} /><StockAgePanel stockAge={management.stockAge} /></div>
      </section>

      <RoomOccupancyAnalytics roomOccupancy={roomOccupancy} />

      <section className="analytics-section">
        <SectionHeading description="All-time outcomes with the latest six months of transaction movement." eyebrow="Financial dashboard" title="Financial performance" />
        <div className="analytics-metric-grid">
          <MetricCard icon="purchases" label="Purchase investment" note="All recorded livestock purchases" tone="sand" value={money(financial.purchaseInvestment)} />
          <MetricCard icon="sales" label="Sales revenue" note={`${money(financial.averageSalePrice || 0)} average per animal`} tone="blue" value={money(financial.salesRevenue)} />
          <MetricCard icon="trending" label="Realized profit" note={`${percent(financial.returnOnSoldCost)} return on sold cost`} tone={financial.realizedProfit < 0 ? 'red' : 'orange'} value={money(financial.realizedProfit)} />
          <MetricCard icon="wallet" label="Cash movement" note="Revenue less total purchase investment" tone={financial.cashMovement < 0 ? 'red' : ''} value={money(financial.cashMovement)} />
        </div>
        <div className="analytics-financial-grid"><FinancialTrend financial={financial} /><MonthlyTable months={financial.months} /></div>
      </section>

      <AnimalPerformance animalPerformance={animalPerformance} />
    </div>
  );
}
