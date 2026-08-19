'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Heart, Share2, Bookmark, Eye, Clock, MessageSquare,
  BookOpen, User as UserIcon, Settings, Tag, Sparkles, FileText, CheckCircle2,
} from 'lucide-react';
import Header from '@/components/Header';
import SubscribeButton from '@/components/SubscribeButton';
import ChannelProfileModal from '@/components/ChannelProfileModal';
import { ArticleEditModal } from '@/components/article/ArticleEditModal';
import { useApp } from '@/context/AppContext';
import { jsonAuthHeaders } from '@/lib/affinity';
import { tracker } from '@/lib/tracking';
import { ArticleBlockRenderer } from '@/components/article/ArticleBlockRenderer';
import { UnifiedCommentsSection } from '@/components/comments/UnifiedCommentsSection';
import { useArticles } from '@/lib/hooks/useArticles';
import { getRotatedRecommendations } from '@/lib/recommendations';
import { getArticleOwnerStatus } from './actions';
import Image from 'next/image';

function pickLocalized(source: any, useLang: string) {
  if (!source) return null;
  if (Array.isArray(source)) {
    return source.find((v: any) => v.locale === useLang) || source[0] || null;
  }
  return source;
}

export default function ArticleDetailPageClient({ initialItem, slug }: { initialItem: any; slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang, currentUser, openAuthModal, subscribedChannels } = useApp();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [item, setItem] = useState(() => pickLocalized(initialItem, lang));
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(item?.likesCount || 0);
  const [viewsCount, setViewsCount] = useState(item?.viewsCount || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Auto-open ArticleEditModal if edit=true query param is present
  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setShowSettingsModal(true);
    }
  }, [searchParams]);
  const [isOwner, setIsOwner] = useState(false);
  const [activeChannelModal, setActiveChannelModal] = useState<any>(null);
  const hasTrackedView = useRef(false);

  const effectiveLang = mounted ? lang : 'de';

  const [commentsCount, setCommentsCount] = useState(initialItem?.commentsCount || 0);

  useEffect(() => {
    const active = pickLocalized(initialItem, effectiveLang);
    setItem(active);
    if (active) {
      setLikesCount(active.likesCount || 0);
      setViewsCount(active.viewsCount || 0);
      setCommentsCount(active.commentsCount || 0);
    }
  }, [initialItem, effectiveLang]);

  // Check owner status
  useEffect(() => {
    if (!slug) return;
    getArticleOwnerStatus(slug).then((res) => {
      setIsOwner(res.isOwner);
    });
  }, [slug, currentUser]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fallbackCreator = useMemo(() => {
    return {
      username: 'Omni Redaktion',
      handle: '@omni',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      bio: 'Inhalte & Magazin im Omni Network.',
    };
  }, []);

  const creator =
    item?.creator ||
    item?.author ||
    (Array.isArray(initialItem) ? initialItem.find((it: any) => it?.creator || it?.author)?.creator : null);
  const rawHandle = creator?.handle || item?.authorHandle;
  const creatorName =
    creator?.username || creator?.name || item?.authorName || (rawHandle ? rawHandle.replace(/^@/, '') : fallbackCreator.username);
  const creatorHandle = rawHandle ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`) : fallbackCreator.handle;
  const creatorAvatar =
    creator?.avatarUrl || creator?.avatar || item?.authorAvatar || fallbackCreator.avatarUrl;
  const isSubscribed = Boolean(
    creatorHandle &&
      (subscribedChannels.includes(creatorHandle) ||
        subscribedChannels.includes(creatorHandle.replace(/^@/, '')))
  );

  const isEffectiveOwner =
    isOwner ||
    (Boolean(currentUser?.id) && Boolean(creator?.id) && Number(currentUser?.id) === Number(creator?.id)) ||
    (Boolean(currentUser?.handle) && Boolean(creatorHandle) && currentUser?.handle.replace(/^@/, '').toLowerCase() === creatorHandle.replace(/^@/, '').toLowerCase());

  const userIdent = useMemo(() => {
    return currentUser?.id ? `user-${currentUser.id}` : 'anon-session';
  }, [currentUser?.id]);

  // Check stored likes / interaction status and track view
  useEffect(() => {
    if (!item?.slug) return;

    let localLiked = false;
    try {
      const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
      if (storedLikes.includes(item.slug)) localLiked = true;
    } catch (e) {}

    const checkInteraction = async () => {
      try {
        const res = await fetch(
          `/api/feed/interaction-status?slug=${item.slug}&userIdentifier=${userIdent}`,
          { headers: jsonAuthHeaders() }
        );
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

    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      fetch('/api/feed/interaction', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug: item.slug,
          type: 'view',
          userIdentifier: userIdent,
          targetType: 'article',
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d && typeof d.viewsCount === 'number') setViewsCount(d.viewsCount);
        })
        .catch(() => {});

      if (item.tags) {
        tracker.track('view', item.tags, 'article', creator?.id);
      }
    }
  }, [item?.slug, userIdent, creator?.id, item?.tags]);

  // Related articles hook
  const { articles: hookRelated = [] } = useArticles({
    currentPage: 1,
    pageSize: 10,
    excludeSlug: slug,
    sort: currentUser ? 'affinity' : 'createdatasc',
    lang: effectiveLang,
    enabled: true,
  });

  const displayRelated = getRotatedRecommendations(hookRelated, slug, 5);

  const handleLikeToggle = async () => {
    if (!item?.slug) return;
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setLikesCount((prev: number) => Math.max(0, nextIsLiked ? prev + 1 : prev - 1));

    const tags = Array.isArray(item.tags) && item.tags.length > 0
      ? item.tags
      : [item.title].filter(Boolean);
    tracker.track(nextIsLiked ? 'like' : 'unlike', tags, 'article', creator?.id);

    if (nextIsLiked) {
      showToast(effectiveLang === 'de' ? 'Zu deinen Favoriten hinzugefügt!' : 'Added to your favorites!');
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        if (!storedLikes.includes(item.slug)) {
          localStorage.setItem('omni_user_likes', JSON.stringify([...storedLikes, item.slug]));
        }
      } catch (e) {}
    } else {
      showToast(effectiveLang === 'de' ? 'Aus deinen Favoriten entfernt.' : 'Removed from favorites.');
      try {
        const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
        localStorage.setItem(
          'omni_user_likes',
          JSON.stringify(storedLikes.filter((s) => s !== item.slug))
        );
      } catch (e) {}
    }

    try {
      const res = await fetch('/api/feed/interaction', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug: item.slug,
          type: nextIsLiked ? 'like' : 'unlike',
          userIdentifier: userIdent,
          targetType: 'article',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likesCount === 'number') {
          setLikesCount(data.likesCount);
        }
      }
    } catch (e) {}
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast(t.common?.linkCopied || 'Link in Zwischenablage kopiert!');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(effectiveLang === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (!item) {
    return (
      <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col font-['Hanken_Grotesk',sans-serif]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">{t.article?.notFound || 'Artikel nicht gefunden'}</p>
        </div>
      </div>
    );
  }

  const summaryText = typeof item.summary === 'string'
    ? item.summary
    : Array.isArray(item.summary)
    ? item.summary
        .map((b: any) => (Array.isArray(b.children) ? b.children.map((c: any) => c.text).join('') : ''))
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col font-['Hanken_Grotesk',sans-serif]">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 bg-slate-900/95 border border-purple-500/40 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-content w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.common?.back || (effectiveLang === 'de' ? 'Zurück' : 'Back')}</span>
          </button>

          <Link
            href="/articles"
            className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 font-semibold transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>{effectiveLang === 'de' ? 'Alle Artikel durchsuchen' : 'Browse all articles'}</span>
          </Link>
        </div>

        {/* 3-Column Grid Layout (2 Cols Main, 1 Col Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Content Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Article Header Card */}
            <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>Omni Magazine & Articles</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                {item.title}
              </h1>

              {/* Creator Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveChannelModal({
                        username: creatorName,
                        handle: creatorHandle,
                        avatarUrl: creatorAvatar,
                      })
                    }
                    className="relative cursor-pointer group"
                  >
                    <Image
                      src={creatorAvatar}
                      alt={creatorName}
                      width={44}
                      height={44}
                      className="w-11 h-11 rounded-full object-cover border-2 border-purple-500/30 group-hover:border-purple-400 transition-colors"
                    />
                  </button>
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveChannelModal({
                          username: creatorName,
                          handle: creatorHandle,
                          avatarUrl: creatorAvatar,
                        })
                      }
                      className="text-sm font-bold text-white hover:text-purple-300 transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{creatorName}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                    </button>
                    <div className="text-xs font-mono text-slate-400">{creatorHandle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isEffectiveOwner ? (
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-purple-400" />
                      <span>{effectiveLang === 'de' ? 'Artikel bearbeiten' : 'Edit article'}</span>
                    </button>
                  ) : (
                    <SubscribeButton targetId={creatorHandle} size="md" />
                  )}

                  <button
                    onClick={handleLikeToggle}
                    className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                      isLiked
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-lg shadow-rose-500/20'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current text-rose-400' : ''}`} />
                    <span>{likesCount}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/80 text-slate-300 hover:text-white hover:border-slate-700 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Teilen"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Article Information Grid (Left Column) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/60 text-xs">
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    <span>Aufrufe</span>
                  </div>
                  <div className="text-base font-extrabold text-white font-mono">{viewsCount}</div>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    <span>Likes</span>
                  </div>
                  <div className="text-base font-extrabold text-white font-mono">{likesCount}</div>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Kommentare</span>
                  </div>
                  <div className="text-base font-extrabold text-white font-mono">{commentsCount}</div>
                </div>

                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Datum</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {formatDate(item.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Thumbnail */}
            {item.thumbnail && (
              <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
                <Image
                  src={item.thumbnail}
                  alt={item.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                  priority
                />
              </div>
            )}

            {/* Summary / Lead Quote Box */}
            {summaryText && (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-5 shadow-xl">
                <p className="text-base text-purple-200/90 italic leading-relaxed">
                  "{summaryText}"
                </p>
              </div>
            )}

            {/* Article Main Body Content Blocks */}
            <article className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <ArticleBlockRenderer blocks={item.blocks || item.content || []} />
            </article>

            {/* Tags */}
            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <Tag className="w-4 h-4 text-purple-400 shrink-0" />
                {item.tags.map((tag: string) => (
                  <Link
                    key={tag}
                    href={`/articles?page=1&includetag=${encodeURIComponent(tag)}`}
                    className="px-3 py-1 bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800 rounded-xl text-xs font-mono text-purple-300 hover:text-purple-200 transition-all cursor-pointer"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Unified Comments Section */}
            <section className="pt-4">
              <UnifiedCommentsSection slug={slug} lang={effectiveLang} t={t} accentColor="purple" onCommentsCountChange={setCommentsCount} />
            </section>
          </div>

          {/* Sidebar Column (1 Col - Flush at top) */}
          <div className="space-y-6">
            {/* Related Articles Sidebar */}
            <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Weitere Artikel</span>
            </h3>

            <div className="space-y-3">
              {displayRelated.map((rel: any) => {
                const relCreator =
                  rel.creator?.username || rel.creator?.handle || rel.author?.username || rel.authorName || 'Omni Creator';
                const relThumbnail = rel.thumbnail || 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=300&q=80';

                return (
                  <Link
                    key={rel.documentId || rel.id || rel.slug}
                    href={`/article/${rel.slug}`}
                    className="flex gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-900 transition-all group"
                  >
                    <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                      <Image
                        src={relThumbnail}
                        alt={rel.title}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-purple-300 transition-colors line-clamp-2 leading-tight">
                        {rel.title}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span className="truncate">{relCreator}</span>
                        <span className="flex items-center gap-1 font-mono text-purple-400 shrink-0">
                          <Heart className="w-3 h-3 fill-current" />
                          {rel.likesCount || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>

      {/* Channel Profile Modal */}
      {activeChannelModal && (
        <ChannelProfileModal
          selectedChannel={activeChannelModal}
          onClose={() => setActiveChannelModal(null)}
        />
      )}

      {/* Article Settings/Edit Modal */}
      {showSettingsModal && (
        <ArticleEditModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          article={item}
          t={t}
          onSave={async ({ localeUpdates, visibility }) => {
            const res = await fetch('/api/article/settings', {
              method: 'PUT',
              headers: jsonAuthHeaders(),
              body: JSON.stringify({
                documentId: item.documentId,
                localeUpdates,
                visibility,
              }),
            });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || 'Speichern des Artikels fehlgeschlagen');
            }
            showToast('Artikel erfolgreich aktualisiert!');
            if (typeof window !== 'undefined') window.location.reload();
          }}
          onDelete={async (hardDelete) => {
            const url = `/api/article/settings?documentId=${encodeURIComponent(item.documentId)}${
              hardDelete ? '&hard=true' : ''
            }`;
            const res = await fetch(url, {
              method: 'DELETE',
              headers: jsonAuthHeaders(),
            });
            if (res.ok) {
              showToast(hardDelete ? 'Artikel gelöscht' : 'Artikel archiviert');
              if (typeof window !== 'undefined') window.location.href = '/articles';
            }
          }}
        />
      )}
    </div>
  );
}
