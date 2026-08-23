'use client';

import React, { useState } from 'react';
import { formatCount } from '@/lib/format';
import Link from 'next/link';
import {
    Video,
    Heart,
    Eye,
    Upload,
    Settings,
    ShieldCheck,
    UserCheck,
    Bell,
    MessageSquare,
    Sparkles,
    Play,
    Film,
    Bookmark,
    Share2,
    Clock,
    Image as ImageIcon,
    FileText,
    ListVideo,
} from 'lucide-react';
import { ProfileData } from './actions';
import { useApp } from '@/context/AppContext';
import { ProfileTabToolbar, ProfileTabLoadMore } from '@/components/profile/ProfileTabControls';
import { useProfileTabList } from '@/lib/hooks/useProfileTabList';
import { useProfileLikesTab } from '@/lib/hooks/useProfileLikesTab';
import { useChat } from '@/context/ChatContext';
import Header from '@/components/Header';
import SubscribeButton from '@/components/SubscribeButton';
import VideoSettingsModal from '@/components/VideoSettingsModal';
import { ArticleEditModal } from '@/components/article/ArticleEditModal';
import { ImageEditModal } from '@/components/image/ImageEditModal';
import { UserImagesTab } from '@/components/user/UserImagesTab';
import { UserArticlesTab } from '@/components/user/UserArticlesTab';
import { UserLikesTab } from '@/components/user/UserLikesTab';
import { UserPlaylistsTab } from '@/components/user/UserPlaylistsTab';
import { formatAbsoluteDate } from '@/lib/date';
import { jsonAuthHeaders } from '@/lib/affinity';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';
import { Toast, useToast } from '@/components/common/Toast';

interface UserPageClientProps {
    profileDataInit: ProfileData;
}

