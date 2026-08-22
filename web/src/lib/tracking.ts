import { allows } from './consent';


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

  public async flush() {
    if (this.eventQueue.length === 0) return;

    // Statistics consent governs sending, not just storing. Without it the
    // queue is dropped rather than held back — buffering until permission
    // arrives would turn a refusal into a delay (#139).
    if (!allows('statistics')) {
      this.eventQueue = [];
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // The route identifies the sender from the session cookie, which the
      // browser attaches on its own — nothing here needs to know the token.
      await fetch('/api/tracking/batch', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      });
    } catch (err) {
      console.error('Tracking batch flush failed:', err);
    }
  }

  private flushBeacon() {
    if (this.eventQueue.length === 0) return;
    if (!allows('statistics')) {
      this.eventQueue = [];
      return;
    }
    // sendBeacon sends cookies for a same-origin request, so this carries the
    // session just like the fetch above does.
    const payload = JSON.stringify({ events: this.eventQueue });
    this.eventQueue = [];

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/tracking/batch', blob);
    }
  }
}

export const tracker = new TrackingManager();
