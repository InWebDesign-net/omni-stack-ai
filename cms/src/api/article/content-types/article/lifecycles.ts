import { rememberFavoritesFor, cleanupFavoritesFor } from '../../../../lib/favorite-cleanup';

/**
 * Favourites pointing at this content are noted before the delete and removed
 * after it: by `afterDelete` the relation is already cleared, so they can no
 * longer be found by it.
 */
export default {
  async beforeDelete(event: any) {
    await rememberFavoritesFor('api::article.article', event);
  },
  async afterDelete(event: any) {
    await cleanupFavoritesFor('api::article.article', event);
  },
  async beforeDeleteMany(event: any) {
    await rememberFavoritesFor('api::article.article', event);
  },
  async afterDeleteMany(event: any) {
    await cleanupFavoritesFor('api::article.article', event);
  },
};
