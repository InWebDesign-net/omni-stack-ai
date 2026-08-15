'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Loader2, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getStoredJwt } from '@/lib/affinity';

interface SubscribeButtonProps {
  targetId: string;
  type?: 'channel' | 'chat_room';
  initialIsSubscribed?: boolean;
  initialCount?: number;
  className?: string;
  showCount?: boolean;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onStatusChange?: (isSubscribed: boolean, count: number) => void;
}

export default function SubscribeButton({
  targetId,
  type = 'channel',
  initialIsSubscribed,
  initialCount,
  className = '',
  showCount = false,
  iconOnly = false,
  size = 'md',
  onStatusChange,
}: SubscribeButtonProps) {
  const { currentUser, t } = useApp();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(initialIsSubscribed ?? false);
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state if props change from parent
  useEffect(() => {
    if (initialIsSubscribed !== undefined) {
      setIsSubscribed(initialIsSubscribed);
    }
  }, [initialIsSubscribed]);

  useEffect(() => {
    if (initialCount !== undefined) {
      setCount(initialCount);
    }
  }, [initialCount]);

  // Fetch real subscription status from API
  useEffect(() => {
    let active = true;
    if (!targetId) return;

    const fetchStatus = async () => {
      try {
        const jwt = getStoredJwt();
        const queryParam = type === 'channel' ? `targetUser=${targetId}` : `targetChatRoom=${targetId}`;
        const res = await fetch(`/api/subscriptions?${queryParam}`, {
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
        });
        if (res.ok && active) {
          const data = await res.json();
          const subState = Boolean(data.isSubscribed);
          const subCount = typeof data.subscriberCount === 'number' ? data.subscriberCount : 0;
          
          setIsSubscribed(subState);
          setCount(subCount);
          if (onStatusChange) {
            onStatusChange(subState, subCount);
          }
        }
      } catch (e) {
        console.error('Failed to fetch subscription status:', e);
      }
    };

    fetchStatus();
    return () => {
      active = false;
    };
  }, [targetId, type, currentUser?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      alert((t.common as any)?.loginRequired || 'Bitte melde dich an, um Kanäle zu abonnieren.');
      return;
    }

    if (isLoading || !targetId) return;

    // Optimistic update
    const previousSubscribed = isSubscribed;
    const previousCount = count;
    const nextSubscribed = !isSubscribed;
    const nextCount = nextSubscribed ? count + 1 : Math.max(0, count - 1);

    setIsSubscribed(nextSubscribed);
    setCount(nextCount);
    if (onStatusChange) {
      onStatusChange(nextSubscribed, nextCount);
    }
    setIsLoading(true);

    try {
      const jwt = getStoredJwt();
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify({
          action: 'toggle',
          targetId,
          type,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const finalSubState = Boolean(data.isSubscribed);
        const finalSubCount = typeof data.subscriberCount === 'number' ? data.subscriberCount : nextCount;
        
        setIsSubscribed(finalSubState);
        setCount(finalSubCount);
        if (onStatusChange) {
          onStatusChange(finalSubState, finalSubCount);
        }

        if (finalSubState) {
          showToast(type === 'channel' ? 'Kanal erfolgreich abonniert! 🎉' : 'Chatraum abonniert! 🎉');
        } else {
          showToast(type === 'channel' ? 'Kanal-Abonnement beendet.' : 'Chatraum-Abonnement beendet.');
        }
      } else {
        // Rollback on failure
        setIsSubscribed(previousSubscribed);
        setCount(previousCount);
        if (onStatusChange) {
          onStatusChange(previousSubscribed, previousCount);
        }
        showToast('Fehler beim Aktualisieren des Abonnements.');
      }
    } catch (e) {
      console.error('Failed to toggle subscription:', e);
      setIsSubscribed(previousSubscribed);
      setCount(previousCount);
      if (onStatusChange) {
        onStatusChange(previousSubscribed, previousCount);
      }
      showToast('Fehler beim Aktualisieren des Abonnements.');
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = iconOnly
    ? {
        sm: 'p-2 rounded-xl',
        md: 'p-2.5 rounded-xl',
        lg: 'p-3 rounded-2xl',
      }[size]
    : {
        sm: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
        md: 'px-4 py-2 text-xs font-bold rounded-xl gap-2',
        lg: 'px-5 py-2.5 text-sm font-bold rounded-2xl gap-2.5',
      }[size];

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={isLoading}
        className={`inline-flex items-center justify-center transition-all select-none shadow-sm active:scale-95 cursor-pointer ${sizeClasses} ${
          isSubscribed
            ? isHovered
              ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300'
              : 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300'
            : 'bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white shadow-indigo-600/25 shadow-md'
        } ${className}`}
        title={
          isSubscribed
            ? isHovered
              ? 'Abonnement beenden'
              : 'Abonniert'
            : 'Kanal abonnieren'
        }
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSubscribed ? (
          isHovered ? (
            <BellOff className="w-4 h-4 text-rose-400" />
          ) : (
            <Check className="w-4 h-4 text-indigo-400" />
          )
        ) : (
          <Bell className="w-4 h-4 text-white" />
        )}

        {!iconOnly && (
          <span>
            {isSubscribed
              ? isHovered
                ? (t.common as any)?.unsubscribe || 'Deabonnieren'
                : t.common?.subscribed || 'Abonniert'
              : t.common?.subscribe || 'Abonnieren'}
          </span>
        )}

        {showCount && count > 0 && (
          <span
            className={`ml-0.5 px-1.5 py-0.2 text-[10px] font-mono rounded-md ${
              isSubscribed
                ? 'bg-indigo-500/20 text-indigo-300'
                : 'bg-white/20 text-white'
            }`}
          >
            {count}
          </span>
        )}
      </button>

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900/95 border border-indigo-500/40 text-white font-medium text-sm shadow-2xl shadow-indigo-600/30 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-300 backdrop-blur-md">
          <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
