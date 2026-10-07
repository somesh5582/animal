import { buildLatestWeightMap, findLatestWeight } from '../roomWeight.js';

const DAY_MS = 86_400_000;

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percentage(numerator, denominator) {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

function utcDay(value) {
  return Date.parse(`${value}T00:00:00.000Z`);
}

function elapsedDays(startDate, endDate) {
  const difference = (utcDay(endDate) - utcDay(startDate)) / DAY_MS;
  return Number.isFinite(difference) ? Math.max(0, difference) : 0;
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function sixMonthBuckets(now) {
  const buckets = [];
  const formatter = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    buckets.push({
      key: monthKey(date),
      label: formatter.format(date),
      purchaseCost: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      cashMovement: 0,
      margin: null,
    });
  }
  return buckets;
}

function buildFinancial(purchases, sales, now) {
  const months = sixMonthBuckets(now);
  const byMonth = new Map(months.map((month) => [month.key, month]));

  for (const purchase of purchases) {
    const bucket = byMonth.get(String(purchase.purchaseDate).slice(0, 7));
    if (!bucket) continue;
    bucket.purchaseCost += Number.isFinite(Number(purchase.totalCost))
      ? Number(purchase.totalCost)
      : number(purchase.quantity) * number(purchase.unitCost) + number(purchase.transportCost);
  }

  for (const sale of sales) {
    const bucket = byMonth.get(String(sale.saleDate).slice(0, 7));
    if (!bucket) continue;
    bucket.revenue += number(sale.revenue);
    bucket.cost += number(sale.cost);
    bucket.profit += number(sale.profit);
  }

  for (const bucket of months) {
    bucket.cashMovement = bucket.revenue - bucket.purchaseCost;
    bucket.margin = percentage(bucket.profit, bucket.revenue);
  }

  const maxActivity = Math.max(
    1,
    ...months.flatMap((month) => [month.purchaseCost, month.revenue]),
  );

  return { months, maxActivity };
}

function buildSpecies(inventory) {
  const species = new Map();
  for (const batch of inventory) {
    const name = String(batch.species || 'Unspecified').trim() || 'Unspecified';
    const key = name.toLocaleLowerCase();
    const current = species.get(key) || { name, quantity: 0, value: 0, batches: 0 };
    current.quantity += number(batch.availableQuantity);
    current.value += number(batch.availableQuantity) * number(batch.landedUnitCost);
    current.batches += 1;
    species.set(key, current);
  }
  return [...species.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
}

function buildStockAge(inventory, now) {
  const today = now.toISOString().slice(0, 10);
  let weightedDays = 0;
  let quantity = 0;
  let oldest = null;

  for (const batch of inventory) {
    const available = number(batch.availableQuantity);
    const days = elapsedDays(batch.purchaseDate, today);
    weightedDays += days * available;
    quantity += available;
    if (!oldest || days > oldest.days || (days === oldest.days && batch.id < oldest.batch.id)) {
      oldest = { batch, days };
    }
  }

  return {
    averageDays: quantity > 0 ? weightedDays / quantity : null,
    oldest,
  };
}

function chronological(a, b) {
  return String(a.weightDate).localeCompare(String(b.weightDate)) || number(a.id) - number(b.id);
}

function buildAnimals(weights) {
  const grouped = new Map();
  for (const entry of weights) {
    const tag = String(entry.animalTag || '').trim();
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (!grouped.has(key)) grouped.set(key, { tag, entries: [] });
    grouped.get(key).entries.push(entry);
  }

  const animals = [...grouped.values()].map(({ tag, entries }) => {
    const points = entries.slice().sort(chronological);
    const earliest = points[0];
    const latest = points[points.length - 1];
    const previous = points[points.length - 2] || null;
    const gain = points.length > 1 ? number(latest.weightKg) - number(earliest.weightKg) : null;
    const days = points.length > 1 ? elapsedDays(earliest.weightDate, latest.weightDate) : 0;
    const intervalGain = previous ? number(latest.weightKg) - number(previous.weightKg) : null;
    const intervalDays = previous ? elapsedDays(previous.weightDate, latest.weightDate) : 0;

    return {
      tag,
      purchaseId: latest.purchaseId,
      species: latest.species,
      breed: latest.breed,
      earliest,
      latest,
      readingCount: points.length,
      weeklyCount: points.filter((entry) => entry.measurementType === 'weekly').length,
      monthlyCount: points.filter((entry) => entry.measurementType === 'monthly').length,
      gain,
      growthPercent: gain == null ? null : percentage(gain, number(earliest.weightKg)),
      elapsedDays: days,
      dailyGain: gain != null && days > 0 ? gain / days : null,
      intervalGain,
      intervalDays,
      intervalDailyGain: intervalGain != null && intervalDays > 0 ? intervalGain / intervalDays : null,
      points,
    };
  }).sort((a, b) => {
    const gainA = a.gain ?? Number.NEGATIVE_INFINITY;
    const gainB = b.gain ?? Number.NEGATIVE_INFINITY;
    return gainB - gainA || a.tag.localeCompare(b.tag);
  });

  const latestWeightTotal = animals.reduce((sum, animal) => sum + number(animal.latest.weightKg), 0);
  const dailyGainAnimals = animals.filter((animal) => animal.dailyGain != null);

  return {
    animals,
    summary: {
      animalCount: animals.length,
      readingCount: animals.reduce((sum, animal) => sum + animal.readingCount, 0),
      averageLatestWeight: animals.length > 0 ? latestWeightTotal / animals.length : null,
      averageDailyGain: dailyGainAnimals.length > 0
        ? dailyGainAnimals.reduce((sum, animal) => sum + animal.dailyGain, 0) / dailyGainAnimals.length
        : null,
      gaining: animals.filter((animal) => animal.gain > 0).length,
      losing: animals.filter((animal) => animal.gain < 0).length,
    },
  };
}

function buildRoomAnalytics(rooms, assignments, weights) {
  const latestWeights = buildLatestWeightMap(weights);
  const assignmentsByRoom = new Map();
  for (const assignment of assignments) {
    const roomAssignments = assignmentsByRoom.get(assignment.roomId) || [];
    roomAssignments.push(assignment);
    assignmentsByRoom.set(assignment.roomId, roomAssignments);
  }

  const roomRows = rooms.map((room) => {
    const animals = (assignmentsByRoom.get(room.id) || [])
      .map((assignment) => ({
        assignmentId: assignment.id,
        purchaseId: assignment.purchaseId,
        tag: assignment.animalTag,
        species: assignment.species,
        breed: assignment.breed,
        supplier: assignment.supplier,
        assignedAt: assignment.assignedAt,
        latestWeight: findLatestWeight(latestWeights, assignment),
      }))
      .sort((a, b) => a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' }));
    const occupancy = animals.length;
    const capacity = number(room.capacity);
    const isUnlimited = Boolean(room.isUnlimited) || capacity === 0;

    return {
      id: room.id,
      name: room.name,
      description: room.description,
      capacity,
      occupancy,
      isUnlimited,
      availableCapacity: isUnlimited ? null : Math.max(0, capacity - occupancy),
      occupancyPercent: isUnlimited ? null : percentage(occupancy, capacity),
      missingWeightCount: animals.filter((animal) => !animal.latestWeight).length,
      animals,
    };
  });

  const finiteRooms = roomRows.filter((room) => !room.isUnlimited);
  const finiteCapacity = finiteRooms.reduce((sum, room) => sum + room.capacity, 0);
  const finiteOccupancy = finiteRooms.reduce((sum, room) => sum + room.occupancy, 0);

  return {
    rooms: roomRows,
    summary: {
      roomCount: roomRows.length,
      assignedCount: assignments.length,
      finiteCapacity,
      finiteOccupancy,
      finiteAvailable: Math.max(0, finiteCapacity - finiteOccupancy),
      utilization: percentage(finiteOccupancy, finiteCapacity),
      unlimitedRoomCount: roomRows.filter((room) => room.isUnlimited).length,
      fullRoomCount: finiteRooms.filter((room) => room.availableCapacity === 0).length,
      missingWeightCount: roomRows.reduce((sum, room) => sum + room.missingWeightCount, 0),
    },
  };
}

export function buildAnalytics({ assignments = [], dashboard = {}, purchases = [], rooms = [], sales = [], inventory = [], weights = [] }, now = new Date()) {
  const totalPurchased = number(dashboard.totalPurchased);
  const totalSold = number(dashboard.totalSold);
  const currentStock = number(dashboard.currentStock);
  const inventoryValue = number(dashboard.inventoryValue);
  const purchaseInvestment = number(dashboard.purchaseInvestment);
  const salesRevenue = number(dashboard.salesRevenue);
  const realizedProfit = number(dashboard.realizedProfit);
  const soldCost = salesRevenue - realizedProfit;

  return {
    management: {
      currentStock,
      inventoryValue,
      totalPurchased,
      totalSold,
      sellThrough: percentage(totalSold, totalPurchased),
      supplierCount: new Set(purchases.map((item) => String(item.supplier).trim().toLocaleLowerCase()).filter(Boolean)).size,
      customerCount: new Set(sales.map((item) => String(item.customer).trim().toLocaleLowerCase()).filter(Boolean)).size,
      averageCarryingCost: currentStock > 0 ? inventoryValue / currentStock : null,
      stockAge: buildStockAge(inventory, now),
      species: buildSpecies(inventory),
    },
    financial: {
      purchaseInvestment,
      salesRevenue,
      realizedProfit,
      soldCost,
      realizedMargin: percentage(realizedProfit, salesRevenue),
      averageSalePrice: totalSold > 0 ? salesRevenue / totalSold : null,
      returnOnSoldCost: percentage(realizedProfit, soldCost),
      cashMovement: salesRevenue - purchaseInvestment,
      ...buildFinancial(purchases, sales, now),
    },
    roomOccupancy: buildRoomAnalytics(rooms, assignments, weights),
    animalPerformance: buildAnimals(weights),
  };
}
