import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated } from 'react-native';

// --- Types ---

export type AnnouncementAnimation = 'zoom' | 'slam' | 'fade';

export interface AnnouncementStyle {
  text: string;
  color: string;
  fontSize: number;
  durationMs: number;
  animation: AnnouncementAnimation;
}

export interface AnnouncementData {
  text: string;
  color: string;
  fontSize: number;
  animation: AnnouncementAnimation;
  opacity: Animated.Value;
  scale: Animated.Value;
  translateY: Animated.Value;
}

// --- Presets ---

export const ANNOUNCEMENT_PRESETS: Record<string, Omit<AnnouncementStyle, 'text'>> = {
  FIGHT: {
    color: '#FFD700',
    fontSize: 72,
    durationMs: 1200,
    animation: 'zoom',
  },
  KO: {
    color: '#EF4444',
    fontSize: 80,
    durationMs: 1500,
    animation: 'slam',
  },
  ROUND: {
    color: '#FFFFFF',
    fontSize: 48,
    durationMs: 1000,
    animation: 'fade',
  },
  PERFECT: {
    color: '#FFD700',
    fontSize: 64,
    durationMs: 1500,
    animation: 'zoom',
  },
  TIME_OVER: {
    color: '#FFFFFF',
    fontSize: 56,
    durationMs: 1200,
    animation: 'fade',
  },
  WINNER: {
    color: '#FFD700',
    fontSize: 60,
    durationMs: 2000,
    animation: 'zoom',
  },
};

// --- React Hook ---

export function useAnnouncer() {
  const [announcement, setAnnouncement] = useState<AnnouncementData | null>(null);
  const queue = useRef<AnnouncementStyle[]>([]);
  const isPlaying = useRef(false);

  const playNext = useCallback(() => {
    if (queue.current.length === 0) {
      isPlaying.current = false;
      return;
    }

    isPlaying.current = true;
    const next = queue.current.shift()!;

    const opacity = new Animated.Value(0);
    const scale = new Animated.Value(next.animation === 'zoom' ? 0.3 : next.animation === 'slam' ? 2.0 : 1.0);
    const translateY = new Animated.Value(next.animation === 'slam' ? -200 : 0);

    const data: AnnouncementData = {
      text: next.text,
      color: next.color,
      fontSize: next.fontSize,
      animation: next.animation,
      opacity,
      scale,
      translateY,
    };

    setAnnouncement(data);

    // Entrance animation
    const entrance: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ];

    switch (next.animation) {
      case 'zoom':
        entrance.push(
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4, tension: 80 })
        );
        break;
      case 'slam':
        entrance.push(
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 5, tension: 100 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 })
        );
        break;
      case 'fade':
        // Just opacity, already handled
        break;
    }

    Animated.parallel(entrance).start(() => {
      // Hold, then exit
      const holdTime = next.durationMs - 400;
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setAnnouncement(null);
          playNext(); // Next in queue
        });
      }, holdTime);
    });
  }, []);

  const show = useCallback(
    (presetOrText: string, customText?: string) => {
      const preset = ANNOUNCEMENT_PRESETS[presetOrText];
      const style: AnnouncementStyle = preset
        ? { ...preset, text: customText || presetOrText }
        : {
            text: presetOrText,
            color: '#FFFFFF',
            fontSize: 48,
            durationMs: 1000,
            animation: 'fade',
          };

      queue.current.push(style);

      if (!isPlaying.current) {
        playNext();
      }
    },
    [playNext]
  );

  const clear = useCallback(() => {
    queue.current = [];
    setAnnouncement(null);
    isPlaying.current = false;
  }, []);

  return { announcement, show, clear };
}
