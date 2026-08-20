'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Loader2, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import CommentItem from '@/components/CommentItem';
import {
  CommentItem as CommentItemType,
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
} from '@/lib/comments';
import Image from 'next/image';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

interface UnifiedCommentsSectionProps {
  slug: string;
  lang?: string;
  t?: any;
  accentColor?: string; // e.g. "indigo", "teal", "purple"
  onCommentsCountChange?: (count: number) => void;
}

export function UnifiedCommentsSection({
  slug,
  lang = 'de',
  t,
  accentColor = 'indigo',
  onCommentsCountChange,
}: UnifiedCommentsSectionProps) {
  const { currentUser, openAuthModal, t: globalT } = useApp();
  const translations = t || globalT;

  const [commentsTree, setCommentsTree] = useState<CommentItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadComments = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const items = await fetchCommentsForSlug(slug, lang as 'de' | 'en');
      setCommentsTree(items);
      if (onCommentsCountChange) {
        onCommentsCountChange(countTotalComments(items));
      }
    } catch (e) {
      console.error('Failed to load comments for slug:', slug, e);
    } finally {
      setLoading(false);
    }
  }, [slug, lang, onCommentsCountChange]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Deep-link scroll to target comment if #comment-123 is present in URL
  useEffect(() => {
    if (typeof window === 'undefined' || !commentsTree.length) return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#comment-')) {
      const targetId = hash.replace('#', '');
      let el = document.getElementById(targetId);
      if (!el) {
        el = document.querySelector(`[data-comment-id="${targetId}"]`);
      }
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-indigo-500', 'bg-indigo-500/20', 'shadow-2xl');
          setTimeout(() => {
            el.classList.remove('ring-2', 'ring-indigo-500', 'bg-indigo-500/20', 'shadow-2xl');
          }, 3500);
        }, 300);
      }
    }
  }, [commentsTree]);

  const handleRootSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal();
      return;
    }
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await createCommentInStrapi({
        feedSlug: slug,
        text: newCommentText.trim(),
        authorName: currentUser.username || 'Gast',
        authorHandle: currentUser.handle || '@gast',
        authorAvatar: currentUser.avatarUrl,
      });

      if (created) {
        setNewCommentText('');
        await loadComments();
        showToast(translations?.common?.commentAdded || 'Kommentar veröffentlicht');
      } else {
        showToast(translations?.common?.commentError || 'Fehler beim Erstellen');
      }
    } catch (e) {
      console.error('Failed to create comment:', e);
      showToast(translations?.common?.commentError || 'Fehler beim Erstellen');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (parentId: string | number, text: string): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal();
      return false;
    }
    try {
      const created = await createCommentInStrapi({
        feedSlug: slug,
        text,
        authorName: currentUser.username || 'Gast',
        authorHandle: currentUser.handle || '@gast',
        authorAvatar: currentUser.avatarUrl,
        parentId,
      });
      if (created) {
        await loadComments();
        showToast(translations?.common?.replyAdded || 'Antwort veröffentlicht');
        return true;
      }
    } catch (e) {
      console.error('Failed to add reply:', e);
    }
    return false;
  };

  const handleEditComment = async (commentId: string | number, text: string): Promise<boolean> => {
    try {
      const success = await updateCommentInStrapi(commentId, text);
      if (success) {
        await loadComments();
        showToast(translations?.common?.commentUpdated || 'Kommentar aktualisiert');
        return true;
      }
    } catch (e) {
      console.error('Failed to edit comment:', e);
    }
    return false;
  };

  const handleDeleteComment = async (commentId: string | number): Promise<boolean> => {
    try {
      const success = await deleteCommentFromStrapi(commentId);
      if (success) {
        await loadComments();
        showToast(translations?.common?.commentDeleted || 'Kommentar gelöscht');
        return true;
      }
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
    return false;
  };

  // Count total comments including nested replies
  const countTotalComments = (items: CommentItemType[]): number => {
    let count = 0;
    for (const item of items) {
      count += 1;
      if (item.replies && item.replies.length > 0) {
        count += countTotalComments(item.replies);
      }
    }
    return count;
  };

  const totalCount = countTotalComments(commentsTree);

  return (
    <div className="bg-surface border border-subtle rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed bottom-24 right-6 z-50 bg-surface-raised border border-indigo-500/40 text-primary px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs font-semibold animate-fadeIn">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <h3 className="text-base sm:text-lg font-extrabold text-primary flex items-center gap-2">
          <MessageSquare className={`w-5 h-5 text-${accentColor}-400`} />
          <span>{translations?.common?.comments || 'Kommentare'}</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-surface-raised text-muted border border-subtle">
            {totalCount}
          </span>
        </h3>
        <button
          type="button"
          onClick={loadComments}
          title="Kommentare neu laden"
          className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-surface-raised transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Root Comment Form */}
      <form onSubmit={handleRootSubmit} className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-subtle mt-1">
            <Image
              src={resolveAvatarUrl(currentUser?.avatarUrl)}
              alt={currentUser?.username || 'Avatar'}
              width={32}
              height={32}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <div className="flex-1 relative">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={
                currentUser
                  ? (translations?.common?.writeComment || 'Schreibe einen Kommentar...')
                  : (translations?.common?.loginToComment || 'Anmelden zum Kommentieren...')
              }
              rows={2}
              className="w-full bg-base border border-subtle focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-sm text-primary placeholder-faint outline-none transition-all resize-y"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newCommentText.trim()}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-surface-raised disabled:opacity-40 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{translations?.common?.sendComment || 'Veröffentlichen'}</span>
          </button>
        </div>
      </form>

      {/* Comments List / Tree */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          <span>{translations?.common?.loadingComments || 'Lade Kommentare...'}</span>
        </div>
      ) : commentsTree.length === 0 ? (
        <div className="text-center py-12 bg-surface/40 rounded-2xl border border-subtle p-6 space-y-2">
          <MessageSquare className="w-10 h-10 text-muted mx-auto" />
          <p className="text-sm font-semibold text-primary">
            {translations?.common?.noCommentsTitle || 'Noch keine Kommentare'}
          </p>
          <p className="text-xs text-muted">
            {translations?.common?.noCommentsDesc || 'Sei der Erste, der seine Gedanken zu diesem Beitrag teilt!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {commentsTree.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onAddReply={handleAddReply}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
              t={translations}
            />
          ))}
        </div>
      )}
    </div>
  );
}
