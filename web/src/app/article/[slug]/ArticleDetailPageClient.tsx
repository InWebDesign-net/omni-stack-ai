'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Heart, Share2, Bookmark, Eye, Clock, MessageSquare,
  BookOpen, User as UserIcon, Play,
} from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { jsonAuthHeaders } from '@/lib/affinity';
import { tracker } from '@/lib/tracking';
import { ArticleBlockRenderer } from '@/components/article/ArticleBlockRenderer';
import { fetchCommentsForSlug, createCommentInStrapi, updateCommentInStrapi, deleteCommentFromStrapi } from '@/lib/comments';

export default function ArticleDetailPageClient({ initialItem, slug }: { initialItem: any; slug: string }) {
  const { t, lang, currentUser, openAuthModal } = useApp();
  const [item] = useState(initialItem);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialItem?.likesCount || 0);
  const [viewsCount, setViewsCount] = useState(initialItem?.viewsCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const creator = item?.creator;
  const creatorName = creator?.username || creator?.name || item?.authorName || 'Omni Creator';
  const creatorHandle = creator?.handle || item?.authorHandle || '@omni';
  const creatorAvatar = creator?.avatarUrl || creator?.avatar || item?.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';

  useEffect(() => {
    if (!slug) return;

    const loadComments = async () => {
      try {
        const items = await fetchCommentsForSlug(slug, lang);
        setComments(items);
      } catch (e) {
        console.error('Failed to load comments:', e);
      }
    };
    loadComments();

    if (item?.tags) {
      tracker.track('view', item.tags, item.type || 'article', creator?.id);
    }
  }, [slug, lang, item?.tags, creator?.id]);

  const handleLikeToggle = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikesCount((prev: number) => Math.max(0, nextIsLiked ? prev + 1 : prev - 1));

    try {
      await fetch('/api/feed/interaction', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug: item.slug,
          type: nextIsLiked ? 'like' : 'unlike',
          userIdentifier: `user-${currentUser.id}`,
          targetType: 'article',
        }),
      });
    } catch (e) {
      console.error('Failed to sync like:', e);
    }
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast(t.common?.linkCopied || 'Link kopiert!');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const created = await createCommentInStrapi({
        feedSlug: slug,
        text: newComment.trim(),
        authorName: currentUser?.username || 'Gast',
        authorAvatar: currentUser?.avatarUrl,
      });
      if (created) {
        setComments([created, ...comments]);
        setNewComment('');
        showToast(t.common?.commentAdded || 'Kommentar hinzugefügt');
      }
    } catch (e) {
      showToast(t.common?.commentError || 'Fehler');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!item) {
    return (
      <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex items-center justify-center">
        <p>{t.article?.notFound || 'Artikel nicht gefunden'}</p>
      </div>
    );
  }

  const summary = typeof item.summary === 'string'
    ? item.summary
    : item.summary
        ?.map((b: any) => b.children?.map((c: any) => c.text).join('') || '')
        .filter(Boolean)
        .join(' ');

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] font-sans">
      <Header />

      <main className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        {/* Back Button */}
        <Link href="/articles" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {t.common?.back || 'Zurück'}
        </Link>

        {/* Hero Header */}
        <header className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            {item.title}
          </h1>

          {/* Meta Row */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {viewsCount} {t.common?.views || 'Aufrufe'}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {likesCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {comments.length} {t.common?.comments || 'Kommentare'}
            </span>
            {item.createdAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDate(item.createdAt)}
              </span>
            )}
          </div>

          {/* Creator */}
          <div className="flex items-center gap-3">
            <img
              src={creatorAvatar}
              alt={creatorName}
              className="w-10 h-10 rounded-full object-cover border-2 border-slate-700"
            />
            <div>
              <div className="text-sm font-bold text-white">{creatorName}</div>
              <div className="text-xs text-slate-400">{creatorHandle}</div>
            </div>
          </div>
        </header>

        {/* Thumbnail */}
        {item.thumbnail && (
          <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden">
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <p className="text-sm text-slate-300 italic leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Content Blocks */}
        <article className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 sm:p-6">
          <ArticleBlockRenderer blocks={item.content || item.blocks || []} />
        </article>

        {/* Actions Bar */}
        <div className="flex items-center gap-3 sticky bottom-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3">
          <button
            onClick={handleLikeToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              isLiked ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-semibold">{likesCount}</span>
          </button>
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              isBookmarked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Comments Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
            {t.common?.comments || 'Kommentare'} ({comments.length})
          </h3>

          <form onSubmit={handleCommentSubmit} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={currentUser ? (t.common?.writeComment || 'Kommentar schreiben...') : (t.common?.loginToComment || 'Anmelden zum Kommentieren...')}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !newComment.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </form>

          {comments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">{t.common?.noComments || 'Noch keine Kommentare'}</div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      src={comment.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}
                      alt={comment.authorName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <span className="text-xs font-semibold text-white">{comment.authorName}</span>
                    <span className="text-[10px] text-slate-500">{comment.createdAt}</span>
                  </div>
                  <p className="text-sm text-slate-300">{comment.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-indigo-500/40 text-white px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-semibold">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
