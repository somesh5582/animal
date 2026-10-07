export const REPORT_TYPES = {
  purchase: 'purchase',
  sales: 'sales',
  weight: 'weight',
};

export const REPORT_LABELS = {
  purchase: 'Purchase Report',
  sales: 'Sales Report',
  weight: 'Animal Weight Report',
};

export function emptyFilters(type) {
  const dateRange = { startDate: '', endDate: '' };
  if (type === REPORT_TYPES.purchase) {
    return { ...dateRange, supplier: '', species: '', breed: '' };
  }
  if (type === REPORT_TYPES.sales) {
    return { ...dateRange, customer: '', species: '', breed: '' };
  }
  return { ...dateRange, animalTag: '', measurementType: '' };
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizedText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateFilters(type, input) {
  const filters = { ...emptyFilters(type), ...input };
  const errors = {};

  for (const key of Object.keys(filters)) {
    if (typeof filters[key] === 'string') filters[key] = filters[key].trim();
  }

  if (filters.startDate && !isIsoDate(filters.startDate)) {
    errors.startDate = 'Enter a valid start date.';
  }
  if (filters.endDate && !isIsoDate(filters.endDate)) {
    errors.endDate = 'Enter a valid end date.';
  }
  if (!errors.startDate && !errors.endDate
      && filters.startDate && filters.endDate
      && filters.startDate > filters.endDate) {
    errors.dateRange = 'Start date must be on or before end date.';
  }

  if (type === REPORT_TYPES.weight) {
    if (!filters.animalTag) errors.animalTag = 'Animal ID/tag is required.';
    if (filters.measurementType
        && filters.measurementType !== 'weekly'
        && filters.measurementType !== 'monthly') {
      errors.measurementType = 'Select Weekly, Monthly, or All.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    filters,
    errors,
  };
}

function matchesDate(date, filters) {
  if (filters.startDate && date < filters.startDate) return false;
  if (filters.endDate && date > filters.endDate) return false;
  return true;
}

function includesText(value, query) {
  if (!query) return true;
  return String(value ?? '').trim().toLocaleLowerCase()
    .includes(normalizedText(query).toLocaleLowerCase());
}

function equalsText(value, query) {
  return String(value ?? '').trim().toLocaleLowerCase()
    === normalizedText(query).toLocaleLowerCase();
}

function descendingBy(dateField) {
  return (a, b) => String(b[dateField]).localeCompare(String(a[dateField]))
    || Number(b.id) - Number(a.id);
}

function finite(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Report data contains an invalid ${field}.`);
  }
  return number;
}

export function derivePurchaseReport(sourceRows, filters) {
  const rows = sourceRows
    .filter((row) => matchesDate(row.purchaseDate, filters)
      && includesText(row.supplier, filters.supplier)
      && includesText(row.species, filters.species)
      && includesText(row.breed, filters.breed))
    .slice()
    .sort(descendingBy('purchaseDate'));

  const summary = rows.reduce((totals, row) => {
    const quantity = finite(row.quantity, 'purchase quantity');
    const unitCost = finite(row.unitCost, 'unit cost');
    const transportCost = finite(row.transportCost, 'transport cost');
    return {
      recordCount: totals.recordCount + 1,
      quantity: totals.quantity + quantity,
      totalCost: totals.totalCost + quantity * unitCost + transportCost,
    };
  }, { recordCount: 0, quantity: 0, totalCost: 0 });

  return { rows, summary };
}

export function deriveSalesReport(sourceRows, filters) {
  const rows = sourceRows
    .filter((row) => matchesDate(row.saleDate, filters)
      && includesText(row.customer, filters.customer)
      && includesText(row.species, filters.species)
      && includesText(row.breed, filters.breed))
    .slice()
    .sort(descendingBy('saleDate'));

  const summary = rows.reduce((totals, row) => {
    const quantity = finite(row.quantity, 'sale quantity');
    const unitPrice = finite(row.unitPrice, 'unit price');
    const cost = finite(row.cost, 'sale cost');
    return {
      recordCount: totals.recordCount + 1,
      quantity: totals.quantity + quantity,
      revenue: totals.revenue + quantity * unitPrice,
      profit: totals.profit + quantity * unitPrice - cost,
    };
  }, { recordCount: 0, quantity: 0, revenue: 0, profit: 0 });

  return { rows, summary };
}

export function deriveWeightReport(sourceRows, filters) {
  const rows = sourceRows
    .filter((row) => equalsText(row.animalTag, filters.animalTag)
      && matchesDate(row.weightDate, filters)
      && (!filters.measurementType || row.measurementType === filters.measurementType))
    .slice()
    .sort(descendingBy('weightDate'));

  const chronological = rows.slice().sort((a, b) => (
    String(a.weightDate).localeCompare(String(b.weightDate))
    || Number(a.id) - Number(b.id)
  ));
  const earliest = chronological[0] || null;
  const latest = chronological[chronological.length - 1] || null;

  return {
    rows,
    summary: {
      recordCount: rows.length,
      earliest,
      latest,
      weightChange: rows.length > 1
        ? finite(latest.weightKg, 'weight') - finite(earliest.weightKg, 'weight')
        : null,
    },
  };
}

export function buildReport(type, sourceRows, inputFilters, generatedAt = new Date()) {
  const validation = validateFilters(type, inputFilters);
  if (!validation.valid) {
    const error = new Error(Object.values(validation.errors)[0]);
    error.code = 'REPORT_VALIDATION';
    error.errors = validation.errors;
    throw error;
  }
  if (!Array.isArray(sourceRows)) throw new Error('Report data is unavailable.');

  let derived;
  if (type === REPORT_TYPES.purchase) {
    derived = derivePurchaseReport(sourceRows, validation.filters);
  } else if (type === REPORT_TYPES.sales) {
    derived = deriveSalesReport(sourceRows, validation.filters);
  } else if (type === REPORT_TYPES.weight) {
    derived = deriveWeightReport(sourceRows, validation.filters);
  } else {
    throw new Error('Unknown report type.');
  }

  return {
    type,
    filters: validation.filters,
    rows: derived.rows,
    summary: derived.summary,
    generatedAt: generatedAt instanceof Date ? generatedAt.toISOString() : String(generatedAt),
  };
}
