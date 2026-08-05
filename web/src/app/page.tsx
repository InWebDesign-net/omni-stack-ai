'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Users,
  PlusCircle,
} from 'lucide-react';
import Header from '@/components/Header';

interface UserProfileSession {
  id: number;
  username: string;
  email: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  subscribersCount: number;
  jwt?: string;
}

interface ChannelAuthor {
  id?: number;
  username: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
  subscribersCount?: number;
}

interface FeedItem {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  mediaType: 'video' | 'pdf' | 'article' | 'short';
  mediaUrl: string;
  thumbnailUrl: string;
  author?: ChannelAuthor;
  authorName?: string;
  authorAvatar?: string;
  isSubscribedAuthor?: boolean;
  tags: string[];
  viewsCount: number;
  likesCount: number;
  publishedAt: string;
  relevanceScore: number;
  bucketSource: string;
  slotIndex: number;
}

function getAuthorName(item: FeedItem) {
  return item.author?.username || item.authorName || 'Omni Creator';
}

function getAuthorAvatar(item: FeedItem) {
  return item.author?.avatarUrl || item.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
}

function getAuthorHandle(item: FeedItem) {
  if (item.author?.handle) {
    return item.author.handle.startsWith('@') ? item.author.handle : `@${item.author.handle}`;
  }
  const fallback = (item.authorName || item.author?.username || 'creator').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `@${fallback || 'creator'}`;
}

function getAuthorBio(item: FeedItem) {
  return item.author?.bio || 'Creator & Content Publisher im Omni Network.';
}

function getAuthorSubscribers(item: FeedItem) {
  return item.author?.subscribersCount || 12500;
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

// ─── Vector Flag Icons ────────────────────────────────────────────────────────
function GermanFlag({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg className={`${className} rounded-[2px] overflow-hidden shrink-0 shadow-sm`} viewBox="0 0 640 480" aria-hidden="true">
      <rect width="640" height="160" fill="#000000" />
      <rect y="160" width="640" height="160" fill="#DD0000" />
      <rect y="320" width="640" height="160" fill="#FFCE00" />
    </svg>
  );
}

function UKFlag({ className = "w-4 h-3" }: { className?: string }) {
  return (
    <svg className={`${className} rounded-[2px] overflow-hidden shrink-0 shadow-sm`} viewBox="0 0 60 30" aria-hidden="true">
      <clipPath id="gb-s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
      <clipPath id="gb-t"><path d="M30,15 H0 V0 z M30,15 V0 h30 z M30,15 h30 v15 z M30,15 v15 H0 z"/></clipPath>
      <g clipPath="url(#gb-s)">
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#cf142b" strokeWidth="4" clipPath="url(#gb-t)"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10"/>
      </g>
    </svg>
  );
}

function CardThumbnail({
  item,
  className = 'w-full h-full object-cover',
}: {
  item: { id?: string | number; title: string; mediaType: string; thumbnailUrl?: string };
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !item.thumbnailUrl) {
    return (
      <div className="w-full h-full bg-gradient-to-tr from-[#0d1528] via-[#161f38] to-[#251f42] flex flex-col items-center justify-center gap-2 p-3 text-center">
        <div className="h-9 w-9 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
          {item.mediaType === 'video' || item.mediaType === 'short' ? (
            <Play className="h-4 w-4 text-[#44e2cd]" />
          ) : item.mediaType === 'pdf' ? (
            <FileText className="h-4 w-4 text-red-400" />
          ) : (
            <BookOpen className="h-4 w-4 text-[#8083ff]" />
          )}
        </div>
        <span className="text-[10px] font-mono text-[#9ba4bf] line-clamp-1">{item.title}</span>
      </div>
    );
  }

  return (
    <img
      src={item.thumbnailUrl}
      alt={item.title}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}

function OmniAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [algoDrawerOpen, setAlgoDrawerOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('Alle');
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'trending' | 'subscriptions' | 'library'>('home');
  const [profile, setProfile] = useState<InterestProfile>(DEFAULT_PROFILE);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Auth & Session State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfileSession | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', bio: '' });
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });

  // User Channel Management Modals State
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ username: '', handle: '', avatarUrl: '', bio: '' });

  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);
  const [createItemForm, setCreateItemForm] = useState({
    title: '',
    summary: '',
    content: '',
    mediaType: 'video' as 'video' | 'pdf' | 'article' | 'short',
    mediaUrl: '',
    thumbnailUrl: '',
    tags: '',
  });

  // AI Prompt / Chat Mask State
  const [chatInput, setChatInput] = useState('');
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Media Player Modal
  const [selectedMedia, setSelectedMedia] = useState<FeedItem | null>(null);

  // Channel Profile Modal State
  const [selectedChannel, setSelectedChannel] = useState<{
    username: string;
    handle: string;
    avatarUrl: string;
    bio: string;
    subscribersCount: number;
  } | null>(null);

  const [subscribedChannels, setSubscribedChannels] = useState<string[]>(['@demotech', '@astro']);

  const toggleSubscribeChannel = (handle: string) => {
    setSubscribedChannels((prev) =>
      prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle]
    );
  };

  const channelScrollRef = useRef<HTMLDivElement>(null);
  const tagScrollRef = useRef<HTMLDivElement>(null);

  const [canChannelScrollLeft, setCanChannelScrollLeft] = useState(false);
  const [canChannelScrollRight, setCanChannelScrollRight] = useState(true);

  const [canTagScrollLeft, setCanTagScrollLeft] = useState(false);
  const [canTagScrollRight, setCanTagScrollRight] = useState(true);

  const updateScrollState = (
    ref: React.RefObject<HTMLDivElement | null>,
    setLeft: (val: boolean) => void,
    setRight: (val: boolean) => void
  ) => {
    if (ref.current) {
      const { scrollLeft, scrollWidth, clientWidth } = ref.current;
      setLeft(scrollLeft > 4);
      setRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  };

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const amount = direction === 'left' ? -240 : 240;
      ref.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const checkScrolls = () => {
      updateScrollState(channelScrollRef, setCanChannelScrollLeft, setCanChannelScrollRight);
      updateScrollState(tagScrollRef, setCanTagScrollLeft, setCanTagScrollRight);
    };

    checkScrolls();
    window.addEventListener('resize', checkScrolls);
    return () => window.removeEventListener('resize', checkScrolls);
  }, [feedItems]);

  const openChannelModal = (creatorOrItem: any) => {
    if (creatorOrItem.authorHandle || creatorOrItem.handle) {
      const handle = creatorOrItem.authorHandle || creatorOrItem.handle;
      const name = creatorOrItem.authorName || creatorOrItem.label || creatorOrItem.username || handle.replace('@', '');
      const avatar = creatorOrItem.authorAvatar || creatorOrItem.avatar || creatorOrItem.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
      setSelectedChannel({
        username: name,
        handle: handle.startsWith('@') ? handle : `@${handle}`,
        avatarUrl: avatar,
        bio: 'Creator & Content Publisher im Omni Network.',
        subscribersCount: 15400,
      });
      return;
    }
    setSelectedChannel({
      username: getAuthorName(creatorOrItem),
      handle: getAuthorHandle(creatorOrItem),
      avatarUrl: getAuthorAvatar(creatorOrItem),
      bio: getAuthorBio(creatorOrItem),
      subscribersCount: getAuthorSubscribers(creatorOrItem),
    });
  };

