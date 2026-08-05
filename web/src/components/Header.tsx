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
} from 'lucide-react';

export function OmniLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-outer-hdr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8083ff" />
          <stop offset="50%" stopColor="#44e2cd" />
          <stop offset="100%" stopColor="#ffb783" />
        </linearGradient>
        <linearGradient id="logo-inner-hdr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c0c1ff" />
          <stop offset="100%" stopColor="#44e2cd" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" stroke="url(#logo-outer-hdr)" strokeWidth="1.5" fill="none" opacity="0.6" />
      <circle cx="20" cy="20" r="13" stroke="url(#logo-inner-hdr)" strokeWidth="1" fill="none" opacity="0.4" strokeDasharray="2 3" />
      <circle cx="20" cy="20" r="8" fill="url(#logo-outer-hdr)" opacity="0.15" />
      <circle cx="20" cy="20" r="5.5" fill="url(#logo-outer-hdr)" opacity="0.25" />
      <circle cx="20" cy="20" r="2.5" fill="url(#logo-inner-hdr)" />
      <line x1="20" y1="4" x2="20" y2="8" stroke="url(#logo-outer-hdr)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="32" x2="20" y2="36" stroke="url(#logo-outer-hdr)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="20" x2="8" y2="20" stroke="url(#logo-outer-hdr)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="20" x2="36" y2="20" stroke="url(#logo-outer-hdr)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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
      <clipPath id="gb-s-hdr"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
      <clipPath id="gb-t-hdr"><path d="M30,15 H0 V0 z M30,15 V0 h30 z M30,15 h30 v15 z M30,15 v15 H0 z"/></clipPath>
      <g clipPath="url(#gb-s-hdr)">
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#cf142b" strokeWidth="4" clipPath="url(#gb-t-hdr)"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#cf142b" strokeWidth="6"/>
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
  onOpenUserProfileModal?: () => void;
  onOpenSettingsModal?: () => void;
  onOpenCreateModal?: () => void;
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
  onOpenUserProfileModal,
  onOpenSettingsModal,
  onOpenCreateModal,
  onLogout,
  showMenuButton = true,
}: HeaderProps) {
  const router = useRouter();

  // Internal state
  const [internalLang, setInternalLang] = useState<'de' | 'en'>('de');
  const [internalUser, setInternalUser] = useState<{ id?: number; username: string; handle?: string; avatarUrl?: string; bio?: string; subscribersCount?: number } | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [universalNavOpen, setUniversalNavOpen] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('omni_lang') as 'de' | 'en';
      if (savedLang === 'de' || savedLang === 'en') {
        setInternalLang(savedLang);
      }
      const savedUser = localStorage.getItem('omni_user');
      if (savedUser) {
        setInternalUser(JSON.parse(savedUser));
      }
    } catch (e) {}
  }, []);

  const activeLang = propLang || internalLang;
  const activeUser = propUser !== undefined ? propUser : internalUser;

  const handleLanguageClick = () => {
    if (propToggleLang) {
      propToggleLang();
    } else {
      const next = activeLang === 'de' ? 'en' : 'de';
      setInternalLang(next);
      try {
        localStorage.setItem('omni_lang', next);
      } catch (e) {}
      window.location.reload();
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
      } catch (e) {}
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
              title={activeLang === 'de' ? 'Navigation öffnen' : 'Open Navigation'}
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
              algoDrawerOpen
                ? 'bg-[#8083ff] text-white border-[#8083ff] shadow-lg shadow-[#8083ff]/25'
                : 'glass-surface hover:bg-white/6 text-[#dae2fd] border-white/8 hover:border-white/20'
            }`}
            title="Algorithm Control"
          >
            <Sliders className="h-3.5 w-3.5 text-[#8083ff]" />
            <span className="hidden sm:inline">{activeLang === 'de' ? 'Algorithmus' : 'Algorithm'}</span>
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
                      if (onOpenUserProfileModal) {
                        onOpenUserProfileModal();
                      } else {
                        router.push('/?tab=library');
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#dae2fd] hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <Tv className="h-4 w-4 text-[#8083ff]" />
                    <span>{activeLang === 'de' ? 'Mein Kanal' : 'My Channel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenSettingsModal) {
                        onOpenSettingsModal();
                      } else {
                        router.push('/');
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#dae2fd] hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <User className="h-4 w-4 text-[#44e2cd]" />
                    <span>{activeLang === 'de' ? 'Einstellungen' : 'Settings'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      if (onOpenCreateModal) {
                        onOpenCreateModal();
                      } else {
                        router.push('/');
                      }
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#dae2fd] hover:text-white hover:bg-white/5 transition-all text-left"
                  >
                    <Sparkles className="h-4 w-4 text-[#ffb783]" />
                    <span>{activeLang === 'de' ? 'Neuen Beitrag erstellen' : 'Create Post'}</span>
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
                    <span>{activeLang === 'de' ? 'Abmelden' : 'Log Out'}</span>
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
                  router.push('/');
                }
              }}
              className="flex items-center gap-1.5 bg-[#8083ff] hover:bg-[#6b6eff] active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-lg shadow-[#8083ff]/25"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{activeLang === 'de' ? 'Anmelden' : 'Sign In'}</span>
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
                    {activeLang === 'de' ? 'Navigation' : 'Navigation'}
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setUniversalNavOpen(false)}
                className="p-2 rounded-xl text-[#9ba4bf] hover:text-white hover:bg-white/5 transition-colors"
                title="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Section 1: Main Navigation Links */}
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c657d] mb-1">
                {activeLang === 'de' ? 'Hauptnavigation' : 'Main Navigation'}
              </p>

              <Link
                href="/"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Home className="h-4.5 w-4.5 text-[#8083ff]" />
                <span>{activeLang === 'de' ? 'Startseite / Feed' : 'Home / Feed'}</span>
              </Link>

              <Link
                href="/?tab=trending"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Flame className="h-4.5 w-4.5 text-[#ffb783]" />
                <span>{activeLang === 'de' ? 'Trending & Popular' : 'Trending & Popular'}</span>
              </Link>

              <Link
                href="/?tab=subscriptions"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Tv className="h-4.5 w-4.5 text-[#44e2cd]" />
                <span>{activeLang === 'de' ? 'Meine Abonnements' : 'My Subscriptions'}</span>
              </Link>

              <Link
                href="/?tab=library"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <BookOpen className="h-4.5 w-4.5 text-[#c0c1ff]" />
                <span>{activeLang === 'de' ? 'Meine Bibliothek' : 'My Library'}</span>
              </Link>

              <Link
                href="/shorts"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Film className="h-4.5 w-4.5 text-[#ff6b81]" />
                <span>{activeLang === 'de' ? 'Shorts & Reels' : 'Shorts & Reels'}</span>
              </Link>

              <Link
                href="/?type=pdf"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <FileText className="h-4.5 w-4.5 text-red-400" />
                <span>{activeLang === 'de' ? 'PDF Dokumentationen' : 'PDF Documentations'}</span>
              </Link>

              <Link
                href="/?type=video"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <Play className="h-4.5 w-4.5 text-[#8083ff]" />
                <span>{activeLang === 'de' ? 'Video Tutorials' : 'Video Tutorials'}</span>
              </Link>

              <Link
                href="/?type=article"
                onClick={() => setUniversalNavOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-[#dae2fd] hover:bg-white/6 hover:text-white transition-all font-medium"
              >
                <BookOpen className="h-4.5 w-4.5 text-[#44e2cd]" />
                <span>{activeLang === 'de' ? 'Exklusive Artikel' : 'Exclusive Articles'}</span>
              </Link>
            </div>

            <div className="border-t border-white/5 my-1" />

            {/* Section 2: Creator Channels */}
            <div className="flex flex-col gap-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c657d] mb-1 flex items-center gap-1">
                <Users className="h-3 w-3 text-[#8083ff]" />
                <span>{activeLang === 'de' ? 'Kanäle & Creator' : 'Channels & Creators'}</span>
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
                <Link
                  key={creator.handle}
                  href={`/?channel=${creator.handle.replace(/^@/, '')}`}
                  onClick={() => setUniversalNavOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs text-[#9ba4bf] hover:text-white hover:bg-white/5 transition-all"
                >
                  <img src={creator.avatar} alt={creator.label} className="h-5 w-5 rounded-full object-cover border border-white/20 shrink-0" />
                  <span className="font-mono text-[#c0c1ff]">{creator.handle}</span>
                  <span className="text-[10px] text-[#5c657d] truncate ml-auto">{creator.label}</span>
                </Link>
              ))}
            </div>

            <div className="border-t border-white/5 my-1" />

            {/* Section 3: Algorithm Control Link */}
            <Link
              href="/?algo=open"
              onClick={() => setUniversalNavOpen(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-[#8083ff]/10 border border-[#8083ff]/25 hover:bg-[#8083ff]/20 transition-all text-xs font-semibold text-[#c0c1ff] hover:text-white group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#44e2cd]" />
                <span>{activeLang === 'de' ? 'KI-Vektoren tunen' : 'Tune AI Vectors'}</span>
              </div>
              <Sliders className="h-3.5 w-3.5 text-[#8083ff] group-hover:rotate-12 transition-transform" />
            </Link>

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
