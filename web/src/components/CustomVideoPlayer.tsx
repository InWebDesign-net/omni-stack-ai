'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Check, RotateCcw, Link2, Sparkles, Shield
} from 'lucide-react';
import Hls from 'hls.js';
import { useApp } from '@/context/AppContext';

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
    video.play().catch(() => {});
    setIsPlaying(true);
  }, []);

  // Video Ended Handler
  const handleVideoEnded = useCallback(() => {
    if (isLooping) {
      const video = videoRef.current;
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
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
      video.play().catch(() => {});
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
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
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
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-20 flex flex-col justify-between p-3 sm:p-6 pb-20 select-none animate-fadeIn">
          {/* Top Bar with Title and Replay Button */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 sm:pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                {currentUser
                  ? (t.player?.recommendedForYou || 'Empfohlene Videos für dich')
                  : (t.player?.discoverMore || 'Weitere Empfehlungen entdecken')}
              </span>
            </div>

            {/* Replay Button */}
            <button
              type="button"
              onClick={handleReplay}
              className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
              title={t.player?.replay || 'Erneut abspielen'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.player?.replay || 'Erneut abspielen'}</span>
            </button>
          </div>

          {/* Mobile Layout: 1 Featured Horizontal Recommendation Card */}
          <div className="block sm:hidden my-auto py-1">
            {recommendationsList.slice(0, 1).map((rec: any) => {
              const creator = rec.creator || rec.author;
              const creatorName = creator?.username || creator?.handle || rec.authorName || 'Omni Creator';
              const creatorAvatar = creator?.avatarUrl || rec.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';

              return (
                <a
                  key={rec.slug || rec.id}
                  href={`/video/${rec.slug}`}
                  onClick={() => setHasEnded(false)}
                  className="group relative bg-[#0d1528]/95 border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl overflow-hidden p-2 flex items-center gap-2.5 shadow-xl transition-all"
                >
                  <div className="relative w-28 aspect-video bg-slate-950 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={rec.thumbnailUrl || '/media/thumbnails/default.png'}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow">
                        <Play className="w-3 h-3 fill-white ml-0.5" />
                      </div>
                    </div>
                    {Boolean(rec.duration && rec.duration > 0) && (
                      <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-slate-950/80 text-[8px] font-mono text-slate-200">
                        {formatTime(rec.duration)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 font-mono">Nächstes Video</span>
                    <h4 className="font-semibold text-xs text-white line-clamp-2 leading-tight group-hover:text-indigo-300 transition-colors">
                      {rec.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <img
                        src={creatorAvatar}
                        alt={creatorName}
                        className="w-3.5 h-3.5 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <span className="truncate font-medium">{creatorName}</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Desktop & Tablet Layout: 3 Vertical Recommendation Cards Grid */}
          <div className="hidden sm:grid sm:grid-cols-3 gap-3 md:gap-4 my-auto py-2">
            {recommendationsList.slice(0, 3).map((rec: any) => {
              const creator = rec.creator || rec.author;
              const creatorName = creator?.username || creator?.handle || rec.authorName || 'Omni Creator';
              const creatorAvatar = creator?.avatarUrl || rec.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80';

              return (
                <a
                  key={rec.slug || rec.id}
                  href={`/video/${rec.slug}`}
                  onClick={() => setHasEnded(false)}
                  className="group relative bg-[#0d1528] border border-slate-800 hover:border-indigo-500/50 rounded-xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex flex-col justify-between"
                >
                  <div className="relative aspect-video w-full bg-slate-950 overflow-hidden block">
                    <img
                      src={rec.thumbnailUrl || '/media/thumbnails/default.png'}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </div>
                    {Boolean(rec.duration && rec.duration > 0) && (
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-mono text-slate-200 border border-slate-800">
                        {formatTime(rec.duration)}
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 space-y-1">
                    <h4 className="font-semibold text-xs text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                      {rec.title}
                    </h4>
                    <div className="flex items-center gap-1.5 pt-0.5 text-[10px] text-slate-400">
                      <img
                        src={creatorAvatar}
                        alt={creatorName}
                        className="w-3.5 h-3.5 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                      <span className="truncate font-medium">{creatorName}</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Center Play/Pause Animated Splash Indicator */}
      {centerAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl animate-ping">
            {centerAnimation === 'play' ? <Play className="w-8 h-8 fill-white ml-1" /> : <Pause className="w-8 h-8 fill-white" />}
          </div>
        </div>
      )}

      {/* Copy Toast Notification */}
      {copyToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/90 border border-indigo-500/40 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{t.player?.linkCopied || 'Videolink mit Zeitstempel kopiert!'}</span>
        </div>
      )}

      {/* Custom Right-Click YouTube-Style Context Menu */}
      {contextMenu && (
        <div
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="absolute z-50 bg-[#0b0f19]/95 border border-slate-800 rounded-2xl p-2 w-64 shadow-2xl backdrop-blur-xl text-xs text-slate-200 divide-y divide-slate-800/60"
        >
          {/* Header Branding */}
          <div className="px-3 py-2 space-y-0.5">
            <div className="font-bold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <span>© 2026 Omni by InWebDesign.net</span>
            </div>
            <p className="text-[10px] text-slate-400">Plattform-Preview & HLS Video Engine</p>
          </div>

          {/* Action Items */}
          <div className="py-1">
            <button
              onClick={copyTimestampLink}
              className="w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-300 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{copyLabel}</span>
            </button>
            <button
              onClick={() => {
                const nextLooping = !isLooping;
                setIsLooping(nextLooping);
                if (nextLooping) setHasEnded(false);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left hover:bg-indigo-600/20 hover:text-indigo-300 rounded-xl flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
                <span>{t.player?.loop || 'Wiederholen (Schleife)'}</span>
              </div>
              {isLooping && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar Overlay */}
      <div
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 transition-opacity duration-300 z-30 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrub Bar / Timeline Progress */}
        <div
          className="relative w-full h-3 mb-3 cursor-pointer flex items-center group/timeline"
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Hover Tooltip */}
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPosition}px` }}
              className="absolute -top-8 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[10px] font-mono px-2 py-0.5 rounded-lg shadow-md pointer-events-none"
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Background Track */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative group-hover/timeline:h-2.5 transition-all">
            {/* Buffer Track */}
            <div
              style={{ width: `${(buffered / (duration || 1)) * 100}%` }}
              className="absolute top-0 bottom-0 left-0 bg-slate-600/60 transition-all"
            />
            {/* Progress Track */}
            <div
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-indigo-500 to-teal-400 rounded-full"
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:opacity-100 focus-visible:bg-slate-800/50"
            aria-label={(t.player as any)?.seek || 'Spulen'}
          />
        </div>

        {/* Controls Buttons Row */}
        <div className="flex items-center justify-between text-slate-200">
          {/* Left Controls (Play, Volume, Time) */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 hover:bg-slate-800/80 rounded-xl text-white transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title={isPlaying ? (t.player?.pause || 'Pause') : (t.player?.play || 'Abspielen')}
              aria-label={isPlaying ? (t.player?.pause || 'Pause') : (t.player?.play || 'Abspielen')}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1 group/vol">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-slate-800/80 rounded-xl text-slate-300 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                title={isMuted ? (t.player?.unmute || 'Ton einschalten') : (t.player?.mute || 'Stummschalten')}
                aria-label={isMuted ? (t.player?.unmute || 'Ton einschalten') : (t.player?.mute || 'Stummschalten')}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/vol:w-20 transition-all duration-300 accent-indigo-500 cursor-pointer h-1 bg-slate-800 rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={(t.player as any)?.volume || 'Lautstärke'}
              />
            </div>

            {/* Time Display */}
            <div className="text-xs font-mono text-slate-400 tracking-tight">
              <span className="text-white">{formatTime(currentTime)}</span> / {formatTime(duration)}
            </div>
          </div>

          {/* Right Controls (Quality Selector & Fullscreen) */}
          <div className="flex items-center gap-2 relative">
            {/* HLS Resolution / Settings Dropdown */}
            {levels.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                  className={`p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    isSettingsOpen ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                  title={t.player?.quality || 'Qualität / Auflösung'}
                  aria-label={t.player?.quality || 'Qualität / Auflösung'}
                  aria-expanded={isSettingsOpen}
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-[11px] font-mono">
                    {currentLevel === -1 ? (t.player?.autoRecommended?.split(' ')[0] || 'Auto') : levels[currentLevel]?.label}
                  </span>
                </button>

                {/* Quality Popover */}
                {isSettingsOpen && (
                  <div className="absolute bottom-12 right-0 bg-[#0b0f19]/95 border border-slate-800 rounded-2xl p-2 w-44 shadow-2xl backdrop-blur-xl text-xs space-y-1 z-50">
                    <div className="px-2 py-1 text-[10px] font-mono text-slate-400 border-b border-slate-800">
                      {t.player?.selectQuality || 'Qualität wählen'}
                    </div>
                    <button
                      onClick={() => handleQualityChange(-1)}
                      className={`w-full px-2.5 py-1.5 text-left rounded-xl flex items-center justify-between transition-colors ${
                        currentLevel === -1 ? 'bg-indigo-600/20 text-indigo-300 font-bold' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span>{t.player?.autoRecommended || 'Auto (Empfohlen)'}</span>
                      {currentLevel === -1 && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                    {levels.map((lvl) => (
                      <button
                        key={lvl.index}
                        onClick={() => handleQualityChange(lvl.index)}
                        className={`w-full px-2.5 py-1.5 text-left rounded-xl flex items-center justify-between transition-colors ${
                          currentLevel === lvl.index ? 'bg-indigo-600/20 text-indigo-300 font-bold' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{lvl.label}</span>
                        {currentLevel === lvl.index && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-slate-800/80 rounded-xl text-slate-300 hover:text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title={isFullscreen ? (t.player?.exitFullscreen || 'Vollbild beenden') : (t.player?.fullscreen || 'Vollbild')}
              aria-label={isFullscreen ? (t.player?.exitFullscreen || 'Vollbild beenden') : (t.player?.fullscreen || 'Vollbild')}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
