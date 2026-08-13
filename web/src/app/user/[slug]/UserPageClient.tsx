'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { ProfileData } from './actions';
import { useApp } from '@/context/AppContext';
import Header from '@/components/Header';
import VideoSettingsModal from '@/components/VideoSettingsModal';
import { formatAbsoluteDate } from '@/lib/date';

interface UserPageClientProps {
    profileDataInit: ProfileData;
}

export default function UserPageClient({ profileDataInit }: UserPageClientProps) {
    const { profile, isOwner, videos, favorites, stats } = profileDataInit;
    const { t, lang, openVideoUploadModal } = useApp();

    const [activeTab, setActiveTab] = useState<'videos' | 'favorites' | 'about'>('videos');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriberCount, setSubscriberCount] = useState(profile.subscribersCount || 0);
    const [editingVideo, setEditingVideo] = useState<any | null>(null);

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
        <div className="min-h-screen bg-[#080e1e] text-[#dae2fd] flex flex-col font-['Hanken_Grotesk',sans-serif]">
            <Header />

            <main className="flex-1 max-w-content w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Profile Header Hero Section */}
                <div className="relative rounded-3xl overflow-hidden bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl p-6 sm:p-10">
                    {/* Subtle Background Glow Accent */}
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 text-center md:text-left">
                        {/* Avatar with Glow */}
                        <div className="relative group">
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-tr from-indigo-500 via-teal-400 to-indigo-600 shadow-xl">
                                <img
                                    src={profile.avatarUrl}
                                    alt={profile.username}
                                    className="w-full h-full object-cover rounded-[22px] bg-slate-950"
                                />
                            </div>
                            {isOwner && (
                                <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-indigo-500 text-white shadow-lg text-xs font-bold border border-slate-900 flex items-center gap-1" title="Du bist der Eigentümer">
                                    <ShieldCheck className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                        {/* Profile Info */}
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
                                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                                            {profile.username}
                                        </h1>
                                        {isOwner ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                                Dein Profil (Eigentümer)
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 border border-slate-700 text-slate-300">
                                                {profile.handle}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-mono text-slate-400 mt-1">
                                        {profile.handle}
                                    </p>
                                </div>

                                {/* Header Action Buttons */}
                                <div className="flex items-center gap-3">
                                    {isOwner ? (
                                        <>
                                            <button
                                                onClick={openVideoUploadModal}
                                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-600 hover:to-teal-600 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
                                            >
                                                <Upload className="w-4 h-4" />
                                                <span>Neues Video</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleSubscribeToggle}
                                                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${isSubscribed
                                                        ? 'bg-slate-800 border border-slate-700 text-slate-300'
                                                        : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                                                    }`}
                                            >
                                                {isSubscribed ? <UserCheck className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                                <span>{isSubscribed ? 'Abonniert' : 'Abonnieren'}</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                                {profile.bio}
                            </p>

                            {/* Stats Bar */}
                            <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-slate-400 font-medium justify-center md:justify-start">
                                <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800/80">
                                    <Film className="w-4 h-4 text-indigo-400" />
                                    <span className="font-bold text-white">{stats.totalVideos}</span> Videos
                                </div>
                                <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800/80">
                                    <Eye className="w-4 h-4 text-teal-400" />
                                    <span className="font-bold text-white">{stats.totalViews.toLocaleString()}</span> Aufrufe
                                </div>
                                <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800/80">
                                    <Heart className="w-4 h-4 text-rose-400" />
                                    <span className="font-bold text-white">{stats.totalLikes.toLocaleString()}</span> Likes
                                </div>
                                {!isOwner && (
                                    <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800/80">
                                        <UserCheck className="w-4 h-4 text-amber-400" />
                                        <span className="font-bold text-white">{subscriberCount.toLocaleString()}</span> Abonnenten
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Owner Control Callout Banner */}
                {isOwner && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Eigentümer-Modus aktiv</h4>
                                <p className="text-xs text-slate-400">
                                    Du siehst zusätzlich alle deine privaten Entwürfe & kannst deinen Kanal verwalten.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={openVideoUploadModal}
                            className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-300 font-semibold text-xs transition-all flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Neuer Upload</span>
                        </button>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex items-center border-b border-slate-800 gap-8">
                    <button
                        onClick={() => setActiveTab('videos')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'videos'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Video className="w-4 h-4" />
                        <span>Videos ({videos.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'favorites'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <Heart className="w-4 h-4" />
                        <span>Favoriten ({favorites.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('about')}
                        className={`pb-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === 'about'
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        <UserCheck className="w-4 h-4" />
                        <span>Kanal-Info</span>
                    </button>
                </div>

                {/* TAB 1: Videos Grid */}
                {activeTab === 'videos' && (
                    <div>
                        {videos.length === 0 ? (
                            <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800/80 p-8 space-y-4">
                                <Film className="w-12 h-12 text-slate-600 mx-auto" />
                                <h3 className="text-lg font-bold text-slate-300">Noch keine Videos hochgeladen</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    {isOwner
                                        ? 'Lade jetzt dein erstes Video auf Omni hoch!'
                                        : 'Dieser Ersteller hat noch keine öffentlichen Videos veröffentlicht.'}
                                </p>
                                {isOwner && (
                                    <button
                                        onClick={openVideoUploadModal}
                                        className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white font-bold text-xs hover:bg-indigo-600 transition-all inline-flex items-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>Jetzt Video hochladen</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {videos.map((item: any) => {
                                    const thumb = item.thumbnailUrl || '/media/thumbnails/default.png';
                                    const isPrivate = item.visibility === 'private';

                                    return (
                                        <div
                                            key={item.slug || item.id}
                                            className="group relative bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden hover:border-indigo-500/50 transition-all duration-300 shadow-lg flex flex-col"
                                        >
                                            {/* Thumbnail Container */}
                                            <Link href={`/video/${item.slug}`} className="relative aspect-video bg-slate-950 overflow-hidden block">
                                                <img
                                                    src={thumb}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                                                {/* Play Button Overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-12 h-12 rounded-full bg-indigo-500/90 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                                                        <Play className="w-5 h-5 fill-current ml-0.5" />
                                                    </div>
                                                </div>

                                                {/* Duration Badge */}
                                                {item.duration > 0 && (
                                                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-[11px] font-mono text-slate-200 border border-slate-800">
                                                        {formatDuration(item.duration)}
                                                    </div>
                                                )}

                                                {/* Visibility Status Badge for Owner */}
                                                {isOwner && (
                                                    <div className="absolute top-2.5 left-2.5">
                                                        {isPrivate ? (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/90 text-slate-950">
                                                                Privat / Entwurf
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/90 text-slate-950">
                                                                Öffentlich
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </Link>

                                            {/* Content Info */}
                                            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                                                <Link href={`/video/${item.slug}`} className="block group-hover:text-indigo-400 transition-colors">
                                                    <h3 className="font-bold text-sm text-slate-100 line-clamp-2 leading-snug">
                                                        {item.title}
                                                    </h3>
                                                </Link>

                                                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono border-t border-slate-800/60">
                                                    <div className="flex items-center gap-1.5">
                                                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                                                        <span>{(item.viewsCount || 0).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {isOwner && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingVideo(item)}
                                                                aria-label={t.header.settings}
                                                                title={t.header.settings}
                                                                className="p-1 rounded-md text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-all"
                                                            >
                                                                <Settings className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <Heart className="w-3.5 h-3.5 text-rose-500/80" />
                                                        <span>{(item.likesCount || 0).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: Favorites Grid */}
                {activeTab === 'favorites' && (
                    <div>
                        {favorites.length === 0 ? (
                            <div className="text-center py-16 bg-slate-900/30 rounded-3xl border border-slate-800/80 p-8 space-y-3">
                                <Heart className="w-12 h-12 text-slate-600 mx-auto" />
                                <h3 className="text-lg font-bold text-slate-300">Keine Favoriten vorhanden</h3>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    {isOwner
                                        ? 'Videos, die du mit dem Herz-Button likest, erscheinen hier.'
                                        : 'Dieser Nutzer hat noch keine öffentlichen Favoriten geteilt.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {favorites.map((item: any) => {
                                    const thumb = item.thumbnailUrl || '/media/thumbnails/default.png';
                                    const itemHref = item.mediaType === 'content' ? `/content/${item.slug}` : `/video/${item.slug}`;

                                    return (
                                        <div
                                            key={(item.slug || item.id) + (item.mediaType || 'video')}
                                            className="group relative bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden hover:border-rose-500/50 transition-all duration-300 shadow-lg flex flex-col"
                                        >
                                            <Link href={itemHref} className="relative aspect-video bg-slate-950 overflow-hidden block">
                                                <img
                                                    src={thumb}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                                                {item.mediaType === 'video' && (
                                                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-[11px] font-mono text-slate-200 border border-slate-800">
                                                        {formatDuration(item.duration)}
                                                    </div>
                                                )}
                                                {item.mediaType === 'content' && (
                                                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-950/80 text-[11px] font-mono text-slate-200 border border-slate-800">
                                                        Content
                                                    </div>
                                                )}
                                            </Link>

                                            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                                                <Link href={itemHref} className="block group-hover:text-rose-400 transition-colors">
                                                    <h3 className="font-bold text-sm text-slate-100 line-clamp-2 leading-snug">
                                                        {item.title}
                                                    </h3>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: About Channel Info */}
                {activeTab === 'about' && (
                    <div className="bg-slate-900/60 rounded-3xl border border-slate-800/80 p-8 space-y-6">
                        <div>
                            <h3 className="text-base font-bold text-white mb-2">Über diesen Kanal</h3>
                            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                                {profile.bio || 'Keine Beschreibung angegeben.'}
                            </p>
                        </div>

                        <div className="pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                            <div>
                                <span className="text-xs text-slate-500 block mb-1">Nutzername</span>
                                <span className="font-bold text-white">{profile.username}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block mb-1">Handle</span>
                                <span className="font-mono text-indigo-400">{profile.handle}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block mb-1">Mitglied seit</span>
                                <span className="text-slate-300 font-mono">
                                    {profile.createdAt
                                        ? formatAbsoluteDate(profile.createdAt, lang)
                                        : '2026'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

            {/* Video Settings Modal (opened from "Mein Kanal" video cards) */}
            {editingVideo && (
                <VideoSettingsModal
                    documentId={editingVideo.documentId}
                    slug={editingVideo.slug}
                    onClose={() => setEditingVideo(null)}
                />
            )}
        </main>
        </div>
    );
}
