import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::article.article', ({ strapi }) => ({
  async filtered(ctx: any) {
    try {
      const result = await strapi.service('api::article.article').findFilteredArticles(ctx.query);
      ctx.body = result;
    } catch (err: any) {
      ctx.badRequest(err.message || 'Failed to fetch articles');
    }
  },

  async tags(ctx: any) {
    try {
      const result = await strapi.service('api::article.article').getAllTags(ctx.query);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.badRequest(err.message || 'Failed to fetch tags');
    }
  },
}));
