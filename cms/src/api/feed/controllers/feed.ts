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

  async ingestFinalizedVideo(ctx: any) {
    try {
      const payload = ctx.request.body;
      const result = await strapi.service('api::feed.feed').ingestFinalizedVideo(payload);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Ingest Finalized Error', { error: err.message });
    }
  },
});
