import { rememberLikesFor, cleanupLikesFor } from '../../../../lib/like-cleanup';

/**
 * Likes pointing at this content are noted before the delete and removed
 * after it: by `afterDelete` the relation is already cleared, so they can no
 * longer be found by it.
 */
export default {
  async beforeDelete(event: any) {
    await rememberLikesFor('api::video.video', event);
  },
  async afterDelete(event: any) {
    await cleanupLikesFor('api::video.video', event);
  },
  async beforeDeleteMany(event: any) {
    await rememberLikesFor('api::video.video', event);
  },
  async afterDeleteMany(event: any) {
    await cleanupLikesFor('api::video.video', event);
  },
};
