import { Core } from '@strapi/strapi';
import {
  AffinityGraph,
  normalizeAffinityGraph,
  TOPIC_SCORE_MAX,
} from '../../../lib/affinity';

export interface TrackingEvent {
  type: 'view' | 'click' | 'like' | 'unlike' | 'completion' | 'share' | 'comment';
  tags: string[];
  mediaType?: 'video' | 'pdf' | 'article' | 'short';
  creatorId?: string | number;
  timestamp?: string;
}

const POINTS_MAP: Record<string, number> = {
  view: 2,
  click: 10,
  like: 15,
  unlike: -15,
  completion: 20,
  share: 12,
  comment: 8,
};

const DECAY_WINDOW_MS = 14 * 24 * 3600 * 1000;
const DECAY_FACTOR = 0.5;
const NEW_TOPIC_SEED_SCORE = 10;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async processBatch(userId?: string | number, events: TrackingEvent[] = []) {
    if (!events || events.length === 0) {
      return { success: true, processedEvents: 0 };
    }

    let graph: AffinityGraph = normalizeAffinityGraph(undefined);
    let userDbId: number | null = null;

    if (userId) {
      try {
        const user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: userId },
        });
        if (user) {
          userDbId = user.id;
          graph = normalizeAffinityGraph(user.affinityGraph);
        }
      } catch (err) {
        console.error('Tracking: failed to load user affinityGraph:', err);
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Time decay: halve a stale topic at most once per 14-day window
    // (last_decayed prevents repeated halving on every batch call).
    Object.values(graph.topics).forEach((entry) => {
      const sinceInteraction = now.getTime() - new Date(entry.last_interacted).getTime();
      const sinceDecay = entry.last_decayed
        ? now.getTime() - new Date(entry.last_decayed).getTime()
        : Infinity;
      if (sinceInteraction > DECAY_WINDOW_MS && sinceDecay > DECAY_WINDOW_MS) {
        entry.score = Math.round(entry.score * DECAY_FACTOR * 100) / 100;
        entry.last_decayed = nowIso;
      }
    });

    for (const evt of events) {
      const points = POINTS_MAP[evt.type] ?? 1;

      if (Array.isArray(evt.tags)) {
        for (const tag of evt.tags) {
          if (!graph.topics[tag]) {
            graph.topics[tag] = { score: NEW_TOPIC_SEED_SCORE, last_interacted: nowIso };
          }
          graph.topics[tag].score = Math.max(
            0,
            Math.min(TOPIC_SCORE_MAX, graph.topics[tag].score + points)
          );
          graph.topics[tag].last_interacted = nowIso;
          delete graph.topics[tag].last_decayed;
        }
      }

      if (evt.mediaType && graph.contentTypes[evt.mediaType] !== undefined) {
        const boost = points * 0.01;
        graph.contentTypes[evt.mediaType] = Math.max(
          0,
          Math.min(1.0, Math.round((graph.contentTypes[evt.mediaType] + boost) * 100) / 100)
        );
      }

      if (evt.creatorId !== undefined && evt.creatorId !== null) {
        const cId = String(evt.creatorId);
        if (!graph.creators[cId]) {
          graph.creators[cId] = { score: NEW_TOPIC_SEED_SCORE, last_interacted: nowIso };
        }
        graph.creators[cId].score = Math.max(
          0,
          Math.min(TOPIC_SCORE_MAX, graph.creators[cId].score + points)
        );
        graph.creators[cId].last_interacted = nowIso;
      }
    }

    if (userDbId) {
      try {
        await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: userDbId },
          data: { affinityGraph: graph },
        });
      } catch (err) {
        console.error('Error updating user affinityGraph in Strapi:', err);
      }
    }

    return {
      success: true,
      processedEvents: events.length,
      affinityGraph: graph,
    };
  },
});
