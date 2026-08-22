/**
 * Browser-side AffinityGraph helpers.
 *
 * The canonical model is maintained in @omni/shared so both frontend and backend
 * stay in sync automatically. This file only adds browser-specific helpers for
 * localStorage and JWT retrieval that cannot live in the shared package.
 */
import type { AffinityGraph, TopicAffinity } from '@omni/shared';
import {
  TOPIC_SCORE_MAX,
  defaultAffinityGraph,
  applyDecayAndPrune,
  normalizeAffinityGraph,
  isCanonicalAffinityGraph,
  topicWeight,
  creatorWeight,
} from '@omni/shared';

export type { AffinityGraph, TopicAffinity };
export {
  TOPIC_SCORE_MAX,
  defaultAffinityGraph,
  applyDecayAndPrune,
  normalizeAffinityGraph,
  isCanonicalAffinityGraph,
  topicWeight,
  creatorWeight,
};

const PROFILE_STORAGE_KEY = 'omni_user_interest_profile';

/** Reads and normalizes the locally stored affinity graph (browser only). */
export function loadStoredAffinityGraph(): AffinityGraph | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) return null;
    return normalizeAffinityGraph(JSON.parse(stored));
  } catch {
    return null;
  }
}

export function storeAffinityGraph(graph: AffinityGraph) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(graph));
  } catch { /* localStorage unavailable (quota or private mode) — preference not persisted */ }
}

/**
 * Standard JSON headers for API requests.
 *
 * This used to attach an `Authorization` bearer token read from
 * `localStorage`, which is why a copy of the session token had to be kept
 * there — a credential at rest that any script on the page could read, and
 * that outlived the session in every open tab.
 *
 * Our API routes authenticate from the httpOnly `omni_jwt` cookie instead. The
 * browser attaches it to same-origin requests on its own, so callers get the
 * signed-in identity without this code ever handling the token. The function
 * stays because ~60 call sites use it as their header builder and the
 * `Content-Type` is still needed.
 */
export function jsonAuthHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}
