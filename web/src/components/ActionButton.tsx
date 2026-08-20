'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Upload, RotateCcw } from 'lucide-react';

interface ActionButtonProps {
  isFilterActive: boolean;
  onUpload: () => void;
  onReset: () => void;
  uploadLabel: string;
  resetLabel: string;
}

export function ActionButton({ isFilterActive, onUpload, onReset, uploadLabel, resetLabel }: ActionButtonProps) {
  const [animating, setAnimating] = useState(false);
  const [displayMode, setDisplayMode] = useState<'upload' | 'reset'>(isFilterActive ? 'reset' : 'upload');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    setAnimating(true);
    timeoutRef.current = setTimeout(() => {
      setDisplayMode(isFilterActive ? 'reset' : 'upload');
      setAnimating(false);
    }, 150);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isFilterActive]);

  const handleClick = () => {
    if (displayMode === 'reset') {
      onReset();
    } else {
      onUpload();
    }
  };

  const renderIcon = () => {
    if (animating) {
      return (
        <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      );
    }
    return displayMode === 'reset' ? (
      <RotateCcw className="w-4 h-4" />
    ) : (
      <Upload className="w-4 h-4" />
    );
  };

  const label = displayMode === 'reset' ? resetLabel : uploadLabel;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shrink-0 ${
        displayMode === 'reset'
          ? 'bg-surface hover:bg-surface-raised border border-subtle text-muted hover:text-primary shadow-sm'
          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
      }`}
    >
      <span
        className={`transition-all duration-150 ${
          animating ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
        }`}
      >
        {renderIcon()}
      </span>
      <span
        className={`transition-all duration-150 ${
          animating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
