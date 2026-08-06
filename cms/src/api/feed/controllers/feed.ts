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
});
