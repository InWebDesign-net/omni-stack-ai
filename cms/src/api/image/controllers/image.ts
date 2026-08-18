import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::image.image', ({ strapi }) => ({
  async filtered(ctx: any) {
    try {
      const result = await (strapi.service('api::image.image') as any).findFilteredImages(ctx.query);
      return result;
    } catch (err: any) {
      console.error('Error in image.filtered controller:', err);
      ctx.status = 500;
      ctx.body = { error: err?.message || 'Failed to fetch filtered images' };
    }
  },

  async tags(ctx: any) {
    try {
      const result = await (strapi.service('api::image.image') as any).getAllTags(ctx.query);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.status = 500;
      ctx.body = { error: err?.message || 'Failed to aggregate image tags' };
    }
  },
}));
