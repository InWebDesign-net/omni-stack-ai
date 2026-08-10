/**
 * Custom video routes with higher precedence than the core CRUD routes.
 * The `01-` filename prefix ensures this loads BEFORE the default
 * `api::video.video` router, so `/api/videos/tags` is not swallowed by
 * the `/api/videos/:id` catch-all.
 */
export default {
  routes: [
    {
      method: 'GET',
      path: '/videos/tags',
      handler: 'api::video.video.tags',
      config: {
        auth: false,
      },
    },
  ],
};
