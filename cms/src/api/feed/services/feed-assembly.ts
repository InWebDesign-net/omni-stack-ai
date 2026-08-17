import { Core } from '@strapi/strapi';
import {
  AffinityGraph,
  normalizeAffinityGraph,
  topicWeight,
  creatorWeight,
  TOPIC_SCORE_MAX,
} from '../../../lib/affinity';

/** Creator affinity (0–100) above which an author counts as "network" for the feed. */
const NETWORK_CREATOR_THRESHOLD = 60;

export interface FeedAssemblyInput {
  locale?: string;
  lang?: string;
  includeDrafts?: boolean;
  targetSlug?: string;
  activePattern?: 'discovery' | 'deep_dive';
  // Anonymous visitors may send their local affinity graph (any legacy shape accepted):
  topics?: any;
  interests?: any;
  contentTypes?: any;
  creators?: any;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({

  async assembleFeed(userProfileInput?: FeedAssemblyInput, viewerId?: number | string) {
    const targetLocale = userProfileInput?.locale || userProfileInput?.lang || 'de';

    // Ranking source of truth: the authenticated viewer's stored affinityGraph.
    // Anonymous visitors rank against the (local) graph they send along.
    let graph: AffinityGraph;
    if (viewerId) {
      let storedGraph: any = null;
      try {
        const viewer = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: viewerId },
        });
        storedGraph = viewer?.affinityGraph || null;
      } catch (e) {
        console.error('assembleFeed: failed to load viewer affinityGraph:', e);
      }
      graph = normalizeAffinityGraph(storedGraph);
    } else {
      graph = normalizeAffinityGraph(userProfileInput);
    }
    if (userProfileInput?.activePattern === 'discovery' || userProfileInput?.activePattern === 'deep_dive') {
      graph.activePattern = userProfileInput.activePattern;
    }

    // 1. Fetch items from database matching targetLocale
    let items: any[] = [];
    const populateConfig = {
      author: true,
      blocks: {
        populate: '*',
      },
    };

    const omniViewer = viewerId ? { userId: viewerId } : undefined;

    try {
      const primaryItems = await strapi.documents('api::feed-item.feed-item').findMany({
        populate: populateConfig as any,
        status: 'published',
        locale: '*',
        ...(omniViewer ? { omniViewer } : {}),
      } as any);

      let dbItems = [...primaryItems];

      // Fetch standalone video documents and unify into dbItems
      try {
        const videoItems = await strapi.documents('api::video.video').findMany({
          populate: { creator: true } as any,
          status: (userProfileInput as any)?.includeDrafts ? undefined : 'published',
          locale: '*',
          ...(omniViewer ? { omniViewer } : {}),
        } as any);
        const mappedVideos = videoItems.map((v: any) => ({
          ...v,
          author: v.creator || v.author,
          creator: v.creator || v.author,
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
              ...(omniViewer ? { omniViewer } : {}),
            } as any);
            if (matches && matches.length > 0) return matches[0];
          } catch (e) {}

          // 2. Direct slug match in standalone video
          try {
            const videoMatches = await strapi.documents('api::video.video').findMany({
              filters: { slug: { $eq: target } },
              locale,
              status,
              populate: { creator: true } as any,
              ...(omniViewer ? { omniViewer } : {}),
            } as any);
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
              ...(omniViewer ? { omniViewer } : {}),
            } as any);
            if (doc) return doc;
          } catch (e) {}

