import { Core } from '@strapi/strapi';

export interface TrackingEvent {
  type: 'view' | 'click' | 'completion';
  tags: string[];
  mediaType?: 'video' | 'pdf' | 'article' | 'short';
  creatorId?: string | number;
  timestamp?: string;
}

export interface AffinityGraph {
  contentTypes: Record<string, number>;
  topics: Record<string, { score: number; last_interacted: string }>;
  creators: Record<string, { score: number; last_interacted: string }>;
}

export const DEFAULT_AFFINITY_GRAPH: AffinityGraph = {
  contentTypes: {
    video: 0.8,
    pdf: 0.8,
    article: 0.7,
    short: 0.5,
  },
  topics: {
    'Wissenschaft': { score: 90, last_interacted: new Date().toISOString() },
    'Natur': { score: 85, last_interacted: new Date().toISOString() },
    'Kochen': { score: 75, last_interacted: new Date().toISOString() },
    'PostgreSQL': { score: 95, last_interacted: new Date().toISOString() },
    'NextJS': { score: 88, last_interacted: new Date().toISOString() },
    'Funny Cat Videos': { score: 20, last_interacted: '2025-12-10T08:00:00Z' },
  },
  creators: {
    '1': { score: 50, last_interacted: new Date().toISOString() },
  },
};

const POINTS_MAP: Record<string, number> = {
  view: 1,
  click: 5,
  completion: 20,
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async processBatch(userId?: string | number, events: TrackingEvent[] = []) {
    if (!events || events.length === 0) {
      return { success: true, processedEvents: 0 };
    }

    let graph: AffinityGraph = JSON.parse(JSON.stringify(DEFAULT_AFFINITY_GRAPH));
    let profileId: any = null;

    // 1. Fetch User if userId provided
    if (userId) {
      try {
        const profiles = await strapi.documents('plugin::users-permissions.user').findMany({
          filters: { id: { $eq: userId } },
        });
        if (profiles && profiles.length > 0) {
          const profile = profiles[0] as any;
          profileId = profile.documentId || profile.id;
          if (profile.affinityGraph) {
            graph = profile.affinityGraph;
          }
        }
      } catch (err) {
        // Fallback
      }
    }

    const now = new Date();
    const FOURTEEN_DAYS_MS = 14 * 24 * 3600 * 1000;

    // 2. Apply Time Decay logic before adding new scores
    Object.keys(graph.topics).forEach((topic) => {
      const item = graph.topics[topic];
      if (item.last_interacted) {
        const diffMs = now.getTime() - new Date(item.last_interacted).getTime();
        if (diffMs > FOURTEEN_DAYS_MS) {
          // Halve score if last interaction > 14 days ago
          item.score = parseFloat((item.score * 0.5).toFixed(2));
        }
      }
    });

    // 3. Process incoming batch events
    events.forEach((evt) => {
      const points = POINTS_MAP[evt.type] || 1;

      // Update topic scores
      if (evt.tags && Array.isArray(evt.tags)) {
        evt.tags.forEach((tag) => {
          if (!graph.topics[tag]) {
            graph.topics[tag] = { score: 10, last_interacted: now.toISOString() };
          }
          graph.topics[tag].score = Math.min(100, graph.topics[tag].score + points);
          graph.topics[tag].last_interacted = now.toISOString();
        });
      }

      // Update content type weights
      if (evt.mediaType && graph.contentTypes[evt.mediaType] !== undefined) {
        const boost = points * 0.01;
        graph.contentTypes[evt.mediaType] = Math.min(1.0, parseFloat((graph.contentTypes[evt.mediaType] + boost).toFixed(2)));
      }

      // Update creator scores
      if (evt.creatorId) {
        const cId = String(evt.creatorId);
        if (!graph.creators[cId]) {
          graph.creators[cId] = { score: 10, last_interacted: now.toISOString() };
        }
        graph.creators[cId].score = Math.min(100, graph.creators[cId].score + points);
        graph.creators[cId].last_interacted = now.toISOString();
      }
    });

    // 4. Save updated affinityGraph back to Strapi DB
    if (profileId) {
      try {
        await strapi.documents('plugin::users-permissions.user').update({
          documentId: profileId,
          data: {
            affinityGraph: graph,
          } as any,
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
