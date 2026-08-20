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
import { tracker } from '@/lib/tracking';
import { ContentInfo, ContentComments, RelatedContent } from './ContentComponents';
import CommentItem from '@/components/CommentItem';
import Image from 'next/image';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem as CommentItemType,
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
      <div className="w-full h-full bg-gradient-to-tr from-surface via-surface-raised to-base flex flex-col items-center justify-center gap-2 p-3 text-center">
        <div className="h-9 w-9 rounded-2xl bg-surface-raised border border-subtle flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-indigo-400" />
        </div>
        <span className="text-[10px] font-mono text-muted line-clamp-1">{item.title}</span>
      </div>
    );
  }

  return (
    <Image
      src={item.thumbnailUrl}
      alt={item.title}
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
  const { lang, currentUser, openAuthModal, toggleLanguage, openChannelModal, subscribedChannels, toggleSubscribeChannel, t } = useApp();

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
  const [comments, setComments] = useState<CommentItemType[]>([]);
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
    } catch (e) { /* corrupt or absent localStorage entry — falling back to defaults */ }

    loadComments();
  }, [slug, lang]);

  const loadComments = async () => {
    if (!slug) return;
    setLoadingComments(true);
    const fetched = await fetchCommentsForSlug(slug, lang);
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
      } catch (e) { /* corrupt or absent localStorage entry — falling back to defaults */ }

      try {
        const res = await fetch(`/api/feed/interaction-status?slug=${item.slug}&userIdentifier=${userIdent}`, {
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

    if (item?.slug) {
      const tags = Array.isArray(item.tags) && item.tags.length > 0
        ? item.tags
        : [item.category, item.title].filter(Boolean);
      tracker.track('view', tags, item.type || 'article', item.author?.id);
    }

    // Track view after reading for 3 seconds
    const timer = setTimeout(() => {
      if (!hasTrackedView.current) {
        hasTrackedView.current = true;
        const tags = Array.isArray(item.tags) && item.tags.length > 0
          ? item.tags
          : [item.category, item.title].filter(Boolean);
        tracker.track('view', tags, item.type || 'article', item.author?.id);

        fetch('/api/feed/interaction', {
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
          .catch((e) => { console.error('Unhandled promise rejection:', e); });
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
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const nextIsLiked = !isLiked;
    const type = nextIsLiked ? 'like' : 'unlike';
    setIsLiked(nextIsLiked);
    setLikesCount((prev: number) => Math.max(0, nextIsLiked ? prev + 1 : prev - 1));

    const tags = Array.isArray(item.tags) && item.tags.length > 0
      ? item.tags
      : [item.category, item.title].filter(Boolean);
    tracker.track(type, tags, item.type || 'article', item.author?.id);

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
    } catch (e) { /* localStorage unavailable (quota or private mode) — preference not persisted */ }

    try {
      const res = await fetch('/api/feed/interaction', {
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
      await loadComments();
      setNewCommentText('');
      showToast(t.common.comment || 'Kommentar hinzugefügt');
    } else {
      showToast('Ein Fehler ist aufgetreten');
    }
    setIsSubmittingComment(false);
  };

  const handleAddReply = async (parentId: string | number, text: string): Promise<boolean> => {
    try {
      const activeUser = currentUser || userData;
      const created = await createCommentInStrapi({
        feedSlug: slug,
        text,
        authorName: activeUser?.username || 'Gast',
        authorHandle: activeUser?.handle || '@gast',
        authorAvatar: activeUser?.avatarUrl,
        parentId,
      });

      if (created) {
        await loadComments();
        showToast('Antwort veröffentlicht!');
        return true;
      } else {
        showToast('Fehler beim Veröffentlichen der Antwort.');
        return false;
      }
    } catch (err) {
      showToast('Fehler beim Senden der Antwort.');
      return false;
    }
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
      }).catch((e) => { console.error('Unhandled promise rejection:', e); });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast(t.common.share || 'Link kopiert');
    }
  };

  const updateCommentInStrapi = async (id: string | number, text: string) => {
    try {
      const res = await fetch(`/api/comments?id=${id}`, {
        method: 'PUT',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ text }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  const deleteCommentFromStrapi = async (id: string | number) => {
    try {
      const res = await fetch(`/api/comments?id=${id}`, {
        method: 'DELETE',
        headers: jsonAuthHeaders(),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  const getAuthorName = (art: any) => {
    if (art?.creator?.username) return art.creator.username;
    if (art?.creator?.handle) return art.creator.handle;
    if (art?.authorName) return art.authorName;
    return 'Omni Creator';
  };

  const fallbackCreator = {
    username: item?.creator?.username || item?.authorName || 'Omni Creator',
    handle: item?.creator?.handle || '@omnicreator',
    avatarUrl: item?.creator?.avatarUrl || item?.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    bio: item?.creator?.bio || 'Omni Verified Content Creator & Writer.',
  };

  const creator = item?.creator || fallbackCreator;
  const authorName = getAuthorName(item);
  const authorHandle = creator?.handle || `@${authorName.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;

  const isAuthorOwner = Boolean(
    currentUser && (
      (creator?.id && String(creator.id) === String(currentUser.id)) ||
      (creator?.documentId && (currentUser as any)?.documentId && creator.documentId === (currentUser as any).documentId) ||
      (creator?.username && creator.username === currentUser.username) ||
      (authorName && authorName === currentUser.username)
    )
  );

  const rawAuthorAvatar =
    creator?.avatarUrl || creator?.avatar || item?.authorAvatar || initialItem?.authorAvatar || fallbackCreator.avatarUrl;
  const authorAvatar = (isAuthorOwner && typeof currentUser?.avatarUrl !== 'undefined')
    ? (currentUser.avatarUrl || rawAuthorAvatar)
    : rawAuthorAvatar;

  const readTime = Math.max(1, Math.ceil(((item.content || '').length + (item.summary || '').length) / 800));

  return (
    <div className="min-h-screen bg-base text-primary font-sans selection:bg-indigo-500/30">
      <Header />
      <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-xl backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            {t.common.backToHome}
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-xl border transition-all ${
                isBookmarked
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'bg-surface-raised border-subtle text-primary hover:bg-surface'
              }`}
              title={'Merken'}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-surface-raised border border-subtle text-primary hover:bg-surface transition-all"
              title={t.common.share || 'Teilen'}
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isPreviewActive && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-full">
                <Eye className="h-4 w-4 text-amber-400" />
              </div>
              <span className="text-sm font-bold text-amber-400">{t.content.draftModeActive || 'Vorschau-Modus aktiv'}</span>
            </div>
            <a
              href="/api/exit-preview"
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold transition-colors"
            >
              {t.content.exitPreview || 'Vorschau beenden'}
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Article Content */}
          <section className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-surface rounded-3xl border border-subtle overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4 z-10 flex gap-2">
                {item.visibility === 'private' && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1.5">
                    <Check className="h-3 w-3" /> Exklusiv
                  </span>
                )}
                {item.aiRelevanceScore && item.aiRelevanceScore > 80 && (
                  <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-lg flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> KI-Empfehlung
                  </span>
                )}
              </div>

              {/* Cover Image */}
              <div className="relative w-full aspect-[2/1] bg-black">
                <CardThumbnail item={item} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
              </div>

              <div className="p-8 -mt-20 relative z-10 flex flex-col gap-6">
                {/* Meta Tags */}
                <div className="flex flex-wrap gap-2">
                  <span className="bg-surface-raised/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-teal-400 uppercase tracking-wider border border-subtle flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Artikel
                  </span>
                  {(item.tags || []).slice(0, 3).map((tag: any, i: number) => {
                    const tagObj = typeof tag === 'object' && tag !== null ? tag : { name: tag, color: '#8083ff' };
                    return (
                      <span key={i} className="bg-surface-raised backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-mono text-muted uppercase tracking-wider border border-subtle flex items-center gap-1">
                        <Tag className="h-3 w-3 opacity-70" />
                        {tagObj.name}
                      </span>
                    );
                  })}
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-primary leading-[1.1] tracking-tight [text-wrap:balance]">
                  {item.title}
                </h1>

                {/* Article Meta Bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted py-4 border-y border-subtle bg-surface-raised rounded-2xl px-5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <span>{readTime} Min {'Lesezeit'}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-muted/40" />
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-teal-400" />
                    <span>{viewsCount} {t.common.views || 'Aufrufe'}</span>
                  </div>
                </div>

                {/* Author Strip */}
                <div className="flex items-center justify-between p-4 bg-surface-raised rounded-2xl border border-subtle">
                  <div
                    onClick={() => openChannelModal(creator || fallbackCreator)}
                    className="flex items-center gap-3 cursor-pointer group/author transition-all"
                    title={t.content.openProfileTitle.replace('{name}', authorName)}
                  >
                    <Image src={authorAvatar} alt={authorName} width={44} height={44} className="h-11 w-11 rounded-full object-cover border border-subtle group-hover/author:border-indigo-500 group-hover/author:scale-105 transition-all" unoptimized />
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold text-primary group-hover/author:text-teal-400 transition-colors">{authorName}</p>
                        <CheckCircle2 className="h-4 w-4 text-teal-400" />
                      </div>
                      <p className="text-xs font-mono text-indigo-400">{authorHandle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleLikeToggle}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isLiked
                          ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/25'
                          : 'bg-surface-raised border-subtle text-primary hover:bg-surface'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                      <span>{likesCount}</span>
                    </button>
                  </div>
                </div>

                {/* Highlight Callout */}
                {item.summary && (
                  <div className="bg-indigo-500/10 border border-indigo-500/25 p-5 rounded-2xl text-xs text-indigo-300 font-semibold leading-relaxed shadow-inner">
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
                          <div key={idx} className="text-sm text-primary leading-relaxed space-y-4 whitespace-pre-line">
                            {block.body}
                          </div>
                        );
                      }
                      if (comp === 'shared.headline' || block.title) {
                        return (
                          <h2 key={idx} className="text-xl font-bold text-primary mt-6 mb-2">
                            {block.title}
                          </h2>
                        );
                      }
                      if (comp === 'shared.quote' || block.quote) {
                        return (
                          <blockquote key={idx} className="border-l-4 border-indigo-500 pl-4 py-2 italic text-primary bg-indigo-500/5 rounded-r-2xl my-4">
                            <p className="text-sm">"{block.quote}"</p>
                            {block.author && <cite className="text-xs text-muted font-sans block mt-1">— {block.author}</cite>}
                          </blockquote>
                        );
                      }
                      if (comp === 'shared.media' || block.imageUrl) {
                        return (
                          <figure key={idx} className="my-4">
                            <Image src={block.imageUrl} alt={block.caption || ''} className="rounded-2xl border border-subtle w-full object-cover max-h-[500px]" />
                            {block.caption && <figcaption className="text-xs text-muted mt-2 text-center">{block.caption}</figcaption>}
                          </figure>
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-primary leading-relaxed space-y-4 whitespace-pre-line font-mono">
                    {item.content}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Comments Section */}
            <section className="bg-surface p-6 rounded-3xl border border-subtle flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-400" />
                  <span>{lang === 'de' ? `Kommentare (${comments.length})` : `Comments (${comments.length})`}</span>
                </h3>
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="flex gap-3">
                <Image
                  src={userData?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}
                  alt="Dein Avatar"
                  className="h-9 w-9 rounded-full object-cover border border-subtle shrink-0 mt-1"
                />
                <div className="flex-1 flex flex-col gap-2">
                  <textarea
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={t.common.commentPlaceholder}
                    rows={2}
                    className="w-full bg-base border border-subtle focus:border-indigo-500 rounded-xl p-3 text-xs text-primary placeholder-faint focus:outline-none resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newCommentText.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{t.common.comment}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Comment List */}
              {loadingComments ? (
                <div className="py-6 text-center text-xs text-muted">
                  {t.common.loadingComments}
                </div>
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">
                  {t.common.noCommentsYet}
                </div>
              ) : (
                <div className="flex flex-col gap-4 divide-y divide-subtle">
                  {comments.map((comment) => (
                    <div key={comment.id} className="pt-3">
                      <CommentItem
                        comment={comment}
                        currentUser={currentUser || userData}
                        onAddReply={handleAddReply}
                        onEditComment={async (id, text) => {
                          const ok = await updateCommentInStrapi(id, text);
                          if (ok) await loadComments();
                          return ok;
                        }}
                        onDeleteComment={async (id) => {
                          const ok = await deleteCommentFromStrapi(id);
                          if (ok) await loadComments();
                          return ok;
                        }}
                        t={t}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          {/* Right Sidebar: Recommended Articles */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>{t.common.moreArticles}</span>
            </h3>

            <div className="flex flex-col gap-3">
              {relatedItems.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/content/${rel.slug}`}
                  className="flex gap-3 bg-surface hover:bg-surface-raised p-2.5 rounded-2xl border border-subtle transition-all group"
                >
                  <div className="w-28 aspect-video rounded-xl overflow-hidden bg-black shrink-0 relative">
                    <CardThumbnail item={rel} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-primary group-hover:text-teal-400 transition-colors line-clamp-2 leading-snug">
                      {rel.title}
                    </h4>
                    <span className="text-[10px] font-mono text-muted mt-1">{getAuthorName(rel)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>

        </div>
      </main>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-raised/95 border border-indigo-500/40 text-primary px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold animate-bounceIn flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
