'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import VideoUploadModal from '@/components/VideoUploadModal';
import ChannelProfileModal from '@/components/ChannelProfileModal';
import UserSettingsModal from '@/components/UserSettingsModal';
import AuthModal from '@/components/AuthModal';
import CreateFeedItemModal from '@/components/CreateFeedItemModal';
import { InterestProfile, DEFAULT_PROFILE, getAuthorName, getAuthorHandle, getAuthorAvatar } from '@/lib/feed';

export interface UserProfileSession {
  id: number;
  username: string;
  email: string;
  handle: string;
  avatarUrl: string;
  bio?: string;
  subscribersCount?: number;
  jwt?: string;
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

  // Interest Profile
  profile: InterestProfile;
  setProfile: React.Dispatch<React.SetStateAction<InterestProfile>>;
  updateProfileState: (newProfile: InterestProfile) => void;

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
  const [profile, setProfile] = useState<InterestProfile>(DEFAULT_PROFILE);

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
        const savedUser = localStorage.getItem('omni_user');
        if (savedUser) {
          setCurrentUser(JSON.parse(savedUser));
        }
      } catch (e) {}

      try {
        const storedProfile = localStorage.getItem('omni_user_interest_profile');
        if (storedProfile) {
          const parsed = JSON.parse(storedProfile);
          if (parsed && parsed.interests) {
            setProfile(parsed);
          }
        }
      } catch (e) {}
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

  const updateProfileState = (newProfile: InterestProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem('omni_user_interest_profile', JSON.stringify(newProfile));
    } catch (e) {}
  };

  const toggleSubscribeChannel = (handle: string) => {
    setSubscribedChannels((prev) =>
      prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle]
    );
  };

  // Helper to open channel profile modal from item or profile object
  const openChannelModal = (creatorOrItem: any) => {
    if (!creatorOrItem) return;
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        lang,
        setLang,
        toggleLanguage,
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
