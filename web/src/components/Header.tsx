'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sliders,
  Menu,
  ChevronDown,
  Tv,
  Sparkles,
  LogOut,
  User,
  Home,
  Flame,
  Film,
  FileText,
  Play,
  BookOpen,
  Users,
  ExternalLink,
  X,
  Upload,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function OmniLogo({ size = 24 }: { size?: number }) {
  return (
    <img
      src="/android-chrome-192x192.png"
      alt="Omni Logo"
      width={size}
      height={size}
      className="object-contain rounded-lg shrink-0"
    />
  );
}

export function GermanFlag({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg className={`${className} rounded-[2px] overflow-hidden shrink-0 shadow-sm`} viewBox="0 0 5 3" aria-hidden="true">
      <rect width="5" height="1" y="0" fill="#000000" />
      <rect width="5" height="1" y="1" fill="#DD0000" />
      <rect width="5" height="1" y="2" fill="#FFCC00" />
    </svg>
  );
}

export function UKFlag({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg className={`${className} rounded-[2px] overflow-hidden shrink-0 shadow-sm`} viewBox="0 0 60 30" aria-hidden="true">
      <clipPath id="gb-s-hdr"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <clipPath id="gb-t-hdr"><path d="M30,15 H0 V0 z M30,15 V0 h30 z M30,15 h30 v15 z M30,15 v15 H0 z" /></clipPath>
      <g clipPath="url(#gb-s-hdr)">
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#cf142b" strokeWidth="4" clipPath="url(#gb-t-hdr)" />
        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#cf142b" strokeWidth="6" />
      </g>
    </svg>
  );
}

interface HeaderProps {
  onToggleSidebar?: () => void;
  onToggleAlgoDrawer?: () => void;
  algoDrawerOpen?: boolean;
  lang?: 'de' | 'en';
  onToggleLanguage?: () => void;
  currentUser?: { id?: number; username: string; handle?: string; avatarUrl?: string; bio?: string; subscribersCount?: number } | null;
  onOpenAuthModal?: () => void;
  onOpenProfileModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenCreateModal?: () => void;
  onOpenVideoUploadModal?: () => void;
  onLogout?: () => void;
  showMenuButton?: boolean;
}

