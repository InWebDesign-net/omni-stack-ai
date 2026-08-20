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

/** JWT of the logged-in user from stored session or localStorage. */
export function getStoredJwt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const directJwt = localStorage.getItem('omni_jwt');
    if (directJwt) return directJwt;

    const savedUser = localStorage.getItem('omni_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed?.jwt) return parsed.jwt;
    }

    return null;
  } catch {
    return null;
  }
}

/** Standard JSON headers with optional Authorization bearer token for API requests. */
export function jsonAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const jwt = getStoredJwt();
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  return headers;
}
