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
import Image from 'next/image';
import NotificationDrawer from '@/components/NotificationDrawer';
import ThemeToggle from '@/components/ThemeToggle';
import { AVATAR_PLACEHOLDER, resolveAvatarUrl } from '@/lib/avatar';

export function OmniLogo({ size = 28 }: { size?: number }) {
  return (
    <Image
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

  const handleLogoutAction = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) { console.error('Unexpected error in catch block:', e); }
    try {
      localStorage.removeItem('omni_user');
      localStorage.removeItem('omni_jwt');
    } catch (e) { console.error('Unexpected error in catch block:', e); }
    if (onLogout) {
      onLogout();
    } else {
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
        className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-2xl border-b border-subtle px-3 sm:px-5 h-14 flex items-center justify-between gap-4 select-none"
        style={{ boxShadow: '0 1px 0 rgba(128,131,255,0.10), 0 4px 16px -4px rgba(8,14,30,0.80)' }}
      >
        {/* Brand & Menu */}
        <div className="flex items-center gap-2">
          {showMenuButton && (
            <button
              onClick={handleMenuClick}
              className="w-10 h-10 flex items-center justify-center hover:bg-surface-raised rounded-xl text-muted hover:text-primary transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-300" />
              <div className="relative rounded-xl bg-surface-1 border border-subtle p-1 group-hover:border-indigo-400/40 transition-colors duration-200 flex items-center justify-center">
                <OmniLogo size={28} />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-[17px] tracking-[-0.04em] text-primary leading-tight">
                Omni
              </span>
              <span className="hidden sm:inline-block text-[9px] font-semibold tracking-[0.12em] uppercase text-indigo-400 leading-none mt-0.5">
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
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/25'
              : 'bg-surface hover:bg-surface-raised text-primary border-subtle hover:border-subtle'
              }`}
            title="Algorithm Control"
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden sm:inline">{activeLang === 'de' ? t.header.algorithm : t.header.algorithm}</span>
          </button>

          {/* Language Switch */}
          <button
            onClick={handleLanguageClick}
            className="flex items-center gap-1.5 bg-surface hover:bg-surface-raised text-primary px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border border-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                  : 'bg-surface hover:bg-surface-raised text-primary border-subtle'
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
                className="flex items-center gap-2 bg-surface hover:bg-surface-raised p-1 sm:pr-2.5 rounded-xl border border-subtle transition-all duration-200 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label="Benutzermenü"
                aria-haspopup="menu"
                aria-expanded={userDropdownOpen}
              >
                <Image
                  src={resolveAvatarUrl(activeUser.avatarUrl)}
                  alt={activeUser.username}
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-lg object-cover border border-subtle shrink-0"
                  unoptimized
                />
                <span className="text-xs font-semibold text-primary hidden md:inline truncate max-w-[100px]">
                  {activeUser.username}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted group-hover:text-primary transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-surface-raised border border-subtle rounded-2xl shadow-2xl p-2 z-50 animate-scaleIn flex flex-col gap-1"
                  style={{ boxShadow: '0 12px 32px -8px rgba(0,0,0,0.5)' }}
                >
                  <div className="px-3 py-2 border-b border-subtle flex flex-col">
                    <span className="text-xs font-bold text-primary truncate">{activeUser.username}</span>
                    <span className="text-[10px] font-mono text-indigo-400 truncate">
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
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-surface transition-all text-left"
                  >
                    <Tv className="h-4 w-4 text-indigo-400" />
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
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-surface transition-all text-left"
                  >
                    <User className="h-4 w-4 text-teal-400" />
                    <span>{t.header.settings}</span>
                  </button>

                  <div className="my-1 border-t border-subtle" />

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
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25"
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
          <aside className="relative w-80 max-w-[85vw] bg-canvas border-r border-subtle flex flex-col gap-4 p-5 z-50 overflow-y-auto h-full shadow-2xl animate-slideRight">
            {/* Drawer Top Header */}
            <div className="flex items-center justify-between pb-4 border-b border-subtle">
              <Link
                href="/"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 group"
              >
                <div className="rounded-xl bg-surface border border-subtle p-1 group-hover:border-indigo-400/40 transition-colors flex items-center justify-center">
                  <OmniLogo size={28} />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="font-extrabold text-base text-primary">Omni Network</span>
                  <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider mt-0.5">
                    {t.header.navigation}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setUniversalNavOpen(false)}
                className="p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-raised transition-colors"
                title={t.common.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Main Navigation Links */}
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-faint mb-1">
                {t.header.mainNav}
              </p>

              <Link
                href="/"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-primary hover:bg-surface-raised transition-all font-medium"
              >
                <Home className="h-4.5 w-4.5 text-indigo-400" />
                <span>{t.header.homeFeed}</span>
              </Link>

              <Link
                href="/articles"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-primary hover:bg-surface-raised transition-all font-medium"
              >
                <FileText className="h-4.5 w-4.5 text-purple-400" />
                <span>{t.header?.articles || 'Articles'}</span>
              </Link>

              <Link
                href="/videos"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-primary hover:bg-surface-raised transition-all font-medium"
              >
                <Play className="h-4.5 w-4.5 text-indigo-400" />
                <span>{t.header.videos}</span>
              </Link>

              <Link
                href="/images"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-primary hover:bg-surface-raised transition-all font-medium"
              >
                <ImageIcon className="h-4.5 w-4.5 text-teal-400" />
                <span>{t.header?.images || 'Images'}</span>
              </Link>
            </div>

            <div className="border-t border-subtle my-1" />

            {/* Section 2: Creator Channels */}
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-faint mb-1 flex items-center gap-1">
                <Users className="h-3 w-3 text-indigo-400" />
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
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-muted hover:text-primary hover:bg-surface-raised transition-all text-left w-full cursor-pointer"
                >
                  <Image src={creator.avatarUrl} alt={creator.username} className="h-5 w-5 rounded-full object-cover border border-subtle shrink-0" />
                  <span className="font-mono text-indigo-300">@{creator.handle}</span>
                  <span className="text-[10px] text-faint truncate ml-auto">{creator.username}</span>
                </button>
              ))}
            </div>

            {/* Appearance */}
            <div className="pt-3 border-t border-subtle flex flex-col gap-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
                {t.header?.appearance || 'Darstellung'}
              </p>
              <ThemeToggle
                variant="inline"
                labels={{
                  heading: t.header?.appearance || 'Darstellung',
                  system: t.header?.themeSystem || 'System',
                  dark: t.header?.themeDark || 'Dunkel',
                  light: t.header?.themeLight || 'Hell',
                }}
              />
            </div>

            {/* Drawer Footer Link Card */}
            <div className="mt-auto pt-3 border-t border-subtle flex flex-col gap-2">
              <div className="bg-surface-1 border border-subtle p-3 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] text-faint uppercase tracking-wider font-semibold">Managed AI Stack</span>
                <a
                  href="https://inwebdesign.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link flex items-center justify-between text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors mt-0.5"
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
