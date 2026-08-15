/**
 * Utility functions for smart recommendations, current-item exclusion,
 * and dynamic seed-based guest rotation (weighted shuffle).
 */

/**
 * Filter out current item(s) by slug or ID from any item array.
 */
export function excludeCurrentItem<T extends { slug?: string; id?: string | number; documentId?: string }>(
  items: T[],
  currentSlugOrId?: string | number
): T[] {
  if (!items || !Array.isArray(items)) return [];
  if (!currentSlugOrId) return items;

  const target = String(currentSlugOrId).toLowerCase().trim();
  return items.filter((item) => {
    const slugMatch = item.slug && item.slug.toLowerCase().trim() === target;
    const idMatch = item.id !== undefined && String(item.id).trim() === target;
    const docIdMatch = item.documentId && String(item.documentId).trim() === target;
    return !slugMatch && !idMatch && !docIdMatch;
  });
}

/**
 * Deterministic pseudo-random number generator from a string seed.
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

/**
 * Perform a dynamic seed-based rotation / shuffle for unauthenticated guests,
 * ensuring sidebar lists stay fresh and non-repetitive across page clicks.
 */
export function getRotatedRecommendations<T extends { slug?: string; id?: string | number }>(
  items: T[],
  excludeSlugOrId?: string | number,
  limit: number = 6,
  seed?: string
): T[] {
  const filtered = excludeCurrentItem(items, excludeSlugOrId);
  if (filtered.length <= limit) return filtered;

  // Use seed if provided, or fallback to current hour/session bucket
  const activeSeed = seed || (typeof window !== 'undefined' ? sessionStorage.getItem('omni_guest_seed') : null) || 'omni_default_seed';

  // Make a copy and sort using deterministic pseudo-random weight
  const weighted = filtered.map((item, index) => {
    const itemKey = `${activeSeed}_${item.slug || item.id || index}`;
    const weight = seededRandom(itemKey);
    return { item, weight };
  });

  weighted.sort((a, b) => b.weight - a.weight);
  return weighted.slice(0, limit).map((w) => w.item);
}
