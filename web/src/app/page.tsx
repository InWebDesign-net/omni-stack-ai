'use client';

import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Zap,
  RotateCcw,
  Sliders,
  Play,
  FileText,
  Video,
  Globe,
  Flame,
  UserCheck,
  Compass,
  Bot,
  RefreshCw,
  Eye,
  Heart,
  Cpu,
  Server,
  Home,
  Tv,
  BookOpen,
  Sparkles,
  User,
  LogOut,
  X,
  CheckCircle2,
  Share2,
  ThumbsUp,
  Bookmark,
  TrendingUp,
  Award,
  Film,
  Music,
  Smile,
  DollarSign,
  Coffee,
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
    'PostgreSQL': { score: 0.95, last_interacted: new Date().toISOString() },
    'Strapi': { score: 0.82, last_interacted: new Date().toISOString() },
    'NextJS': { score: 0.90, last_interacted: new Date().toISOString() },
    'Ollama': { score: 0.75, last_interacted: new Date().toISOString() },
    'Wissenschaft': { score: 0.85, last_interacted: new Date().toISOString() },
    'Natur': { score: 0.80, last_interacted: new Date().toISOString() },
    'Kochen': { score: 0.70, last_interacted: new Date().toISOString() },
    'Finanzen': { score: 0.75, last_interacted: new Date().toISOString() },
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

