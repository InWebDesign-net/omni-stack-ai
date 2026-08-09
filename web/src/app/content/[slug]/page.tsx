'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Heart,
  Share2,
  Bookmark,
  CheckCircle2,
  Sparkles,
  Send,
  User,
  MessageSquare,
  Clock,
  Eye,
  ExternalLink,
  Download,
  Flame,
  FileCheck,
  Tag,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  UserPlus,
  Play,
} from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { FeedItem, FALLBACK_FEED_ITEMS, getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';
import { loadStoredAffinityGraph, getStoredJwt, jsonAuthHeaders } from '@/lib/affinity';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem,
} from '@/lib/comments';

function CardThumbnail({
  item,
  className = 'w-full h-full object-cover',
}: {
  item: { id?: string | number; title: string; mediaType: string; thumbnailUrl?: string };
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !item.thumbnailUrl) {
    return (
      <div className="w-full h-full bg-gradient-to-tr from-[#0d1528] via-[#161f38] to-[#251f42] flex flex-col items-center justify-center gap-2 p-3 text-center">
        <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-[#8083ff]" />
        </div>
        <span className="text-[10px] font-mono text-[#9ba4bf] line-clamp-1">{item.title}</span>
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

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [item, setItem] = useState<FeedItem | null>(null);
  const [relatedItems, setRelatedItems] = useState<FeedItem[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const hasTrackedView = useRef(false);

  // Comment section state connected to Strapi
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [userData, setUserData] = useState<{ id?: string | number; username: string; handle: string; avatarUrl: string } | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  const { lang, currentUser, toggleLanguage, openChannelModal, subscribedChannels, toggleSubscribeChannel, t } = useApp();

  const userIdent = useMemo(() => {
    return currentUser?.id ? `user-${currentUser.id}` : ((userData as any)?.id ? `user-${(userData as any).id}` : 'anon-session');
  }, [currentUser?.id, userData]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = urlParams.get('status');
      const hasCookie = document.cookie.includes('__prerender_bypass');
      setIsPreviewActive(statusParam === 'draft' || (hasCookie && statusParam !== 'published'));
    }

    try {
      const storedUser = localStorage.getItem('omni_user');
      if (storedUser) {
        setUserData(JSON.parse(storedUser));
      }
    } catch (e) {}

    fetchItemData(lang);
    loadComments();
  }, [slug, lang]);

  // Fetch initial interaction status & track article view after 3 seconds
  useEffect(() => {
    if (!item?.slug) return;
    setLikesCount(item.likesCount ?? 0);
    setViewsCount(item.viewsCount ?? 0);
    hasTrackedView.current = false;

    const checkInteraction = async () => {
      let localLiked = false;
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        if (storedLikes.includes(item.slug)) localLiked = true;
      } catch (e) {}

      try {
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || '';
        const res = await fetch(`${strapiUrl}/api/feed/interaction-status?slug=${item.slug}&userIdentifier=${userIdent}`, {
          headers: jsonAuthHeaders(),
        });
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

    // Track view after reading for 3 seconds
    const timer = setTimeout(() => {
      if (!hasTrackedView.current) {
        hasTrackedView.current = true;
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || '';
        fetch(`${strapiUrl}/api/feed/interaction`, {
          method: 'POST',
          headers: jsonAuthHeaders(),
          body: JSON.stringify({
            slug: item.slug,
            type: 'view',
            watchTimeSeconds: 3,
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
    }, 3000);

    return () => clearTimeout(timer);
  }, [item?.slug, userIdent]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLikeToggle = async () => {
    if (!item?.slug) return;
    const nextIsLiked = !isLiked;
    const type = nextIsLiked ? 'like' : 'unlike';
    setIsLiked(nextIsLiked);
    setLikesCount((prev) => Math.max(0, nextIsLiked ? prev + 1 : prev - 1));

    if (nextIsLiked) {
      showToast(t.content.likeAdded);
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        if (!storedLikes.includes(item.slug)) {
          localStorage.setItem('omni_user_likes', JSON.stringify([...storedLikes, item.slug]));
        }
      } catch (e) {}
    } else {
      showToast(t.content.likeRemoved);
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        localStorage.setItem('omni_user_likes', JSON.stringify(storedLikes.filter((s) => s !== item.slug)));
      } catch (e) {}
    }

    try {
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || '';
      const res = await fetch(`${strapiUrl}/api/feed/interaction`, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug: item.slug,
          type,
          userIdentifier: userIdent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likesCount === 'number') setLikesCount(data.likesCount);
      }
    } catch (e) {}
  };

  const fetchItemData = async (targetLang?: 'de' | 'en') => {
    const activeLang = targetLang || lang || 'de';
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const statusParam = urlParams ? urlParams.get('status') : null;
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('__prerender_bypass');
    const isBypass = statusParam === 'draft' || (hasCookie && statusParam !== 'published');

    const matchItem = (itemsList: FeedItem[], target: string) => {
      if (!target) return null;
      const norm = target.toLowerCase().trim();
      return (
        itemsList.find((i: any) => i.slug === norm || i.documentId === norm || String(i.id) === norm) ||
        itemsList.find((i: any) => i.slug && norm && (i.slug.includes(norm) || norm.includes(i.slug)))
      );
    };

    try {
      const savedProfile: any = loadStoredAffinityGraph() || { activePattern: 'discovery' };

      const res = await fetch('/api/strapi-feed', {
        method: 'POST',
        headers: {
          ...jsonAuthHeaders(),
          'Cache-Control': 'no-cache, no-store',
        },
        cache: 'no-store',
        body: JSON.stringify({ ...savedProfile, includeDrafts: isBypass, targetSlug: slug, locale: activeLang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.feed && data.feed.length > 0) {
          const targetItem = data.feed[0];
          if (targetItem) {
            setItem(targetItem);
            setLikesCount(targetItem.likesCount ?? 0);
            setViewsCount(targetItem.viewsCount ?? 0);
            setRelatedItems(data.feed.filter((i: FeedItem) => i.slug !== targetItem.slug && i.mediaType !== 'video' && i.mediaType !== 'short').slice(0, 5));
            if (targetItem.slug && targetItem.slug !== slug) {
              router.replace(`/content/${targetItem.slug}`);
            }
            return;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching item from Strapi API:', e);
    }

    // Offline fallback ONLY if Strapi API is unreachable
    const foundFallback = matchItem(FALLBACK_FEED_ITEMS, slug) || FALLBACK_FEED_ITEMS[0];
    setItem(foundFallback);
    setLikesCount(foundFallback.likesCount ?? 0);
    setViewsCount(foundFallback.viewsCount ?? 0);
    setRelatedItems(FALLBACK_FEED_ITEMS.filter((i) => i.slug !== foundFallback.slug && i.mediaType !== 'video' && i.mediaType !== 'short').slice(0, 5));
  };

  const loadComments = async () => {
    setLoadingComments(true);
    if (slug) {
      const fetched = await fetchCommentsForSlug(slug);
      setComments(fetched);
    }
    setLoadingComments(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment || !slug) return;

    setIsSubmittingComment(true);
    const authorName = userData?.username || 'Community User';
    const authorAvatar = userData?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';

    const created = await createCommentInStrapi({
      feedSlug: slug,
      text: newCommentText.trim(),
      authorName,
      authorAvatar,
    });

    if (created) {
      setComments((prev) => [created, ...prev]);
      setNewCommentText('');
    }
    setIsSubmittingComment(false);
  };

  const handleSaveEditComment = async (id: string | number) => {
    if (!editCommentText.trim()) return;
    const success = await updateCommentInStrapi(id, editCommentText.trim());
    if (success) {
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text: editCommentText.trim() } : c)));
      setEditingCommentId(null);
      setEditCommentText('');
    }
  };

  const handleDeleteComment = async (id: string | number) => {
    const success = await deleteCommentFromStrapi(id);
    if (success) {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  };

  if (!item) {
    return (
      <div className="min-h-screen bg-[#080e1e] flex flex-col">
        <Header lang={lang} onToggleLanguage={toggleLanguage} />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <RefreshCw className="h-8 w-8 text-[#8083ff] animate-spin" />
          <p className="text-sm font-mono text-[#9ba4bf]">Inhalte werden geladen...</p>
        </div>
      </div>
    );
  }

  const authorName = getAuthorName(item);
  const authorHandle = getAuthorHandle(item);
  const authorAvatar = getAuthorAvatar(item);

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col selection:bg-[#8083ff] selection:text-white">
      {/* Draft Mode Banner */}
      {isPreviewActive && (
        <div className="bg-[#8083ff] text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg z-50">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-spin" />
            <span>{t.content.draftModeActive}</span>
          </div>
          <a
            href={`/api/exit-preview?redirect=${encodeURIComponent(`/content/${slug}`)}`}
            className="bg-black/50 hover:bg-black/80 text-white px-3 py-1 rounded-lg font-bold text-[11px] border border-white/20 transition-all shrink-0"
          >
            {t.content.exitPreview}
          </a>
        </div>
      )}

      {/* Top Universal Header */}
      <Header
        lang={lang}
        onToggleLanguage={toggleLanguage}
        onOpenProfileModal={() => {
          if (userData) {
            openChannelModal({
              authorHandle: userData.handle,
              authorName: userData.username,
              authorAvatar: userData.avatarUrl,
            });
          }
        }}
      />

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Navigation & AI Relevance Sub-Header Bar */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/5">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d1528] hover:bg-[#121a30] text-xs font-semibold text-[#dae2fd] transition-all border border-white/8 hover:border-white/20 shadow-md group"
          >
            <ArrowLeft className="h-4 w-4 text-[#8083ff] group-hover:-translate-x-0.5 transition-transform" />
            <span>{t.common.backToHome}</span>
          </Link>

          {item && (
            <span className="text-xs font-mono font-bold text-[#44e2cd] bg-[#44e2cd]/10 border border-[#44e2cd]/20 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t.content.aiRelevance.replace('{score}', ((item.relevanceScore || 0.95) * 100).toFixed(0))}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
          {/* Main Article Canvas (8 Columns) */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[#0d1528] rounded-3xl border border-white/8 overflow-hidden shadow-2xl">
              
              {/* Hero Banner Image */}
              <div className="relative aspect-video w-full max-h-[420px] bg-black">
                <CardThumbnail item={item} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1528] via-[#0d1528]/40 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs text-[#44e2cd] font-mono">
                    <BookOpen className="h-4 w-4" />
                    <span>Dynamic Article</span>
                    <span>•</span>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t.content.readTime}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                    {item.title}
                  </h1>
                </div>
              </div>

              {/* Article Body Container */}
              <div className="p-6 sm:p-8 flex flex-col gap-6">
                
                {/* Author & Social Strip */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/6">
                  <div
                    onClick={() => openChannelModal({ handle: authorHandle, username: authorName, avatarUrl: authorAvatar })}
                    className="flex items-center gap-3 cursor-pointer group/author transition-all"
                    title={t.content.openProfileTitle.replace('{name}', authorName)}
                  >
                    <img src={authorAvatar} alt={authorName} className="h-11 w-11 rounded-full object-cover border border-white/10 group-hover/author:border-[#8083ff] group-hover/author:scale-105 transition-all" />
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-white group-hover/author:text-[#44e2cd] transition-colors">{authorName}</p>
                        <CheckCircle2 className="h-4 w-4 text-[#44e2cd]" />
                      </div>
                      <p className="text-xs font-mono text-[#8083ff]">{authorHandle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleLikeToggle}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isLiked
                          ? 'bg-[#ff6b81] border-[#ff6b81] text-white shadow-lg shadow-[#ff6b81]/25'
                          : 'bg-[#121a30] border-white/8 text-[#dae2fd] hover:bg-[#192038]'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      <span>{likesCount}</span>
                    </button>

                    <button
                      onClick={() => setIsBookmarked(!isBookmarked)}
                      className={`p-2.5 rounded-xl border transition-all ${
                        isBookmarked
                          ? 'bg-[#8083ff] border-[#8083ff] text-white'
                          : 'bg-[#121a30] border-white/8 text-[#9ba4bf] hover:text-white'
                      }`}
                      title="Speichern"
                    >
                      <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Highlight Callout */}
                {item.summary && (
                  <div className="bg-[#8083ff]/10 border border-[#8083ff]/25 p-5 rounded-2xl text-xs text-[#c0c1ff] font-semibold leading-relaxed shadow-inner">
                    💡 {item.summary}
                  </div>
                )}

                {/* Render Dynamic Components / Strapi Blocks */}
                {(item as any).blocks && (item as any).blocks.length > 0 ? (
                  <div className="space-y-6">
                    {(item as any).blocks.map((block: any, idx: number) => {
                      const comp = block.__component || '';
                      if (comp === 'shared.rich-text' || block.body) {
                        return (
                          <div key={idx} className="text-sm text-[#dae2fd] leading-relaxed space-y-4 whitespace-pre-line">
                            {block.body}
                          </div>
                        );
                      }
                      if (comp === 'shared.headline' || block.title) {
                        return (
                          <h2 key={idx} className="text-xl font-bold text-white mt-6 mb-2">
                            {block.title}
                          </h2>
                        );
                      }
                      if (comp === 'shared.quote' || block.quote) {
                        return (
                          <blockquote key={idx} className="border-l-4 border-[#8083ff] pl-4 py-2 italic text-white bg-[#8083ff]/5 rounded-r-2xl my-4">
                            <p className="text-sm">"{block.quote}"</p>
                            {block.author && <cite className="text-xs text-[#9ba4bf] font-sans block mt-1">— {block.author}</cite>}
                          </blockquote>
                        );
                      }
                      if (comp === 'shared.media' || block.imageUrl) {
                        return (
                          <figure key={idx} className="my-4">
                            <img src={block.imageUrl} alt={block.caption || ''} className="rounded-2xl border border-white/10 w-full object-cover max-h-[500px]" />
                            {block.caption && <figcaption className="text-xs text-[#9ba4bf] mt-2 text-center">{block.caption}</figcaption>}
                          </figure>
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-[#dae2fd] leading-relaxed space-y-4 whitespace-pre-line font-mono">
                    {item.content}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Comments Section */}
            <section className="bg-[#0d1528] p-6 rounded-3xl border border-white/6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#8083ff]" />
                  <span>{lang === 'de' ? `Kommentare (${comments.length})` : `Comments (${comments.length})`}</span>
                </h3>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-3">
                <img
                  src={userData?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}
                  alt="Dein Avatar"
                  className="h-9 w-9 rounded-full object-cover border border-white/10 shrink-0 mt-1"
                />
                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={t.common.commentPlaceholder}
                    rows={2}
                    className="w-full bg-[#080e1e] border border-white/10 focus:border-[#8083ff]/60 rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newCommentText.trim()}
                      className="px-4 py-2 rounded-xl bg-[#8083ff] hover:bg-[#6b6eff] text-white font-extrabold text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-[#8083ff]/20"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{t.common.comment}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Comment List */}
              {loadingComments ? (
                <div className="py-6 text-center text-xs text-[#9ba4bf]">
                  {t.common.loadingComments}
                </div>
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9ba4bf]">
                  {t.common.noCommentsYet}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 bg-[#080e1e]/60 p-4 rounded-2xl border border-white/4">
                      <img
                        src={comment.authorAvatar}
                        alt={comment.authorName}
                        className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0"
                      />
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{comment.authorName}</span>
                          <span className="text-[10px] font-mono text-[#5c657d]">{comment.createdAt || t.common.justNow}</span>
                        </div>
                        <p className="text-xs text-[#dae2fd] leading-relaxed mt-0.5">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          {/* Right Sidebar: Recommended Articles */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#ffb783]" />
              <span>{t.common.moreArticles}</span>
            </h3>

            <div className="flex flex-col gap-3">
              {relatedItems.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/content/${rel.slug}`}
                  className="flex gap-3 bg-[#0d1528] hover:bg-[#121a30] p-2.5 rounded-2xl border border-white/6 hover:border-white/15 transition-all group"
                >
                  <div className="w-28 aspect-video rounded-xl overflow-hidden bg-black shrink-0 relative">
                    <CardThumbnail item={rel} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-[#44e2cd] transition-colors line-clamp-2 leading-snug">
                      {rel.title}
                    </h4>
                    <span className="text-[10px] font-mono text-[#9ba4bf] mt-1">{getAuthorName(rel)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>

        </div>
      </main>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#121a30]/95 border border-[#8083ff]/40 text-white px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold animate-bounceIn flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