          // 4. Direct documentId match in standalone video
          try {
            const vDoc = await strapi.documents('api::video.video').findOne({
              documentId: target,
              locale,
              status,
              populate: { creator: true } as any,
              ...(omniViewer ? { omniViewer } : {}),
            } as any);
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
              ...(omniViewer ? { omniViewer } : {}),
            } as any);
            if (altMatches && altMatches.length > 0 && altMatches[0].documentId) {
              const localizedDoc = await strapi.documents('api::feed-item.feed-item').findOne({
                documentId: altMatches[0].documentId,
                locale,
                status,
                populate: populateConfig as any,
                ...(omniViewer ? { omniViewer } : {}),
              } as any);
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
              ...(omniViewer ? { omniViewer } : {}),
            } as any);
            if (altVideoMatches && altVideoMatches.length > 0 && altVideoMatches[0].documentId) {
              const localizedVDoc = await strapi.documents('api::video.video').findOne({
                documentId: altVideoMatches[0].documentId,
                locale,
                status,
                populate: { creator: true } as any,
                ...(omniViewer ? { omniViewer } : {}),
              } as any);
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

      const topicScore = topicWeight(graph, item.tags);
      const mediaWeight = graph.contentTypes[item.mediaType] ?? 0.5;
      const recencyHours = (Date.now() - new Date(item.publishedAt).getTime()) / (1000 * 3600);
      const recencyDecay = Math.max(0.3, 1 - recencyHours / (24 * 30));
      // Creators the viewer interacts with often boost relevance by up to +30%
      const creatorAffinity = creatorWeight(graph, item.author?.id);
      const relevanceScore = parseFloat(
        (topicScore * mediaWeight * recencyDecay * (1 + 0.3 * creatorAffinity)).toFixed(3)
      );

      return {
        ...item,
        creatorAffinity,
        relevanceScore,
      };
    });

    // 3. Create Buckets
    // Bucket 1: High Intent (relevanceScore >= 0.45)
    const highIntentBucket = [...scoredItems].filter((i) => i.relevanceScore >= 0.45).sort((a, b) => b.relevanceScore - a.relevanceScore);
    // Bucket 2: Network — creators the viewer is close to (high creator affinity or subscription)
    const networkBucket = [...scoredItems]
      .filter((i) => i.isSubscribedAuthor || i.creatorAffinity * TOPIC_SCORE_MAX >= NETWORK_CREATOR_THRESHOLD)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    // Bucket 3: Exploration (Wildcard / lower score items to test new interests)
    const explorationBucket = [...scoredItems]
      .filter((i) => i.relevanceScore > 0 && (i.relevanceScore < 0.45 || i.tags.includes('Funny Cat Videos')))
      .sort(() => 0.5 - Math.random());
    // Bucket 4: Fresh / Trending (viewsCount + likesCount)
    const trendingBucket = [...scoredItems]
      .filter((i) => i.relevanceScore > 0)
      .sort((a, b) => (b.viewsCount + b.likesCount * 2) - (a.viewsCount + a.likesCount * 2));

    // 4. Interleaving Slot Pattern Strategy
    const patternSlots = graph.activePattern === 'deep_dive'
      ? ['HighIntent', 'HighIntent', 'HighIntent', 'HighIntent', 'Exploration', 'HighIntent', 'HighIntent', 'Trending']
      : ['HighIntent', 'Network', 'HighIntent', 'Exploration', 'Trending', 'HighIntent', 'Exploration', 'Network', 'Trending'];

    const assembledFeed: Array<any & { bucketSource: string; slotIndex: number }> = [];
    // Key on documentId — numeric ids collide between feed-items and videos
    const itemKey = (i: any) => i.documentId || i.slug || String(i.id);
    const usedIds = new Set<string>();

    patternSlots.forEach((slotType, idx) => {
      let selectedItem: any = null;
      let sourceBucket = slotType;

      if (slotType === 'HighIntent') {
        selectedItem = highIntentBucket.find((i) => !usedIds.has(itemKey(i)));
      } else if (slotType === 'Network') {
        selectedItem = networkBucket.find((i) => !usedIds.has(itemKey(i)));
      } else if (slotType === 'Exploration') {
        selectedItem = explorationBucket.find((i) => !usedIds.has(itemKey(i)));
      } else if (slotType === 'Trending') {
        selectedItem = trendingBucket.find((i) => !usedIds.has(itemKey(i)));
      }

      // Fallback if bucket empty: try items with positive relevanceScore first,
      // but if none left, pick any remaining item so feed is never empty!
      if (!selectedItem) {
        selectedItem =
          scoredItems.find((i) => !usedIds.has(itemKey(i)) && i.relevanceScore > 0) ||
          scoredItems.find((i) => !usedIds.has(itemKey(i)));
        sourceBucket = `${slotType} (Fallback)`;
      }

      if (selectedItem) {
        usedIds.add(itemKey(selectedItem));
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
        activePattern: graph.activePattern,
        totalReturned: assembledFeed.length,
        userProfile: graph,
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
});
