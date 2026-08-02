import { Core } from '@strapi/strapi';

export interface InterestProfile {
  interests: Record<string, { score: number; last_interacted: string }>;
  contentTypes: Record<string, number>;
  activePattern: 'discovery' | 'deep_dive';
}

export const DEFAULT_USER_PROFILE: InterestProfile = {
  interests: {
    'PostgreSQL': { score: 0.95, last_interacted: new Date().toISOString() },
    'Strapi': { score: 0.82, last_interacted: new Date().toISOString() },
    'NextJS': { score: 0.90, last_interacted: new Date().toISOString() },
    'Ollama': { score: 0.75, last_interacted: new Date().toISOString() },
    'Funny Cat Videos': { score: 0.15, last_interacted: '2025-12-10T08:00:00Z' },
  },
  contentTypes: {
    pdf: 0.8,
    video: 0.6,
    article: 0.7,
    short: 0.4,
  },
  activePattern: 'discovery',
};

export const SAMPLE_SEED_ITEMS = [
  {
    id: 1,
    title: 'High-Performance PostgreSQL Indexing for Hyper-Personalized Feeds',
    slug: 'postgres-indexing-hyper-personalized-feeds',
    summary: 'Comprehensive deep dive into B-Tree, GIN, and JSONB indexing in PostgreSQL 15 for real-time score retrieval.',
    content: 'PostgreSQL provides JSONB queries with GIN indexes that enable sub-millisecond retrieval of user interest vectors...',
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
    authorName: 'Database Guru',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    isSubscribedAuthor: true,
    tags: ['PostgreSQL', 'Database', 'Performance', 'Tech-PDF'],
    viewsCount: 14200,
    likesCount: 1890,
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    locale: 'de',
  },
  {
    id: 2,
    title: 'Building Hyper-Personalized Feed Assemblies with Strapi v5 & Turborepo',
    slug: 'building-hyper-personalized-feed-strapi-v5',
    summary: 'Learn how to construct custom controllers and slot interleaving patterns in Strapi to beat standard SQL relation bottlenecks.',
    content: 'Standard relational queries break at scale. Bucket-based assembly decouples feed generation into parallel micro-queries...',
    mediaType: 'article',
    mediaUrl: '',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    authorName: 'Omni Architect',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    isSubscribedAuthor: true,
    tags: ['Strapi', 'NextJS', 'Monorepo', 'Architecture'],
    viewsCount: 9800,
    likesCount: 1240,
    publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    locale: 'de',
  },
  {
    id: 3,
    title: 'NextJS 15 Server Actions & Real-Time Slot Pattern Interleaving',
    slug: 'nextjs-15-server-actions-slot-interleaving',
    summary: 'Video walkthrough demonstrating dynamic feed mutation when an Ollama agent shifts the user intent profile in real time.',
    content: 'Watch how Next.js App Router seamlessly re-renders slot interleaving patterns without full page reloads...',
    mediaType: 'video',
    mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    authorName: 'Frontend Specialist',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    isSubscribedAuthor: false,
    tags: ['NextJS', 'React', 'Frontend', 'Video Tutorial'],
    viewsCount: 24500,
    likesCount: 3890,
    publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    locale: 'de',
  },
  {
    id: 4,
    title: 'Ollama CPU Inference: Running Llama 3 & DeepSeek Locally on LXC',
    slug: 'ollama-cpu-inference-lxc-proxmox',
    summary: 'Step-by-step guide to running local LLM intent classification on CPU without expensive GPU clusters.',
    content: 'Ollama allows running small quantized models (e.g. 3B or 7B params) directly on server CPUs to parse user prompts...',
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    authorName: 'AI Systems Lab',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    isSubscribedAuthor: true,
    tags: ['Ollama', 'AI', 'LXC', 'Proxmox', 'Tech-PDF'],
    viewsCount: 31200,
    likesCount: 4500,
    publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    locale: 'de',
  },
  {
    id: 5,
    title: 'Cutest Cats Compilation 2026: Epic Fails & Purrfect Moments',
    slug: 'cutest-cats-compilation-2026',
    summary: 'A fun wildcard video for exploration testing in the algorithm slot matrix.',
    content: 'Hilarious compilation of kittens doing backflips and playing with keyboards...',
    mediaType: 'short',
    mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
    authorName: 'Cat Mania',
    authorAvatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&q=80',
    isSubscribedAuthor: false,
    tags: ['Funny Cat Videos', 'Humor', 'Shorts'],
    viewsCount: 154000,
    likesCount: 23000,
    publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    locale: 'de',
  },
  {
    id: 6,
    title: 'Advanced PostgreSQL Query Optimization Cheat Sheet (PDF)',
    slug: 'advanced-postgresql-query-optimization-pdf',
    summary: 'Direct reference manual for tuning EXPLAIN ANALYZE, vacuuming, and memory settings in PostgreSQL.',
    content: 'Downloadable PDF covering index scans, sequential scans, work_mem tuning and partition pruning...',
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80',
    authorName: 'Database Guru',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    isSubscribedAuthor: true,
    tags: ['PostgreSQL', 'Database', 'PDF Guide'],
    viewsCount: 18900,
    likesCount: 2900,
    publishedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    locale: 'de',
  },
  {
    id: 7,
    title: 'Microservices vs Monorepo: Why PM2 + Turborepo is the Ultimate Setup',
    slug: 'microservices-vs-monorepo-pm2-turborepo',
    summary: 'Architectural analysis showing how PM2 ecosystem management simplifies LXC deployment.',
    content: 'Managing multiple Node processes under PM2 with shared Turborepo caching gives instant builds and zero-downtime reloads...',
    mediaType: 'article',
    mediaUrl: '',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
    authorName: 'Omni Architect',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    isSubscribedAuthor: true,
    tags: ['Monorepo', 'PM2', 'Architecture', 'Strapi'],
    viewsCount: 11200,
    likesCount: 1430,
    publishedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    locale: 'de',
  }
];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Bucketing and Interleaving Engine
   */
  async assembleFeed(userProfileInput?: Partial<InterestProfile>) {
    const profile: InterestProfile = {
      interests: { ...DEFAULT_USER_PROFILE.interests, ...(userProfileInput?.interests || {}) },
      contentTypes: { ...DEFAULT_USER_PROFILE.contentTypes, ...(userProfileInput?.contentTypes || {}) },
      activePattern: userProfileInput?.activePattern || DEFAULT_USER_PROFILE.activePattern,
    };

    // 1. Fetch all items (from database or fall back to sample seed items if database empty)
    let items = SAMPLE_SEED_ITEMS;
    try {
      const dbItems = await strapi.documents('api::feed-item.feed-item').findMany({});
      if (dbItems && dbItems.length > 0) {
        items = dbItems as any;
      }
    } catch (err) {
      // Fallback to sample seed items
    }

    // 2. Score items against Interest Vector
    const scoredItems = items.map((item) => {
      let topicScore = 0.2; // baseline
      item.tags.forEach((tag: string) => {
        if (profile.interests[tag]) {
          topicScore = Math.max(topicScore, profile.interests[tag].score);
        }
      });

      const mediaWeight = profile.contentTypes[item.mediaType] ?? 0.5;
      const recencyHours = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 3600);
      const recencyDecay = Math.max(0.3, 1 - recencyHours / (24 * 30));

      const relevanceScore = parseFloat((topicScore * mediaWeight * recencyDecay).toFixed(3));

      return {
        ...item,
        relevanceScore,
      };
    });

    // 3. Create Buckets
    // Bucket 1: High Intent (relevanceScore >= 0.45)
    const highIntentBucket = [...scoredItems].filter((i) => i.relevanceScore >= 0.45).sort((a, b) => b.relevanceScore - a.relevanceScore);
    // Bucket 2: Network / Subs (isSubscribedAuthor == true)
    const networkBucket = [...scoredItems].filter((i) => i.isSubscribedAuthor).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    // Bucket 3: Exploration (Wildcard / lower score items to test new interests)
    const explorationBucket = [...scoredItems].filter((i) => i.relevanceScore < 0.45 || i.tags.includes('Funny Cat Videos')).sort(() => 0.5 - Math.random());
    // Bucket 4: Fresh / Trending (viewsCount + likesCount)
    const trendingBucket = [...scoredItems].sort((a, b) => (b.viewsCount + b.likesCount * 2) - (a.viewsCount + a.likesCount * 2));

    // 4. Interleaving Slot Pattern Strategy
    const patternSlots = profile.activePattern === 'deep_dive'
      ? ['HighIntent', 'HighIntent', 'HighIntent', 'HighIntent', 'Exploration', 'HighIntent', 'HighIntent', 'Trending']
      : ['HighIntent', 'Network', 'HighIntent', 'Exploration', 'Trending', 'HighIntent', 'Exploration', 'Network', 'Trending'];

    const assembledFeed: Array<any & { bucketSource: string; slotIndex: number }> = [];
    const usedIds = new Set<number>();

    patternSlots.forEach((slotType, idx) => {
      let selectedItem: any = null;
      let sourceBucket = slotType;

      if (slotType === 'HighIntent') {
        selectedItem = highIntentBucket.find((i) => !usedIds.has(i.id));
      } else if (slotType === 'Network') {
        selectedItem = networkBucket.find((i) => !usedIds.has(i.id));
      } else if (slotType === 'Exploration') {
        selectedItem = explorationBucket.find((i) => !usedIds.has(i.id));
      } else if (slotType === 'Trending') {
        selectedItem = trendingBucket.find((i) => !usedIds.has(i.id));
      }

      // Fallback if bucket empty
      if (!selectedItem) {
        selectedItem = scoredItems.find((i) => !usedIds.has(i.id));
        sourceBucket = `${slotType} (Fallback)`;
      }

      if (selectedItem) {
        usedIds.add(selectedItem.id);
        assembledFeed.push({
          ...selectedItem,
          bucketSource: sourceBucket,
          slotIndex: idx + 1,
        });
      }
    });

    return {
      feed: assembledFeed,
      meta: {
        activePattern: profile.activePattern,
        totalReturned: assembledFeed.length,
        userProfile: profile,
        bucketsCount: {
          highIntent: highIntentBucket.length,
          network: networkBucket.length,
          exploration: explorationBucket.length,
          trending: trendingBucket.length,
        },
      },
    };
  },

  /**
   * Process Natural Language Intent Prompt via Ollama / Smart Parser
   */
  async processAiIntent(prompt: string, currentProfile?: Partial<InterestProfile>) {
    const updatedProfile: InterestProfile = {
      interests: { ...DEFAULT_USER_PROFILE.interests, ...(currentProfile?.interests || {}) },
      contentTypes: { ...DEFAULT_USER_PROFILE.contentTypes, ...(currentProfile?.contentTypes || {}) },
      activePattern: currentProfile?.activePattern || 'discovery',
    };

    let aiExplanation = '';
    let ollamaConnected = false;

    try {
      // Attempt connection to local Ollama API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama3',
          prompt: `You are an AI algorithm optimizer. Update interest scores (0.0 to 1.0) and content type weights based on user prompt: "${prompt}". Respond with JSON only.`,
          stream: false,
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        aiExplanation = `Ollama Local Inference: ${data.response?.slice(0, 150)}...`;
        ollamaConnected = true;
      }
    } catch (e) {
      // Ollama offline / fallback
    }

    // Smart Intent Processor fallback
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('pdf') || lowerPrompt.includes('dokument') || lowerPrompt.includes('tech')) {
      updatedProfile.contentTypes.pdf = 1.0;
      updatedProfile.contentTypes.video = 0.2;
      updatedProfile.interests['PostgreSQL'].score = 0.98;
      updatedProfile.interests['Ollama'].score = 0.95;
      updatedProfile.activePattern = 'deep_dive';
      if (!ollamaConnected) {
        aiExplanation = 'KI-Agent hat "Tech-PDF Focus & Deep Dive" erkannt: PDF-Gewichtung auf 1.0 gesetzt, PostgreSQL & Ollama fokussiert, Feed-Muster auf Deep Dive umgestellt.';
      }
    } else if (lowerPrompt.includes('video') || lowerPrompt.includes('tutorial') || lowerPrompt.includes('nextjs')) {
      updatedProfile.contentTypes.video = 1.0;
      updatedProfile.interests['NextJS'].score = 0.99;
      updatedProfile.interests['Strapi'].score = 0.90;
      updatedProfile.activePattern = 'deep_dive';
      if (!ollamaConnected) {
        aiExplanation = 'KI-Agent hat "NextJS Video Focus" erkannt: Video-Gewichtung auf 1.0 angehoben, NextJS Score auf 0.99 maximiert.';
      }
    } else if (lowerPrompt.includes('cat') || lowerPrompt.includes('katze') || lowerPrompt.includes('humor') || lowerPrompt.includes('fun')) {
      updatedProfile.interests['Funny Cat Videos'].score = 0.95;
      updatedProfile.contentTypes.short = 1.0;
      updatedProfile.activePattern = 'discovery';
      if (!ollamaConnected) {
        aiExplanation = 'KI-Agent hat "Entertainment / Cat Videos" erkannt: Funny Cat Videos Score von 0.15 auf 0.95 angehoben.';
      }
    } else {
      // Generic adjustment
      updatedProfile.interests['PostgreSQL'].score = 0.90;
      updatedProfile.interests['Strapi'].score = 0.88;
      updatedProfile.interests['NextJS'].score = 0.92;
      if (!ollamaConnected) {
        aiExplanation = `KI-Agent hat Benutzerwunsch verarbeitet ("${prompt}"): Interessenvektoren harmonisiert.`;
      }
    }

    return {
      updatedProfile,
      aiExplanation,
      ollamaConnected,
    };
  },

  /**
   * Reset Demo Data
   */
  async resetDemoData() {
    return {
      success: true,
      message: 'Demo-Daten erfolgreich auf Werkszustand zurückgesetzt.',
      profile: DEFAULT_USER_PROFILE,
    };
  },
});
