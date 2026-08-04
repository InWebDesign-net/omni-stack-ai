'use client';

import React, { useState, useEffect } from 'react';
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
  Sparkle,
  Layers,
  ArrowRight,
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

export default function OmniApp() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [algoDrawerOpen, setAlgoDrawerOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('Alle');
  const [profile, setProfile] = useState<InterestProfile>(DEFAULT_PROFILE);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // User Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; email: string } | null>(null);
  const [regForm, setRegForm] = useState({ username: '', email: '', password: '', bio: '' });

  // AI Prompt / Chat Mask State
  const [chatInput, setChatInput] = useState('');
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
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

  // Handle AI Chat Mask Prompt submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setIsAiProcessing(true);
    setAiReasoning(
      lang === 'de'
        ? '🤖 Omni KI analysiert deine Anfrage & richtet den Feed neu aus...'
        : '🤖 Omni AI analyzing prompt & adjusting feed assembly...'
    );

    setTimeout(() => {
      const lower = chatInput.toLowerCase();
      const updated = { ...profile };

      if (lower.includes('pdf') || lower.includes('doku') || lower.includes('wissen') || lower.includes('astro')) {
        updated.contentTypes.pdf = 1.0;
        updated.contentTypes.video = 0.4;
        updated.interests['Wissenschaft'].score = 0.99;
        updated.interests['PostgreSQL'].score = 0.95;
        updated.activePattern = 'deep_dive';
        setAiReasoning(
          lang === 'de'
            ? '✨ KI-Fokus: "Wissenschaft & PDF Deep Dive" aktiviert. PDF-Gewichtung maximiert.'
            : '✨ AI Focus: "Science & PDF Deep Dive" activated. PDF weight maximized.'
        );
      } else if (lower.includes('kochen') || lower.includes('essen') || lower.includes('pasta') || lower.includes('rezept')) {
        updated.interests['Kochen'].score = 0.99;
        updated.contentTypes.video = 1.0;
        updated.activePattern = 'discovery';
        setAiReasoning(
          lang === 'de'
            ? '🍳 KI-Fokus: Kulinarik & Rezepte! Kochen Vektor auf 0.99 angehoben.'
            : '🍳 AI Focus: Culinary & Recipes! Cooking vector set to 0.99.'
        );
      } else if (lower.includes('cat') || lower.includes('katz') || lower.includes('humor') || lower.includes('tiere') || lower.includes('fun')) {
        updated.interests['Funny Cat Videos'].score = 0.99;
        updated.interests['Natur'].score = 0.90;
        updated.contentTypes.short = 1.0;
        updated.activePattern = 'discovery';
        setAiReasoning(
          lang === 'de'
            ? '🐱 KI-Fokus: Entertainment & Tiere! Cat Videos auf 0.99 maximiert.'
            : '🐱 AI Focus: Entertainment & Animals! Cat Videos maximized.'
        );
      } else {
        updated.interests['NextJS'].score = 0.98;
        updated.interests['Strapi'].score = 0.92;
        updated.activePattern = 'deep_dive';
        setAiReasoning(
          lang === 'de'
            ? '🚀 KI-Fokus: Web Architecture & Dev Tutorials aktiviert.'
            : '🚀 AI Focus: Web Architecture & Dev Tutorials activated.'
        );
      }

      setProfile(updated);
      fetchFeed(updated);
      setIsAiProcessing(false);
      setChatInput('');
    }, 500);
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

  const filteredFeed = feedItems.filter((item) => {
    const matchesTag =
      selectedTag === 'Alle' ||
      item.tags.includes(selectedTag) ||
      (selectedTag === 'Wissenschaft' && (item.tags.includes('Astronomie') || item.tags.includes('Wissenschaft'))) ||
      (selectedTag === 'Tech' && (item.tags.includes('PostgreSQL') || item.tags.includes('NextJS') || item.tags.includes('Strapi')));

    return matchesTag;
  });

  const categoryPills = [
    'Alle',
    'Wissenschaft',
    'Natur',
    'Kochen',
    'Tech',
    'Finanzen',
    'Funny Cat Videos',
    'Dokumentation',
  ];

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] flex flex-col font-sans selection:bg-[#8083ff] selection:text-white">
      {/* Top Header - Sticky across entire viewport */}
      <header className="sticky top-0 z-40 bg-[#0b1326]/95 backdrop-blur-xl border-b border-[#2d3449]/60 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Far-left Brand & Sidebar Toggle */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-[#171f33] rounded-xl text-[#c7c4d7] transition"
            title="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <a href="#" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#8083ff] via-[#44e2cd] to-[#ffb783] p-0.5 shadow-lg shadow-[#8083ff]/20">
              <div className="h-full w-full bg-[#0b1326] rounded-[10px] flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-[#c0c1ff] group-hover:rotate-12 transition duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-2">
                Omni
                <span className="text-[10px] bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/40 px-2 py-0.5 rounded-full font-mono font-medium">
                  KI-Network
                </span>
              </span>
            </div>
          </a>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAlgoDrawerOpen(!algoDrawerOpen)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              algoDrawerOpen
                ? 'bg-[#8083ff] border-[#8083ff] text-white shadow-lg shadow-[#8083ff]/30'
                : 'bg-[#171f33] border-[#2d3449] text-[#c0c1ff] hover:bg-[#222a3d]'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-[#44e2cd]" />
            <span className="hidden sm:inline">
              {lang === 'de' ? 'Algorithmus Steuerung' : 'Algorithm Control'}
            </span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 bg-[#131b2e] border border-[#2d3449] px-3 py-1.5 rounded-full text-xs text-[#ffb783]">
            <RotateCcw className="h-3 w-3 animate-spin-slow text-[#ffb783]" />
            <span className="font-mono text-[11px]">
              {Math.floor(resetCountdown / 60)}:{(resetCountdown % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <button
            onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
            className="p-2 hover:bg-[#171f33] rounded-full text-xs font-bold transition text-[#dae2fd]"
          >
            {lang === 'de' ? 'DE 🇩🇪' : 'EN 🇬🇧'}
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2 bg-[#171f33] border border-[#2d3449] px-3.5 py-1.5 rounded-full text-xs text-white">
              <User className="h-4 w-4 text-[#44e2cd]" />
              <span className="font-medium">{currentUser.username}</span>
              <button
                onClick={() => setCurrentUser(null)}
                className="text-[#908fa0] hover:text-red-400 ml-1"
                title="Abmelden"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1.5 bg-[#8083ff] hover:bg-[#6b6eff] text-white px-4 py-1.5 rounded-full text-xs font-semibold transition shadow-md shadow-[#8083ff]/20"
            >
              <User className="h-3.5 w-3.5" />
              <span>{lang === 'de' ? 'Anmelden' : 'Sign In'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Floating Algorithm Controls Drawer (Interest Vectors & Patterns only) */}
      {algoDrawerOpen && (
        <aside className="bg-[#171f33]/95 backdrop-blur-2xl border-b border-[#2d3449] px-6 py-5 shadow-2xl animate-slideDown z-30">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Interest Vector Matrix */}
            <div className="md:col-span-7 flex flex-col gap-2.5 bg-[#131b2e] p-4 rounded-2xl border border-[#2d3449]">
              <span className="text-xs font-bold text-gray-200 flex items-center justify-between">
                <span>{lang === 'de' ? 'Strapi User Interest Vector' : 'Strapi User Interest Vector'}</span>
                <span className="text-[10px] text-[#908fa0] font-mono">JSON Profile</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(profile.interests).map(([topic, data]) => (
                  <div key={topic} className="flex flex-col gap-0.5 text-[11px]">
                    <div className="flex justify-between text-gray-300">
                      <span>{topic}</span>
                      <span className="font-mono text-[#44e2cd] font-bold">{data.score.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={data.score}
                      onChange={(e) => updateInterestScore(topic, parseFloat(e.target.value))}
                      className="w-full h-1 bg-[#2d3449] rounded appearance-none cursor-pointer accent-[#8083ff]"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Pattern Switcher */}
            <div className="md:col-span-5 flex flex-col gap-3 bg-[#131b2e] p-4 rounded-2xl border border-[#2d3449]">
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
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                    profile.activePattern === 'discovery'
                      ? 'bg-[#8083ff] text-white shadow-md'
                      : 'bg-[#171f33] text-[#908fa0] hover:text-white'
                  }`}
                >
                  Discovery Pattern
                </button>
                <button
                  onClick={() => {
                    const u = { ...profile, activePattern: 'deep_dive' as const };
                    setProfile(u);
                    fetchFeed(u);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                    profile.activePattern === 'deep_dive'
                      ? 'bg-[#44e2cd] text-[#003731] shadow-md'
                      : 'bg-[#171f33] text-[#908fa0] hover:text-white'
                  }`}
                >
                  Deep Dive Pattern
                </button>
              </div>

              <button
                onClick={() => setAlgoDrawerOpen(false)}
                className="mt-1 text-[11px] text-[#908fa0] hover:text-white underline text-center"
              >
                {lang === 'de' ? 'Panel schließen ✕' : 'Close Panel ✕'}
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Full-Height Layout Wrapper */}
      <div className="flex flex-1 w-full min-h-[calc(100vh-57px)]">
        {/* Far-Left Sidebar (Aligned 100% to desktop window left margin) */}
        <aside
          className={`${
            sidebarOpen ? 'w-64' : 'w-16'
          } shrink-0 bg-[#0b1326] border-r border-[#2d3449]/60 p-3 flex flex-col gap-6 transition-all duration-300 hidden sm:flex sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto custom-scrollbar z-20`}
        >
          <nav className="flex flex-col gap-1 text-sm font-medium">
            {[
              { icon: Home, label: lang === 'de' ? 'Startseite' : 'Home', active: true },
              { icon: Flame, label: lang === 'de' ? 'Trending' : 'Trending' },
              { icon: Tv, label: lang === 'de' ? 'Abonnements' : 'Subscriptions' },
              { icon: BookOpen, label: lang === 'de' ? 'Bibliothek' : 'Library' },
            ].map((item, i) => (
              <button
                key={i}
                className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition ${
                  item.active
                    ? 'bg-[#171f33] text-white font-bold border border-[#2d3449]'
                    : 'text-[#c7c4d7] hover:bg-[#131b2e] hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0 text-[#8083ff]" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          <hr className="border-[#2d3449]/60" />

          {sidebarOpen && (
            <div className="flex flex-col gap-1.5 text-xs text-[#908fa0] font-semibold px-3 uppercase tracking-wider">
              <span>{lang === 'de' ? 'Themenbereiche' : 'Topics'}</span>
              <div className="mt-2 flex flex-col gap-1 text-sm font-normal text-[#dae2fd]">
                {[
                  { label: 'Wissenschaft', icon: Sparkles },
                  { label: 'Natur', icon: Compass },
                  { label: 'Kochen', icon: Coffee },
                  { label: 'Finanzen', icon: DollarSign },
                  { label: 'Tech', icon: Cpu },
                  { label: 'Entertainment', icon: Smile },
                ].map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedTag(cat.label)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#171f33] hover:text-white text-left transition"
                  >
                    <cat.icon className="h-4 w-4 text-[#44e2cd]" />
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center Content Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-8 min-w-0">
          {/* Prominent Hero AI Chat Mask (Modern ChatGPT / Conversational Input) */}
          <section className="w-full max-w-4xl mx-auto flex flex-col gap-3">
            <div className="glass-surface-glow p-5 sm:p-6 rounded-3xl border border-[#8083ff]/40 shadow-2xl relative overflow-hidden group">
              <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#8083ff]/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#c0c1ff]">
                  <Bot className="h-4 w-4 text-[#44e2cd]" />
                  <span>{lang === 'de' ? 'Omni KI-Assistent' : 'Omni AI Assistant'}</span>
                </div>
                <span className="text-[10px] bg-[#8083ff]/20 text-[#c0c1ff] border border-[#8083ff]/40 px-2 py-0.5 rounded-full font-mono">
                  Natural Language Feed Control
                </span>
              </div>

              <form onSubmit={handleChatSubmit} className="flex flex-col gap-3">
                <div className="relative flex items-center bg-[#0b1326]/90 border border-[#2d3449] focus-within:border-[#8083ff] rounded-2xl overflow-hidden shadow-inner p-1.5 transition">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      lang === 'de'
                        ? 'Worauf hast du heute Lust? (z.B. "Zeige mir Wissenschafts-PDFs", "Kochen & Pasta", "Funny Cats")...'
                        : 'What would you like to explore today? (e.g. "Show science PDFs", "Cooking & Pasta", "Funny Cats")...'
                    }
                    className="w-full bg-transparent px-4 py-3 text-sm text-[#dae2fd] placeholder-[#908fa0] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isAiProcessing}
                    className="bg-[#8083ff] hover:bg-[#6b6eff] text-white p-3 rounded-xl transition flex items-center justify-center shrink-0 shadow-lg shadow-[#8083ff]/30"
                  >
                    {isAiProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Quick Action Suggestion Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: lang === 'de' ? '📄 Wissenschafts-PDFs' : '📄 Science PDFs', prompt: 'Wissenschafts PDFs und Dokus' },
                    { label: lang === 'de' ? '🍳 Kochen & Rezepte' : '🍳 Cooking & Recipes', prompt: 'Kochen und Rezepte' },
                    { label: lang === 'de' ? '🐱 Funny Cats & Tiere' : '🐱 Funny Cats', prompt: 'Funny Cat Videos und Tiere' },
                    { label: lang === 'de' ? '💻 Tech & NextJS' : '💻 Tech & NextJS', prompt: 'NextJS Strapi Tech Tutorials' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setChatInput(item.prompt);
                      }}
                      className="text-xs bg-[#171f33] hover:bg-[#222a3d] text-[#c0c1ff] border border-[#2d3449] px-3 py-1.5 rounded-full transition"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </form>

              {aiReasoning && (
                <div className="mt-3 bg-[#0b1326]/80 p-3 rounded-xl border border-[#8083ff]/30 text-xs font-mono text-[#c0c1ff] animate-fadeIn">
                  {aiReasoning}
                </div>
              )}
            </div>
          </section>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {categoryPills.map((pill) => (
              <button
                key={pill}
                onClick={() => setSelectedTag(pill)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedTag === pill
                    ? 'bg-[#c0c1ff] text-[#1000a9] font-bold shadow-md shadow-[#8083ff]/20'
                    : 'bg-[#131b2e] text-[#dae2fd] hover:bg-[#171f33] border border-[#2d3449]/60'
                }`}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Feed Cards Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredFeed.map((item, idx) => (
              <article
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="flex flex-col gap-3 group cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#131b2e] border border-[#2d3449] group-hover:border-[#8083ff]/60 group-hover:scale-[1.02] transition duration-300 shadow-md">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b1326]/80 via-transparent to-transparent opacity-80" />

                  {/* Format Badge */}
                  <div className="absolute bottom-2.5 right-2.5 bg-[#0b1326]/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white uppercase flex items-center gap-1 border border-white/10">
                    {item.mediaType === 'video' && <Video className="h-3 w-3 text-[#ffb783]" />}
                    {item.mediaType === 'pdf' && <FileText className="h-3 w-3 text-red-400" />}
                    {item.mediaType === 'article' && <BookOpen className="h-3 w-3 text-[#44e2cd]" />}
                    {item.mediaType === 'short' && <Play className="h-3 w-3 text-[#c0c1ff]" />}
                    {item.mediaType}
                  </div>

                  {/* Bucket Slot Badge */}
                  <div className="absolute top-2.5 left-2.5 bg-[#171f33]/90 backdrop-blur-md border border-[#8083ff]/40 text-[#c0c1ff] px-2.5 py-0.5 rounded-full font-mono text-[10px]">
                    Slot #{item.slotIndex || idx + 1}: {item.bucketSource}
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex gap-3 items-start px-0.5">
                  <img
                    src={item.authorAvatar}
                    alt={item.authorName}
                    className="h-9 w-9 rounded-full object-cover border border-[#2d3449] shrink-0 mt-0.5"
                  />
                  <div className="flex flex-col gap-1 flex-1">
                    <h3 className="font-semibold text-sm text-[#dae2fd] group-hover:text-[#c0c1ff] transition line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-[#908fa0] mt-0.5">
                      <span>{item.authorName}</span>
                      {item.isSubscribedAuthor && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#44e2cd]" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#908fa0] font-mono">
                      <span>{(item.viewsCount / 1000).toFixed(1)}k Aufrufe</span>
                      <span>•</span>
                      <span className="text-[#44e2cd]">
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

      {/* User Sign In Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171f33] border border-[#2d3449] max-w-md w-full rounded-3xl p-6 relative flex flex-col gap-5 shadow-2xl">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 text-[#908fa0] hover:text-white p-1 rounded-full bg-[#131b2e]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-[#c0c1ff] font-bold text-lg">
              <User className="h-5 w-5 text-[#44e2cd]" />
              <span>{lang === 'de' ? 'Bei Omni anmelden' : 'Sign in to Omni'}</span>
            </div>
            <p className="text-xs text-[#908fa0]">
              {lang === 'de'
                ? 'Erstelle dein Profil, um deine persönliche KI-Vektor-Konfiguration zu speichern!'
                : 'Create your profile to save your personalized AI Interest Vector!'}
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
                  className="bg-[#0b1326] border border-[#2d3449] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8083ff]"
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
                  className="bg-[#0b1326] border border-[#2d3449] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8083ff]"
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
                  className="bg-[#0b1326] border border-[#2d3449] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#8083ff]"
                />
              </div>

              <button
                type="submit"
                className="mt-2 bg-[#8083ff] hover:bg-[#6b6eff] text-white font-semibold py-3 rounded-xl text-xs transition shadow-lg shadow-[#8083ff]/30"
              >
                Konto erstellen & Anmelden
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171f33] border border-[#2d3449] max-w-4xl w-full rounded-3xl p-6 relative flex flex-col gap-4 shadow-2xl">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 text-[#908fa0] hover:text-white p-1.5 rounded-full bg-[#131b2e]"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-white pr-8">{selectedMedia.title}</h2>

            <div className="flex items-center gap-3 text-xs text-[#908fa0] border-b border-[#2d3449] pb-3">
              <img
                src={selectedMedia.authorAvatar}
                alt={selectedMedia.authorName}
                className="h-7 w-7 rounded-full object-cover"
              />
              <span className="font-semibold text-gray-200">{selectedMedia.authorName}</span>
              <span>•</span>
              <span className="text-[#44e2cd] font-mono">Bucket: {selectedMedia.bucketSource}</span>
            </div>

            {selectedMedia.mediaType === 'video' || selectedMedia.mediaType === 'short' ? (
              <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                <video controls autoPlay src={selectedMedia.mediaUrl} className="w-full h-full" />
              </div>
            ) : selectedMedia.mediaType === 'pdf' ? (
              <div className="bg-[#0b1326] border border-[#2d3449] rounded-2xl p-8 text-center flex flex-col items-center gap-4">
                <FileText className="h-16 w-16 text-[#ffb783]" />
                <h3 className="font-bold text-base text-gray-200">PDF Reader Preview</h3>
                <p className="text-xs text-[#908fa0] max-w-md">{selectedMedia.summary}</p>
                <a
                  href={selectedMedia.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-[#8083ff] hover:bg-[#6b6eff] text-white px-5 py-2.5 rounded-xl text-xs font-semibold"
                >
                  PDF in neuem Tab öffnen
                </a>
              </div>
            ) : (
              <div className="bg-[#0b1326] p-6 rounded-2xl border border-[#2d3449] text-xs text-gray-300 leading-relaxed max-h-96 overflow-y-auto">
                <p className="text-sm font-semibold mb-2 text-[#c0c1ff]">{selectedMedia.summary}</p>
                <p>{selectedMedia.content}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
