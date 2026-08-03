import type { Core } from '@strapi/strapi';

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      // Check if feed items already exist in database
      const existingItems = await strapi.documents('api::feed-item.feed-item').findMany({});
      if (!existingItems || existingItems.length === 0) {
        console.log('🌱 Seeding initial published Feed Items in Strapi...');

        const seedItems = [
          {
            title: 'Faszination Weltall: Die Geheimnisse des James-Webb-Teleskops (PDF)',
            slug: 'faszination-weltall-james-webb-pdf',
            summary: 'Atemberaubende Aufnahmen und wissenschaftliche Analysen der ältesten Galaxien unseres Universums.',
            content: 'Das James-Webb-Weltraumteleskop revolutioniert unser Verständnis der Astrophysik. Dieser PDF-Report analysiert die spektralen Daten der ersten Galaxien...',
            mediaType: 'pdf',
            mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
            authorName: 'Astro-Wissen Magazin',
            authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
            isSubscribedAuthor: true,
            tags: ['Wissenschaft', 'Astronomie', 'PDF Doku', 'Weltall'],
            viewsCount: 48200,
            likesCount: 5900,
            publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            status: 'published',
            locale: 'de',
          },
          {
            title: 'PostgreSQL 15 & GIN-Indizes für Hyper-Personalized Feeds',
            slug: 'postgres-15-gin-indizes-hyper-personalized-feeds',
            summary: 'Entwickler-Tutorial: Wie man High-Performance JSONB Vektoren für Echtzeit-Algorithmen abfragt.',
            content: 'Schritt-für-Schritt Anleitung zur Optimierung von Vektor-Scores in PostgreSQL...',
            mediaType: 'article',
            mediaUrl: '',
            thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
            authorName: 'Database Guru',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
            isSubscribedAuthor: true,
            tags: ['PostgreSQL', 'Programmierung', 'Database', 'Tech'],
            viewsCount: 18900,
            likesCount: 2300,
            publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            status: 'published',
            locale: 'de',
          },
          {
            title: 'Kochen wie der Chefkoch: Italienische Pastasoßen von Grund auf',
            slug: 'kochen-wie-der-chefkoch-italienische-pasta',
            summary: 'Das Geheimnis hinter der perfekten Carbonara und Cacio e Pepe in 15 Minuten.',
            content: 'In diesem Video-Tutorial zeigt Küchenmeister Marco, wie mit nur 4 Zutaten unvergessliche Pasta entsteht...',
            mediaType: 'video',
            mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80',
            authorName: 'Culinary Masterclass',
            authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
            isSubscribedAuthor: false,
            tags: ['Kochen', 'Rezepte', 'Kulinarik', 'Video Tutorial'],
            viewsCount: 92400,
            likesCount: 14200,
            publishedAt: new Date(Date.now() - 3600000 * 10).toISOString(),
            status: 'published',
            locale: 'de',
          },
          {
            title: 'Natur & Artenvielfalt: Die faszinierende Welt der Wildbienen',
            slug: 'natur-artenvielfalt-wildbienen-doku',
            summary: 'Ein Dokumentarfilm über den Schutz unserer heimischen Insekten und Ökosysteme.',
            content: 'Entdecke die überraschenden Fähigkeiten von Wildbienen und wie jeder von uns auf dem Balkon helfen kann...',
            mediaType: 'video',
            mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80',
            authorName: 'Green Planet Doku',
            authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
            isSubscribedAuthor: true,
            tags: ['Natur', 'Umwelt', 'Dokumentation', 'Tiere'],
            viewsCount: 65100,
            likesCount: 8900,
            publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
            status: 'published',
            locale: 'de',
          },
          {
            title: 'NextJS 15 & Strapi v5 Monorepo Architektur im Detail',
            slug: 'nextjs-15-strapi-v5-monorepo-architektur',
            summary: 'Best Practices für skalierbare Webprojekte mit Turborepo und PM2 Prozessmanagement.',
            content: 'Vollständiger Leitfaden zum Aufbau von moderne Webanwendungen mit modularer Architektur...',
            mediaType: 'pdf',
            mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
            authorName: 'Omni Architect',
            authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
            isSubscribedAuthor: true,
            tags: ['NextJS', 'Strapi', 'Programmierung', 'Monorepo'],
            viewsCount: 34100,
            likesCount: 4200,
            publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            status: 'published',
            locale: 'de',
          },
          {
            title: 'Süße Katzenwelpen & Ihre Lustigsten Momente 2026',
            slug: 'suesse-katzenwelpen-lustige-momente',
            summary: 'Lachen garantiert: Die niedlichsten Katzen beim Spielen und Toben im Familienalltag.',
            content: 'Eine herzerwärmende Zusammenstellung für die ganze Familie...',
            mediaType: 'short',
            mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
            authorName: 'Familie & Tiere',
            authorAvatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&q=80',
            isSubscribedAuthor: false,
            tags: ['Funny Cat Videos', 'Humor', 'Familie', 'Tiere'],
            viewsCount: 230000,
            likesCount: 35000,
            publishedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
            status: 'published',
            locale: 'de',
          },
          {
            title: 'Finanzwissen kompakt: ETF-Sparpläne für Einsteiger erklärt',
            slug: 'finanzwissen-kompakt-etf-sparplaene-einsteiger',
            summary: 'Verständliche Einführung in den Vermögensaufbau, Zinseszins und Risikostreuung.',
            content: 'Erfahre, wie ETFs funktionieren und wie du deinen eigenen Sparplan in wenigen Schritten aufsetzt...',
            mediaType: 'article',
            mediaUrl: '',
            thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80',
            authorName: 'FinanzKompass',
            authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
            isSubscribedAuthor: true,
            tags: ['Finanzen', 'Wirtschaft', 'Ratgeber', 'Einsteiger'],
            viewsCount: 52000,
            likesCount: 6800,
            publishedAt: new Date(Date.now() - 3600000 * 36).toISOString(),
            status: 'published',
            locale: 'de',
          }
        ];

        for (const item of seedItems) {
          await strapi.documents('api::feed-item.feed-item').create({
            data: item,
            status: 'published',
          });
        }
        console.log(`✅ ${seedItems.length} published Feed Items created in Strapi!`);
      }
    } catch (err) {
      console.error('Error during Strapi bootstrap seed:', err);
    }
  },
};
