'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  BookOpen,
  Users,
  ExternalLink,
  X,
  Upload,
  Bell,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useNotifications } from '@/context/NotificationContext';
import { DEMO_CREATORS } from '@/config/demo';
import NotificationDrawer from '@/components/NotificationDrawer';

export function OmniLogo({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/android-chrome-192x192.png"
      alt="Omni Logo"
      width={size}
      height={size}
      className="object-contain rounded-md shrink-0"
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
    openAlgoModal,
    t,
  } = useApp();

  const { unreadCount } = useNotifications();
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [universalNavOpen, setUniversalNavOpen] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationDrawerOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationDrawerOpen(false);
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleNotificationDrawer = () => {
    setNotificationDrawerOpen((prev) => {
      const next = !prev;
      if (next) setUserDropdownOpen(false);
      return next;
    });
  };

  const toggleUserDropdown = () => {
    setUserDropdownOpen((prev) => {
      const next = !prev;
      if (next) setNotificationDrawerOpen(false);
      return next;
    });
  };

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
    if (!activeUser) {
      openAuthModal();
      return;
    }
    if (onToggleAlgoDrawer) {
      onToggleAlgoDrawer();
    } else {
      openAlgoModal();
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
    const rawName = usr.username || (usr as any).email || 'user';
    return `@${rawName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
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
              className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-[#9ba4bf] hover:text-white transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8083ff]"
              title={t.header.openNav}
              aria-label="Toggle navigation drawer"
              aria-haspopup="dialog"
              aria-expanded={universalNavOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <Link href="/" className="flex items-center gap-3 group select-none">
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-600 via-[#8083ff] to-purple-600 opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-300" />
              <div className="relative rounded-xl bg-[#0d1528] border border-white/15 p-1 group-hover:border-indigo-400/40 transition-colors duration-200 flex items-center justify-center">
                <OmniLogo size={28} />
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
            className="flex items-center gap-1.5 glass-surface hover:bg-white/6 text-[#dae2fd] px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border border-white/8 hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8083ff]"
            title="Language"
            aria-label={activeLang === 'de' ? "Sprache wechseln zu Englisch" : "Switch language to German"}
          >
            {activeLang === 'de' ? <GermanFlag /> : <UKFlag />}
            <span className="font-mono text-[11px] font-bold uppercase">{activeLang}</span>
          </button>

          {/* Notification Bell Button */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={toggleNotificationDrawer}
              className={`relative flex items-center justify-center p-2 rounded-xl text-xs font-semibold transition-all duration-200 border focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                notificationDrawerOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
                  : 'glass-surface hover:bg-white/6 text-[#dae2fd] border-white/8 hover:border-white/20'
              }`}
              title="Benachrichtigungen"
              aria-label="Benachrichtigungen"
              aria-haspopup="dialog"
              aria-expanded={notificationDrawerOpen}
            >
              <Bell className="h-4 w-4 text-indigo-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <NotificationDrawer
              isOpen={notificationDrawerOpen}
              onClose={() => setNotificationDrawerOpen(false)}
            />
          </div>

          {/* User Account Popover */}
          {activeUser ? (
            <div ref={userDropdownRef} className="relative">
              <button
                type="button"
                onClick={toggleUserDropdown}
                className="flex items-center gap-2 glass-surface hover:bg-white/8 p-1 sm:pr-2.5 rounded-xl border border-white/8 hover:border-white/20 transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8083ff]"
                aria-label="Benutzermenü"
                aria-haspopup="menu"
                aria-expanded={userDropdownOpen}
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
                <div className="rounded-xl bg-[#0d1528] border border-white/15 p-1 group-hover:border-[#8083ff]/40 transition-colors flex items-center justify-center">
                  <OmniLogo size={28} />
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
                href="/images"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <ImageIcon className="h-4.5 w-4.5 text-[#44e2cd]" />
                <span>{t.header?.images || 'Bilder & Galerie'}</span>
              </Link>
            </div>

            <div className="border-t border-white/5 my-1" />

            {/* Section 2: Creator Channels */}
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c657d] mb-1 flex items-center gap-1">
                <Users className="h-3 w-3 text-[#8083ff]" />
                <span>{t.header.channelsCreators}</span>
              </p>
              {DEMO_CREATORS.map((creator) => (
                <button
                  key={creator.handle}
                  type="button"
                  onClick={() => {
                    setUniversalNavOpen(false);
                    openChannelModal({
                      username: creator.username,
                      handle: `@${creator.handle}`,
                      avatarUrl: creator.avatarUrl,
                    });
                  }}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-[#9ba4bf] hover:text-white hover:bg-white/5 transition-all text-left w-full cursor-pointer"
                >
                  <img src={creator.avatarUrl} alt={creator.username} className="h-5 w-5 rounded-full object-cover border border-white/20 shrink-0" />
                  <span className="font-mono text-[#c0c1ff]">@{creator.handle}</span>
                  <span className="text-[10px] text-[#5c657d] truncate ml-auto">{creator.username}</span>
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
