'use client';

/**
 * One place that owns what may be stored, and everything routes through it.
 *
 * The alternative — a consent check at each of the twenty call sites that write
 * to `localStorage` or `document.cookie` — works exactly until the twenty-first
 * forgets one (#139). So the storage helpers here take a category, and the
 * decision is consulted inside them rather than by the caller.
 */

export type ConsentCategory = 'necessary' | 'preferences' | 'statistics' | 'marketing';

/** Categories a visitor can actually decide about. `necessary` is not one. */
export type OptionalCategory = Exclude<ConsentCategory, 'necessary'>;

export const OPTIONAL_CATEGORIES: OptionalCategory[] = ['preferences', 'statistics', 'marketing'];

/**
 * The decision lives in a cookie, not in `localStorage`, for two reasons: the
 * server has to be able to read it before rendering, and a decision stored in
 * the very mechanism it governs is circular.
 */
export const CONSENT_COOKIE = 'omni_consent';

/**
 * Bumped when the category list changes.
 *
 * A stored decision from an older version says nothing about a category that
 * did not exist when it was made, so it is treated as no decision and the
 * visitor is asked again rather than silently opted in or out.
 */
export const CONSENT_VERSION = 1;

export interface ConsentDecision {
  version: number;
  decidedAt: string;
  categories: Record<OptionalCategory, boolean>;
}

/**
 * Every key the app stores, and what it counts as.
 *
 * Kept here rather than at the call sites so that withdrawing consent can find
 * what to delete. A key that is missing from this map is treated as
 * unclassified and refused — a new key should be classified deliberately, not
 * default into being written.
 */
export const STORAGE_REGISTRY: Record<string, ConsentCategory> = {
  // Session and consent itself — refusing everything must not log anyone out.
  omni_user: 'necessary',
  omni_jwt: 'necessary',
  [CONSENT_COOKIE]: 'necessary',

  omni_lang: 'preferences',
  'omni-theme': 'preferences',
  omni_ambient_settings: 'preferences',
  omni_time_display_remaining: 'preferences',

  omni_user_interest_profile: 'statistics',
  omni_user_likes: 'statistics',
};

const listeners = new Set<(decision: ConsentDecision | null) => void>();

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** The stored decision, or null when there is none that still applies. */
export function getDecision(): ConsentDecision | null {
  const raw = readCookie(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentDecision;
    if (parsed?.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasDecided(): boolean {
  return getDecision() !== null;
}

/**
 * Whether a category may be used right now.
 *
 * `necessary` is always true. Everything else is false until the visitor says
 * otherwise — the default has to be refusal, or the banner decides nothing.
 */
export function allows(category: ConsentCategory): boolean {
  if (category === 'necessary') return true;
  const decision = getDecision();
  return decision ? Boolean(decision.categories[category as OptionalCategory]) : false;
}

/**
 * Records a decision and applies it immediately.
 *
 * Categories that were allowed and no longer are get their keys deleted here,
 * because stopping collection is not the same as undoing it: a profile built
 * while consent was given must not survive its withdrawal.
 */
export function setDecision(categories: Partial<Record<OptionalCategory, boolean>>): ConsentDecision {
  const previous = getDecision();
  const resolved = OPTIONAL_CATEGORIES.reduce((acc, category) => {
    acc[category] = Boolean(categories[category]);
    return acc;
  }, {} as Record<OptionalCategory, boolean>);

  const decision: ConsentDecision = {
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
    categories: resolved,
  };

  if (typeof document !== 'undefined') {
    const value = encodeURIComponent(JSON.stringify(decision));
    const secure = window.location.protocol === 'https:' ? '; secure' : '';
    document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax${secure}`;
  }

  for (const category of OPTIONAL_CATEGORIES) {
    const wasAllowed = previous ? previous.categories[category] : false;
    if (wasAllowed && !resolved[category]) purgeCategory(category);
  }

  listeners.forEach((listener) => listener(decision));
  return decision;
}

/** Deletes everything stored under a category. Used when consent is withdrawn. */
export function purgeCategory(category: ConsentCategory): void {
  if (typeof window === 'undefined') return;
  for (const [key, keyCategory] of Object.entries(STORAGE_REGISTRY)) {
    if (keyCategory !== category) continue;
    try {
      window.localStorage.removeItem(key);
    } catch { /* storage unavailable — nothing to remove */ }
    document.cookie = `${key}=; path=/; max-age=0`;
  }
}

/**
 * Notifies when the decision changes, so collection can start or stop without
 * a reload — a banner that only takes effect on the next page view leaves the
 * current one doing whatever it was already doing.
 */
export function onConsentChange(listener: (decision: ConsentDecision | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Writes a value if its category allows it, and reports whether it did.
 *
 * Unknown keys are refused rather than allowed: adding storage should mean
 * adding it to the registry above, and the failure mode for forgetting should
 * be "it does not persist", not "it persists unclassified".
 */
export function storeItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  const category = STORAGE_REGISTRY[key];
  if (!category) {
    console.warn(`[consent] refusing to store unclassified key "${key}"`);
    return false;
  }
  if (!allows(category)) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Reads a stored value. Reading is not restricted — only writing is. */
export function readItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch { /* storage unavailable — nothing to remove */ }
}

/**
 * Deletes a cookie.
 *
 * Always permitted, whatever the decision — removing stored data never needs
 * consent, and clearing a stale session cookie must keep working for a visitor
 * who has refused everything.
 */
export function clearCookie(key: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${key}=; path=/; max-age=0`;
}

/** Sets a cookie if its category allows it. Same rule as `storeItem`. */
export function storeCookie(key: string, value: string, maxAgeSeconds = 31536000): boolean {
  if (typeof document === 'undefined') return false;
  const category = STORAGE_REGISTRY[key];
  if (!category) {
    console.warn(`[consent] refusing to set unclassified cookie "${key}"`);
    return false;
  }
  if (!allows(category)) return false;
  document.cookie = `${key}=${value}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
  return true;
}
