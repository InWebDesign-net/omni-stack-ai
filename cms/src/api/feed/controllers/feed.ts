import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async assembleFeed(ctx: any) {
    try {
      const userProfileInput = ctx.request.body || ctx.query;
      const result = await strapi.service('api::feed.feed').assembleFeed(userProfileInput);
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
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('AI Intent Processing Error', { error: err.message });
    }
  },

  async resetDemoData(ctx: any) {
    try {
      const result = await strapi.service('api::feed.feed').seedDemoData(true);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Demo Reset Error', { error: err.message });
    }
  },

  async seedDemoData(ctx: any) {
    try {
      const { force } = ctx.request.body || ctx.query || {};
      const result = await strapi.service('api::feed.feed').seedDemoData(force === true || force === 'true');
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Seed Demo Error', { error: err.message });
    }
  },

  async testI18nLink(ctx: any) {
    try {
      const createdEn = await strapi.documents('api::feed-item.feed-item').create({
        data: {
          title: 'Test EN Title ' + Date.now(),
          slug: 'test-en-slug-' + Date.now(),
          summary: 'EN summary',
          tags: ['Tech'],
        } as any,
        locale: 'en',
        status: 'published',
      });

      let createdDeA: any = null;
      let errA: any = null;
      try {
        createdDeA = await strapi.documents('api::feed-item.feed-item').create({
          documentId: createdEn.documentId,
          data: {
            title: 'Test DE Title A ' + Date.now(),
            slug: 'test-de-slug-a-' + Date.now(),
            summary: 'DE summary A',
            tags: ['Tech'],
          } as any,
          locale: 'de',
          status: 'published',
        });
      } catch (e: any) {
        errA = e.message;
      }

      let createdDeB: any = null;
      let errB: any = null;
      try {
        createdDeB = await strapi.documents('api::feed-item.feed-item').update({
          documentId: createdEn.documentId,
          locale: 'de',
          data: {
            title: 'Test DE Title B ' + Date.now(),
            slug: 'test-de-slug-b-' + Date.now(),
            summary: 'DE summary B',
            tags: ['Tech'],
          } as any,
        });
      } catch (e: any) {
        errB = e.message;
      }

      const all = await strapi.documents('api::feed-item.feed-item').findMany({
        filters: { documentId: { $eq: createdEn.documentId } },
        locale: '*',
      });

      return ctx.send({
        createdEn: { documentId: createdEn.documentId, locale: createdEn.locale },
        createdDeA: createdDeA ? { documentId: createdDeA.documentId, locale: createdDeA.locale } : { error: errA },
        createdDeB: createdDeB ? { documentId: createdDeB.documentId, locale: createdDeB.locale } : { error: errB },
        allInDb: all.map((i: any) => ({ documentId: i.documentId, locale: i.locale, title: i.title })),
      });
    } catch (e: any) {
      return ctx.send({ error: e.message, stack: e.stack });
    }
  },

  async ingestFinalizedVideo(ctx: any) {
    try {
      const payload = ctx.request.body;
      const result = await strapi.service('api::feed.feed').ingestFinalizedVideo(payload);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Ingest Finalized Error', { error: err.message });
    }
  },

  async togglePublish(ctx: any) {
    try {
      const { documentId, publish } = ctx.request.body;
      const result = await strapi.service('api::feed.feed').togglePublish(documentId, publish);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Toggle Publish Error', { error: err.message });
    }
  },

  /**
   * Create bilingual Video entry (EN default + DE locale) via Document Service API.
   * Both locales are linked via documentId and published immediately.
   */
  async createVideo(ctx: any) {
    try {
      const { title, slug, tags, userId } = ctx.request.body;
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
      };
      if (userId) {
        videoData.creator = userId;
      }

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
          data: {
            ...videoData,
            // Strapi v5 i18n: update with locale 'de' on the same documentId creates the DE version
          },
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
      const payload = ctx.request.body;
      const result = await strapi.service('api::feed.feed').handleInteraction(payload);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Interaction Error', { error: err.message });
    }
  },

  async getInteractionStatus(ctx: any) {
    try {
      const { slug, userIdentifier, userId } = ctx.query;
      const result = await strapi.service('api::feed.feed').getInteractionStatus(slug, userIdentifier, userId);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Interaction Status Error', { error: err.message });
    }
  },

  async getUserFavorites(ctx: any) {
    try {
      const { userIdentifier, userId } = ctx.query;
      const result = await strapi.service('api::feed.feed').getUserFavorites(userIdentifier as string, userId);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('User Favorites Error', { error: err.message });
    }
  },
});
