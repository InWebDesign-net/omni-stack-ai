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
      const targetUIDs = ['api::video.video', 'api::feed-item.feed-item', 'api::image.image', 'api::article.article'];
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
        const usesCreator = context.uid === 'api::video.video' || context.uid === 'api::image.image' || context.uid === 'api::article.article';
        const targetRelFilter = usesCreator ? filters.creator : filters.author;
        const targetRelId = targetRelFilter?.id?.$eq || targetRelFilter?.id || targetRelFilter;

        const isOwnerQuery = Boolean(uidNum && targetRelId && String(uidNum) === String(targetRelId));
        const isSpecificItemQuery = Boolean(filters.slug || filters.documentId || filters.id);

        // If explicitly querying for owner's items, allow query
        if (isOwnerQuery) {
          return next();
        }

        // If explicitly filtering by visibility, keep existing filter
        if (filters.visibility) {
          return next();
        }

        // Single-item lookup by slug/documentId/id.
        //
        // Anonymous callers see public, unlisted and subscribers entries. An
        // authenticated caller additionally sees their OWN private entries —
        // without that, an author cannot open the article they just created,
        // since new articles start out private. Scoping the private branch to
        // the owner keeps it tighter than a blanket bypass would: being logged
        // in is not enough to read someone else's private item by guessing its
        // slug.
        if (isSpecificItemQuery) {
          const ownerField = usesCreator ? 'creator' : 'author';
          const visibleBranches: any[] = [
            { visibility: { $in: ['public', 'unlisted', 'subscribers'] } },
          ];
          if (uidNum != null) {
            visibleBranches.push({
              visibility: { $eq: 'private' },
              [ownerField]: { id: { $eq: uidNum } },
            });
          }
          context.params.filters = { ...filters, $or: visibleBranches };
          return next();
        }

        // Default-deny for general queries/listings: enforce visibility = public
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
        strapi.log.error('[index.ts] unhandled error', e);
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
        } catch (e) {
        strapi.log.error('[index.ts] unhandled error', e);
      }
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
        } catch (e) {
        strapi.log.error('[index.ts] unhandled error', e);
      }
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
        await enablePermission(publicRole.id, 'api::video.video.filtered');
        await enablePermission(publicRole.id, 'api::video.video.tags');

        await enablePermission(publicRole.id, 'api::image.image.find');
        await enablePermission(publicRole.id, 'api::image.image.findOne');
        await enablePermission(publicRole.id, 'api::image.image.filtered');
        await enablePermission(publicRole.id, 'api::image.image.tags');

        await enablePermission(publicRole.id, 'api::article.article.find');
        await enablePermission(publicRole.id, 'api::article.article.findOne');
        await enablePermission(publicRole.id, 'api::article.article.filtered');
        await enablePermission(publicRole.id, 'api::article.article.tags');

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
        await enablePermission(authRole.id, 'api::video.video.filtered');
        await enablePermission(authRole.id, 'api::video.video.tags');
        await enablePermission(authRole.id, 'api::video.video.update');

        await enablePermission(authRole.id, 'api::image.image.find');
        await enablePermission(authRole.id, 'api::image.image.findOne');
        await enablePermission(authRole.id, 'api::image.image.filtered');
        await enablePermission(authRole.id, 'api::image.image.tags');
        await enablePermission(authRole.id, 'api::image.image.create');
        await enablePermission(authRole.id, 'api::image.image.update');
        await enablePermission(authRole.id, 'api::image.image.delete');

        await enablePermission(authRole.id, 'api::article.article.find');
        await enablePermission(authRole.id, 'api::article.article.findOne');
        await enablePermission(authRole.id, 'api::article.article.filtered');
        await enablePermission(authRole.id, 'api::article.article.tags');
        await enablePermission(authRole.id, 'api::article.article.create');
        await enablePermission(authRole.id, 'api::article.article.update');
        await enablePermission(authRole.id, 'api::article.article.delete');
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
        await enablePermission(authRole.id, 'api::subscription.subscription.update');
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

      // 3c. Locale synchronization for media entities (api::image.image and api::video.video)
      // Guarantees all media exist in both 'de' and 'en' locales so article blocks referencing them never fail to save.
      try {
        const i18nPlugin = strapi.plugin('i18n');
        const localesList = i18nPlugin ? await i18nPlugin.service('locales').find() : [{ code: 'de' }, { code: 'en' }];
        const configuredLocales: string[] = localesList.map((l: any) => l.code || l);

        for (const uid of ['api::image.image', 'api::video.video']) {
          const allDocs = await strapi.documents(uid as any).findMany({ locale: '*' });
          const grouped = new Map<string, any[]>();
          for (const doc of allDocs) {
            const list = grouped.get(doc.documentId) || [];
            list.push(doc);
            grouped.set(doc.documentId, list);
          }

          for (const [docId, entries] of grouped.entries()) {
            const presentLocales = new Set(entries.map((e) => e.locale || 'en'));
            const primaryEntry = entries[0];
            for (const requiredLoc of configuredLocales) {
              if (!presentLocales.has(requiredLoc)) {
                try {
                  await strapi.documents(uid as any).update({
                    documentId: docId,
                    locale: requiredLoc,
                    data: {
                      title: primaryEntry.title,
                      slug: primaryEntry.slug,
                      summary: primaryEntry.summary,
                      tags: primaryEntry.tags,
                      visibility: primaryEntry.visibility || 'public',
                      ...(primaryEntry.creator?.id ? { creator: primaryEntry.creator.id } : {}),
                    } as any,
                    status: 'published',
                  });
                  console.log(`[i18n-sync] Backfilled missing locale "${requiredLoc}" for ${uid} (${docId})`);
                } catch (locErr: any) {
                  console.warn(`[i18n-sync] Failed to backfill locale "${requiredLoc}" for ${uid} (${docId}):`, locErr.message);
                }
              }
            }
          }
        }
      } catch (locSyncErr) {
        console.error('[i18n-sync] Media locale sync failed:', locSyncErr);
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
          } catch (e) {
        strapi.log.error('[index.ts] unhandled error', e);
      }
        }, 3000);
      }
    } catch (error) {
      console.error('Error during Strapi bootstrap:', error);
    }
  },
};
