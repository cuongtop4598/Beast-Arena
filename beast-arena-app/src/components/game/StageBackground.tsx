/**
 * StageBackground — Rich parallax-style backgrounds for fight stages
 * with animated particles using React Native Animated API.
 *
 * Stages:
 * - ancient_temple: warm browns, torch flicker particles
 * - bamboo_forest: greens, falling leaf particles
 * - thunder_peak: dark purples, lightning flash particles
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// --- Stage Configs ---

interface StageConfig {
  bgColors: string[];        // gradient layer colors (bottom to top)
  particleColor: string;
  particleCount: number;
  groundColor: string;
  skyGlow: string;
}

const STAGE_CONFIGS: Record<string, StageConfig> = {
  ancient_temple: {
    bgColors: ['#1A0A00', '#3D1F00', '#5A2D00', '#8B4513'],
    particleColor: '#FF8C00',    // Torch embers
    particleCount: 20,
    groundColor: '#2A1500',
    skyGlow: 'rgba(255, 100, 0, 0.08)',
  },
  bamboo_forest: {
    bgColors: ['#051A0A', '#0A2E1A', '#1A4A2E', '#2E8B57'],
    particleColor: '#90EE90',    // Falling leaves
    particleCount: 15,
    groundColor: '#0A1F0A',
    skyGlow: 'rgba(46, 139, 87, 0.06)',
  },
  thunder_peak: {
    bgColors: ['#0A0015', '#1A0033', '#2D0066', '#4B0082'],
    particleColor: '#B19CD9',    // Lightning sparks
    particleCount: 12,
    groundColor: '#110022',
    skyGlow: 'rgba(138, 43, 226, 0.1)',
  },
};

// --- Particle Component ---

interface ParticleProps {
  stageId: string;
  index: number;
  config: StageConfig;
}

function Particle({ stageId, index, config }: ParticleProps) {
  const animY = useRef(new Animated.Value(0)).current;
  const animX = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  const startX = useMemo(() => Math.random() * SCREEN_W, []);
  const size = useMemo(() => Math.random() * 6 + 2, []);
  const delay = useMemo(() => Math.random() * 3000, []);

  useEffect(() => {
    const duration = stageId === 'bamboo_forest'
      ? 4000 + Math.random() * 3000   // Slow falling leaves
      : stageId === 'thunder_peak'
      ? 300 + Math.random() * 500     // Fast lightning sparks
      : 2000 + Math.random() * 2000;  // Medium torch embers

    const animate = () => {
      animY.setValue(stageId === 'ancient_temple' ? SCREEN_H : 0);
      animX.setValue(0);
      animOpacity.setValue(0);

      const targetY = stageId === 'ancient_temple'
        ? -(Math.random() * SCREEN_H * 0.6)  // Embers float up
        : SCREEN_H + 20;                       // Others fall down

      Animated.parallel([
        Animated.timing(animY, {
          toValue: targetY,
          duration,
          easing: stageId === 'bamboo_forest' ? Easing.linear : Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(animX, {
          toValue: (Math.random() - 0.5) * 80,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(animOpacity, {
            toValue: stageId === 'thunder_peak' ? 1.0 : 0.7,
            duration: duration * 0.2,
            useNativeDriver: true,
          }),
          Animated.timing(animOpacity, {
            toValue: stageId === 'thunder_peak' ? 1.0 : 0.7,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
          Animated.timing(animOpacity, {
            toValue: 0,
            duration: duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    const timer = setTimeout(animate, delay);
    return () => clearTimeout(timer);
  }, [stageId, animY, animX, animOpacity, delay]);

  const particleStyle = stageId === 'bamboo_forest'
    ? { width: size * 2, height: size, borderRadius: size / 2 }  // Leaf-like
    : { width: size, height: size, borderRadius: size / 2 };

  return (
    <Animated.View
      style={[
        styles.particle,
        particleStyle,
        {
          backgroundColor: config.particleColor,
          left: startX,
          opacity: animOpacity,
          transform: [{ translateY: animY }, { translateX: animX }],
        },
      ]}
    />
  );
}

// --- Lightning Flash (thunder_peak only) ---

function LightningFlash() {
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const doFlash = () => {
      const nextDelay = 3000 + Math.random() * 8000; // Random interval
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(flashOpacity, { toValue: 0.4, duration: 50, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0.2, duration: 40, useNativeDriver: true }),
          Animated.timing(flashOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start(() => doFlash());
      }, nextDelay);
    };
    doFlash();
  }, [flashOpacity]);

  return (
    <Animated.View
      style={[styles.lightningFlash, { opacity: flashOpacity }]}
    />
  );
}

// --- Torch Flicker (ancient_temple only) ---

function TorchGlow({ side }: { side: 'left' | 'right' }) {
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const flicker = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.6, duration: 200 + Math.random() * 300, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 150 + Math.random() * 200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 300 + Math.random() * 400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.25, duration: 200 + Math.random() * 250, useNativeDriver: true }),
      ])
    );
    flicker.start();
    return () => flicker.stop();
  }, [glowAnim]);

  return (
    <Animated.View
      style={[
        styles.torchGlow,
        side === 'left' ? { left: 20 } : { right: 20 },
        { opacity: glowAnim },
      ]}
    />
  );
}

// --- Main Component ---

interface StageBackgroundProps {
  stageId: string;
}

export default function StageBackground({ stageId }: StageBackgroundProps) {
  const config = STAGE_CONFIGS[stageId] || STAGE_CONFIGS.ancient_temple;

  return (
    <View style={styles.container}>
      {/* Background gradient layers (parallax feel) */}
      {config.bgColors.map((color, i) => (
        <View
          key={i}
          style={[
            styles.bgLayer,
            {
              backgroundColor: color,
              opacity: 0.4 + (i * 0.15),
              top: `${i * 20}%`,
              height: `${100 - i * 15}%`,
            },
          ]}
        />
      ))}

      {/* Sky glow */}
      <View style={[styles.skyGlow, { backgroundColor: config.skyGlow }]} />

      {/* Ground */}
      <View style={[styles.ground, { backgroundColor: config.groundColor }]} />
      <View style={styles.groundLine} />

      {/* Stage-specific effects */}
      {stageId === 'thunder_peak' && <LightningFlash />}
      {stageId === 'ancient_temple' && (
        <>
          <TorchGlow side="left" />
          <TorchGlow side="right" />
        </>
      )}

      {/* Particles */}
      {Array.from({ length: config.particleCount }).map((_, i) => (
        <Particle key={i} stageId={stageId} index={i} config={config} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  skyGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '25%',
  },
  groundLine: {
    position: 'absolute',
    bottom: '25%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  particle: {
    position: 'absolute',
  },
  lightningFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  torchGlow: {
    position: 'absolute',
    bottom: '28%',
    width: 60,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 140, 0, 0.4)',
  },
});
