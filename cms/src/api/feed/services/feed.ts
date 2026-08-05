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
  async assembleFeed(userProfileInput?: Partial<InterestProfile> & { locale?: string }) {
    const targetLocale = userProfileInput?.locale || 'de';
    const profile: InterestProfile = {
      interests: { ...DEFAULT_USER_PROFILE.interests, ...(userProfileInput?.interests || {}) },
      contentTypes: { ...DEFAULT_USER_PROFILE.contentTypes, ...(userProfileInput?.contentTypes || {}) },
      activePattern: userProfileInput?.activePattern || DEFAULT_USER_PROFILE.activePattern,
    };

    // 1. Fetch all items across locales (from database or fall back to sample seed items if database empty)
    let items = SAMPLE_SEED_ITEMS;
    try {
      const dbItemsDe = await strapi.documents('api::feed-item.feed-item').findMany({
        populate: ['author'],
        status: 'published',
        locale: 'de',
      });
      const dbItemsEn = await strapi.documents('api::feed-item.feed-item').findMany({
        populate: ['author'],
        status: 'published',
        locale: 'en',
      });
      let dbItems = [...dbItemsDe, ...dbItemsEn];

      if ((userProfileInput as any)?.includeDrafts) {
        const draftDe = await strapi.documents('api::feed-item.feed-item').findMany({
          populate: ['author'],
          status: 'draft',
          locale: 'de',
        });
        const draftEn = await strapi.documents('api::feed-item.feed-item').findMany({
          populate: ['author'],
          status: 'draft',
          locale: 'en',
        });
        dbItems = [...dbItems, ...draftDe, ...draftEn];
      }

      if (dbItems && dbItems.length > 0) {
        items = dbItems as any;
      }
    } catch (err) {
      // Fallback to sample seed items
    }

    // Direct target slug / documentId lookup across all locales and statuses
    const target = (userProfileInput as any)?.targetSlug;
    if (target) {
      const alreadyIn = items.some((i: any) => i.slug === target || i.documentId === target || String(i.id) === target);
      if (!alreadyIn) {
        try {
          const findTarget = async (locale: string, status: 'draft' | 'published') => {
            const matches = await strapi.documents('api::feed-item.feed-item').findMany({
              filters: {
                $or: [{ slug: { $eq: target } }, { documentId: { $eq: target } }],
              },
              locale,
              status,
              populate: ['author'],
            });
            return matches && matches.length > 0 ? matches[0] : null;
          };

          const directMatch =
            (await findTarget('de', 'draft')) ||
            (await findTarget('en', 'draft')) ||
            (await findTarget('de', 'published')) ||
            (await findTarget('en', 'published'));

          if (directMatch) {
            items = [directMatch as any, ...items];
          }
        } catch (e) {}
      }
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

    const ollamaUrl = process.env.OLLAMA_URL || 'http://10.0.0.6:11434/v1/chat/completions';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:latest';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const systemPrompt = `You are the Omni AI Algorithm Optimizer. Your job is to parse natural language user intent and return a JSON object with vector score updates.
Existing Topics: Wissenschaft, Natur, Kochen, Finanzen, PostgreSQL, Strapi, NextJS, Ollama, Funny Cat Videos.
Existing Formats: pdf, video, article, short.
Patterns: discovery, deep_dive.

CRITICAL: Return JSON ONLY in this format:
{
  "response": "Brief German explanation (1 sentence)",
  "vector": {
    "interests": { "Wissenschaft": { "score": 0.99 } },
    "contentTypes": { "pdf": 1.0, "video": 0.4 },
    "activePattern": "deep_dive"
  }
}`;

      const res = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: ollamaModel,
          temperature: 0.2,
          max_tokens: 300,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const rawContent = data.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawContent);

        if (parsed.response) {
          aiExplanation = `🤖 Ollama (${ollamaModel}): ${parsed.response}`;
        }

        if (parsed.vector) {
          if (parsed.vector.interests) {
            Object.keys(parsed.vector.interests).forEach((t) => {
              const item = parsed.vector.interests[t];
              const scoreVal = typeof item === 'number' ? item : item.score;
              if (updatedProfile.interests[t]) {
                updatedProfile.interests[t].score = Math.min(1.0, Math.max(0.0, scoreVal));
                updatedProfile.interests[t].last_interacted = new Date().toISOString();
              } else {
                updatedProfile.interests[t] = { score: scoreVal, last_interacted: new Date().toISOString() };
              }
            });
          }

          if (parsed.vector.contentTypes) {
            Object.keys(parsed.vector.contentTypes).forEach((ct) => {
              updatedProfile.contentTypes[ct] = Math.min(1.0, Math.max(0.0, parsed.vector.contentTypes[ct]));
            });
          }

          if (parsed.vector.activePattern) {
            updatedProfile.activePattern = parsed.vector.activePattern;
          }
        }
        ollamaConnected = true;
      }
    } catch (e) {
      // Ollama offline / public open-source fallback
    }

    // Open-Source Smart Intent Processor fallback if Ollama offline
    if (!ollamaConnected) {
      const lowerPrompt = prompt.toLowerCase();

      const setScore = (topic: string, scoreVal: number) => {
        if (updatedProfile.interests[topic]) {
          updatedProfile.interests[topic].score = scoreVal;
          updatedProfile.interests[topic].last_interacted = new Date().toISOString();
        } else {
          updatedProfile.interests[topic] = { score: scoreVal, last_interacted: new Date().toISOString() };
        }
      };

      if (lowerPrompt.includes('pdf') || lowerPrompt.includes('dokument') || lowerPrompt.includes('wissen') || lowerPrompt.includes('astro')) {
        updatedProfile.contentTypes.pdf = 1.0;
        updatedProfile.contentTypes.video = 0.4;
        setScore('Wissenschaft', 0.99);
        setScore('PostgreSQL', 0.95);
        updatedProfile.activePattern = 'deep_dive';
        aiExplanation = '⚡ Open-Source Intent Engine: "Wissenschaft & PDF Deep Dive" erkannt.';
      } else if (lowerPrompt.includes('kochen') || lowerPrompt.includes('essen') || lowerPrompt.includes('pasta') || lowerPrompt.includes('rezept')) {
        setScore('Kochen', 0.99);
        updatedProfile.contentTypes.video = 1.0;
        updatedProfile.activePattern = 'discovery';
        aiExplanation = '🍳 Open-Source Intent Engine: "Kulinarik & Rezepte" erkannt.';
      } else if (lowerPrompt.includes('cat') || lowerPrompt.includes('katz') || lowerPrompt.includes('humor') || lowerPrompt.includes('tiere') || lowerPrompt.includes('fun')) {
        setScore('Funny Cat Videos', 0.99);
        setScore('Natur', 0.90);
        updatedProfile.contentTypes.short = 1.0;
        updatedProfile.activePattern = 'discovery';
        aiExplanation = '🐱 Open-Source Intent Engine: "Entertainment Mode" erkannt.';
      } else {
        setScore('NextJS', 0.98);
        setScore('Strapi', 0.92);
        updatedProfile.activePattern = 'deep_dive';
        aiExplanation = `⚡ Open-Source Intent Engine: Vektoren für "${prompt}" angepasst.`;
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
