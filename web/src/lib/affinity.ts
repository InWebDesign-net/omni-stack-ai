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
  const now = new Date().toISOString();
  return {
    topics: {
      'Wissenschaft': { score: 95, last_interacted: now },
      'Natur': { score: 88, last_interacted: now },
      'Kochen': { score: 75, last_interacted: now },
      'Finanzen': { score: 80, last_interacted: now },
      'PostgreSQL': { score: 90, last_interacted: now },
      'Strapi': { score: 82, last_interacted: now },
      'NextJS': { score: 85, last_interacted: now },
      'Ollama': { score: 78, last_interacted: now },
      'Funny Cat Videos': { score: 20, last_interacted: '2025-12-10T08:00:00Z' },
    },
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
 * Converts any historical affinity shape into the canonical one.
 * Accepted legacy inputs:
 *  - tracking shape:   { topics: {score 0–100}, contentTypes, creators }        (no activePattern)
 *  - interest profile: { interests: {score 0–1}, contentTypes, activePattern }  (no creators)
 *  - canonical shape (returned as-is, clamped)
 */
export function normalizeAffinityGraph(raw?: any): AffinityGraph {
  const graph = defaultAffinityGraph();
  if (!raw || typeof raw !== 'object') return graph;

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

/** JWT of the logged-in user from the stored session, if any (browser only). */
export function getStoredJwt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const savedUser = localStorage.getItem('omni_user');
    if (!savedUser) return null;
    return JSON.parse(savedUser)?.jwt || null;
  } catch {
    return null;
  }
}
