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

      if (publicRole) {
        await enablePermission(publicRole.id, 'api::comment.comment.find');
        await enablePermission(publicRole.id, 'api::comment.comment.findOne');
        await enablePermission(publicRole.id, 'api::comment.comment.create');
        for (const action of publicFeedActions) {
          await enablePermission(publicRole.id, action);
        }
      }

      if (authRole) {
        await enablePermission(authRole.id, 'api::comment.comment.find');
        await enablePermission(authRole.id, 'api::comment.comment.findOne');
        await enablePermission(authRole.id, 'api::comment.comment.create');
        await enablePermission(authRole.id, 'api::comment.comment.update');
        await enablePermission(authRole.id, 'api::comment.comment.delete');
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
      const workerSecret = process.env.INGEST_WORKER_SECRET || 'omni_ingest_worker_secret_2026';
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
    } catch (error) {
      console.error('Error during Strapi bootstrap:', error);
    }
  },
};