function getCurrentUserHandle(user: UserProfileSession | null): string {
  if (!user) return '@user';
  if (user.handle && user.handle.trim()) {
    return user.handle.startsWith('@') ? user.handle.trim() : `@${user.handle.trim()}`;
  }
  const fallback = user.username ? user.username.toLowerCase().replace(/[^a-z0-9]/g, '') : 'user';
  return `@${fallback || 'user'}`;
}

  // Check stored auth session & language preference on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('omni_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const userHandle = parsed.handle || `@${(parsed.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        setCurrentUser({
          id: parsed.id || 1,
          username: parsed.username || 'Demo User',
          email: parsed.email || 'user@example.com',
          handle: userHandle.startsWith('@') ? userHandle : `@${userHandle}`,
          avatarUrl: parsed.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
          bio: parsed.bio || 'Creator & Content Publisher im Omni Network.',
          subscribersCount: parsed.subscribersCount || 0,
          jwt: parsed.jwt,
        });
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

  // Synchronize html lang attribute for SEO crawlers
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

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
        if (data.feed) {
          setFeedItems(data.feed);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error('Strapi Feed fetch error:', e);
    }
    setFeedItems([]);
    setIsLoading(false);
  };

  const handleReSeedStrapi = async () => {
    setIsLoading(true);
    try {
      const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
      await fetch(`${strapiUrl}/api/feed/seed-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      await fetchFeed(profile, lang);
    } catch (e) {
      console.error('Seed error:', e);
    }
    setIsLoading(false);
  };

  // Helper to persist and sync updated profile state across sessions and database
  const updateProfileState = (newProfile: InterestProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem('omni_user_interest_profile', JSON.stringify(newProfile));
    } catch (e) {}

    if (currentUser?.jwt) {
      const docId = (currentUser as any)?.profile?.documentId || (currentUser as any)?.profile?.id;
      if (docId) {
        const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';
        fetch(`${strapiUrl}/api/user-profiles/${docId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.STRAPI_API_TOKEN || currentUser.jwt}`,
          },
          body: JSON.stringify({
            data: {
              affinityGraph: newProfile,
            },
          }),
        }).catch(() => {});
      }
    }
  };

  useEffect(() => {
    let initialProf = profile;
    try {
      const stored = localStorage.getItem('omni_user_interest_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.interests) {
          initialProf = parsed;
          setProfile(parsed);
        }
      }
    } catch (e) {}

    try {
      const savedUser = localStorage.getItem('omni_user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        if (parsedUser?.profile?.affinityGraph && parsedUser.profile.affinityGraph.interests) {
          initialProf = parsedUser.profile.affinityGraph;
          setProfile(parsedUser.profile.affinityGraph);
          try {
            localStorage.setItem('omni_user_interest_profile', JSON.stringify(parsedUser.profile.affinityGraph));
          } catch (e) {}
        }
      }
    } catch (e) {}

    fetchFeed(initialProf, lang);
  }, []);

  useEffect(() => {
    if (!searchParams) return;

    const tabParam = searchParams.get('tab');
    if (tabParam === 'trending' || tabParam === 'subscriptions' || tabParam === 'library') {
      setActiveNavTab(tabParam as any);
    } else if (tabParam === 'home' || (searchParams.has('tab') && !tabParam)) {
      setActiveNavTab('home');
    }

    const typeParam = searchParams.get('type');
    if (typeParam === 'pdf') {
      setSelectedTag('PDF Doku');
    } else if (typeParam === 'video') {
      setSelectedTag('Video Tutorial');
    } else if (typeParam === 'article') {
      setSelectedTag('Programmierung');
    } else if (typeParam === 'all') {
      setSelectedTag('Alle');
    }

    const channelParam = searchParams.get('channel');
    if (channelParam) {
      const creatorMap: Record<string, { name: string; avatar: string }> = {
        astro: { name: 'Astro-Wissen Magazin', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80' },
        demotech: { name: 'Database Guru', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80' },
        demogourmet: { name: 'Culinary Masterclass', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80' },
        greenplanet: { name: 'Green Planet Doku', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80' },
        omniarchitect: { name: 'Omni Architect', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80' },
        catmania: { name: 'Familie & Tiere', avatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&q=80' },
        finanzkompass: { name: 'FinanzKompass', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80' },
      };
      const normHandle = channelParam.replace(/^@/, '');
      const match = creatorMap[normHandle];
      if (match) {
        openChannelModal({
          authorHandle: `@${normHandle}`,
          authorName: match.name,
          authorAvatar: match.avatar,
        });
      }
    }

    if (searchParams.get('algo') === 'open') {
      setAlgoDrawerOpen(true);
    }
  }, [searchParams]);

  // Handle Google Demo Test Account Login
  const handleGoogleDemoLogin = async () => {
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'demotech@inwebdesign.net',
          password: 'DemoUser2026!',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || (lang === 'de' ? 'Google Schnell-Login fehlgeschlagen.' : 'Google Quick Login failed.'));
        setIsAuthLoading(false);
        return;
      }

      const rawHandle = data.user.handle || `@${data.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const userData: UserProfileSession = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        handle: rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`,
        avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
        bio: data.user.bio || (lang === 'de' ? 'Google Demo User · Tech & Content Explorer' : 'Google Demo User · Content Explorer'),
        subscribersCount: data.user.subscribersCount || 1280,
        jwt: data.jwt,
      };

      setCurrentUser(userData);
      localStorage.setItem('omni_user', JSON.stringify(userData));
      setAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(lang === 'de' ? 'Fehler beim Google Test-Login.' : 'Error during Google Test Login.');
    }
    setIsAuthLoading(false);
  };

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

      const rawHandle = data.user.handle || `@${data.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const userData: UserProfileSession = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        handle: rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`,
        avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        bio: data.user.bio || (regForm.bio.trim() || 'Creator & Content Publisher im Omni Network.'),
        subscribersCount: data.user.subscribersCount || 0,
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

      const rawHandle = data.user.handle || `@${data.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const userData: UserProfileSession = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        handle: rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`,
        avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        bio: data.user.bio || 'Creator & Content Publisher im Omni Network.',
        subscribersCount: data.user.subscribersCount || 12500,
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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const formattedHandle = editProfileForm.handle.trim().startsWith('@')
      ? editProfileForm.handle.trim()
      : `@${editProfileForm.handle.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const updatedUser: UserProfileSession = {
      ...currentUser,
      username: editProfileForm.username.trim() || currentUser.username,
      handle: formattedHandle || currentUser.handle,
      avatarUrl: editProfileForm.avatarUrl.trim() || currentUser.avatarUrl,
      bio: editProfileForm.bio.trim() || currentUser.bio,
    };

    setCurrentUser(updatedUser);
    localStorage.setItem('omni_user', JSON.stringify(updatedUser));
    setEditProfileModalOpen(false);
  };

  const handleCreateFeedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!createItemForm.title.trim()) return;

    const parsedTags = createItemForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const defaultTags = parsedTags.length > 0 ? parsedTags : ['Tech', 'Community'];

    const newItem: FeedItem = {
      id: Date.now(),
      title: createItemForm.title.trim(),
      slug: createItemForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      summary: createItemForm.summary.trim() || 'Neuer Inhalt im Omni Network.',
      content: createItemForm.content.trim() || createItemForm.summary.trim(),
      mediaType: createItemForm.mediaType,
      mediaUrl: createItemForm.mediaUrl.trim() || (createItemForm.mediaType === 'pdf' ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : 'https://www.w3schools.com/html/mov_bbb.mp4'),
      thumbnailUrl: createItemForm.thumbnailUrl.trim() || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
      tags: defaultTags,
      viewsCount: 1,
      likesCount: 1,
      publishedAt: new Date().toISOString(),
      relevanceScore: 0.99,
      bucketSource: 'Creator Upload',
      slotIndex: 1,
      author: {
        id: currentUser.id,
        username: currentUser.username,
        handle: currentUser.handle,
        avatarUrl: currentUser.avatarUrl,
        bio: currentUser.bio,
        subscribersCount: currentUser.subscribersCount,
      },
    };

    setFeedItems((prev) => [newItem, ...prev]);
    setCreateItemModalOpen(false);
    setCreateItemForm({
      title: '',
      summary: '',
      content: '',
      mediaType: 'video',
      mediaUrl: '',
      thumbnailUrl: '',
      tags: '',
    });
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
          updateProfileState(data.updatedProfile);
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
    updateProfileState(updated);
    fetchFeed(updated);
  };

  // Dynamically extract unique topic tags from currently loaded feed items and profile vector
  const dynamicTopics = Array.from(
    new Set([
      ...feedItems.flatMap((item) => item.tags || []),
      ...Object.keys(profile.interests),
    ])
  );

  const filteredFeed = React.useMemo(() => {
    let items = feedItems.filter((item) => {
      if (selectedTag === 'Alle' || selectedTag === 'All') return true;
      return item.tags.includes(selectedTag);
    });

    if (activeNavTab === 'trending') {
      return [...items].sort((a, b) => (b.viewsCount * (b.relevanceScore || 1)) - (a.viewsCount * (a.relevanceScore || 1)));
    }

    if (activeNavTab === 'subscriptions') {
      return items.filter((item) => {
        const handle = getAuthorHandle(item);
        return subscribedChannels.includes(handle) || item.isSubscribedAuthor;
      });
    }

    if (activeNavTab === 'library') {
      if (currentUser) {
        const userHandle = getCurrentUserHandle(currentUser);
        const myItems = items.filter((item) => getAuthorHandle(item) === userHandle);
        if (myItems.length > 0) return myItems;
      }
      return items.filter((item) => (item.relevanceScore || 0) > 0.85);
    }

    return items;
  }, [feedItems, selectedTag, activeNavTab, subscribedChannels, currentUser]);

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
    { id: 'home' as const,          icon: Home,     label: lang === 'de' ? 'Startseite' : 'Home',          active: activeNavTab === 'home' },
    { id: 'trending' as const,      icon: Flame,    label: lang === 'de' ? 'Trending' : 'Trending',         active: activeNavTab === 'trending' },
    { id: 'subscriptions' as const, icon: Tv,       label: lang === 'de' ? 'Abonnements' : 'Subscriptions', active: activeNavTab === 'subscriptions' },
    { id: 'library' as const,       icon: BookOpen, label: lang === 'de' ? 'Bibliothek' : 'Library',        active: activeNavTab === 'library' },
  ];

  const sideTopics = dynamicTopics.slice(0, 8).map((tag) => ({
    label: tag,
    icon: getTopicIcon(tag),
    tag: tag,
  }));

  return (
    <div className="min-h-screen bg-mesh text-[#dae2fd] flex flex-col font-sans">

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <Header
        showMenuButton={true}
        onToggleSidebar={() => {
          setSidebarOpen(!sidebarOpen);
          setMobileSidebarOpen(!mobileSidebarOpen);
        }}
        onToggleAlgoDrawer={() => setAlgoDrawerOpen(!algoDrawerOpen)}
        algoDrawerOpen={algoDrawerOpen}
        lang={lang}
        onToggleLanguage={toggleLanguage}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          setAuthMode('register');
          setAuthError(null);
          setAuthModalOpen(true);
        }}
        onOpenUserProfileModal={() => {
          if (currentUser) {
            openChannelModal({
              id: 0,
              title: '',
              slug: '',
              summary: '',
              content: '',
              mediaType: 'article',
              mediaUrl: '',
              thumbnailUrl: '',
              tags: [],
              viewsCount: 0,
              likesCount: 0,
              publishedAt: '',
              relevanceScore: 1,
              bucketSource: '',
              slotIndex: 0,
              author: {
                id: currentUser.id,
                username: currentUser.username,
                handle: getCurrentUserHandle(currentUser),
                avatarUrl: currentUser.avatarUrl,
                bio: currentUser.bio,
                subscribersCount: currentUser.subscribersCount,
              },
            });
          }
        }}
        onOpenSettingsModal={() => {
          if (currentUser) {
            const userHandle = getCurrentUserHandle(currentUser);
            setEditProfileForm({
              username: currentUser.username || '',
              handle: userHandle.replace(/^@/, ''),
              avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
              bio: currentUser.bio || 'Creator & Content Publisher im Omni Network.',
            });
            setEditProfileModalOpen(true);
          }
        }}
        onOpenCreateModal={() => setCreateItemModalOpen(true)}
        onLogout={handleLogout}
      />

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
                    updateProfileState(u);
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
                    updateProfileState(u);
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
        {/* ── Main Feed Content Container ────────────────────────────────────────── */}

        {/* ── Center Content ────────────────────────────────────────────────── */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 flex flex-col gap-7 min-w-0">

          <h1 className="sr-only">
            {lang === 'de'
              ? 'Omni - Hyper-Personalisiertes KI Mediennetzwerk BY INWEBDESIGN'
              : 'Omni - Hyper-Personalized AI Media Network BY INWEBDESIGN'}
          </h1>

          {/* ─ Dynamic Hero Header according to activeNavTab ────────────────────────────── */}
          {activeNavTab === 'home' && (
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

                  {/* Channel Quick Bar with static label and dynamic chevron controls */}
                  <div className="relative flex items-center w-full">
                    {/* Static Pinned Label */}
                    <span className="text-[10px] font-bold text-[#8083ff] uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1 select-none">
                      <Users className="h-3 w-3" />
                      <span>Kanäle:</span>
                    </span>

                    {/* Scroll Container with Faded Edges */}
                    <div className="relative flex-1 overflow-hidden flex items-center">
                      {/* Left Scroll Button */}
                      {canChannelScrollLeft && (
                        <button
                          type="button"
                          onClick={() => scrollContainer(channelScrollRef, 'left')}
                          className="absolute left-0 z-20 p-1.5 rounded-full bg-[#080e1e]/95 border border-white/15 text-[#9ba4bf] hover:text-white shadow-lg backdrop-blur-md transition-all active:scale-95"
                          title="Zurück scrollen"
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Scrollable Creator List */}
                      <div
                        ref={channelScrollRef}
                        onScroll={() => updateScrollState(channelScrollRef, setCanChannelScrollLeft, setCanChannelScrollRight)}
                        className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:none px-1 py-1 scroll-smooth w-full"
                      >
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
                            onClick={() =>
                              openChannelModal({
                                authorHandle: creator.handle,
                                authorName: creator.label,
                                authorAvatar: creator.avatar,
                              })
                            }
                            className="text-[10px] font-mono font-bold bg-[#8083ff]/15 hover:bg-[#8083ff]/30 text-[#c0c1ff] hover:text-white border border-[#8083ff]/30 px-3 py-1.5 rounded-xl shrink-0 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                            title={`Kanal ${creator.label} direkt öffnen`}
                          >
                            <img
                              src={creator.avatar}
                              alt={creator.label}
                              className="h-3.5 w-3.5 rounded-full object-cover border border-white/20 shrink-0"
                            />
                            <span>{creator.handle}</span>
                          </button>
                        ))}
                      </div>

                      {/* Right Scroll Button */}
                      {canChannelScrollRight && (
                        <button
                          type="button"
                          onClick={() => scrollContainer(channelScrollRef, 'right')}
                          className="absolute right-0 z-20 p-1.5 rounded-full bg-[#080e1e]/95 border border-white/15 text-[#9ba4bf] hover:text-white shadow-lg backdrop-blur-md transition-all active:scale-95"
                          title="Weiter scrollen"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
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
          )}

          {activeNavTab === 'trending' && (
            <section className="w-full max-w-4xl mx-auto animate-fadeInUp">
              <div className="glass-surface-glow p-6 sm:p-7 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#ffb783]/30 shadow-2xl">
                <div className="absolute -top-20 -right-20 w-56 h-56 bg-[#ffb783]/10 rounded-full blur-3xl pointer-events-none animate-orb-float" />
                <div className="flex items-center gap-4 relative">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#ffb783] via-[#ff6b81] to-[#8083ff] p-0.5 shadow-lg shadow-[#ffb783]/20 shrink-0">
                    <div className="h-full w-full bg-[#080e1e] rounded-[14px] flex items-center justify-center">
                      <Flame className="h-6 w-6 text-[#ffb783] animate-pulse-soft" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-extrabold text-white tracking-tight">
                        {lang === 'de' ? '🔥 Trending im Network' : '🔥 Trending in Network'}
                      </h2>
                      <span className="text-[10px] font-mono font-bold bg-[#ffb783]/20 text-[#ffb783] border border-[#ffb783]/40 px-2.5 py-0.5 rounded-full">
                        Ranked Feed
                      </span>
                    </div>
                    <p className="text-xs text-[#9ba4bf] mt-1 max-w-xl">
                      {lang === 'de'
                        ? 'Hier findest du die beliebtesten Beiträge mit den höchsten Aufrufzahlen, meisten Interaktionen & bester KI-Relevanz.'
                        : 'Here you find the most popular posts with highest views, engagement & AI relevance score.'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-[#080e1e]/80 border border-white/10 px-3 py-2 rounded-2xl shrink-0">
                  <TrendingUp className="h-4 w-4 text-[#44e2cd]" />
                  <span className="text-xs font-mono font-bold text-[#dae2fd]">
                    {filteredFeed.length} {lang === 'de' ? 'Beiträge sortiert' : 'posts ranked'}
                  </span>
                </div>
              </div>
            </section>
          )}

          {activeNavTab === 'subscriptions' && (
            <section className="w-full max-w-4xl mx-auto animate-fadeInUp">
              <div className="glass-surface-glow p-6 sm:p-7 rounded-3xl relative overflow-hidden flex flex-col gap-5 border border-[#44e2cd]/30 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#44e2cd]/30 to-[#8083ff]/20 border border-[#44e2cd]/40 flex items-center justify-center">
                      <Tv className="h-5 w-5 text-[#44e2cd]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-white tracking-tight">
                        {lang === 'de' ? '📺 Deine Abonnements' : '📺 Your Subscriptions'}
                      </h2>
                      <p className="text-xs text-[#9ba4bf] mt-0.5">
                        {lang === 'de'
                          ? 'Inhalte von allen Creator-Kanälen, denen du folgst.'
                          : 'Exclusive posts from all creator channels you follow.'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold bg-[#44e2cd]/15 text-[#44e2cd] border border-[#44e2cd]/30 px-3 py-1 rounded-full">
                    {subscribedChannels.length} {lang === 'de' ? 'Kanäle abonniert' : 'Channels Subscribed'}
                  </span>
                </div>

                {/* Subscribed Creators Strip */}
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-[#5c657d] uppercase tracking-wider shrink-0 mr-1">
                    {lang === 'de' ? 'Abonniert:' : 'Following:'}
                  </span>
                  {subscribedChannels.map((handle) => (
                    <div
                      key={handle}
                      className="flex items-center gap-2 bg-[#080e1e] border border-white/10 hover:border-[#44e2cd]/50 px-3 py-1.5 rounded-xl shrink-0 transition-all group"
                    >
                      <span className="text-xs font-mono font-bold text-[#44e2cd]">{handle}</span>
                      <button
                        type="button"
                        onClick={() => toggleSubscribeChannel(handle)}
                        className="text-[10px] text-[#5c657d] hover:text-red-400 font-bold ml-1 transition-colors"
                        title="Abonnement beenden"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeNavTab === 'library' && (
            <section className="w-full max-w-4xl mx-auto animate-fadeInUp">
              <div className="glass-surface-glow p-6 sm:p-7 rounded-3xl relative overflow-hidden flex flex-col gap-4 border border-[#8083ff]/30 shadow-2xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-[#8083ff]/30 to-[#44e2cd]/20 border border-[#8083ff]/40 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-[#c0c1ff]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-white tracking-tight">
                        {lang === 'de' ? '📚 Meine Bibliothek & eigene Beiträge' : '📚 My Library & Posts'}
                      </h2>
                      <p className="text-xs text-[#9ba4bf] mt-0.5">
                        {lang === 'de'
                          ? 'Deine erstellten Videos, Artikel und gespeicherten Inhalte.'
                          : 'Your published videos, articles and saved bookmarks.'}
                      </p>
                    </div>
                  </div>
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => setCreateItemModalOpen(true)}
                      className="bg-[#8083ff] hover:bg-[#6b6eff] active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-[#8083ff]/25 flex items-center gap-2 shrink-0 transition-all"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[#44e2cd]" />
                      <span>{lang === 'de' ? 'Neuen Beitrag erstellen' : 'Create New Post'}</span>
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ─ Category Pills with dynamic chevrons and faded edges ────────────────── */}
          <div className="relative flex items-center w-full my-1 overflow-hidden">
            {/* Left Fade & Button */}
            {canTagScrollLeft && (
              <>
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#080e1e] to-transparent z-10 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => scrollContainer(tagScrollRef, 'left')}
                  className="absolute left-0 z-20 p-1.5 rounded-full bg-[#080e1e]/95 border border-white/15 text-[#9ba4bf] hover:text-white shadow-lg backdrop-blur-md transition-all active:scale-95"
                  title="Zurück scrollen"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* Scrollable Tags List */}
            <div
              ref={tagScrollRef}
              onScroll={() => updateScrollState(tagScrollRef, setCanTagScrollLeft, setCanTagScrollRight)}
              className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:none px-1 py-1 scroll-smooth w-full"
            >
              {categoryPills.map((pill) => (
                <button
                  key={pill.label}
                  onClick={() => setSelectedTag(pill.label)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
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

            {/* Right Fade & Button */}
            {canTagScrollRight && (
              <>
                <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#080e1e] to-transparent z-10 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => scrollContainer(tagScrollRef, 'right')}
                  className="absolute right-0 z-20 p-1.5 rounded-full bg-[#080e1e]/95 border border-white/15 text-[#9ba4bf] hover:text-white shadow-lg backdrop-blur-md transition-all active:scale-95"
                  title="Weiter scrollen"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
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
                <div className="flex flex-col items-center gap-2">
                  <p className="text-base font-bold text-white">
                    {lang === 'de' ? 'Keine Beiträge im Strapi CMS vorhanden' : 'No posts found in Strapi CMS'}
                  </p>
                  <p className="text-sm text-[#5c657d] max-w-md">
                    {lang === 'de'
                      ? 'Die Datenbank in Strapi ist aktuell leer. Du kannst im Strapi Admin CMS neue Inhalte und Übersetzungen anlegen.'
                      : 'The database in Strapi is currently empty. You can create new content and translations in Strapi Admin CMS.'}
                  </p>
                </div>
              </div>
            ) : (
              filteredFeed.map((item, idx) => (
                <article
                  key={item.id}
                  onClick={() => {
                    tracker.track('click', item.tags, item.mediaType);
                    if (item.mediaType === 'short') {
                      router.push(`/shorts/${item.slug}`);
                    } else {
                      router.push(`/content/${item.slug}`);
                    }
                  }}
                  className="flex flex-col gap-3 group cursor-pointer feed-card-enter"
                >
                  {/* Thumbnail with bulletproof error handling */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0d1528] border border-white/6 group-hover:border-[#8083ff]/40 transition-all duration-300 shadow-md group-hover:shadow-xl group-hover:shadow-[#8083ff]/10 group-hover:scale-[1.015]">
                    <CardThumbnail
                      item={item}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080e1e]/75 via-transparent to-transparent" />

                    {/* Action Icon on Hover (Play for Video/Short, FileText for PDF, BookOpen for Article) */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="h-10 w-10 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg">
                        {item.mediaType === 'video' || item.mediaType === 'short' ? (
                          <Play className="h-4 w-4 text-white ml-0.5" />
                        ) : item.mediaType === 'pdf' ? (
                          <FileText className="h-4 w-4 text-red-400" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-[#44e2cd]" />
                        )}
                      </div>
                    </div>

                    {/* Media type badge */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <MediaTypeBadge type={item.mediaType} />
                    </div>

                    {/* Slot badge or Trending rank badge */}
                    {activeNavTab === 'trending' ? (
                      <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-[#ffb783] to-[#ff6b81] text-[#080e1e] font-black text-[9px] tracking-wider px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1">
                        <Flame className="h-3 w-3 fill-current" />
                        <span>HOT #{idx + 1}</span>
                      </div>
                    ) : (
                      <div className="absolute top-2.5 left-2.5 bg-[#0d1528]/85 backdrop-blur-md border border-white/8 text-[#9ba4bf] px-2 py-0.5 rounded-lg font-mono text-[9px] font-semibold tracking-wide">
                        #{item.slotIndex || idx + 1} · {item.bucketSource}
                      </div>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex gap-2.5 items-start px-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openChannelModal(item);
                      }}
                      className="shrink-0 group/author"
                      title={`Kanal ${getAuthorHandle(item)} ansehen`}
                    >
                      <img
                        src={getAuthorAvatar(item)}
                        alt={getAuthorName(item)}
                        className="h-8 w-8 rounded-full object-cover border border-white/10 group-hover/author:border-[#8083ff] group-hover/author:scale-105 transition-all shrink-0 mt-0.5"
                      />
                    </button>
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <h3 className="font-semibold text-[13px] text-[#dae2fd] group-hover:text-white transition-colors line-clamp-2 leading-snug tracking-[-0.01em]">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-[#5c657d]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openChannelModal(item);
                          }}
                          className="hover:text-[#44e2cd] transition-colors truncate font-semibold text-left flex items-center gap-1 group/handle"
                        >
                          <span>{getAuthorName(item)}</span>
                          <span className="text-[10px] text-[#8083ff] font-mono font-bold group-hover/handle:underline">
                            {getAuthorHandle(item)}
                          </span>
                        </button>
                        {subscribedChannels.includes(getAuthorHandle(item)) && (
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
                {/* Google Test-Login Button */}
                <button
                  type="button"
                  onClick={handleGoogleDemoLogin}
                  disabled={isAuthLoading}
                  className="w-full bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-800 font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-3 border border-slate-200 group disabled:opacity-60"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{lang === 'de' ? 'Mit Google anmelden (Test-Account)' : 'Sign in with Google (Test Account)'}</span>
                </button>

                <div className="relative my-0.5 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative bg-[#0d1528] px-3 text-[10px] font-bold text-[#5c657d] uppercase tracking-wider">
                    {lang === 'de' ? 'oder manuell registrieren' : 'or register manually'}
                  </span>
                </div>

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
                {/* Google Test-Login Button */}
                <button
                  type="button"
                  onClick={handleGoogleDemoLogin}
                  disabled={isAuthLoading}
                  className="w-full bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-800 font-semibold py-3 px-4 rounded-xl text-sm transition-all duration-200 shadow-md flex items-center justify-center gap-3 border border-slate-200 group disabled:opacity-60"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>{lang === 'de' ? 'Mit Google anmelden (Test-Account)' : 'Sign in with Google (Test Account)'}</span>
                </button>

                <div className="relative my-0.5 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative bg-[#0d1528] px-3 text-[10px] font-bold text-[#5c657d] uppercase tracking-wider">
                    {lang === 'de' ? 'oder mit Demo / Passwort' : 'or with demo / password'}
                  </span>
                </div>

                {/* Demo Quick-Login Presets */}
                <div className="bg-[#080e1e] border border-[#8083ff]/20 p-4 rounded-2xl flex flex-col gap-3">
                  <span className="text-[11px] font-bold text-[#c0c1ff] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#44e2cd]" />
                    Demo Schnell-Login Presets
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
                  <div className="pt-2.5 border-t border-white/8 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#9ba4bf] flex items-center gap-1">
                        🛠️ <span>Strapi CMS Admin Dashboard</span>
                      </span>
                      <a
                        href="https://omni-cms.inwebdesign.net/admin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-[#8083ff] hover:text-[#a3a5ff] flex items-center gap-1 hover:underline transition-colors"
                      >
                        <span>Strapi öffnen</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="bg-[#121a30]/80 border border-white/6 rounded-xl p-2.5 flex flex-col gap-1.5 text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[#5c657d]">E-Mail:</span>
                        <code className="text-[#c0c1ff] bg-black/40 px-1.5 py-0.5 rounded font-mono">demo-editor1@inwebdesign.net</code>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#5c657d]">Passwort:</span>
                        <code className="text-[#44e2cd] bg-black/40 px-1.5 py-0.5 rounded font-mono">DemoEditor2026!</code>
                      </div>
                    </div>
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

      {/* ── Channel Profile Modal ─────────────────────────────────────────────── */}
      {selectedChannel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0d1528] border border-white/10 max-w-4xl w-full rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col animate-fadeInUp">
            {/* Banner & Header */}
            <div className="relative h-44 bg-gradient-to-r from-[#121a30] via-[#1a2544] to-[#080e1e] p-6 flex items-end justify-between border-b border-white/8">
              <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
              <button
                onClick={() => setSelectedChannel(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white/70 hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Creator Identity */}
              <div className="relative flex items-end gap-4 z-10 translate-y-6">
                <img
                  src={selectedChannel.avatarUrl}
                  alt={selectedChannel.username}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-[#080e1e] shadow-xl"
                />
                <div className="mb-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">{selectedChannel.username}</h2>
                    <CheckCircle2 className="h-4 w-4 text-[#44e2cd]" />
                  </div>
                  <p className="text-xs font-mono text-[#8083ff] font-bold">{selectedChannel.handle}</p>
                </div>
              </div>

              {/* Subscribe Action or Edit/Create if Own Channel */}
              <div className="relative z-10">
                {currentUser && getCurrentUserHandle(currentUser) === selectedChannel.handle ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedChannel(null);
                        const userHandle = getCurrentUserHandle(currentUser);
                        setEditProfileForm({
                          username: currentUser.username || '',
                          handle: userHandle.replace(/^@/, ''),
                          avatarUrl: currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
                          bio: currentUser.bio || 'Creator & Content Publisher im Omni Network.',
                        });
                        setEditProfileModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-[#121a30] hover:bg-[#192038] border border-white/10 hover:border-[#8083ff]/40 rounded-xl text-xs font-semibold text-white transition-all flex items-center gap-1.5"
                    >
                      <Sliders className="h-3.5 w-3.5 text-[#44e2cd]" />
                      <span>{lang === 'de' ? 'Einstellungen' : 'Settings'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedChannel(null);
                        setCreateItemModalOpen(true);
                      }}
                      className="px-3.5 py-2 bg-[#8083ff] hover:bg-[#6b6eff] text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-[#8083ff]/25 flex items-center gap-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{lang === 'de' ? 'Beitrag erstellen' : 'Create Post'}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => toggleSubscribeChannel(selectedChannel.handle)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 ${
                      subscribedChannels.includes(selectedChannel.handle)
                        ? 'bg-white/10 text-white border border-white/15 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30'
                        : 'bg-[#8083ff] hover:bg-[#6b6eff] text-white shadow-[#8083ff]/30'
                    }`}
                  >
                    {subscribedChannels.includes(selectedChannel.handle) ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-[#44e2cd]" />
                        <span>Abonniert</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        <span>Kanal abonnieren</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Bio & Stats bar */}
            <div className="pt-8 px-6 pb-4 bg-[#080e1e] border-b border-white/5 flex flex-col gap-3">
              <p className="text-xs text-[#dae2fd]/90 leading-relaxed max-w-2xl">{selectedChannel.bio}</p>
              <div className="flex items-center gap-4 text-xs font-mono text-[#5c657d]">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <Users className="h-3.5 w-3.5 text-[#44e2cd]" />
                  <span>{(selectedChannel.subscribersCount / 1000).toFixed(1)}k Abonnenten</span>
                </div>
                <span>·</span>
                <span>
                  {
                    feedItems.filter((i) => getAuthorHandle(i) === selectedChannel.handle).length
                  }{' '}
                  Beiträge im Feed
                </span>
              </div>
            </div>

            {/* Published Feed items Grid */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#0d1528]">
              <h3 className="text-xs font-bold text-[#8083ff] uppercase tracking-wider mb-4 flex items-center gap-2">
                <Tv className="h-3.5 w-3.5" />
                <span>Kanal-Inhalte von {selectedChannel.username}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedItems
                  .filter((item) => getAuthorHandle(item) === selectedChannel.handle)
                  .map((item) => (
                    <article
                      key={item.id}
                      onClick={() => {
                        setSelectedChannel(null);
                        setSelectedMedia(item);
                      }}
                      className="bg-[#121a30] hover:bg-[#192038] border border-white/8 hover:border-[#8083ff]/40 p-3 rounded-2xl cursor-pointer transition-all flex flex-col gap-2 group"
                    >
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#080e1e]">
                        <CardThumbnail
                          item={item}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute bottom-2 right-2">
                          <MediaTypeBadge type={item.mediaType} />
                        </div>
                      </div>
                      <h4 className="text-xs font-bold text-[#dae2fd] group-hover:text-white line-clamp-2">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-[#5c657d] line-clamp-1">{item.summary}</p>
                    </article>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Profile Modal ────────────────────────────────────────────────── */}
      {editProfileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0d1528] border border-white/10 max-w-lg w-full rounded-3xl p-7 relative flex flex-col gap-5 shadow-2xl animate-fadeInUp">
            <button
              onClick={() => setEditProfileModalOpen(false)}
              className="absolute top-5 right-5 text-[#5c657d] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#44e2cd]/10 border border-[#44e2cd]/20 flex items-center justify-center">
                <Sliders className="h-5 w-5 text-[#44e2cd]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  {lang === 'de' ? 'Einstellungen' : 'Settings'}
                </h2>
                <p className="text-xs text-[#5c657d]">
                  {lang === 'de'
                    ? 'Verwalte deinen Benutzernamen, Kanal-Slug (@handle), Beschreibung (Bio) & Profilbild.'
                    : 'Manage your username, channel slug (@handle), description (bio) & avatar.'}
                </p>
              </div>
            </div>

            <form noValidate onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">
                  {lang === 'de' ? 'Benutzername / Anzeigename' : 'Username / Display Name'}
                </label>
                <input
                  type="text"
                  value={editProfileForm.username}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, username: e.target.value })}
                  placeholder="z.B. Max Mustermann"
                  className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">
                  {lang === 'de' ? 'Kanal-Handle / Slug (@-Kürzel für Chat)' : 'Channel Handle / Slug (@-mention)'}
                </label>
                <div className="flex items-center bg-[#080e1e] border border-white/8 focus-within:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white">
                  <span className="text-[#8083ff] font-mono font-bold mr-1">@</span>
                  <input
                    type="text"
                    value={editProfileForm.handle}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, handle: e.target.value })}
                    placeholder="maxtech"
                    className="bg-transparent w-full focus:outline-none text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">
                  {lang === 'de' ? 'Profilbild (Avatar URL)' : 'Avatar Image URL'}
                </label>
                <input
                  type="text"
                  value={editProfileForm.avatarUrl}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, avatarUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">
                  {lang === 'de' ? 'Kanal-Beschreibung (Description / Bio)' : 'Channel Description (Bio)'}
                </label>
                <textarea
                  rows={3}
                  value={editProfileForm.bio}
                  onChange={(e) => setEditProfileForm({ ...editProfileForm, bio: e.target.value })}
                  placeholder={lang === 'de' ? 'Beschreibe deinen Kanal und deine Inhalte...' : 'Describe your channel and content...'}
                  className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 bg-[#44e2cd] hover:bg-[#34c4b2] text-[#080e1e] font-extrabold py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#44e2cd]/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{lang === 'de' ? 'Einstellungen speichern' : 'Save Settings'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Create New Feed Item Modal ───────────────────────────────────────── */}
      {createItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0d1528] border border-white/10 max-w-xl w-full rounded-3xl p-7 relative flex flex-col gap-5 shadow-2xl animate-fadeInUp">
            <button
              onClick={() => setCreateItemModalOpen(false)}
              className="absolute top-5 right-5 text-[#5c657d] hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#ffb783]/10 border border-[#ffb783]/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[#ffb783]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Neuen Beitrag veröffentlichen</h2>
                <p className="text-xs text-[#5c657d]">Erstelle neuen Content für deinen Kanal ({currentUser?.handle})</p>
              </div>
            </div>

            <form noValidate onSubmit={handleCreateFeedItem} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">Titel des Beitrags</label>
                <input
                  type="text"
                  required
                  value={createItemForm.title}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, title: e.target.value })}
                  placeholder="z.B. PostgreSQL Vektor-Suche in Next.js 15"
                  className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">Medienform</label>
                  <select
                    value={createItemForm.mediaType}
                    onChange={(e) => setCreateItemForm({ ...createItemForm, mediaType: e.target.value as any })}
                    className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="video">📹 Video</option>
                    <option value="pdf">📄 PDF Dokument</option>
                    <option value="article">✍️ Artikel</option>
                    <option value="short">⚡ Short</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">Themen / Tags</label>
                  <input
                    type="text"
                    value={createItemForm.tags}
                    onChange={(e) => setCreateItemForm({ ...createItemForm, tags: e.target.value })}
                    placeholder="PostgreSQL, Tech, NextJS"
                    className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">Kurzzusammenfassung (Summary)</label>
                <input
                  type="text"
                  value={createItemForm.summary}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, summary: e.target.value })}
                  placeholder="Kompakter Überblick über das Thema..."
                  className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-[#9ba4bf] uppercase tracking-wider">Vorschaubild (Thumbnail URL)</label>
                <input
                  type="text"
                  value={createItemForm.thumbnailUrl}
                  onChange={(e) => setCreateItemForm({ ...createItemForm, thumbnailUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="bg-[#080e1e] border border-white/8 focus:border-[#8083ff]/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-2 bg-[#8083ff] hover:bg-[#6b6eff] text-white font-extrabold py-3.5 rounded-xl text-sm transition-all duration-200 shadow-lg shadow-[#8083ff]/30 flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Beitrag auf Kanal veröffentlichen</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OmniApp() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080e1e]" />}>
      <OmniAppContent />
    </Suspense>
  );
}
