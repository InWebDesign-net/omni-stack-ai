'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import VideoUploadModal from '@/components/VideoUploadModal';
import ChannelProfileModal from '@/components/ChannelProfileModal';
import UserSettingsModal from '@/components/UserSettingsModal';
import AuthModal from '@/components/AuthModal';
import AlgorithmModal from '@/components/AlgorithmModal';
import { getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';
import { DEMO_CREATORS, DEFAULT_SUBSCRIBED_HANDLES, getDemoCreatorByHandle } from '@/config/demo';
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
  id?: number | string;
  username: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  subscribersCount?: number;
  allowDirectMessages?: 'everyone' | 'subscribers_only' | 'nobody';
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

  isAlgoModalOpen: boolean;
  openAlgoModal: () => void;
  closeAlgoModal: () => void;

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
  const [isAlgoModalOpen, setIsAlgoModalOpen] = useState(false);

  // Subscriptions
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>(DEFAULT_SUBSCRIBED_HANDLES);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('omni_lang') as 'de' | 'en';
      if (savedLang === 'de' || savedLang === 'en') {
        setLangState(savedLang);
      } else {
        // Fall back to the omni_lang cookie (set by the language switch / server)
        const m = document.cookie.match(/(?:^|;\s*)omni_lang=([^;]+)/);
        const cookieLang = m?.[1];
        if (cookieLang === 'de' || cookieLang === 'en') {
          setLangState(cookieLang);
        }
      }

      const sanitizeUserSession = (usr: any): UserProfileSession | null => {
        if (!usr) return null;
        const username = usr.username || usr.name || (usr.email ? usr.email.split('@')[0] : 'Omni User');
        const rawHandle = usr.handle || `@${username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        return {
          ...usr,
          id: usr.id || 1,
          username,
          email: usr.email || '',
          handle: rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`,
          avatarUrl: usr.avatarUrl || '',
          bio: usr.bio || '',
          subscribersCount: usr.subscribersCount || 0,
        };
      };

      try {
        const savedUserStr = localStorage.getItem('omni_user');
        if (savedUserStr) {
          const parsedUser = JSON.parse(savedUserStr);
          const sanitized = sanitizeUserSession(parsedUser);
          if (sanitized) {
            setCurrentUser(sanitized);
            if (sanitized.affinityGraph) {
              const norm = normalizeAffinityGraph(sanitized.affinityGraph);
              setProfile(norm);
              storeAffinityGraph(norm);
            }
          }
        }
      } catch (e) {}

      const storedGraph = loadStoredAffinityGraph();
      if (storedGraph) {
        setProfile(storedGraph);
      }

      // Fetch fresh profile & real affinityGraph from Strapi DB if logged in
      const jwt = getStoredJwt();
      if (jwt) {
        fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${jwt}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.user) {
              const sanitized = sanitizeUserSession(data.user);
              if (sanitized) {
                setCurrentUser((prev) => ({ ...prev, ...sanitized }));
                try {
                  localStorage.setItem('omni_user', JSON.stringify(sanitized));
                } catch (e) {}
              }
            }
            if (data?.affinityGraph) {
              const norm = normalizeAffinityGraph(data.affinityGraph);
              setProfile(norm);
              storeAffinityGraph(norm);
            }
          })
          .catch((err) => console.error('Failed to load profile from Strapi:', err));
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
      const normHandle = creatorOrItem.replace(/^@/, '').toLowerCase();
      const match = getDemoCreatorByHandle(normHandle);
      if (match) {
        setSelectedChannel({
          id: match.id,
          username: match.username,
          handle: `@${match.handle}`,
          avatarUrl: match.avatarUrl,
          bio: match.bio,
          subscribersCount: 0,
          allowDirectMessages: 'everyone',
        });
        return;
      }
      setSelectedChannel({
        id: undefined,
        username: normHandle,
        handle: `@${normHandle}`,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
        bio: 'Creator & Content Publisher im Omni Network.',
        subscribersCount: 0,
        allowDirectMessages: 'everyone',
      });
      return;
    }
    if (creatorOrItem.username && creatorOrItem.handle && creatorOrItem.avatarUrl) {
      setSelectedChannel({
        id: creatorOrItem.id,
        username: creatorOrItem.username,
        handle: creatorOrItem.handle.startsWith('@') ? creatorOrItem.handle : `@${creatorOrItem.handle}`,
        avatarUrl: creatorOrItem.avatarUrl,
        bio: creatorOrItem.bio || 'Creator & Content Publisher im Omni Network.',
        subscribersCount: Number(creatorOrItem.subscribersCount || 0),
        allowDirectMessages: creatorOrItem.allowDirectMessages || 'everyone',
      });
      return;
    }
    if (creatorOrItem.authorHandle || creatorOrItem.handle) {
      const handle = creatorOrItem.authorHandle || creatorOrItem.handle;
      const name = creatorOrItem.authorName || creatorOrItem.label || creatorOrItem.username || handle.replace('@', '');
      const avatar = creatorOrItem.authorAvatar || creatorOrItem.avatar || creatorOrItem.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';
      setSelectedChannel({
        id: creatorOrItem.id || creatorOrItem.author?.id || creatorOrItem.creator?.id,
        username: name,
        handle: handle.startsWith('@') ? handle : `@${handle}`,
        avatarUrl: avatar,
        bio: creatorOrItem.bio || creatorOrItem.author?.bio || 'Creator & Content Publisher im Omni Network.',
        subscribersCount: Number(creatorOrItem.subscribersCount || creatorOrItem.author?.subscribersCount || 0),
        allowDirectMessages: creatorOrItem.allowDirectMessages || creatorOrItem.author?.allowDirectMessages || 'everyone',
      });
      return;
    }
    setSelectedChannel({
      id: creatorOrItem.id || creatorOrItem.author?.id || creatorOrItem.creator?.id,
      username: getAuthorName(creatorOrItem),
      handle: getAuthorHandle(creatorOrItem),
      avatarUrl: getAuthorAvatar(creatorOrItem),
      bio: 'Creator & Content Publisher im Omni Network.',
      subscribersCount: Number(creatorOrItem.subscribersCount || creatorOrItem.author?.subscribersCount || 0),
      allowDirectMessages: creatorOrItem.allowDirectMessages || creatorOrItem.author?.allowDirectMessages || 'everyone',
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
        isAlgoModalOpen,
        openAlgoModal: () => setIsAlgoModalOpen(true),
        closeAlgoModal: () => setIsAlgoModalOpen(false),
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

      <AlgorithmModal
        isOpen={isAlgoModalOpen}
        onClose={() => setIsAlgoModalOpen(false)}
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
