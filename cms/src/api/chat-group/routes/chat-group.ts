export default {
  routes: [
    {
      method: 'POST',
      path: '/chat-groups/create',
      handler: 'chat-group.createGroup',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/chat-groups/:id/invite',
      handler: 'chat-group.inviteUser',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/chat-groups/:id/kick',
      handler: 'chat-group.kickUser',
      config: { policies: [] },
    },
    {
      method: 'DELETE',
      path: '/chat-groups/:id',
      handler: 'chat-group.closeGroup',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/chat-groups/:id/subscribe',
      handler: 'chat-group.toggleSubscribe',
      config: { policies: [] },
    },
  ],
};
