'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Check, Plus, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getStoredJwt } from '@/lib/affinity';

interface SubscribeButtonProps {
  targetId: string;
  type?: 'channel' | 'chat_room';
  initialIsSubscribed?: boolean;
  initialCount?: number;
  className?: string;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function SubscribeButton({
  targetId,
  type = 'channel',
  initialIsSubscribed,
  initialCount,
  className = '',
  showCount = true,
  size = 'md',
}: SubscribeButtonProps) {
  const { currentUser, t } = useApp();
  const [isSubscribed, setIsSubscribed] = useState<boolean>(initialIsSubscribed ?? false);
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Fetch initial subscription state if not provided
  useEffect(() => {
    let active = true;
    if (initialIsSubscribed === undefined || initialCount === undefined) {
      const fetchStatus = async () => {
        try {
          const jwt = getStoredJwt();
          const queryParam = type === 'channel' ? `targetUser=${targetId}` : `targetChatRoom=${targetId}`;
          const res = await fetch(`/api/subscriptions?${queryParam}`, {
            headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
          });
          if (res.ok && active) {
            const data = await res.json();
            setIsSubscribed(data.isSubscribed);
            setCount(data.subscriberCount);
          }
        } catch (e) {
          console.error('Failed to fetch subscription status:', e);
        }
      };
      fetchStatus();
    }
    return () => {
      active = false;
    };
  }, [targetId, type, initialIsSubscribed, initialCount]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      alert((t.common as any)?.loginRequired || 'Bitte melde dich an, um Kanäle zu abonnieren.');
      return;
    }

    if (isLoading) return;

    // Optimistic update
    const previousSubscribed = isSubscribed;
    const previousCount = count;
    const nextSubscribed = !isSubscribed;
    const nextCount = nextSubscribed ? count + 1 : Math.max(0, count - 1);

    setIsSubscribed(nextSubscribed);
    setCount(nextCount);
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
        setIsSubscribed(data.isSubscribed);
        setCount(data.subscriberCount);
      } else {
        // Rollback on failure
        setIsSubscribed(previousSubscribed);
        setCount(previousCount);
      }
    } catch (e) {
      console.error('Failed to toggle subscription:', e);
      setIsSubscribed(previousSubscribed);
      setCount(previousCount);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs rounded-lg gap-1.5',
    md: 'px-3.5 py-1.5 text-xs font-semibold rounded-xl gap-2',
    lg: 'px-5 py-2.5 text-sm font-bold rounded-2xl gap-2.5',
  }[size];

  return (
    <button
      type="button"
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      className={`inline-flex items-center justify-center transition-all select-none shadow-sm active:scale-95 ${sizeClasses} ${
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
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : isSubscribed ? (
        isHovered ? (
          <BellOff className="w-3.5 h-3.5 text-rose-400" />
        ) : (
          <Check className="w-3.5 h-3.5 text-indigo-400" />
        )
      ) : (
        <Bell className="w-3.5 h-3.5 text-white" />
      )}

      <span>
        {isSubscribed
          ? isHovered
            ? (t.common as any)?.unsubscribe || 'Deabonnieren'
            : t.common?.subscribed || 'Abonniert'
          : t.common?.subscribe || 'Abonnieren'}
      </span>

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
  );
}
