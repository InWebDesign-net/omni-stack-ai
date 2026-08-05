export interface FeedItemAuthor {
  id?: number;
  username: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  subscribersCount?: number;
}

export interface FeedItem {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  mediaType: 'video' | 'pdf' | 'article' | 'short';
  mediaUrl: string;
  thumbnailUrl: string;
  authorName?: string;
  authorAvatar?: string;
  isSubscribedAuthor?: boolean;
  tags: string[];
  viewsCount: number;
  likesCount: number;
  publishedAt: string;
  relevanceScore: number;
  bucketSource?: string;
  slotIndex?: number;
  author?: FeedItemAuthor;
}

export const FALLBACK_FEED_ITEMS: FeedItem[] = [
  // ─── SHORTS ──────────────────────────────────────────────────────────────
  {
    id: 101,
    title: 'Short: PostgreSQL 16 Performance Hacks in 30 Seconds',
    slug: 'short-postgresql-16-hacks',
    summary: 'Ultra-fast database optimization tips for Next.js and Strapi developers.',
    content: 'Optimizing PostgreSQL query plans with partial indexes and EXPLAIN ANALYZE.',
    mediaType: 'short',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-vertical-shot-of-a-person-typing-on-a-laptop-42931-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    tags: ['Tech', 'PostgreSQL', 'NextJS'],
    viewsCount: 48200,
    likesCount: 3410,
    publishedAt: '2026-08-01T10:00:00Z',
    relevanceScore: 0.98,
    bucketSource: 'Trending Shorts',
    slotIndex: 1,
    author: {
      id: 1,
      username: 'Database Guru',
      handle: '@demotech',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      bio: 'PostgreSQL, Strapi & Next.js Stack Architect.',
      subscribersCount: 24300,
    },
  },
  {
    id: 102,
    title: 'Short: Das Geheimnis der tiefen Tiefsee & Schwarze Raucher',
    slug: 'short-tiefsee-geheimnisse',
    summary: 'Spannende 45 Sekunden über extremophile Organismen am Ozeanboden.',
    content: 'Wie Leben ohne Sonnenlicht in 4000 Meter Tiefe entsteht.',
    mediaType: 'short',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-underwater-shot-of-a-coral-reef-and-fish-41584-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',
    tags: ['Natur', 'Wissenschaft'],
    viewsCount: 62100,
    likesCount: 5200,
    publishedAt: '2026-08-02T14:30:00Z',
    relevanceScore: 0.95,
    bucketSource: 'Nature Shorts',
    slotIndex: 2,
    author: {
      id: 2,
      username: 'Astro-Wissen',
      handle: '@astro',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      bio: 'Wissenschafts-Dokumentationen & Astronomie.',
      subscribersCount: 41200,
    },
  },
  {
    id: 103,
    title: 'Short: Perfekte Creamy Carbonara ohne Sahne',
    slug: 'short-creamy-carbonara',
    summary: 'Römisches Originalrezept in 40 Sekunden erklärt.',
    content: 'Guanciale, Eigelb, Pecorino und frischer Pfeffer – keine Sahne nötig!',
    mediaType: 'short',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-chef-cooking-food-in-a-pan-43093-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80',
    tags: ['Kochen', 'Rezepte'],
    viewsCount: 89400,
    likesCount: 7890,
    publishedAt: '2026-08-03T18:15:00Z',
    relevanceScore: 0.92,
    bucketSource: 'Gourmet Shorts',
    slotIndex: 3,
    author: {
      id: 3,
      username: 'Demo Gourmet',
      handle: '@demogourmet',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&q=80',
      bio: 'Kulinarische Inspiration & schnelle Rezepte.',
      subscribersCount: 18900,
    },
  },
  {
    id: 104,
    title: 'Short: Katzen-Reaktion auf Roboter-Staubsauger',
    slug: 'short-cat-vs-robot',
    summary: 'Lustiger 20 Sekunden Clip von Kater Bruno auf Erkundungstour.',
    content: 'Katze Bruno testet die Navigations-Sensoren des neuen Saugroboters.',
    mediaType: 'short',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-funny-cat-playing-with-a-toy-42938-large.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
    tags: ['Funny Cat Videos', 'Entertainment'],
    viewsCount: 124500,
    likesCount: 15400,
    publishedAt: '2026-08-04T09:00:00Z',
    relevanceScore: 0.99,
    bucketSource: 'Viral Shorts',
    slotIndex: 4,
    author: {
      id: 4,
      username: 'Cat Mania',
      handle: '@catmania',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      bio: 'Tiere, Katzen & lustige Alltagsmomente.',
      subscribersCount: 95000,
    },
  },

  // ─── PDF DOKUMENTE ────────────────────────────────────────────────────────
  {
    id: 1,
    title: 'High-Performance PostgreSQL Indexing for Hyper-Personalized Feeds (PDF)',
    slug: 'postgres-indexing-hyper-personalized-feeds',
    summary: 'Umfassender PDF-Forschungsbericht über B-Tree, GIN & JSONB Indizierung in PostgreSQL 16 für Echtzeit-Score-Retrieval.',
    content: `PostgreSQL bietet mit JSONB-Abfragen und GIN-Indizes eine extrem schnelle Methode, um Benutzer-Interessenvektoren in Sub-Millisekunden abzurufen.

### Inhaltsverzeichnis des Dokuments:
1. **Vergleich von B-Tree vs GIN-Indizes** bei hochfrequenten Lesezugriffen.
2. **Partial Indexing Strategies:** Wie man nur aktive Benutzervektoren im RAM hält.
3. **EXPLAIN ANALYZE Benchmarks:** Vor- und Nachteile von pgvector für Embeddings.
4. **Praxisbeispiel:** SQL-Queries für Slot Interleaving in Strapi 5.`,
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
    tags: ['PostgreSQL', 'Database', 'Performance', 'Wissenschaft'],
    viewsCount: 14200,
    likesCount: 1890,
    publishedAt: '2026-07-28T10:00:00Z',
    relevanceScore: 0.98,
    bucketSource: 'Science Papers',
    slotIndex: 1,
    author: {
      id: 1,
      username: 'Database Guru',
      handle: '@demotech',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      bio: 'PostgreSQL, Strapi & Next.js Stack Architect.',
      subscribersCount: 24300,
    },
  },
  {
    id: 202,
    title: 'Dokumentation: James-Webb-Weltraumteleskop – Faszination Weltall (PDF)',
    slug: 'faszination-weltall-james-webb-pdf',
    summary: 'PDF-Forschungsbericht & Dokumentation über Galaxienbildung 300 Millionen Jahre nach dem Urknall.',
    content: `Das James-Webb-Teleskop (JWST) hat spektakuläre Daten über die ersten Galaxien geliefert. In diesem Bericht werden die spektroskopischen Messungen von NIRSpec und MIRI zusammengefasst.

### Wichtigste Erkenntnisse:
- Galaxien im frühen Universum wuchsen deutlich schneller als bisher von kosmologischen Modellen vorhergesagt.
- Hohe Anteile schwerer Elemente deuten auf eine sehr frühe erste Generation von Supermassereichen Sternen hin.`,
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
    tags: ['Wissenschaft', 'Astronomie', 'Dokumentation'],
    viewsCount: 31200,
    likesCount: 2840,
    publishedAt: '2026-07-30T15:45:00Z',
    relevanceScore: 0.94,
    bucketSource: 'Science Papers',
    slotIndex: 2,
    author: {
      id: 2,
      username: 'Astro-Wissen',
      handle: '@astro',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      bio: 'Wissenschafts-Dokumentationen & Astronomie.',
      subscribersCount: 41200,
    },
  },
  {
    id: 4,
    title: 'Ollama CPU Inference: Running Llama 3 & DeepSeek Locally on LXC (PDF)',
    slug: 'ollama-cpu-inference-lxc-proxmox',
    summary: 'Step-by-step PDF guide to running local LLM intent classification on CPU without expensive GPU clusters.',
    content: `Ollama ermöglicht das Ausführen kleiner quantisierter Modelle (z.B. 3B oder 7B Parameter) direkt auf Server-CPUs.

### PDF Guide Highlights:
- **Konfiguration:** Optimales Thread-Tuning für Proxmox LXC Container.
- **Latenz-Messungen:** Antwortzeiten im Vergleich zwischen Llama 3.1 und DeepSeek.
- **REST-API Anbindung:** Integration in Strapi 5 und Next.js App Router.`,
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    tags: ['Ollama', 'AI', 'LXC', 'Proxmox', 'Wissenschaft'],
    viewsCount: 31200,
    likesCount: 4500,
    publishedAt: '2026-08-01T14:00:00Z',
    relevanceScore: 0.95,
    bucketSource: 'AI Research',
    slotIndex: 3,
    author: {
      id: 1,
      username: 'Database Guru',
      handle: '@demotech',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      bio: 'PostgreSQL, Strapi & Next.js Stack Architect.',
      subscribersCount: 24300,
    },
  },
  {
    id: 6,
    title: 'Advanced PostgreSQL Query Optimization Cheat Sheet (PDF)',
    slug: 'advanced-postgresql-query-optimization-pdf',
    summary: 'Direktes Nachschlagewerk zur Optimierung von EXPLAIN ANALYZE, Vacuuming und Memory-Settings.',
    content: 'Kompaktes PDF-Handbuch für Entwickler zur Vermeidung von Sequential Scans und zur Nutzung von Parallel Query Execution.',
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
    tags: ['PostgreSQL', 'Database', 'Tech'],
    viewsCount: 18900,
    likesCount: 2900,
    publishedAt: '2026-08-02T09:00:00Z',
    relevanceScore: 0.91,
    bucketSource: 'Cheat Sheets',
    slotIndex: 4,
    author: {
      id: 1,
      username: 'Database Guru',
      handle: '@demotech',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      bio: 'PostgreSQL, Strapi & Next.js Stack Architect.',
      subscribersCount: 24300,
    },
  },

  // ─── ARTIKEL ─────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'Building Hyper-Personalized Feed Assemblies with Strapi v5 & Turborepo',
    slug: 'building-hyper-personalized-feed-strapi-v5',
    summary: 'Ausführlicher Fachartikel zur Architektur von Slot-Interleaving-Pattern und benutzerdefinierten Strapi 5 Controllern.',
    content: `Standardmäßige relationale SQL-Abfragen stoßen bei hochfrequenten Feeds schnell an ihre Leistungsgrenzen. Mit einem Bucket-basierten Assembling-Ansatz entkoppeln wir die Feed-Generierung in parallele Mikro-Abfragen.

### Die Architektur im Detail:
1. **Bucket 1 (High Intent):** Ermittlung der Themenvektoren des Benutzers.
2. **Bucket 2 (Network):** Neueste Beiträge von abonnierten Autoren.
3. **Bucket 3 (Exploration):** Wildcard-Inhalte zur Erkundung neuer Interessen.
4. **Bucket 4 (Trending):** Aktuell am meisten interagierte Beiträge.

Durch diesen Slot-Interleaving-Mechanismus erhält jeder Nutzer ein maßgeschneidertes Medienerlebnis.`,
    mediaType: 'article',
    mediaUrl: '',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    tags: ['Strapi', 'NextJS', 'Architecture', 'Tech'],
    viewsCount: 9800,
    likesCount: 1240,
    publishedAt: '2026-07-29T11:00:00Z',
    relevanceScore: 0.93,
    bucketSource: 'Tech Articles',
    slotIndex: 1,
    author: {
      id: 1,
      username: 'Omni Architect',
      handle: '@omniarchitect',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      bio: 'Enterprise Monorepo & CMS Architect.',
      subscribersCount: 31000,
    },
  },
  {
    id: 203,
    title: 'Meisterkurs: Italienische Nudelherstellung von Grund auf',
    slug: 'meisterkurs-italienische-pasta',
    summary: 'Artikel & Schritt-für-Schritt Anleitung für perfekten Pasta-Teig mit Semola rimacinata.',
    content: `Der Schlüssel zu perfekter hausgemachter Pasta liegt im richtigen Mehl-Eigelb-Verhältnis. 

### Zutaten:
- 300g Semola di grano duro rimacinata
- 3 frische Eigelb + 1 Vollei
- 1 EL kaltgepresstes Olivenöl

### Zubereitung:
1. Mehl auf der Arbeitsfläche anhäufen und eine Mulde formen.
2. Eier hineingeben und mit der Gabel von innen nach außen verquirlen.
3. Teig mindestens 10 Minuten kräftig kneten, bis eine samtige Oberfläche entsteht.
4. In Frischhaltefolie gewickelt 30 Minuten im Kühlschrank ruhen lassen.`,
    mediaType: 'article',
    mediaUrl: '',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80',
    tags: ['Kochen', 'Rezepte'],
    viewsCount: 15400,
    likesCount: 1420,
    publishedAt: '2026-08-01T11:20:00Z',
    relevanceScore: 0.89,
    bucketSource: 'Culinary Masterclass',
    slotIndex: 2,
    author: {
      id: 3,
      username: 'Demo Gourmet',
      handle: '@demogourmet',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&q=80',
      bio: 'Kulinarische Inspiration & schnelle Rezepte.',
      subscribersCount: 18900,
    },
  },
  {
    id: 7,
    title: 'Microservices vs Monorepo: Why PM2 + Turborepo is the Ultimate Setup',
    slug: 'microservices-vs-monorepo-pm2-turborepo',
    summary: 'Architekturanalyse über die Vorteile von PM2 Ecosystem Management auf LXC Linux Servern.',
    content: 'Das Verwalten mehrerer Node.js Prozesse unter PM2 mit gemeinsamem Turborepo Caching sorgt für schnelle Builds und Zero-Downtime Reloads.',
    mediaType: 'article',
    mediaUrl: '',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    tags: ['Monorepo', 'PM2', 'Architecture', 'Tech'],
    viewsCount: 11200,
    likesCount: 1430,
    publishedAt: '2026-08-02T16:00:00Z',
    relevanceScore: 0.90,
    bucketSource: 'DevOps Articles',
    slotIndex: 3,
    author: {
      id: 1,
      username: 'Omni Architect',
      handle: '@omniarchitect',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      bio: 'Enterprise Monorepo & CMS Architect.',
      subscribersCount: 31000,
    },
  },

  // ─── VIDEOS ───────────────────────────────────────────────────────────────
  {
    id: 201,
    title: 'Die Zukunft von Strapi 5 & Next.js 16 App Router Stack Architecture (Video)',
    slug: 'zukunft-strapi-5-nextjs-16',
    summary: 'Ausführliche Video-Architekturanalyse für moderne KI-gestützte Content-Plattformen mit PostgreSQL und Ollama Vector Search.',
    content: `In dieser umfassenden Video-Dokumentation analysieren wir die Integration von Strapi 5 Headless CMS mit dem Next.js 16 App Router. 

### Hauptthemen im Video:
1. **Server Components & Caching Strategies:** Optimierte Datenbeschaffung über Custom Controllers.
2. **PostgreSQL Vector Extensions (pgvector):** Speicherung von Embedding-Vektoren für semantische Inhalts-Empfehlungen.
3. **Ollama Integration:** Lokale LLM-Verarbeitung ohne externe API-Latenzen oder Drittanbieter-Kosten.
4. **PM2 Production Management:** Zuverlässiger 24/7-Betrieb von Next.js und Strapi auf Linux-Servern.`,
    mediaType: 'video',
    mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
    tags: ['Tech', 'Strapi', 'NextJS', 'PostgreSQL'],
    viewsCount: 18400,
    likesCount: 1250,
    publishedAt: '2026-07-28T12:00:00Z',
    relevanceScore: 0.97,
    bucketSource: 'Tech Videos',
    slotIndex: 1,
    author: {
      id: 1,
      username: 'Database Guru',
      handle: '@demotech',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      bio: 'PostgreSQL, Strapi & Next.js Stack Architect.',
      subscribersCount: 24300,
    },
  },
  {
    id: 3,
    title: 'NextJS 15 Server Actions & Real-Time Slot Pattern Interleaving (Video)',
    slug: 'nextjs-15-server-actions-slot-interleaving',
    summary: 'Video-Tutorial zur dynamischen Feed-Mutation beim Wechsel des Benutzer-Profilvektors.',
    content: 'Erfahre in diesem Video, wie der Next.js App Router Slot-Interleaving Muster ohne kompletten Seiten-Reload neu rendert.',
    mediaType: 'video',
    mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    tags: ['NextJS', 'React', 'Frontend', 'Tech'],
    viewsCount: 24500,
    likesCount: 3890,
    publishedAt: '2026-07-30T14:00:00Z',
    relevanceScore: 0.96,
    bucketSource: 'Video Tutorials',
    slotIndex: 2,
    author: {
      id: 1,
      username: 'Database Guru',
      handle: '@demotech',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      bio: 'PostgreSQL, Strapi & Next.js Stack Architect.',
      subscribersCount: 24300,
    },
  },
];

export function getAuthorName(item: FeedItem): string {
  return item.author?.username || item.authorName || 'Omni Creator';
}

export function getAuthorHandle(item: FeedItem): string {
  if (item.author?.handle) {
    const h = item.author.handle.trim();
    return h.startsWith('@') ? h : `@${h}`;
  }
  const fallback = (getAuthorName(item)).toLowerCase().replace(/[^a-z0-9]/g, '');
  return `@${fallback || 'creator'}`;
}

export function getAuthorAvatar(item: FeedItem): string {
  return item.author?.avatarUrl || item.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
}
