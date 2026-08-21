'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Laptop, Check, ChevronDown } from 'lucide-react';

export type ThemeChoice = 'system' | 'dark' | 'light';

interface ThemeToggleProps {
  /**
   * `dropdown` is the compact top-bar control. `inline` renders the three
   * choices side by side — inside the navigation drawer a dropdown within a
   * slide-over is one layer of nesting too many, and there is room for the
   * options themselves.
   */
  variant?: 'dropdown' | 'inline';
  labels?: { system?: string; dark?: string; light?: string; heading?: string };
}

export default function ThemeToggle({ variant = 'dropdown', labels }: ThemeToggleProps = {}) {
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem('omni-theme') as ThemeChoice) || 'system';
    setTheme(saved);
  }, []);

  const applyTheme = (choice: ThemeChoice) => {
    setTheme(choice);
    localStorage.setItem('omni-theme', choice);
    let resolved = choice;
    if (choice === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setIsOpen(false);
  };

  useEffect(() => {
    if (theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!mounted) {
    // The resolved theme is only known on the client, so render a neutral
    // placeholder of the right size rather than guessing and flashing.
    return variant === 'inline' ? (
      <div className="h-9 rounded-xl bg-surface border border-subtle" />
    ) : (
      <div className="w-8 h-8 rounded-xl bg-surface border border-subtle" />
    );
  }

  const options: { key: ThemeChoice; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'system', label: labels?.system || 'System', icon: Laptop },
    { key: 'dark', label: labels?.dark || 'Dunkel', icon: Moon },
    { key: 'light', label: labels?.light || 'Hell', icon: Sun },
  ];

  const currentOption = options.find((o) => o.key === theme) || options[0];
  const CurrentIcon = currentOption.icon;

  if (variant === 'inline') {
    return (
      <div
        role="radiogroup"
        aria-label={labels?.heading || 'Design'}
        className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface border border-subtle"
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => applyTheme(opt.key)}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'text-muted hover:text-primary hover:bg-surface-raised'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-surface hover:bg-surface-raised text-primary px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border border-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
        title={`Design: ${currentOption.label} (Klicken zum Ändern)`}
        aria-label={`Design wählen (aktuell: ${currentOption.label})`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <CurrentIcon className="w-3.5 h-3.5 text-indigo-400 dark:text-indigo-400" />
        <span className="hidden md:inline font-mono text-[11px] uppercase">{currentOption.label}</span>
        <ChevronDown className={`w-3 h-3 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-36 bg-surface-raised border border-subtle rounded-2xl shadow-2xl p-1.5 z-50 animate-scaleIn flex flex-col gap-0.5"
          style={{ boxShadow: '0 12px 32px -8px rgba(0,0,0,0.4)' }}
        >
          {options.map((opt) => {
            const Icon = opt.icon;
            const isSelected = theme === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => applyTheme(opt.key)}
                className={`flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-indigo-600/15 text-indigo-500 font-semibold'
                    : 'text-primary hover:bg-surface text-muted hover:text-primary'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
