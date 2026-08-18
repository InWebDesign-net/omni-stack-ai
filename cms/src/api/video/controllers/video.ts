import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::video.video', ({ strapi }) => ({
  async filtered(ctx: any) {
    try {
      const result = await (strapi.service('api::video.video') as any).findFilteredVideos(ctx.query);
      return result;
    } catch (err: any) {
      console.error('Error in video.filtered controller:', err);
      ctx.status = 500;
      ctx.body = { error: err?.message || 'Failed to fetch filtered videos' };
    }
  },

  async tags(ctx: any) {
    try {
      const result = await (strapi.service('api::video.video') as any).getAllTags(ctx.query);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: err?.message || 'Failed to aggregate tags' };
    }
  },
}));
