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
      const authRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' },
      });
      const roleId = authRole?.id || 1;

      // Helper function to seed or get creator users with channel handles
      const getOrCreateCreator = async (creator: {
        username: string;
        handle: string;
        email: string;
        avatarUrl: string;
        bio: string;
        subscribersCount: number;
      }) => {
        try {
          let existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: { handle: creator.handle },
          });

          if (!existingUser) {
            existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
              where: { email: creator.email },
            });
          }

          if (existingUser) {
            await strapi.db.query('plugin::users-permissions.user').update({
              where: { id: existingUser.id },
              data: {
                handle: creator.handle,
                avatarUrl: creator.avatarUrl,
                bio: creator.bio,
                subscribersCount: creator.subscribersCount,
              },
            });
            return existingUser;
          }

          const created = await strapi.service('plugin::users-permissions.user').add({
            username: creator.username,
            email: creator.email,
            password: 'DemoUser2026!',
            confirmed: true,
            provider: 'local',
            role: roleId,
          });

          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: created.id },
            data: {
              handle: creator.handle,
              avatarUrl: creator.avatarUrl,
              bio: creator.bio,
              subscribersCount: creator.subscribersCount,
            },
          });
          return created;
        } catch (e) {
          console.error(`Error creating creator ${creator.handle}:`, e);
          return null;
        }
      };

      // Define Creators
      const creators = {
        astro: await getOrCreateCreator({
          username: 'Astro-Wissen Magazin',
          handle: 'astro',
          email: 'astro@inwebdesign.net',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
          bio: 'Faszination Astronomie, Astrophysik & Weltraum-Dokumentationen.',
          subscribersCount: 14800,
        }),
        demotech: await getOrCreateCreator({
          username: 'Database Guru',
          handle: 'demotech',
          email: 'demotech@inwebdesign.net',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
          bio: 'High-Performance Databases, PostgreSQL Indizes, Vector Search & Code Architecture.',
          subscribersCount: 28900,
        }),
        demogourmet: await getOrCreateCreator({
          username: 'Culinary Masterclass',
          handle: 'demogourmet',
          email: 'demogourmet@inwebdesign.net',
          avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
          bio: 'Italienische Küche, feine Rezepte & Kulinarik-Tutorials aus Leidenschaft.',
          subscribersCount: 54100,
        }),
        greenplanet: await getOrCreateCreator({
          username: 'Green Planet Doku',
          handle: 'greenplanet',
          email: 'greenplanet@inwebdesign.net',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
          bio: 'Naturdokumentationen, Artenvielfalt, Artenschutz & Ökosysteme.',
          subscribersCount: 31200,
        }),
        omniarchitect: await getOrCreateCreator({
          username: 'Omni Architect',
          handle: 'omniarchitect',
          email: 'omniarchitect@inwebdesign.net',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
          bio: 'NextJS 15, Strapi v5, Monorepo Turborepo Architecture & Microservices.',
          subscribersCount: 42000,
        }),
        catmania: await getOrCreateCreator({
          username: 'Familie & Tiere',
          handle: 'catmania',
          email: 'catmania@inwebdesign.net',
          avatarUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&q=80',
          bio: 'Lustige Tier-Shorts, Katzenwelpen & Unterhaltung für die ganze Familie.',
          subscribersCount: 189000,
        }),
        finanzkompass: await getOrCreateCreator({
          username: 'FinanzKompass',
          handle: 'finanzkompass',
          email: 'finanzkompass@inwebdesign.net',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
          bio: 'Finanzwissen, ETF-Sparpläne, Vermögensaufbau & Zinseszins für Einsteiger.',
          subscribersCount: 27500,
        }),
      };

      // 1. Seed initial Feed Items if database is empty
      const existingItems = await strapi.documents('api::feed-item.feed-item').findMany({});
      if (!existingItems || existingItems.length === 0) {
        console.log('🌱 Seeding initial published Feed Items in Strapi linked to Creator channels...');

        const seedItems = [
          {
            creator: creators.astro,
            de: {
              title: 'Faszination Weltall: Die Geheimnisse des James-Webb-Teleskops (PDF)',
              slug: 'faszination-weltall-james-webb-pdf',
              summary: 'Atemberaubende Aufnahmen und wissenschaftliche Analysen der ältesten Galaxien unseres Universums.',
              content: 'Das James-Webb-Weltraumteleskop revolutioniert unser Verständnis der Astrophysik...',
              tags: ['Wissenschaft', 'Astronomie', 'PDF Doku', 'Weltall'],
            },
            en: {
              title: 'Fascinating Universe: Secrets of the James Webb Telescope (PDF)',
              slug: 'fascinating-universe-james-webb-pdf',
              summary: 'Breathtaking imagery and scientific analysis of the oldest galaxies in our universe.',
              content: 'The James Webb Space Telescope is revolutionizing our understanding of astrophysics...',
              tags: ['Science', 'Astronomy', 'PDF Doc', 'Space'],
            },
            mediaType: 'pdf',
            mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
            viewsCount: 48200,
            likesCount: 5900,
            publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            creator: creators.demotech,
            de: {
              title: 'PostgreSQL 15 & GIN-Indizes für Hyper-Personalized Feeds',
              slug: 'postgres-15-gin-indizes-hyper-personalized-feeds',
              summary: 'Entwickler-Tutorial: Wie man High-Performance JSONB Vektoren für Echtzeit-Algorithmen abfragt.',
              content: 'Schritt-für-Schritt Anleitung zur Optimierung von Vektor-Scores in PostgreSQL...',
              tags: ['PostgreSQL', 'Programmierung', 'Database', 'Tech'],
            },
            en: {
              title: 'PostgreSQL 15 & GIN Indexes for Hyper-Personalized Feeds',
              slug: 'postgres-15-gin-indexes-hyper-personalized-feeds',
              summary: 'Developer Tutorial: Querying high-performance JSONB vectors for real-time algorithms.',
              content: 'Step-by-step guide to optimizing vector scores in PostgreSQL...',
              tags: ['PostgreSQL', 'Programming', 'Database', 'Tech'],
            },
            mediaType: 'article',
            mediaUrl: '',
            thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
            viewsCount: 18900,
            likesCount: 2300,
            publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
          {
            creator: creators.demogourmet,
            de: {
              title: 'Kochen wie der Chefkoch: Italienische Pastasoßen von Grund auf',
              slug: 'kochen-wie-der-chefkoch-italienische-pasta',
              summary: 'Das Geheimnis hinter der perfekten Carbonara und Cacio e Pepe in 15 Minuten.',
              content: 'In diesem Video-Tutorial zeigt Küchenmeister Marco, wie mit nur 4 Zutaten unvergessliche Pasta entsteht...',
              tags: ['Kochen', 'Rezepte', 'Kulinarik', 'Video Tutorial'],
            },
            en: {
              title: 'Cook Like a Chef: Italian Pasta Sauces From Scratch',
              slug: 'cook-like-a-chef-italian-pasta-sauces',
              summary: 'The secret behind the perfect Carbonara and Cacio e Pepe in 15 minutes.',
              content: 'In this video tutorial, master chef Marco shows how to craft unforgettable pasta...',
              tags: ['Cooking', 'Recipes', 'Culinary', 'Video Tutorial'],
            },
            mediaType: 'video',
            mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80',
            viewsCount: 92400,
            likesCount: 14200,
            publishedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
          },
          {
            creator: creators.greenplanet,
            de: {
              title: 'Natur & Artenvielfalt: Die faszinierende Welt der Wildbienen',
              slug: 'natur-artenvielfalt-wildbienen-doku',
              summary: 'Ein Dokumentarfilm über den Schutz unserer heimischen Insekten und Ökosysteme.',
              content: 'Entdecke die überraschenden Fähigkeiten von Wildbienen...',
              tags: ['Natur', 'Umwelt', 'Dokumentation', 'Tiere'],
            },
            en: {
              title: 'Nature & Biodiversity: The Fascinating World of Wild Bees',
              slug: 'nature-biodiversity-wild-bees-doc',
              summary: 'A documentary on protecting native insects and local ecosystems.',
              content: 'Discover the surprising capabilities of wild bees...',
              tags: ['Nature', 'Environment', 'Documentary', 'Animals'],
            },
            mediaType: 'video',
            mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80',
            viewsCount: 65100,
            likesCount: 8900,
            publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
          },
          {
            creator: creators.omniarchitect,
            de: {
              title: 'NextJS 15 & Strapi v5 Monorepo Architektur im Detail',
              slug: 'nextjs-15-strapi-v5-monorepo-architektur',
              summary: 'Best Practices für skalierbare Webprojekte mit Turborepo und PM2 Prozessmanagement.',
              content: 'Vollständiger Leitfaden zum Aufbau von modernen Webanwendungen...',
              tags: ['NextJS', 'Strapi', 'Programmierung', 'Monorepo'],
            },
            en: {
              title: 'NextJS 15 & Strapi v5 Monorepo Architecture in Detail',
              slug: 'nextjs-15-strapi-v5-monorepo-architecture',
              summary: 'Best practices for scalable web applications with Turborepo and PM2 process management.',
              content: 'Complete guide to constructing modern web applications...',
              tags: ['NextJS', 'Strapi', 'Programming', 'Monorepo'],
            },
            mediaType: 'pdf',
            mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
            viewsCount: 34100,
            likesCount: 4200,
            publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          },
          {
            creator: creators.catmania,
            de: {
              title: 'Süße Katzenwelpen & Ihre Lustigsten Momente 2026',
              slug: 'suesse-katzenwelpen-lustige-momente',
              summary: 'Lachen garantiert: Die niedlichsten Katzen beim Spielen und Toben im Familienalltag.',
              content: 'Eine herzerwärmende Zusammenstellung für die ganze Familie...',
              tags: ['Funny Cat Videos', 'Humor', 'Familie', 'Tiere'],
            },
            en: {
              title: 'Cute Kittens & Their Funniest Moments 2026',
              slug: 'cute-kittens-funniest-moments-2026',
              summary: 'Guaranteed laughs: The cutest cats playing and jumping in everyday family life.',
              content: 'A heartwarming compilation for the entire family...',
              tags: ['Funny Cat Videos', 'Humor', 'Family', 'Animals'],
            },
            mediaType: 'short',
            mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
            viewsCount: 230000,
            likesCount: 35000,
            publishedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
          },
          {
            creator: creators.finanzkompass,
            de: {
              title: 'Finanzwissen kompakt: ETF-Sparpläne für Einsteiger erklärt',
              slug: 'finanzwissen-kompakt-etf-sparplaene-einsteiger',
              summary: 'Verständliche Einführung in den Vermögensaufbau, Zinseszins und Risikostreuung.',
              content: 'Erfahre, wie ETFs funktionieren und wie du deinen eigenen Sparplan aufsetzt...',
              tags: ['Finanzen', 'Wirtschaft', 'Ratgeber', 'Einsteiger'],
            },
            en: {
              title: 'Compact Finance: ETF Savings Plans for Beginners Explained',
              slug: 'compact-finance-etf-savings-plans-beginners',
              summary: 'Understandable introduction to wealth building, compound interest, and risk diversification.',
              content: 'Learn how ETFs work and how to set up your personal savings plan...',
              tags: ['Finance', 'Economy', 'Guide', 'Beginner'],
            },
            mediaType: 'article',
            mediaUrl: '',
            thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
            viewsCount: 52000,
            likesCount: 6800,
            publishedAt: new Date(Date.now() - 3600000 * 36).toISOString(),
          }
        ];

        for (const item of seedItems) {
          const authorId = item.creator?.documentId || item.creator?.id;

          const createdDe = await strapi.documents('api::feed-item.feed-item').create({
            data: {
              ...item.de,
              mediaType: item.mediaType,
              mediaUrl: item.mediaUrl,
              thumbnailUrl: item.thumbnailUrl,
              viewsCount: item.viewsCount,
              likesCount: item.likesCount,
              publishedAt: item.publishedAt,
              author: authorId,
            },
            locale: 'de',
            status: 'published',
          });

          await strapi.documents('api::feed-item.feed-item').create({
            documentId: createdDe.documentId,
            data: {
              ...item.en,
              mediaType: item.mediaType,
              mediaUrl: item.mediaUrl,
              thumbnailUrl: item.thumbnailUrl,
              viewsCount: item.viewsCount,
              likesCount: item.likesCount,
              publishedAt: item.publishedAt,
              author: authorId,
            },
            locale: 'en',
            status: 'published',
          });
        }
        console.log(`✅ ${seedItems.length * 2} bilingual Feed Items linked to creator channels seeded!`);
      }

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
      const commentActions = [
        'api::comment.comment.find',
        'api::comment.comment.findOne',
        'api::comment.comment.create',
        'api::comment.comment.update',
        'api::comment.comment.delete',
      ];

      for (const roleObj of [publicRole, authRole]) {
        if (!roleObj) continue;
        for (const action of commentActions) {
          const existingPerm = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: { action, role: roleObj.id },
          });
          if (!existingPerm) {
            await strapi.db.query('plugin::users-permissions.permission').create({
              data: { action, role: roleObj.id },
            });
          }
        }
      }

      // 4. Seed initial Comments if none exist
      const existingComments = await strapi.documents('api::comment.comment').findMany({});
      if (!existingComments || existingComments.length === 0) {
        console.log('💬 Seeding initial Comments in Strapi...');
        const initialComments = [
          {
            feedSlug: 'faszination-weltall-james-webb-pdf',
            authorName: 'AstroFan99',
            authorHandle: '@astrofan99',
            authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
            text: 'Unglaubliche Auflösung! Besonders Seite 4 mit den Spektralanalysen hat mich fasziniert.',
            isEdited: false,
          },
          {
            feedSlug: 'faszination-weltall-james-webb-pdf',
            authorName: 'Dr. Evelyn Carter',
            authorHandle: '@evelyn_c',
            authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
            text: 'Sehr fundierte Zusammenfassung. Das PDF eignet sich perfekt für Vorlesungen.',
            isEdited: false,
          },
          {
            feedSlug: 'postgres-15-gin-indizes-hyper-personalized-feeds',
            authorName: 'DevJonas',
            authorHandle: '@jonas_dev',
            authorAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&q=80',
            text: 'Der GIN-Index Benchmark auf JSONB ist der Wahnsinn! Konnte meine Response Times um 60% senken.',
            isEdited: false,
          },
          {
            feedSlug: 'kochen-wie-der-chefkoch-italienische-pasta',
            authorName: 'Maria Rossi',
            authorHandle: '@maria_cooks',
            authorAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&q=80',
            text: 'Endlich mal jemand der erklärt, warum Echtes Nudelwasser mit Stärke so wichtig für die Emulsion ist!',
            isEdited: false,
          },
          {
            feedSlug: 'short-postgresql-16-hacks',
            authorName: 'CodeCraft',
            authorHandle: '@codecraft',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
            text: 'EXPLAIN ANALYZE rettet jeden Freitag-Release! 🔥',
            isEdited: false,
          },
          {
            feedSlug: 'short-tiefsee-geheimnisse',
            authorName: 'OceanExplorer',
            authorHandle: '@oceanic',
            authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
            text: 'Schwarze Raucher sind wie fremde Welten mitten auf der Erde. Toller Short!',
            isEdited: false,
          },
          {
            feedSlug: 'short-creamy-carbonara',
            authorName: 'Nico Gourmet',
            authorHandle: '@nico_food',
            authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
            text: 'Keine Sahne in die Carbonara! Ehrenmann 💪🏼',
            isEdited: false,
          },
          {
            feedSlug: 'suesse-katzenwelpen-lustige-momente',
            authorName: 'Mia & Felix',
            authorHandle: '@mia_cat',
            authorAvatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&q=80',
            text: 'Wie niedlich bei Min 0:22! Wir haben vor Lachen geweint 😻',
            isEdited: false,
          }
        ];

        for (const c of initialComments) {
          await strapi.documents('api::comment.comment').create({
            data: c,
            status: 'published',
          });
        }
        console.log(`✅ ${initialComments.length} Comments seeded successfully!`);
      }

      // 5. Configure Editor Role Admin Permissions (Role ID 2 / strapi-editor)
      const editorRoleObj = await strapi.db.query('admin::role').findOne({
        where: { code: 'strapi-editor' },
      });

      if (editorRoleObj) {
        console.log('🛡️ Configuring Editor Role Admin permissions for Preview Environment...');
        const editorRoleId = editorRoleObj.id;

        // Reset existing permissions for Editor role to ensure clean state
        await strapi.db.query('admin::permission').deleteMany({ where: { role: editorRoleId } });

        const getFields = (subject: string) => {
          const model = (strapi as any).contentTypes[subject];
          if (!model || !model.attributes) return [];
          return Object.keys(model.attributes).filter(
            (f) => f !== 'password' && f !== 'resetPasswordToken' && f !== 'confirmationToken'
          );
        };

        // Content Manager full permissions for website content
        const fullAccessSubjects = [
          'api::feed-item.feed-item',
          'api::video.video',
          'api::comment.comment',
          'api::user-profile.user-profile',
          'api::feed.feed',
          'api::tracking.tracking',
        ];
        const contentActions = [
          'plugin::content-manager.explorer.create',
          'plugin::content-manager.explorer.read',
          'plugin::content-manager.explorer.update',
          'plugin::content-manager.explorer.delete',
          'plugin::content-manager.explorer.publish',
        ];

        for (const subject of fullAccessSubjects) {
          if (!(strapi as any).contentTypes[subject]) continue;
          const fields = getFields(subject);
          for (const action of contentActions) {
            await strapi.db.query('admin::permission').create({
              data: {
                role: editorRoleId,
                action,
                subject,
                properties: { fields },
                conditions: [],
              },
            });
          }
        }

        // Read-Only permission for plugin::users-permissions.user (can view users, cannot edit or delete users)
        if ((strapi as any).contentTypes['plugin::users-permissions.user']) {
          const userFields = getFields('plugin::users-permissions.user');
          await strapi.db.query('admin::permission').create({
            data: {
              role: editorRoleId,
              action: 'plugin::content-manager.explorer.read',
              subject: 'plugin::users-permissions.user',
              properties: { fields: userFields },
              conditions: [],
            },
          });
        }

        // Ensure Media Library (upload plugin) access
        const uploadActions = [
          'plugin::upload.read',
          'plugin::upload.assets.create',
          'plugin::upload.assets.update',
          'plugin::upload.assets.download',
          'plugin::upload.assets.copy-link',
        ];
        for (const action of uploadActions) {
          await strapi.db.query('admin::permission').create({
            data: {
              role: editorRoleId,
              action,
              properties: {},
              conditions: [],
            },
          });
        }
      }
    } catch (err) {
      console.error('❌ Strapi Bootstrap Error:', err);
    }
  },
};
