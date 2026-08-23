import { Core } from '@strapi/strapi';
import { logError } from '../../../lib/log-error';

export default ({ strapi }: { strapi: Core.Strapi }) => ({


  async seedDemoData(force = false) {
    /**
     * Demo account password, read from the environment rather than written
     * here. The README publishes these credentials deliberately — the problem
     * with a literal in the source is the pattern it teaches, not the secrecy
     * of this particular string. Falls back to a value nobody can log in with
     * so a missing variable cannot quietly create accounts with a known
     * password.
     */
    const demoUserPassword =
      process.env.DEMO_USER_PASSWORD || `disabled-${Math.random().toString(36).slice(2)}`;

    try {
      const existingItems = await strapi.documents('api::feed-item.feed-item').findMany({ locale: '*' });

      const webbCheck = await strapi.documents('api::feed-item.feed-item').findMany({
        filters: { slug: { $in: ['faszination-weltall-james-webb-pdf', 'fascinating-universe-james-webb-pdf'] } },
        locale: '*',
      });

      if (!force && webbCheck && webbCheck.length > 0) {
        return { success: true, message: 'Database already contains bilingual items.', count: existingItems.length };
      }

      if (force) {
        console.log('🧹 Force re-seed requested. Deleting existing Feed Items & Video records...');
        try {
          await strapi.db.query('api::feed-item.feed-item').deleteMany({});
        } catch (e) {
        logError('[seed.ts]', e);
      }
        try {
          await strapi.db.query('api::video.video').deleteMany({});
        } catch (e) {
        logError('[seed.ts]', e);
      }
        try {
          await strapi.db.query('api::image.image').deleteMany({});
        } catch (e) {
        logError('[seed.ts]', e);
      }
        try {
          await strapi.db.query('api::article.article').deleteMany({});
        } catch (e) {
        logError('[seed.ts]', e);
      }
      }

      console.log('🌱 Seeding initial bilingual Feed Items with Dynamic Zone Blocks in Strapi...');

      const authRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' },
      });
      const roleId = authRole?.id || 1;

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
            where: { email: creator.email },
          });
          if (!existingUser) {
            existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
              where: { handle: creator.handle },
            });
          }
          if (!existingUser) {
            existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
              where: { username: creator.username },
            });
          }

          if (existingUser) {
            try {
              await strapi.db.query('plugin::users-permissions.user').update({
                where: { id: existingUser.id },
                data: {
                  handle: creator.handle,
                  avatarUrl: creator.avatarUrl,
                  bio: creator.bio,
                  subscribersCount: creator.subscribersCount,
                },
              });
            } catch (e) {
        logError('[seed.ts]', e);
      }
            return existingUser;
          }

          let created: any = null;
          try {
            created = await strapi.service('plugin::users-permissions.user').add({
              username: creator.username,
              email: creator.email,
              password: demoUserPassword,
              confirmed: true,
              provider: 'local',
              role: roleId,
            });
          } catch (createErr) {
            try {
              created = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { email: creator.email },
              });
              if (!created) {
                created = await strapi.db.query('plugin::users-permissions.user').findOne({
                  where: { username: creator.username },
                });
              }
            } catch (e) {
        logError('[seed.ts]', e);
      }
          }

          if (created && created.id) {
            try {
              await strapi.db.query('plugin::users-permissions.user').update({
                where: { id: created.id },
                data: {
                  handle: creator.handle,
                  avatarUrl: creator.avatarUrl,
                  bio: creator.bio,
                  subscribersCount: creator.subscribersCount,
                },
              });
            } catch (e) {
        logError('[seed.ts]', e);
      }
          }
          return created;
        } catch (e) {
          return null;
        }
      };

      const fs = require('fs');
      const path = require('path');

      // Load Creators dynamically from seed_creators.json fixture
      const seedCreatorsPath = path.join(__dirname, '../../../src/data/seed_creators.json');
      const seedCreatorsAltPath = path.join(process.cwd(), 'src/data/seed_creators.json');
      const targetCreatorsPath = fs.existsSync(seedCreatorsPath)
        ? seedCreatorsPath
        : fs.existsSync(seedCreatorsAltPath)
        ? seedCreatorsAltPath
        : null;

      const creators: Record<string, any> = {};
      if (targetCreatorsPath) {
        try {
          const creatorList = JSON.parse(fs.readFileSync(targetCreatorsPath, 'utf8'));
          for (const c of creatorList) {
            creators[c.handle] = await getOrCreateCreator(c);
          }
        } catch (e) {
          console.error('Error loading seed_creators.json:', e);
        }
      }

      const createVideoRecord = async (videoData: {
        title: string;
        slug: string;
        duration: number;
        thumbnailUrl: string;
        mp4Url: string;
        creator: any;
        tags_de?: string[];
        tags_en?: string[];
        tags?: string[];
      }) => {
        try {
          const createdEn = await strapi.documents('api::video.video').create({
            data: {
              title: videoData.title,
              slug: videoData.slug,
              duration: videoData.duration,
              isProcessing: false,
              isForSale: false,
              price: 0,
              mp4Url: videoData.mp4Url,
              thumbnailUrl: videoData.thumbnailUrl,
              creator: videoData.creator?.documentId || videoData.creator?.id,
              visibility: 'public',
              tags: videoData.tags_en || videoData.tags || ['Video'],
            } as any,
            locale: 'en',
            status: 'published',
          });

          if (createdEn?.documentId) {
            try {
              await strapi.documents('api::video.video').update({
                documentId: createdEn.documentId,
                locale: 'de',
                status: 'published',
                data: {
                  title: videoData.title,
                  slug: videoData.slug,
                  duration: videoData.duration,
                  isProcessing: false,
                  isForSale: false,
                  price: 0,
                  mp4Url: videoData.mp4Url,
                  thumbnailUrl: videoData.thumbnailUrl,
                  creator: videoData.creator?.documentId || videoData.creator?.id,
                  visibility: 'public',
                  tags: videoData.tags_de || videoData.tags || ['Video'],
                } as any,
              });
            } catch (e) {
        logError('[seed.ts]', e);
      }
          }
          return createdEn;
        } catch (e) {
          return null;
        }
      };

      // Load & Seed the official test video entries from seed_videos.json
      const seedVideosPath = path.join(__dirname, '../../../src/data/seed_videos.json');
      const seedVideosAltPath = path.join(process.cwd(), 'src/data/seed_videos.json');
      const targetFixturePath = fs.existsSync(seedVideosPath) ? seedVideosPath : (fs.existsSync(seedVideosAltPath) ? seedVideosAltPath : null);

      if (targetFixturePath) {
        try {
          const videoFixture = JSON.parse(fs.readFileSync(targetFixturePath, 'utf8'));
          console.log(`🎬 Seeding ${videoFixture.length} official test videos from seed_videos.json...`);
          const creatorsMap: Record<string, any> = creators;
          for (const item of videoFixture) {
            const creatorObj = creatorsMap[item.creatorHandle] || creators.astro;
            const authorId = creatorObj?.documentId || creatorObj?.id || 1;

            const existingVid = await strapi.documents('api::video.video').findMany({
              filters: { slug: { $eq: item.slug } },
              locale: '*',
            });

            if (!existingVid || existingVid.length === 0) {
              const videoData = {
                title: item.title_de || item.title_en,
                slug: item.slug,
                summary: [
                  {
                    type: 'paragraph',
                    children: [
                      {
                        type: 'text',
                        text: String(item.summary_de || item.summary_en || '').trim(),
                      },
                    ],
                  },
                ],
                viewsCount: item.viewsCount || 0,
                likesCount: item.likesCount || 0,
                mp4Url: item.mp4Url,
                hlsUrl: item.hlsUrl,
                thumbnailUrl: item.thumbnailUrl,
                ogImageUrl: item.ogImageUrl,
                isProcessing: false,
                isForSale: false,
                price: 0,
                creator: authorId,
                visibility: 'public',
                duration: item.duration || 30,
              };

              const createdEn = await strapi.documents('api::video.video').create({
                data: {
                  ...videoData,
                  tags: item.tags_en || item.tags || ['Video'],
                } as any,
                locale: 'en',
                status: 'published',
              });

              if (createdEn?.documentId) {
                try {
                  await strapi.documents('api::video.video').update({
                    documentId: createdEn.documentId,
                    locale: 'de',
                    data: {
                      ...videoData,
                      title: item.title_de || item.title_en,
                      summary: [
                        {
                          type: 'paragraph',
                          children: [
                            {
                              type: 'text',
                              text: String(item.summary_de || item.summary_en || '').trim(),
                            },
                          ],
                        },
                      ],
                      tags: item.tags_de || item.tags || ['Video'],
                    } as any,
                    status: 'published',
                  });
                } catch (e) {
        logError('[seed.ts]', e);
      }
              }
            }
          }
        } catch (fixtureErr) {
          console.error('Error seeding 110 test videos from fixture:', fixtureErr);
        }
      }

      /*
       * Images, same idea as the videos above.
       *
       * The fixture holds what content-fill derived — bilingual title, summary
       * and tags — so a re-seed restores the catalogue without another hour of
       * vision analysis. The WebP files themselves live under /root/media and
       * are not touched by any of this; only the database rows are recreated.
       */
      const seedImagesPath = path.join(__dirname, '../../../src/data/seed_images.json');
      const seedImagesAltPath = path.join(process.cwd(), 'src/data/seed_images.json');
      const imagesFixturePath = fs.existsSync(seedImagesPath)
        ? seedImagesPath
        : (fs.existsSync(seedImagesAltPath) ? seedImagesAltPath : null);

      if (imagesFixturePath) {
        try {
          const imageFixture = JSON.parse(fs.readFileSync(imagesFixturePath, 'utf8'));
          console.log(`🖼️ Seeding ${imageFixture.length} test images from seed_images.json...`);
          const creatorsMap: Record<string, any> = creators;

          for (const item of imageFixture) {
            const creatorObj = creatorsMap[item.creatorHandle] || creators.astro;
            const authorId = creatorObj?.documentId || creatorObj?.id || 1;

            const existingImg = await strapi.documents('api::image.image').findMany({
              filters: { slug: { $eq: item.slug } },
              locale: '*',
              omniInternal: true,
            } as any);
            if (existingImg && existingImg.length > 0) continue;

            const imageData: any = {
              title: item.title_en || item.title_de,
              slug: item.slug,
              summary: item.summary_en || item.summary_de,
              content: item.summary_en || item.summary_de,
              imageUrl: item.imageUrl || `/media/images/${item.slug}.webp`,
              thumbnailUrl: item.thumbnailUrl || `/media/images/thumbnails/${item.slug}_thumb.webp`,
              viewsCount: item.viewsCount || 0,
              likesCount: item.likesCount || 0,
              commentsCount: 0,
              isProcessing: false,
              creator: authorId,
              visibility: 'public',
            };

            try {
              const createdEn = await strapi.documents('api::image.image').create({
                data: { ...imageData, tags: item.tags_en || item.tags || ['Bild'] } as any,
                locale: 'en',
                status: 'published',
              });

              if (createdEn?.documentId) {
                await strapi.documents('api::image.image').update({
                  documentId: createdEn.documentId,
                  locale: 'de',
                  data: {
                    ...imageData,
                    title: item.title_de || item.title_en,
                    summary: item.summary_de || item.summary_en,
                    content: item.summary_de || item.summary_en,
                    tags: item.tags_de || item.tags || ['Bild'],
                  } as any,
                  status: 'published',
                });
              }
            } catch (e) {
              strapi.log.error(`[seed.ts] image "${item.slug}" failed`, e);
            }
          }
          console.log('✅ Image seed completed.');
        } catch (fixtureErr) {
          console.error('Error seeding images from fixture:', fixtureErr);
        }
      }

      /*
       * Articles, after the videos and images they embed.
       *
       * Their blocks reference media by *slug*, not by documentId: a re-seed
       * hands out new documentIds, so an id stored in the fixture would point
       * at nothing the next morning. The slug is stable, and is resolved to
       * whatever id the media carries right now.
       */
      const seedArticlesPath = path.join(__dirname, '../../../src/data/seed_articles.json');
      const seedArticlesAltPath = path.join(process.cwd(), 'src/data/seed_articles.json');
      const articlesFixturePath = fs.existsSync(seedArticlesPath)
        ? seedArticlesPath
        : (fs.existsSync(seedArticlesAltPath) ? seedArticlesAltPath : null);

      if (articlesFixturePath) {
        try {
          const articleFixture = JSON.parse(fs.readFileSync(articlesFixturePath, 'utf8'));
          console.log(`📝 Seeding ${articleFixture.length} articles from seed_articles.json...`);
          const creatorsMap: Record<string, any> = creators;

          const resolveMedia = async (uid: any, slug: string) => {
            if (!slug) return null;
            const rows = await strapi.documents(uid).findMany({
              filters: { slug: { $eq: slug } },
              locale: 'en',
              omniInternal: true,
            } as any);
            return rows?.[0]?.documentId || null;
          };

          const buildBlocks = async (blocks: any[]) => {
            const out: any[] = [];
            for (const b of blocks || []) {
              if (b.__component === 'shared.image') {
                const id = await resolveMedia('api::image.image', b.imageSlug);
                // A block whose media is gone is dropped rather than written
                // with a null relation, which renders as an empty gap.
                if (id) out.push({ __component: 'shared.image', image: id, caption: b.caption });
              } else if (b.__component === 'shared.video') {
                const id = await resolveMedia('api::video.video', b.videoSlug);
                if (id) out.push({ __component: 'shared.video', video: id, caption: b.caption });
              } else {
                out.push({ ...b });
              }
            }
            return out;
          };

          for (const item of articleFixture) {
            const creatorObj = creatorsMap[item.creatorHandle] || creators.astro;
            const authorId = creatorObj?.documentId || creatorObj?.id || 1;

            const existing = await strapi.documents('api::article.article').findMany({
              filters: { slug: { $eq: item.slug } },
              locale: '*',
              omniInternal: true,
            } as any);
            if (existing && existing.length > 0) continue;

            const asBlocks = (text: string) => [
              { type: 'paragraph', children: [{ type: 'text', text: String(text || '').trim() }] },
            ];

            const base: any = {
              slug: item.slug,
              thumbnail: item.thumbnail,
              creator: authorId,
              visibility: 'public',
              viewsCount: 0,
              likesCount: 0,
              commentsCount: 0,
            };

            try {
              const createdEn = await strapi.documents('api::article.article').create({
                data: {
                  ...base,
                  title: item.title_en || item.title_de,
                  summary: asBlocks(item.summary_en || item.summary_de),
                  tags: item.tags_en || ['Artikel'],
                  blocks: await buildBlocks(item.blocks_en || []),
                } as any,
                locale: 'en',
                status: 'published',
              });

              if (createdEn?.documentId) {
                await strapi.documents('api::article.article').update({
                  documentId: createdEn.documentId,
                  locale: 'de',
                  data: {
                    ...base,
                    title: item.title_de || item.title_en,
                    summary: asBlocks(item.summary_de || item.summary_en),
                    tags: item.tags_de || ['Artikel'],
                    blocks: await buildBlocks(item.blocks_de || []),
                  } as any,
                  status: 'published',
                });
              }
            } catch (e) {
              strapi.log.error(`[seed.ts] article "${item.slug}" failed`, e);
            }
          }
          console.log('✅ Article seed completed.');
        } catch (fixtureErr) {
          console.error('Error seeding articles from fixture:', fixtureErr);
        }
      }

      /* Counted, not calculated. The line below used to print
         `seedItems.length * 2` whatever happened, so a night where half the
         items failed still reported full success — which is how a seed error
         went unnoticed. */
      let seededItems = 0;

      const seedItems = [
        {
          creator: creators.astro,
          de: {
            title: 'Faszination Weltall: Die Geheimnisse des James-Webb-Teleskops (PDF)',
            slug: 'faszination-weltall-james-webb-pdf',
            summary: 'Atemberaubende Aufnahmen und wissenschaftliche Analysen der ältesten Galaxien unseres Universums.',
            content: 'Das James-Webb-Weltraumteleskop revolutioniert unser Verständnis der Astrophysik...',
            tags: ['Wissenschaft', 'Astronomie', 'PDF Doku', 'Weltall'],
            blocks: [
              {
                __component: 'shared.headline',
                title: 'Erforschung der ersten Galaxien im Universum',
                level: 'h2',
              },
              {
                __component: 'shared.pdf',
                title: 'Vollständiger Forschungsbericht James Webb (PDF)',
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                downloadable: true,
              },
              {
                __component: 'shared.rich-text',
                body: 'Mit seinem 6.5 Meter großen Hauptspiegel blickt das James-Webb-Teleskop tiefer in die Vergangenheit des Kosmos als jedes Instrument zuvor.',
              },
            ],
          },
          en: {
            title: 'Fascinating Universe: Secrets of the James Webb Telescope (PDF)',
            slug: 'fascinating-universe-james-webb-pdf',
            summary: 'Breathtaking imagery and scientific analysis of the oldest galaxies in our universe.',
            content: 'The James Webb Space Telescope is revolutionizing our understanding of astrophysics...',
            tags: ['Science', 'Astronomy', 'PDF Doc', 'Space'],
            blocks: [
              {
                __component: 'shared.headline',
                title: 'Exploring the First Galaxies in the Universe',
                level: 'h2',
              },
              {
                __component: 'shared.pdf',
                title: 'Full James Webb Research Report (PDF)',
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                downloadable: true,
              },
              {
                __component: 'shared.rich-text',
                body: 'With its 6.5-meter primary mirror, the James Webb Space Telescope peers deeper into cosmic history than ever before.',
              },
            ],
          },
          mediaType: 'pdf',
          thumbnailUrl: '/demo-media/photo-1451187580459-43490279c0fa.jpg',
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
            blocks: [
              {
                __component: 'shared.headline',
                title: 'High-Performance Vektorsuche in relationalen Datenbanken',
                level: 'h2',
              },
              {
                __component: 'shared.rich-text',
                body: 'PostgreSQL bietet mit JSONB-Feldern und GIN-Indizes eine extrem performante Möglichkeit, Nutzer-Interessensvektoren direkt in SQL abzufragen.',
              },
            ],
          },
          en: {
            title: 'PostgreSQL 15 & GIN Indexes for Hyper-Personalized Feeds',
            slug: 'postgres-15-gin-indexes-hyper-personalized-feeds',
            summary: 'Developer Tutorial: Querying high-performance JSONB vectors for real-time algorithms.',
            content: 'Step-by-step guide to optimizing vector scores in PostgreSQL...',
            tags: ['PostgreSQL', 'Programming', 'Database', 'Tech'],
            blocks: [
              {
                __component: 'shared.headline',
                title: 'High-Performance Vector Search in Relational Databases',
                level: 'h2',
              },
              {
                __component: 'shared.rich-text',
                body: 'PostgreSQL provides JSONB fields and GIN indexes for querying user interest vectors in SQL at sub-millisecond speeds.',
              },
            ],
          },
          mediaType: 'article',
          thumbnailUrl: '/demo-media/photo-1544383835-bda2bc66a55d.jpg',
          viewsCount: 18900,
          likesCount: 2300,
          publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
      ];


      for (const item of seedItems) {
        const authorId = item.creator?.documentId || item.creator?.id;

        try {
          const createdEn = await strapi.documents('api::feed-item.feed-item').create({
            data: {
              ...item.en,
              mediaType: item.mediaType,
              thumbnailUrl: item.thumbnailUrl,
              viewsCount: item.viewsCount,
              likesCount: item.likesCount,
              publishedAt: item.publishedAt,
              author: authorId,
              visibility: 'public',
            } as any,
            locale: 'en',
            status: 'published',
          });

          if (createdEn?.documentId) {
            seededItems += 1;
            try {
              await strapi.documents('api::feed-item.feed-item').update({
                documentId: createdEn.documentId,
                locale: 'de',
                data: {
                  ...item.de,
                  mediaType: item.mediaType,
                  thumbnailUrl: item.thumbnailUrl,
                  viewsCount: item.viewsCount,
                  likesCount: item.likesCount,
                  publishedAt: item.publishedAt,
                  author: authorId,
                  visibility: 'public',
                } as any,
                status: 'published',
              });
            } catch (deErr) {
        logError('[seed.ts]', deErr);
      }
          }
        } catch (itemErr: any) {
        logError(`[seed.ts] feed item "${item?.en?.slug || 'unknown'}"`, itemErr);
      }
      }

      if (seededItems === seedItems.length) {
        console.log(`✅ Seed completed: ${seededItems} of ${seedItems.length} feed items created (both locales).`);
      } else {
        console.warn(
          `⚠️ Seed completed with failures: ${seededItems} of ${seedItems.length} feed items created. See the errors above.`
        );
      }
      return { success: true, count: seedItems.length * 2 };
    } catch (err: any) {
      console.error('Error in seedDemoData:', err);
      return { success: false, error: err.message };
    }
  },
});
