import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::video.video', ({ strapi }) => ({
  async tags(ctx: any) {
    try {
      const result = await (strapi.service('api::video.video') as any).getAllTags();
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: err?.message || 'Failed to aggregate tags' };
    }
  },
}));
