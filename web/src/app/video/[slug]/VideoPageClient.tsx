'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { formatCount } from '@/lib/format';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Heart,
  Share2,
  Sparkles,
  Send,
  User,
  MessageSquare,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  UserPlus,
  Users,
  Film,
  Settings,
} from 'lucide-react';
import Header from '@/components/Header';
import SubscribeButton from '@/components/SubscribeButton';
import CreatorBadge from '@/components/CreatorBadge';
import CustomVideoPlayer from '@/components/CustomVideoPlayer';
import ChannelProfileModal from '@/components/ChannelProfileModal';
import VideoSettingsModal from '@/components/VideoSettingsModal';
import { VideoInfo, VideoComments, RelatedVideos } from './VideoComponents';
import { useApp } from '@/context/AppContext';
import { useContentList, VideoItem } from '@/lib/hooks/useContentList';
import { getRotatedRecommendations } from '@/lib/recommendations';
import { getDictionary } from '@/lib/i18n';
import { toggleLike } from '@/lib/likes';
import { jsonAuthHeaders } from '@/lib/affinity';
import { tracker } from '@/lib/tracking';
import { formatRelativeDate } from '@/lib/date';
import Image from 'next/image';
import { AVATAR_PLACEHOLDER } from '@/lib/avatar';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem as CommentItemType,
} from '@/lib/comments';
import { storeItem } from '@/lib/consent';

// Flatten a Strapi `blocks` field (array of {type, children}) into plain text.
// Falls back to the raw value when it is already a string.
function flattenBlocks(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((block: any) => {
        if (typeof block === 'string') return block;
        if (block && Array.isArray(block.children)) {
          return block.children
            .map((c: any) => (typeof c === 'string' ? c : c?.text || ''))
            .join('');
        }
        return block?.text || '';
      })
      .filter(Boolean)
      .join('\n\n');
  }
  if (value && typeof value === 'object' && Array.isArray((value as any).children)) {
    return (value as any).children.map((c: any) => c?.text || '').join('');
  }
  return '';
}

interface VideoPageClientProps {
  initialVideo: any;
  initialRelated?: any[];
  slug: string;
  accessStatus?: {
    isAllowed?: boolean;
    isAccessible?: boolean;
    isOwner?: boolean;
    visibility?: string;
    isPrivate?: boolean;
    isSubscribersOnly?: boolean;
    isUnlisted?: boolean;
    reason?: string | null;
  };
  initialLang?: 'de' | 'en';
}

