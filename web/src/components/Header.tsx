'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sliders, Menu, ChevronDown, Tv, Sparkles, LogOut, User } from 'lucide-react';

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
    } else {
      router.push('/?sidebar=open');
    }
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
            title="Menu"
            aria-label="Toggle sidebar"
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
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
            algoDrawerOpen
              ? 'bg-[#8083ff] border-[#8083ff] text-white glow-primary'
              : 'bg-[#121a30] border-white/8 text-[#9ba4bf] hover:bg-[#192038] hover:text-white hover:border-white/15'
          }`}
        >
          <Sliders className={`h-3.5 w-3.5 ${algoDrawerOpen ? 'text-white' : 'text-[#44e2cd]'}`} />
          <span className="hidden sm:inline">
            {activeLang === 'de' ? 'Algo-Steuerung' : 'Algorithm'}
          </span>
        </button>

        {/* Language Toggle */}
        <button
          onClick={handleLanguageClick}
          title={activeLang === 'de' ? 'Sprache auf Englisch wechseln' : 'Switch language to German'}
          className="flex items-center gap-2 bg-[#121a30] hover:bg-[#192038] border border-white/10 hover:border-[#8083ff]/40 px-3 py-2 rounded-xl text-xs font-bold text-[#dae2fd] transition-all duration-200 shadow-sm active:scale-95 group"
        >
          <div className="group-hover:scale-110 transition-transform">
            {activeLang === 'de' ? <GermanFlag className="w-4 h-3" /> : <UKFlag className="w-4 h-3" />}
          </div>
          <span className="text-xs font-extrabold tracking-wide text-[#dae2fd]">
            {activeLang === 'de' ? 'DE' : 'EN'}
          </span>
          <span className="text-[9px] text-[#5c657d] group-hover:text-[#44e2cd] font-mono transition-colors">
            ⇄
          </span>
        </button>

        {/* Auth / User Profile Dropdown */}
        {activeUser ? (
          <div className="relative z-50">
            <button
              type="button"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 bg-[#121a30] hover:bg-[#192038] border border-white/10 hover:border-[#8083ff]/40 px-3 py-1.5 rounded-xl text-xs text-white transition-all group"
            >
              <img
                src={activeUser.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80'}
                alt={activeUser.username}
                className="h-6 w-6 rounded-full object-cover border border-white/15 shrink-0"
              />
              <div className="flex flex-col text-left hidden sm:flex">
                <span className="font-semibold text-[#dae2fd] text-[11px] leading-tight group-hover:text-white">
                  {activeUser.username}
                </span>
                <span className="text-[9px] text-[#8083ff] font-mono font-bold leading-none">
                  {getUserHandleString(activeUser)}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-[#5c657d] group-hover:text-white transition-transform" />
            </button>

            {/* Popover Menu */}
            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-[#0d1528] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn flex flex-col gap-1"
              >
                <button
                  type="button"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    if (onOpenUserProfileModal) {
                      onOpenUserProfileModal();
                    } else {
                      router.push('/');
                    }
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#dae2fd] hover:text-white hover:bg-white/5 transition-all text-left"
                >
                  <Tv className="h-4 w-4 text-[#8083ff]" />
                  <span>
                    {activeLang === 'de' ? 'Mein Kanal' : 'My Channel'} ({getUserHandleString(activeUser)})
                  </span>
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
                  <Sliders className="h-4 w-4 text-[#44e2cd]" />
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
  );
}
