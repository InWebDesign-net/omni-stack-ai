/**
 * Feed routes.
 *
 * Routes WITHOUT `auth: false` are governed by users-permissions role
 * permissions (granted in src/index.ts bootstrap):
 *   - public + authenticated: assembly, ai-intent, interaction, interaction-status, user-likes
 *   - authenticated only:     profile
 * This way a JWT is verified when present (ctx.state.user is populated) while
 * anonymous access keeps working through the public role.
 */
export default {
  routes: [
    {
      method: 'POST',
      path: '/feed/assembly',
      handler: 'feed.assembleFeed',
    },
    {
      method: 'GET',
      path: '/feed/assembly',
      handler: 'feed.assembleFeed',
    },
    {
      method: 'POST',
      path: '/feed/ai-intent',
      handler: 'feed.processAiIntent',
    },
    {
      method: 'POST',
      path: '/feed/ai-stream',
      handler: 'feed.streamAiResponse',
    },
    {
      method: 'POST',
      path: '/feed/profile',
      handler: 'feed.updateProfile',
    },
    {
      method: 'POST',
      path: '/feed/demo-reset',
      handler: 'feed.resetDemoData',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/seed-demo',
      handler: 'feed.seedDemoData',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/ingest-finalized',
      handler: 'feed.ingestFinalizedVideo',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/feed/toggle-publish',
      handler: 'feed.togglePublish',
    },
    {
      method: 'POST',
      path: '/feed/create-video',
      handler: 'feed.createVideo',
    },
    {
      method: 'POST',
      path: '/feed/create-image',
      handler: 'feed.createImage',
    },
    {
      method: 'POST',
      path: '/feed/interaction',
      handler: 'feed.handleInteraction',
    },
    {
      method: 'GET',
      path: '/feed/interaction-status',
      handler: 'feed.getInteractionStatus',
    },
    {
      method: 'GET',
      path: '/feed/user-by-handle',
      handler: 'feed.getUserByHandle',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/feed/user-likes',
      handler: 'feed.getUserLikes',
    },
  ],
};
