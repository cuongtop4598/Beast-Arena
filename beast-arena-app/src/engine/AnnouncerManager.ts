/**
 * AnnouncerManager — Comic-style text overlay announcements with audio.
 * Integrates with AudioManager for SFX on announcements.
 * Provides a React hook for rendering announcements in fight UI.
 */
import { useState, useCallback, useRef } from 'react';
import { Animated } from 'react-native';
import { audioManager } from './AudioManager';

// --- Types ---

export type AnnouncerAnimation = 'zoom' | 'slam' | 'slide' | 'flash';

export interface AnnouncerPreset {
  color: string;
  fontSize: number;
  durationMs: number;
  animation: AnnouncerAnimation;
  sfx?: string;          // SFX key to play from AudioManager
  strokeColor?: string;  // Comic text stroke
  shakeIntensity?: number;
}

export interface ActiveAnnouncement {
  text: string;
  color: string;
  fontSize: number;
  strokeColor: string;
  animation: AnnouncerAnimation;
  opacity: Animated.Value;
  scale: Animated.Value;
  translateY: Animated.Value;
  rotation: Animated.Value;
}

// --- Presets ---

export const ANNOUNCER_PRESETS: Record<string, AnnouncerPreset> = {
  FIGHT: {
    color: '#FFD700',
    fontSize: 78,
    durationMs: 1200,
    animation: 'zoom',
    sfx: 'round_start',
    strokeColor: '#FF4500',
    shakeIntensity: 5,
  },
  KO: {
    color: '#FF0000',
    fontSize: 90,
    durationMs: 1800,
    animation: 'slam',
    sfx: 'ko',
    strokeColor: '#8B0000',
    shakeIntensity: 10,
  },
  ROUND: {
    color: '#FFFFFF',
    fontSize: 52,
    durationMs: 1000,
    animation: 'slide',
    strokeColor: '#333333',
  },
  PERFECT: {
    color: '#FFD700',
    fontSize: 68,
    durationMs: 1500,
    animation: 'zoom',
    strokeColor: '#DAA520',
    shakeIntensity: 3,
  },
  TIME_OVER: {
    color: '#CCCCCC',
    fontSize: 56,
    durationMs: 1200,
    animation: 'flash',
    strokeColor: '#666666',
  },
  WINNER: {
    color: '#FFD700',
    fontSize: 64,
    durationMs: 2000,
    animation: 'zoom',
    strokeColor: '#FF8C00',
  },
  COMBO: {
    color: '#00BFFF',
    fontSize: 44,
    durationMs: 800,
    animation: 'zoom',
    strokeColor: '#0066CC',
  },
  SUPPLY_DROP: {
    color: '#00FF88',
    fontSize: 40,
    durationMs: 1000,
    animation: 'slide',
    sfx: 'supply_drop',
    strokeColor: '#008844',
  },
};

// --- React Hook ---

export function useAnnouncerManager() {
  const [announcement, setAnnouncement] = useState<ActiveAnnouncement | null>(null);
  const queue = useRef<Array<{ preset: AnnouncerPreset; text: string }>>([]);
  const isPlaying = useRef(false);

  const processQueue = useCallback(() => {
    if (queue.current.length === 0) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const { preset, text } = queue.current.shift()!;

    // Play associated SFX
    if (preset.sfx) {
      audioManager.playSFX(preset.sfx);
    }

    const opacity = new Animated.Value(0);
    const scale = new Animated.Value(
      preset.animation === 'zoom' ? 0.2 :
      preset.animation === 'slam' ? 2.5 :
      1.0
    );
    const translateY = new Animated.Value(
      preset.animation === 'slam' ? -300 :
      preset.animation === 'slide' ? 100 :
      0
    );
    const rotation = new Animated.Value(
      preset.animation === 'zoom' ? -0.1 : 0
    );

    const data: ActiveAnnouncement = {
      text,
      color: preset.color,
      fontSize: preset.fontSize,
      strokeColor: preset.strokeColor || '#000000',
      animation: preset.animation,
      opacity,
      scale,
      translateY,
      rotation,
    };

    setAnnouncement(data);

    // Entrance animations
    const entrance: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ];

    switch (preset.animation) {
      case 'zoom':
        entrance.push(
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 100 }),
          Animated.spring(rotation, { toValue: 0, useNativeDriver: true, friction: 5 })
        );
        break;
      case 'slam':
        entrance.push(
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 5, tension: 120 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 })
        );
        break;
      case 'slide':
        entrance.push(
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 6, tension: 80 })
        );
        break;
      case 'flash':
        entrance.push(
          Animated.sequence([
            Animated.timing(opacity, { toValue: 1, duration: 50, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.3, duration: 50, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1, duration: 50, useNativeDriver: true }),
          ])
        );
        break;
    }

    Animated.parallel(entrance).start(() => {
      const holdTime = Math.max(preset.durationMs - 350, 200);
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.3, duration: 200, useNativeDriver: true }),
        ]).start(() => {
          setAnnouncement(null);
          processQueue();
        });
      }, holdTime);
    });
  }, []);

  const announce = useCallback(
    (presetKey: string, customText?: string) => {
      const preset = ANNOUNCER_PRESETS[presetKey] || ANNOUNCER_PRESETS.ROUND;
      const text = customText || presetKey;

      queue.current.push({ preset, text });

      if (!isPlaying.current) {
        processQueue();
      }
    },
    [processQueue]
  );

  const announceRound = useCallback(
    (roundNum: number) => {
      announce('ROUND', `ROUND ${roundNum}`);
    },
    [announce]
  );

  const announceFight = useCallback(() => announce('FIGHT', 'FIGHT!'), [announce]);
  const announceKO = useCallback(() => announce('KO', 'K.O!'), [announce]);
  const announceCombo = useCallback(
    (count: number) => {
      audioManager.playComboSFX(count);
      announce('COMBO', `${count} HIT COMBO!`);
    },
    [announce]
  );

  const clear = useCallback(() => {
    queue.current = [];
    setAnnouncement(null);
    isPlaying.current = false;
  }, []);

  return {
    announcement,
    announce,
    announceRound,
    announceFight,
    announceKO,
    announceCombo,
    clear,
  };
}
