'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Link2, Sparkles, Shield } from 'lucide-react';
import Hls from 'hls.js';
import { useApp } from '@/context/AppContext';
import { VideoControls } from './VideoControls';
import { EndOverlay } from './EndOverlay';

interface CustomVideoPlayerProps {
  mp4Url?: string;
  hlsUrl?: string;
  posterUrl?: string;
  title?: string;
  slug?: string;
  recommendations?: any[];
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement, Event>) => void;
  className?: string;
}

export default function CustomVideoPlayer({
  mp4Url,
  hlsUrl,
  posterUrl,
  title = 'Video',
  slug,
  recommendations,
  onTimeUpdate,
  className = 'w-full h-full',
}: CustomVideoPlayerProps) {
  const { t, currentUser } = useApp();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  // HLS Quality state
  const [levels, setLevels] = useState<{ index: number; label: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (hlsUrl && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const parsedLevels = data.levels.map((lvl, idx) => ({
          index: idx,
          label: lvl.height ? `${lvl.height}p` : `Level ${idx + 1}`,
        }));
        setLevels(parsedLevels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        if (hls && hls.currentLevel === -1) {
          setCurrentLevel(-1);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && hlsUrl) {
      video.src = hlsUrl;
    } else if (mp4Url) {
      video.src = mp4Url;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [hlsUrl, mp4Url]);

  // Handle HLS Quality Change
  const handleQualityChange = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    setIsSettingsOpen(false);
    if (videoRef.current && (videoRef.current as any).hls) {
      (videoRef.current as any).hls.currentLevel = levelIndex;
    }
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
        const url = currentUser ? '/api/feed/personalized?pageSize=6' : '/api/video/list?pageSize=6';
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
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
        setIsSettingsOpen(false);
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
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onContextMenu={handleContextMenu}
      className={`relative group bg-slate-950 rounded-2xl overflow-hidden select-none font-sans border border-slate-800 ${className}`}
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

      {/* End-of-Video Recommendation Overlay (YouTube Style) */}
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
          <div className="w-16 h-16 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl animate-ping">
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
        onTogglePlay={togglePlay}
        onToggleMute={toggleMute}
        onVolumeChange={handleVolumeChange}
        onSeek={handleSeek}
        onTimelineMouseMove={handleTimelineMouseMove}
        onToggleFullscreen={toggleFullscreen}
        onToggleLoop={() => setIsLooping(!isLooping)}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        onQualityChange={handleQualityChange}
        formatTime={formatTime}
        t={t}
      />

      {/* Custom Context Menu (Right-Click) */}
      {contextMenu && (
        <div
          className="absolute z-30 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-xl min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={copyTimestampLink}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{copyLabel}</span>
          </button>
          <div className="border-t border-slate-800 my-1" />
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-slate-500">
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
  );
}
