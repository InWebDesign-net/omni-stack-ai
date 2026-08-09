'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import VideoUploadModal from '@/components/VideoUploadModal';
import ChannelProfileModal from '@/components/ChannelProfileModal';
import UserSettingsModal from '@/components/UserSettingsModal';
import AuthModal from '@/components/AuthModal';
import CreateFeedItemModal from '@/components/CreateFeedItemModal';
import { getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';
import {
  AffinityGraph,
  defaultAffinityGraph,
  normalizeAffinityGraph,
  loadStoredAffinityGraph,
  storeAffinityGraph,
  getStoredJwt,
} from '@/lib/affinity';
import { getDictionary, Dictionary } from '@/lib/i18n';

export interface UserProfileSession {
  id: number;
  username: string;
  email: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  subscribersCount?: number;
  jwt?: string;
  affinityGraph?: AffinityGraph;
}

export interface ChannelProfileData {
  username: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  subscribersCount?: number;
}

interface AppContextType {
  // User Session & Lang
  currentUser: UserProfileSession | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<UserProfileSession | null>>;
  lang: 'de' | 'en';
  setLang: (lang: 'de' | 'en') => void;
  toggleLanguage: () => void;
  t: Dictionary;

  // Interest Profile (canonical AffinityGraph)
  profile: AffinityGraph;
  setProfile: React.Dispatch<React.SetStateAction<AffinityGraph>>;
  updateProfileState: (newProfile: AffinityGraph) => Promise<void>;

  // Modals Control
  isVideoUploadOpen: boolean;
  openVideoUploadModal: () => void;
  closeVideoUploadModal: () => void;

  selectedChannel: ChannelProfileData | null;
  openChannelModal: (channelDataOrItem: any) => void;
  closeChannelModal: () => void;

  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;

  isAuthModalOpen: boolean;
  authMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;

  isCreateItemOpen: boolean;
  openCreateItemModal: () => void;
  closeCreateItemModal: () => void;

  // Subscribed Channels
  subscribedChannels: string[];
  toggleSubscribeChannel: (handle: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfileSession | null>(null);
  const [lang, setLangState] = useState<'de' | 'en'>('de');
  const [profile, setProfile] = useState<AffinityGraph>(() => defaultAffinityGraph());

  // Modals State
  const [isVideoUploadOpen, setIsVideoUploadOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelProfileData | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false);

  // Subscriptions
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>(['@demotech', '@astro']);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('omni_lang') as 'de' | 'en';
      if (savedLang === 'de' || savedLang === 'en') {
        setLangState(savedLang);
      }

      try {
        const savedUserStr = localStorage.getItem('omni_user');
        if (savedUserStr) {
          const parsedUser = JSON.parse(savedUserStr);
          setCurrentUser(parsedUser);
          if (parsedUser.affinityGraph) {
            const norm = normalizeAffinityGraph(parsedUser.affinityGraph);
            setProfile(norm);
            storeAffinityGraph(norm);
          }
        }
      } catch (e) {}

      const storedGraph = loadStoredAffinityGraph();
      if (storedGraph) {
        setProfile(storedGraph);
      }
    }
  }, []);

  const setLang = (nextLang: 'de' | 'en') => {
    setLangState(nextLang);
    try {
      localStorage.setItem('omni_lang', nextLang);
      document.cookie = `omni_lang=${nextLang}; path=/; max-age=31536000`;
    } catch (e) {}
  };

  const toggleLanguage = () => {
    setLang(lang === 'de' ? 'en' : 'de');
  };

  // Persists the graph locally and — for logged-in users — to their Strapi user.
  // Await this before re-fetching the feed: the server ranks against the DB graph.
  const updateProfileState = async (newProfile: AffinityGraph) => {
    setProfile(newProfile);
    storeAffinityGraph(newProfile);

    const jwt = getStoredJwt();
    if (jwt) {
      try {
        await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify({ affinityGraph: newProfile }),
        });
      } catch (e) {
        console.error('Failed to persist affinityGraph:', e);
      }
    }
  };

  const toggleSubscribeChannel = (rawHandle: string) => {
    if (!rawHandle) return;
    const normHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
    const cleanHandle = rawHandle.replace(/^@/, '');
    setSubscribedChannels((prev) => {
      const exists = prev.includes(normHandle) || prev.includes(cleanHandle) || prev.includes(rawHandle);
      if (exists) {
        return prev.filter((h) => h !== normHandle && h !== cleanHandle && h !== rawHandle);
      }
      return [...prev, normHandle];
    });
  };

  const openChannelModal = (creatorOrItem: any) => {
    if (!creatorOrItem) return;
    if (typeof creatorOrItem === 'string') {
      const creatorMap: Record<string, { name: string; avatar: string; bio: string }> = {
        astro: { name: 'Astro-Wissen Magazin', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80', bio: 'Faszination Astronomie, Astrophysik & Weltraum-Dokumentationen.' },
        demotech: { name: 'Database Guru', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80', bio: 'Tech, Datenbanken & AI Engineering.' },
        demogourmet: { name: 'Culinary Masterclass', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80', bio: 'Italienische Küche, feine Rezepte & Kulinarik.' },
        greenplanet: { name: 'Green Planet Doku', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80', bio: 'Naturdokumentationen & Artenschutz.' },
        finanzkompass: { name: 'FinanzKompass', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80', bio: 'Finanzwissen & Vermögensaufbau.' },
      };
      const normHandle = creatorOrItem.replace(/^@/, '').toLowerCase();
      const match = creatorMap[normHandle];
      setSelectedChannel({
        username: match?.name || normHandle,
        handle: `@${normHandle}`,
        avatarUrl: match?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        bio: match?.bio || 'Creator & Content Publisher im Omni Network.',
        subscribersCount: 15400,
      });
      return;
    }
    if (creatorOrItem.username && creatorOrItem.handle && creatorOrItem.avatarUrl) {
      setSelectedChannel({
        username: creatorOrItem.username,
        handle: creatorOrItem.handle.startsWith('@') ? creatorOrItem.handle : `@${creatorOrItem.handle}`,
        avatarUrl: creatorOrItem.avatarUrl,
        bio: creatorOrItem.bio || 'Creator & Content Publisher im Omni Network.',
        subscribersCount: creatorOrItem.subscribersCount || 15400,
      });
      return;
    }
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
      bio: 'Creator & Content Publisher im Omni Network.',
      subscribersCount: 15400,
    });
  };

  const openAuthModal = (mode: 'login' | 'register' = 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const t = getDictionary(lang);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        lang,
        setLang,
        toggleLanguage,
        t,
        profile,
        setProfile,
        updateProfileState,
        isVideoUploadOpen,
        openVideoUploadModal: () => setIsVideoUploadOpen(true),
        closeVideoUploadModal: () => setIsVideoUploadOpen(false),
        selectedChannel,
        openChannelModal,
        closeChannelModal: () => setSelectedChannel(null),
        isSettingsModalOpen,
        openSettingsModal: () => setIsSettingsModalOpen(true),
        closeSettingsModal: () => setIsSettingsModalOpen(false),
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal: () => setIsAuthModalOpen(false),
        isCreateItemOpen,
        openCreateItemModal: () => setIsCreateItemOpen(true),
        closeCreateItemModal: () => setIsCreateItemOpen(false),
        subscribedChannels,
        toggleSubscribeChannel,
      }}
    >
      {children}

      {/* Global Modals Rendered Once at Root Level */}
      <VideoUploadModal
        isOpen={isVideoUploadOpen}
        onClose={() => setIsVideoUploadOpen(false)}
        onOpen={() => setIsVideoUploadOpen(true)}
        lang={lang}
      />

      <ChannelProfileModal
        selectedChannel={selectedChannel}
        onClose={() => setSelectedChannel(null)}
      />

      <UserSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />

      <CreateFeedItemModal
        isOpen={isCreateItemOpen}
        onClose={() => setIsCreateItemOpen(false)}
      />
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
