'use client';

import React, { useState, useEffect } from 'react';
import { tracker } from '../lib/tracking';
import {
  Menu,
  Zap,
  RotateCcw,
  Sliders,
  Play,
  FileText,
  Video,
  Flame,
  UserCheck,
  Compass,
  Bot,
  RefreshCw,
  Eye,
  Heart,
  Cpu,
  Home,
  Tv,
  BookOpen,
  Sparkles,
  User,
  LogOut,
  X,
  CheckCircle2,
  DollarSign,
  Coffee,
  Smile,
  Send,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  TrendingUp,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface FeedItem {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  mediaType: 'video' | 'pdf' | 'article' | 'short';
  mediaUrl: string;
  thumbnailUrl: string;
  authorName: string;
  authorAvatar: string;
  isSubscribedAuthor: boolean;
  tags: string[];
  viewsCount: number;
  likesCount: number;
  publishedAt: string;
  relevanceScore: number;
  bucketSource: string;
  slotIndex: number;
}

interface InterestProfile {
  interests: Record<string, { score: number; last_interacted: string }>;
  contentTypes: Record<string, number>;
  activePattern: 'discovery' | 'deep_dive';
}

const DEFAULT_PROFILE: InterestProfile = {
  interests: {
    'Wissenschaft': { score: 0.95, last_interacted: new Date().toISOString() },
    'Natur': { score: 0.88, last_interacted: new Date().toISOString() },
    'Kochen': { score: 0.75, last_interacted: new Date().toISOString() },
    'Finanzen': { score: 0.80, last_interacted: new Date().toISOString() },
    'PostgreSQL': { score: 0.90, last_interacted: new Date().toISOString() },
    'Strapi': { score: 0.82, last_interacted: new Date().toISOString() },
    'NextJS': { score: 0.85, last_interacted: new Date().toISOString() },
    'Ollama': { score: 0.78, last_interacted: new Date().toISOString() },
    'Funny Cat Videos': { score: 0.20, last_interacted: '2025-12-10T08:00:00Z' },
  },
  contentTypes: {
    pdf: 0.8,
    video: 0.9,
    article: 0.7,
    short: 0.5,
  },
  activePattern: 'discovery',
};

// ─── OmniLogo SVG Component ───────────────────────────────────────────────────
function OmniLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-outer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8083ff" />
          <stop offset="50%" stopColor="#44e2cd" />
          <stop offset="100%" stopColor="#ffb783" />
        </linearGradient>
        <linearGradient id="logo-inner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c0c1ff" />
          <stop offset="100%" stopColor="#44e2cd" />
        </linearGradient>
        <filter id="logo-glow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      {/* Outer ring */}
      <circle cx="20" cy="20" r="18" stroke="url(#logo-outer)" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Middle ring */}
      <circle cx="20" cy="20" r="13" stroke="url(#logo-inner)" strokeWidth="1" fill="none" opacity="0.4" strokeDasharray="2 3" />
      {/* Core shape – O with inner spark */}
      <circle cx="20" cy="20" r="8" fill="url(#logo-outer)" opacity="0.15" />
      <circle cx="20" cy="20" r="5.5" fill="url(#logo-outer)" opacity="0.25" />
      {/* Central dot */}
      <circle cx="20" cy="20" r="2.5" fill="url(#logo-inner)" filter="url(#logo-glow)" />
      {/* Spark lines */}
      <line x1="20" y1="4" x2="20" y2="8" stroke="url(#logo-outer)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="20" y1="32" x2="20" y2="36" stroke="url(#logo-outer)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="20" x2="8" y2="20" stroke="url(#logo-outer)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="32" y1="20" x2="36" y2="20" stroke="url(#logo-outer)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Diagonal sparks */}
      <line x1="8.4" y1="8.4" x2="11.0" y2="11.0" stroke="url(#logo-inner)" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      <line x1="29.0" y1="29.0" x2="31.6" y2="31.6" stroke="url(#logo-inner)" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      <line x1="31.6" y1="8.4" x2="29.0" y2="11.0" stroke="url(#logo-inner)" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
      <line x1="11.0" y1="29.0" x2="8.4" y2="31.6" stroke="url(#logo-inner)" strokeWidth="1" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-video rounded-2xl skeleton" />
      <div className="flex gap-3 px-0.5">
        <div className="h-9 w-9 rounded-full skeleton shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-3 rounded-full skeleton w-full" />
          <div className="h-3 rounded-full skeleton w-3/4" />
          <div className="h-2.5 rounded-full skeleton w-1/2" />
        </div>
      </div>
    </div>
  );
}

