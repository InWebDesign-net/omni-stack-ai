'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, X, Sparkles, Plus, Trash2, RotateCcw, Check, Save, Layers, Tag } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { AffinityGraph, defaultAffinityGraph, getStoredJwt } from '@/lib/affinity';

interface AlgorithmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AlgorithmModal({ isOpen, onClose }: AlgorithmModalProps) {
  const { t, currentUser, profile, setProfile, updateProfileState } = useApp();

  const [graph, setGraph] = useState<AffinityGraph>(defaultAffinityGraph());
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicScore, setNewTopicScore] = useState(80);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSavedSuccess(false);
      const jwt = getStoredJwt();
      if (jwt) {
        setIsLoadingProfile(true);
        fetch('/api/profile', {
          headers: { 'Authorization': `Bearer ${jwt}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.affinityGraph && Object.keys(data.affinityGraph.topics || {}).length > 0) {
              setGraph(data.affinityGraph);
              updateProfileState(data.affinityGraph);
            } else if (profile && Object.keys(profile.topics || {}).length > 0) {
              setGraph(JSON.parse(JSON.stringify(profile)));
            } else {
              setGraph(defaultAffinityGraph());
            }
          })
          .catch(() => {
            if (profile) setGraph(JSON.parse(JSON.stringify(profile)));
          })
          .finally(() => {
            setIsLoadingProfile(false);
          });
      } else if (profile && Object.keys(profile.topics || {}).length > 0) {
        setGraph(JSON.parse(JSON.stringify(profile)));
      } else {
        setGraph(defaultAffinityGraph());
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTopicScoreChange = (topic: string, newScore: number) => {
    setGraph((prev) => ({
      ...prev,
      topics: {
        ...prev.topics,
        [topic]: {
          ...(prev.topics[topic] || { last_interacted: new Date().toISOString() }),
          score: Math.min(100, Math.max(0, newScore)),
          last_interacted: new Date().toISOString(),
        },
      },
    }));
  };

  const handleRemoveTopic = (topic: string) => {
    setGraph((prev) => {
      const nextTopics = { ...prev.topics };
      delete nextTopics[topic];
      return { ...prev, topics: nextTopics };
    });
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    const name = newTopicName.trim();
    handleTopicScoreChange(name, newTopicScore);
    setNewTopicName('');
  };

  const handleContentTypeWeightChange = (type: string, weight: number) => {
    setGraph((prev) => ({
      ...prev,
      contentTypes: {
        ...prev.contentTypes,
        [type]: Math.min(1, Math.max(0, weight)),
      },
    }));
  };

  const handleResetDefaults = () => {
    setGraph(defaultAffinityGraph());
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      updateProfileState(graph);

      const jwt = getStoredJwt();
      if (jwt) {
        await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify(graph),
        });
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving algorithm vectors:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const topicsList = Object.entries(graph.topics || {}).sort((a, b) => b[1].score - a[1].score);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fadeIn" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0d1528] border border-indigo-500/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 z-50 overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span>Vektor-Algorithmus & Präferenzen</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                  affinityGraph (Max 50)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Passe Themen-Gewichtungen und Medien-Formate an, die deinen personalisierten Feed steuern.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t.common?.close || 'Schließen'}
            title={t.common?.close || 'Schließen'}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        {isLoadingProfile ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 space-y-3">
            <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-xs font-mono text-slate-400">Lade reale affinityGraph-Vektoren aus Strapi DB...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
          {/* Section 1: Topics & Keywords */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-400" />
                <span>Interessen-Themen ({topicsList.length} / 50)</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-400">
                Score: 0 – 100
              </span>
            </div>

            {/* Add New Topic Row */}
            <form onSubmit={handleAddTopic} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
              <input
                type="text"
                aria-label="Neues Thema eingeben"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Neues Thema eingeben (z.B. KI, Gaming)..."
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              <input
                type="number"
                aria-label="Initialen Score eingeben"
                min="0"
                max="100"
                value={newTopicScore}
                onChange={(e) => setNewTopicScore(Number(e.target.value))}
                className="w-16 bg-slate-950 px-2 py-1.5 text-xs text-center text-indigo-300 font-mono rounded-xl border border-slate-800"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Hinzufügen</span>
              </button>
            </form>

            {/* Topics List Sliders */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {topicsList.map(([topic, data]) => (
                <div
                  key={topic}
                  className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/30 transition-all"
                >
                  <div className="min-w-[120px]">
                    <span className="font-semibold text-xs text-slate-200 block truncate">{topic}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Score: {Math.round(data.score)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    aria-label={`Score für Thema ${topic}`}
                    min="0"
                    max="100"
                    value={Math.round(data.score)}
                    onChange={(e) => handleTopicScoreChange(topic, Number(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />

                  <button
                    onClick={() => handleRemoveTopic(topic)}
                    aria-label={`Thema ${topic} entfernen`}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Thema entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Media Type Weights */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Medienformate-Gewichtung</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'video', label: '📹 Videos', val: graph.contentTypes?.video ?? 0.9 },
                { key: 'short', label: '⚡ Shorts', val: graph.contentTypes?.short ?? 0.5 },
                { key: 'article', label: '✍️ Artikel', val: graph.contentTypes?.article ?? 0.7 },
                { key: 'image', label: '🖼️ Bilder', val: graph.contentTypes?.image ?? 0.8 },
              ].map(({ key, label, val }) => (
                <div key={key} className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-200">{label}</span>
                    <span className="font-mono text-indigo-300">{Math.round(val * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    aria-label={`Gewichtung für ${label}`}
                    min="0"
                    max="1"
                    step="0.05"
                    value={val}
                    onChange={(e) => handleContentTypeWeightChange(key, Number(e.target.value))}
                    className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs flex items-center gap-2 border border-slate-800 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Zurücksetzen</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-800 transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Gespeichert ✓</span>
                </>
              ) : isSaving ? (
                <span>Speichern...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Speichern & Anwenden</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