export default function UserPageClient({ profileDataInit }: UserPageClientProps) {
    const router = useRouter();
    const { profile, isOwner, counts, stats } = profileDataInit;
    const { t, lang, currentUser, openAuthModal, openVideoUploadModal, openSettingsModal } = useApp();
    const { createRoom, openChat } = useChat();

    const [activeTab, setActiveTab] = useState<'articles' | 'videos' | 'images' | 'likes' | 'playlists' | 'about'>('articles');

    // One list per tab, fetched only while that tab is open. Each keeps its own
    // sort and search: someone who sorted images by title does not expect their
    // videos to change order too.
    const articleList = useProfileTabList({ kind: 'article', creatorId: profile.id, active: activeTab === 'articles', lang, initialTotal: counts.articles });
    const videoList = useProfileTabList({ kind: 'video', creatorId: profile.id, active: activeTab === 'videos', lang, initialTotal: counts.videos });
    const imageList = useProfileTabList({ kind: 'image', creatorId: profile.id, active: activeTab === 'images', lang, initialTotal: counts.images });
    // Likes have their own hook: they join four content types through
    // /api/likes, which the filtered services do not cover.
    const likesList = useProfileLikesTab({ userId: profile.id, active: activeTab === 'likes', initialTotal: counts.likes });

    const articles = articleList.items;
    const videos = videoList.items;
    const images = imageList.items;
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriberCount, setSubscriberCount] = useState(profile.subscribersCount || 0);
    const [editingVideo, setEditingVideo] = useState<any | null>(null);
    const [editingArticle, setEditingArticle] = useState<any | null>(null);
    const [editingImage, setEditingImage] = useState<any | null>(null);
  const { message: toastMessage, showToast } = useToast();

    const dmSetting = profile.allowDirectMessages || 'everyone';
    const canSendDM = !isOwner && (
        dmSetting === 'everyone' ||
        (dmSetting === 'subscribers_only' && isSubscribed)
    );

    const handleStartChat = async () => {
        if (!currentUser) {
            openAuthModal();
            return;
        }
        await createRoom({
            name: profile.username || profile.handle || 'Nutzer',
            type: 'direct',
            recipientId: String(profile.id),
        });
        openChat();
    };

    const handleSubscribeToggle = () => {
        const next = !isSubscribed;
        setIsSubscribed(next);
        setSubscriberCount((prev) => Math.max(0, next ? prev + 1 : prev - 1));
    };

    const formatDuration = (secs?: number) => {
        if (!secs) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="min-h-screen bg-canvas text-primary flex flex-col font-['Hanken_Grotesk',sans-serif]">
            <Header />

            <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Profile Header Hero Section */}
                <div className="relative rounded-3xl overflow-hidden bg-surface border border-subtle backdrop-blur-xl shadow-2xl p-6 sm:p-10">
                    {/* Subtle Background Glow Accent */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 text-center md:text-left">
                        {/* Avatar with Glow */}
                        <div className="relative group">
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-tr from-indigo-500 via-teal-400 to-indigo-600 shadow-xl">
                                <Image
                                    src={(isOwner && typeof currentUser?.avatarUrl !== 'undefined') ? (currentUser.avatarUrl || resolveAvatarUrl(profile.avatarUrl)) : (resolveAvatarUrl(profile.avatarUrl))}
                                    alt={profile.username}
                                    width={128}
                                    height={128}
                                    className="w-full h-full object-cover rounded-[22px] bg-surface"
                                    unoptimized
                                />
                            </div>
                            {isOwner && (
                                <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-indigo-500 text-white shadow-lg text-xs font-bold border border-subtle flex items-center gap-1" title="Du bist der Eigentümer">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
                                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                                            {profile.username}
                                        </h1>
                                        {isOwner ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                                {(t as any).channel?.ownerBadge || 'Dein Profil (Eigentümer)'}
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-surface-raised border border-subtle text-muted">
                                                {profile.handle}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-mono text-muted mt-1">
                                        {profile.handle}
                                    </p>
                                </div>

                                {/* Header Action Buttons */}
                                {!isOwner && (
                                    <div className="flex items-center gap-3">
                                        <SubscribeButton
                                            targetId={String(profile.id)}
                                            initialIsSubscribed={isSubscribed}
                                            initialCount={subscriberCount}
                                            size="md"
                                            showCount={false}
                                            onStatusChange={(newSubscribed, newCount) => {
                                                setIsSubscribed(newSubscribed);
                                                setSubscriberCount(newCount);
                                            }}
                                        />

                                        {canSendDM && (
                                            <button
                                                onClick={handleStartChat}
                                                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                <span>{(t as any).channel?.messageBtn || (t as any).common?.message || 'Nachricht'}</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <p className="text-sm text-primary max-w-2xl leading-relaxed">
                                {profile.bio}
                            </p>

                            {/* Stats Bar */}
                            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-muted font-medium justify-center md:justify-start">
                                <div className="flex items-center gap-2 bg-surface px-3.5 py-1.5 rounded-xl border border-subtle">
                                    <Film className="w-4 h-4 text-indigo-400" />
                                    <span className="font-bold text-primary">{stats.totalVideos}</span> {(t as any).userProfile?.stats?.videos || 'Videos'}
                                </div>
                                <div className="flex items-center gap-2 bg-surface px-3.5 py-1.5 rounded-xl border border-subtle">
                                    <Eye className="w-4 h-4 text-teal-400" />
                                    <span className="font-bold text-primary">{formatCount(stats.totalViews, lang)}</span> {(t as any).userProfile?.stats?.views || t.common.views || 'Aufrufe'}
                                </div>
                                <div className="flex items-center gap-2 bg-surface px-3.5 py-1.5 rounded-xl border border-subtle">
                                    <Heart className="w-4 h-4 text-rose-400" />
                                    <span className="font-bold text-primary">{formatCount(stats.totalLikes, lang)}</span> {(t as any).userProfile?.stats?.likes || 'Likes'}
                                </div>
                                {!isOwner && (
                                    <div className="flex items-center gap-2 bg-surface px-3.5 py-1.5 rounded-xl border border-subtle">
                                        <UserCheck className="w-4 h-4 text-amber-400" />
                                        <span className="font-bold text-primary">{formatCount(subscriberCount, lang)}</span> {(t as any).userProfile?.stats?.subscribers || 'Abonnenten'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Owner Control Callout Banner */}
                {isOwner && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-surface to-canvas border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-primary">{(t as any).userProfile?.ownerModeTitle || 'Eigentümer-Modus aktiv'}</h4>
                                <p className="text-xs text-muted">
                                    {(t as any).userProfile?.ownerModeDesc || 'Du siehst zusätzlich alle deine privaten Entwürfe & kannst deinen Kanal verwalten.'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={openSettingsModal}
                            className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Settings className="w-4 h-4 text-indigo-400" />
                            <span>{(t as any).header?.settings || 'Einstellungen'}</span>
                        </button>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex items-center border-b border-subtle gap-4 sm:gap-8 overflow-x-auto">
                    {/* TAB 1: Articles */}
                    <button
                        onClick={() => setActiveTab('articles')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'articles'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-muted hover:text-primary'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>{(t as any).userProfile?.tabs?.articles || 'Articles'} ({articleList.total})</span>
                    </button>

                    {/* TAB 2: Videos */}
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'videos'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-muted hover:text-primary'
                            }`}
                    >
                        <Video className="w-4 h-4" />
                        <span>{(t as any).userProfile?.tabs?.videos || 'Videos'} ({videoList.total})</span>
                    </button>

                    {/* TAB 3: Images */}
                    <button
                        onClick={() => setActiveTab('images')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'images'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-muted hover:text-primary'
                            }`}
                    >
                        <ImageIcon className="w-4 h-4" />
                        <span>{(t as any).userProfile?.tabs?.images || 'Images'} ({imageList.total})</span>
                    </button>

                    {/* TAB 4: Likes */}
                    <button
                        onClick={() => setActiveTab('likes')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'likes'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-muted hover:text-primary'
                            }`}
                    >
                        <Heart className="w-4 h-4" />
                        <span>{(t as any).userProfile?.tabs?.likes || 'Likes'} ({likesList.total})</span>
                    </button>

                    {/* TAB 5: Playlists */}
                    <button
                        onClick={() => setActiveTab('playlists')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'playlists'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-muted hover:text-primary'
                            }`}
                    >
                        <ListVideo className="w-4 h-4" />
                        <span>{(t as any).userProfile?.tabs?.playlists || 'Playlists'}</span>
                    </button>

                    {/* TAB 6: About Channel */}
                    <button
                        onClick={() => setActiveTab('about')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${activeTab === 'about'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-muted hover:text-primary'
                            }`}
                    >
                        <UserCheck className="w-4 h-4" />
                        <span>{(t as any).userProfile?.tabs?.about || 'About Channel'}</span>
                    </button>
                </div>

                {/* TAB 1: Articles Grid */}
                {activeTab === 'articles' && (
                  <>
                    <ProfileTabToolbar
                        sort={articleList.sort}
                        onSortChange={articleList.setSort}
                        searchInput={articleList.searchInput}
                        onSearchInput={articleList.setSearchInput}
                        onClearSearch={articleList.clearSearch}
                        total={articleList.total}
                        lang={lang}
                    />
                    <UserArticlesTab
                        articles={articles}
                        slug={profile.handle || profile.username}
                        t={t}
                        isOwner={isOwner}
                        onEditArticle={(art) => setEditingArticle(art)}
                    />
                    <ProfileTabLoadMore
                        hasMore={articleList.hasMore}
                        isLoadingMore={articleList.isLoadingMore}
                        onLoadMore={articleList.loadMore}
                        lang={lang}
                    />
                  </>
                )}

                {/* TAB 2: Videos Grid */}
                {activeTab === 'videos' && (
                    <div>
                        <ProfileTabToolbar
                            sort={videoList.sort}
                            onSortChange={videoList.setSort}
                            searchInput={videoList.searchInput}
                            onSearchInput={videoList.setSearchInput}
                            onClearSearch={videoList.clearSearch}
                            total={videoList.total}
                            lang={lang}
                        />
                        {videos.length === 0 ? (
                            <div className="text-center py-16 bg-surface/40 rounded-3xl border border-subtle p-8 space-y-4">
                                <Film className="w-12 h-12 text-muted mx-auto" />
                                <h3 className="text-lg font-bold text-primary">{(t as any).userProfile?.emptyVideos?.title || 'Noch keine Videos hochgeladen'}</h3>
                                <p className="text-xs text-muted max-w-sm mx-auto">
                                    {isOwner
                                        ? ((t as any).userProfile?.emptyVideos?.ownerSub || 'Lade jetzt dein erstes Video auf Omni hoch!')
                                        : ((t as any).userProfile?.emptyVideos?.guestSub || 'Dieser Ersteller hat noch keine öffentlichen Videos veröffentlicht.')}
                                </p>
                                {isOwner && (
                                    <button
                                        onClick={openVideoUploadModal}
                                        className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-xs hover:bg-indigo-600 transition-all inline-flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>{(t as any).userProfile?.emptyVideos?.uploadBtn || 'Jetzt Video hochladen'}</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                {videos.map((item: any) => {
                                    const thumb = item.thumbnailUrl || '/media/thumbnails/default.png';
                                    const isPrivate = item.visibility === 'private';

                                    return (
                                        <div
                                            key={item.slug || item.id}
                                            className="group relative bg-surface rounded-xl sm:rounded-2xl border border-subtle overflow-hidden hover:border-indigo-500/50 transition-all duration-300 shadow-lg flex flex-col"
                                        >
                                            {/* Thumbnail Container */}
                                            <Link href={`/video/${item.slug}`} className="relative aspect-video bg-surface-raised overflow-hidden block">
                                                <Image
                                                    src={thumb}
                                                    alt={item.title}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-indigo-500/90 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                                                        <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                                                    </div>
                                                </div>

                                                {/* Duration Badge */}
                                                {item.duration > 0 && (
                                                    <div className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 px-1.5 sm:px-2 py-0.5 rounded bg-black/80 text-[9px] sm:text-[11px] font-mono text-white border border-white/10">
                                                        {formatDuration(item.duration)}
                                                    </div>
                                                )}

                                                {/* Visibility Status Badge for Owner */}
                                                {isOwner && (
                                                    <div className="absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5">
                                                        {isPrivate ? (
                                                            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-amber-500/90 text-slate-950">
                                                                {(t as any).userProfile?.visibility?.privateDraft || 'Privat / Entwurf'}
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold bg-emerald-500/90 text-slate-950">
                                                                {(t as any).userProfile?.visibility?.public || 'Öffentlich'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </Link>

                                            {/* Details */}
                                            <div className="p-2.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
                                                <Link href={`/video/${item.slug}`} className="block group-hover:text-indigo-400 transition-colors">
                                                    <h3 className="font-bold text-xs sm:text-sm text-primary line-clamp-2 leading-snug">
                                                        {item.title}
                                                    </h3>
                                                </Link>

                                                <div className="pt-1.5 sm:pt-2 flex items-center justify-between text-[10px] sm:text-xs text-muted font-mono border-t border-subtle">
                                                    <div className="flex items-center gap-1">
                                                        <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted" />
                                                        <span>{formatCount(item.viewsCount || 0, lang)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {isOwner && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingVideo(item)}
                                                                aria-label={t.header.settings}
                                                                title={t.header.settings}
                                                                className="p-1 rounded-md text-muted hover:text-indigo-400 hover:bg-surface-raised transition-all"
                                                            >
                                                                <Settings className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <Heart className="w-3.5 h-3.5 text-rose-500/80" />
                                                        <span>{formatCount(item.likesCount || 0, lang)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <ProfileTabLoadMore
                            hasMore={videoList.hasMore}
                            isLoadingMore={videoList.isLoadingMore}
                            onLoadMore={videoList.loadMore}
                            lang={lang}
                        />
                    </div>
                )}

                {/* TAB 3: Images Grid */}
                {activeTab === 'images' && (
                  <>
                    <ProfileTabToolbar
                        sort={imageList.sort}
                        onSortChange={imageList.setSort}
                        searchInput={imageList.searchInput}
                        onSearchInput={imageList.setSearchInput}
                        onClearSearch={imageList.clearSearch}
                        total={imageList.total}
                        lang={lang}
                    />
                    <UserImagesTab
                        images={images}
                        slug={profile.handle || profile.username}
                        t={t}
                        isOwner={isOwner}
                        onEditImage={(img) => setEditingImage(img)}
                    />
                    <ProfileTabLoadMore
                        hasMore={imageList.hasMore}
                        isLoadingMore={imageList.isLoadingMore}
                        onLoadMore={imageList.loadMore}
                        lang={lang}
                    />
                  </>
                )}

                {/* TAB 4: Likes Grid */}
                {activeTab === 'likes' && (
                  <>
                    <UserLikesTab likes={likesList.items} slug={profile.handle || profile.username} t={t} />
                    <ProfileTabLoadMore
                        hasMore={likesList.hasMore}
                        isLoadingMore={likesList.isLoadingMore}
                        onLoadMore={likesList.loadMore}
                        lang={lang}
                    />
                  </>
                )}

                {/* TAB 5: Playlists */}
                {activeTab === 'playlists' && (
                    <UserPlaylistsTab isOwner={isOwner} t={t} />
                )}

                {/* TAB 6: About Channel Info */}
                {activeTab === 'about' && (
                    <div className="bg-surface rounded-3xl border border-subtle p-8 space-y-6">
                        <div>
                            <h3 className="text-base font-bold text-primary mb-2">{(t as any).userProfile?.about?.title || 'Über diesen Kanal'}</h3>
                            <p className="text-sm text-primary leading-relaxed max-w-3xl">
                                {profile.bio || ((t as any).userProfile?.about?.noBio || 'Keine Beschreibung angegeben.')}
                            </p>
                        </div>

                        <div className="pt-6 border-t border-subtle grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                            <div>
                                <span className="text-xs text-muted block mb-1">{(t as any).userProfile?.about?.username || 'Nutzername'}</span>
                                <span className="font-bold text-primary">{profile.username}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted block mb-1">{(t as any).userProfile?.about?.handle || 'Handle'}</span>
                                <span className="font-mono text-indigo-400">{profile.handle}</span>
                            </div>
                            <div>
                                <span className="text-xs text-muted block mb-1">{(t as any).userProfile?.about?.joined || 'Mitglied seit'}</span>
                                <span className="text-muted font-mono">
                                    {profile.createdAt
                                        ? formatAbsoluteDate(profile.createdAt, lang)
                                        : '2026'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

            {/* Video Settings Modal */}
            {editingVideo && (
                <VideoSettingsModal
                    documentId={editingVideo.documentId}
                    slug={editingVideo.slug}
                    onClose={() => setEditingVideo(null)}
                    onSave={() => router.refresh()}
                />
            )}

            {/* Article Edit Modal */}
            {editingArticle && (
                <ArticleEditModal
                    isOpen={Boolean(editingArticle)}
                    onClose={() => setEditingArticle(null)}
                    article={editingArticle}
                    t={t}
                    onSave={async ({ localeUpdates, visibility, thumbnail }: { localeUpdates: any[]; visibility: string; thumbnail?: string }) => {
                        const res = await fetch('/api/content/article/settings', {
                            method: 'PUT',
                            headers: jsonAuthHeaders(),
                            body: JSON.stringify({
                                documentId: editingArticle.documentId,
                                localeUpdates,
                                visibility,
                                thumbnail,
                            }),
                        });
                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error || 'Speichern fehlgeschlagen');
                        }
                        showToast('Artikel erfolgreich aktualisiert!');
                        setEditingArticle(null);
                        router.refresh();
                    }}
                    onDelete={async (hardDelete: boolean) => {
                        const url = `/api/content/article/settings?documentId=${encodeURIComponent(editingArticle.documentId)}${
                            hardDelete ? '&hard=true' : ''
                        }`;
                        const res = await fetch(url, {
                            method: 'DELETE',
                            headers: jsonAuthHeaders(),
                        });
                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error || 'Löschen fehlgeschlagen');
                        }
                        showToast('Artikel gelöscht.');
                        setEditingArticle(null);
                        router.refresh();
                    }}
                />
            )}

            {/* Image Edit Modal */}
            {editingImage && (
                <ImageEditModal
                    isOpen={Boolean(editingImage)}
                    onClose={() => setEditingImage(null)}
                    image={editingImage}
                    t={t}
                    onSave={async (data: { localeUpdates: any[]; visibility: string; thumbnailUrl?: string }) => {
                        const res = await fetch('/api/content/image/settings', {
                            method: 'PUT',
                            headers: jsonAuthHeaders(),
                            body: JSON.stringify({
                                documentId: editingImage.documentId,
                                localeUpdates: data.localeUpdates,
                                visibility: data.visibility,
                                // Same omission as on the detail page: the modal
                                // reports the chosen thumbnail and nobody passed
                                // it on, so it silently kept the old one.
                                thumbnailUrl: data.thumbnailUrl,
                            }),
                        });
                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error || 'Speichern fehlgeschlagen');
                        }
                        showToast('Bild erfolgreich aktualisiert!');
                        setEditingImage(null);
                        router.refresh();
                    }}
                    onDelete={async (hardDelete: boolean) => {
                        const url = `/api/content/image/settings?documentId=${encodeURIComponent(editingImage.documentId)}&hard=${hardDelete}`;
                        const res = await fetch(url, {
                            method: 'DELETE',
                            headers: jsonAuthHeaders(),
                        });
                        if (!res.ok) {
                            const errData = await res.json().catch(() => ({}));
                            throw new Error(errData.error || 'Löschen fehlgeschlagen');
                        }
                        showToast('Bild gelöscht.');
                        setEditingImage(null);
                        router.refresh();
                    }}
                />
            )}

            {/* Toast Notification */}
            <Toast message={toastMessage} />
        </main>
        </div>
    );
}
