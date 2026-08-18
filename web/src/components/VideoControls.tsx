'use client';

import React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, RotateCcw } from 'lucide-react';

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
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent pt-10 pb-3 px-3 transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Progress Bar */}
      <div
        className="relative h-1.5 bg-slate-700/60 rounded-full cursor-pointer group mb-3"
        onMouseMove={onTimelineMouseMove}
      >
        {/* Buffered */}
        <div
          className="absolute top-0 left-0 h-full bg-slate-500/40 rounded-full"
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
            className="absolute -top-8 px-2 py-1 bg-slate-900 text-white text-[10px] font-mono rounded-lg border border-slate-700 -translate-x-1/2 pointer-events-none"
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
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Controls Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Play, Volume, Time */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            title={isPlaying ? t?.player?.pause || 'Pause' : t?.player?.play || 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 group/vol">
            <button
              onClick={onToggleMute}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              title={isMuted ? t?.player?.unmute || 'Unmute' : t?.player?.mute || 'Mute'}
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
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-indigo-500"
            />
          </div>

          {/* Time */}
          <span className="text-xs font-mono text-slate-300">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Right: Loop, Quality, Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Loop */}
          <button
            onClick={onToggleLoop}
            className={`p-2 rounded-xl transition-colors ${
              isLooping ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-slate-300'
            }`}
            title={t?.player?.loop || 'Loop'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Quality Settings */}
          {levels.length > 0 && (
            <div className="relative">
              <button
                onClick={onToggleSettings}
                className={`p-2 rounded-xl transition-colors ${
                  isSettingsOpen ? 'bg-indigo-600 text-white' : 'hover:bg-white/10 text-slate-300'
                }`}
                title={t?.player?.quality || 'Qualität'}
              >
                <Settings className="w-4 h-4" />
              </button>
              {isSettingsOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-700 rounded-xl p-2 min-w-[120px] shadow-xl">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    {t?.player?.quality || 'Qualität'}
                  </div>
                  <button
                    onClick={() => onQualityChange(-1)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      currentLevel === -1 ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Auto
                  </button>
                  {levels.map((lvl) => (
                    <button
                      key={lvl.index}
                      onClick={() => onQualityChange(lvl.index)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                        currentLevel === lvl.index ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            title={isFullscreen ? t?.player?.exitFullscreen || 'Vollbild verlassen' : t?.player?.fullscreen || 'Vollbild'}
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
