'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';
import { loadStoredAffinityGraph, getStoredJwt, jsonAuthHeaders } from '@/lib/affinity';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem,
} from '@/lib/comments';

interface ContentPageClientProps {
  initialItem: any;
  initialRelated?: any[];
  slug: string;
  accessStatus?: {
    isAccessible: boolean;
    isOwner: boolean;
    isPrivate: boolean;
  };
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

export default function ContentPageClient({
  initialItem,
  initialRelated = [],
  slug,
  accessStatus,
}: ContentPageClientProps) {
  const router = useRouter();
  const { lang, currentUser, toggleLanguage, openChannelModal, subscribedChannels, toggleSubscribeChannel, t } = useApp();

  const [item, setItem] = useState(initialItem);
  const [relatedItems, setRelatedItems] = useState<any[]>(initialRelated);

  useEffect(() => {
    setItem(initialItem);
    setRelatedItems(initialRelated || []);
  }, [initialItem, initialRelated]);

  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialItem?.likesCount || 0);
  const [viewsCount, setViewsCount] = useState(initialItem?.viewsCount || 0);
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

    loadComments();
  }, [slug, lang]);

  const loadComments = async () => {
    if (!slug) return;
    setLoadingComments(true);
    const fetched = await fetchCommentsForSlug(slug);
    setComments(fetched);
    setLoadingComments(false);
  };

  // Fetch initial interaction status & track article view after 3 seconds
  useEffect(() => {
    if (!item?.slug) return;
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
    setLikesCount((prev: number) => Math.max(0, nextIsLiked ? prev + 1 : prev - 1));

    if (nextIsLiked) {
      showToast(t.content.likeAdded);
    } else {
      showToast(t.content.likeRemoved);
    }

    try {
      const storedLikes = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
      if (nextIsLiked && !storedLikes.includes(item.slug)) {
        storedLikes.push(item.slug);
      } else if (!nextIsLiked) {
        const idx = storedLikes.indexOf(item.slug);
        if (idx > -1) storedLikes.splice(idx, 1);
      }
      localStorage.setItem('omni_user_likes', JSON.stringify(storedLikes));
    } catch (e) {}

    try {
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || '';
      const res = await fetch(`${strapiUrl}/api/feed/interaction`, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug: item.slug,
          type,
          userIdentifier: userIdent,
          targetType: 'content' // Make sure the fav is created if they like
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likesCount === 'number') {
          setLikesCount(data.likesCount);
        }
      }
    } catch (e) {
      console.error('Failed to sync like status', e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !slug) return;
    setIsSubmittingComment(true);

    const activeUser = currentUser || userData;
    const authorName = activeUser ? activeUser.username || activeUser.handle : 'Gast';
    const authorAvatar = activeUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
    const authorId = activeUser?.id;

    const result = await createCommentInStrapi({
      feedSlug: slug,
      text: newCommentText.trim(),
      authorName,
      authorAvatar,
    });

    if (result) {
      setComments([result, ...comments]);
      setNewCommentText('');
      showToast(t.common.comment || 'Kommentar hinzugefügt');
    } else {
      showToast('Ein Fehler ist aufgetreten');
    }
    setIsSubmittingComment(false);
  };

  const handleUpdateComment = async (id: string | number) => {
    if (!editCommentText.trim()) return;
    const result = await updateCommentInStrapi(id, editCommentText.trim());
    if (result) {
      setComments(comments.map((c) => (c.id === id ? { ...c, text: editCommentText.trim() } : c)));
      setEditingCommentId(null);
      setEditCommentText('');
      showToast(t.common.commentEdit || 'Kommentar aktualisiert');
    } else {
      showToast('Ein Fehler ist aufgetreten');
    }
  };

  const handleDeleteComment = async (id: string | number) => {
    if (!confirm('Wirklich löschen?')) return;
    const success = await deleteCommentFromStrapi(id);
    if (success) {
      setComments(comments.filter((c) => c.id !== id));
      showToast(t.common.commentDelete || 'Kommentar gelöscht');
    } else {
      showToast('Ein Fehler ist aufgetreten');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: item.summary || t.content.readTime || 'Lies jetzt',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(t.common.share || 'Link kopiert');
    }
  };

  const fallbackCreator = useMemo(() => {
    return { username: 'Omni Creator', handle: '@omni', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80', bio: 'Creator im Omni Network.' };
  }, []);

  const creator = item?.creator || item?.author || initialItem?.creator || initialItem?.author;
  const rawHandle = creator?.handle || item?.authorHandle || initialItem?.authorHandle;
  const authorName =
    creator?.username || creator?.name || item?.authorName || initialItem?.authorName || (rawHandle ? rawHandle.replace(/^@/, '') : fallbackCreator.username);
  const authorHandle = rawHandle ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`) : fallbackCreator.handle;
  const authorAvatar =
    creator?.avatarUrl || creator?.avatar || item?.authorAvatar || initialItem?.authorAvatar || fallbackCreator.avatarUrl;

  
  
  const readTime = Math.max(1, Math.ceil(((item.content || '').length + (item.summary || '').length) / 800));

  return (
    <div className="min-h-screen bg-[#060a16] text-[#dae2fd] font-sans selection:bg-[#8083ff]/30 selection:text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 mt-24 pb-32">

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm font-semibold text-[#8083ff] hover:text-[#a0a3ff] transition-colors bg-[#8083ff]/10 hover:bg-[#8083ff]/20 px-4 py-2 rounded-xl backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            {t.common.backToHome}
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-xl border transition-all ${
                isBookmarked
                  ? 'bg-[#8083ff] border-[#8083ff] text-white shadow-lg shadow-[#8083ff]/25'
                  : 'bg-[#121a30] border-white/8 text-[#dae2fd] hover:bg-[#192038]'
              }`}
              title={'Merken'}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-[#121a30] border border-white/8 text-[#dae2fd] hover:bg-[#192038] transition-all"
              title={t.common.share || 'Teilen'}
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isPreviewActive && (
          <div className="mb-6 bg-[#ffb783]/10 border border-[#ffb783]/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#ffb783]/20 rounded-full">
                <Eye className="h-4 w-4 text-[#ffb783]" />
              </div>
              <span className="text-sm font-bold text-[#ffb783]">{t.content.draftModeActive || 'Vorschau-Modus aktiv'}</span>
            </div>
            <a
              href="/api/exit-preview"
              className="px-4 py-2 rounded-xl bg-[#ffb783]/20 hover:bg-[#ffb783]/30 text-[#ffb783] text-xs font-bold transition-colors"
            >
              {t.content.exitPreview || 'Vorschau beenden'}
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Article Content */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[#0d1528] rounded-3xl border border-white/6 overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4 z-10 flex gap-2">
                {item.visibility === 'private' && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1.5">
                    <Check className="h-3 w-3" /> Exklusiv
                  </span>
                )}
                {item.aiRelevanceScore && item.aiRelevanceScore > 80 && (
                  <span className="bg-[#8083ff]/20 text-[#8083ff] border border-[#8083ff]/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> KI-Empfehlung
                  </span>
                )}
              </div>

              {/* Cover Image */}
              <div className="relative w-full aspect-[2/1] bg-black">
                <CardThumbnail item={item} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1528] via-[#0d1528]/40 to-transparent" />
              </div>

              <div className="p-8 -mt-20 relative z-10 flex flex-col gap-6">
                {/* Meta Tags */}
                <div className="flex flex-wrap gap-2">
                  <span className="bg-[#121a30]/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-[#44e2cd] uppercase tracking-wider border border-white/5 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Artikel
                  </span>
                  {(item.tags || []).slice(0, 3).map((tag: any, i: number) => {
                    const tagObj = typeof tag === 'object' && tag !== null ? tag : { name: tag, color: '#8083ff' };
                    return (
                      <span key={i} className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-mono text-[#9ba4bf] uppercase tracking-wider border border-white/5 flex items-center gap-1">
                        <Tag className="h-3 w-3 opacity-70" />
                        {tagObj.name}
                      </span>
                    );
                  })}
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white leading-[1.1] tracking-tight [text-wrap:balance]">
                  {item.title}
                </h1>

                {/* Article Meta Bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#9ba4bf] py-4 border-y border-white/5 bg-white/5 rounded-2xl px-5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#8083ff]" />
                    <span>{readTime} Min {'Lesezeit'}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[#44e2cd]" />
                    <span>{viewsCount} {t.common.views || 'Aufrufe'}</span>
                  </div>
                </div>

                {/* Author Strip */}
                <div className="flex items-center justify-between p-4 bg-[#121a30] rounded-2xl border border-white/5">
                  <div
                    onClick={() => openChannelModal(creator || fallbackCreator)}
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
                  </div>
                </div>

                {/* Highlight Callout */}
                {item.summary && (
                  <div className="bg-[#8083ff]/10 border border-[#8083ff]/25 p-5 rounded-2xl text-xs text-[#c0c1ff] font-semibold leading-relaxed shadow-inner">
                    💡 {item.summary}
                  </div>
                )}

                {/* Render Dynamic Components / Strapi Blocks */}
                {item.blocks && item.blocks.length > 0 ? (
                  <div className="space-y-6">
                    {item.blocks.map((block: any, idx: number) => {
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
