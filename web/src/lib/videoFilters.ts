/**
 * Pure, framework-free tag filter logic for the /videos page.
 *
 * Compares tag labels case-insensitively against `item.tags: string[]`.
 * Replaces the old 4-CASE controller switch with a single declarative
 * function. Every new filter dimension = one more `if` here, no rewrite.
 */

export interface TagFilterSpec {
  /** Tags the item MUST have (according to matchMode). */
  include: string[];
  /** Tags the item MUST NOT have. */
  exclude: string[];
  /** Relevant only when include.length > 1. */
  matchMode: 'any' | 'all';
}

const norm = (s: string) => s.trim().toLowerCase();

export function matchesTagFilter(
  item: { tags?: string[] | null },
  spec: TagFilterSpec
): boolean {
  const itemTags = (item.tags || []).map(norm);

  // Exclude: drop immediately if any exclude tag is present.
  if (spec.exclude.length) {
    const ex = spec.exclude.map(norm);
    if (ex.some((t) => itemTags.includes(t))) return false;
  }

  // Include.
  if (spec.include.length) {
    const inc = spec.include.map(norm);
    if (spec.matchMode === 'all') {
      // Item must contain EVERY include tag.
      if (!inc.every((t) => itemTags.includes(t))) return false;
    } else {
      // Item must contain AT LEAST ONE include tag.
      if (!inc.some((t) => itemTags.includes(t))) return false;
    }
  }

  return true;
}

export interface TagCount {
  tag: string;
  count: number;
}

/** Aggregates a tag frequency map from a list of items (used by the tags endpoint). */
export function aggregateTags(items: Array<{ tags?: string[] | null }>): TagCount[] {
  const counts: Record<string, number> = {};
  for (const it of items) {
    for (const raw of it.tags || []) {
      const t = raw.trim();
      if (t) counts[t] = (counts[t] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}
