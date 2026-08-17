import { Core } from '@strapi/strapi';
import {
  AffinityGraph,
  normalizeAffinityGraph,
  topicWeight,
  creatorWeight,
  TOPIC_SCORE_MAX,
} from '../../../lib/affinity';
import { FeedItem, Video, ContentItem, User } from '../../../types';

/** Creator affinity (0–100) above which an author counts as "network" for the feed. */
const NETWORK_CREATOR_THRESHOLD = 60;

export interface FeedAssemblyInput {
  locale?: string;
  lang?: string;
  includeDrafts?: boolean;
  targetSlug?: string;
  activePattern?: 'discovery' | 'deep_dive';
  // Anonymous visitors may send their local affinity graph (any legacy shape accepted):
  topics?: unknown;
  interests?: unknown;
  contentTypes?: unknown;
  creators?: unknown;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({

  async assembleFeed(userProfileInput?: FeedAssemblyInput, viewerId?: number | string) {
    const targetLocale = userProfileInput?.locale || userProfileInput?.lang || 'de';

    // Ranking source of truth: the authenticated viewer's stored affinityGraph.
    // Anonymous visitors rank against the (local) graph they send along.
    let graph: AffinityGraph;
    if (viewerId) {
      let storedGraph: unknown = null;
      try {
        const viewer = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: viewerId },
        });
        storedGraph = (viewer as User | null)?.affinityGraph || null;
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
    let items: ContentItem[] = [];
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

      let dbItems: ContentItem[] = [...primaryItems as ContentItem[]];

      // Fetch standalone video documents and unify into dbItems
      try {
        const videoItems = await strapi.documents('api::video.video').findMany({
          populate: { creator: true } as any,
          status: userProfileInput?.includeDrafts ? undefined : 'published',
          locale: '*',
          ...(omniViewer ? { omniViewer } : {}),
        } as any);
        const mappedVideos = videoItems.map((v: Video) => ({
          ...v,
          author: v.creator || v.author,
          creator: v.creator || v.author,
          mediaType: 'video',
          mediaUrl: v.mp4Url || v.hlsUrl,
          tags: v.tags || ['Video'],
          summary: v.summary || v.title,
          blocks: v.blocks || [],
        })) as ContentItem[];
        // Avoid duplicates if video is already linked to a feedItem
        const existingSlugs = new Set(dbItems.map((i) => i.slug));
        const uniqueVideos = mappedVideos.filter((v) => !existingSlugs.has(v.slug));
        dbItems = [...dbItems, ...uniqueVideos];
      } catch (e) {
        strapi.log.error('[feed-assembly.ts] unhandled error', e);
      }

      items = dbItems;
    } catch (err) {
      items = [];
    }

    let resolvedTargetMatch: ContentItem | null = null;
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
            if (matches && matches.length > 0) return matches[0] as ContentItem;
          } catch (e) {
        strapi.log.error('[feed-assembly.ts] unhandled error', e);
      }

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
              const v = videoMatches[0] as Video;
              return {
                ...v,
                author: v.creator || v.author,
                mediaType: 'video',
                mediaUrl: v.mp4Url || v.hlsUrl,
                tags: v.tags || ['Video'],
                summary: v.summary || v.title,
                blocks: v.blocks || [],
              } as ContentItem;
            }
          } catch (e) {
        strapi.log.error('[feed-assembly.ts] unhandled error', e);
      }

          // 3. Direct documentId match in requested locale in feed-item
          try {
            const doc = await strapi.documents('api::feed-item.feed-item').findOne({
              documentId: target,
              locale,
              status,
              populate: populateConfig as any,
              ...(omniViewer ? { omniViewer } : {}),
            } as any);
            if (doc) return doc as ContentItem;
          } catch (e) {
        strapi.log.error('[feed-assembly.ts] unhandled error', e);
      }

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
              const v = vDoc as Video;
              return {
                ...v,
                author: v.creator || v.author,
                mediaType: 'video',
                mediaUrl: v.mp4Url || v.hlsUrl,
                tags: v.tags || ['Video'],
                summary: v.summary || v.title,
                blocks: v.blocks || [],
              } as ContentItem;
            }
          } catch (e) {
        strapi.log.error('[feed-assembly.ts] unhandled error', e);
      }

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
              if (localizedDoc) return localizedDoc as ContentItem;
            }
          } catch (e) {
        strapi.log.error('[feed-assembly.ts] unhandled error', e);
      }

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
                const v = localizedVDoc as Video;
                return {
                  ...v,
                  author: v.creator || v.author,
                  mediaType: 'video',
                  mediaUrl: v.mp4Url || v.hlsUrl,
                  tags: v.tags || ['Video'],
                  summary: v.summary || v.title,
                  blocks: v.blocks || [],
                } as ContentItem;
              }
            }
          } catch (e) {
        strapi.log.error('[feed-assembly.ts] unhandled error', e);
      }

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
          const rtm = resolvedTargetMatch;
          items = items.filter(
            (i) =>
              i.documentId !== rtm.documentId &&
              i.slug !== rtm.slug &&
              String(i.id) !== String(rtm.id)
          );
          // Place the exact resolvedTargetMatch at index 0
          items = [resolvedTargetMatch, ...items];
        }
      } catch (e) {
        strapi.log.error('[feed-assembly.ts] unhandled error', e);
      }
    }

    const extractText = (val: unknown): string => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) {
        return val
          .map((b: unknown) => (Array.isArray((b as Record<string, unknown>)?.children) ? (b as Record<string, unknown[]>).children.map((c: unknown) => (c as Record<string, unknown>)?.text || '').join('') : ''))
          .filter(Boolean)
          .join('\n');
      }
      return String(val);
    };

    // 2. Score items against Interest Vector
    const scoredItems: ContentItem[] = items.map((rawItem) => {
      const blocks = rawItem.blocks || [];
      const videoBlock = blocks.find((b) => b.__component === 'shared.video' || b.video) || {} as Record<string, unknown>;
      const pdfBlock = blocks.find((b) => b.__component === 'shared.pdf' || b.pdfUrl) || {} as Record<string, unknown>;
      const richTextBlock = blocks.find((b) => b.__component === 'shared.rich-text' || b.body) || {} as Record<string, unknown>;

      let derivedMediaType = rawItem.mediaType || 'article';
      if (videoBlock.__component || videoBlock.video) derivedMediaType = 'video';
      else if (pdfBlock.__component || pdfBlock.pdfUrl) derivedMediaType = 'pdf';

      const videoData = (videoBlock.video as Video | undefined) || rawItem.video || ({} as Record<string, unknown>);
      const parsedSummary = extractText(rawItem.summary);

      const item: ContentItem = {
        ...rawItem,
        summary: parsedSummary || rawItem.title || '',
        mediaType: derivedMediaType,
        content: (richTextBlock.body as string | undefined) || (rawItem.content as string | undefined) || parsedSummary || '',
        mediaUrl: (videoData as Video).mp4Url || (videoData as Video).hlsUrl || (pdfBlock.pdfUrl as string | undefined) || rawItem.mediaUrl || '',
        thumbnailUrl: (videoData as Video).thumbnailUrl || rawItem.thumbnailUrl || '',
        duration: (videoData as Video).duration || rawItem.duration || 0,
        isProcessing: (videoData as Video).isProcessing !== undefined ? (videoData as Video).isProcessing : (rawItem.isProcessing || false),
        isForSale: (videoData as Video).isForSale || false,
        price: (videoData as Video).price || 0,
      };

      const topicScore = topicWeight(graph, item.tags || []);
      const mediaWeight = graph.contentTypes[item.mediaType || 'article'] ?? 0.5;
      const recencyHours = (Date.now() - new Date(item.publishedAt || Date.now()).getTime()) / (1000 * 3600);
      const recencyDecay = Math.max(0.3, 1 - recencyHours / (24 * 30));
      // Creators the viewer interacts with often boost relevance by up to +30%
      const authorId = typeof item.author === 'object' ? item.author?.id : item.author;
      const creatorAffinity = creatorWeight(graph, authorId);
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
    const highIntentBucket = [...scoredItems].filter((i) => (i.relevanceScore || 0) >= 0.45).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    // Bucket 2: Network — creators the viewer is close to (high creator affinity or subscription)
    const networkBucket = [...scoredItems]
      .filter((i) => i.isSubscribedAuthor || (i.creatorAffinity || 0) * TOPIC_SCORE_MAX >= NETWORK_CREATOR_THRESHOLD)
      .sort((a, b) => new Date(b.publishedAt || Date.now()).getTime() - new Date(a.publishedAt || Date.now()).getTime());
    // Bucket 3: Exploration (Wildcard / lower score items to test new interests)
    const explorationBucket = [...scoredItems]
      .filter((i) => (i.relevanceScore || 0) > 0 && ((i.relevanceScore || 0) < 0.45 || (i.tags || []).includes('Funny Cat Videos')))
      .sort(() => 0.5 - Math.random());
    // Bucket 4: Fresh / Trending (viewsCount + likesCount)
    const trendingBucket = [...scoredItems]
      .filter((i) => (i.relevanceScore || 0) > 0)
      .sort((a, b) => ((b.viewsCount || 0) + (b.likesCount || 0) * 2) - ((a.viewsCount || 0) + (a.likesCount || 0) * 2));

    // 4. Interleaving Slot Pattern Strategy
    const patternSlots = graph.activePattern === 'deep_dive'
      ? ['HighIntent', 'HighIntent', 'HighIntent', 'HighIntent', 'Exploration', 'HighIntent', 'HighIntent', 'Trending']
      : ['HighIntent', 'Network', 'HighIntent', 'Exploration', 'Trending', 'HighIntent', 'Exploration', 'Network', 'Trending'];

    const assembledFeed: ContentItem[] = [];
    // Key on documentId — numeric ids collide between feed-items and videos
    const itemKey = (i: ContentItem) => i.documentId || i.slug || String(i.id);
    const usedIds = new Set<string>();

    patternSlots.forEach((slotType, idx) => {
      let selectedItem: ContentItem | undefined = undefined;
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
          scoredItems.find((i) => !usedIds.has(itemKey(i)) && (i.relevanceScore || 0) > 0) ||
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
        (i) =>
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
        (i) => i.slug === target || i.documentId === target || String(i.id) === target
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
