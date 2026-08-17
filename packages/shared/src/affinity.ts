/**
 * Canonical AffinityGraph model — the single interest-profile shape used across
 * the whole Omni stack (tracking service, feed ranking, AI intent, Algorithm panel).
 *
 * Shape:
 *   topics:       topic name -> score 0–100 (+ last_interacted / last_decayed timestamps)
 *   contentTypes: media type -> weight 0–1
 *   creators:     user id    -> score 0–100 (affinity towards a creator)
 *   activePattern: slot-interleaving strategy for feed assembly
 *
 * This package must stay environment-agnostic (no localStorage, window, etc.).
 * Browser-specific helpers (getStoredJwt, jsonAuthHeaders) live in web/src/lib/affinity.ts.
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
      image: 0.8,
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

const toTopicEntry = (raw: unknown, scale: number): TopicAffinity | null => {
  if (raw === null || typeof raw !== 'object') return null;
  const rawScore = typeof raw === 'number' ? raw : (raw as { score?: unknown }).score;
  if (typeof rawScore !== 'number' || Number.isNaN(rawScore)) return null;
  return {
    score: clamp(Math.round(rawScore * scale * 100) / 100, 0, TOPIC_SCORE_MAX),
    last_interacted:
      typeof (raw as { last_interacted?: unknown }).last_interacted === 'string'
        ? (raw as { last_interacted: string }).last_interacted
        : new Date().toISOString(),
    ...(typeof (raw as { last_decayed?: unknown }).last_decayed === 'string'
      ? { last_decayed: (raw as { last_decayed: string }).last_decayed }
      : {}),
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
    const lastTime = new Date(
      entry.last_interacted || entry.last_decayed || Date.now()
    ).getTime();
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
export function normalizeAffinityGraph(raw?: unknown): AffinityGraph {
  const graph = defaultAffinityGraph();
  if (!raw || typeof raw !== 'object') {
    graph.topics = applyDecayAndPrune(graph.topics, 50, 5);
    graph.creators = applyDecayAndPrune(graph.creators, 50, 5);
    return graph;
  }

  const rawObj = raw as Record<string, unknown>;

  if (rawObj.topics && typeof rawObj.topics === 'object') {
    for (const [topic, entry] of Object.entries(rawObj.topics)) {
      const normalized = toTopicEntry(entry, 1);
      if (normalized) graph.topics[topic] = normalized;
    }
  }

  // Legacy 0–1 "interests" — only applied where no 0–100 topic entry exists
  if (rawObj.interests && typeof rawObj.interests === 'object') {
    for (const [topic, entry] of Object.entries(rawObj.interests)) {
      if (rawObj.topics && typeof rawObj.topics === 'object' && topic in rawObj.topics) continue;
      const normalized = toTopicEntry(entry, TOPIC_SCORE_MAX);
      if (normalized) graph.topics[topic] = normalized;
    }
  }

  if (rawObj.contentTypes && typeof rawObj.contentTypes === 'object') {
    for (const [type, weight] of Object.entries(rawObj.contentTypes)) {
      if (typeof weight === 'number' && !Number.isNaN(weight)) {
        graph.contentTypes[type] = clamp(weight, 0, 1);
      }
    }
  }

  if (rawObj.creators && typeof rawObj.creators === 'object') {
    for (const [creatorId, entry] of Object.entries(rawObj.creators)) {
      const normalized = toTopicEntry(entry, 1);
      if (normalized) graph.creators[creatorId] = normalized;
    }
  }

  if (
    rawObj.activePattern === 'discovery' ||
    rawObj.activePattern === 'deep_dive'
  ) {
    graph.activePattern = rawObj.activePattern;
  }

  // Apply time-decay and prune low-score / overflow topics & creators
  graph.topics = applyDecayAndPrune(graph.topics, 50, 5);
  graph.creators = applyDecayAndPrune(graph.creators, 50, 5);

  return graph;
}

/** True if the stored value already matches the canonical shape. */
export function isCanonicalAffinityGraph(raw: unknown): boolean {
  return Boolean(
    raw &&
      typeof raw === 'object' &&
      (raw as Record<string, unknown>).topics &&
      !(raw as Record<string, unknown>).interests &&
      (raw as Record<string, unknown>).creators &&
      (raw as Record<string, unknown>).contentTypes &&
      ((raw as Record<string, unknown>).activePattern === 'discovery' ||
        (raw as Record<string, unknown>).activePattern === 'deep_dive')
  );
}

/** Highest topic weight (0–1) that any of the item's tags reaches in the graph. */
export function topicWeight(
  graph: AffinityGraph,
  tags: string[],
  baseline = 0.2
): number {
  let hasExplicitMatch = false;
  let maxWeight = 0;
  for (const tag of tags || []) {
    const entry = graph.topics[tag];
    if (entry !== undefined) {
      hasExplicitMatch = true;
      maxWeight = Math.max(maxWeight, entry.score / TOPIC_SCORE_MAX);
    }
  }
  return hasExplicitMatch ? maxWeight : baseline;
}

/** Creator affinity weight (0–1) for a creator id, 0 when unknown. */
export function creatorWeight(
  graph: AffinityGraph,
  creatorId?: string | number
): number {
  if (creatorId === undefined || creatorId === null) return 0;
  const entry = graph.creators[String(creatorId)];
  return entry ? entry.score / TOPIC_SCORE_MAX : 0;
}