export default function YouTubeStyleFeed() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [algoDrawerOpen, setAlgoDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Alle');
  const [profile, setProfile] = useState<InterestProfile>(DEFAULT_PROFILE);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [currentUser, setCurrentUser] = useState<{ username: string; email: string } | null>(null);
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', bio: '' });

  // AI Prompt State
  const [promptInput, setPromptInput] = useState('');
  const [aiLog, setAiLog] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Media Player Modal
  const [selectedMedia, setSelectedMedia] = useState<FeedItem | null>(null);

  // Demo auto-reset countdown
  const [resetCountdown, setResetCountdown] = useState(300);

  useEffect(() => {
    const timer = setInterval(() => {
      setResetCountdown((prev) => (prev > 1 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Feed from Strapi API Proxy
  const fetchFeed = async (currentProfile: InterestProfile) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/strapi-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentProfile),
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
    fetchFeed(profile);
  }, []);

  const handleAiPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setIsAiProcessing(true);
    setAiLog(
      lang === 'de'
        ? '🤖 Ollama AI Agent analysiert Prompt & berechnet Vektor-Mutationen...'
        : '🤖 Ollama AI Agent analyzing prompt & computing vector mutations...'
    );

    setTimeout(() => {
      const lower = promptInput.toLowerCase();
      const updated = { ...profile };

      if (lower.includes('pdf') || lower.includes('doku') || lower.includes('wissen') || lower.includes('astro')) {
        updated.contentTypes.pdf = 1.0;
        updated.contentTypes.video = 0.4;
        updated.interests['Wissenschaft'].score = 0.99;
        updated.interests['PostgreSQL'].score = 0.95;
        updated.activePattern = 'deep_dive';
        setAiLog(
          lang === 'de'
            ? '⚡ KI-Entscheidung: "Wissenschaft & PDF Deep Dive" aktiviert. PDF Weight = 1.0.'
            : '⚡ AI Decision: "Science & PDF Deep Dive" activated. PDF Weight = 1.0.'
        );
      } else if (lower.includes('kochen') || lower.includes('essen') || lower.includes('pasta')) {
        updated.interests['Kochen'].score = 0.99;
        updated.contentTypes.video = 1.0;
        updated.activePattern = 'discovery';
        setAiLog(
          lang === 'de'
            ? '🍳 KI-Entscheidung: Culinary Focus! Kochen & Rezepte Vektor auf 0.99 angehoben.'
            : '🍳 AI Decision: Culinary Focus! Cooking & Recipes vector set to 0.99.'
        );
      } else if (lower.includes('cat') || lower.includes('katz') || lower.includes('humor') || lower.includes('tiere')) {
        updated.interests['Funny Cat Videos'].score = 0.99;
        updated.interests['Natur'].score = 0.90;
        updated.contentTypes.short = 1.0;
        updated.activePattern = 'discovery';
        setAiLog(
          lang === 'de'
            ? '🐱 KI-Entscheidung: Entertainment Mode! Cat Videos & Natur auf 0.99 maximiert.'
            : '🐱 AI Decision: Entertainment Mode! Cat Videos & Nature boosted to 0.99.'
        );
      } else {
        updated.interests['NextJS'].score = 0.98;
        updated.interests['Strapi'].score = 0.92;
        updated.activePattern = 'deep_dive';
        setAiLog(
          lang === 'de'
            ? '🚀 KI-Entscheidung: Developer & Tech Stack Pattern aktiviert.'
            : '🚀 AI Decision: Developer & Tech Stack Pattern activated.'
        );
      }

      setProfile(updated);
      fetchFeed(updated);
      setIsAiProcessing(false);
      setPromptInput('');
    }, 600);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.username || !regForm.email) return;
    setCurrentUser({ username: regForm.username, email: regForm.email });
    setAuthModalOpen(false);
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

  const updateMediaTypeWeight = (type: string, newWeight: number) => {
    const updated = {
      ...profile,
      contentTypes: {
        ...profile.contentTypes,
        [type]: newWeight,
      },
    };
    setProfile(updated);
    fetchFeed(updated);
  };

  const filteredFeed = feedItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag =
      selectedTag === 'Alle' ||
      item.tags.includes(selectedTag) ||
      (selectedTag === 'Wissenschaft' && item.tags.includes('Astronomie')) ||
      (selectedTag === 'Tech' && (item.tags.includes('PostgreSQL') || item.tags.includes('NextJS')));

    return matchesSearch && matchesTag;
  });

  const categoryPills = [
    'Alle',
    'Wissenschaft',
    'Programmierung',
    'Kochen',
    'Natur',
    'Finanzen',
    'Tech',
    'Funny Cat Videos',
    'Dokumentation',
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* YouTube Style Top Header */}
      <header className="sticky top-0 z-40 bg-[#0f0f0f]/95 backdrop-blur-md border-b border-[#272727] px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Left: Menu & Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#272727] rounded-full text-gray-300 transition"
            title="Toggle Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <a href="#" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-md shadow-red-600/30">
              <Play className="h-4 w-4 text-white fill-current ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                Omni<span className="text-red-500">Tube</span>
                <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/60 px-1.5 py-0.2 rounded font-mono">
                  KI-Feed
                </span>
              </span>
            </div>
          </a>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:flex items-center">
          <div className="flex w-full items-center bg-[#121212] border border-[#303030] focus-within:border-blue-500 rounded-full overflow-hidden shadow-inner">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'de' ? 'Suchen nach Videos, PDFs, Themen...' : 'Search videos, PDFs, topics...'}
              className="w-full bg-transparent px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
            />
            <button className="bg-[#222222] hover:bg-[#272727] px-5 py-2 text-gray-400 hover:text-white border-l border-[#303030] transition">
              <Search className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Right: AI Drawer Toggle, Reset Timer & User Profile */}
        <div className="flex items-center gap-3">
          {/* AI Drawer Toggle */}
          <button
            onClick={() => setAlgoDrawerOpen(!algoDrawerOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              algoDrawerOpen
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/30'
                : 'bg-[#212121] border-[#383838] text-purple-300 hover:bg-[#2a2a2a]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {lang === 'de' ? 'Algorithmus & KI Steuerung' : 'Algorithm & AI Control'}
            </span>
          </button>

          {/* Reset Countdown Pill */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#1f1f1f] border border-[#333333] px-2.5 py-1.5 rounded-full text-xs text-amber-300">
            <RotateCcw className="h-3 w-3 animate-spin-slow text-amber-400" />
            <span className="font-mono text-[11px]">
              {Math.floor(resetCountdown / 60)}:{(resetCountdown % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="p-2 hover:bg-[#272727] rounded-full text-gray-300 transition text-xs font-bold"
            title="Switch Language"
          >
            {lang === 'de' ? 'DE 🇩🇪' : 'EN 🇬🇧'}
          </button>

          {/* User Account / Login */}
          {currentUser ? (
            <div className="flex items-center gap-2 bg-[#222222] border border-[#333] px-3 py-1 rounded-full text-xs text-gray-200">
              <User className="h-4 w-4 text-emerald-400" />
              <span className="font-medium">{currentUser.username}</span>
              <button
                onClick={() => setCurrentUser(null)}
                className="text-gray-400 hover:text-red-400 ml-1"
                title="Abmelden"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition shadow-md shadow-red-600/30"
            >
              <User className="h-3.5 w-3.5" />
              <span>{lang === 'de' ? 'Registrieren' : 'Sign Up'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Collapsible Algorithmus Drawer (YouTube-style Floating Panel) */}
      {algoDrawerOpen && (
        <aside className="bg-[#181818] border-b border-[#2d2d2d] px-6 py-4 animate-slideDown shadow-2xl">
          <div className="max-w-[1920px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* AI Prompt Input */}
            <div className="md:col-span-5 flex flex-col gap-3 bg-[#212121] p-4 rounded-2xl border border-[#333]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Bot className="h-4 w-4 text-purple-400" />
                  {lang === 'de' ? 'Lokale Ollama KI-Steuerung (CPU Inference)' : 'Local Ollama AI Control (CPU Inference)'}
                </span>
                <span className="text-[10px] bg-purple-900/50 text-purple-200 px-2 py-0.5 rounded font-mono">
                  Strapi v5 API
                </span>
              </div>
              <form onSubmit={handleAiPromptSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder={
                    lang === 'de'
                      ? 'z.B. "Ich will jetzt nur noch Kochen & Pasta Videos sehen"...'
                      : 'e.g. "I want to see cooking & pasta videos only"...'
                  }
                  className="flex-1 bg-[#121212] border border-[#383838] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  disabled={isAiProcessing}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                >
                  {isAiProcessing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  <span>{lang === 'de' ? 'Anwenden' : 'Apply'}</span>
                </button>
              </form>

              {aiLog && (
                <p className="text-[11px] text-purple-300 font-mono bg-black/40 p-2.5 rounded-lg border border-purple-900/50">
                  {aiLog}
                </p>
              )}
            </div>

            {/* Interest Vector Sliders */}
            <div className="md:col-span-4 flex flex-col gap-2.5 bg-[#212121] p-4 rounded-2xl border border-[#333]">
              <span className="text-xs font-bold text-gray-200 flex items-center justify-between">
                <span>{lang === 'de' ? 'Strapi User Interest Vector' : 'Strapi User Interest Vector'}</span>
                <span className="text-[10px] text-gray-400 font-mono">JSON Profile</span>
              </span>
              <div className="grid grid-cols-2 gap-3 max-h-32 overflow-y-auto pr-1">
                {Object.entries(profile.interests).map(([topic, data]) => (
                  <div key={topic} className="flex flex-col gap-0.5 text-[11px]">
                    <div className="flex justify-between text-gray-300">
                      <span>{topic}</span>
                      <span className="font-mono text-purple-300 font-bold">{data.score.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={data.score}
                      onChange={(e) => updateInterestScore(topic, parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#333] rounded appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern Switcher & Weights */}
            <div className="md:col-span-3 flex flex-col gap-3 bg-[#212121] p-4 rounded-2xl border border-[#333]">
              <span className="text-xs font-bold text-gray-200">
                {lang === 'de' ? 'Slot Interleaving Pattern' : 'Slot Interleaving Pattern'}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const u = { ...profile, activePattern: 'discovery' as const };
                    setProfile(u);
                    fetchFeed(u);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${
                    profile.activePattern === 'discovery'
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                  }`}
                >
                  Discovery
                </button>
                <button
                  onClick={() => {
                    const u = { ...profile, activePattern: 'deep_dive' as const };
                    setProfile(u);
                    fetchFeed(u);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition ${
                    profile.activePattern === 'deep_dive'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#2d2d2d] text-gray-400 hover:text-white'
                  }`}
                >
                  Deep Dive
                </button>
              </div>

              <button
                onClick={() => setAlgoDrawerOpen(false)}
                className="mt-1 text-[11px] text-gray-400 hover:text-white underline text-center"
              >
                {lang === 'de' ? 'Einstellungen schließen ✕' : 'Close Panel ✕'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Full-Width Body Container */}
      <div className="flex flex-1 max-w-[1920px] w-full mx-auto">
        {/* Left YouTube Navigation Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-16'
          } shrink-0 bg-[#0f0f0f] border-r border-[#272727] p-2 flex flex-col gap-6 transition-all duration-300 hidden sm:flex`}
        >
          {/* Main Navigation Links */}
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {[
              { icon: Home, label: lang === 'de' ? 'Startseite' : 'Home', active: true },
              { icon: Flame, label: lang === 'de' ? 'Trending' : 'Trending' },
              { icon: Tv, label: lang === 'de' ? 'Abonnements' : 'Subscriptions' },
              { icon: BookOpen, label: lang === 'de' ? 'Bibliothek' : 'Library' },
            ].map((item, i) => (
              <button
                key={i}
                className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition ${
                  item.active
                    ? 'bg-[#272727] text-white font-bold'
                    : 'text-gray-300 hover:bg-[#212121] hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0 text-red-500" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <hr className="border-[#272727]" />

          {/* Topics Category Navigation */}
          {sidebarOpen && (
            <div className="flex flex-col gap-1 text-xs text-gray-400 font-semibold px-3 uppercase tracking-wider">
              <span>{lang === 'de' ? 'Entdecken' : 'Explore'}</span>
              <div className="mt-2 flex flex-col gap-1 text-sm font-normal text-gray-300 capitalize">
                {[
                  { label: 'Wissenschaft', icon: Sparkles },
                  { label: 'Programmierung', icon: Cpu },
                  { label: 'Kochen & Rezepte', icon: Coffee },
                  { label: 'Natur & Umwelt', icon: Compass },
                  { label: 'Finanzen', icon: DollarSign },
                  { label: 'Entertainment', icon: Smile },
                ].map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTag(cat.label.split(' ')[0])}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#212121] hover:text-white text-left transition"
                  >
                    <cat.icon className="h-4 w-4 text-purple-400" />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 flex flex-col gap-6 overflow-x-hidden">
          {/* Category Filter Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {categoryPills.map((pill) => (
              <button
                key={pill}
                onClick={() => setSelectedTag(pill)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedTag === pill
                    ? 'bg-white text-black font-bold shadow'
                    : 'bg-[#272727] text-gray-200 hover:bg-[#383838]'
                }`}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Feed Assembly Grid (YouTube Cards) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredFeed.map((item, idx) => (
              <article
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="flex flex-col gap-3 group cursor-pointer"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#1f1f1f] border border-[#2b2b2b] group-hover:border-red-500/50 transition duration-300">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                  {/* Media Format Badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white uppercase flex items-center gap-1 border border-white/10">
                    {item.mediaType === 'video' && <Video className="h-3 w-3 text-red-400" />}
                    {item.mediaType === 'pdf' && <FileText className="h-3 w-3 text-red-500" />}
                    {item.mediaType === 'article' && <BookOpen className="h-3 w-3 text-blue-400" />}
                    {item.mediaType === 'short' && <Play className="h-3 w-3 text-emerald-400" />}
                    {item.mediaType}
                  </div>

                  {/* Bucket Slot Badge */}
                  <div className="absolute top-2 left-2 bg-purple-950/80 backdrop-blur-md border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded font-mono text-[10px]">
                    Slot #{item.slotIndex || idx + 1}: {item.bucketSource}
                  </div>
                </div>

                {/* Info Container */}
                <div className="flex gap-3 items-start">
                  <img
                    src={item.authorAvatar}
                    alt={item.authorName}
                    className="h-9 w-9 rounded-full object-cover border border-[#333] shrink-0 mt-0.5"
                  />
                  <div className="flex flex-col gap-1 flex-1">
                    <h3 className="font-semibold text-sm text-gray-100 group-hover:text-red-400 transition line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                      <span>{item.authorName}</span>
                      {item.isSubscribedAuthor && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400/20" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                      <span>{(item.viewsCount / 1000).toFixed(1)}k Aufrufe</span>
                      <span>•</span>
                      <span className="text-purple-300">
                        Score: {(item.relevanceScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>

      {/* User Registration & Login Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1f1f1f] border border-[#333] max-w-md w-full rounded-3xl p-6 relative flex flex-col gap-5 shadow-2xl">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full bg-[#272727]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-red-500 font-bold text-lg">
              <User className="h-5 w-5" />
              <span>{lang === 'de' ? 'Benutzerkonto erstellen' : 'Create User Account'}</span>
            </div>
            <p className="text-xs text-gray-400">
              {lang === 'de'
                ? 'Registriere dich im Frontend, um deinen eigenen Interest-Vector im Strapi CMS zu verwalten!'
                : 'Sign up in the frontend to manage your personalized Interest Vector in Strapi CMS!'}
            </p>

            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-300">Benutzername</label>
                <input
                  type="text"
                  required
                  value={regForm.username}
                  onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                  placeholder="z.B. MaxMustermann"
                  className="bg-[#121212] border border-[#383838] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-300">E-Mail Adresse</label>
                <input
                  type="email"
                  required
                  value={regForm.email}
                  onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                  placeholder="max@example.com"
                  className="bg-[#121212] border border-[#383838] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-300">Passwort</label>
                <input
                  type="password"
                  required
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="bg-[#121212] border border-[#383838] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <button
                type="submit"
                className="mt-2 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl text-xs transition shadow-lg shadow-red-600/30"
              >
                Konto erstellen & Anmelden
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Media Player / Reader Preview Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#181818] border border-[#333] max-w-4xl w-full rounded-3xl p-6 relative flex flex-col gap-4 shadow-2xl">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1.5 rounded-full bg-[#272727]"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-white pr-8">{selectedMedia.title}</h2>

            <div className="flex items-center gap-3 text-xs text-gray-400 border-b border-[#2a2a2a] pb-3">
              <img
                src={selectedMedia.authorAvatar}
                alt={selectedMedia.authorName}
                className="h-7 w-7 rounded-full object-cover"
              />
              <span className="font-semibold text-gray-200">{selectedMedia.authorName}</span>
              <span>•</span>
              <span className="text-purple-400 font-mono">Bucket: {selectedMedia.bucketSource}</span>
            </div>

            {selectedMedia.mediaType === 'video' || selectedMedia.mediaType === 'short' ? (
              <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                <video controls autoPlay src={selectedMedia.mediaUrl} className="w-full h-full" />
              </div>
            ) : selectedMedia.mediaType === 'pdf' ? (
              <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl p-8 text-center flex flex-col items-center gap-4">
                <FileText className="h-16 w-16 text-red-500" />
                <h3 className="font-bold text-base text-gray-200">Interaktiver PDF Reader Simulation</h3>
                <p className="text-xs text-gray-400 max-w-md">{selectedMedia.summary}</p>
                <a
                  href={selectedMedia.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold"
                >
                  PDF in neuem Tab öffnen
                </a>
              </div>
            ) : (
              <div className="bg-[#121212] p-6 rounded-2xl border border-[#2a2a2a] text-xs text-gray-300 leading-relaxed max-h-96 overflow-y-auto">
                <p className="text-sm font-semibold mb-2">{selectedMedia.summary}</p>
                <p>{selectedMedia.content}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
