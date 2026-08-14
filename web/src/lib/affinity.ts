/**
 * Canonical AffinityGraph model — the single interest-profile shape used across
 * the whole stack (tracking service, feed ranking, AI intent, Algorithm panel).
 *
 * Shape:
 *   topics:       topic name -> score 0–100 (+ last_interacted / last_decayed timestamps)
 *   contentTypes: media type -> weight 0–1
 *   creators:     user id    -> score 0–100 (affinity towards a creator)
 *   activePattern: slot-interleaving strategy for feed assembly
 *
 * The authoritative copy lives in cms/src/lib/affinity.ts — keep both in sync.
 */

export interface TopicAffinity {
  score: number;
  last_interacted: string;
  last_decayed?: string;
}

export interface AffinityGraph {
  topics: Record<string, TopicAffinity>;
  contentTypes: Record<string, number>;
  creators: Record<string, TopicAffinity>;
  activePattern: 'discovery' | 'deep_dive';
}

export const TOPIC_SCORE_MAX = 100;

export function defaultAffinityGraph(): AffinityGraph {
  return {
    topics: {},
    contentTypes: {
      pdf: 0.8,
      video: 0.9,
      article: 0.7,
      short: 0.5,
    },
    creators: {},
    activePattern: 'discovery',
  };
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toTopicEntry = (raw: any, scale: number): TopicAffinity | null => {
  const rawScore = typeof raw === 'number' ? raw : raw?.score;
  if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) return null;
  return {
    score: clamp(Math.round(rawScore * scale * 100) / 100, 0, TOPIC_SCORE_MAX),
    last_interacted: raw?.last_interacted || new Date().toISOString(),
    ...(raw?.last_decayed ? { last_decayed: raw.last_decayed } : {}),
  };
};

/**
 * Applies time-decay (2% per day of inactivity) and prunes low-score (< 5)
 * or long-tail topics beyond top 50 to prevent unbounded memory growth.
 */
export function applyDecayAndPrune(
  items: Record<string, TopicAffinity>,
  maxCount = 50,
  minScore = 5
): Record<string, TopicAffinity> {
  const now = Date.now();
  const ONE_DAY_MS = 86400000;
  const DECAY_PER_DAY = 0.02; // 2% per day

  const entries: [string, TopicAffinity][] = [];

  for (const [key, entry] of Object.entries(items)) {
    const lastTime = new Date(entry.last_interacted || entry.last_decayed || Date.now()).getTime();
    const daysPassed = Math.max(0, (now - lastTime) / ONE_DAY_MS);

    // Apply exponential decay: score * (0.98 ^ days)
    let newScore = entry.score * Math.pow(1 - DECAY_PER_DAY, daysPassed);
    newScore = Math.round(newScore * 100) / 100;

    // Prune entries below minimum threshold
    if (newScore >= minScore) {
      entries.push([
        key,
        {
          ...entry,
          score: clamp(newScore, 0, TOPIC_SCORE_MAX),
          last_decayed: new Date().toISOString(),
        },
      ]);
    }
  }

  // Sort by score descending and keep top N
  entries.sort((a, b) => b[1].score - a[1].score);
  const topEntries = entries.slice(0, maxCount);

  const result: Record<string, TopicAffinity> = {};
  for (const [key, value] of topEntries) {
    result[key] = value;
  }
  return result;
}

/**
 * Converts any historical affinity shape into the canonical one.
 * Accepted legacy inputs:
 *  - tracking shape:   { topics: {score 0–100}, contentTypes, creators }        (no activePattern)
 *  - interest profile: { interests: {score 0–1}, contentTypes, activePattern }  (no creators)
 *  - canonical shape (returned as-is, clamped)
 */
export function normalizeAffinityGraph(raw?: any): AffinityGraph {
  const graph = defaultAffinityGraph();
  if (!raw || typeof raw !== 'object') {
    graph.topics = applyDecayAndPrune(graph.topics, 50, 5);
    graph.creators = applyDecayAndPrune(graph.creators, 50, 5);
    return graph;
  }

  if (raw.topics && typeof raw.topics === 'object') {
    for (const [topic, entry] of Object.entries(raw.topics)) {
      const normalized = toTopicEntry(entry, 1);
      if (normalized) graph.topics[topic] = normalized;
    }
  }

  // Legacy 0–1 "interests" — only applied where no 0–100 topic entry exists
  if (raw.interests && typeof raw.interests === 'object') {
    for (const [topic, entry] of Object.entries(raw.interests)) {
      if (raw.topics && raw.topics[topic] !== undefined) continue;
      const normalized = toTopicEntry(entry, TOPIC_SCORE_MAX);
      if (normalized) graph.topics[topic] = normalized;
    }
  }

  if (raw.contentTypes && typeof raw.contentTypes === 'object') {
    for (const [type, weight] of Object.entries(raw.contentTypes)) {
      if (typeof weight === 'number' && !Number.isNaN(weight)) {
        graph.contentTypes[type] = clamp(weight, 0, 1);
      }
    }
  }

  if (raw.creators && typeof raw.creators === 'object') {
    for (const [creatorId, entry] of Object.entries(raw.creators)) {
      const normalized = toTopicEntry(entry, 1);
      if (normalized) graph.creators[creatorId] = normalized;
    }
  }

  if (raw.activePattern === 'discovery' || raw.activePattern === 'deep_dive') {
    graph.activePattern = raw.activePattern;
  }

  // Apply time-decay and prune low-score / overflow topics & creators
  graph.topics = applyDecayAndPrune(graph.topics, 50, 5);
  graph.creators = applyDecayAndPrune(graph.creators, 50, 5);

  return graph;
}

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
  } catch {}
}

/** JWT of the logged-in user from stored session, cookies or localStorage. */
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

    const m = document.cookie.match(/(?:^|;\s*)omni_jwt=([^;]+)/);
    if (m?.[1]) return m[1];

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
