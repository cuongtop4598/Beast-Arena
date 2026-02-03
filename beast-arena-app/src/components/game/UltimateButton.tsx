import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

interface UltimateButtonProps {
  gaugePercent: number; // 0-100
  onActivate: () => void;
}

const BTN_SIZE = 64;

export const UltimateButton: React.FC<UltimateButtonProps> = ({ gaugePercent, onActivate }) => {
  const isReady = gaugePercent >= 100;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isReady) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ])
      );
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.12, duration: 500, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      glow.start();
      pulse.start();
      return () => {
        glow.stop();
        pulse.stop();
      };
    } else {
      glowAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [isReady]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.8],
  });

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      {/* Glow effect */}
      {isReady && (
        <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />
      )}

      {/* Gauge ring */}
      <View style={styles.gaugeRing}>
        <View
          style={[
            styles.gaugeFill,
            {
              // Simple approach: border color indicates fill
              borderColor: isReady ? '#FFD700' : `rgba(255, 107, 53, ${gaugePercent / 100})`,
              borderWidth: 3,
            },
          ]}
        />
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[styles.button, isReady ? styles.buttonReady : styles.buttonCharging]}
        onPress={onActivate}
        disabled={!isReady}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>💥</Text>
        <Text style={[styles.label, isReady && styles.labelReady]}>
          {isReady ? 'ULT!' : `${Math.floor(gaugePercent)}%`}
        </Text>
      </TouchableOpacity>

      {/* Percent indicator */}
      {!isReady && (
        <View style={styles.percentBar}>
          <View style={[styles.percentFill, { width: `${gaugePercent}%` }]} />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
  },
  glow: {
    position: 'absolute',
    width: BTN_SIZE + 30,
    height: BTN_SIZE + 30,
    borderRadius: (BTN_SIZE + 30) / 2,
    backgroundColor: '#FFD700',
  },
  gaugeRing: {
    position: 'absolute',
    width: BTN_SIZE + 8,
    height: BTN_SIZE + 8,
    borderRadius: (BTN_SIZE + 8) / 2,
    overflow: 'hidden',
  },
  gaugeFill: {
    width: '100%',
    height: '100%',
    borderRadius: (BTN_SIZE + 8) / 2,
  },
  button: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonReady: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderColor: '#FFD700',
  },
  buttonCharging: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderColor: '#555',
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#AAA',
  },
  labelReady: {
    color: '#FFD700',
  },
  percentBar: {
    width: BTN_SIZE,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  percentFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: 2,
  },
});
