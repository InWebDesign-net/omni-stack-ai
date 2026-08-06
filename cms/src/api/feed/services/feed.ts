import { Core } from '@strapi/strapi';

const dailyViewsSet = new Set<string>();
const likedItemsSet = new Set<string>();

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

    // Auto-check for any pending .done files in /root/media/out
    try {
      const fs = require('fs');
      const path = require('path');
      const outDir = '/root/media/out';
      if (fs.existsSync(outDir)) {
        const outFiles = fs.readdirSync(outDir);
        const doneFiles = outFiles.filter((f: string) => f.endsWith('.done'));
        for (const doneFile of doneFiles) {
          const base = path.basename(doneFile, '.done');
          await this.ingestFinalizedVideo({ slug: base });
        }
      }
    } catch (e) {}

    // Auto-seed initial feed items if missing
    try {
      await this.seedDemoData(false);
    } catch (e) {}

    // 1. Fetch items from database matching targetLocale
    let items: any[] = [];
    const populateConfig = {
      author: true,
      blocks: {
        populate: '*',
      },
    };

    try {
      const primaryItems = await strapi.documents('api::feed-item.feed-item').findMany({
        populate: populateConfig as any,
        status: 'published',
        locale: targetLocale,
      });

      let dbItems = [...primaryItems];

      // If target locale has 0 items, check alternative locale as fallback
      if (dbItems.length === 0) {
        const altLocale = targetLocale === 'de' ? 'en' : 'de';
        const altItems = await strapi.documents('api::feed-item.feed-item').findMany({
          populate: populateConfig as any,
          status: 'published',
          locale: altLocale,
        });
        dbItems = [...altItems];
      }

      if ((userProfileInput as any)?.includeDrafts) {
        const draftItems = await strapi.documents('api::feed-item.feed-item').findMany({
          populate: populateConfig as any,
          status: 'draft',
          locale: targetLocale,
        });
        dbItems = [...dbItems, ...draftItems];
      }

      // Fetch standalone video documents and unify into dbItems
      try {
        const videoItems = await strapi.documents('api::video.video').findMany({
          populate: { creator: true } as any,
          status: (userProfileInput as any)?.includeDrafts ? undefined : 'published',
          locale: targetLocale,
        });
        const mappedVideos = videoItems.map((v: any) => ({
          ...v,
          author: v.creator || v.author,
          mediaType: 'video',
          mediaUrl: v.mp4Url || v.hlsUrl,
          tags: v.tags || ['Video'],
          summary: v.summary || v.title,
          blocks: v.blocks || [],
        }));
        // Avoid duplicates if video is already linked to a feedItem
        const existingSlugs = new Set(dbItems.map((i: any) => i.slug));
        const uniqueVideos = mappedVideos.filter((v: any) => !existingSlugs.has(v.slug));
        dbItems = [...dbItems, ...uniqueVideos];
      } catch (e) {}

      items = dbItems as any;
    } catch (err) {
      items = [];
    }

    let resolvedTargetMatch: any = null;
    const target = (userProfileInput as any)?.targetSlug;
    if (target) {
      try {
        const altLocale = targetLocale === 'de' ? 'en' : 'de';

        const findTargetItem = async (locale: string, status: 'draft' | 'published') => {
          // 1. Direct slug match in requested locale in feed-item
          try {
            const matches = await strapi.documents('api::feed-item.feed-item').findMany({
              filters: { slug: { $eq: target } },
              locale,
              status,
              populate: populateConfig as any,
            });
            if (matches && matches.length > 0) return matches[0];
          } catch (e) {}

          // 2. Direct slug match in standalone video
          try {
            const videoMatches = await strapi.documents('api::video.video').findMany({
              filters: { slug: { $eq: target } },
              locale,
              status,
              populate: { creator: true } as any,
            });
            if (videoMatches && videoMatches.length > 0) {
              const v = videoMatches[0] as any;
              return {
                ...v,
                author: v.creator || v.author,
                mediaType: 'video',
                mediaUrl: v.mp4Url || v.hlsUrl,
                tags: v.tags || ['Video'],
                summary: v.summary || v.title,
                blocks: v.blocks || [],
              };
            }
          } catch (e) {}

          // 3. Direct documentId match in requested locale in feed-item
          try {
            const doc = await strapi.documents('api::feed-item.feed-item').findOne({
              documentId: target,
              locale,
              status,
              populate: populateConfig as any,
            });
            if (doc) return doc;
          } catch (e) {}

          // 4. Direct documentId match in standalone video
          try {
            const vDoc = await strapi.documents('api::video.video').findOne({
              documentId: target,
              locale,
              status,
              populate: { creator: true } as any,
            });
            if (vDoc) {
              const v = vDoc as any;
              return {
                ...v,
                author: v.creator || v.author,
                mediaType: 'video',
                mediaUrl: v.mp4Url || v.hlsUrl,
                tags: v.tags || ['Video'],
                summary: v.summary || v.title,
                blocks: v.blocks || [],
              };
            }
          } catch (e) {}

          // 5. Reverse lookup: find item by slug in ANY locale to resolve documentId, then fetch target locale
          try {
            const altMatches = await strapi.documents('api::feed-item.feed-item').findMany({
              filters: { slug: { $eq: target } },
              locale: '*',
              status,
              populate: populateConfig as any,
            });
            if (altMatches && altMatches.length > 0 && altMatches[0].documentId) {
              const localizedDoc = await strapi.documents('api::feed-item.feed-item').findOne({
                documentId: altMatches[0].documentId,
                locale,
                status,
                populate: populateConfig as any,
              });
              if (localizedDoc) return localizedDoc;
            }
          } catch (e) {}

          // 6. Reverse lookup in standalone video
          try {
            const altVideoMatches = await strapi.documents('api::video.video').findMany({
              filters: { slug: { $eq: target } },
              locale: '*',
              status,
              populate: { creator: true } as any,
            });
            if (altVideoMatches && altVideoMatches.length > 0 && altVideoMatches[0].documentId) {
              const localizedVDoc = await strapi.documents('api::video.video').findOne({
                documentId: altVideoMatches[0].documentId,
                locale,
                status,
                populate: { creator: true } as any,
              });
              if (localizedVDoc) {
                const v = localizedVDoc as any;
                return {
                  ...v,
                  author: v.creator || v.author,
                  mediaType: 'video',
                  mediaUrl: v.mp4Url || v.hlsUrl,
                  tags: v.tags || ['Video'],
                  summary: v.summary || v.title,
                  blocks: v.blocks || [],
                };
              }
            }
          } catch (e) {}

          return null;
        };

        if ((userProfileInput as any)?.includeDrafts) {
          // Priority to DRAFTS when previewing
          resolvedTargetMatch =
            (await findTargetItem(targetLocale, 'draft')) ||
            (await findTargetItem(altLocale, 'draft')) ||
            (await findTargetItem(targetLocale, 'published')) ||
            (await findTargetItem(altLocale, 'published'));
        } else {
          // Strictly PUBLISHED matching targetLocale first
          resolvedTargetMatch =
            (await findTargetItem(targetLocale, 'published')) ||
            (await findTargetItem(altLocale, 'published'));
        }

        if (resolvedTargetMatch) {
          // Remove any previous versions of this item from items list to prevent stale versions
          items = items.filter(
            (i: any) =>
              i.documentId !== resolvedTargetMatch.documentId &&
              i.slug !== resolvedTargetMatch.slug &&
              String(i.id) !== String(resolvedTargetMatch.id)
          );
          // Place the exact resolvedTargetMatch at index 0
          items = [resolvedTargetMatch, ...items];
        }
      } catch (e) {}
    }

    const extractText = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        return val
          .map((b: any) => (Array.isArray(b?.children) ? b.children.map((c: any) => c?.text || '').join('') : ''))
          .filter(Boolean)
          .join('\n');
      }
      return String(val);
    };

    // 2. Score items against Interest Vector
    const scoredItems = items.map((rawItem: any) => {
      const blocks = rawItem.blocks || [];
      const videoBlock = blocks.find((b: any) => b.__component === 'shared.video' || b.video);
      const pdfBlock = blocks.find((b: any) => b.__component === 'shared.pdf' || b.pdfUrl);
      const richTextBlock = blocks.find((b: any) => b.__component === 'shared.rich-text' || b.body);

      let derivedMediaType = rawItem.mediaType || 'article';
      if (videoBlock) derivedMediaType = 'video';
      else if (pdfBlock) derivedMediaType = 'pdf';

      const videoData = videoBlock?.video || rawItem.video;
      const parsedSummary = extractText(rawItem.summary);

      const item = {
        ...rawItem,
        summary: parsedSummary || rawItem.title || '',
        mediaType: derivedMediaType,
        content: richTextBlock?.body || rawItem.content || parsedSummary || '',
        mediaUrl: videoData?.mp4Url || videoData?.hlsUrl || pdfBlock?.pdfUrl || rawItem.mediaUrl || '',
        thumbnailUrl: videoData?.thumbnailUrl || rawItem.thumbnailUrl || '',
        duration: videoData?.duration || rawItem.duration || 0,
        isProcessing: videoData?.isProcessing !== undefined ? videoData.isProcessing : (rawItem.isProcessing || false),
        isForSale: videoData?.isForSale || false,
        price: videoData?.price || 0,
      };

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

    // Ensure target preview item (resolvedTargetMatch) is ALWAYS placed strictly at index 0
    if (resolvedTargetMatch) {
      const existingIdx = assembledFeed.findIndex(
        (i: any) =>
          i.documentId === resolvedTargetMatch.documentId ||
          i.slug === resolvedTargetMatch.slug ||
          String(i.id) === String(resolvedTargetMatch.id)
      );
      if (existingIdx > 0) {
        const [targetObj] = assembledFeed.splice(existingIdx, 1);
        assembledFeed.unshift(targetObj);
      } else if (existingIdx === -1) {
        assembledFeed.unshift({
          ...resolvedTargetMatch,
          bucketSource: 'TargetPreview',
          slotIndex: 1,
        });
      }
    } else if (target) {
      const existingIdx = assembledFeed.findIndex(
        (i: any) => i.slug === target || i.documentId === target || String(i.id) === target
      );
      if (existingIdx > 0) {
        const [targetObj] = assembledFeed.splice(existingIdx, 1);
        assembledFeed.unshift(targetObj);
      }
    }

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
  /**
   * Ingest Finalized Video (moves files from /root/media/out to /root/media/videos and updates Strapi)
   */
  async ingestFinalizedVideo(payload: { slug: string; duration?: number; workerSecret?: string }) {
    const { slug, duration } = payload;
    if (!slug) {
      throw new Error('Missing slug parameter');
    }

    const OUT_DIR = '/root/media/out';
    const FINAL_DIR = '/root/media/videos';
    const THUMB_DIR = '/root/media/thumbnails';
    const OG_DEST_DIR = '/root/media/og';

    const fs = require('fs');
    const path = require('path');
    const glob = require('glob');

    const base = slug;
    const videoPath = path.join(OUT_DIR, base + '.mp4');
    const donePath = path.join(OUT_DIR, base + '.done');
    const metaPath = path.join(OUT_DIR, base + '.meta');

    let metaDuration = duration || 0;

    // Read meta file if exists
    if (fs.existsSync(metaPath)) {
      try {
        const lines = fs.readFileSync(metaPath, 'utf8').split('\n');
        for (const line of lines) {
          const [key, value] = line.split('=');
          if (key && value && key.trim() === 'duration') {
            metaDuration = parseInt(value.trim(), 10) || metaDuration;
          }
        }
      } catch (e) {}
    }

    // 1. Move Thumbnails
    const thumbPattern = path.join(OUT_DIR, 'thumbnails', `${base}-*.png`);
    const thumbFiles = glob.sync(thumbPattern);
    fs.mkdirSync(THUMB_DIR, { recursive: true });
    for (const src of thumbFiles) {
      const dest = path.join(THUMB_DIR, path.basename(src));
      fs.copyFileSync(src, dest);
      try { fs.unlinkSync(src); } catch (e) {}
    }

    // 2. Move OG image
    const ogSrc = path.join(OUT_DIR, 'og', `${base}.jpg`);
    fs.mkdirSync(OG_DEST_DIR, { recursive: true });
    if (fs.existsSync(ogSrc)) {
      const ogDest = path.join(OG_DEST_DIR, path.basename(ogSrc));
      fs.copyFileSync(ogSrc, ogDest);
      try { fs.unlinkSync(ogSrc); } catch (e) {}
    }

    // 3. Move ABR HLS directory
    const hlsSrcDir = path.join(OUT_DIR, 'hls', base);
    const hlsDestDir = path.join(FINAL_DIR, 'hls', base);
    if (fs.existsSync(hlsSrcDir)) {
      fs.mkdirSync(path.join(FINAL_DIR, 'hls'), { recursive: true });
      fs.cpSync(hlsSrcDir, hlsDestDir, { recursive: true });
      try { fs.rmSync(hlsSrcDir, { recursive: true, force: true }); } catch (e) {}
    }

    // 4. Move MP4 file
    if (fs.existsSync(videoPath)) {
      const targetPath = path.join(FINAL_DIR, base + '.mp4');
      fs.copyFileSync(videoPath, targetPath);
      try { fs.unlinkSync(videoPath); } catch (e) {}
    }

    // Clean up markers
    if (fs.existsSync(donePath)) { try { fs.unlinkSync(donePath); } catch (e) {} }
    if (fs.existsSync(metaPath)) { try { fs.unlinkSync(metaPath); } catch (e) {} }

    // 5. Update Strapi DB entries for standalone Video (ALL locales, always published)
    try {
      const videoMatches = await strapi.documents('api::video.video').findMany({
        filters: { slug: { $eq: base } },
        locale: '*',
      });
      if (videoMatches && videoMatches.length > 0) {
        const docId = videoMatches[0].documentId;
        const updateData = {
          isProcessing: false,
          duration: metaDuration || (videoMatches[0] as any).duration || 0,
          hlsUrl: `/media/videos/hls/${base}/master.m3u8`,
          mp4Url: `/media/videos/${base}.mp4`,
          thumbnailUrl: `/media/thumbnails/${base}-1.png`,
          ogImageUrl: `/media/og/${base}.jpg`,
        };

        // Update each locale version individually with status: 'published'
        const localesFound = new Set(videoMatches.map((v: any) => v.locale || 'en'));
        for (const locale of localesFound) {
          try {
            await strapi.documents('api::video.video').update({
              documentId: docId,
              locale,
              data: updateData as any,
              status: 'published',
            });
          } catch (localeErr) {
            console.error(`Error updating video locale ${locale}:`, localeErr);
          }
        }

        // Ensure both EN and DE exist - if a locale is missing, create it
        for (const requiredLocale of ['en', 'de']) {
          if (!localesFound.has(requiredLocale)) {
            try {
              await strapi.documents('api::video.video').update({
                documentId: docId,
                locale: requiredLocale,
                data: {
                  ...updateData,
                  title: (videoMatches[0] as any).title || base,
                  slug: base,
                  tags: (videoMatches[0] as any).tags || ['Video'],
                } as any,
                status: 'published',
              });
            } catch (e) {
              console.error(`Error creating missing ${requiredLocale} locale for video:`, e);
            }
          }
        }
      }
    } catch (e) {}

    const updateStrapiItem = async () => {
      try {
        const matches = await strapi.documents('api::feed-item.feed-item').findMany({
          filters: { slug: { $eq: base } },
          locale: '*',
        });

        for (const doc of matches) {
          await strapi.documents('api::feed-item.feed-item').update({
            documentId: doc.documentId,
            locale: (doc as any).locale || 'de',
            status: 'published',
            data: {
              isProcessing: false,
              duration: metaDuration || (doc as any).duration || 0,
            } as any,
          });
        }
      } catch (e) {}
    };

    await updateStrapiItem();

    return { success: true, slug: base, isProcessing: false, duration: metaDuration };
  },

  async togglePublish(documentId: string, publish: boolean) {
    if (!documentId) {
      throw new Error('Missing documentId');
    }
    if (publish) {
      try {
        const pubDe = await strapi.documents('api::feed-item.feed-item').publish({
          documentId,
          locale: 'de',
        });
        try {
          await strapi.documents('api::feed-item.feed-item').publish({
            documentId,
            locale: 'en',
          });
        } catch (e) {}
        return { success: true, documentId, published: true, data: pubDe };
      } catch (e) {
        // Fallback to standalone video model
        try {
          const vPub = await strapi.documents('api::video.video').publish({
            documentId,
            locale: 'de',
          });
          try {
            await strapi.documents('api::video.video').publish({
              documentId,
              locale: 'en',
            });
          } catch (e) {}
          return { success: true, documentId, published: true, data: vPub };
        } catch (vErr: any) {
          throw vErr;
        }
      }
    } else {
      try {
        const unpubDe = await strapi.documents('api::feed-item.feed-item').unpublish({
          documentId,
          locale: 'de',
        });
        try {
          await strapi.documents('api::feed-item.feed-item').unpublish({
            documentId,
            locale: 'en',
          });
        } catch (e) {}
        return { success: true, documentId, published: false, data: unpubDe };
      } catch (e) {
        // Fallback to standalone video model
        try {
          const vUnpub = await strapi.documents('api::video.video').unpublish({
            documentId,
            locale: 'de',
          });
          try {
            await strapi.documents('api::video.video').unpublish({
              documentId,
              locale: 'en',
            });
          } catch (e) {}
          return { success: true, documentId, published: false, data: vUnpub };
        } catch (vErr: any) {
          throw vErr;
        }
      }
    }
  },

  async seedDemoData(force = false) {
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
        } catch (e) {}
        try {
          await strapi.db.query('api::video.video').deleteMany({});
        } catch (e) {}
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
          return null;
        }
      };

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

      const createVideoRecord = async (videoData: {
        title: string;
        slug: string;
        duration: number;
        thumbnailUrl: string;
        mp4Url: string;
        creator: any;
      }) => {
        try {
          const created = await strapi.documents('api::video.video').create({
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
            } as any,
            status: 'published',
          });
          return created;
        } catch (e) {
          return null;
        }
      };

      const pastaVideo = await createVideoRecord({
        title: 'Italienische Pastasoßen Masterclass',
        slug: 'kochen-wie-der-chefkoch-italienische-pasta',
        duration: 840,
        thumbnailUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80',
        mp4Url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        creator: creators.demogourmet,
      });

      const beesVideo = await createVideoRecord({
        title: 'Faszination Wildbienen Dokumentation',
        slug: 'natur-artenvielfalt-wildbienen-doku',
        duration: 1620,
        thumbnailUrl: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80',
        mp4Url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        creator: creators.greenplanet,
      });

      const catShortVideo = await createVideoRecord({
        title: 'Lustige Katzenwelpen 2026',
        slug: 'suesse-katzenwelpen-lustige-momente',
        duration: 45,
        thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
        mp4Url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        creator: creators.catmania,
      });

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
            blocks: [
              {
                __component: 'shared.video',
                video: pastaVideo?.documentId || pastaVideo?.id,
              },
              {
                __component: 'shared.headline',
                title: 'Die Kunst der echten römischen Carbonara',
                level: 'h2',
              },
            ],
          },
          en: {
            title: 'Cook Like a Chef: Italian Pasta Sauces From Scratch',
            slug: 'cook-like-a-chef-italian-pasta-sauces',
            summary: 'The secret behind the perfect Carbonara and Cacio e Pepe in 15 minutes.',
            content: 'In this video tutorial, master chef Marco shows how to craft unforgettable pasta...',
            tags: ['Cooking', 'Recipes', 'Culinary', 'Video Tutorial'],
            blocks: [
              {
                __component: 'shared.video',
                video: pastaVideo?.documentId || pastaVideo?.id,
              },
              {
                __component: 'shared.headline',
                title: 'The Art of Authentic Roman Carbonara',
                level: 'h2',
              },
            ],
          },
          mediaType: 'video',
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
            blocks: [
              {
                __component: 'shared.video',
                video: beesVideo?.documentId || beesVideo?.id,
              },
            ],
          },
          en: {
            title: 'Nature & Biodiversity: The Fascinating World of Wild Bees',
            slug: 'nature-biodiversity-wild-bees-doc',
            summary: 'A documentary on protecting native insects and local ecosystems.',
            content: 'Discover the surprising capabilities of wild bees...',
            tags: ['Nature', 'Environment', 'Documentary', 'Animals'],
            blocks: [
              {
                __component: 'shared.video',
                video: beesVideo?.documentId || beesVideo?.id,
              },
            ],
          },
          mediaType: 'video',
          thumbnailUrl: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?w=800&q=80',
          viewsCount: 65100,
          likesCount: 8900,
          publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        },
        {
          creator: creators.catmania,
          de: {
            title: 'Süße Katzenwelpen & Ihre Lustigsten Momente 2026',
            slug: 'suesse-katzenwelpen-lustige-momente',
            summary: 'Lachen garantiert: Die niedlichsten Katzen beim Spielen und Toben im Familienalltag.',
            content: 'Eine herzerwärmende Zusammenstellung für die ganze Familie...',
            tags: ['Funny Cat Videos', 'Humor', 'Familie', 'Tiere'],
            blocks: [
              {
                __component: 'shared.video',
                video: catShortVideo?.documentId || catShortVideo?.id,
              },
            ],
          },
          en: {
            title: 'Cute Kittens & Their Funniest Moments 2026',
            slug: 'cute-kittens-funniest-moments-2026',
            summary: 'Guaranteed laughs: The cutest cats playing and jumping in everyday family life.',
            content: 'A heartwarming compilation for the entire family...',
            tags: ['Funny Cat Videos', 'Humor', 'Family', 'Animals'],
            blocks: [
              {
                __component: 'shared.video',
                video: catShortVideo?.documentId || catShortVideo?.id,
              },
            ],
          },
          mediaType: 'short',
          thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
          viewsCount: 230000,
          likesCount: 35000,
          publishedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
        },
      ];

      for (const item of seedItems) {
        const authorId = item.creator?.documentId || item.creator?.id;

        const createdEn = await strapi.documents('api::feed-item.feed-item').create({
          data: {
            ...item.en,
            mediaType: item.mediaType,
            thumbnailUrl: item.thumbnailUrl,
            viewsCount: item.viewsCount,
            likesCount: item.likesCount,
            publishedAt: item.publishedAt,
            author: authorId,
          } as any,
          locale: 'en',
          status: 'published',
        });

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
          } as any,
          status: 'published',
        });
      }

      console.log(`✅ Seed completed: ${seedItems.length * 2} bilingual items linked with Dynamic Zone components created!`);
      return { success: true, count: seedItems.length * 2 };
    } catch (err: any) {
      console.error('Error in seedDemoData:', err);
      return { success: false, error: err.message };
    }
  },

  async getInteractionStatus(slug: string, userIdentifier: string = 'anonymous') {
    const today = new Date().toISOString().split('T')[0];
    const viewKey = `view:${slug}:${userIdentifier}:${today}`;
    const likeKey = `like:${slug}:${userIdentifier}`;

    const hasViewedToday = dailyViewsSet.has(viewKey);
    const isLiked = likedItemsSet.has(likeKey);

    let viewsCount = 0;
    let likesCount = 0;

    try {
      const videoMatches = await strapi.documents('api::video.video').findMany({
        filters: { slug: slug },
      });
      if (videoMatches && videoMatches.length > 0) {
        viewsCount = (videoMatches[0] as any).viewsCount || 0;
        likesCount = (videoMatches[0] as any).likesCount || 0;
      } else {
        const feedMatches = await strapi.documents('api::feed-item.feed-item').findMany({
          filters: { slug: slug },
        });
        if (feedMatches && feedMatches.length > 0) {
          viewsCount = (feedMatches[0] as any).viewsCount || 0;
          likesCount = (feedMatches[0] as any).likesCount || 0;
        }
      }
    } catch (e) {}

    return {
      slug,
      isLiked,
      hasViewedToday,
      viewsCount,
      likesCount,
    };
  },

  async handleInteraction(payload: {
    slug: string;
    type: 'view' | 'like' | 'unlike';
    watchTimeSeconds?: number;
    userIdentifier?: string;
    userId?: number | string;
  }) {
    const { slug, type, watchTimeSeconds = 0, userIdentifier = 'anonymous', userId } = payload;
    const today = new Date().toISOString().split('T')[0];
    const viewKey = `view:${slug}:${userIdentifier}:${today}`;
    const likeKey = `like:${slug}:${userIdentifier}`;

    if (!slug) {
      return { success: false, error: 'Slug is required' };
    }

    let videoMatches: any[] = [];
    let feedMatches: any[] = [];
    try {
      videoMatches = await strapi.documents('api::video.video').findMany({
        filters: { slug: slug },
      });
      feedMatches = await strapi.documents('api::feed-item.feed-item').findMany({
        filters: { slug: slug },
      });
    } catch (e: any) {
      console.error('Error in handleInteraction findMany:', e.message || e);
    }

    if (videoMatches.length === 0 && feedMatches.length === 0) {
      return { success: false, error: 'Entity not found' };
    }

    const currentItem = videoMatches[0] || feedMatches[0];
    let currentViewsCount = Number(currentItem?.viewsCount || 0);
    let currentLikesCount = Number(currentItem?.likesCount || 0);
    const tags: string[] = currentItem?.tags || ['Community'];

    if (type === 'view') {
      const mediaType = currentItem?.mediaType || 'video';
      const requiredDuration = (mediaType === 'video' || mediaType === 'short') ? 5 : 3;

      if (watchTimeSeconds < requiredDuration) {
        return {
          success: true,
          counted: false,
          reason: 'duration_below_threshold',
          requiredDuration,
          currentViewsCount,
          currentLikesCount,
        };
      }

      if (dailyViewsSet.has(viewKey)) {
        return {
          success: true,
          counted: false,
          reason: 'already_viewed_today',
          currentViewsCount,
          currentLikesCount,
        };
      }

      dailyViewsSet.add(viewKey);
      currentViewsCount += 1;

      for (const doc of videoMatches) {
        try {
          await strapi.documents('api::video.video').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            data: { viewsCount: currentViewsCount } as any,
          });
        } catch (e) {}
      }

      for (const doc of feedMatches) {
        try {
          await strapi.documents('api::feed-item.feed-item').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            data: { viewsCount: currentViewsCount } as any,
          });
        } catch (e) {}
      }

      if (userId) {
        try {
          await strapi.service('api::tracking.tracking').processBatch(userId, [
            { type: 'view', tags, mediaType },
          ]);
        } catch (e) {}
      }

      return {
        success: true,
        counted: true,
        viewsCount: currentViewsCount,
        likesCount: currentLikesCount,
      };
    }

    if (type === 'like') {
      if (likedItemsSet.has(likeKey)) {
        return {
          success: true,
          isLiked: true,
          viewsCount: currentViewsCount,
          likesCount: currentLikesCount,
        };
      }

      likedItemsSet.add(likeKey);
      currentLikesCount += 1;

      for (const doc of videoMatches) {
        try {
          await strapi.documents('api::video.video').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            data: { likesCount: currentLikesCount } as any,
          });
        } catch (e) {}
      }

      for (const doc of feedMatches) {
        try {
          await strapi.documents('api::feed-item.feed-item').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            data: { likesCount: currentLikesCount } as any,
          });
        } catch (e) {}
      }

      if (userId) {
        try {
          await strapi.service('api::tracking.tracking').processBatch(userId, [
            { type: 'click', tags, mediaType: currentItem?.mediaType },
          ]);
        } catch (e) {}
      }

      return {
        success: true,
        isLiked: true,
        viewsCount: currentViewsCount,
        likesCount: currentLikesCount,
      };
    }

    if (type === 'unlike') {
      if (!likedItemsSet.has(likeKey)) {
        return {
          success: true,
          isLiked: false,
          viewsCount: currentViewsCount,
          likesCount: currentLikesCount,
        };
      }

      likedItemsSet.delete(likeKey);
      currentLikesCount = Math.max(0, currentLikesCount - 1);

      for (const doc of videoMatches) {
        try {
          await strapi.documents('api::video.video').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            data: { likesCount: currentLikesCount } as any,
          });
        } catch (e) {}
      }

      for (const doc of feedMatches) {
        try {
          await strapi.documents('api::feed-item.feed-item').update({
            documentId: doc.documentId,
            locale: doc.locale || 'de',
            data: { likesCount: currentLikesCount } as any,
          });
        } catch (e) {}
      }

      return {
        success: true,
        isLiked: false,
        viewsCount: currentViewsCount,
        likesCount: currentLikesCount,
      };
    }

    return { success: false, error: 'Invalid interaction type' };
  },
});
