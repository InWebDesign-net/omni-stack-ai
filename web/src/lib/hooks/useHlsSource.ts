'use client';

import { useState, useEffect, RefObject } from 'react';
import Hls from 'hls.js';

export interface HlsLevel {
  index: number;
  label: string;
  height?: number;
  bitrate?: number;
}

interface UseHlsSourceOptions {
  hlsUrl?: string | null;
  mp4Url?: string | null;
  enabled?: boolean;
}

export function useHlsSource(
  videoRef: RefObject<HTMLVideoElement | null>,
  { hlsUrl, mp4Url, enabled = true }: UseHlsSourceOptions
) {
  const [levels, setLevels] = useState<HlsLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;

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
          height: lvl.height,
          bitrate: lvl.bitrate,
        }));
        setLevels(parsedLevels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, () => {
        if (hls && hls.currentLevel === -1) {
          setCurrentLevel(-1);
        }
      });

      setHlsInstance(hls);
      (video as any).hls = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && hlsUrl) {
      video.src = hlsUrl;
    } else if (mp4Url) {
      video.src = mp4Url;
    }

    return () => {
      if (hls) {
        hls.destroy();
        delete (video as any).hls;
      }
      setHlsInstance(null);
      setLevels([]);
      setCurrentLevel(-1);
    };
  }, [videoRef, hlsUrl, mp4Url, enabled]);

  const changeLevel = (levelIndex: number) => {
    setCurrentLevel(levelIndex);
    if (hlsInstance) {
      hlsInstance.currentLevel = levelIndex;
    } else if (videoRef.current && (videoRef.current as any).hls) {
      (videoRef.current as any).hls.currentLevel = levelIndex;
    }
  };

  return {
    levels,
    currentLevel,
    changeLevel,
    hls: hlsInstance,
  };
}
