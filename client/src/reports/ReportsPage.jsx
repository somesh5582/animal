import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../Icons.jsx';
import {
  REPORT_LABELS,
  REPORT_TYPES,
  buildReport,
  emptyFilters,
  validateFilters,
} from './reportDomain.js';

const currency = import.meta.env.VITE_CURRENCY || 'INR';
const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency,
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const reportOptions = [
  { type: REPORT_TYPES.purchase, label: 'Purchases', icon: 'purchases' },
  { type: REPORT_TYPES.sales, label: 'Sales', icon: 'sales' },
  { type: REPORT_TYPES.weight, label: 'Animal weights', icon: 'weight' },
];

const filterLabels = {
  startDate: 'From',
  endDate: 'To',
  supplier: 'Supplier',
  customer: 'Customer',
  species: 'Species',
  breed: 'Breed',
  animalTag: 'Animal ID / tag',
  measurementType: 'Frequency',
};

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function formatGeneratedAt(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function animalLabel(species, breed) {
  return breed ? `${breed} ${species}` : species;
}

async function retrieveRows(type) {
  if (type === REPORT_TYPES.purchase) return api.getPurchases();
  if (type === REPORT_TYPES.sales) return api.getSales();
  if (type === REPORT_TYPES.weight) return api.getWeights();
  throw new Error('Unknown report type.');
}

function ReportTabs({ selected, onSelect }) {
  return (
    <div aria-label="Report type" className="report-tabs no-print" role="tablist">
      {reportOptions.map((option) => (
        <button
          aria-selected={selected === option.type}
          className={`report-tab ${selected === option.type ? 'report-tab--active' : ''}`}
          key={option.type}
          onClick={() => onSelect(option.type)}
          role="tab"
          type="button"
        >
          <Icon name={option.icon} size={18} />
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="field report-filter-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ReportFilters({ type, filters, onChange, onApply, onClear, busy }) {
  const change = (event) => onChange(event.target.name, event.target.value);

  return (
    <form className="report-filters no-print" onSubmit={onApply}>
      <div className="report-filter-grid">
        {type === REPORT_TYPES.weight && (
          <FilterField label="Animal ID / tag">
            <input
              autoComplete="off"
              name="animalTag"
              onChange={change}
              placeholder="e.g. TAG-104"
              required
              value={filters.animalTag}
            />
          </FilterField>
        )}
        <FilterField label="Start date">
          <input name="startDate" onChange={change} type="date" value={filters.startDate} />
        </FilterField>
        <FilterField label="End date">
          <input name="endDate" onChange={change} type="date" value={filters.endDate} />
        </FilterField>
        {type === REPORT_TYPES.purchase && (
          <FilterField label="Supplier">
            <input name="supplier" onChange={change} placeholder="Any supplier" value={filters.supplier} />
          </FilterField>
        )}
        {type === REPORT_TYPES.sales && (
          <FilterField label="Customer">
            <input name="customer" onChange={change} placeholder="Any customer" value={filters.customer} />
          </FilterField>
        )}
        {type !== REPORT_TYPES.weight && (
          <>
            <FilterField label="Species">
              <input name="species" onChange={change} placeholder="Any species" value={filters.species} />
            </FilterField>
            <FilterField label="Breed">
              <input name="breed" onChange={change} placeholder="Any breed" value={filters.breed} />
            </FilterField>
          </>
        )}
        {type === REPORT_TYPES.weight && (
          <FilterField label="Frequency">
            <select name="measurementType" onChange={change} value={filters.measurementType}>
              <option value="">All frequencies</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </FilterField>
        )}
      </div>
      <div className="report-filter-actions">
        <button className="button button--ghost" disabled={busy} onClick={onClear} type="button">Clear filters</button>
        <button className="button button--primary" disabled={busy} type="submit">
          {busy ? 'Loading…' : 'Apply filters'} <Icon name="check" size={17} />
        </button>
      </div>
    </form>
  );
}

function ActiveFilters({ report }) {
  const populated = Object.entries(report.filters)
    .filter(([, value]) => Boolean(value));

  return (
    <div className="active-filters">
      <strong>Applied filters</strong>
      <div>
        {populated.length === 0
          ? <span className="filter-chip">All records</span>
          : populated.map(([key, value]) => (
            <span className="filter-chip" key={key}>
              {filterLabels[key]}: {key.endsWith('Date') ? formatDate(value) : value}
            </span>
          ))}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, note, tone = '' }) {
  return (
    <article className={`report-summary-card ${tone ? `report-summary-card--${tone}` : ''}`}>
      <span className="report-summary-card__icon"><Icon name={icon} size={19} /></span>
      <div><small>{label}</small><strong>{value}</strong>{note && <span>{note}</span>}</div>
    </article>
  );
}

function ReportSummary({ report }) {
  if (report.type === REPORT_TYPES.purchase) {
    return (
      <section className="report-summary-grid" aria-label="Purchase report summary">
        <SummaryCard icon="reports" label="Purchase records" value={formatNumber(report.summary.recordCount)} />
        <SummaryCard icon="herd" label="Animals purchased" value={formatNumber(report.summary.quantity)} />
        <SummaryCard icon="wallet" label="Total purchase cost" tone="sand" value={formatMoney(report.summary.totalCost)} />
      </section>
    );
  }

  if (report.type === REPORT_TYPES.sales) {
    return (
      <section className="report-summary-grid report-summary-grid--four" aria-label="Sales report summary">
        <SummaryCard icon="reports" label="Sales records" value={formatNumber(report.summary.recordCount)} />
        <SummaryCard icon="herd" label="Animals sold" value={formatNumber(report.summary.quantity)} />
        <SummaryCard icon="wallet" label="Sales revenue" tone="blue" value={formatMoney(report.summary.revenue)} />
        <SummaryCard
          icon="trending"
          label="Realized profit"
          tone={report.summary.profit < 0 ? 'red' : 'orange'}
          value={formatMoney(report.summary.profit)}
        />
      </section>
    );
  }

  return (
    <section className="report-summary-grid report-summary-grid--four" aria-label="Animal weight report summary">
      <SummaryCard icon="reports" label="Measurements" value={formatNumber(report.summary.recordCount)} />
      <SummaryCard
        icon="weight"
        label="Earliest weight"
        note={formatDate(report.summary.earliest?.weightDate)}
        value={report.summary.earliest ? `${formatNumber(report.summary.earliest.weightKg)} kg` : '—'}
      />
      <SummaryCard
        icon="weight"
        label="Latest weight"
        note={formatDate(report.summary.latest?.weightDate)}
        value={report.summary.latest ? `${formatNumber(report.summary.latest.weightKg)} kg` : '—'}
      />
      <SummaryCard
        icon="trending"
        label="Weight change"
        tone={report.summary.weightChange < 0 ? 'red' : 'blue'}
        value={report.summary.weightChange == null
          ? 'Unavailable'
          : `${report.summary.weightChange >= 0 ? '+' : ''}${formatNumber(report.summary.weightChange)} kg`}
      />
    </section>
  );
}

function PurchaseRows({ rows }) {
  return rows.map((row) => (
    <tr key={row.id}>
      <td><strong>#{String(row.id).padStart(3, '0')}</strong></td>
      <td>{formatDate(row.purchaseDate)}</td>
      <td>{row.supplier}</td>
      <td>{row.species}</td>
      <td>{row.breed || '—'}</td>
      <td>{formatNumber(row.quantity)}</td>
      <td>{formatMoney(row.unitCost)}</td>
      <td>{formatMoney(row.transportCost)}</td>
      <td><strong>{formatMoney(Number(row.quantity) * Number(row.unitCost) + Number(row.transportCost))}</strong></td>
    </tr>
  ));
}

function SalesRows({ rows }) {
  return rows.map((row) => (
    <tr key={row.id}>
      <td><strong>#{String(row.id).padStart(3, '0')}</strong></td>
      <td>{formatDate(row.saleDate)}</td>
      <td>{row.customer}</td>
      <td>#{String(row.purchaseId).padStart(3, '0')}</td>
      <td>{row.species}</td>
      <td>{row.breed || '—'}</td>
      <td>{formatNumber(row.quantity)}</td>
      <td>{formatMoney(row.unitPrice)}</td>
      <td>{formatMoney(row.revenue)}</td>
      <td>{formatMoney(row.cost)}</td>
      <td><strong className={row.profit < 0 ? 'negative' : 'positive'}>{formatMoney(row.profit)}</strong></td>
    </tr>
  ));
}

function WeightRows({ rows }) {
  return rows.map((row) => (
    <tr key={row.id}>
      <td><strong className="animal-tag">{row.animalTag}</strong></td>
      <td>{formatDate(row.weightDate)}</td>
      <td><span className={`measurement-type measurement-type--${row.measurementType}`}>{row.measurementType}</span></td>
      <td><strong className="weight-value">{formatNumber(row.weightKg)} kg</strong></td>
      <td>#{String(row.purchaseId).padStart(3, '0')}</td>
      <td>{row.species}</td>
      <td>{row.breed || '—'}</td>
      <td><span className="table-notes">{row.notes || '—'}</span></td>
    </tr>
  ));
}

function ReportTable({ report }) {
  const headings = report.type === REPORT_TYPES.purchase
    ? ['Batch', 'Purchase date', 'Supplier', 'Species', 'Breed', 'Quantity', 'Unit cost', 'Transport', 'Total cost']
    : report.type === REPORT_TYPES.sales
      ? ['Sale', 'Sale date', 'Customer', 'Source batch', 'Species', 'Breed', 'Quantity', 'Unit price', 'Revenue', 'Cost', 'Profit']
      : ['Animal ID / tag', 'Measurement date', 'Frequency', 'Weight', 'Source batch', 'Species', 'Breed', 'Notes'];

  return (
    <section className="panel report-table-panel">
      <div className="panel__heading">
        <div><span className="eyebrow">Filtered records</span><h3>{REPORT_LABELS[report.type]}</h3></div>
        <span className="record-count">{report.rows.length} records</span>
      </div>
      <div aria-label="Report results; scroll horizontally to view all columns" className="table-wrap report-table-wrap" tabIndex="0">
        <table>
          <thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
          <tbody>
            {report.type === REPORT_TYPES.purchase && <PurchaseRows rows={report.rows} />}
            {report.type === REPORT_TYPES.sales && <SalesRows rows={report.rows} />}
            {report.type === REPORT_TYPES.weight && <WeightRows rows={report.rows} />}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StateMessage({ status, type, error, onRetry }) {
  if (status === 'validation-error') {
    return <div className="report-alert report-alert--error" role="alert"><Icon name="alert" size={19} /><span>{error}</span></div>;
  }
  if (status === 'retrieval-error') {
    return (
      <div className="report-alert report-alert--error no-print" role="alert">
        <Icon name="alert" size={19} />
        <span>Report data could not be loaded.</span>
        <button className="button button--ghost" onClick={onRetry} type="button">Retry</button>
      </div>
    );
  }
  if (status === 'loading') {
    return <div className="report-alert no-print" role="status"><span className="loader loader--small" />Loading {REPORT_LABELS[type].toLowerCase()}…</div>;
  }
  return null;
}

export default function ReportsPage() {
  const [type, setType] = useState(REPORT_TYPES.purchase);
  const [filtersByType, setFiltersByType] = useState(() => ({
    purchase: emptyFilters(REPORT_TYPES.purchase),
    sales: emptyFilters(REPORT_TYPES.sales),
    weight: emptyFilters(REPORT_TYPES.weight),
  }));
  const [reportsByType, setReportsByType] = useState({});
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const selectedType = useRef(REPORT_TYPES.purchase);
  const mounted = useRef(true);
  const failedRequest = useRef(null);

  const loadReport = useCallback(async (reportType, inputFilters) => {
    const currentRequest = ++requestId.current;
    const validation = validateFilters(reportType, inputFilters);

    if (!validation.valid) {
      failedRequest.current = null;
      if (mounted.current && selectedType.current === reportType) {
        setStatus('validation-error');
        setError(Object.values(validation.errors)[0]);
      }
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const rows = await retrieveRows(reportType);
      if (!mounted.current
          || currentRequest !== requestId.current
          || reportType !== selectedType.current) return;

      const report = buildReport(reportType, rows, validation.filters, new Date());
      setReportsByType((current) => ({ ...current, [reportType]: report }));
      setStatus(report.rows.length > 0 ? 'ready' : 'empty');
      failedRequest.current = null;
    } catch {
      if (!mounted.current
          || currentRequest !== requestId.current
          || reportType !== selectedType.current) return;
      failedRequest.current = { type: reportType, filters: validation.filters };
      setStatus('retrieval-error');
      setError('Report data could not be loaded.');
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadReport(REPORT_TYPES.purchase, emptyFilters(REPORT_TYPES.purchase));
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [loadReport]);

  const filters = filtersByType[type];
  const report = reportsByType[type] || null;
  const busy = status === 'loading';
  const printable = status === 'ready' && report && report.rows.length > 0;

  function selectReport(nextType) {
    selectedType.current = nextType;
    setType(nextType);
    setError('');
    loadReport(nextType, filtersByType[nextType]);
  }

  function updateFilter(name, value) {
    setFiltersByType((current) => ({
      ...current,
      [type]: { ...current[type], [name]: value },
    }));
  }

  function applyFilters(event) {
    event.preventDefault();
    loadReport(type, filtersByType[type]);
  }

  function clearFilters() {
    const cleared = emptyFilters(type);
    setFiltersByType((current) => ({ ...current, [type]: cleared }));
    loadReport(type, cleared);
  }

  function retry() {
    const request = failedRequest.current;
    if (request) loadReport(request.type, request.filters);
  }

  function refresh() {
    loadReport(type, report?.filters || filtersByType[type]);
  }

  function printReport() {
    if (printable) window.print();
  }

  return (
    <div className="reports-page">
      <header className="report-print-header print-only">
        <strong>CSR AGRO VENTURES</strong>
        <h1>{REPORT_LABELS[type]}</h1>
        <p>Generated {formatGeneratedAt(report?.generatedAt)}</p>
      </header>

      <section className="report-toolbar panel no-print">
        <div>
          <span className="eyebrow">Operational reports</span>
          <h2>Review your livestock records</h2>
          <p>Filter purchases, sales, or an individual animal’s weight history.</p>
        </div>
        <div className="report-toolbar__actions">
          <button className="button button--ghost" disabled={busy} onClick={refresh} type="button">Refresh</button>
          <button className="button button--primary" disabled={!printable} onClick={printReport} type="button">
            <Icon name="reports" size={17} /> Print report
          </button>
        </div>
      </section>

      <ReportTabs onSelect={selectReport} selected={type} />
      <section className="panel report-filter-panel">
        <ReportFilters
          busy={busy}
          filters={filters}
          onApply={applyFilters}
          onChange={updateFilter}
          onClear={clearFilters}
          type={type}
        />
      </section>

      <StateMessage error={error} onRetry={retry} status={status} type={type} />

      {report && (
        <>
          <section className="panel report-scope-panel">
            <div className="report-meta">
              <div><span className="eyebrow">Report scope</span><h2>{REPORT_LABELS[report.type]}</h2></div>
              <span>Generated {formatGeneratedAt(report.generatedAt)}</span>
            </div>
            <ActiveFilters report={report} />
          </section>
          <ReportSummary report={report} />
          {report.rows.length > 0
            ? <ReportTable report={report} />
            : status !== 'retrieval-error' && (
              <section className="panel report-empty">
                <span className="empty-state__icon"><Icon name="reports" size={28} /></span>
                <h3>No {REPORT_LABELS[type].toLowerCase()} records found</h3>
                <p>No records satisfy the active filters. Adjust or clear the filters and try again.</p>
              </section>
            )}
        </>
      )}
    </div>
  );
}
