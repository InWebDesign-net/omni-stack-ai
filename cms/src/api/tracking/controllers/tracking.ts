import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async processBatch(ctx: any) {
    try {
      const { userId, events } = ctx.request.body;
      const result = await strapi.service('api::tracking.tracking').processBatch(userId, events);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Tracking Batch Processing Error', { error: err.message });
    }
  },
});