function CardThumbnail({
  item,
  className = 'w-full h-full object-cover',
}: {
  item: { id?: string | number; title: string; thumbnailUrl?: string };
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !item.thumbnailUrl) {
    return (
      <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center gap-2 p-3 text-center">
        <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
          <Play className="h-4 w-4 text-cyan-400 fill-cyan-400" />
        </div>
        <span className="text-[10px] font-mono text-slate-400 line-clamp-1">{item.title}</span>
      </div>
    );
  }

  return (
    <Image
      src={item.thumbnailUrl}
      alt={item.title}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

export default function VideoPageClient({
  initialVideo,
  initialRelated = [],
  slug,
  accessStatus,
  initialLang = 'de',
}: VideoPageClientProps) {
  const router = useRouter();
  const { lang, currentUser, openAuthModal, openChannelModal, subscribedChannels, toggleSubscribeChannel, t } = useApp();

  // initialVideo is the full array of localizations (locale=*). Select the one
  // matching the active UI language. On first render (SSR) we honor the server's
  // chosen locale (initialLang, derived from the omni_lang cookie) to avoid a
  // hydration mismatch; afterwards we follow the live UI language switch.
  const pickLocalized = (source: any, useLang: string): any => {
    if (Array.isArray(source)) {
      return source.find((v: any) => v.locale === useLang) || source[0] || null;
    }
    return source;
  };

  // The server passes the cookie-derived locale (initialLang) for a correct
  // first render (SSR/hydration). After mount we follow the live UI language
  // (context `lang`), which the header switch updates instantly.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const effectiveLang = mounted ? lang : initialLang;

  const [video, setVideo] = useState<any>(() => pickLocalized(initialVideo, initialLang));
  const [relatedItems, setRelatedItems] = useState<any[]>(initialRelated);

  // Dynamic recommendations via useContentList hook with excludeSlug & rotation
  const { items: hookRelated = [] } = useContentList<VideoItem>('video', {
    currentPage: 1,
    pageSize: 12,
    excludeSlug: slug,
    sort: currentUser ? 'affinity' : 'createdatasc',
    lang: effectiveLang,
    enabled: true,
  });

  const displayRelated = getRotatedRecommendations(
    hookRelated.length > 0 ? hookRelated : relatedItems,
    slug,
    6
  );

  useEffect(() => {
    setVideo(pickLocalized(initialVideo, effectiveLang));
    setRelatedItems(initialRelated || []);
  }, [initialVideo, initialRelated, effectiveLang]);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialVideo?.likesCount || 0);
  const [viewsCount, setViewsCount] = useState(initialVideo?.viewsCount || 0);
  const [descExpanded, setDescExpanded] = useState(false);
  const hasTrackedView = useRef(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const fallbackCreator = useMemo(() => {
    return { username: 'Omni Creator', handle: '@omni', avatarUrl: AVATAR_PLACEHOLDER, bio: 'Creator im Omni Network.' };
  }, []);

  const creator = video?.creator || video?.author || initialVideo?.creator || initialVideo?.author;
  const rawHandle = creator?.handle || video?.authorHandle || initialVideo?.authorHandle;
  const creatorName =
    creator?.username || creator?.name || video?.authorName || initialVideo?.authorName || (rawHandle ? rawHandle.replace(/^@/, '') : fallbackCreator.username);
  const creatorHandle = rawHandle ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`) : fallbackCreator.handle;

  const isVideoOwner = Boolean(
    currentUser &&
      (currentUser.id === creator?.id ||
        currentUser.username === creatorName ||
        (currentUser.handle && creatorHandle && currentUser.handle.replace(/^@/, '').toLowerCase() === creatorHandle.replace(/^@/, '').toLowerCase()))
  );

  const rawCreatorAvatar =
    creator?.avatarUrl || creator?.avatar || video?.authorAvatar || initialVideo?.authorAvatar || fallbackCreator.avatarUrl;

  const creatorAvatar = (isVideoOwner && typeof currentUser?.avatarUrl !== 'undefined')
    ? (currentUser.avatarUrl || rawCreatorAvatar)
    : rawCreatorAvatar;
  const isSubscribed = Boolean(
    creatorHandle &&
      (subscribedChannels.includes(creatorHandle) ||
        subscribedChannels.includes(creatorHandle.replace(/^@/, '')))
  );

  const userIdent = useMemo(() => {
    return currentUser?.id ? `user-${currentUser.id}` : 'anon-session';
  }, [currentUser?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check stored likes / interaction status
  useEffect(() => {
    if (!video?.slug) return;
    setLikesCount(video.likesCount ?? 0);
    setViewsCount(video.viewsCount ?? 0);
    hasTrackedView.current = false;

    const checkInteraction = async () => {
      let localLiked = false;
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        if (storedLikes.includes(video.slug)) localLiked = true;
      } catch (e) { /* corrupt or absent localStorage entry — falling back to defaults */ }

      try {
        const res = await fetch(
          `/api/feed/interaction-status?slug=${video.slug}&userIdentifier=${userIdent}`,
          { headers: jsonAuthHeaders() }
        );
        if (res.ok) {
          const data = await res.json();
          setIsLiked(localLiked || Boolean(data.isLiked));
          if (typeof data.likesCount === 'number') setLikesCount(data.likesCount);
          if (typeof data.viewsCount === 'number') setViewsCount(data.viewsCount);
        } else if (localLiked) {
          setIsLiked(true);
        }
      } catch (e) {
        if (localLiked) setIsLiked(true);
      }
    };
    checkInteraction();

    if (video?.slug) {
      const tags = Array.isArray(video.tags) && video.tags.length > 0
        ? video.tags
        : [video.category, video.title].filter(Boolean);
      tracker.track('view', tags, 'video', creator?.id);
    }
  }, [video?.slug, userIdent]);

  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const el = e.currentTarget;
    if (!hasTrackedView.current && el.currentTime >= 5 && video?.slug && currentUser) {
      hasTrackedView.current = true;
      const tags = Array.isArray(video.tags) && video.tags.length > 0
        ? video.tags
        : [video.category, video.title].filter(Boolean);
      tracker.track('view', tags, 'video', creator?.id);

      fetch('/api/feed/interaction', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug: video.slug,
          type: 'view',
          watchTimeSeconds: el.currentTime,
          userIdentifier: userIdent,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.counted && typeof data.viewsCount === 'number') {
            setViewsCount(data.viewsCount);
          }
        })
        .catch((e) => { console.error('Unhandled promise rejection:', e); });
    }
  };

  const handleLikeToggle = async () => {
    if (!video?.slug) return;
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);

    if (video?.id != null) {
      void toggleLike({ videoId: video.id, desired: nextIsLiked });
    }
    setLikesCount((prev: number) => Math.max(0, nextIsLiked ? prev + 1 : prev - 1));

    const tags = Array.isArray(video.tags) && video.tags.length > 0
      ? video.tags
      : [video.category, video.title].filter(Boolean);
    tracker.track(nextIsLiked ? 'like' : 'unlike', tags, 'video', creator?.id);

    if (nextIsLiked) {
      showToast(t.common.likeAdded);
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        if (!storedLikes.includes(video.slug)) {
          storeItem('omni_user_likes', JSON.stringify([...storedLikes, video.slug]));
        }
      } catch (e) { /* localStorage unavailable (quota or private mode) — preference not persisted */ }
    } else {
      showToast(t.common.likeRemoved);
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        storeItem(
          'omni_user_likes',
          JSON.stringify(storedLikes.filter((s) => s !== video.slug))
        );
      } catch (e) { /* localStorage unavailable (quota or private mode) — preference not persisted */ }
    }

    try {
      await fetch('/api/feed/interaction', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug: video.slug,
          type: nextIsLiked ? 'like' : 'unlike',
          userIdentifier: userIdent,
        }),
      });
    } catch (e) { console.error('[VideoDetail] like/unlike was not persisted to the server — UI and server state may now differ:', e); }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast(t.common.linkCopied);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-canvas text-primary flex flex-col font-['Hanken_Grotesk',sans-serif]">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ bottom: `calc(6rem + var(--footer-overlap, 0px))` }} className="fixed right-6 z-50 bg-surface-raised border border-indigo-500/40 text-primary px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Video Settings Modal */}
      {showSettingsModal && (
        <VideoSettingsModal
          documentId={video.documentId || initialVideo?.documentId || ''}
          slug={slug}
          onClose={() => setShowSettingsModal(false)}
          onSave={() => router.refresh()}
        />
      )}

      <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-raised border border-subtle text-muted hover:text-primary transition-all text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.common.back}</span>
          </button>

          <Link
            href="/videos"
            className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            <Film className="w-4 h-4" />
            <span>{t.common.browseAllVideos}</span>
          </Link>
        </div>

        {/* Video Player & Sidebar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Video Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* 16:9 Video Player Container */}
            <div className="relative aspect-video w-full">
              {accessStatus && accessStatus.isAllowed === false && accessStatus.isSubscribersOnly ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-surface to-canvas text-primary space-y-4 rounded-2xl border border-subtle">
                  <div className="p-4 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shadow-xl animate-pulse">
                    <Users className="w-8 h-8" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h3 className="text-lg font-bold text-primary">
                      {t?.contentAccess?.subscribersOnlyTitle || 'Nur für Abonnenten'}
                    </h3>
                    <p className="text-xs text-muted">
                      {t?.contentAccess?.subscribersOnlySubtitle || 'Dieser Inhalt ist exklusiv für Abonnenten dieses Kanals verfügbar.'}
                    </p>
                  </div>
                  {video.creator?.id && (
                    <SubscribeButton
                      targetId={String(video.creator.id)}
                      type="channel"
                      size="lg"
                    />
                  )}
                </div>
              ) : (
                <CustomVideoPlayer
                  mp4Url={video.mp4Url || video.mediaUrl}
                  hlsUrl={video.hlsUrl}
                  posterUrl={video.thumbnailUrl || '/media/thumbnails/default.png'}
                  title={video.title}
                  slug={slug}
                  isVertical={false}
                  onToggleVertical={() => router.push(`/shorts/${slug}`)}
                  recommendations={initialRelated}
                  onTimeUpdate={handleVideoTimeUpdate}
                  className="w-full h-full"
                />
              )}
            </div>

            {/* Video Details Header */}
            <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-xl space-y-5">
              {/* Title and its metadata are one block, so they sit closer to
                  each other than to what follows. With the rules gone, spacing
                  is what groups them. */}
              <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                  {video.title}
                </h1>
                {accessStatus?.isPrivate && accessStatus?.isOwner && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
                    {t.videoDetail.privatePreview}
                  </span>
                )}
              </div>

              {/* Views, Date & Interactive Actions — no rule of its own: the only
                  divider in this card is the one the creator badge carries, so
                  the title and its metadata read as one block. */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span>{formatCount(viewsCount, lang)} {getDictionary(effectiveLang).common.views}</span>
                  </div>
                  {video.createdAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-faint" />
                      <span>{formatRelativeDate(video.createdAt, effectiveLang)}</span>
                    </div>
                  )}
                </div>

                {/* Like & Share Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLikeToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      isLiked
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-surface-raised border border-subtle text-muted hover:text-primary'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                    <span>{likesCount}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-raised border border-subtle text-muted hover:text-primary text-xs font-semibold transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.common.share}</span>
                  </button>
                </div>
              </div>
              </div>

              {/* Creator Channel Badge Bar — carries the card's only divider */}
              <CreatorBadge
                creator={creator || fallbackCreator}
                isOwner={accessStatus?.isOwner}
                onEdit={() => setShowSettingsModal(true)}
                editLabel={t?.videos?.editVideo || 'Video bearbeiten'}
                onOpenProfile={(c) => openChannelModal(c)}
              />

              {/* Expandable Video Description */}
              {(video.summary || video.description || video.tags) && (() => {
                const descriptionText = (flattenBlocks(video.summary) || video.description || '').trim();
                const isLongDescription = descriptionText.length > 180 || descriptionText.includes('\n');

                return (
                  <div className="space-y-3">
                    {descriptionText && (
                      <div>
                        <p
                          className={`text-sm text-primary leading-relaxed ${
                            !descExpanded && isLongDescription ? 'line-clamp-3' : ''
                          }`}
                        >
                          {descriptionText}
                        </p>
                        {isLongDescription && (
                          <button
                            onClick={() => setDescExpanded(!descExpanded)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 mt-1.5 transition-colors"
                          >
                            <span>{descExpanded ? t.common.showLess : t.common.showMore}</span>
                            {descExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Tags */}
                    {Array.isArray(video.tags) && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {video.tags.map((tag: string, idx: number) => (
                          <Link
                            key={`tag-${idx}`}
                            href={`/videos?page=1&includetag=${encodeURIComponent(tag)}`}
                            className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:text-white hover:bg-indigo-600/30 hover:border-indigo-500/50 text-xs font-medium transition-all shadow-sm cursor-pointer"
                          >
                            #{tag}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Unified Comments Section */}
            <VideoComments
              slug={slug}
              lang={effectiveLang}
              t={t}
            />
          </div>

          {/* Related Videos Sidebar */}
          <div className="space-y-4">
            <h3 className="font-bold text-primary text-base flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>{t.videoDetail.relatedRecommendations}</span>
            </h3>

            <div className="space-y-2">
              {displayRelated.map((rel: any) => {
                const relCreator = rel.creator?.username || rel.creator?.handle || rel.author?.username || rel.authorName || 'Omni Creator';
                return (
                  <Link
                    key={rel.documentId || rel.id}
                    href={`/video/${rel.slug}`}
                    className="group flex gap-3 p-1.5 rounded-xl hover:bg-surface transition-colors duration-150 min-h-[44px]"
                  >
                    <div className="relative aspect-video w-40 sm:w-[168px] shrink-0 rounded-xl overflow-hidden bg-surface shadow-sm">
                      <CardThumbnail item={rel} />
                      {rel.duration && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">
                          {formatDuration(rel.duration)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <h4 className="font-semibold text-sm text-primary group-hover:text-indigo-400 line-clamp-2 transition-colors leading-snug">
                        {rel.title}
                      </h4>
                      <div className="text-xs text-muted truncate mt-1">
                        <p className="truncate">{relCreator}</p>
                        {rel.viewsCount !== undefined && (
                          <p className="text-[11px] text-faint font-mono">
                            {formatCount(rel.viewsCount, lang)} {t.videoDetail.views}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
