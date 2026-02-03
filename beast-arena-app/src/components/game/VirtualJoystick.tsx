import React, { useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { PanGestureHandler, PanGestureHandlerGestureEvent, State } from 'react-native-gesture-handler';

export interface JoystickDirection {
  x: number; // -1 to 1
  y: number; // -1 to 1
}

interface VirtualJoystickProps {
  size?: number;
  onMove: (direction: JoystickDirection) => void;
  onRelease: () => void;
}

const KNOB_SIZE = 40;

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  size = 120,
  onMove,
  onRelease,
}) => {
  const knobX = useRef(new Animated.Value(0)).current;
  const knobY = useRef(new Animated.Value(0)).current;
  const radius = size / 2 - KNOB_SIZE / 2;

  const handleGesture = (event: PanGestureHandlerGestureEvent) => {
    const { translationX, translationY } = event.nativeEvent;

    // Clamp to circle radius
    const dist = Math.sqrt(translationX ** 2 + translationY ** 2);
    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(translationY, translationX);

    const clampedX = dist > 0 ? (clampedDist / dist) * translationX : 0;
    const clampedY = dist > 0 ? (clampedDist / dist) * translationY : 0;

    knobX.setValue(clampedX);
    knobY.setValue(clampedY);

    // Normalize to -1..1
    const nx = clampedX / radius;
    const ny = clampedY / radius;
    onMove({ x: nx, y: ny });
  };

  const handleStateChange = (event: PanGestureHandlerGestureEvent) => {
    if (
      event.nativeEvent.state === State.END ||
      event.nativeEvent.state === State.CANCELLED
    ) {
      Animated.spring(knobX, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
      Animated.spring(knobY, { toValue: 0, useNativeDriver: true, friction: 5 }).start();
      onRelease();
    }
  };

  return (
    <PanGestureHandler onGestureEvent={handleGesture} onHandlerStateChange={handleStateChange}>
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        {/* Outer ring */}
        <View style={[styles.outerRing, { width: size, height: size, borderRadius: size / 2 }]} />
        {/* Direction indicators */}
        <View style={styles.crosshair}>
          <View style={[styles.crossLine, styles.crossH]} />
          <View style={[styles.crossLine, styles.crossV]} />
        </View>
        {/* Knob */}
        <Animated.View
          style={[
            styles.knob,
            {
              width: KNOB_SIZE,
              height: KNOB_SIZE,
              borderRadius: KNOB_SIZE / 2,
              transform: [{ translateX: knobX }, { translateY: knobY }],
            },
          ]}
        />
      </View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  outerRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  crosshair: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  crossLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  crossH: {
    width: '60%',
    height: 1,
  },
  crossV: {
    width: 1,
    height: '60%',
  },
  knob: {
    backgroundColor: 'rgba(255, 107, 53, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    elevation: 4,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
});
