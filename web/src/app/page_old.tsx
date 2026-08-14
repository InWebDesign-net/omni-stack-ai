'use client';

import React, { useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Zap,
  Bot,
  RefreshCw,
  Send,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Users,
} from 'lucide-react';
import Header from '@/components/Header';
import { useApp } from '@/context/AppContext';
import {
  AffinityGraph,
  normalizeAffinityGraph,
  loadStoredAffinityGraph,
  getStoredJwt,
  TOPIC_SCORE_MAX,
} from '@/lib/affinity';

function OmniAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    currentUser,
    setCurrentUser,
    lang,
    setLang,
    toggleLanguage,
    profile,
    setProfile,
    updateProfileState,
    openChannelModal,
    openVideoUploadModal,
    openSettingsModal,
    openAuthModal,
    openCreateItemModal,
    subscribedChannels,
    toggleSubscribeChannel,
    t,
  } = useApp();

  const [algoDrawerOpen, setAlgoDrawerOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'trending' | 'subscriptions' | 'library'>('home');

  // AI Prompt / Chat Mask State
  const [chatInput, setChatInput] = useState('');
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Media Player Modal
  const channelScrollRef = useRef<HTMLDivElement>(null);

  const [canChannelScrollLeft, setCanChannelScrollLeft] = useState(false);
  const [canChannelScrollRight, setCanChannelScrollRight] = useState(true);

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



  // Fetch Feed from Strapi API Proxy with target locale.
  // Logged-in users are ranked server-side against their stored affinityGraph
  // (JWT forwarded); anonymous visitors send their local graph along.
  /* const fetchFeed = async (currentProfile: AffinityGraph, currentLang = lang, includeDrafts = false) => {
    setIsLoading(true);
    try {
      const jwt = getStoredJwt();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

      const res = await fetch('/api/strapi-feed', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...currentProfile, locale: currentLang, includeDrafts }),
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
  }; */

  // Handle Real AI Chat Prompt submission via Strapi & Ollama
  const handleChatSubmit = async (e: React.FormEvent) => {

  };

  const updateInterestScore = async (topic: string, newScore: number) => {

  };


  return (
    <div className="min-h-screen bg-mesh text-[#dae2fd] flex flex-col font-sans">

      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <Header />

      {/* ── Algorithm Drawer ─────────────────────────────────────────────────── */}
      {algoDrawerOpen && (
        <aside className="glass-surface border-b border-white/6 px-6 py-5 shadow-2xl animate-slideDown z-30"
          style={{ boxShadow: '0 8px 32px -8px rgba(8,14,30,0.90), 0 1px 0 rgba(128,131,255,0.12)' }}>
          <div className="w-full max-w-content mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

            {/* Interest Sliders */}
            <div className="md:col-span-7 flex flex-col gap-3 bg-[#0d1528] p-5 rounded-2xl border border-white/6">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[#8083ff]" />
                  {t.feed.interestVectors}
                </span>
                <span className="text-[10px] text-[#5c657d] font-mono bg-[#192038] px-2 py-0.5 rounded-full">JSON Profile</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(profile.topics).map(([topic, data]) => (
                  <div key={topic} className="flex flex-col gap-1.5 text-[11px]">
                    <div className="flex justify-between text-[#9ba4bf]">
                      <span className="font-medium truncate mr-1">{topic}</span>
                      <span className="font-mono text-[#44e2cd] font-bold shrink-0">{Math.round(data.score)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={TOPIC_SCORE_MAX}
                      step="5"
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
                {t.feed.slotInterleaving}
              </span>
              <div className="flex gap-2.5">
                <button
                  onClick={async () => {
                    const u = { ...profile, activePattern: 'discovery' as const };
                    await updateProfileState(u);
                    /* fetchFeed(u); */
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${profile.activePattern === 'discovery'
                    ? 'bg-[#8083ff] text-white shadow-lg shadow-[#8083ff]/30'
                    : 'bg-[#192038] text-[#9ba4bf] hover:text-white hover:bg-[#1e2740]'
                    }`}
                >
                  {t.feed.discovery}
                </button>
                <button
                  onClick={async () => {
                    const u = { ...profile, activePattern: 'deep_dive' as const };
                    await updateProfileState(u);
                    /* fetchFeed(u); */
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${profile.activePattern === 'deep_dive'
                    ? 'bg-[#44e2cd] text-[#003731] shadow-lg shadow-[#44e2cd]/25'
                    : 'bg-[#192038] text-[#9ba4bf] hover:text-white hover:bg-[#1e2740]'
                    }`}
                >
                  {t.feed.deepDive}
                </button>
              </div>
              <button
                onClick={() => setAlgoDrawerOpen(false)}
                className="text-[11px] text-[#5c657d] hover:text-[#9ba4bf] transition-colors text-center py-1"
              >
                {t.feed.closePanel}
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
              ? t.feed.srTitle
              : t.feed.srTitle}
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
                        {t.feed.aiAssistant}
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
                        t.feed.aiPlaceholder
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
                      <span>{t.feed.channels}</span>
                    </span>

                    {/* Scroll Container with Faded Edges */}
                    <div className="relative flex-1 overflow-hidden flex items-center">
                      {/* Left Scroll Button */}
                      {canChannelScrollLeft && (
                        <button
                          type="button"
                          onClick={() => scrollContainer(channelScrollRef, 'left')}
                          className="absolute left-0 z-20 p-1.5 rounded-full bg-[#080e1e]/95 border border-white/15 text-[#9ba4bf] hover:text-white shadow-lg backdrop-blur-md transition-all active:scale-95"
                          title={t.feed.scrollLeft}
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
                          // TODO: muessen dynamisch aus dem Backend geladen werden.
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
                          title={t.feed.scrollRight}
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
        </main>
      </div>



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
