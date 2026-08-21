'use client';

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

/**
 * Ambient intensity is stored as the alpha of the sampled colour. The slider
 * shows it as a percentage of AMBIENT_MAX, so 100% on screen is whatever
 * AMBIENT_MAX says — turning the effect down means lowering that ceiling, not
 * rescaling anyone's stored preference.
 */
export const AMBIENT_MIN = 0.025;
export const AMBIENT_MAX = 0.5;
export const AMBIENT_DEFAULT = 0.25;

type SettingsPanel = 'root' | 'quality' | 'ambient';

/** A row that flips a setting in place, without leaving the panel. */
function ToggleRow({
  icon,
  label,
  checked,
  onToggle,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="menuitemcheckbox"
      aria-checked={checked}
      className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-surface transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span className="font-semibold text-primary flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
      <span
        className={`w-8 h-[18px] rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
          checked ? `${accent} justify-end` : 'bg-surface border border-subtle justify-start'
        }`}
      >
        <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm block" />
      </span>
    </button>
  );
}

/** A row that opens its own panel, showing the current value the way a phone
 *  settings list does. */
function SubmenuRow({
  icon,
  label,
  value,
  onOpen,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      role="menuitem"
      aria-haspopup="menu"
      className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-surface transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span className="font-semibold text-primary flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
      <span className="flex items-center gap-1 text-muted shrink-0">
        <span className="font-mono text-[10px]">{value}</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

/** Back header of a submenu — the whole strip is the target, not just the arrow. */
function PanelHeader({ label, onBack, backLabel }: { label: string; onBack: () => void; backLabel: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1.5 w-full px-2 py-2 mb-1 border-b border-subtle text-primary hover:bg-surface rounded-t-xl transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      aria-label={backLabel}
    >
      <ChevronLeft className="w-4 h-4 text-muted" />
      <span className="font-bold uppercase tracking-wider text-[10px]">{label}</span>
    </button>
  );
}

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

  /**
   * Which panel of the settings menu is showing. The menu works like a phone
   * settings screen: the root lists the sections, picking one slides its panel
   * in from the right, and a back header returns.
   */
  const [panel, setPanel] = useState<SettingsPanel>('root');
  const [panelDirection, setPanelDirection] = useState<'forward' | 'back'>('forward');
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState<number | undefined>(undefined);

  const openPanel = (next: SettingsPanel) => {
    setPanelDirection(next === 'root' ? 'back' : 'forward');
    setPanel(next);
  };

  // Always reopen on the root panel rather than wherever the last visit ended.
  useEffect(() => {
    if (!isSettingsOpen) {
      setPanel('root');
      setPanelDirection('forward');
      setPanelHeight(undefined);
    }
  }, [isSettingsOpen]);

  // The container animates between panel heights, so it needs a measured value
  // rather than `auto`, which cannot be transitioned.
  useLayoutEffect(() => {
    if (!isSettingsOpen || !panelRef.current) return;
    setPanelHeight(panelRef.current.offsetHeight);
  }, [isSettingsOpen, panel, levels.length, ambientEnabled, isLooping, isVertical, currentLevel, ambientIntensity]);

  // Keyboard accessibility for settings menu (Escape steps back, then closes)
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (panel !== 'root') {
          openPanel('root');
          return;
        }
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
  }, [isSettingsOpen, onToggleSettings, panel]);

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
                aria-label={t?.player?.settings || 'Einstellungen'}
                className="absolute bottom-full right-0 mb-2 bg-surface-raised border border-subtle rounded-2xl shadow-2xl z-50 text-xs animate-scaleIn font-sans select-none overflow-hidden w-[264px] transition-[height] duration-200 ease-out"
                style={panelHeight != null ? { height: panelHeight } : undefined}
              >
                <div ref={panelRef} className={panelDirection === 'forward' ? 'animate-panel-forward' : 'animate-panel-back'}>
                  {panel === 'root' && (
                    <div className="p-2 flex flex-col gap-1">
                      <div className="text-[10px] font-bold text-muted uppercase tracking-wider px-3 py-1 border-b border-subtle">
                        {t?.player?.settings || 'Einstellungen'}
                      </div>

                      <ToggleRow
                        icon={<RotateCcw className="w-3.5 h-3.5 text-indigo-400" />}
                        label={t?.player?.loop || 'Wiederholen (Loop)'}
                        checked={isLooping}
                        onToggle={onToggleLoop}
                        accent="bg-indigo-600"
                      />

                      {onToggleVertical && (
                        <ToggleRow
                          icon={<Flame className="w-3.5 h-3.5 text-amber-400" />}
                          label={
                            isVertical
                              ? t?.player?.standardView || 'Standard-Ansicht'
                              : t?.player?.verticalView || 'Vertikale Ansicht'
                          }
                          checked={Boolean(isVertical)}
                          onToggle={onToggleVertical}
                          accent="bg-amber-600"
                        />
                      )}

                      {onToggleAmbient && (
                        <SubmenuRow
                          icon={<Sparkles className="w-3.5 h-3.5 text-teal-400" />}
                          label={t?.player?.ambientMode || 'Ambient Glow'}
                          value={
                            ambientEnabled
                              ? `${Math.round(((ambientIntensity ?? AMBIENT_DEFAULT) / AMBIENT_MAX) * 100)}%`
                              : t?.player?.off || 'Aus'
                          }
                          onOpen={() => openPanel('ambient')}
                        />
                      )}

                      {levels.length > 0 && (
                        <SubmenuRow
                          icon={<Settings className="w-3.5 h-3.5 text-indigo-400" />}
                          label={t?.player?.quality || 'Qualität'}
                          value={
                            currentLevel === -1
                              ? t?.player?.auto || 'Auto'
                              : levels.find((l) => l.index === currentLevel)?.label || 'Auto'
                          }
                          onOpen={() => openPanel('quality')}
                        />
                      )}
                    </div>
                  )}

                  {panel === 'quality' && (
                    <div className="p-2 flex flex-col gap-0.5">
                      <PanelHeader label={t?.player?.quality || 'Qualität'} onBack={() => openPanel('root')} backLabel={t?.player?.back || 'Zurück'} />
                      <button
                        type="button"
                        onClick={() => onQualityChange(-1)}
                        role="menuitemradio"
                        aria-checked={currentLevel === -1}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
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
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                            currentLevel === lvl.index ? 'bg-indigo-600 text-white font-bold' : 'text-muted hover:text-primary hover:bg-surface'
                          }`}
                        >
                          <span>{lvl.label}</span>
                          {currentLevel === lvl.index && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {panel === 'ambient' && onToggleAmbient && (
                    <div className="p-2 flex flex-col gap-1">
                      <PanelHeader label={t?.player?.ambientMode || 'Ambient Glow'} onBack={() => openPanel('root')} backLabel={t?.player?.back || 'Zurück'} />
                      <ToggleRow
                        icon={<Sparkles className="w-3.5 h-3.5 text-teal-400" />}
                        label={t?.player?.ambientEnabled || 'Aktiviert'}
                        checked={Boolean(ambientEnabled)}
                        onToggle={onToggleAmbient}
                        accent="bg-teal-600"
                      />
                      {ambientEnabled && onAmbientIntensityChange && (
                        <div className="flex flex-col gap-2 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted font-mono uppercase tracking-wider">
                              {t?.player?.ambientIntensity || 'Stärke'}
                            </span>
                            <span className="text-[10px] font-mono text-teal-400 font-bold">
                              {Math.round(((ambientIntensity ?? AMBIENT_DEFAULT) / AMBIENT_MAX) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={AMBIENT_MIN}
                            max={AMBIENT_MAX}
                            step={0.025}
                            value={ambientIntensity ?? AMBIENT_DEFAULT}
                            onChange={(e) => onAmbientIntensityChange(parseFloat(e.target.value))}
                            aria-label={t?.player?.ambientIntensity || 'Leuchtstärke'}
                            className="w-full h-1 bg-surface rounded accent-teal-400 cursor-pointer"
                          />
                        </div>
                      )}
                      <p className="px-3 pb-1 text-[10px] leading-snug text-muted">
                        {t?.player?.ambientHint || 'Wird nur im dunklen Design angezeigt.'}
                      </p>
                    </div>
                  )}
                </div>
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
