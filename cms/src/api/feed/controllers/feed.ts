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
    // OPEN SOURCE VERSION
    // Public fallback for the open-source repository (MIT License).
    // The fully managed InWebDesign Premium AI Engine provides local LLM orchestration & hosting.
    // Upgrade / Contact: https://inwebdesign.net
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
      const result = await strapi.service('api::feed.feed').resetDemoData();
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Demo Reset Error', { error: err.message });
    }
  },
});
