import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { SupplyDrop } from '../../engine/types';
import { GAME_CONFIG } from '../../engine/types';

/**
 * Supply Drop warning UI — shows a pulsing marker + 9-second countdown
 * when the engine schedules a drop (warningFrame reached but not yet spawnFrame).
 * Once the drop lands (active === true), the marker turns solid and the countdown
 * is replaced with the item name.
 */

const ITEM_EMOJI: Record<string, string> = {
  iron_gloves: '🥊',
  nunchaku: '🌀',
  grilled_meat: '🍖',
  energy_drink: '⚡',
  shoulder_armor: '🛡️',
};

interface SupplyDropOverlayProps {
  /** All unclaimed drops from the engine (getActiveDrops()) */
  drops: SupplyDrop[];
  /** Current game frame for countdown calc */
  currentFrame: number;
  /** Stage render width (screen px) so we can map world-X → screen-X */
  stageWidth: number;
}

const DropMarker: React.FC<{
  drop: SupplyDrop;
  currentFrame: number;
  stageWidth: number;
}> = ({ drop, currentFrame, stageWidth }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const isWarning = !drop.active && !drop.claimed;
  const isLanded = drop.active && !drop.claimed;

  // Remaining seconds until the crate lands
  const remainingFrames = Math.max(0, drop.spawnFrame - currentFrame);
  const remainingSeconds = Math.ceil(remainingFrames / GAME_CONFIG.fps);

  // Map world position → screen position (0-100%)
  const screenXPercent = (drop.position.x / GAME_CONFIG.stageWidth) * 100;

  useEffect(() => {
    // Fade in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (isWarning) {
      // Pulse animation during countdown
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.9, duration: 500, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else if (isLanded) {
      // Bounce when landed
      pulseAnim.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, { toValue: -8, duration: 600, useNativeDriver: true }),
          Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    }
  }, [isWarning, isLanded]);

  const emoji = ITEM_EMOJI[drop.item.id] || '📦';

  return (
    <Animated.View
      style={[
        styles.markerContainer,
        {
          left: `${Math.min(90, Math.max(5, screenXPercent - 5))}%`,
          opacity: opacityAnim,
          transform: [{ scale: pulseAnim }, { translateY: bounceAnim }],
        },
      ]}
    >
      {/* Vertical warning line */}
      {isWarning && <View style={styles.warningLine} />}

      {/* Crate / item icon */}
      <View style={[styles.crateBox, isLanded && styles.crateBoxLanded]}>
        <Text style={styles.crateEmoji}>{isLanded ? emoji : '📦'}</Text>
      </View>

      {/* Countdown or item name */}
      {isWarning && remainingSeconds > 0 && (
        <View style={styles.countdownBadge}>
          <Text style={styles.countdownText}>{remainingSeconds}s</Text>
        </View>
      )}

      {isLanded && (
        <View style={styles.itemNameBadge}>
          <Text style={styles.itemNameText}>{drop.item.name}</Text>
        </View>
      )}

      {/* Ground marker */}
      <View style={[styles.groundMarker, isWarning && styles.groundMarkerWarning]} />
    </Animated.View>
  );
};

export const SupplyDropOverlay: React.FC<SupplyDropOverlayProps> = ({
  drops,
  currentFrame,
  stageWidth,
}) => {
  if (drops.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {drops.map((drop) => (
        <DropMarker
          key={drop.id}
          drop={drop}
          currentFrame={currentFrame}
          stageWidth={stageWidth}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 90,
  },
  markerContainer: {
    position: 'absolute',
    bottom: '26%',
    alignItems: 'center',
    width: 64,
  },
  warningLine: {
    width: 2,
    height: 80,
    backgroundColor: 'rgba(255, 107, 53, 0.4)',
    marginBottom: 4,
  },
  crateBox: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crateBoxLanded: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700',
    borderStyle: 'solid',
  },
  crateEmoji: {
    fontSize: 24,
  },
  countdownBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255, 107, 53, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countdownText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  itemNameBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.85)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  itemNameText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0D0D1A',
  },
  groundMarker: {
    marginTop: 4,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    opacity: 0.7,
  },
  groundMarkerWarning: {
    backgroundColor: '#FF6B35',
    opacity: 0.5,
  },
});
