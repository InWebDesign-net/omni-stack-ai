'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Link2, Sparkles, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { VideoControls, AMBIENT_MIN, AMBIENT_MAX, AMBIENT_DEFAULT } from './VideoControls';
import { EndOverlay } from './EndOverlay';
import { useHlsSource } from '@/lib/hooks/useHlsSource';

interface CustomVideoPlayerProps {
  mp4Url?: string;
  hlsUrl?: string;
  posterUrl?: string;
  title?: string;
  slug?: string;
  isVertical?: boolean;
  onToggleVertical?: () => void;
  recommendations?: any[];
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  className?: string;
  /**
   * Start playing as soon as the player mounts. Used where the player replaces
   * a poster the reader just clicked — the click is the gesture the browser
   * requires, so this does not need muting to be allowed.
   */
  autoPlay?: boolean;
}

export default function CustomVideoPlayer({
  mp4Url,
  hlsUrl,
  posterUrl,
  title = 'Video',
  slug,
  isVertical = false,
  onToggleVertical,
  recommendations,
  onTimeUpdate,
  className = 'w-full h-full',
  autoPlay = false,
}: CustomVideoPlayerProps) {
  const { t, currentUser } = useApp();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // End-of-video & Recommendation Overlay state
  const [hasEnded, setHasEnded] = useState(false);
  const [recommendationsList, setRecommendationsList] = useState<any[]>(recommendations || []);

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [centerAnimation, setCenterAnimation] = useState<'play' | 'pause' | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [copyToast, setCopyToast] = useState(false);

  // Ambient Mode state
  const [ambientColor, setAmbientColor] = useState('rgba(0, 0, 0, 0.2)');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [ambientSettings, setAmbientSettings] = useState<{ enabled: boolean; intensity: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('omni_ambient_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            enabled: parsed.enabled !== false,
            // Clamped: the ceiling came down from 1.0 to AMBIENT_MAX, and a
            // value stored under the old scale would otherwise sit past the
            // end of the slider — visible, but unreachable by dragging.
            intensity:
              typeof parsed.intensity === 'number'
                ? Math.min(Math.max(parsed.intensity, AMBIENT_MIN), AMBIENT_MAX)
                : AMBIENT_DEFAULT,
          };
        }
      } catch (e) {}
    }
    return { enabled: true, intensity: AMBIENT_DEFAULT };
  });

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize HLS.js through extracted hook
  const { levels, currentLevel, changeLevel } = useHlsSource(videoRef, {
    hlsUrl,
    mp4Url,
  });

  useEffect(() => {
    if (!autoPlay) return;
    const video = videoRef.current;
    if (!video) return;
    // The source may still be attaching, so try now and again once it is ready.
    const attempt = () => video.play().catch(() => {});
    attempt();
    video.addEventListener('loadeddata', attempt, { once: true });
    return () => video.removeEventListener('loadeddata', attempt);
  }, [autoPlay, hlsUrl, mp4Url]);

  // Track resolved theme (dark mode check for ambient glow)
  useEffect(() => {
    const checkTheme = () => {
      if (typeof window === 'undefined') return;
      const htmlTheme = document.documentElement.getAttribute('data-theme');
      const isDarkClass = document.documentElement.classList.contains('dark');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved = htmlTheme === 'dark' || isDarkClass || (htmlTheme !== 'light' && systemDark);
      setIsDarkTheme(resolved);
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  // Ambient Mode sampling interval (200ms)
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isPlaying || !ambientSettings.enabled || !isDarkTheme) return;

    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let isDocumentVisible = typeof document !== 'undefined' ? !document.hidden : true;
    const handleVisibilityChange = () => {
      isDocumentVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (!isDocumentVisible || video.paused || video.ended) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      try {
        canvas.width = 32;
        canvas.height = 32;
        ctx.drawImage(video, 0, 0, 32, 32);
        const frame = ctx.getImageData(0, 0, 32, 32);
        const data = frame.data;
        let r = 0, g = 0, b = 0;
        const length = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        const avgR = Math.floor(r / length);
        const avgG = Math.floor(g / length);
        const avgB = Math.floor(b / length);
        setAmbientColor(`rgba(${avgR}, ${avgG}, ${avgB}, ${ambientSettings.intensity})`);
      } catch (err) {
        // Tainted canvas fallback
      }
    }, 200);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, ambientSettings.enabled, ambientSettings.intensity, isDarkTheme]);

  const toggleAmbient = useCallback(() => {
    setAmbientSettings((prev) => {
      const next = { ...prev, enabled: !prev.enabled };
      if (typeof window !== 'undefined') {
        localStorage.setItem('omni_ambient_settings', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const changeAmbientIntensity = useCallback((val: number) => {
    setAmbientSettings((prev) => {
      const next = { ...prev, intensity: val };
      if (typeof window !== 'undefined') {
        localStorage.setItem('omni_ambient_settings', JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Handle HLS Quality Change
  const handleQualityChange = (levelIndex: number) => {
    changeLevel(levelIndex);
    setIsSettingsOpen(false);
  };

  // Time & Progress Handler
  const handleTimeUpdateInternal = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    setDuration(video.duration || 0);

    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }

    if (onTimeUpdate) {
      onTimeUpdate(e);
    }
  };

  // Replay Video from start
  const handleReplay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setHasEnded(false);
    video.play().catch((e) => { console.error('Video API failed:', e); });
    setIsPlaying(true);
  }, []);

  // Video Ended Handler
  const handleVideoEnded = useCallback(() => {
    if (isLooping) {
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch((e) => { console.error('Video API failed:', e); });
      }
      return;
    }
    setIsPlaying(false);
    setHasEnded(true);
    setShowControls(true);
  }, [isLooping]);

  // Fetch fallback recommendations if not passed in props
  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      setRecommendationsList(recommendations);
      return;
    }

    let isMounted = true;
    async function fetchRecommendations() {
      try {
        const url = currentUser ? '/api/feed/personalized?pageSize=6' : '/api/content/video/list?pageSize=6';
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          const items = (json.data || json.videos || json.items || []).filter((v: any) => v.slug !== slug);
          if (isMounted) {
            setRecommendationsList(items.length > 0 ? items : (json.data || []));
          }
        }
      } catch (err) {
        console.error('Failed to fetch player recommendations', err);
      }
    }

    fetchRecommendations();
    return () => {
      isMounted = false;
    };
  }, [recommendations, slug, currentUser]);

  // Play / Pause Toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hasEnded) {
      handleReplay();
      return;
    }

    if (video.paused) {
      video.play().catch((e) => { console.error('Video API failed:', e); });
      setIsPlaying(true);
      setCenterAnimation('play');
    } else {
      video.pause();
      setIsPlaying(false);
      setCenterAnimation('pause');
    }

    setTimeout(() => setCenterAnimation(null), 600);
  }, [hasEnded, handleReplay]);

  // Mute Toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Volume Change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  // Seek Progress
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const target = parseFloat(e.target.value);
    video.currentTime = target;
    setCurrentTime(target);
    if (hasEnded && target < duration) {
      setHasEnded(false);
    }
  };

  // Timeline Mouse Hover Tooltip
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    setHoverPosition(e.clientX - rect.left);
    setHoverTime(Math.max(0, Math.min(duration, time)));
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((e) => { console.error('Video API failed:', e); });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((e) => { console.error('Video API failed:', e); });
      setIsFullscreen(false);
    }
  };

  // Auto-hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying && !isSettingsOpen) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Custom Context Menu (Right-Click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Close Context Menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Copy Video Link at Current Time
  const copyTimestampLink = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('t', Math.floor(currentTime).toString());
    navigator.clipboard.writeText(url.toString());
    setContextMenu(null);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'ArrowRight') {
        if (videoRef.current) videoRef.current.currentTime += 5;
      } else if (e.code === 'ArrowLeft') {
        if (videoRef.current) videoRef.current.currentTime -= 5;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const copyLabel = (t.player?.copyTimestampLink || 'Link an aktueller Stelle kopieren ({time})').replace('{time}', formatTime(currentTime));

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/*
        Ambient glow. Deliberately NOT on a negative z-index: `<body>` carries an
        opaque `bg-canvas`, and in the root stacking context negative-z-index
        descendants are painted before a block-level descendant's background —
        so `-z-10` put the glow behind the page background, where it was
        invisible. It sits at the default level instead and the video box above
        it carries `z-10`.
      */}
      {isDarkTheme && (
        <div
          aria-hidden="true"
          className="absolute -inset-8 sm:-inset-16 blur-[60px] sm:blur-[100px] transition-[background,opacity] duration-700 ease-out pointer-events-none rounded-3xl"
          style={{
            // The gradient stays put whether or not the video is playing, and
            // only the opacity moves. Swapping `background` to `transparent` on
            // pause looked like a hard cut, because a gradient cannot be
            // interpolated towards a keyword — it snapped while the opacity was
            // still politely fading. The sampling loop stops on pause, so this
            // fades out from the last colour it saw.
            //
            // Wider colour plateau and a later fade than the original: the glow
            // used to go transparent at 70% of a box only 32px larger than the
            // video, then get spread thin by a 120px blur, so even full
            // intensity barely registered.
            background: `radial-gradient(circle, ${ambientColor} 0%, ${ambientColor} 45%, transparent 80%)`,
            // Switching the setting off unmounted the layer, which was the same
            // hard cut in a different disguise. It stays mounted and fades; the
            // sampling loop already does nothing while disabled, so an
            // invisible div is all that remains.
            opacity: isPlaying && ambientSettings.enabled ? 1 : 0,
          }}
        />
      )}

      {/* Hidden 32x32 canvas for sampling */}
      <canvas ref={canvasRef} width={32} height={32} className="hidden" aria-hidden="true" />

      {/* Main Video Box */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && !isSettingsOpen && setShowControls(false)}
        onContextMenu={handleContextMenu}
        className={`relative z-10 w-full h-full group bg-black rounded-2xl overflow-hidden select-none font-sans border border-subtle ${className}`}
      >
        {/* HTML5 Video Element */}
        <video
          ref={videoRef}
          poster={posterUrl}
          playsInline
          loop={isLooping}
          onTimeUpdate={handleTimeUpdateInternal}
          onPlay={() => {
            setIsPlaying(true);
            setHasEnded(false);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={handleVideoEnded}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />

        {/* End-of-Video Recommendation Overlay */}
        {hasEnded && !isLooping && (
          <EndOverlay
            recommendations={recommendationsList}
            currentUser={currentUser}
            onReplay={handleReplay}
            onSelectRecommendation={() => {}}
            formatTime={formatTime}
            t={t}
          />
        )}

        {/* Center Play/Pause Animated Splash Indicator */}
        {centerAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl animate-ping">
              {centerAnimation === 'play' ? <Play className="w-8 h-8 fill-white ml-1" /> : <Pause className="w-8 h-8 fill-white" />}
            </div>
          </div>
        )}

        {/* Controls Bar */}
        <VideoControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          volume={volume}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          isLooping={isLooping}
          levels={levels}
          currentLevel={currentLevel}
          isSettingsOpen={isSettingsOpen}
          showControls={showControls}
          hoverTime={hoverTime}
          hoverPosition={hoverPosition}
          ambientEnabled={ambientSettings.enabled}
          ambientIntensity={ambientSettings.intensity}
          onToggleAmbient={toggleAmbient}
          onAmbientIntensityChange={changeAmbientIntensity}
          isVertical={isVertical}
          onToggleVertical={onToggleVertical}
          onTogglePlay={togglePlay}
          onToggleMute={toggleMute}
          onVolumeChange={handleVolumeChange}
          onSeek={handleSeek}
          onTimelineMouseMove={handleTimelineMouseMove}
          onToggleFullscreen={toggleFullscreen}
          onToggleLoop={() => setIsLooping(!isLooping)}
          onToggleSettings={() => {
            setShowControls(true);
            setIsSettingsOpen(!isSettingsOpen);
          }}
          onQualityChange={handleQualityChange}
          formatTime={formatTime}
          t={t}
        />

        {/* Custom Context Menu (Right-Click) */}
        {contextMenu && (
          <div
            className="absolute z-30 bg-surface-raised border border-subtle rounded-xl p-2 shadow-xl min-w-[200px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={copyTimestampLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-surface rounded-lg transition-colors cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{copyLabel}</span>
            </button>
            <div className="border-t border-subtle my-1" />
            <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-muted">
              <Shield className="w-3 h-3" />
              <span>Omni Player v2.0</span>
            </div>
          </div>
        )}

        {/* Copy Toast */}
        {copyToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-xl animate-fadeIn flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            {t.player?.linkCopied || 'Link kopiert!'}
          </div>
        )}
      </div>
    </div>
  );
}
