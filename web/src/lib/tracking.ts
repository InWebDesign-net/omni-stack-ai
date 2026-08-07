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

  private getJwt(): string | null {
    try {
      const savedUser = localStorage.getItem('omni_user');
      if (!savedUser) return null;
      return JSON.parse(savedUser)?.jwt || null;
    } catch {
      return null;
    }
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
        body: JSON.stringify({ events: eventsToSend }),
      });
    } catch (err) {
      console.error('Tracking batch flush failed:', err);
    }
  }

  private flushBeacon() {
    if (this.eventQueue.length === 0) return;
    // sendBeacon can't set headers — the proxy route lifts jwt into Authorization
    const payload = JSON.stringify({
      jwt: this.getJwt(),
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
