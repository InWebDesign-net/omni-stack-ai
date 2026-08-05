'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Video,
  FileText,
  BookOpen,
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
  ThumbsUp,
  FileCheck,
  Tag,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { FeedItem, FALLBACK_FEED_ITEMS, getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';
import {
  fetchCommentsForSlug,
  createCommentInStrapi,
  updateCommentInStrapi,
  deleteCommentFromStrapi,
  CommentItem,
} from '@/lib/comments';

export default function ContentDetailPage() {
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
  const [userProfile, setUserProfile] = useState<{ username: string; handle: string; avatarUrl: string } | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

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
        setUserProfile(JSON.parse(storedUser));
      }
    } catch (e) {}

    const fetchItemData = async () => {
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

      // 1. STRAPI-FIRST: Always fetch real item data from Strapi API first
      try {
        const res = await fetch('/api/strapi-feed', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store',
          },
          cache: 'no-store',
          body: JSON.stringify({ activePattern: 'discovery', includeDrafts: isBypass, targetSlug: slug }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.feed && data.feed.length > 0) {
            const apiMatch = matchItem(data.feed, slug) || data.feed[0];
            if (apiMatch) {
              setItem(apiMatch);
              setLikesCount(apiMatch.likesCount || 100);
              setRelatedItems(data.feed.filter((i: FeedItem) => i.slug !== apiMatch.slug && i.mediaType !== 'short').slice(0, 5));
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error fetching item from Strapi API:', e);
      }

      // 2. Offline fallback ONLY if Strapi API is unreachable
      const foundFallback = matchItem(FALLBACK_FEED_ITEMS, slug) || FALLBACK_FEED_ITEMS[0];
      setItem(foundFallback);
      setLikesCount(foundFallback.likesCount);
      setRelatedItems(FALLBACK_FEED_ITEMS.filter((i) => i.slug !== foundFallback.slug && i.mediaType !== 'short').slice(0, 5));
    };

    const loadComments = async () => {
      setLoadingComments(true);
      if (slug) {
        const fetched = await fetchCommentsForSlug(slug);
        setComments(fetched);
      }
      setLoadingComments(false);
    };

    fetchItemData();
    loadComments();
  }, [slug]);

  // Auto-poll item status if video is currently in processing state
  useEffect(() => {
    if (!(item as any)?.isProcessing) return;
    const interval = setInterval(async () => {
      try {
        const isBypass = typeof document !== 'undefined' && document.cookie.includes('__prerender_bypass');
        const res = await fetch('/api/strapi-feed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activePattern: 'discovery', includeDrafts: isBypass, targetSlug: slug }),
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
    }, 6000);
    return () => clearInterval(interval);
  }, [(item as any)?.isProcessing, slug]);

  if (!item) {
    return (
      <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-2 border-[#8083ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#9ba4bf] font-mono">Lade Medien-Inhalt...</p>
        </div>
      </div>
    );
  }

  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const authorName = userProfile?.username || 'Du (Benutzer)';
    const authorHandle = userProfile?.handle || '@du';
    const authorAvatar = userProfile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';

    const created = await createCommentInStrapi({
      feedSlug: slug,
      text: newCommentText.trim(),
      authorName,
      authorHandle,
      authorAvatar,
    });

    if (created) {
      setComments((prev) => [created, ...prev]);
    } else {
      setComments((prev) => [
        {
          id: Date.now(),
          documentId: String(Date.now()),
          text: newCommentText.trim(),
          authorName,
          authorHandle,
          authorAvatar,
          isEdited: false,
          feedSlug: slug,
          createdAt: 'Gerade eben',
          isCurrentUser: true,
        },
        ...prev,
      ]);
    }
    setNewCommentText('');
    setIsSubmittingComment(false);
  };

  const handleStartEdit = (comment: CommentItem) => {
    setEditingCommentId(comment.documentId || comment.id);
    setEditCommentText(comment.text);
  };

  const handleSaveEdit = async (commentId: string | number) => {
    if (!editCommentText.trim()) return;

    await updateCommentInStrapi(commentId, editCommentText.trim());
    setComments((prev) =>
      prev.map((c) =>
        c.documentId === commentId || c.id === commentId
          ? { ...c, text: editCommentText.trim(), isEdited: true }
          : c
      )
    );
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleDeleteComment = async (commentId: string | number) => {
    await deleteCommentFromStrapi(commentId);
    setComments((prev) => prev.filter((c) => c.documentId !== commentId && c.id !== commentId));
  };

  const authorName = getAuthorName(item);
  const authorHandle = getAuthorHandle(item);
  const authorAvatar = getAuthorAvatar(item);

  return (
    <div className="min-h-screen bg-mesh text-[#dae2fd] flex flex-col font-sans selection:bg-[#8083ff] selection:text-white">
      {isPreviewActive && (
        <div className="bg-gradient-to-r from-[#8083ff] via-[#44e2cd] to-[#8083ff] text-white text-xs py-2 px-4 sm:px-6 flex items-center justify-between z-50 sticky top-0 shadow-xl font-sans">
          <div className="flex items-center gap-2 font-bold tracking-wide">
            <Sparkles className="h-4 w-4 animate-spin-slow text-yellow-300 shrink-0" />
            <span>⚡ Live-Entwurfsmodus aktiv (Vorschau aus Strapi CMS)</span>
          </div>
          <a
            href={`/api/exit-preview?redirect=${encodeURIComponent(`/content/${slug}`)}`}
            className="bg-black/50 hover:bg-black/80 text-white px-3 py-1 rounded-lg font-bold text-[11px] border border-white/20 transition-all shrink-0"
          >
            Vorschau beenden
          </a>
        </div>
      )}

      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#080e1e]/90 backdrop-blur-2xl border-b border-white/5 px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#dae2fd] transition-all border border-white/8"
          >
            <ArrowLeft className="h-4 w-4 text-[#8083ff]" />
            <span>Startseite</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-[#44e2cd] bg-[#44e2cd]/10 border border-[#44e2cd]/20 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>KI-Relevanz: {(item.relevanceScore * 100).toFixed(0)}%</span>
          </span>
        </div>
      </header>

      {/* ── Full-Width YouTube Theater Layout ──────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left / Main Canvas (YouTube Wide Theater Column) */}
        <section className="lg:col-span-8 flex flex-col gap-6">

          {/* 🎬 1. VIDEO LAYOUT */}
          {item.mediaType === 'video' && (
            <div className="flex flex-col gap-5">
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
                    <span>{new Date(item.publishedAt).toLocaleDateString('de-DE')}</span>
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

              {/* Channel Author Card */}
              <div className="flex items-center justify-between gap-4 bg-[#0d1528] p-4 rounded-2xl border border-white/6">
                <div className="flex items-center gap-3.5">
                  <img
                    src={authorAvatar}
                    alt={authorName}
                    className="h-11 w-11 rounded-full object-cover border border-white/10 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-white">{authorName}</span>
                      <CheckCircle2 className="h-4 w-4 text-[#44e2cd]" />
                    </div>
                    <p className="text-xs text-[#8083ff] font-mono font-semibold">{authorHandle}</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSubscribed(!isSubscribed)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSubscribed
                      ? 'bg-[#121a30] border border-white/10 text-[#9ba4bf]'
                      : 'bg-[#44e2cd] text-[#003731] hover:bg-[#3bcbb8] shadow-lg shadow-[#44e2cd]/20'
                  }`}
                >
                  {isSubscribed ? 'Abonniert ✓' : '+ Abonnieren'}
                </button>
              </div>

              {/* Expandable Video Description Box */}
              <div className="bg-[#0d1528] p-5 rounded-2xl border border-white/6 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Beschreibung & Details</span>
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-[#8083ff] hover:underline flex items-center gap-1"
                  >
                    <span>{descExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}</span>
                    {descExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className={`text-xs text-[#9ba4bf] leading-relaxed ${descExpanded ? '' : 'line-clamp-3'}`}>
                  {item.summary}
                  {'\n\n'}
                  {item.content}
                </p>
                <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                  {item.tags.map((t) => (
                    <span key={t} className="text-[10px] font-mono text-[#8083ff] bg-[#8083ff]/15 border border-[#8083ff]/30 px-2.5 py-0.5 rounded-full">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 📄 2. PDF LAYOUT */}
          {item.mediaType === 'pdf' && (
            <div className="flex flex-col gap-6">
              {/* PDF Document Header Card */}
              <div className="bg-[#0d1528] p-6 sm:p-8 rounded-3xl border border-white/8 flex flex-col gap-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                      <FileText className="h-7 w-7 text-red-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-red-400/15 text-red-400 border border-red-400/30 px-2.5 py-0.5 rounded-full uppercase">
                          PDF Dokument
                        </span>
                        <span className="text-xs font-mono text-[#9ba4bf]">
                          {(item.viewsCount / 1000).toFixed(1)}k Aufrufe
                        </span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                        {item.title}
                      </h1>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={item.mediaUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[#8083ff] hover:bg-[#6b6eff] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-[#8083ff]/25 flex items-center gap-2 transition-all"
                    >
                      <Download className="h-4 w-4" />
                      <span>PDF Herunterladen</span>
                    </a>
                  </div>
                </div>

                {/* PDF Viewer Canvas Frame */}
                <div className="w-full aspect-[4/3] bg-[#080e1e] rounded-2xl border border-white/6 p-6 flex flex-col items-center justify-center gap-4 text-center">
                  <FileCheck className="h-16 w-16 text-red-400/60" />
                  <div className="max-w-md">
                    <h3 className="text-base font-bold text-white mb-1">Dokumenten-Vorschau</h3>
                    <p className="text-xs text-[#9ba4bf] leading-relaxed">{item.summary}</p>
                  </div>
                  <a
                    href={item.mediaUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#121a30] hover:bg-[#192038] border border-white/10 text-[#44e2cd] px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>In Vollbild-Viewer ansehen</span>
                  </a>
                </div>

                {/* PDF Details & Summary */}
                <div className="flex flex-col gap-3 pt-2">
                  <h3 className="text-sm font-bold text-white">Inhaltsangabe & Zusammenfassung</h3>
                  <div className="bg-[#080e1e] p-4 rounded-2xl border border-white/5 text-xs text-[#dae2fd] leading-relaxed whitespace-pre-line font-mono">
                    {item.content}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 📰 3. ARTICLE LAYOUT */}
          {item.mediaType === 'article' && (
            <div className="flex flex-col gap-6">
              <div className="bg-[#0d1528] rounded-3xl border border-white/8 overflow-hidden shadow-2xl">
                {/* Hero Banner Image */}
                <div className="relative aspect-video w-full max-h-[380px] bg-black">
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1528] via-[#0d1528]/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-[#44e2cd] font-mono">
                      <BookOpen className="h-4 w-4" />
                      <span>Exklusiver Artikel</span>
                      <span>•</span>
                      <Clock className="h-3.5 w-3.5" />
                      <span>4 Min. Lesezeit</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                      {item.title}
                    </h1>
                  </div>
                </div>

                {/* Article Content Body */}
                <div className="p-6 sm:p-8 flex flex-col gap-6">
                  {/* Author Strip */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/6">
                    <div className="flex items-center gap-3">
                      <img src={authorAvatar} alt={authorName} className="h-10 w-10 rounded-full object-cover border border-white/10" />
                      <div>
                        <p className="text-xs font-bold text-white">{authorName}</p>
                        <p className="text-[10px] text-[#8083ff] font-mono">{authorHandle}</p>
                      </div>
                    </div>
                    <span className="text-xs text-[#9ba4bf] font-mono">
                      {new Date(item.publishedAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>

                  {/* Highlight Callout */}
                  <div className="bg-[#8083ff]/10 border border-[#8083ff]/25 p-4 rounded-2xl text-xs text-[#c0c1ff] font-semibold leading-relaxed">
                    💡 {item.summary}
                  </div>

                  {/* Main Article Text */}
                  <div className="text-sm text-[#dae2fd] leading-relaxed whitespace-pre-line font-serif space-y-4">
                    {item.content}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comment Section (Unified for all media types) */}
          <section className="bg-[#0d1528] rounded-3xl border border-white/8 p-6 flex flex-col gap-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#8083ff]" />
                <span>Diskussion ({comments.length})</span>
              </h3>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleCommentSubmit} className="flex gap-3">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={userProfile ? `Als ${userProfile.username} kommentieren...` : "Schreibe deinen Kommentar zum Beitrag..."}
                className="flex-1 bg-[#080e1e] border border-white/8 focus:border-[#8083ff] rounded-2xl px-4 py-3 text-xs text-white placeholder-[#5c657d] focus:outline-none transition-all"
                disabled={isSubmittingComment}
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newCommentText.trim()}
                className="bg-[#8083ff] hover:bg-[#6b6eff] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-2xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmittingComment ? 'Senden...' : 'Senden'}</span>
              </button>
            </form>

            {/* Comments List */}
            <div className="flex flex-col gap-3">
              {loadingComments ? (
                <div className="py-6 text-center text-xs text-[#9ba4bf] font-mono animate-pulse">
                  Lade Kommentare aus Strapi CMS...
                </div>
              ) : comments.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#5c657d] font-mono">
                  Noch keine Kommentare vorhanden. Schreibe den ersten Kommentar!
                </div>
              ) : (
                comments.map((c) => {
                  const commentKey = c.documentId || String(c.id);
                  const isEditing = editingCommentId === commentKey;
                  const isOwner = c.isCurrentUser || c.authorHandle === '@du' || (userProfile && c.authorHandle === userProfile.handle);

                  return (
                    <div key={commentKey} className="bg-[#080e1e]/60 border border-white/5 p-4 rounded-2xl flex gap-3 group transition-all">
                      <img src={c.authorAvatar} alt={c.authorName} className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0" />
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white">{c.authorName}</span>
                            <span className="text-[10px] text-[#8083ff] font-mono">{c.authorHandle}</span>
                            {c.isEdited && (
                              <span className="text-[9px] text-[#9ba4bf] italic font-mono">(bearbeitet)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#5c657d]">{c.createdAt}</span>
                            {isOwner && !isEditing && (
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(c)}
                                  title="Kommentar bearbeiten"
                                  className="p-1 text-[#9ba4bf] hover:text-[#8083ff] rounded-lg hover:bg-white/5 transition-all"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(commentKey)}
                                  title="Kommentar löschen"
                                  className="p-1 text-[#9ba4bf] hover:text-red-400 rounded-lg hover:bg-white/5 transition-all"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex flex-col gap-2 mt-1">
                            <textarea
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="w-full bg-[#080e1e] border border-[#8083ff] rounded-xl p-2.5 text-xs text-white focus:outline-none resize-y min-h-[60px]"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-[#9ba4bf] font-medium transition-all"
                              >
                                Abbrechen
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(commentKey)}
                                className="px-3 py-1 rounded-lg bg-[#8083ff] hover:bg-[#6b6eff] text-[11px] text-white font-medium flex items-center gap-1 transition-all"
                              >
                                <Check className="h-3 w-3" />
                                <span>Speichern</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-[#dae2fd] leading-relaxed break-words">{c.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </section>

        {/* Right Column (YouTube Style Nächstes / Verwandte Empfehlungen Queue) */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#44e2cd]" />
              <span>Nächstes & Empfehlungen</span>
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {relatedItems.map((rel) => (
              <Link
                key={rel.id}
                href={rel.mediaType === 'short' ? `/shorts/${rel.slug}` : `/content/${rel.slug}`}
                className="bg-[#0d1528] hover:bg-[#121a30] border border-white/6 hover:border-[#8083ff]/40 p-3 rounded-2xl flex gap-3 transition-all duration-200 group"
              >
                <div className="relative w-32 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                  <img src={rel.thumbnailUrl} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase">
                    {rel.mediaType}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-[#dae2fd] group-hover:text-white transition-colors line-clamp-2 leading-snug">
                    {rel.title}
                  </h4>
                  <p className="text-[10px] text-[#5c657d] font-mono">{getAuthorHandle(rel)}</p>
                  <span className="text-[9px] font-mono text-[#44e2cd] mt-auto">
                    Score: {(rel.relevanceScore * 100).toFixed(0)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </aside>

      </main>
    </div>
  );
}