export default function Header({
  onToggleSidebar,
  onToggleAlgoDrawer,
  algoDrawerOpen = false,
  lang: propLang,
  onToggleLanguage: propToggleLang,
  currentUser: propUser,
  onOpenAuthModal,
  onOpenProfileModal,
  onOpenSettingsModal,
  onOpenCreateModal,
  onOpenVideoUploadModal,
  onLogout,
  showMenuButton = true,
}: HeaderProps) {
  const router = useRouter();
  const {
    currentUser: appContextUser,
    lang: appLang,
    toggleLanguage: appToggleLang,
    openVideoUploadModal,
    openChannelModal,
    openSettingsModal,
    openAuthModal,
    openCreateItemModal,
    t,
  } = useApp();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [universalNavOpen, setUniversalNavOpen] = useState(false);

  const activeLang = propLang || appLang;
  const activeUser = propUser !== undefined ? propUser : appContextUser;

  const handleLanguageClick = () => {
    if (propToggleLang) {
      propToggleLang();
    } else {
      appToggleLang();
    }
  };

  const handleMenuClick = () => {
    if (onToggleSidebar) {
      onToggleSidebar();
    }
    setUniversalNavOpen(true);
  };

  const handleAlgoClick = () => {
    if (onToggleAlgoDrawer) {
      onToggleAlgoDrawer();
    } else {
      router.push('/?algo=open');
    }
  };

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    } else {
      try {
        localStorage.removeItem('omni_user');
        localStorage.removeItem('omni_jwt');
        document.cookie = 'omni_jwt=; path=/; max-age=0';
        document.cookie = 'omni_user_jwt=; path=/; max-age=0';
      } catch (e) { }
      window.location.reload();
    }
  };

  const getUserHandleString = (usr: typeof activeUser) => {
    if (!usr) return '@creator';
    if (usr.handle) return usr.handle.startsWith('@') ? usr.handle : `@${usr.handle}`;
    return `@${usr.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-[#080e1e]/90 backdrop-blur-2xl border-b border-white/5 px-3 sm:px-5 h-14 flex items-center justify-between gap-4 select-none"
        style={{ boxShadow: '0 1px 0 rgba(128,131,255,0.10), 0 4px 16px -4px rgba(8,14,30,0.80)' }}
      >
        {/* Brand & Menu */}
        <div className="flex items-center gap-2">
          {showMenuButton && (
            <button
              onClick={handleMenuClick}
              className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-[#9ba4bf] hover:text-white transition-all duration-200"
              title={t.header.openNav}
              aria-label="Toggle navigation drawer"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link href="/" className="flex items-center gap-3 group select-none">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#8083ff] via-[#44e2cd] to-[#ffb783] opacity-30 blur-md group-hover:opacity-60 transition-opacity duration-300" />
              <div className="relative rounded-xl bg-[#0d1528] border border-white/10 p-1.5 group-hover:border-white/20 transition-colors duration-200">
                <OmniLogo size={22} />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-[17px] tracking-[-0.04em] text-white leading-tight">
                Omni
              </span>
              <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-[#8083ff] leading-none mt-0.5">
                BY INWEBDESIGN
              </span>
            </div>
          </Link>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          {/* Algorithm Control */}
          <button
            onClick={handleAlgoClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${algoDrawerOpen
              ? 'bg-[#8083ff] text-white border-[#8083ff] shadow-lg shadow-[#8083ff]/25'
              : 'glass-surface hover:bg-white/6 text-[#dae2fd] border-white/8 hover:border-white/20'
              }`}
            title="Algorithm Control"
          >
            <Sliders className="h-3.5 w-3.5 text-[#8083ff]" />
            <span className="hidden sm:inline">{activeLang === 'de' ? t.header.algorithm : t.header.algorithm}</span>
          </button>

          {/* Language Switch */}
          <button
            onClick={handleLanguageClick}
            className="flex items-center gap-1.5 glass-surface hover:bg-white/6 text-[#dae2fd] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border border-white/8 hover:border-white/20"
            title="Language"
          >
            {activeLang === 'de' ? <GermanFlag /> : <UKFlag />}
            <span className="font-mono text-[11px] font-bold uppercase">{activeLang}</span>
          </button>

          {/* User Account Popover */}
          {activeUser ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 glass-surface hover:bg-white/8 p-1 sm:pr-2.5 rounded-xl border border-white/8 hover:border-white/20 transition-all duration-200 group"
              >
                <img
                  src={activeUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80'}
                  alt={activeUser.username}
                  className="w-7 h-7 rounded-lg object-cover border border-white/20 shrink-0"
                />
                <span className="text-xs font-semibold text-white hidden md:inline truncate max-w-[100px]">
                  {activeUser.username}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-[#9ba4bf] group-hover:text-white transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-[#0d1528] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-scaleIn flex flex-col gap-1"
                  style={{ boxShadow: '0 12px 32px -8px rgba(8,14,30,0.95), 0 1px 0 rgba(128,131,255,0.15)' }}
                >
                  <div className="px-3 py-2 border-b border-white/6 flex flex-col">
                    <span className="text-xs font-bold text-white truncate">{activeUser.username}</span>
                    <span className="text-[10px] font-mono text-[#8083ff] truncate">
                      {getUserHandleString(activeUser)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      const channelHandle = (activeUser?.handle || activeUser?.username || '').replace(/^@/, '');
                      if (channelHandle) {
                        router.push(`/user/${encodeURIComponent(channelHandle)}`);
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#dae2fd] hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <Tv className="h-4 w-4 text-[#8083ff]" />
                    <span>{t.header.myChannel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenSettingsModal) {
                        onOpenSettingsModal();
                      } else {
                        openSettingsModal();
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#dae2fd] hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <User className="h-4 w-4 text-[#44e2cd]" />
                    <span>{t.header.settings}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenVideoUploadModal) {
                        onOpenVideoUploadModal();
                      } else {
                        openVideoUploadModal();
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#dae2fd] hover:text-white hover:bg-[#8083ff]/15 transition-all text-left"
                  >
                    <Upload className="h-4 w-4 text-[#8083ff]" />
                    <span>{activeLang === 'de' ? t.header.uploadVideo : t.header.uploadVideo}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenCreateModal) {
                        onOpenCreateModal();
                      } else {
                        openCreateItemModal();
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#dae2fd] hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <Sparkles className="h-4 w-4 text-[#ffb783]" />
                    <span>{activeLang === 'de' ? t.header.createPost : t.header.createPost}</span>
                  </button>

                  <div className="my-1 border-t border-white/5" />

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleLogoutAction();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all text-left"
                  >
                    <LogOut className="h-4 w-4 text-red-400" />
                    <span>{t.header.logout}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                if (onOpenAuthModal) {
                  onOpenAuthModal();
                } else {
                  openAuthModal();
                }
              }}
              className="flex items-center gap-1.5 bg-[#8083ff] hover:bg-[#6b6eff] active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-lg shadow-[#8083ff]/25"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{activeLang === 'de' ? t.header.login : t.header.login}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Universal Slide-Over Navigation Drawer ────────────────────────── */}
      {universalNavOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fadeIn"
            onClick={() => setUniversalNavOpen(false)}
          />

          {/* Slide-over Drawer Canvas */}
          <aside className="relative w-80 max-w-[85vw] bg-[#080e1e] border-r border-white/10 flex flex-col gap-4 p-5 z-50 overflow-y-auto h-full shadow-2xl animate-slideRight">
            {/* Drawer Top Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <Link
                href="/"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 group"
              >
                <div className="rounded-xl bg-[#0d1528] border border-white/10 p-1.5 group-hover:border-[#8083ff]/40 transition-colors">
                  <OmniLogo size={22} />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-extrabold text-base text-white">Omni Network</span>
                  <span className="text-[9px] font-mono text-[#8083ff] uppercase tracking-wider mt-0.5">
                    {t.header.navigation}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setUniversalNavOpen(false)}
                className="p-2 rounded-xl text-[#9ba4bf] hover:text-white hover:bg-white/5 transition-colors"
                title={t.common.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Main Navigation Links */}
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c657d] mb-1">
                {t.header.mainNav}
              </p>

              <Link
                href="/"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Home className="h-4.5 w-4.5 text-[#8083ff]" />
                <span>{t.header.homeFeed}</span>
              </Link>

              <Link
                href="/videos"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Play className="h-4.5 w-4.5 text-[#8083ff]" />
                <span>{t.header.videos}</span>
              </Link>

              <Link
                href="/?tab=trending"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Flame className="h-4.5 w-4.5 text-[#ffb783]" />
                <span>{t.header.trendingPopular}</span>
              </Link>

              <Link
                href="/?tab=subscriptions"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Tv className="h-4.5 w-4.5 text-[#44e2cd]" />
                <span>{t.header.mySubscriptions}</span>
              </Link>

              <Link
                href="/?tab=library"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <BookOpen className="h-4.5 w-4.5 text-[#c0c1ff]" />
                <span>{t.header.myLibrary}</span>
              </Link>

              <Link
                href="/shorts"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Film className="h-4.5 w-4.5 text-[#ff6b81]" />
                <span>{t.header.shorts}</span>
              </Link>

              <Link
                href="/?type=pdf"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <FileText className="h-4.5 w-4.5 text-red-400" />
                <span>{t.header.pdfDocs}</span>
              </Link>

              <Link
                href="/?type=article"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <BookOpen className="h-4.5 w-4.5 text-[#44e2cd]" />
                <span>{t.header.exclusiveArticles}</span>
              </Link>
            </div>

            <div className="border-t border-white/5 my-1" />

            {/* Section 2: Creator Channels */}
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c657d] mb-1 flex items-center gap-1">
                <Users className="h-3 w-3 text-[#8083ff]" />
                <span>{t.header.channelsCreators}</span>
              </p>
              {[
                { handle: '@astro', label: 'Astro-Wissen', avatar: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=150&q=80' },
                { handle: '@demotech', label: 'Database Guru', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80' },
                { handle: '@demogourmet', label: 'Culinary Masterclass', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80' },
                { handle: '@greenplanet', label: 'Green Planet Doku', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80' },
                { handle: '@omniarchitect', label: 'Omni Architect', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80' },
                { handle: '@catmania', label: 'Familie & Tiere', avatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&q=80' },
                { handle: '@finanzkompass', label: 'FinanzKompass', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80' },
              ].map((creator) => (
                <button
                  key={creator.handle}
                  type="button"
                  onClick={() => {
                    setUniversalNavOpen(false);
                    openChannelModal({
                      username: creator.label,
                      handle: creator.handle,
                      avatarUrl: creator.avatar,
                    });
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-[#9ba4bf] hover:text-white hover:bg-white/5 transition-all text-left w-full cursor-pointer"
                >
                  <img src={creator.avatar} alt={creator.label} className="h-5 w-5 rounded-full object-cover border border-white/20 shrink-0" />
                  <span className="font-mono text-[#c0c1ff]">{creator.handle}</span>
                  <span className="text-[10px] text-[#5c657d] truncate ml-auto">{creator.label}</span>
                </button>
              ))}
            </div>

            {/* Drawer Footer Link Card */}
            <div className="mt-auto pt-3 border-t border-white/10 flex flex-col gap-2">
              <div className="bg-[#0d1528] border border-white/6 p-3 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] text-[#5c657d] uppercase tracking-wider font-semibold">Managed AI Stack</span>
                <a
                  href="https://inwebdesign.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link flex items-center justify-between text-[#8083ff] hover:text-[#c0c1ff] text-xs font-semibold transition-colors mt-0.5"
                >
                  <span>InWebDesign.net</span>
                  <ExternalLink className="h-3.5 w-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
