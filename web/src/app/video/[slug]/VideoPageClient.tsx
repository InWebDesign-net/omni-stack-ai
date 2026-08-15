'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Play,
  Heart,
  Share2,
  CheckCircle2,
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
import VideoSettingsModal from '@/components/VideoSettingsModal';
import CustomVideoPlayer from '@/components/CustomVideoPlayer';
import { useApp } from '@/context/AppContext';
import { getDictionary } from '@/lib/i18n';
import { jsonAuthHeaders } from '@/lib/affinity';
import { tracker } from '@/lib/tracking';
import { formatRelativeDate } from '@/lib/date';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem,
} from '@/lib/comments';

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
    isAccessible: boolean;
    isOwner: boolean;
    isPrivate: boolean;
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
    <img
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
  const { lang, currentUser, openChannelModal, subscribedChannels, toggleSubscribeChannel, t } = useApp();

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

  useEffect(() => {
    setVideo(pickLocalized(initialVideo, effectiveLang));
    setRelatedItems(initialRelated || []);
  }, [initialVideo, initialRelated, effectiveLang]);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialVideo?.likesCount || 0);
  const [viewsCount, setViewsCount] = useState(initialVideo?.viewsCount || 0);
  const [descExpanded, setDescExpanded] = useState(false);
  const hasTrackedView = useRef(false);

  // Comment section state connected to Strapi
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const fallbackCreator = useMemo(() => {
    return { username: 'Omni Creator', handle: '@omni', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80', bio: 'Creator im Omni Network.' };
  }, []);

  const creator = video?.creator || video?.author || initialVideo?.creator || initialVideo?.author;
  const rawHandle = creator?.handle || video?.authorHandle || initialVideo?.authorHandle;
  const creatorName =
    creator?.username || creator?.name || video?.authorName || initialVideo?.authorName || (rawHandle ? rawHandle.replace(/^@/, '') : fallbackCreator.username);
  const creatorHandle = rawHandle ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`) : fallbackCreator.handle;
  const creatorAvatar =
    creator?.avatarUrl || creator?.avatar || video?.authorAvatar || initialVideo?.authorAvatar || fallbackCreator.avatarUrl;
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

  // Load comments for this video
  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const items = await fetchCommentsForSlug(slug, effectiveLang);
      setComments(items);
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [slug]);

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
      } catch (e) {}

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
    if (!hasTrackedView.current && el.currentTime >= 5 && video?.slug) {
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
        .catch(() => {});
    }
  };

  const handleLikeToggle = async () => {
    if (!video?.slug) return;
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
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
          localStorage.setItem('omni_user_likes', JSON.stringify([...storedLikes, video.slug]));
        }
      } catch (e) {}
    } else {
      showToast(t.common.likeRemoved);
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        localStorage.setItem(
          'omni_user_likes',
          JSON.stringify(storedLikes.filter((s) => s !== video.slug))
        );
      } catch (e) {}
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
    } catch (e) {}
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast(t.common.linkCopied);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    const authorName = currentUser?.username || 'Anonymer Zuseher';
    setIsSubmittingComment(true);

    try {
      const created = await createCommentInStrapi({
        feedSlug: slug,
        authorName,
        text: newCommentText.trim(),
        authorAvatar: currentUser?.avatarUrl,
      });

      if (created) {
        setComments((prev) => [created, ...prev]);
        setNewCommentText('');
        showToast(t.videoDetail.commentPublished);
      } else {
        showToast(t.videoDetail.commentPublishError);
      }
    } catch (err) {
      showToast(t.videoDetail.commentCreateError);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string | number) => {
    if (!editCommentText.trim()) return;
    try {
      const success = await updateCommentInStrapi(commentId, editCommentText.trim());
      if (success) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, text: editCommentText.trim() } : c))
        );
        setEditingCommentId(null);
        setEditCommentText('');
        showToast(t.videoDetail.commentUpdated);
      }
    } catch (e) {
      showToast(t.videoDetail.commentEditError);
    }
  };

  const handleDeleteComment = async (commentId: string | number) => {
    try {
      const success = await deleteCommentFromStrapi(commentId);
      if (success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        showToast(t.videoDetail.commentDeleted);
      }
    } catch (e) {
      showToast(t.videoDetail.commentDeleteError);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col font-['Hanken_Grotesk',sans-serif]">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 bg-slate-900/95 border border-indigo-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2">
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
        />
      )}

      <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-semibold"
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
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
              <CustomVideoPlayer
                mp4Url={video.mp4Url || video.mediaUrl}
                hlsUrl={video.hlsUrl}
                posterUrl={video.thumbnailUrl || '/media/thumbnails/default.png'}
                title={video.title}
                slug={slug}
                onTimeUpdate={handleVideoTimeUpdate}
                className="w-full h-full"
              />
            </div>

            {/* Video Details Header */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {video.title}
                </h1>
                {accessStatus?.isPrivate && accessStatus?.isOwner && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold">
                    {t.videoDetail.privatePreview}
                  </span>
                )}
              </div>

              {/* Views, Date & Interactive Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span>{viewsCount.toLocaleString()} {getDictionary(effectiveLang).common.views}</span>
                  </div>
                  {video.createdAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span>{formatRelativeDate(video.createdAt, effectiveLang)}</span>
                    </div>
                  )}
                </div>

                {/* Like, Share, Bookmark Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLikeToggle}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                      isLiked
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                    <span>{likesCount}</span>
                  </button>

                  {accessStatus?.isOwner && (
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">{t.header.settings}</span>
                    </button>
                  )}

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.common.share}</span>
                  </button>
                </div>
              </div>

              {/* Creator Channel Badge Bar */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div
                  onClick={() => openChannelModal(creator || fallbackCreator)}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <img
                    src={creatorAvatar}
                    alt={creatorName}
                    className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500/40 group-hover:scale-105 transition-transform"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-white text-sm group-hover:text-indigo-300 transition-colors">
                        {creatorName}
                      </h3>
                      <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{creatorHandle}</p>
                  </div>
                </div>

                <SubscribeButton
                  targetId={String(creator?.id || video?.creator?.id || video?.author?.id || 1)}
                  size="md"
                />
              </div>

              {/* Expandable Video Description */}
              {(video.summary || video.description || video.tags) && (() => {
                const descriptionText = (flattenBlocks(video.summary) || video.description || '').trim();
                const isLongDescription = descriptionText.length > 180 || descriptionText.includes('\n');

                return (
                  <div className="space-y-3 pt-2 border-t border-slate-800/60">
                    {descriptionText && (
                      <div>
                        <p
                          className={`text-sm text-slate-300 leading-relaxed ${
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

            {/* Comments Section */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">
                  {(t.videoDetail as any).comments || t.common.comments || 'Kommentare'} ({comments.length})
                </h2>
              </div>

              {/* New Comment Input Form */}
              <form onSubmit={handleAddComment} className="flex gap-3">
                <input
                  type="text"
                  placeholder={
                    currentUser
                      ? t.videoDetail.writeCommentPlaceholder
                      : t.videoDetail.writeCommentGuestPlaceholder
                  }
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 transition-all"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newCommentText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 transition-all flex items-center gap-2 shrink-0"
                >
                  {isSubmittingComment ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{t.common.send}</span>
                </button>
              </form>

              {/* Comments List */}
              {loadingComments ? (
                <div className="space-y-3 pt-2">
                  <div className="h-12 bg-slate-800/50 rounded-xl animate-pulse" />
                  <div className="h-12 bg-slate-800/30 rounded-xl animate-pulse" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-slate-500 text-xs py-4 text-center">
                  {t.videoDetail.noComments}
                </p>
              ) : (
                <div className="space-y-4 pt-2 divide-y divide-slate-800/60">
                  {comments.map((comment) => {
                    const isOwner = Boolean(comment.isCurrentUser || (currentUser?.username && comment.authorName === currentUser.username));
                    const isEditing = editingCommentId === comment.id;

                    return (
                      <div key={comment.id} className="pt-4 flex items-start gap-3">
                        <img
                          src={comment.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80'}
                          alt={comment.authorName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-200">
                              {comment.authorName}
                            </span>
                            {isOwner && !isEditing && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingCommentId(comment.id);
                                    setEditCommentText(comment.text);
                                  }}
                                  className="text-slate-400 hover:text-slate-200"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-slate-400 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                type="text"
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="flex-1 px-3 py-1 bg-slate-950 border border-indigo-500 rounded text-xs text-white"
                              />
                              <button
                                onClick={() => handleEditComment(comment.id)}
                                className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {comment.text}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Related Videos Sidebar */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400" />
              <span>{t.videoDetail.relatedRecommendations}</span>
            </h3>

            <div className="space-y-4">
              {relatedItems.map((rel: any) => {
                const relCreator = rel.creator?.username || rel.creator?.handle || rel.author?.username || rel.authorName || 'Omni Creator';
                return (
                  <Link
                    key={rel.documentId || rel.id}
                    href={`/video/${rel.slug}`}
                    className="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl overflow-hidden p-2 flex gap-3 transition-all"
                  >
                    <div className="relative aspect-video w-32 shrink-0 rounded-lg overflow-hidden bg-slate-950">
                      <CardThumbnail item={rel} />
                      {rel.duration && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono text-slate-200">
                          {formatDuration(rel.duration)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <h4 className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 line-clamp-2 transition-colors">
                        {rel.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{relCreator}</p>
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
