'use client';

import React from 'react';
import { Globe, Link2, Users, Lock } from 'lucide-react';

interface VisibilitySelectorProps {
  value: string;
  onChange: (value: string) => void;
  t?: any;
}

export function VisibilitySelector({ value, onChange, t }: VisibilitySelectorProps) {
  const options = [
    {
      id: 'public',
      label: t?.videoSettings?.visibility?.public || (t?.common?.language === 'en' ? 'Public' : 'Öffentlich'),
      desc: t?.videoSettings?.visibility?.publicDesc || (t?.common?.language === 'en' ? 'Appears in listings and feed' : 'Erscheint in Listen und im Feed'),
      icon: Globe,
    },
    {
      id: 'unlisted',
      label: t?.videoSettings?.visibility?.unlisted || (t?.common?.language === 'en' ? 'Anyone with link' : 'Über Link'),
      desc: t?.videoSettings?.visibility?.unlistedDesc || (t?.common?.language === 'en' ? 'Not discoverable — only people with the link' : 'Nicht auffindbar — nur wer den Link hat'),
      icon: Link2,
    },
    {
      id: 'subscribers',
      label: t?.videoSettings?.visibility?.subscribers || (t?.common?.language === 'en' ? 'Subscribers only' : 'Nur Abonnenten'),
      desc: t?.videoSettings?.visibility?.subscribersDesc || (t?.common?.language === 'en' ? 'Only for signed-in subscribers of your channel' : 'Nur für angemeldete Abonnenten deines Kanals'),
      icon: Users,
    },
    {
      id: 'private',
      label: t?.videoSettings?.visibility?.private || (t?.common?.language === 'en' ? 'Only me' : 'Nur ich'),
      desc: t?.videoSettings?.visibility?.privateDesc || (t?.common?.language === 'en' ? 'Only you can see this content' : 'Nur du kannst diesen Inhalt sehen'),
      icon: Lock,
    },
  ];

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
        {t?.videoSettings?.visibilityLabel || 'Sichtbarkeit'}
      </label>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.id;
          return (
            <label
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-sm'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="visibility-option"
                value={opt.id}
                checked={isSelected}
                onChange={() => onChange(opt.id)}
                className="mt-1 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold">{opt.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
