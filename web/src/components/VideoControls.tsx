'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  Sparkles,
  Flame,
  Check,
} from 'lucide-react';

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isLooping: boolean;
  levels: { index: number; label: string }[];
  currentLevel: number;
  isSettingsOpen: boolean;
  showControls: boolean;
  hoverTime: number | null;
  hoverPosition: number;
  // Ambient Mode props
  ambientEnabled?: boolean;
  ambientIntensity?: number;
  onToggleAmbient?: () => void;
  onAmbientIntensityChange?: (val: number) => void;
  // Vertical View props
  isVertical?: boolean;
  onToggleVertical?: () => void;
  // Event handlers
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTimelineMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleFullscreen: () => void;
  onToggleLoop: () => void;
  onToggleSettings: () => void;
  onQualityChange: (level: number) => void;
  formatTime: (secs: number) => string;
  t?: any;
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  buffered,
  volume,
  isMuted,
  isFullscreen,
  isLooping,
  levels,
  currentLevel,
  isSettingsOpen,
  showControls,
  hoverTime,
  hoverPosition,
  ambientEnabled,
  ambientIntensity,
  onToggleAmbient,
  onAmbientIntensityChange,
  isVertical,
  onToggleVertical,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onSeek,
  onTimelineMouseMove,
  onToggleFullscreen,
  onToggleLoop,
  onToggleSettings,
  onQualityChange,
  formatTime,
  t,
}: VideoControlsProps) {
  const gearBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Time remaining toggle with localStorage persistence
  const [showRemaining, setShowRemaining] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omni_time_display_remaining') === 'true';
    }
    return false;
  });

  const toggleTimeDisplay = () => {
    setShowRemaining((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('omni_time_display_remaining', String(next));
      }
      return next;
    });
  };

  // Keyboard accessibility for settings menu (Escape closes and returns focus)
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onToggleSettings();
        gearBtnRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        gearBtnRef.current &&
        !gearBtnRef.current.contains(e.target as Node)
      ) {
        onToggleSettings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen, onToggleSettings]);

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-10 pb-3 px-3 transition-opacity duration-300 ${
        showControls || isSettingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Progress Bar */}
      <div
        className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group mb-3"
        onMouseMove={onTimelineMouseMove}
      >
        {/* Buffered */}
        <div
          className="absolute top-0 left-0 h-full bg-white/40 rounded-full"
          style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }}
        />
        {/* Progress */}
        <div
          className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full"
          style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
        />
        {/* Hover Tooltip */}
        {hoverTime !== null && (
          <div
            className="absolute -top-8 px-2 py-1 bg-surface-raised text-primary text-[10px] font-mono rounded-lg border border-subtle -translate-x-1/2 pointer-events-none shadow-lg"
            style={{ left: `${hoverPosition}px` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
        {/* Seek Input */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={onSeek}
          aria-label={t?.player?.seek || 'Video-Position'}
          className="absolute inset-0 w-full opacity-0 cursor-pointer focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Play, Volume, Time */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title={isPlaying ? t?.player?.pause || 'Pause' : t?.player?.play || 'Play'}
            aria-label={isPlaying ? t?.player?.pause || 'Pause' : t?.player?.play || 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
          </button>

          {/* Volume with fix for collapsed thumb bleeding */}
          <div className="flex items-center gap-1 group/vol">
            <button
              onClick={onToggleMute}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title={isMuted ? t?.player?.unmute || 'Unmute' : t?.player?.mute || 'Mute'}
              aria-label={isMuted ? t?.player?.unmute || 'Unmute' : t?.player?.mute || 'Mute'}
              aria-pressed={isMuted}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={onVolumeChange}
              aria-label={t?.player?.volume || 'Lautstärke'}
              className="w-0 opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 focus-visible:w-20 focus-visible:opacity-100 transition-all duration-200 accent-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Time Display Button (Toggles elapsed ↔ remaining) */}
          <button
            type="button"
            onClick={toggleTimeDisplay}
            title={
              showRemaining
                ? t?.player?.showElapsedTime || 'Abgelaufene Zeit anzeigen'
                : t?.player?.showRemainingTime || 'Verbleibende Zeit anzeigen'
            }
            aria-label={
              showRemaining
                ? t?.player?.showElapsedTime || 'Abgelaufene Zeit anzeigen'
                : t?.player?.showRemainingTime || 'Verbleibende Zeit anzeigen'
            }
            className="text-xs font-mono text-white/90 hover:text-white transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded px-1.5 py-0.5 min-w-[72px] text-left tabular-nums cursor-pointer"
          >
            {showRemaining
              ? `-${formatTime(Math.max(0, (duration || 0) - (currentTime || 0)))} / ${formatTime(duration || 0)}`
              : `${formatTime(currentTime || 0)} / ${formatTime(duration || 0)}`}
          </button>
        </div>

        {/* Right: Settings Menu, Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Settings Menu Gear (Always available) */}
          <div className="relative">
            <button
              ref={gearBtnRef}
              onClick={onToggleSettings}
              className={`p-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isSettingsOpen ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-white/80'
              }`}
              title={t?.player?.settings || 'Einstellungen'}
              aria-label={t?.player?.settings || 'Einstellungen'}
              aria-expanded={isSettingsOpen}
              aria-haspopup="menu"
            >
              <Settings className="w-4 h-4" />
            </button>

            {isSettingsOpen && (
              <div
                ref={menuRef}
                role="menu"
                className="absolute bottom-full right-0 mb-2 bg-surface-raised border border-subtle rounded-2xl p-2 min-w-[220px] shadow-2xl z-50 flex flex-col gap-1 text-xs animate-scaleIn font-sans select-none"
              >
                {/* Header */}
                <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-3 py-1 border-b border-subtle">
                  {t?.player?.settings || 'Einstellungen'}
                </div>

                {/* Section: Loop Toggle */}
                <button
                  type="button"
                  onClick={onToggleLoop}
                  role="menuitemcheckbox"
                  aria-checked={isLooping}
                  className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-surface transition-colors cursor-pointer text-left"
                >
                  <span className="font-semibold text-primary flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t?.player?.loop || 'Wiederholen (Loop)'}</span>
                  </span>
                  <span
                    className={`w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5 ${
                      isLooping ? 'bg-indigo-600 justify-end' : 'bg-surface border border-subtle justify-start'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm block" />
                  </span>
                </button>

                {/* Section: Vertical View Toggle (if handler provided) */}
                {onToggleVertical && (
                  <button
                    type="button"
                    onClick={onToggleVertical}
                    role="menuitemcheckbox"
                    aria-checked={isVertical}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-surface transition-colors cursor-pointer text-left"
                  >
                    <span className="font-semibold text-primary flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isVertical ? t?.player?.standardView || 'Standard-Ansicht' : t?.player?.verticalView || 'Vertikale Ansicht'}</span>
                    </span>
                    <span
                      className={`w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5 ${
                        isVertical ? 'bg-amber-600 justify-end' : 'bg-surface border border-subtle justify-start'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm block" />
                    </span>
                  </button>
                )}

                {/* Section: Ambient Mode (if handler provided) */}
                {onToggleAmbient && (
                  <div className="flex flex-col gap-1.5 px-3 py-2 rounded-xl hover:bg-surface transition-colors">
                    <div
                      role="menuitemcheckbox"
                      aria-checked={ambientEnabled}
                      onClick={onToggleAmbient}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-semibold text-primary flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        <span>{t?.player?.ambientMode || 'Ambient Glow'}</span>
                      </span>
                      <span
                        className={`w-8 h-4.5 rounded-full transition-colors flex items-center p-0.5 ${
                          ambientEnabled ? 'bg-teal-600 justify-end' : 'bg-surface border border-subtle justify-start'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm block" />
                      </span>
                    </div>

                    {ambientEnabled && onAmbientIntensityChange && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-subtle/50">
                        <span className="text-[10px] text-muted font-mono">{t?.player?.ambientIntensity || 'Stärke'}:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0.05}
                            max={0.5}
                            step={0.05}
                            value={ambientIntensity ?? 0.2}
                            onChange={(e) => onAmbientIntensityChange(parseFloat(e.target.value))}
                            aria-label={t?.player?.ambientIntensity || 'Leuchtstärke'}
                            className="w-20 h-1 bg-surface-raised rounded accent-teal-400 cursor-pointer"
                          />
                          <span className="text-[10px] font-mono text-teal-400 font-bold w-7 text-right">
                            {Math.round(((ambientIntensity ?? 0.2) / 0.5) * 100)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Section: Quality / Resolution (only when levels exist) */}
                {levels.length > 0 && (
                  <div className="pt-2 mt-1 border-t border-subtle flex flex-col gap-0.5">
                    <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-3 py-1">
                      {t?.player?.quality || 'Qualität'}
                    </div>
                    <button
                      type="button"
                      onClick={() => onQualityChange(-1)}
                      role="menuitemradio"
                      aria-checked={currentLevel === -1}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        currentLevel === -1 ? 'bg-indigo-600 text-white font-bold' : 'text-muted hover:text-primary hover:bg-surface'
                      }`}
                    >
                      <span>{t?.player?.autoRecommended || 'Auto (Empfohlen)'}</span>
                      {currentLevel === -1 && <Check className="w-3.5 h-3.5" />}
                    </button>
                    {levels.map((lvl) => (
                      <button
                        key={lvl.index}
                        type="button"
                        onClick={() => onQualityChange(lvl.index)}
                        role="menuitemradio"
                        aria-checked={currentLevel === lvl.index}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          currentLevel === lvl.index ? 'bg-indigo-600 text-white font-bold' : 'text-muted hover:text-primary hover:bg-surface'
                        }`}
                      >
                        <span>{lvl.label}</span>
                        {currentLevel === lvl.index && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            title={isFullscreen ? t?.player?.exitFullscreen || 'Vollbild verlassen' : t?.player?.fullscreen || 'Vollbild'}
            aria-label={isFullscreen ? t?.player?.exitFullscreen || 'Vollbild verlassen' : t?.player?.fullscreen || 'Vollbild'}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5 text-white" />
            ) : (
              <Maximize className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
