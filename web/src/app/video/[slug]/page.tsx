'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Video,
  Play,
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
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import { FeedItem, FALLBACK_FEED_ITEMS, getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';
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
          <Play className="h-4 w-4 text-[#44e2cd]" />
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

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [item, setItem] = useState<FeedItem | null>(null);
  const [relatedItems, setRelatedItems] = useState<FeedItem[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  // Comment section state connected to Strapi
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | number | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [userData, setUserData] = useState<{ username: string; handle: string; avatarUrl: string } | null>(null);

  const { lang, toggleLanguage, openChannelModal, subscribedChannels, toggleSubscribeChannel } = useApp();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('omni_user');
      if (storedUser) {
        setUserData(JSON.parse(storedUser));
      }
    } catch (e) {}

    fetchItemData(lang);
    loadComments();
  }, [slug, lang]);

  const fetchItemData = async (targetLang?: 'de' | 'en') => {
    const activeLang = targetLang || lang || 'de';

    const matchItem = (itemsList: FeedItem[], target: string) => {
      if (!target) return null;
      const norm = target.toLowerCase().trim();
      return (
        itemsList.find((i: any) => i.slug === norm || i.documentId === norm || String(i.id) === norm) ||
        itemsList.find((i: any) => i.slug && norm && (i.slug.includes(norm) || norm.includes(i.slug)))
      );
    };

    try {
      let savedProfile: any = { activePattern: 'discovery' };
      try {
        const stored = localStorage.getItem('omni_user_interest_profile');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.interests) {
            savedProfile = parsed;
          }
        }
      } catch (e) {}

      const res = await fetch('/api/strapi-feed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
        },
        cache: 'no-store',
        body: JSON.stringify({ ...savedProfile, targetSlug: slug, locale: activeLang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.feed && data.feed.length > 0) {
          const targetItem = data.feed[0];
          if (targetItem) {
            setItem(targetItem);
            setLikesCount(targetItem.likesCount || 100);
            setRelatedItems(data.feed.filter((i: FeedItem) => i.slug !== targetItem.slug && i.mediaType === 'video').slice(0, 6));
            if (targetItem.slug && targetItem.slug !== slug) {
              router.replace(`/video/${targetItem.slug}`);
            }
            return;
          }
        }
      }
    } catch (e) {
      console.error('Error fetching video from Strapi API:', e);
    }

    // Fallback if offline
    const foundFallback = matchItem(FALLBACK_FEED_ITEMS, slug) || FALLBACK_FEED_ITEMS[0];
    setItem(foundFallback);
    setLikesCount(foundFallback.likesCount || 100);
    setRelatedItems(FALLBACK_FEED_ITEMS.filter((i) => i.slug !== foundFallback.slug && i.mediaType === 'video').slice(0, 6));
  };

  const loadComments = async () => {
    setLoadingComments(true);
    if (slug) {
      const fetched = await fetchCommentsForSlug(slug);
      setComments(fetched);
    }
    setLoadingComments(false);
  };

  // Auto-poll video status if currently in processing state
  useEffect(() => {
    if (!(item as any)?.isProcessing) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/strapi-feed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activePattern: 'discovery', targetSlug: slug }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.feed && data.feed.length > 0) {
            const apiMatch = data.feed.find((i: any) => i.slug === slug || i.documentId === slug) || data.feed[0];
            if (apiMatch) {
              setItem(apiMatch);
            }
          }
        }
      } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, [(item as any)?.isProcessing, slug]);

  const handleLikeToggle = () => {
    setIsLiked((prev) => {
      const next = !prev;
      setLikesCount((count) => (next ? count + 1 : count - 1));
      return next;
    });
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
          <p className="text-sm font-mono text-[#9ba4bf]">Video wird geladen...</p>
        </div>
      </div>
    );
  }

  const authorName = getAuthorName(item);
  const authorHandle = getAuthorHandle(item);
  const authorAvatar = getAuthorAvatar(item);

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col selection:bg-[#8083ff] selection:text-white">
      {/* SEO & Canonical Link */}
      <head>
        <title>{`${item.title} | Omni Video`}</title>
        <link rel="canonical" href={`https://omni-web.inwebdesign.net/video/${item.slug}`} />
        <meta property="og:title" content={item.title} />
        <meta property="og:description" content={item.summary} />
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content={`https://omni-web.inwebdesign.net/video/${item.slug}`} />
        <meta property="og:image" content={item.thumbnailUrl} />
      </head>

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
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/5">
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d1528] hover:bg-[#121a30] text-xs font-semibold text-[#dae2fd] transition-all border border-white/8 hover:border-white/20 shadow-md group"
          >
            <ArrowLeft className="h-4 w-4 text-[#8083ff] group-hover:-translate-x-0.5 transition-transform" />
            <span>Zurück zur Startseite</span>
          </Link>

          <span className="text-xs font-mono font-bold text-[#44e2cd] bg-[#44e2cd]/10 border border-[#44e2cd]/20 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>KI-Relevanz: {((item.relevanceScore || 0.95) * 100).toFixed(0)}% Match</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
          {/* Left Main YouTube Wide Theater Column */}
          <section className="lg:col-span-8 flex flex-col gap-6">

            {/* Processing Banner */}
            {(item as any).isProcessing && (
              <div className="bg-[#8083ff]/15 border border-[#8083ff]/30 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-[#44e2cd] animate-spin shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">⚡ Video wird konvertiert & verarbeitet</p>
                    <p className="text-xs text-[#9ba4bf]">Intel QSV Hardware-Encoding & ABR HLS Streams werden im Hintergrund generiert...</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-[#8083ff]/30 text-[#44e2cd] px-3 py-1 rounded-full border border-[#44e2cd]/30 shrink-0">
                  Konvertierung läuft
                </span>
              </div>
            )}

            {/* Full-width Video Theater Frame */}
            <div className="w-full aspect-video bg-black rounded-3xl border border-white/8 overflow-hidden shadow-2xl relative group">
              <video
                src={item.mediaUrl}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Stats */}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
                {item.title}
              </h1>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
                <div className="flex items-center gap-3 text-xs text-[#9ba4bf] font-mono">
                  <span className="flex items-center gap-1 text-white font-semibold">
                    <Eye className="h-4 w-4 text-[#44e2cd]" />
                    {(item.viewsCount / 1000).toFixed(1)}k Aufrufe
                  </span>
                  <span>•</span>
                  <span>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('de-DE') : 'Entwurf'}</span>
                </div>

                {/* Actions Bar */}
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

                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Link in Zwischenablage kopiert!');
                      }
                    }}
                    className="p-2.5 rounded-xl bg-[#121a30] border border-white/8 text-[#9ba4bf] hover:text-white transition-all"
                    title="Teilen"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Channel Author Card with Clickable Profile Modal */}
            <div className="flex items-center justify-between gap-4 bg-[#0d1528] p-4 rounded-2xl border border-white/6">
              <div
                onClick={() => openChannelModal({ handle: authorHandle, username: authorName, avatarUrl: authorAvatar })}
                className="flex items-center gap-3.5 cursor-pointer group/author transition-all"
                title={`Profil von ${authorName} öffnen`}
              >
                <img
                  src={authorAvatar}
                  alt={authorName}
                  className="h-11 w-11 rounded-full object-cover border border-white/10 group-hover/author:border-[#8083ff] group-hover/author:scale-105 transition-all shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white group-hover/author:text-[#44e2cd] transition-colors">{authorName}</span>
                    <CheckCircle2 className="h-4 w-4 text-[#44e2cd]" />
                  </div>
                  <span className="text-xs font-mono text-[#9ba4bf]">{authorHandle} • 15.4k Abonnenten</span>
                </div>
              </div>

              <button
                onClick={() => toggleSubscribeChannel(authorHandle)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 ${
                  subscribedChannels.includes(authorHandle)
                    ? 'bg-[#162038] text-[#dae2fd] border border-white/10 hover:bg-[#1f2b48]'
                    : 'bg-gradient-to-r from-[#8083ff] to-[#6b6eff] text-white shadow-lg shadow-[#8083ff]/30 hover:scale-105'
                }`}
              >
                {subscribedChannels.includes(authorHandle) ? (
                  <>
                    <Check className="h-4 w-4 text-[#44e2cd]" />
                    <span>Abonniert</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Kanal abonnieren</span>
                  </>
                )}
              </button>
            </div>

            {/* Expandable Description Box */}
            <div className="bg-[#0d1528] p-5 rounded-2xl border border-white/6 flex flex-col gap-3">
              <p className={`text-sm text-[#dae2fd] leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
                {item.content || item.summary}
              </p>

              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-xs font-bold text-[#8083ff] hover:text-[#44e2cd] self-start flex items-center gap-1 transition-colors mt-1"
              >
                <span>{descExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}</span>
                {descExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Interactive Comments Section */}
            <section className="bg-[#0d1528] p-6 rounded-3xl border border-white/6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#8083ff]" />
                  <span>Kommentare ({comments.length})</span>
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
                    placeholder="Einen Kommentar schreiben..."
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
                      <span>Kommentieren</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Comment List */}
              {loadingComments ? (
                <div className="py-6 text-center text-xs text-[#9ba4bf]">Kommentare werden geladen...</div>
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9ba4bf]">Noch keine Kommentare vorhanden. Schreibe den ersten!</div>
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
                          <span className="text-[10px] font-mono text-[#5c657d]">{comment.createdAt || 'Gerade eben'}</span>
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <textarea
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="w-full bg-[#0d1528] border border-[#8083ff] rounded-xl p-2 text-xs text-white focus:outline-none resize-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-2.5 py-1 rounded-lg text-[11px] text-[#9ba4bf] hover:text-white"
                              >
                                Abbrechen
                              </button>
                              <button
                                onClick={() => handleSaveEditComment(comment.id)}
                                className="px-3 py-1 rounded-lg bg-[#8083ff] text-white text-[11px] font-bold"
                              >
                                Speichern
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#dae2fd] leading-relaxed mt-0.5">{comment.text}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          {/* Right Sidebar: Recommended Videos */}
          <aside className="lg:col-span-4 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-[#ffb783]" />
              <span>Nächste & Empfehlungen</span>
            </h3>

            <div className="flex flex-col gap-3">
              {relatedItems.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/video/${rel.slug}`}
                  className="flex gap-3 bg-[#0d1528] hover:bg-[#121a30] p-2.5 rounded-2xl border border-white/6 hover:border-white/15 transition-all group"
                >
                  <div className="w-32 aspect-video rounded-xl overflow-hidden bg-black shrink-0 relative">
                    <CardThumbnail item={rel} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white group-hover:text-[#44e2cd] transition-colors line-clamp-2 leading-snug">
                      {rel.title}
                    </h4>
                    <span className="text-[10px] font-mono text-[#9ba4bf] mt-1">{getAuthorName(rel)}</span>
                    <span className="text-[10px] font-mono text-[#5c657d] mt-0.5">{(rel.viewsCount / 1000).toFixed(1)}k Aufrufe</span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>

        </div>
      </main>

    </div>
  );
}
