'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  RotateCcw,
  Sliders,
  Play,
  FileText,
  Video,
  Globe,
  Flame,
  UserCheck,
  Compass,
  Zap,
  Bot,
  RefreshCw,
  Eye,
  Heart,
  CheckCircle2,
  Cpu,
  Database,
  Server,
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
    'PostgreSQL': { score: 0.95, last_interacted: new Date().toISOString() },
    'Strapi': { score: 0.82, last_interacted: new Date().toISOString() },
    'NextJS': { score: 0.90, last_interacted: new Date().toISOString() },
    'Ollama': { score: 0.75, last_interacted: new Date().toISOString() },
    'Funny Cat Videos': { score: 0.15, last_interacted: '2025-12-10T08:00:00Z' },
  },
  contentTypes: {
    pdf: 0.8,
    video: 0.6,
    article: 0.7,
    short: 0.4,
  },
  activePattern: 'discovery',
};

const SAMPLE_ITEMS: FeedItem[] = [
  {
    id: 1,
    title: 'High-Performance PostgreSQL Indexing for Hyper-Personalized Feeds',
    slug: 'postgres-indexing',
    summary: 'Deep dive into B-Tree, GIN, and JSONB indexing in PostgreSQL 15 for sub-millisecond interest vector retrieval.',
    content: 'PostgreSQL provides JSONB queries with GIN indexes that enable instant score calculation...',
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
    authorName: 'Database Guru',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
    isSubscribedAuthor: true,
    tags: ['PostgreSQL', 'Database', 'Performance'],
    viewsCount: 14200,
    likesCount: 1890,
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    relevanceScore: 0.92,
    bucketSource: 'HighIntent',
    slotIndex: 1,
  },
  {
    id: 2,
    title: 'Building Hyper-Personalized Feed Assemblies with Strapi v5 & Turborepo',
    slug: 'strapi-feed-assembly',
    summary: 'Learn how to construct custom controllers and slot interleaving patterns in Strapi to beat standard SQL relation bottlenecks.',
    content: 'Standard relational queries break at scale. Bucket-based assembly decouples feed generation...',
    mediaType: 'article',
    mediaUrl: '',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    authorName: 'Omni Architect',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    isSubscribedAuthor: true,
    tags: ['Strapi', 'NextJS', 'Monorepo'],
    viewsCount: 9800,
    likesCount: 1240,
    publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    relevanceScore: 0.85,
    bucketSource: 'Network',
    slotIndex: 2,
  },
  {
    id: 3,
    title: 'NextJS 15 Server Actions & Real-Time Slot Pattern Interleaving',
    slug: 'nextjs-server-actions',
    summary: 'Video walkthrough demonstrating dynamic feed mutation when an Ollama agent shifts user intent profile in real time.',
    content: 'Watch how Next.js App Router seamlessly re-renders slot interleaving patterns...',
    mediaType: 'video',
    mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    authorName: 'Frontend Specialist',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80',
    isSubscribedAuthor: false,
    tags: ['NextJS', 'React', 'Frontend'],
    viewsCount: 24500,
    likesCount: 3890,
    publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    relevanceScore: 0.78,
    bucketSource: 'HighIntent',
    slotIndex: 3,
  },
  {
    id: 4,
    title: 'Ollama CPU Inference: Running Llama 3 & DeepSeek Locally on LXC',
    slug: 'ollama-cpu-inference',
    summary: 'Step-by-step guide to running local LLM intent classification on CPU without expensive GPU clusters.',
    content: 'Ollama allows running small quantized models directly on server CPUs...',
    mediaType: 'pdf',
    mediaUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    authorName: 'AI Systems Lab',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80',
    isSubscribedAuthor: true,
    tags: ['Ollama', 'AI', 'LXC'],
    viewsCount: 31200,
    likesCount: 4500,
    publishedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    relevanceScore: 0.65,
    bucketSource: 'Exploration',
    slotIndex: 4,
  },
  {
    id: 5,
    title: 'Cutest Cats Compilation 2026: Epic Fails & Purrfect Moments',
    slug: 'cat-compilation',
    summary: 'A fun wildcard video for exploration testing in the algorithm slot matrix.',
    content: 'Hilarious compilation of kittens doing backflips...',
    mediaType: 'short',
    mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80',
    authorName: 'Cat Mania',
    authorAvatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=150&q=80',
    isSubscribedAuthor: false,
    tags: ['Funny Cat Videos', 'Humor'],
    viewsCount: 154000,
    likesCount: 23000,
    publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    relevanceScore: 0.95,
    bucketSource: 'Trending',
    slotIndex: 5,
  },
];

