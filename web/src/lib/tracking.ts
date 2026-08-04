export interface TrackEvent {
  type: 'view' | 'click' | 'completion';
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
      // Auto flush every 15 seconds
      this.flushInterval = setInterval(() => {
        this.flush();
      }, 15000);

      // Flush on page unload via sendBeacon
      window.addEventListener('beforeunload', () => {
        this.flushBeacon();
      });
    }
  }

  public setUserId(id: string | number | null) {
    this.userId = id;
  }

  public track(type: 'view' | 'click' | 'completion', tags: string[], mediaType?: any, creatorId?: any) {
    this.eventQueue.push({
      type,
      tags,
      mediaType,
      creatorId,
      timestamp: new Date().toISOString(),
    });
  }

  public async flush() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await fetch('/api/tracking/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          events: eventsToSend,
        }),
      });
    } catch (err) {
      console.error('Tracking batch flush failed:', err);
    }
  }

  private flushBeacon() {
    if (this.eventQueue.length === 0) return;
    const payload = JSON.stringify({
      userId: this.userId,
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
