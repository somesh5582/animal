function latestWeightFirst(a, b) {
  return b.weightDate.localeCompare(a.weightDate) || b.id - a.id;
}

export function buildLatestWeightMap(weights) {
  const grouped = new Map();
  for (const entry of weights) {
    const key = `${entry.purchaseId}:${entry.animalTag.trim().toLocaleLowerCase()}`;
    const current = grouped.get(key);
    if (!current || latestWeightFirst(entry, current) < 0) grouped.set(key, entry);
  }
  return grouped;
}

export function findLatestWeight(latestWeights, assignment) {
  const key = `${assignment.purchaseId}:${assignment.animalTag.trim().toLocaleLowerCase()}`;
  return latestWeights.get(key) || null;
}