// ─── MediaTypeBadge ───────────────────────────────────────────────────────────
function MediaTypeBadge({ type }: { type: FeedItem['mediaType'] }) {
  const map = {
    video:   { icon: Video,    label: 'Video',   color: 'text-[#ffb783]', bg: 'bg-[#ffb783]/15 border-[#ffb783]/25' },
    pdf:     { icon: FileText, label: 'PDF',     color: 'text-red-400',   bg: 'bg-red-400/15 border-red-400/25' },
    article: { icon: BookOpen, label: 'Artikel', color: 'text-[#44e2cd]', bg: 'bg-[#44e2cd]/15 border-[#44e2cd]/25' },
    short:   { icon: Play,     label: 'Short',   color: 'text-[#c0c1ff]', bg: 'bg-[#c0c1ff]/15 border-[#c0c1ff]/25' },
  } as const;
  const m = map[type];
  const Icon = m.icon;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border backdrop-blur-md ${m.bg}`}>
      <Icon className={`h-3 w-3 ${m.color}`} />
      <span className={m.color}>{m.label}</span>
    </div>
  );
}

export default function OmniApp() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [algoDrawerOpen, setAlgoDrawerOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('Alle');
  const [profile, setProfile] = useState<InterestProfile>(DEFAULT_PROFILE);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Auth & Session State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; email: string; jwt?: string } | null>(null);
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', bio: '' });
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });

  // AI Prompt / Chat Mask State
  const [chatInput, setChatInput] = useState('');
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Media Player Modal
  const [selectedMedia, setSelectedMedia] = useState<FeedItem | null>(null);

  // Check stored auth session & language preference on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('omni_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
      }

      const savedLang = localStorage.getItem('omni_lang') as 'de' | 'en' | null;
      if (savedLang && (savedLang === 'de' || savedLang === 'en')) {
        setLang(savedLang);
      } else if (typeof navigator !== 'undefined' && navigator.language) {
        if (navigator.language.toLowerCase().startsWith('en')) {
          setLang('en');
        }
      }
    } catch (e) {
      // localStorage fallback
    }
  }, []);

  const toggleLanguage = () => {
    const nextLang = lang === 'de' ? 'en' : 'de';
    setLang(nextLang);
    try {
      localStorage.setItem('omni_lang', nextLang);
    } catch (e) {
      // localStorage fallback
    }
    fetchFeed(profile, nextLang);
  };

  // Fetch Feed from Strapi API Proxy with target locale
  const fetchFeed = async (currentProfile: InterestProfile, currentLang = lang) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/strapi-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...currentProfile, locale: currentLang }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.feed && data.feed.length > 0) {
          setFeedItems(data.feed);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Strapi Feed fetch error:', e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFeed(profile, lang);
  }, [lang]);

  // Handle Real Registration with Strapi API
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Custom Frontend Validation
    const username = regForm.username.trim();
    const email = regForm.email.trim();
    const password = regForm.password;

    if (!username) {
      setAuthError(lang === 'de' ? 'Bitte gib einen Benutzernamen ein.' : 'Please enter a username.');
      return;
    }
    if (username.length < 3) {
      setAuthError(lang === 'de' ? 'Der Benutzername muss mindestens 3 Zeichen lang sein.' : 'Username must be at least 3 characters.');
      return;
    }
    if (!email) {
      setAuthError(lang === 'de' ? 'Bitte gib eine E-Mail-Adresse ein.' : 'Please enter an email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError(lang === 'de' ? 'Bitte gib eine gültige E-Mail-Adresse ein (z.B. max@example.com).' : 'Please enter a valid email address.');
      return;
    }
    if (!password) {
      setAuthError(lang === 'de' ? 'Bitte gib ein Passwort ein.' : 'Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setAuthError(lang === 'de' ? 'Das Passwort muss mindestens 6 Zeichen lang sein.' : 'Password must be at least 6 characters.');
      return;
    }

    setIsAuthLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Registrierung fehlgeschlagen.');
        setIsAuthLoading(false);
        return;
      }

      const userData = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        jwt: data.jwt,
      };

      setCurrentUser(userData);
      localStorage.setItem('omni_user', JSON.stringify(userData));
      setAuthModalOpen(false);
      setRegForm({ username: '', email: '', password: '', bio: '' });
    } catch (err: any) {
      setAuthError(err.message || 'Verbindungsfehler bei Registrierung.');
    }
    setIsAuthLoading(false);
  };

  // Handle Real Login with Strapi API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Custom Frontend Validation
    const identifier = loginForm.identifier.trim();
    const password = loginForm.password;

    if (!identifier) {
      setAuthError(lang === 'de' ? 'Bitte gib deinen Benutzernamen oder deine E-Mail-Adresse ein.' : 'Please enter your username or email.');
      return;
    }
    if (!password) {
      setAuthError(lang === 'de' ? 'Bitte gib dein Passwort ein.' : 'Please enter your password.');
      return;
    }

    setIsAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Anmeldung fehlgeschlagen.');
        setIsAuthLoading(false);
        return;
      }

      const userData = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        jwt: data.jwt,
      };

      setCurrentUser(userData);
      localStorage.setItem('omni_user', JSON.stringify(userData));
      setAuthModalOpen(false);
      setLoginForm({ identifier: '', password: '' });
    } catch (err: any) {
      setAuthError(err.message || 'Verbindungsfehler bei Anmeldung.');
    }
    setIsAuthLoading(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('omni_user');
  };

  // Handle Real AI Chat Prompt submission via Strapi & Ollama
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptText = chatInput.trim();
    if (!promptText) return;

    setIsAiProcessing(true);
    setAiReasoning(
      lang === 'de'
        ? '🤖 Ollama LLM analysiert Intent & berechnet Vektoren...'
        : '🤖 Ollama LLM analyzing intent & computing vectors...'
    );

    try {
      const res = await fetch('/api/ai-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          currentProfile: profile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.updatedProfile) {
          setProfile(data.updatedProfile);
          fetchFeed(data.updatedProfile);
        }
        if (data.aiExplanation) {
          setAiReasoning(data.aiExplanation);
        }
      } else {
        setAiReasoning(lang === 'de' ? '⚠️ KI-Verbindungsfehler.' : '⚠️ AI connection error.');
      }
    } catch (err: any) {
      console.error('AI Intent submit error:', err);
      setAiReasoning(lang === 'de' ? '⚠️ Fehler bei KI-Verarbeitung.' : '⚠️ Error in AI processing.');
    } finally {
      setIsAiProcessing(false);
      setChatInput('');
    }
  };

  const updateInterestScore = (topic: string, newScore: number) => {
    const updated = {
      ...profile,
      interests: {
        ...profile.interests,
        [topic]: {
          score: newScore,
          last_interacted: new Date().toISOString(),
        },
      },
    };
    setProfile(updated);
    fetchFeed(updated);
  };

  // Dynamically extract unique topic tags from currently loaded feed items and profile vector
  const dynamicTopics = Array.from(
    new Set([
      ...feedItems.flatMap((item) => item.tags || []),
      ...Object.keys(profile.interests),
    ])
  );

  const filteredFeed = feedItems.filter((item) => {
    if (selectedTag === 'Alle' || selectedTag === 'All') return true;
    return item.tags.includes(selectedTag);
  });

  const getTopicEmoji = (tag: string) => {
    const l = tag.toLowerCase();
    if (l.includes('wissen') || l.includes('scien') || l.includes('astro')) return '🔬';
    if (l.includes('natur') || l.includes('nature') || l.includes('umwelt')) return '🌿';
    if (l.includes('koch') || l.includes('cook') || l.includes('rezept') || l.includes('culinar')) return '🍳';
    if (l.includes('tech') || l.includes('postgre') || l.includes('next') || l.includes('strapi') || l.includes('program')) return '💻';
    if (l.includes('finan') || l.includes('wirtsch') || l.includes('econ')) return '📈';
    if (l.includes('cat') || l.includes('katz') || l.includes('humor') || l.includes('tier') || l.includes('anim')) return '🐱';
    if (l.includes('doku') || l.includes('pdf')) return '📄';
    return '💡';
  };

  const getTopicIcon = (tag: string) => {
    const l = tag.toLowerCase();
    if (l.includes('wissen') || l.includes('scien') || l.includes('astro')) return Sparkles;
    if (l.includes('natur') || l.includes('nature') || l.includes('umwelt')) return Compass;
    if (l.includes('koch') || l.includes('cook') || l.includes('rezept') || l.includes('culinar')) return Coffee;
    if (l.includes('tech') || l.includes('postgre') || l.includes('next') || l.includes('strapi') || l.includes('program')) return Cpu;
    if (l.includes('finan') || l.includes('wirtsch') || l.includes('econ')) return DollarSign;
    if (l.includes('cat') || l.includes('katz') || l.includes('humor') || l.includes('tier') || l.includes('anim')) return Smile;
    if (l.includes('doku') || l.includes('pdf')) return FileText;
    return Sparkles;
  };

  const categoryPills = [
    { label: lang === 'de' ? 'Alle' : 'All', emoji: '✦' },
    ...dynamicTopics.map((tag) => ({
      label: tag,
      emoji: getTopicEmoji(tag),
    })),
  ];

  const sideNavItems = [
    { icon: Home,     label: lang === 'de' ? 'Startseite' : 'Home',          active: true },
    { icon: Flame,    label: lang === 'de' ? 'Trending' : 'Trending',         active: false },
    { icon: Tv,       label: lang === 'de' ? 'Abonnements' : 'Subscriptions', active: false },
    { icon: BookOpen, label: lang === 'de' ? 'Bibliothek' : 'Library',        active: false },
  ];

  const sideTopics = dynamicTopics.slice(0, 8).map((tag) => ({
    label: tag,
    icon: getTopicIcon(tag),
    tag: tag,
  }));

  return (
    <div className="min-h-screen bg-mesh text-[#dae2fd] flex flex-col font-sans">

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#080e1e]/90 backdrop-blur-2xl border-b border-white/5 px-3 sm:px-4 h-14 flex items-center justify-between gap-4"
        style={{ boxShadow: '0 1px 0 rgba(128,131,255,0.10), 0 4px 16px -4px rgba(8,14,30,0.80)' }}>

        {/* Brand & Menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-[#9ba4bf] hover:text-white transition-all duration-200"
            title="Menu"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <a href="#" className="flex items-center gap-3 group select-none">
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
          </a>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">

          {/* Algorithm Control */}
          <button
            onClick={() => setAlgoDrawerOpen(!algoDrawerOpen)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
              algoDrawerOpen
                ? 'bg-[#8083ff] border-[#8083ff] text-white glow-primary'
                : 'bg-[#121a30] border-white/8 text-[#9ba4bf] hover:bg-[#192038] hover:text-white hover:border-white/15'
            }`}
          >
            <Sliders className={`h-3.5 w-3.5 ${algoDrawerOpen ? 'text-white' : 'text-[#44e2cd]'}`} />
            <span className="hidden sm:inline">
              {lang === 'de' ? 'Algo-Steuerung' : 'Algorithm'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-2 hover:bg-white/5 rounded-xl text-xs font-bold transition-all text-[#9ba4bf] hover:text-white border border-transparent hover:border-white/8"
          >
            {lang === 'de' ? '🇩🇪 DE' : '🇬🇧 EN'}
          </button>

          {/* Auth */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 bg-[#121a30] border border-white/10 px-3.5 py-2 rounded-xl text-xs text-white">
              <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-[#8083ff] to-[#44e2cd] flex items-center justify-center text-[10px] font-bold text-white">
                {currentUser.username[0]?.toUpperCase()}
              </div>
              <span className="font-semibold">{currentUser.username}</span>
              <button
                onClick={handleLogout}
                className="text-[#5c657d] hover:text-red-400 ml-0.5 transition-colors"
                title="Abmelden"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('register');
                setAuthError(null);
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#8083ff] hover:bg-[#6b6eff] active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-lg shadow-[#8083ff]/25"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{lang === 'de' ? 'Anmelden' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Algorithm Drawer ─────────────────────────────────────────────────── */}
      {algoDrawerOpen && (
        <aside className="glass-surface border-b border-white/6 px-6 py-5 shadow-2xl animate-slideDown z-30"
          style={{ boxShadow: '0 8px 32px -8px rgba(8,14,30,0.90), 0 1px 0 rgba(128,131,255,0.12)' }}>
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

            {/* Interest Sliders */}
            <div className="md:col-span-7 flex flex-col gap-3 bg-[#0d1528] p-5 rounded-2xl border border-white/6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[#8083ff]" />
                  {lang === 'de' ? 'Interesse-Vektoren' : 'Interest Vectors'}
                </span>
                <span className="text-[10px] text-[#5c657d] font-mono bg-[#192038] px-2 py-0.5 rounded-full">JSON Profile</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(profile.interests).map(([topic, data]) => (
                  <div key={topic} className="flex flex-col gap-1.5 text-[11px]">
                    <div className="flex justify-between text-[#9ba4bf]">
                      <span className="font-medium truncate mr-1">{topic}</span>
                      <span className="font-mono text-[#44e2cd] font-bold shrink-0">{data.score.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={data.score}
                      onChange={(e) => updateInterestScore(topic, parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern Selector */}
            <div className="md:col-span-5 flex flex-col gap-4 bg-[#0d1528] p-5 rounded-2xl border border-white/6">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-[#44e2cd]" />
                {lang === 'de' ? 'Slot Interleaving' : 'Slot Interleaving'}
              </span>
              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    const u = { ...profile, activePattern: 'discovery' as const };
                    setProfile(u);
                    fetchFeed(u);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    profile.activePattern === 'discovery'
                      ? 'bg-[#8083ff] text-white shadow-lg shadow-[#8083ff]/30'
                      : 'bg-[#192038] text-[#9ba4bf] hover:text-white hover:bg-[#1e2740]'
                  }`}
                >
                  🔍 Discovery
                </button>
                <button
                  onClick={() => {
                    const u = { ...profile, activePattern: 'deep_dive' as const };
                    setProfile(u);
                    fetchFeed(u);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    profile.activePattern === 'deep_dive'
                      ? 'bg-[#44e2cd] text-[#003731] shadow-lg shadow-[#44e2cd]/25'
                      : 'bg-[#192038] text-[#9ba4bf] hover:text-white hover:bg-[#1e2740]'
                  }`}
                >
                  🎯 Deep Dive
                </button>
              </div>
              <button
                onClick={() => setAlgoDrawerOpen(false)}
                className="text-[11px] text-[#5c657d] hover:text-[#9ba4bf] transition-colors text-center py-1"
              >
                {lang === 'de' ? '✕ Panel schließen' : '✕ Close Panel'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ── Main Layout ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 w-full min-h-[calc(100vh-56px)]">

        {/* ── Left Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className={`${
            sidebarOpen ? 'w-60' : 'w-16'
          } shrink-0 bg-[#080e1e] border-r border-white/5 flex flex-col gap-1 transition-all duration-300 hidden sm:flex sticky top-14 h-[calc(100vh-56px)] overflow-y-auto custom-scrollbar z-20 pt-3 pb-4`}
        >
          {/* Navigation */}
          <nav className="flex flex-col gap-1 px-2">
            {sideNavItems.map((item, i) => (
              <button
                key={i}
                title={!sidebarOpen ? item.label : undefined}
                className={`flex items-center transition-all duration-200 text-sm rounded-xl ${
                  sidebarOpen
                    ? 'gap-3 px-3.5 py-2.5 w-full text-left'
                    : 'w-10 h-10 justify-center mx-auto'
                } ${
                  item.active
                    ? 'nav-item-active font-semibold'
                    : 'text-[#5c657d] hover:bg-white/4 hover:text-[#9ba4bf]'
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 shrink-0 nav-icon ${item.active ? 'text-[#8083ff]' : 'text-current'}`} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="mx-3 my-2 border-t border-white/5" />

          {/* Topics */}
          {sidebarOpen ? (
            <div className="flex flex-col gap-1 px-2">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5c657d] mb-1">
                {lang === 'de' ? 'Themen' : 'Topics'}
              </p>
              {sideTopics.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTag(cat.tag)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-sm text-left ${
                    selectedTag === cat.tag
                      ? 'text-white bg-white/6 border border-white/8 font-semibold'
                      : 'text-[#5c657d] hover:bg-white/4 hover:text-[#9ba4bf]'
                  }`}
                >
                  <cat.icon className={`h-4 w-4 shrink-0 ${selectedTag === cat.tag ? 'text-[#44e2cd]' : 'text-[#5c657d]'}`} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1 px-2">
              {sideTopics.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTag(cat.tag)}
                  title={cat.label}
                  className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all duration-200 ${
                    selectedTag === cat.tag ? 'bg-white/6 text-[#44e2cd]' : 'text-[#5c657d] hover:bg-white/4 hover:text-[#9ba4bf]'
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}

          {/* Sidebar Footer */}
          <div className="mt-auto px-2 pt-2 border-t border-white/5 flex flex-col gap-1 text-[11px]">
            {sidebarOpen ? (
              <div className="bg-[#0d1528] border border-white/6 p-3 rounded-2xl flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#5c657d] uppercase tracking-wider font-semibold">Managed AI Stack</span>
                </div>
                <a
                  href="https://inwebdesign.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group/link flex items-center justify-between text-[#8083ff] hover:text-[#c0c1ff] font-semibold transition-colors mt-0.5"
                >
                  <span>InWebDesign.net</span>
                  <ExternalLink className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                </a>
              </div>
            ) : (
              <a
                href="https://inwebdesign.net"
                target="_blank"
                rel="noopener noreferrer"
                title="InWebDesign.net"
                className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-[#8083ff] hover:bg-white/5 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        </aside>

        {/* ── Center Content ────────────────────────────────────────────────── */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 flex flex-col gap-7 min-w-0">

          {/* ─ AI Chat Hero ──────────────────────────────────────────────── */}
          <section className="w-full max-w-3xl mx-auto animate-fadeInUp">
            <div className="glass-surface-glow p-6 sm:p-7 rounded-3xl relative overflow-hidden group animate-border-glow">
              {/* Background orbs */}
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-[#8083ff]/10 rounded-full blur-3xl pointer-events-none animate-orb-float" />
              <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-[#44e2cd]/08 rounded-full blur-3xl pointer-events-none" />

              {/* Header row */}
              <div className="relative flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#8083ff]/20 to-[#44e2cd]/10 border border-[#8083ff]/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-[#44e2cd]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">
                      {lang === 'de' ? 'Omni KI-Assistent' : 'Omni AI Assistant'}
                    </p>
                    <p className="text-[10px] text-[#5c657d] leading-tight">Powered by InWebDesign</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-[#8083ff]/12 border border-[#8083ff]/25 text-[#c0c1ff] px-2.5 py-1 rounded-full">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#44e2cd] animate-pulse-soft" />
                  <span className="text-[10px] font-semibold font-mono">Natural Language Control</span>
                </div>
              </div>

              {/* Form */}
              <form noValidate onSubmit={handleChatSubmit} className="relative flex flex-col gap-3.5">
                <div className="relative flex items-center bg-[#080e1e]/80 border border-white/8 focus-within:border-[#8083ff]/60 focus-within:shadow-[0_0_0_3px_rgba(128,131,255,0.10)] rounded-2xl overflow-hidden transition-all duration-200">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      lang === 'de'
                        ? 'Worauf hast du heute Lust? z.B. "Wissenschafts-PDFs", "Kochen & Pasta"...'
                        : 'What would you like to explore? e.g. "Science PDFs", "Cooking & Pasta"...'
                    }
                    className="w-full bg-transparent px-5 py-4 text-sm text-[#dae2fd] placeholder-[#5c657d] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isAiProcessing}
                    className="m-1.5 bg-[#8083ff] hover:bg-[#6b6eff] active:scale-95 disabled:opacity-50 text-white p-3 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 shadow-lg shadow-[#8083ff]/30"
                  >
                    {isAiProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Quick prompts */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: lang === 'de' ? '📄 Wissenschafts-PDFs' : '📄 Science PDFs', prompt: 'Wissenschafts PDFs und Dokus' },
                    { label: lang === 'de' ? '🍳 Kochen & Rezepte' : '🍳 Cooking & Recipes', prompt: 'Kochen und Rezepte' },
                    { label: lang === 'de' ? '🐱 Funny Cats' : '🐱 Funny Cats', prompt: 'Funny Cat Videos und Tiere' },
                    { label: lang === 'de' ? '💻 Tech & NextJS' : '💻 Tech & NextJS', prompt: 'NextJS Strapi Tech Tutorials' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setChatInput(item.prompt)}
                      className="text-[11px] bg-[#121a30] hover:bg-[#192038] text-[#9ba4bf] hover:text-white border border-white/6 hover:border-white/15 px-3.5 py-1.5 rounded-full transition-all duration-200"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </form>

              {/* AI Reasoning Output */}
              {aiReasoning && (
                <div className="relative mt-4 bg-[#080e1e]/70 border border-[#8083ff]/20 p-4 rounded-2xl animate-fadeIn">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#8083ff] animate-pulse-soft" />
                    <span className="text-[10px] font-bold text-[#8083ff] uppercase tracking-wider">KI-Ausgabe</span>
                  </div>
                  <p className="text-xs font-mono text-[#c0c1ff] leading-relaxed">{aiReasoning}</p>
                </div>
              )}
            </div>
          </section>

          {/* ─ Category Pills ────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar -mx-1 px-1">
            {categoryPills.map((pill) => (
              <button
                key={pill.label}
                onClick={() => setSelectedTag(pill.label)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                  selectedTag === pill.label
                    ? 'bg-[#8083ff] text-white shadow-lg shadow-[#8083ff]/25'
                    : 'bg-[#0d1528] text-[#9ba4bf] hover:bg-[#192038] hover:text-white border border-white/6 hover:border-white/15'
                }`}
              >
                <span className="text-[11px]">{pill.emoji}</span>
                <span>{pill.label}</span>
              </button>
            ))}
          </div>

          {/* ─ Feed Grid ─────────────────────────────────────────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            ) : filteredFeed.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center gap-4 py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-[#0d1528] border border-white/6 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-[#5c657d]" />
                </div>
                <div>
                  <p className="text-base font-bold text-white mb-1">
                    {lang === 'de' ? 'Keine Inhalte gefunden' : 'No content found'}
                  </p>
                  <p className="text-sm text-[#5c657d]">
                    {lang === 'de' ? 'Passe dein Interessenprofil an.' : 'Adjust your interest profile.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredFeed.map((item, idx) => (
                <article
                  key={item.id}
                  onClick={() => {
                    tracker.track('click', item.tags, item.mediaType);
                    setSelectedMedia(item);
                  }}
                  className="flex flex-col gap-3 group cursor-pointer feed-card-enter"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0d1528] border border-white/6 group-hover:border-[#8083ff]/40 transition-all duration-300 shadow-md group-hover:shadow-xl group-hover:shadow-[#8083ff]/10 group-hover:scale-[1.015]">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080e1e]/75 via-transparent to-transparent" />

                    {/* Play button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center">
                        <Play className="h-4 w-4 text-white ml-0.5" />
                      </div>
                    </div>

                    {/* Media type badge */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <MediaTypeBadge type={item.mediaType} />
                    </div>

                    {/* Slot badge */}
                    <div className="absolute top-2.5 left-2.5 bg-[#0d1528]/85 backdrop-blur-md border border-white/8 text-[#9ba4bf] px-2 py-0.5 rounded-lg font-mono text-[9px] font-semibold tracking-wide">
                      #{item.slotIndex || idx + 1} · {item.bucketSource}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="flex gap-2.5 items-start px-0.5">
                    <img
                      src={item.authorAvatar}
                      alt={item.authorName}
                      className="h-8 w-8 rounded-full object-cover border border-white/10 shrink-0 mt-0.5"
                    />
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <h3 className="font-semibold text-[13px] text-[#dae2fd] group-hover:text-white transition-colors line-clamp-2 leading-snug tracking-[-0.01em]">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-[#5c657d]">
                        <span className="truncate">{item.authorName}</span>
                        {item.isSubscribedAuthor && (
                          <CheckCircle2 className="h-3 w-3 text-[#44e2cd] shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#5c657d] font-mono">
                        <span>{(item.viewsCount / 1000).toFixed(1)}k</span>
                        <span className="text-white/15">·</span>
                        <span className="text-[#44e2cd] font-semibold">{(item.relevanceScore * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>
        </main>
      </div>

      {/* ── Auth Modal ───────────────────────────────────────────────────────── */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="bg-[#0d1528] border border-white/10 max-w-md w-full rounded-3xl p-7 relative flex flex-col gap-6 shadow-2xl animate-fadeInUp"
            style={{ boxShadow: '0 24px 80px -12px rgba(8,14,30,0.90), 0 0 0 1px rgba(255,255,255,0.05) inset' }}
          >
            {/* Close button */}
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-5 right-5 text-[#5c657d] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Logo + Title */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#8083ff]/30 to-[#44e2cd]/15 blur-lg" />
                <div className="relative rounded-2xl bg-[#080e1e] border border-white/10 p-3">
                  <OmniLogo size={32} />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-extrabold text-white tracking-tight">
                  {authMode === 'register'
                    ? (lang === 'de' ? 'Konto erstellen' : 'Create Account')
                    : (lang === 'de' ? 'Willkommen zurück' : 'Welcome Back')}
                </h2>
                <p className="text-xs text-[#5c657d] mt-0.5">Omni by InWebDesign</p>
              </div>
            </div>

            {/* Auth Mode Tabs */}
            <div className="flex items-center gap-1.5 bg-[#080e1e] p-1 rounded-2xl border border-white/6">
              {(['register', 'login'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setAuthMode(mode); setAuthError(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                    authMode === mode
                      ? 'bg-[#8083ff] text-white shadow-lg shadow-[#8083ff]/25'
                      : 'text-[#5c657d] hover:text-[#9ba4bf]'
                  }`}
                >
                  {mode === 'register' ? <UserPlus className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                  <span>{mode === 'register' ? 'Registrieren' : 'Anmelden'}</span>
                </button>
              ))}
            </div>

            {/* Error */}
            {authError && (
              <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">⚠</span>
                {authError}
              </div>
            )}

            {/* Register Form */}
            {authMode === 'register' ? (
              <form noValidate onSubmit={handleRegister} className="flex flex-col gap-4">
                {[
                  { key: 'username', label: 'Benutzername', type: 'text', placeholder: 'z.B. MaxMustermann', icon: User },
                  { key: 'email', label: 'E-Mail', type: 'email', placeholder: 'max@example.com', icon: Mail },
                  { key: 'password', label: 'Passwort', type: 'password', placeholder: '••••••••', icon: Lock },
                ].map(({ key, label, type, placeholder, icon: Icon }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">{label}</label>
                    <div className="flex items-center bg-[#080e1e] border border-white/8 focus-within:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm transition-all">
                      <Icon className="h-4 w-4 text-[#5c657d] mr-3 shrink-0" />
                      <input
                        type={type}
                        value={(regForm as any)[key]}
                        onChange={(e) => setRegForm({ ...regForm, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full bg-transparent text-white focus:outline-none placeholder-[#5c657d] text-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="mt-1 bg-[#8083ff] hover:bg-[#6b6eff] active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#8083ff]/30 flex items-center justify-center gap-2"
                >
                  {isAuthLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  <span>Konto in Strapi erstellen</span>
                </button>
              </form>
            ) : (
              /* Login Form */
              <form noValidate onSubmit={handleLogin} className="flex flex-col gap-4">
                {/* Demo Quick-Login Presets */}
                <div className="bg-[#080e1e] border border-[#8083ff]/20 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-[11px] font-bold text-[#c0c1ff] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#44e2cd]" />
                    Demo Schnell-Login
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {[
                      { label: '👨‍💻 DemoTechUser', sub: 'Tech & Science Fokus', creds: { identifier: 'demotech@inwebdesign.net', password: 'DemoUser2026!' } },
                      { label: '🍳 DemoGourmetUser', sub: 'Kochen & Natur Fokus', creds: { identifier: 'demogourmet@inwebdesign.net', password: 'DemoUser2026!' } },
                    ].map((preset, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setLoginForm(preset.creds)}
                        className="bg-[#121a30] hover:bg-[#192038] border border-white/6 hover:border-[#8083ff]/30 text-left px-3 py-2.5 rounded-xl text-xs transition-all flex justify-between items-center group"
                      >
                        <div>
                          <p className="font-semibold text-[#dae2fd]">{preset.label}</p>
                          <p className="text-[#5c657d] text-[10px]">{preset.sub}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-[#5c657d] group-hover:text-[#44e2cd] transition-colors" />
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-white/5 text-[10px] text-[#5c657d]">
                    💡 <strong className="text-[#9ba4bf]">Strapi Editor:</strong>{' '}
                    <code className="text-[#c0c1ff] bg-[#121a30] px-1 py-0.5 rounded">demo-editor1@inwebdesign.net</code>
                  </div>
                </div>

                {[
                  { key: 'identifier', label: 'E-Mail oder Benutzername', type: 'text', placeholder: 'max@example.com', icon: User },
                  { key: 'password', label: 'Passwort', type: 'password', placeholder: '••••••••', icon: Lock },
                ].map(({ key, label, type, placeholder, icon: Icon }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">{label}</label>
                    <div className="flex items-center bg-[#080e1e] border border-white/8 focus-within:border-[#8083ff]/50 rounded-xl px-4 py-3 transition-all">
                      <Icon className="h-4 w-4 text-[#5c657d] mr-3 shrink-0" />
                      <input
                        type={type}
                        value={(loginForm as any)[key]}
                        onChange={(e) => setLoginForm({ ...loginForm, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full bg-transparent text-white focus:outline-none placeholder-[#5c657d] text-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="mt-1 bg-[#8083ff] hover:bg-[#6b6eff] active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#8083ff]/30 flex items-center justify-center gap-2"
                >
                  {isAuthLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  <span>Bei Strapi anmelden</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Media Modal ──────────────────────────────────────────────────────── */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div
            className="bg-[#0d1528] border border-white/10 max-w-4xl w-full rounded-3xl p-7 relative flex flex-col gap-5 shadow-2xl animate-fadeInUp"
            style={{ boxShadow: '0 32px 80px -12px rgba(8,14,30,0.95)' }}
          >
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-5 right-5 text-[#5c657d] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div>
              <h2 className="text-xl font-extrabold text-white pr-10 tracking-tight leading-snug">
                {selectedMedia.title}
              </h2>
              <div className="flex items-center gap-3 text-xs text-[#5c657d] mt-3">
                <img
                  src={selectedMedia.authorAvatar}
                  alt={selectedMedia.authorName}
                  className="h-7 w-7 rounded-full object-cover border border-white/10"
                />
                <span className="font-semibold text-[#9ba4bf]">{selectedMedia.authorName}</span>
                <span className="text-white/15">·</span>
                <span className="text-[#44e2cd] font-mono font-semibold">{selectedMedia.bucketSource}</span>
                <div className="ml-auto">
                  <MediaTypeBadge type={selectedMedia.mediaType} />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-5">
              {selectedMedia.mediaType === 'video' || selectedMedia.mediaType === 'short' ? (
                <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/8">
                  <video controls autoPlay src={selectedMedia.mediaUrl} className="w-full h-full" />
                </div>
              ) : selectedMedia.mediaType === 'pdf' ? (
                <div className="bg-[#080e1e] border border-white/6 rounded-2xl p-10 flex flex-col items-center gap-5 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-[#ffb783]/10 border border-[#ffb783]/20 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-[#ffb783]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white mb-2">PDF Dokument</h3>
                    <p className="text-sm text-[#5c657d] max-w-md leading-relaxed">{selectedMedia.summary}</p>
                  </div>
                  <a
                    href={selectedMedia.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-[#8083ff] hover:bg-[#6b6eff] text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#8083ff]/25 flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    PDF öffnen
                  </a>
                </div>
              ) : (
                <div className="bg-[#080e1e] p-6 rounded-2xl border border-white/6 max-h-96 overflow-y-auto custom-scrollbar">
                  <p className="text-sm font-semibold mb-3 text-[#c0c1ff]">{selectedMedia.summary}</p>
                  <p className="text-sm text-[#9ba4bf] leading-relaxed">{selectedMedia.content}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
