import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface SupplyDropUIProps {
  active: boolean;
  type: 'hp_restore' | 'attack_boost' | 'speed_boost' | 'ultimate_charge';
  position: { x: number; y: number };
  warningSeconds: number;
}

const TYPE_CONFIG = {
  hp_restore: { emoji: '❤️', label: 'HP', color: '#ff4444' },
  attack_boost: { emoji: '⚔️', label: 'ATK', color: '#ff6b35' },
  speed_boost: { emoji: '💨', label: 'SPD', color: '#4fc3f7' },
  ultimate_charge: { emoji: '⚡', label: 'ULT', color: '#ffd700' },
};

export function SupplyDropUI({ active, type, position, warningSeconds }: SupplyDropUIProps) {
  const [countdown, setCountdown] = useState(warningSeconds);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (!active) return;
    setCountdown(warningSeconds);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, [active, warningSeconds]);

  if (!active) return null;

  const config = TYPE_CONFIG[type];

  return (
    <>
      {/* Warning banner */}
      {countdown > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ SUPPLY DROP in {countdown}s
          </Text>
        </View>
      )}

      {/* Drop marker on arena */}
      {countdown <= 0 && (
        <Animated.View
          style={[
            styles.marker,
            {
              left: position.x - 30,
              top: position.y - 30,
              transform: [{ scale: pulseAnim }],
              borderColor: config.color,
            },
          ]}
        >
          <Text style={styles.markerEmoji}>{config.emoji}</Text>
          <Text style={[styles.markerLabel, { color: config.color }]}>{config.label}</Text>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  warningBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,107,53,0.9)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 100,
  },
  warningText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  marker: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  markerEmoji: { fontSize: 20 },
  markerLabel: { fontSize: 10, fontWeight: '900' },
});
