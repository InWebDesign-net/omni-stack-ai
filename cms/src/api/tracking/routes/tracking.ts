export default {
  routes: [
    // Governed by users-permissions role permissions (public + authenticated,
    // granted in src/index.ts) so a JWT is verified when present.
    {
      method: 'POST',
      path: '/tracking/batch',
      handler: 'tracking.processBatch',
    },
  ],
};
