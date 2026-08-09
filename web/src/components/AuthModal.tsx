'use client';

import React, { useState } from 'react';
import { X, UserPlus, LogIn, User, Mail, Lock, Sparkles, ChevronRight, ExternalLink, RefreshCw } from 'lucide-react';
import { useApp, UserProfileSession } from '@/context/AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

function OmniLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" stroke="url(#logo_grad)" strokeWidth="2.5" strokeDasharray="4 2" />
      <circle cx="20" cy="20" r="10" fill="url(#logo_inner)" />
      <path d="M20 6L23 14L31 15L25 21L27 29L20 25L13 29L15 21L9 15L17 14L20 6Z" fill="#ffffff" opacity="0.9" />
      <defs>
        <linearGradient id="logo_grad" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#8083ff" />
          <stop offset="1" stopColor="#44e2cd" />
        </linearGradient>
        <linearGradient id="logo_inner" x1="10" y1="10" x2="30" y2="30">
          <stop stopColor="#8083ff" />
          <stop offset="1" stopColor="#251f42" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function AuthModal({ isOpen, onClose, initialMode = 'register' }: AuthModalProps) {
  const { setCurrentUser, lang, t } = useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [regForm, setRegForm] = useState({ username: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });

  if (!isOpen) return null;

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
        setAuthError(data.error || t.auth.googleQuickLoginError);
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
        bio: data.user.bio || t.auth.demoUserBio,
        subscribersCount: data.user.subscribersCount || 1280,
        jwt: data.jwt,
      };

      setCurrentUser(userData);
      try {
        localStorage.setItem('omni_user', JSON.stringify(userData));
        document.cookie = `omni_user_jwt=${data.jwt}; path=/; max-age=2592000`;
      } catch (e) {}

      setIsAuthLoading(false);
      onClose();
    } catch (e: any) {
      setAuthError(e.message || 'Login error');
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || t.auth.registrationFailed);
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
        bio: 'Neuer Omni Content Explorer',
        subscribersCount: 0,
        jwt: data.jwt,
      };

      setCurrentUser(userData);
      try {
        localStorage.setItem('omni_user', JSON.stringify(userData));
      } catch (e) {}

      setIsAuthLoading(false);
      onClose();
    } catch (e: any) {
      setAuthError(e.message || 'Registration error');
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || t.auth.loginFailed);
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
        bio: data.user.bio || 'Omni Content Explorer',
        subscribersCount: data.user.subscribersCount || 100,
        jwt: data.jwt,
      };

      setCurrentUser(userData);
      try {
        localStorage.setItem('omni_user', JSON.stringify(userData));
      } catch (e) {}

      setIsAuthLoading(false);
      onClose();
    } catch (e: any) {
      setAuthError(e.message || 'Login error');
      setIsAuthLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0d1528] border border-white/10 max-w-md w-full rounded-3xl p-7 relative flex flex-col gap-6 shadow-2xl animate-fadeInUp">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#5c657d] hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#8083ff]/30 to-[#44e2cd]/15 blur-lg" />
            <div className="relative rounded-2xl bg-[#080e1e] border border-white/10 p-3">
              <OmniLogo size={32} />
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {authMode === 'register' ? t.auth.registerTitle : t.auth.loginTitle}
            </h2>
            <p className="text-xs text-[#5c657d] mt-1">
              {authMode === 'register' ? t.auth.registerSubtitle : t.auth.loginSubtitle}
            </p>
          </div>
        </div>

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
              <span>{mode === 'register' ? t.header.register : t.header.login}</span>
            </button>
          ))}
        </div>

        {authError && (
          <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-xl text-xs text-red-300 flex items-start gap-2">
            <span className="text-red-400 mt-0.5">⚠</span>
            {authError}
          </div>
        )}

        {authMode === 'register' ? (
          <form noValidate onSubmit={handleRegister} className="flex flex-col gap-4">
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
              <span>{t.auth.googleSignIn}</span>
            </button>

            <div className="relative my-0.5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#0d1528] px-3 text-[10px] font-bold text-[#5c657d] uppercase tracking-wider">
                {t.auth.orRegisterManually}
              </span>
            </div>

            {[
              { key: 'username', label: t.auth.username, type: 'text', placeholder: t.auth.usernamePlaceholder, icon: User },
              { key: 'email', label: t.auth.email, type: 'email', placeholder: t.auth.emailPlaceholder, icon: Mail },
              { key: 'password', label: t.auth.password, type: 'password', placeholder: '••••••••', icon: Lock },
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
              <span>{t.auth.createStrapiAccount}</span>
            </button>
          </form>
        ) : (
          <form noValidate onSubmit={handleLogin} className="flex flex-col gap-4">
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
              <span>{t.auth.googleSignIn}</span>
            </button>

            <div className="relative my-0.5 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <span className="relative bg-[#0d1528] px-3 text-[10px] font-bold text-[#5c657d] uppercase tracking-wider">
              {t.auth.orWithDemo}
              </span>
            </div>

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
              <span>{t.auth.loginStrapi}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
