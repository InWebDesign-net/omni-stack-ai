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
      // 1. Seed bilingual Feed Items & Blocks in Strapi
      await strapi.service('api::feed.feed').seedDemoData(true);

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

      if (publicRole) {
        await enablePermission(publicRole.id, 'api::comment.comment.find');
        await enablePermission(publicRole.id, 'api::comment.comment.findOne');
        await enablePermission(publicRole.id, 'api::comment.comment.create');
      }

      if (authRole) {
        await enablePermission(authRole.id, 'api::comment.comment.find');
        await enablePermission(authRole.id, 'api::comment.comment.findOne');
        await enablePermission(authRole.id, 'api::comment.comment.create');
        await enablePermission(authRole.id, 'api::comment.comment.update');
        await enablePermission(authRole.id, 'api::comment.comment.delete');
      }
    } catch (error) {
      console.error('Error during Strapi bootstrap:', error);
    }
  },
};
