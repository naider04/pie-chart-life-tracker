import { Category, CategoryDistribution } from '../types';

/**
 * Creates a canonical pair key for two category IDs to ensure consistent lookup.
 */
export function getPairKey(idA: string, idB: string): { key: string; isReversed: boolean } {
  if (idA <= idB) {
    return { key: `${idA}__${idB}`, isReversed: false };
  }
  return { key: `${idB}__${idA}`, isReversed: true };
}

/**
 * Gets the percentage (1-99) allocated to category A vs category B.
 * If value doesn't exist, defaults to 50 (equal priority).
 */
export function getPairValue(
  pairs: Record<string, number>,
  idA: string,
  idB: string
): number {
  if (idA === idB) return 50;
  const { key, isReversed } = getPairKey(idA, idB);
  const stored = pairs[key];
  if (stored === undefined) return 50;
  // If reversed, stored is % for B, so % for A is (100 - stored)
  return isReversed ? 100 - stored : stored;
}

/**
 * Sets the pair value where `percentForA` is the percentage allocated to category A (1-99).
 */
export function setPairValue(
  pairs: Record<string, number>,
  idA: string,
  idB: string,
  percentForA: number
): Record<string, number> {
  const { key, isReversed } = getPairKey(idA, idB);
  const clamped = Math.max(1, Math.min(99, Math.round(percentForA)));
  const storedVal = isReversed ? 100 - clamped : clamped;
  return {
    ...pairs,
    [key]: storedVal,
  };
}

/**
 * Computes the normalized percentage distribution across categories using
 * the Geometric Mean (Analytic Hierarchy Process logarithmic method).
 * 
 * For each pair (i, j), ratio r_ij = p_ij / (100 - p_ij).
 * For each category i, w_i = (product_{j != i} r_ij)^(1/N).
 * Normalized weight = w_i / sum(w_k) * 100%.
 */
export function calculateDistribution(
  categories: Category[],
  pairs: Record<string, number>
): CategoryDistribution[] {
  const n = categories.length;
  if (n === 0) return [];
  if (n === 1) {
    return [
      {
        categoryId: categories[0].id,
        name: categories[0].name,
        color: categories[0].color,
        weight: 1,
        percentage: 100,
      },
    ];
  }

  // Build pairwise ratio matrix
  const ratios: number[][] = Array.from({ length: n }, () => Array(n).fill(1));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        ratios[i][j] = 1;
      } else if (i < j) {
        const p = getPairValue(pairs, categories[i].id, categories[j].id);
        const safeP = Math.max(1, Math.min(99, p));
        const ratio = safeP / (100 - safeP);
        ratios[i][j] = ratio;
        ratios[j][i] = 1 / ratio;
      }
    }
  }

  // Geometric mean for each category
  const geomMeans: number[] = [];
  for (let i = 0; i < n; i++) {
    let logSum = 0;
    for (let j = 0; j < n; j++) {
      logSum += Math.log(ratios[i][j]);
    }
    geomMeans.push(Math.exp(logSum / n));
  }

  const totalSum = geomMeans.reduce((acc, v) => acc + v, 0);

  // Normalize to 100%
  const distribution: CategoryDistribution[] = categories.map((cat, i) => {
    const rawPct = (geomMeans[i] / totalSum) * 100;
    return {
      categoryId: cat.id,
      name: cat.name,
      color: cat.color,
      weight: geomMeans[i],
      percentage: Number(rawPct.toFixed(1)),
    };
  });

  // Ensure total sum exactly equals 100 due to float rounding
  const currentSum = distribution.reduce((sum, item) => sum + item.percentage, 0);
  const diff = Number((100 - currentSum).toFixed(1));
  if (Math.abs(diff) > 0 && distribution.length > 0) {
    // Adjust the largest category by diff
    let maxIdx = 0;
    for (let i = 1; i < distribution.length; i++) {
      if (distribution[i].percentage > distribution[maxIdx].percentage) {
        maxIdx = i;
      }
    }
    distribution[maxIdx].percentage = Number((distribution[maxIdx].percentage + diff).toFixed(1));
  }

  return distribution;
}

/**
 * Returns distinct default colors for categories when user adds new ones.
 * Expanded palette with 32 distinct and balanced colors across all color spaces.
 */
export const PALETTE = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#3b82f6', // Blue
  '#84cc16', // Lime
  '#e11d48', // Rose
  '#64748b', // Slate
  '#a855f7', // Violet
  '#22c55e', // Green
  '#eab308', // Yellow
  '#d946ef', // Fuchsia
  '#0ea5e9', // Sky
  '#f43f5e', // Crimson
  '#2dd4bf', // Aqua
  '#fb923c', // Coral
  '#4f46e5', // Deep Indigo
  '#059669', // Deep Emerald
  '#d97706', // Warm Amber
  '#db2777', // Deep Pink
  '#7c3aed', // Deep Purple
  '#0284c7', // Ocean Blue
  '#65a30d', // Forest Lime
  '#be123c', // Ruby
  '#475569', // Dark Slate
  '#16a34a', // Leaf Green
  '#ca8a04', // Bronze Gold
  '#c026d3', // Deep Magenta
];

export function getNextColor(existingCount: number): string {
  return PALETTE[existingCount % PALETTE.length];
}
