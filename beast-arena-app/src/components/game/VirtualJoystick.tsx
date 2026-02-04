import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet, PanResponder, Animated, GestureResponderEvent, PanResponderGestureState } from 'react-native';

export interface JoystickInput {
  dx: number; // -1 to 1 (left/right)
  dy: number; // -1 to 1 (up/down)
  angle: number; // radians
  magnitude: number; // 0 to 1
  active: boolean;
}

interface VirtualJoystickProps {
  size?: number;
  onMove: (input: JoystickInput) => void;
  onRelease?: () => void;
  color?: string;
}

const ZERO_INPUT: JoystickInput = { dx: 0, dy: 0, angle: 0, magnitude: 0, active: false };

export default function VirtualJoystick({ size = 120, onMove, onRelease, color = '#FF6B35' }: VirtualJoystickProps) {
  const knobPos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const radius = size / 2;
  const knobRadius = size * 0.3;
  const maxDist = radius - knobRadius / 2;

  const calcInput = useCallback((gestureState: PanResponderGestureState): JoystickInput => {
    let dx = gestureState.dx;
    let dy = gestureState.dy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const magnitude = Math.min(dist / maxDist, 1);

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    return {
      dx: dx / maxDist,
      dy: dy / maxDist,
      angle: Math.atan2(dy, dx),
      magnitude,
      active: true,
    };
  }, [maxDist]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        knobPos.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        let dx = gestureState.dx;
        let dy = gestureState.dy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) {
          dx = (dx / dist) * maxDist;
          dy = (dy / dist) * maxDist;
        }
        knobPos.setValue({ x: dx, y: dy });
        onMove(calcInput(gestureState));
      },
      onPanResponderRelease: () => {
        Animated.spring(knobPos, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          useNativeDriver: false,
        }).start();
        onMove(ZERO_INPUT);
        onRelease?.();
      },
    })
  ).current;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radius }]} {...panResponder.panHandlers}>
      {/* Base ring */}
      <View style={[styles.base, {
        width: size,
        height: size,
        borderRadius: radius,
        borderColor: color,
      }]} />

      {/* Direction indicators */}
      <View style={[styles.dirIndicator, styles.dirUp, { borderBottomColor: `${color}40` }]} />
      <View style={[styles.dirIndicator, styles.dirDown, { borderTopColor: `${color}40` }]} />
      <View style={[styles.dirIndicator, styles.dirLeft, { borderRightColor: `${color}40` }]} />
      <View style={[styles.dirIndicator, styles.dirRight, { borderLeftColor: `${color}40` }]} />

      {/* Knob */}
      <Animated.View
        style={[
          styles.knob,
          {
            width: knobRadius * 2,
            height: knobRadius * 2,
            borderRadius: knobRadius,
            backgroundColor: color,
            transform: knobPos.getTranslateTransform(),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  base: {
    position: 'absolute',
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  knob: {
    opacity: 0.85,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  dirIndicator: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderWidth: 6,
    borderColor: 'transparent',
  },
  dirUp: { top: 8 },
  dirDown: { bottom: 8 },
  dirLeft: { left: 8 },
  dirRight: { right: 8 },
});
