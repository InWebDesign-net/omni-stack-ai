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
  Settings,
} from 'lucide-react';
import Header from '@/components/Header';
import SubscribeButton from '@/components/SubscribeButton';
import CreatorBadge from '@/components/CreatorBadge';
import ChannelProfileModal from '@/components/ChannelProfileModal';
import { ImageEditModal } from '@/components/image/ImageEditModal';
import { useApp } from '@/context/AppContext';
import { useContentList, ImageItem } from '@/lib/hooks/useContentList';
import { getRotatedRecommendations } from '@/lib/recommendations';
import { toggleFavorite } from '@/lib/favorites';
import { jsonAuthHeaders } from '@/lib/affinity';
import { formatRelativeDate } from '@/lib/date';
import { UnifiedCommentsSection } from '@/components/comments/UnifiedCommentsSection';
import Image from 'next/image';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

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

  // Image Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const isOwner = Boolean(
    currentUser && image?.creator && String(currentUser.id) === String(image.creator.id)
  );

  const handleSaveImage = async (data: any) => {
    try {
      const res = await fetch(`/api/content/image/settings`, {
        method: 'PUT',
        headers: {
          ...jsonAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: image.documentId,
          localeUpdates: data.localeUpdates,
          visibility: data.visibility,
          // The modal reports the chosen thumbnail here. It used to be dropped
          // on the floor: the file uploaded, the save succeeded, and the old
          // thumbnail came straight back on reopening the editor.
          thumbnailUrl: data.thumbnailUrl,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Speichern des Bildes fehlgeschlagen');
      }

      // Apply what was saved instead of reloading the document. A full reload
      // threw away scroll position, the like state and the view counter to
      // change a title.
      const active = data.localeUpdates?.find((l: any) => l.locale === (lang || 'de'))
        ?? data.localeUpdates?.[0];
      setImage((prev: any) => ({
        ...prev,
        ...(active?.data?.title !== undefined ? { title: active.data.title } : {}),
        ...(active?.data?.summary !== undefined ? { summary: active.data.summary } : {}),
        ...(active?.data?.tags !== undefined ? { tags: active.data.tags } : {}),
        ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
        ...(data.thumbnailUrl !== undefined ? { thumbnailUrl: data.thumbnailUrl } : {}),
      }));
      showToast('Bild erfolgreich aktualisiert!');
      setIsEditModalOpen(false);
      // Keeps the server-rendered metadata and any other view of this image in
      // step, without discarding the page the reader is looking at.
      router.refresh();
    } catch (e: any) {
      console.error('Failed to save image:', e);
      throw e;
    }
  };

  const handleDeleteImage = async (hardDelete: boolean) => {
    try {
      const res = await fetch(`/api/content/image/settings?documentId=${encodeURIComponent(image.documentId)}&hard=${hardDelete}`, {
        method: 'DELETE',
        headers: jsonAuthHeaders(),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        if (hardDelete) {
          showToast('Bild endgültig gelöscht.');
          setTimeout(() => {
            router.push('/images');
          }, 1000);
        } else {
          setImage((prev: any) => ({ ...prev, visibility: 'private' }));
          showToast('Bild als privat archiviert.');
        }
      } else {
        showToast('Fehler beim Löschen');
      }
    } catch (e) {
      console.error('Failed to delete image:', e);
      showToast('Fehler beim Löschen');
    }
  };

  // Related Recommendations Hook with excludeSlug & rotation
  const { items: hookRelated = [] } = useContentList<ImageItem>('image', {
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
    try {
      const storedLikes = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
      if (storedLikes.includes(slug)) {
        setIsLiked(true);
      }
    } catch (e) { /* corrupt or absent localStorage entry — falling back to defaults */ }
    trackView();
  }, [slug]);

  const trackView = async () => {
    try {
      setViewsCount((prev) => prev + 1);
      await fetch('/api/feed/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, type: 'view' }),
      });
    } catch (e) { console.error('[ImageDetail] view tracking request failed:', e); }
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLike = async () => {
    if (!currentUser) {
      openAuthModal();
      return;
    }
    const nextIsLiked = !isLiked;

    if (image?.id != null) {
      void toggleFavorite({ imageId: image.id, desired: nextIsLiked });
    }
    setIsLiked(nextIsLiked);
    setLikesCount((prev) => (nextIsLiked ? prev + 1 : Math.max(0, prev - 1)));

    if (nextIsLiked) {
      showToast(t.common?.likeAdded || 'Zu deinen Likes hinzugefügt');
    } else {
      showToast(t.common?.likeRemoved || 'Aus deinen Likes entfernt');
    }

    try {
      const storedLikes: string[] = JSON.parse(localStorage.getItem('omni_user_likes') || '[]');
      if (nextIsLiked && !storedLikes.includes(slug)) {
        localStorage.setItem('omni_user_likes', JSON.stringify([...storedLikes, slug]));
      } else if (!nextIsLiked) {
        localStorage.setItem('omni_user_likes', JSON.stringify(storedLikes.filter((s) => s !== slug)));
      }
    } catch (e) { /* localStorage unavailable (quota or private mode) — preference not persisted */ }

    try {
      const userIdent = currentUser.username || currentUser.handle || `user-${currentUser.id}`;
      const res = await fetch('/api/feed/interaction', {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          slug,
          type: nextIsLiked ? 'like' : 'unlike',
          userIdentifier: userIdent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.likesCount === 'number') {
          setLikesCount(data.likesCount);
        }
      }
    } catch (e) {
      console.error('Failed to sync image like interaction:', e);
    }
  };

  const rawCreatorObj = image?.creator || { username: 'Omni Creator', handle: '@omni' };
  const isCreatorOwner = Boolean(
    currentUser &&
      (currentUser.id === rawCreatorObj.id ||
        currentUser.username === rawCreatorObj.username ||
        (currentUser.handle && rawCreatorObj.handle && currentUser.handle.toLowerCase() === rawCreatorObj.handle.toLowerCase()))
  );
  const effectiveCreatorAvatar = (isCreatorOwner && typeof currentUser?.avatarUrl !== 'undefined')
    ? (currentUser.avatarUrl || resolveAvatarUrl(rawCreatorObj.avatarUrl))
    : (resolveAvatarUrl(rawCreatorObj.avatarUrl));

  const creatorObj = {
    ...rawCreatorObj,
    avatarUrl: effectiveCreatorAvatar,
  };

  const handleOpenChannel = (creator: any) => {
    setSelectedChannel({
      id: creator.id || 1,
      documentId: creator.documentId,
      username: creator.username || 'Omni Creator',
      handle: creator.handle || `@${(creator.username || 'creator').toLowerCase()}`,
      avatarUrl: resolveAvatarUrl(creator.avatarUrl),
      bio: creator.bio || 'Omni Network Content Creator',
      subscribersCount: Number(creator.subscribersCount || 0),
    });
    setIsChannelModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-canvas text-primary flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      <Header />

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{ bottom: `calc(6rem + var(--footer-overlap, 0px))` }} className="fixed right-6 z-50 bg-surface-raised border border-indigo-500/40 text-primary px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Navigation bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-primary transition-colors bg-surface hover:bg-surface-raised border border-subtle rounded-xl px-3 py-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.common?.back || (lang === 'de' ? 'Zurück' : 'Back')}</span>
          </button>

          <Link
            href="/images"
            className="flex items-center gap-2 text-xs text-teal-400 hover:text-teal-300 font-semibold transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            <span>{lang === 'de' ? 'Alle Bilder durchsuchen' : 'Browse all images'}</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Image Display & Metadata (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Viewer Container */}
            <div className="relative bg-surface border border-subtle rounded-3xl overflow-hidden shadow-2xl group">
              <div className="relative flex items-center justify-center min-h-[400px] max-h-[70vh] bg-surface p-4">
                <Image
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
              <div className="p-6 bg-surface border-t border-subtle space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
                    {image?.title}
                  </h1>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md ${
                        isLiked
                          ? 'bg-rose-500 text-white shadow-rose-500/20'
                          : 'bg-surface-raised border border-subtle text-muted hover:border-rose-500/50'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : 'text-rose-400'}`} />
                      <span>{likesCount}</span>
                    </button>
                  </div>
                </div>

                {/* Creator Header */}
                <CreatorBadge
                  creator={creatorObj}
                  isOwner={isOwner}
                  onEdit={() => setIsEditModalOpen(true)}
                  editLabel={t?.images?.editImage || 'Bild bearbeiten'}
                  onOpenProfile={(c) => handleOpenChannel(c)}
                />

                {/* Description & Tags */}
                {image?.summary && (
                  <div className="pt-2 text-xs text-primary leading-relaxed font-normal">
                    {image.summary}
                  </div>
                )}

                {image?.tags && image.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {image.tags.map((tag: string) => (
                      <Link
                        key={tag}
                        href={`/images?page=1&includetag=${encodeURIComponent(tag)}`}
                        className="px-2.5 py-1 rounded-xl bg-surface-raised text-muted hover:text-teal-300 hover:bg-surface-raised/80 hover:border-teal-500/50 text-xs font-medium border border-subtle transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Unified Comments Section */}
            <UnifiedCommentsSection slug={slug} lang={lang} t={t} accentColor="teal" />
          </div>

          {/* Related Images Sidebar (1 Column) */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-primary flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-teal-400" />
              <span>Ähnliche Bilder</span>
            </h3>

            <div className="flex flex-col gap-2">
              {displayRelated.map((rel) => (
                <Link
                  key={rel.id || rel.documentId}
                  href={`/image/${rel.slug}`}
                  className="group flex gap-3 p-1.5 rounded-xl hover:bg-surface transition-colors duration-150 min-h-[44px]"
                >
                  <div className="w-28 sm:w-32 aspect-[4/3] rounded-xl bg-surface overflow-hidden shrink-0 shadow-sm">
                    <Image
                      src={rel.thumbnailUrl || rel.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80'}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 py-0.5">
                    <h4 className="font-semibold text-sm text-primary group-hover:text-teal-400 transition-colors truncate">
                      {rel.title}
                    </h4>
                    <span className="text-xs text-muted font-mono mt-1">
                      {rel.creator?.username || 'Creator'}
                    </span>
                  </div>
                </Link>
              ))}
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
          <Image
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

      {/* Image Edit Modal */}
      <ImageEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveImage}
        onDelete={handleDeleteImage}
        image={image}
        t={t}
      />
    </div>
  );
}