export default function HomePage() {
  const [lang, setLang] = useState<'de' | 'en'>('de');
  const [profile, setProfile] = useState<InterestProfile>(DEFAULT_PROFILE);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(SAMPLE_ITEMS);
  const [promptInput, setPromptInput] = useState('');
  const [aiLog, setAiLog] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(300); // 5 minute demo auto-reset
  const [activeTab, setActiveTab] = useState<'all' | 'pdf' | 'video' | 'article'>('all');
  const [selectedMedia, setSelectedMedia] = useState<FeedItem | null>(null);

  // Auto Reset Timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setResetCountdown((prev) => (prev > 1 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch or Compute assembled feed
  const fetchAssembledFeed = async (currentProfile: InterestProfile) => {
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
          return;
        }
      }
    } catch (e) {
      // Local fallback calculation
    }

    // Local Interleaving calculation fallback
    const scored = SAMPLE_ITEMS.map((item) => {
      let topicScore = 0.2;
      item.tags.forEach((tag) => {
        if (currentProfile.interests[tag]) {
          topicScore = Math.max(topicScore, currentProfile.interests[tag].score);
        }
      });
      const mediaWeight = currentProfile.contentTypes[item.mediaType] ?? 0.5;
      return {
        ...item,
        relevanceScore: parseFloat((topicScore * mediaWeight).toFixed(2)),
      };
    });

    if (currentProfile.activePattern === 'deep_dive') {
      scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else {
      scored.sort((a, b) => (a.id % 2 === 0 ? -1 : 1));
    }
    setFeedItems(scored);
  };

  const handleAiPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setIsAiProcessing(true);
    setAiLog(lang === 'de' ? 'Ollama Agent analysiert Intent Vector auf CPU...' : 'Ollama Agent analyzing intent vector on CPU...');

    setTimeout(async () => {
      const lower = promptInput.toLowerCase();
      const updated = { ...profile };

      if (lower.includes('pdf') || lower.includes('doku') || lower.includes('tech')) {
        updated.contentTypes.pdf = 1.0;
        updated.contentTypes.video = 0.2;
        updated.interests['PostgreSQL'].score = 0.99;
        updated.interests['Ollama'].score = 0.95;
        updated.activePattern = 'deep_dive';
        setAiLog(
          lang === 'de'
            ? '⚡ KI-Entscheidung: Tech-PDF Deep Dive aktiviert! PDF Weight = 1.0, PostgreSQL & Ollama fokussiert.'
            : '⚡ AI Decision: Tech-PDF Deep Dive activated! PDF Weight = 1.0, PostgreSQL & Ollama focused.'
        );
      } else if (lower.includes('cat') || lower.includes('katz') || lower.includes('fun') || lower.includes('humor')) {
        updated.interests['Funny Cat Videos'].score = 0.99;
        updated.contentTypes.short = 1.0;
        updated.activePattern = 'discovery';
        setAiLog(
          lang === 'de'
            ? '🐱 KI-Entscheidung: Entertainment Mode! Funny Cat Videos Score von 0.15 auf 0.99 maximiert.'
            : '🐱 AI Decision: Entertainment Mode! Funny Cat Videos score boosted from 0.15 to 0.99.'
        );
      } else {
        updated.interests['NextJS'].score = 0.98;
        updated.interests['Strapi'].score = 0.92;
        updated.activePattern = 'deep_dive';
        setAiLog(
          lang === 'de'
            ? '🚀 KI-Entscheidung: Fullstack Web Development Pattern aktiviert.'
            : '🚀 AI Decision: Fullstack Web Development pattern activated.'
        );
      }

      setProfile(updated);
      await fetchAssembledFeed(updated);
      setIsAiProcessing(false);
      setPromptInput('');
    }, 800);
  };

  const handleResetDemo = () => {
    setProfile(DEFAULT_PROFILE);
    fetchAssembledFeed(DEFAULT_PROFILE);
    setAiLog(
      lang === 'de'
        ? '🔄 Demo-Daten & Vektoren auf Werkszustand zurückgesetzt.'
        : '🔄 Demo data & vectors reset to factory state.'
    );
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
    fetchAssembledFeed(updated);
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
    fetchAssembledFeed(updated);
  };

  const filteredFeed = feedItems.filter(
    (item) => activeTab === 'all' || item.mediaType === activeTab
  );

  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-100 flex flex-col font-sans">
      {/* Top Banner & Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-gray-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 via-blue-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
                OmniStack <span className="gradient-text">AI</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                  v1.0 Monorepo
                </span>
              </h1>
              <p className="text-xs text-gray-400">
                {lang === 'de'
                  ? 'Hyper-Personalized Feed Assembly • Strapi + Next.js + Ollama AI'
                  : 'Hyper-Personalized Feed Assembly • Strapi + Next.js + Ollama AI'}
              </p>
            </div>
          </div>

          {/* Status Badges & Demo Timer */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-gray-900/80 border border-gray-800 px-3 py-1.5 rounded-lg text-gray-300">
              <Server className="h-3.5 w-3.5 text-emerald-400" />
              <span>Strapi PM2: <strong className="text-emerald-400">Online :1337</strong></span>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-900/80 border border-gray-800 px-3 py-1.5 rounded-lg text-gray-300">
              <Cpu className="h-3.5 w-3.5 text-purple-400" />
              <span>Ollama AI: <strong className="text-purple-400">CPU Ready</strong></span>
            </div>

            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-amber-300">
              <RotateCcw className="h-3.5 w-3.5 animate-spin-slow" />
              <span>
                {lang === 'de' ? 'Auto-Reset:' : 'Auto Reset:'}{' '}
                <strong className="font-mono text-amber-200">
                  {Math.floor(resetCountdown / 60)}:{(resetCountdown % 60).toString().padStart(2, '0')}
                </strong>
              </span>
              <button
                onClick={handleResetDemo}
                title="Reset Now"
                className="ml-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold transition"
              >
                {lang === 'de' ? 'Jetzt Reset' : 'Reset Now'}
              </button>
            </div>

            {/* Language Switcher */}
            <button
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg font-medium transition"
            >
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              <span>{lang === 'de' ? 'DE 🇩🇪' : 'EN 🇬🇧'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left Column: Feed Assembly (YouTube / Social Feed) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {/* Feed Filter & Header */}
          <div className="glass-panel p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-gray-800">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-400" />
                {lang === 'de' ? 'Hyper-Personalized Feed' : 'Hyper-Personalized Feed'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'de'
                  ? `Aktuelles Interleaving Pattern: `
                  : `Active Interleaving Pattern: `}
                <span className="text-purple-300 font-semibold uppercase tracking-wider ml-1 bg-purple-500/20 px-2 py-0.5 rounded text-[11px]">
                  {profile.activePattern}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-1 bg-gray-900/90 p-1 rounded-xl border border-gray-800 text-xs">
              {(['all', 'pdf', 'video', 'article'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition font-medium ${
                    activeTab === tab
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  {tab === 'pdf' ? '📄 PDF' : tab === 'video' ? '🎬 Video' : tab === 'article' ? '📰 Article' : '✨ All'}
                </button>
              ))}
            </div>
          </div>

          {/* Feed Cards */}
          <div className="flex flex-col gap-5">
            {filteredFeed.map((item, idx) => (
              <article
                key={item.id}
                className="glass-panel hover:glass-panel-glow transition-all duration-300 rounded-2xl p-5 border border-gray-800/90 group flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Bucket Ribbon */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-purple-900/60 border border-purple-500/40 text-purple-300 flex items-center justify-center font-mono font-bold text-[11px]">
                      #{item.slotIndex || idx + 1}
                    </span>
                    <span className="bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 border border-gray-700">
                      {item.bucketSource === 'HighIntent' && <Zap className="h-3 w-3 text-amber-400" />}
                      {item.bucketSource === 'Network' && <UserCheck className="h-3 w-3 text-blue-400" />}
                      {item.bucketSource === 'Exploration' && <Compass className="h-3 w-3 text-emerald-400" />}
                      {item.bucketSource === 'Trending' && <Flame className="h-3 w-3 text-red-400" />}
                      Bucket: <strong>{item.bucketSource}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="bg-purple-500/10 border border-purple-500/30 text-purple-300 px-2.5 py-1 rounded-md text-[11px] font-mono">
                      Relevance Score: <strong>{(item.relevanceScore * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                </div>

                {/* Card Content & Thumbnail */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                  <div className="sm:col-span-5 relative aspect-video rounded-xl overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-purple-500/40 transition">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
                    
                    {/* Media Type Badge */}
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase text-white flex items-center gap-1 border border-white/10">
                      {item.mediaType === 'video' && <Video className="h-3 w-3 text-red-400" />}
                      {item.mediaType === 'pdf' && <FileText className="h-3 w-3 text-red-500" />}
                      {item.mediaType === 'article' && <Layers className="h-3 w-3 text-blue-400" />}
                      {item.mediaType === 'short' && <Play className="h-3 w-3 text-emerald-400" />}
                      {item.mediaType}
                    </div>

                    <button
                      onClick={() => setSelectedMedia(item)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300"
                    >
                      <span className="h-10 w-10 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </span>
                    </button>
                  </div>

                  <div className="sm:col-span-7 flex flex-col justify-between h-full gap-2">
                    <div>
                      <h3 className="font-bold text-base text-gray-100 group-hover:text-purple-300 transition line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>

                    {/* Author & Tags */}
                    <div className="flex flex-col gap-2.5 mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                          <img
                            src={item.authorAvatar}
                            alt={item.authorName}
                            className="h-5 w-5 rounded-full object-cover border border-purple-500/40"
                          />
                          <span className="font-medium text-gray-300">{item.authorName}</span>
                          {item.isSubscribedAuthor && (
                            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-medium border border-emerald-500/30">
                              Subscribed
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" /> {(item.viewsCount / 1000).toFixed(1)}k
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3 text-red-400" /> {item.likesCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 px-2 py-0.5 rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Right Column: KI Algorithmus & Interest Vector Inspector */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          {/* Elon Musk Architecture Pitch Callout */}
          <div className="glass-panel-glow p-5 rounded-2xl border border-purple-500/30 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />
            
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              {lang === 'de' ? 'Hyper-Personalized Assembly Engine' : 'Hyper-Personalized Assembly Engine'}
            </h3>
            <p className="text-xs text-gray-300 mt-2 leading-relaxed">
              {lang === 'de'
                ? 'Keine starren SQL-Relationen! Unser System nutzt 4 parallele Inhalts-Buckets (High Intent, Network, Exploration, Trending) & steuert den Feed über dynamische Vektor-Scores und Slot-Patterns.'
                : 'No rigid SQL joins! Our architecture runs 4 parallel content buckets (High Intent, Network, Exploration, Trending) interleaved via dynamic interest vectors.'}
            </p>

            {/* Ollama Intent Prompt Input Box */}
            <form onSubmit={handleAiPromptSubmit} className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-purple-400" />
                {lang === 'de' ? 'Lokaler Ollama KI-Agent (CPU Inference):' : 'Local Ollama AI Agent (CPU Inference):'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder={
                    lang === 'de'
                      ? 'z.B. "Ich will jetzt nur noch Tech-PDFs sehen"...'
                      : 'e.g. "I want to see tech PDFs only"...'
                  }
                  className="flex-1 bg-gray-950/80 border border-purple-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition"
                />
                <button
                  type="submit"
                  disabled={isAiProcessing}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-purple-600/30"
                >
                  {isAiProcessing ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 fill-current" />
                  )}
                  <span>{lang === 'de' ? 'Anpassen' : 'Adjust'}</span>
                </button>
              </div>

              {/* Quick Preset Pills */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  lang === 'de' ? 'Tech-PDFs & Postgres' : 'Tech PDFs & Postgres',
                  lang === 'de' ? 'NextJS Video Tutorials' : 'NextJS Video Tutorials',
                  lang === 'de' ? 'Funny Cat Videos' : 'Funny Cat Videos',
                ].map((pill) => (
                  <button
                    type="button"
                    key={pill}
                    onClick={() => {
                      setPromptInput(pill);
                    }}
                    className="text-[10px] bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 px-2 py-1 rounded-md transition"
                  >
                    + {pill}
                  </button>
                ))}
              </div>
            </form>

            {/* AI Log Output */}
            {aiLog && (
              <div className="mt-3 bg-gray-950/90 border border-purple-500/30 p-3 rounded-xl text-xs text-purple-200 font-mono animate-fadeIn">
                {aiLog}
              </div>
            )}
          </div>

          {/* User Interest Profile Vector Matrix */}
          <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                {lang === 'de' ? 'Strapi User Interest Vector' : 'Strapi User Interest Vector'}
              </h3>
              <span className="text-[11px] text-gray-400 font-mono">JSON Component</span>
            </div>

            {/* Topic Scores Sliders */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider text-[10px]">
                {lang === 'de' ? 'Themen-Affinitäten (0.0 - 1.0)' : 'Topic Affinities (0.0 - 1.0)'}
              </span>
              {Object.entries(profile.interests).map(([topic, data]) => (
                <div key={topic} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between items-center text-gray-300">
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
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              ))}
            </div>

            {/* Content Type Weights */}
            <div className="flex flex-col gap-3 pt-3 border-t border-gray-800/80">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider text-[10px]">
                {lang === 'de' ? 'Format-Gewichtungen' : 'Content Type Weights'}
              </span>
              {Object.entries(profile.contentTypes).map(([type, weight]) => (
                <div key={type} className="flex justify-between items-center text-xs">
                  <span className="capitalize text-gray-400">{type}</span>
                  <div className="flex items-center gap-2 w-32">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={weight}
                      onChange={(e) => updateMediaTypeWeight(type, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <span className="font-mono text-emerald-400 w-8 text-right font-bold">
                      {weight.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Pattern Selector */}
            <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between">
              <span className="text-xs text-gray-300 font-semibold">
                {lang === 'de' ? 'Feed-Muster:' : 'Feed Pattern:'}
              </span>
              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={() => {
                    const updated = { ...profile, activePattern: 'discovery' as const };
                    setProfile(updated);
                    fetchAssembledFeed(updated);
                  }}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    profile.activePattern === 'discovery'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Discovery
                </button>
                <button
                  onClick={() => {
                    const updated = { ...profile, activePattern: 'deep_dive' as const };
                    setProfile(updated);
                    fetchAssembledFeed(updated);
                  }}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    profile.activePattern === 'deep_dive'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  Deep Dive
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow max-w-2xl w-full rounded-2xl p-6 border border-purple-500/40 relative flex flex-col gap-4">
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm font-bold bg-gray-800/80 h-8 w-8 rounded-full flex items-center justify-center"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 text-xs text-purple-300 font-semibold">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Media Preview ({selectedMedia.mediaType.toUpperCase()})</span>
            </div>
            <h3 className="text-lg font-bold text-white">{selectedMedia.title}</h3>
            <p className="text-xs text-gray-300 leading-relaxed">{selectedMedia.content}</p>

            {selectedMedia.mediaType === 'video' || selectedMedia.mediaType === 'short' ? (
              <video controls src={selectedMedia.mediaUrl} className="w-full rounded-xl bg-black max-h-80" />
            ) : selectedMedia.mediaType === 'pdf' ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center flex flex-col items-center gap-3">
                <FileText className="h-12 w-12 text-red-500 animate-bounce" />
                <span className="text-xs text-gray-300 font-mono">PDF Interactive Reader Simulation</span>
                <a
                  href={selectedMedia.mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <span>Download / View PDF</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
