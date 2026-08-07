import { Core } from '@strapi/strapi';
import { normalizeAffinityGraph } from '../../../lib/affinity';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async assembleFeed(ctx: any) {
    try {
      const userProfileInput = ctx.request.body || ctx.query;
      const viewerId = ctx.state?.user?.id;
      const result = await strapi.service('api::feed.feed').assembleFeed(userProfileInput, viewerId);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Feed Assembly Error', { error: err.message });
    }
  },

  async processAiIntent(ctx: any) {
    try {
      const { prompt, currentProfile } = ctx.request.body;
      if (!prompt) {
        return ctx.badRequest('Prompt parameter is required');
      }
      const result = await strapi.service('api::feed.feed').processAiIntent(prompt, currentProfile);

      // Persist the adjusted graph for authenticated users right away
      const viewerId = ctx.state?.user?.id;
      if (viewerId && result?.updatedProfile) {
        try {
          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: viewerId },
            data: { affinityGraph: result.updatedProfile },
          });
        } catch (e) {
          console.error('processAiIntent: failed to persist affinityGraph:', e);
        }
      }

      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('AI Intent Processing Error', { error: err.message });
    }
  },

  /**
   * Replace the authenticated user's affinityGraph (Algorithm panel, on-the-fly edits).
   * Route requires authentication — users can only ever write their own graph.
   */
  async updateProfile(ctx: any) {
    const viewer = ctx.state?.user;
    if (!viewer) {
      return ctx.unauthorized('Authentication required');
    }
    try {
      const raw = ctx.request.body?.affinityGraph ?? ctx.request.body;
      const graph = normalizeAffinityGraph(raw);
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: viewer.id },
        data: { affinityGraph: graph },
      });
      return ctx.send({ success: true, affinityGraph: graph });
    } catch (err: any) {
      return ctx.badRequest('Profile Update Error', { error: err.message });
    }
  },

  async resetDemoData(ctx: any) {
    const payload = ctx.request.body || ctx.query || {};
    const secretHeader = ctx.request.headers['x-seed-secret'];
    const providedSecret = payload.seedSecret || secretHeader;
    const expectedSecret = process.env.SEED_SECRET || 'omni_seed_secret_2026';

    if (!providedSecret || providedSecret !== expectedSecret) {
      return ctx.forbidden('Invalid seed secret');
    }
    try {
      const result = await strapi.service('api::feed.feed').seedDemoData(true);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Demo Reset Error', { error: err.message });
    }
  },

  async seedDemoData(ctx: any) {
    const payload = ctx.request.body || ctx.query || {};
    const secretHeader = ctx.request.headers['x-seed-secret'];
    const providedSecret = payload.seedSecret || secretHeader;
    const expectedSecret = process.env.SEED_SECRET || 'omni_seed_secret_2026';

    if (!providedSecret || providedSecret !== expectedSecret) {
      return ctx.forbidden('Invalid seed secret');
    }
    try {
      const { force } = payload;
      const result = await strapi.service('api::feed.feed').seedDemoData(force === true || force === 'true');
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Seed Demo Error', { error: err.message });
    }
  },

  async ingestFinalizedVideo(ctx: any) {
    try {
      const payload = ctx.request.body || {};
      const secretHeader = ctx.request.headers['x-worker-secret'];
      const providedSecret = payload.workerSecret || secretHeader;
      const expectedSecret = process.env.INGEST_WORKER_SECRET || 'omni_ingest_worker_secret_2026';

      if (!providedSecret || providedSecret !== expectedSecret) {
        return ctx.forbidden('Invalid worker secret');
      }

      const result = await strapi.service('api::feed.feed').ingestFinalizedVideo(payload);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Ingest Finalized Error', { error: err.message });
    }
  },

  async togglePublish(ctx: any) {
    const userId = ctx.state?.user?.id;
    if (!userId) {
      return ctx.unauthorized('Authentication required');
    }
    try {
      const { documentId, publish } = ctx.request.body || {};
      const result = await strapi.service('api::feed.feed').togglePublish(documentId, publish, userId);
      return ctx.send(result);
    } catch (err: any) {
      if (err.message?.includes('Forbidden')) {
        return ctx.forbidden(err.message);
      }
      return ctx.badRequest('Toggle Publish Error', { error: err.message });
    }
  },

  /**
   * Create bilingual Video entry (EN default + DE locale) via Document Service API.
   * Requires JWT authentication — creator is bound to the logged-in user.
   */
  async createVideo(ctx: any) {
    const creatorId = ctx.state?.user?.id;
    if (!creatorId) {
      return ctx.unauthorized('Authentication required');
    }
    try {
      const { title, slug, tags } = ctx.request.body || {};
      if (!title || !slug) {
        return ctx.badRequest('title and slug are required');
      }

      const videoData: any = {
        title,
        slug,
        summary: [{ type: 'paragraph', children: [{ type: 'text', text: 'Video wird verarbeitet...' }] }],
        tags: (tags && Array.isArray(tags) && tags.length > 0) ? tags : ['Wissenschaft', 'Technologie', 'Video'],
        viewsCount: 0,
        likesCount: 0,
        mp4Url: `/media/videos/${slug}.mp4`,
        hlsUrl: `/media/videos/hls/${slug}/master.m3u8`,
        thumbnailUrl: `/media/thumbnails/${slug}-1.png`,
        ogImageUrl: `/media/og/${slug}.jpg`,
        isProcessing: true,
        isForSale: false,
        price: 0,
        creator: creatorId,
      };

      // 1. Create EN (default locale) entry - published
      const createdEn = await strapi.documents('api::video.video').create({
        data: videoData,
        locale: 'en',
        status: 'published',
      });

      // 2. Create DE locale entry linked to the same documentId - published
      try {
        await strapi.documents('api::video.video').update({
          documentId: createdEn.documentId,
          locale: 'de',
          data: videoData,
          status: 'published',
        });
      } catch (deErr: any) {
        console.error('Failed to create DE locale for video:', deErr.message);
      }

      return ctx.send({
        success: true,
        documentId: createdEn.documentId,
        slug,
        isProcessing: true,
      });
    } catch (err: any) {
      return ctx.badRequest('Create Video Error', { error: err.message });
    }
  },

  async handleInteraction(ctx: any) {
    try {
      // Identity comes from the JWT only — a spoofed body userId must never
      // write into someone else's affinityGraph.
      const payload = {
        ...ctx.request.body,
        userId: ctx.state?.user?.id,
      };
      const result = await strapi.service('api::feed.feed').handleInteraction(payload);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Interaction Error', { error: err.message });
    }
  },

  async getInteractionStatus(ctx: any) {
    try {
      const { slug, userIdentifier } = ctx.query;
      const userId = ctx.state?.user?.id;
      const result = await strapi.service('api::feed.feed').getInteractionStatus(slug, userIdentifier, userId);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Interaction Status Error', { error: err.message });
    }
  },

  async getUserFavorites(ctx: any) {
    try {
      const { userIdentifier } = ctx.query;
      const userId = ctx.state?.user?.id;
      const result = await strapi.service('api::feed.feed').getUserFavorites(userIdentifier as string, userId);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('User Favorites Error', { error: err.message });
    }
  },
});
