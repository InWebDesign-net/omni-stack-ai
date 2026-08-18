'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Heart, Share2, Bookmark, Send, MessageSquare, Eye, Clock,
  Pencil, Trash2, Check, X, ExternalLink, Download, Tag,
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/date';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem as CommentItemType,
} from '@/lib/comments';

interface ContentInfoProps {
  item: any;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  isLiked: boolean;
  likesCount: number;
  viewsCount: number;
  isSubscribed: boolean;
  isBookmarked: boolean;
  commentsCount: number;
  descExpanded: boolean;
  onToggleLike: () => void;
  onToggleSubscribe: () => void;
  onToggleBookmark: () => void;
  onToggleDesc: () => void;
  onShare: () => void;
  onOpenChannel: () => void;
  onDownload?: () => void;
  onOpenExternal?: () => void;
  showToast: (msg: string) => void;
  t?: any;
}

export function ContentInfo({
  item,
  authorName,
  authorHandle,
  authorAvatar,
  isLiked,
  likesCount,
  viewsCount,
  isSubscribed,
  isBookmarked,
  commentsCount,
  descExpanded,
  onToggleLike,
  onToggleSubscribe,
  onToggleBookmark,
  onToggleDesc,
  onShare,
  onOpenChannel,
  onDownload,
  onOpenExternal,
  showToast,
  t,
}: ContentInfoProps) {
  const summary = item?.summary || '';
  const truncated = summary.length > 200 ? `${summary.slice(0, 200)}...` : summary;

  return (
    <div className="space-y-4">
      {/* Title */}
      <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
        {item?.title}
      </h1>

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          {viewsCount} {t?.common?.views || 'Aufrufe'}
        </span>
        <span className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5" />
          {likesCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" />
          {commentsCount} {t?.common?.comments || 'Kommentare'}
        </span>
        {item?.createdAt && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatRelativeDate(item.createdAt, 'de')}
          </span>
        )}
      </div>

      {/* Description */}
      {summary && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">
            {descExpanded ? summary : truncated}
          </p>
          {summary.length > 200 && (
            <button
              onClick={onToggleDesc}
              className="mt-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              {descExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  {t?.common?.showLess || 'Weniger anzeigen'}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  {t?.common?.showMore || 'Mehr anzeigen'}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Author & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <button
          onClick={onOpenChannel}
          className="flex items-center gap-3 hover:bg-white/5 rounded-xl p-2 -ml-2 transition-colors"
        >
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-10 h-10 rounded-full object-cover border-2 border-slate-700"
          />
          <div className="text-left">
            <div className="text-sm font-bold text-white">{authorName}</div>
            <div className="text-xs text-slate-400">{authorHandle}</div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSubscribe}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isSubscribed
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {isSubscribed ? (t?.common?.subscribed || 'Abonniert') : (t?.common?.subscribe || 'Abonnieren')}
          </button>
          <button
            onClick={onToggleLike}
            className={`p-2.5 rounded-xl transition-all ${
              isLiked ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onToggleBookmark}
            className={`p-2.5 rounded-xl transition-all ${
              isBookmarked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onShare}
            className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {item?.downloadUrl && (
            <button
              onClick={onDownload}
              className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          {item?.externalUrl && (
            <button
              onClick={onOpenExternal}
              className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import { ChevronDown, ChevronUp } from 'lucide-react';

interface ContentCommentsProps {
  slug: string;
  lang: string;
  currentUser?: any;
  onOpenAuth: () => void;
  showToast: (msg: string) => void;
  t?: any;
}

export function ContentComments({
  slug,
  lang,
  currentUser,
  onOpenAuth,
  showToast,
  t,
}: ContentCommentsProps) {
  const [comments, setComments] = useState<CommentItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editText, setEditText] = useState('');

  const loadComments = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const fetched = await fetchCommentsForSlug(slug, lang as 'de' | 'en');
      setComments(fetched);
    } catch (e) {
      console.error('Failed to load comments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [slug, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!newComment.trim()) return;
    setSubmitting(true);
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
        showToast(t?.common?.commentAdded || 'Kommentar hinzugefügt');
      }
    } catch (e) {
      console.error('Failed to create comment:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string | number, text: string) => {
    try {
      await updateCommentInStrapi(commentId, text);
      setComments(comments.map((c) => (c.id === commentId ? { ...c, content: text } : c)));
      setEditingId(null);
      showToast(t?.common?.commentUpdated || 'Kommentar aktualisiert');
    } catch (e) {
      console.error('Failed to update comment:', e);
    }
  };

  const handleDelete = async (commentId: string | number) => {
    try {
      await deleteCommentFromStrapi(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
      showToast(t?.common?.commentDeleted || 'Kommentar gelöscht');
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        {t?.common?.comments || 'Kommentare'} ({comments.length})
      </h3>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={currentUser ? (t?.common?.writeComment || 'Kommentar schreiben...') : (t?.common?.loginToComment || 'Anmelden zum Kommentieren...')}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={submitting || !newComment.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">{t?.common?.loading || 'Laden...'}</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-slate-500">{t?.common?.noComments || 'Noch keine Kommentare'}</div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={comment.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}
                    alt={comment.authorName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs font-semibold text-white">{comment.authorName}</span>
                  <span className="text-[10px] text-slate-500">{comment.createdAt}</span>
                </div>
                {currentUser && comment.isCurrentUser && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditText(comment.text);
                      }}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              {editingId === comment.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-sm text-white"
                  />
                  <button
                    onClick={() => handleEdit(comment.id, editText)}
                    className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-300">{comment.text}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface RelatedContentProps {
  items: any[];
  t?: any;
}

export function RelatedContent({ items, t }: RelatedContentProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Tag className="w-5 h-5 text-indigo-400" />
        {t?.common?.relatedContent || 'Ähnliche Inhalte'}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => (
          <Link
            key={item.slug || item.id}
            href={`/content/${item.slug}`}
            className="group relative bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all"
          >
            <div className="relative aspect-video bg-slate-950">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-[#0d1528] via-[#161f38] to-[#251f42] flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-[#8083ff]" />
                </div>
              )}
            </div>
            <div className="p-2">
              <h4 className="text-xs font-semibold text-white line-clamp-2 group-hover:text-indigo-300 transition-colors">
                {item.title}
              </h4>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                <span>{item.author?.username || item.authorName || 'Omni Creator'}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { BookOpen } from 'lucide-react';
