import { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async processBatch(ctx: any) {
    try {
      const { events } = ctx.request.body;
      // Identity from JWT only — anonymous batches update nothing persistent.
      const userId = ctx.state?.user?.id;
      const result = await strapi.service('api::tracking.tracking').processBatch(userId, events);
      return ctx.send(result);
    } catch (err: any) {
      return ctx.badRequest('Tracking Batch Processing Error', { error: err.message });
    }
  },
});
