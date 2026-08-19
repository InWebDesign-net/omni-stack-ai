'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Check,
  X,
  Send,
  CornerDownRight,
  RefreshCw,
} from 'lucide-react';
import { CommentItem as CommentItemType } from '@/lib/comments';
import { useApp } from '@/context/AppContext';
import Image from 'next/image';

interface CommentItemProps {
  comment: CommentItemType;
  currentUser: any;
  onAddReply: (parentId: string | number, text: string) => Promise<boolean>;
  onEditComment: (commentId: string | number, text: string) => Promise<boolean>;
  onDeleteComment: (commentId: string | number) => Promise<boolean>;
  t: any;
}

export default function CommentItem({
  comment,
  currentUser,
  onAddReply,
  onEditComment,
  onDeleteComment,
  t,
}: CommentItemProps) {
  const { openChannelModal } = useApp();

  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const handleAuthorClick = () => {
    openChannelModal({
      username: comment.authorName,
      handle: comment.authorHandle,
      avatarUrl: comment.authorAvatar,
    });
  };

  const isOwner = Boolean(
    comment.isCurrentUser ||
      (currentUser?.username && comment.authorName === currentUser.username)
  );

  const repliesCount = comment.replies?.length || 0;
  const depth = comment.depth || 0;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    const success = await onAddReply(comment.id, replyText.trim());
    setIsSubmittingReply(false);

    if (success) {
      setReplyText('');
      setShowReplyForm(false);
      setShowReplies(true);
    }
  };

  const handleEditSubmit = async () => {
    if (!editText.trim()) return;
    const success = await onEditComment(comment.id, editText.trim());
    if (success) {
      setIsEditing(false);
    }
  };

  // Indentation & border styles based on depth
  const getDepthStyle = () => {
    if (depth === 0) return 'ml-0';
    if (depth === 1) return 'ml-3 sm:ml-6 border-l-2 border-slate-800/80 pl-3 sm:pl-4 mt-3';
    if (depth === 2) return 'ml-3 sm:ml-6 border-l-2 border-indigo-500/30 pl-3 sm:pl-4 mt-3';
    return 'ml-0 border-l border-slate-800/50 pl-2 mt-2';
  };

  return (
    <div
      id={`comment-${comment.id}`}
      data-comment-id={`comment-${comment.documentId}`}
      className={`space-y-3 transition-all scroll-mt-24 p-2 rounded-xl transition-all duration-700 ${getDepthStyle()}`}
    >
      <div className="flex items-start gap-2.5 sm:gap-3 group">
        <Image
          src={
            (isOwner && typeof currentUser?.avatarUrl !== 'undefined')
              ? (currentUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80')
              : (comment.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80')
          }
          alt={comment.authorName}
          loading="lazy"
          onClick={handleAuthorClick}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-700 hover:border-indigo-400 hover:scale-105 shrink-0 mt-0.5 cursor-pointer transition-all"
          title={`${comment.authorName} - Kanal anzeigen`}
          width={32}
          height={32}
          unoptimized
        />

        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <button
                type="button"
                onClick={handleAuthorClick}
                className="font-semibold text-xs text-slate-200 hover:text-indigo-300 transition-colors cursor-pointer truncate text-left"
              >
                {comment.authorName}
              </button>
              <span className="text-[10px] text-slate-500 font-mono">
                {comment.createdAt}
              </span>
              {comment.isEdited && (
                <span className="text-[9px] text-slate-500 italic">(bearbeitet)</span>
              )}
            </div>

            {isOwner && !isEditing && (
              <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-slate-400 hover:text-indigo-300 transition-colors"
                  title="Bearbeiten"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteComment(comment.id)}
                  className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Löschen"
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
                aria-label="Kommentar bearbeiten"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 px-3 py-1 bg-slate-950 border border-indigo-500/80 rounded-lg text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={handleEditSubmit}
                aria-label="Änderung speichern"
                title="Speichern"
                className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                aria-label="Abbrechen"
                title="Abbrechen"
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed break-words">
              {comment.text}
            </p>
          )}

          {/* Action Footer (Reply Button & Thread Toggle) */}
          <div className="flex items-center gap-4 pt-1 text-[11px] font-medium text-slate-400">
            <button
              type="button"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              <CornerDownRight className="w-3 h-3 text-indigo-400" />
              <span>{t?.videoDetail?.reply || 'Antworten'}</span>
            </button>

            {repliesCount > 0 && (
              <button
                type="button"
                onClick={() => setShowReplies(!showReplies)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-semibold"
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Antworten verbergen ({repliesCount})</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>{repliesCount} {repliesCount === 1 ? 'Antwort' : 'Antworten'} anzeigen</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Inline Reply Form */}
      {showReplyForm && (
        <form
          onSubmit={handleReplySubmit}
          className="ml-8 sm:ml-10 flex items-center gap-2 pt-1 animate-fadeIn"
        >
          <input
            type="text"
            aria-label="Antwort schreiben"
            placeholder={
              currentUser
                ? `Antwort an @${comment.authorName}...`
                : 'Als Gast antworten...'
            }
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-slate-950/80 border border-slate-800 focus:border-indigo-500/80 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
            autoFocus
          />
          <button
            type="submit"
            disabled={isSubmittingReply || !replyText.trim()}
            aria-label="Antwort senden"
            title="Senden"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0"
          >
            {isSubmittingReply ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Senden</span>
          </button>
          <button
            type="button"
            onClick={() => setShowReplyForm(false)}
            aria-label="Antwort abbrechen"
            title="Abbrechen"
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Child Replies Thread */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((childReply) => (
            <CommentItem
              key={childReply.id}
              comment={childReply}
              currentUser={currentUser}
              onAddReply={onAddReply}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}
