import type { Core } from '@strapi/strapi';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    (strapi.server.app as any).use(async (ctx: any, next: any) => {
      if (ctx.path.startsWith('/.strapi/client/')) {
        const relativePath = ctx.path.replace('/.strapi/client/', '');
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), '.strapi/client', relativePath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const mime = require('mime-types');
          ctx.type = mime.lookup(filePath) || 'application/javascript';
          ctx.body = fs.createReadStream(filePath);
          return;
        }
      }
      await next();
    });

    // Centralized Document Service Middleware for default-deny visibility enforcement.
    // See docs/OMNI_VIEWER.md for the full visibility contract.
    strapi.documents.use(async (context: any, next: any) => {
      const targetUIDs = ['api::video.video', 'api::feed-item.feed-item', 'api::image.image'];
      const action = context.action;

      if (targetUIDs.includes(context.uid) && (action === 'findMany' || action === 'findOne' || action === 'findFirst')) {
        const koaCtx = strapi.requestContext ? strapi.requestContext.get() : null;
        const reqPath = koaCtx?.request?.path || '';
        const isAdminRequest =
          koaCtx?.state?.auth?.strategy?.name === 'admin' ||
          Boolean(koaCtx?.state?.user && ('roles' in koaCtx.state.user || 'registrationToken' in koaCtx.state.user)) ||
          reqPath.startsWith('/content-manager') ||
          reqPath.startsWith('/admin');

        // Admin users in Strapi Content Manager see ALL entries without default-deny restrictions
        if (isAdminRequest) {
          return next();
        }

        const omniViewer = context.params?.omniViewer;
        if (!context.params) context.params = {};

        const headerUserId = koaCtx?.header?.['x-omni-user-id'] || koaCtx?.request?.header?.['x-omni-user-id'];
        const queryUserId = koaCtx?.query?.omniUserId || koaCtx?.request?.query?.omniUserId;

        const uidNum = omniViewer?.userId
          ? Number(omniViewer.userId)
          : (koaCtx?.state?.user?.id
              ? Number(koaCtx.state.user.id)
              : (headerUserId ? Number(headerUserId) : (queryUserId ? Number(queryUserId) : null)));

        const filters = context.params.filters || {};
        const usesCreator = context.uid === 'api::video.video' || context.uid === 'api::image.image';
        const targetRelFilter = usesCreator ? filters.creator : filters.author;
        const targetRelId = targetRelFilter?.id?.$eq || targetRelFilter?.id || targetRelFilter;

        const isOwnerQuery = uidNum && targetRelId && String(uidNum) === String(targetRelId);
        const isSpecificItemQuery = Boolean(filters.slug || filters.documentId || filters.id);

        // If explicitly querying for owner's items OR querying for a specific item (slug/documentId) when authenticated, allow query
        if (isOwnerQuery || (isSpecificItemQuery && uidNum != null)) {
          return next();
        }

        // If explicitly filtering by visibility, keep existing filter
        if (filters.visibility) {
          return next();
        }

        // Default-deny for general queries: enforce visibility = public
        context.params.filters = {
          ...filters,
          visibility: { $eq: 'public' },
        };
      }

      return next();
    });
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      // 1. Seed bilingual Feed Items & Blocks in Strapi (idempotent, only if missing)
      await strapi.service('api::feed.feed').seedDemoData(false);

      // 2. Demo Admin Editors Seeding
      const isDemoMode = process.env.DEMO_MODE !== 'false';
      if (isDemoMode) {
        console.log('🎭 Seeding Demo Admin Editors for Preview Environment...');
        const adminEditors = [
          {
            email: 'demo-editor1@inwebdesign.net',
            firstname: 'Demo',
            lastname: 'Editor 1',
            password: 'DemoEditor2026!',
            roles: [2],
            isActive: true,
          },
          {
            email: 'demo-editor2@inwebdesign.net',
            firstname: 'Demo',
            lastname: 'Editor 2',
            password: 'DemoEditor2026!',
            roles: [2],
            isActive: true,
          },
        ];

        for (const editor of adminEditors) {
          try {
            const existingAdmin = await strapi.service('admin::user').findOneByEmail(editor.email);
            if (!existingAdmin) {
              await strapi.service('admin::user').create(editor);
              console.log(`✅ Strapi Admin Editor account created: ${editor.email}`);
            }
          } catch (e) {
            // Ignored
          }
        }
      }

      // 3. Grant Public & Authenticated permissions for api::comment.comment
      const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'public' },
      });
      const authRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' },
      });

      const enablePermission = async (roleId: number, action: string) => {
        try {
          const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: { role: roleId, action },
          });
          if (!existing) {
            await strapi.db.query('plugin::users-permissions.permission').create({
              data: { action, role: roleId },
            });
          }
        } catch (e) {}
      };

      // Feed & tracking actions available to everyone (JWT is verified when present)
      const publicFeedActions = [
        'api::feed.feed.assembleFeed',
        'api::feed.feed.processAiIntent',
        'api::feed.feed.handleInteraction',
        'api::feed.feed.getInteractionStatus',
        'api::feed.feed.getUserFavorites',
        'api::tracking.tracking.processBatch',
      ];

      const disablePermission = async (roleId: number, action: string) => {
        try {
          await strapi.db.query('plugin::users-permissions.permission').deleteMany({
            where: { role: roleId, action },
          });
        } catch (e) {}
      };

      if (publicRole) {
        await disablePermission(publicRole.id, 'plugin::users-permissions.user.update');
        await enablePermission(publicRole.id, 'plugin::users-permissions.user.find');
        await enablePermission(publicRole.id, 'plugin::users-permissions.user.findOne');
        await enablePermission(publicRole.id, 'api::comment.comment.find');
        await enablePermission(publicRole.id, 'api::comment.comment.findOne');
        await enablePermission(publicRole.id, 'api::comment.comment.create');
        await enablePermission(publicRole.id, 'api::video.video.find');
        await enablePermission(publicRole.id, 'api::video.video.findOne');
        await enablePermission(publicRole.id, 'api::chat-room.chat-room.find');
        await enablePermission(publicRole.id, 'api::chat-room.chat-room.findOne');
        await enablePermission(publicRole.id, 'api::chat-room.chat-room.create');
        await enablePermission(publicRole.id, 'api::chat-room.chat-room.update');
        await enablePermission(publicRole.id, 'api::chat-message.chat-message.find');
        await enablePermission(publicRole.id, 'api::chat-message.chat-message.findOne');
        await enablePermission(publicRole.id, 'api::chat-message.chat-message.create');
        for (const action of publicFeedActions) {
          await enablePermission(publicRole.id, action);
        }
      }

      if (authRole) {
        // Enforce: users cannot update full user fields directly (profile updates go through /feed/profile)
        await disablePermission(authRole.id, 'plugin::users-permissions.user.update');
        await enablePermission(authRole.id, 'plugin::users-permissions.user.find');
        await enablePermission(authRole.id, 'plugin::users-permissions.user.findOne');
        await enablePermission(authRole.id, 'api::comment.comment.find');
        await enablePermission(authRole.id, 'api::comment.comment.findOne');
        await enablePermission(authRole.id, 'api::comment.comment.create');
        await enablePermission(authRole.id, 'api::comment.comment.update');
        await enablePermission(authRole.id, 'api::comment.comment.delete');
        await enablePermission(authRole.id, 'api::video.video.find');
        await enablePermission(authRole.id, 'api::video.video.findOne');
        await enablePermission(authRole.id, 'api::video.video.update');
        await enablePermission(authRole.id, 'api::chat-room.chat-room.find');
        await enablePermission(authRole.id, 'api::chat-room.chat-room.findOne');
        await enablePermission(authRole.id, 'api::chat-room.chat-room.create');
        await enablePermission(authRole.id, 'api::chat-room.chat-room.update');
        await enablePermission(authRole.id, 'api::chat-message.chat-message.find');
        await enablePermission(authRole.id, 'api::chat-message.chat-message.findOne');
        await enablePermission(authRole.id, 'api::chat-message.chat-message.create');
        await enablePermission(authRole.id, 'api::notification.notification.find');
        await enablePermission(authRole.id, 'api::notification.notification.markRead');
        await enablePermission(authRole.id, 'api::notification.notification.deleteOne');
        await enablePermission(authRole.id, 'api::notification.notification.create');
        await enablePermission(authRole.id, 'api::subscription.subscription.find');
        await enablePermission(authRole.id, 'api::subscription.subscription.findOne');
        await enablePermission(authRole.id, 'api::subscription.subscription.create');
        await enablePermission(authRole.id, 'api::subscription.subscription.delete');
        await enablePermission(authRole.id, 'api::favorite.favorite.find');
        await enablePermission(authRole.id, 'api::favorite.favorite.findOne');
        await enablePermission(authRole.id, 'api::favorite.favorite.create');
        await enablePermission(authRole.id, 'api::favorite.favorite.delete');
        for (const action of publicFeedActions) {
          await enablePermission(authRole.id, action);
        }
        // Own-profile graph updates and video management require a logged-in user
        await enablePermission(authRole.id, 'api::feed.feed.updateProfile');
        await enablePermission(authRole.id, 'api::feed.feed.togglePublish');
        await enablePermission(authRole.id, 'api::feed.feed.createVideo');
      }

      // 3b. One-time migration: normalize every stored affinityGraph to the
      // canonical shape (idempotent — skips users that are already canonical).
      try {
        const { normalizeAffinityGraph, isCanonicalAffinityGraph } = await import('./lib/affinity');
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({});
        let migrated = 0;
        for (const user of users) {
          if (!isCanonicalAffinityGraph(user.affinityGraph)) {
            await strapi.db.query('plugin::users-permissions.user').update({
              where: { id: user.id },
              data: { affinityGraph: normalizeAffinityGraph(user.affinityGraph) },
            });
            migrated += 1;
          }
        }
        if (migrated > 0) {
          console.log(`🔄 Normalized affinityGraph for ${migrated} user(s) to canonical shape.`);
        }
      } catch (e) {
        console.error('affinityGraph normalization failed:', e);
      }

      // 4. Automatic /root/media/out background watcher (ingests finalized LXC video conversions)
      const outDir = '/root/media/out';
      const workerSecret = process.env.INGEST_WORKER_SECRET;
      if (!workerSecret) {
        console.warn('⚠️ Warning: INGEST_WORKER_SECRET is missing from environment configuration.');
      } else {
        setInterval(async () => {
          try {
            const fs = require('fs');
            const path = require('path');
            if (fs.existsSync(outDir)) {
              const outFiles = fs.readdirSync(outDir);
              const doneFiles = outFiles.filter((f: string) => f.endsWith('.done'));
              for (const doneFile of doneFiles) {
                const base = path.basename(doneFile, '.done');
                await strapi.service('api::feed.feed').ingestFinalizedVideo({ slug: base, workerSecret });
              }
            }
          } catch (e) {}
        }, 3000);
      }
    } catch (error) {
      console.error('Error during Strapi bootstrap:', error);
    }
  },
};
