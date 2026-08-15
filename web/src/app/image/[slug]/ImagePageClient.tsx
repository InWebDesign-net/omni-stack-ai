'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Share2,
  Sparkles,
  Send,
  Eye,
  Maximize2,
  Download,
  Image as ImageIcon,
  User as UserIcon,
  Tag,
} from 'lucide-react';
import Header from '@/components/Header';
import SubscribeButton from '@/components/SubscribeButton';
import ChannelProfileModal from '@/components/ChannelProfileModal';
import { useApp } from '@/context/AppContext';
import { useImages } from '@/lib/hooks/useImages';
import { getRotatedRecommendations } from '@/lib/recommendations';
import { jsonAuthHeaders } from '@/lib/affinity';
import { formatRelativeDate } from '@/lib/date';
import CommentItem from '@/components/CommentItem';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem as CommentItemType,
} from '@/lib/comments';

interface ImagePageClientProps {
  initialImage: any;
  initialRelated?: any[];
  slug: string;
}

export default function ImagePageClient({
  initialImage,
  initialRelated = [],
  slug,
}: ImagePageClientProps) {
  const router = useRouter();
  const { currentUser, openAuthModal, lang, t } = useApp();
  const [image, setImage] = useState<any>(initialImage);

  // Stats
  const [likesCount, setLikesCount] = useState<number>(initialImage?.likesCount || 0);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [viewsCount, setViewsCount] = useState<number>(initialImage?.viewsCount || 0);

  // Fullscreen Viewer
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Channel Profile Modal
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  // Comments
  const [commentsTree, setCommentsTree] = useState<CommentItemType[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Related Recommendations Hook with excludeSlug & rotation
  const { images: hookRelated = [] } = useImages({
    pageSize: 12,
    excludeSlug: slug,
    sort: currentUser ? 'affinity' : 'createdatasc',
    lang,
    enabled: true,
  });

  const displayRelated = getRotatedRecommendations(
    hookRelated.length > 0 ? hookRelated : initialRelated,
    slug,
    6
  );

  useEffect(() => {
    loadComments();
    trackView();
  }, [slug]);

  const loadComments = async () => {
    setIsLoadingComments(true);
    try {
      const tree = await fetchCommentsForSlug(slug);
      setCommentsTree(tree);
    } catch (e) {
      console.error('Error loading comments:', e);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const trackView = async () => {
    try {
      setViewsCount((prev) => prev + 1);
    } catch (e) {}
  };

  const handleLike = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikesCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!currentUser) {
      openAuthModal();
      return;
    }

    setIsSubmittingComment(true);
    try {
      const newComment = await createCommentInStrapi({
        text: commentText.trim(),
        feedSlug: slug,
        authorName: currentUser.username,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatarUrl,
      });

      if (newComment) {
        setCommentsTree((prev) => [newComment, ...prev]);
        setCommentText('');
      }
    } catch (e) {
      console.error('Error posting comment:', e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleReplySubmit = async (parentCommentId: number | string, text: string): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal();
      return false;
    }
    const created = await createCommentInStrapi({
      text: text,
      feedSlug: slug,
      authorName: currentUser.username,
      authorHandle: currentUser.handle,
      authorAvatar: currentUser.avatarUrl,
      parentId: parentCommentId,
    });
    if (created) {
      await loadComments();
      return true;
    }
    return false;
  };

  const handleEditComment = async (commentId: number | string, text: string) => {
    const updated = await updateCommentInStrapi(commentId, text);
    if (updated) loadComments();
  };

  const handleDeleteComment = async (commentId: number | string) => {
    const success = await deleteCommentFromStrapi(commentId);
    if (success) loadComments();
  };

  const creatorObj = image?.creator || { username: 'Omni Creator', handle: '@omni' };

  const handleOpenChannel = (creator: any) => {
    setSelectedChannel({
      id: creator.id || 1,
      documentId: creator.documentId,
      username: creator.username || 'Omni Creator',
      handle: creator.handle || `@${(creator.username || 'creator').toLowerCase()}`,
      avatarUrl: creator.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      bio: creator.bio || 'Omni Network Content Creator',
      subscribersCount: creator.subscribersCount || 128,
    });
    setIsChannelModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col font-sans selection:bg-[#8083ff] selection:text-white">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zur Galerie</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Image Display & Metadata (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Viewer Container */}
            <div className="relative bg-[#0d1528] border border-white/10 rounded-3xl overflow-hidden shadow-2xl group">
              <div className="relative flex items-center justify-center min-h-[400px] max-h-[70vh] bg-slate-950 p-4">
                <img
                  src={image?.imageUrl || image?.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80'}
                  alt={image?.title || 'Omni Image'}
                  className="max-h-[65vh] w-auto object-contain rounded-xl shadow-2xl"
                />

                {/* Overlay actions */}
                <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/15 hover:bg-black/80 transition-colors"
                    aria-label="Vollbild"
                    title="Vollbild"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  {image?.imageUrl && (
                    <a
                      href={image.imageUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/15 hover:bg-black/80 transition-colors"
                      aria-label="Herunterladen"
                      title="Herunterladen"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Title & Action Bar */}
              <div className="p-6 bg-slate-900/60 border-t border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                    {image?.title}
                  </h1>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md ${
                        isLiked
                          ? 'bg-rose-500 text-white shadow-rose-500/20'
                          : 'bg-slate-800/80 border border-slate-700 text-slate-200 hover:border-rose-500/50'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : 'text-rose-400'}`} />
                      <span>{likesCount}</span>
                    </button>
                  </div>
                </div>

                {/* Creator Header */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <img
                      src={creatorObj.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80'}
                      alt={creatorObj.username}
                      onClick={() => handleOpenChannel(creatorObj)}
                      className="w-10 h-10 rounded-full object-cover border border-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                    <div className="flex flex-col">
                      <span
                        onClick={() => handleOpenChannel(creatorObj)}
                        className="font-extrabold text-sm text-white hover:text-teal-400 cursor-pointer transition-colors"
                      >
                        {creatorObj.username}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {creatorObj.handle || `@${(creatorObj.username || 'creator').toLowerCase()}`}
                      </span>
                    </div>
                  </div>

                  <SubscribeButton targetId={creatorObj.handle || creatorObj.documentId || String(creatorObj.id || '1')} />
                </div>

                {/* Description & Tags */}
                {image?.summary && (
                  <div className="pt-2 text-xs text-slate-300 leading-relaxed font-normal">
                    {image.summary}
                  </div>
                )}

                {image?.tags && image.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {image.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-xl bg-slate-800/90 text-slate-300 text-xs font-medium border border-slate-700/50"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Comments Tree */}
            <div className="bg-[#0d1528] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Kommentare</span>
                <span className="text-xs font-mono text-teal-400">({commentsTree.length})</span>
              </h3>

              {/* Add Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-3">
                <input
                  id="image-comment-input"
                  type="text"
                  aria-label="Kommentar eingeben"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    currentUser
                      ? `Als ${currentUser.username} kommentieren...`
                      : 'Schreibe einen Kommentar...'
                  }
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                  aria-label="Kommentar absenden"
                  title="Kommentar absenden"
                  className="px-4 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-2xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Senden</span>
                </button>
              </form>

              {/* Comments List */}
              {isLoadingComments ? (
                <div className="py-8 text-center text-xs font-mono text-slate-500 animate-pulse">
                  Lade Kommentare...
                </div>
              ) : commentsTree.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Noch keine Kommentare vorhanden. Schreibe den ersten Kommentar!
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {commentsTree.map((comment) => (
                    <div key={comment.id} className="pt-3">
                      <CommentItem
                        comment={comment}
                        currentUser={currentUser}
                        onAddReply={handleReplySubmit}
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
            </div>
          </div>

          {/* Related Images Sidebar (1 Column) */}
          <div className="space-y-6">
            <div className="bg-[#0d1528] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-teal-400" />
                <span>Ähnliche Bilder</span>
              </h3>

              <div className="flex flex-col gap-3">
                {displayRelated.map((rel) => (
                  <Link
                    key={rel.id || rel.documentId}
                    href={`/image/${rel.slug}`}
                    className="group flex gap-3 bg-slate-950/60 border border-slate-800/80 hover:border-teal-500/40 rounded-2xl p-2 transition-all"
                  >
                    <div className="w-20 h-16 rounded-xl bg-slate-900 overflow-hidden shrink-0">
                      <img
                        src={rel.thumbnailUrl || rel.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80'}
                        alt={rel.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex flex-col justify-center min-w-0">
                      <h4 className="font-bold text-xs text-white group-hover:text-teal-400 transition-colors truncate">
                        {rel.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {rel.creator?.username || 'Creator'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Lightbox Modal */}
      {isFullscreen && (
        <div
          onClick={() => setIsFullscreen(false)}
          className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <img
            src={image?.imageUrl || image?.thumbnailUrl}
            alt={image?.title}
            className="max-h-[95vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Channel Modal */}
      <ChannelProfileModal
        onClose={() => setIsChannelModalOpen(false)}
        selectedChannel={isChannelModalOpen ? selectedChannel : null}
      />
    </div>
  );
}
