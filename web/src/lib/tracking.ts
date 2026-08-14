import { getStoredJwt } from './affinity';

export interface TrackEvent {
  type: 'view' | 'click' | 'like' | 'unlike' | 'completion' | 'share' | 'comment';
  tags: string[];
  mediaType?: 'video' | 'pdf' | 'article' | 'short';
  creatorId?: string | number;
  timestamp?: string;
}

class TrackingManager {
  private eventQueue: TrackEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private userId: string | number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Auto flush every 5 seconds
      this.flushInterval = setInterval(() => {
        this.flush();
      }, 5000);

      // Flush on page unload via sendBeacon
      window.addEventListener('beforeunload', () => {
        this.flushBeacon();
      });
    }
  }

  public setUserId(id: string | number | null) {
    this.userId = id;
  }

  public track(
    type: 'view' | 'click' | 'like' | 'unlike' | 'completion' | 'share' | 'comment',
    tags: string[] = [],
    mediaType?: any,
    creatorId?: any
  ) {
    if (!tags || tags.length === 0) return;

    this.eventQueue.push({
      type,
      tags,
      mediaType,
      creatorId,
      timestamp: new Date().toISOString(),
    });

    // Flush immediately on active actions
    if (type === 'like' || type === 'unlike' || type === 'click' || type === 'comment') {
      this.flush();
    }
  }

  private getJwt(): string | null {
    return getStoredJwt();
  }

  public async flush() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const jwt = this.getJwt();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

      await fetch('/api/tracking/batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: eventsToSend, jwt }),
      });
    } catch (err) {
      console.error('Tracking batch flush failed:', err);
    }
  }

  private flushBeacon() {
    if (this.eventQueue.length === 0) return;
    const jwt = this.getJwt();
    const payload = JSON.stringify({
      jwt,
      events: this.eventQueue,
    });
    this.eventQueue = [];

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/tracking/batch', blob);
    }
  }
}

export const tracker = new TrackingManager();
