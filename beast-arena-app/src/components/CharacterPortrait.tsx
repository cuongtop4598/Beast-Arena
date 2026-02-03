/**
 * CharacterPortrait — Stylized portrait card with gradient background,
 * emoji placeholder, character name, martial art subtitle, and animated glow border.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

// Element color mappings for character themes
const ELEMENT_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  tiger: { primary: '#FF6B35', secondary: '#FF8C5A', glow: '#FF4500' },      // Fire/Orange
  lion: { primary: '#FFD700', secondary: '#FFA500', glow: '#FFB300' },        // Gold
  crocodile: { primary: '#2E8B57', secondary: '#3CB371', glow: '#00FF7F' },   // Water/Green
  eagle: { primary: '#6A5ACD', secondary: '#9370DB', glow: '#7B68EE' },       // Wind/Purple
};

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯',
  lion: '🦁',
  crocodile: '🐊',
  eagle: '🦅',
};

interface CharacterPortraitProps {
  characterId: string;
  name: string;
  martialArt: string;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export default function CharacterPortrait({
  characterId,
  name,
  martialArt,
  selected = false,
  size = 'medium',
}: CharacterPortraitProps) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const colors = ELEMENT_COLORS[characterId] || ELEMENT_COLORS.tiger;
  const emoji = CHAR_EMOJI[characterId] || '❓';

  const dimensions = {
    small: { width: 90, height: 120, emoji: 36, name: 11, subtitle: 9 },
    medium: { width: 140, height: 190, emoji: 56, name: 16, subtitle: 12 },
    large: { width: 200, height: 270, emoji: 80, name: 22, subtitle: 15 },
  }[size];

  // Glow animation loop
  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [glowAnim]);

  // Pulse when selected
  useEffect(() => {
    if (selected) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [selected, pulseAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1.0],
  });

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [colors.primary, colors.glow, colors.primary],
  });

  return (
    <Animated.View style={[{ transform: [{ scale: pulseAnim }] }]}>
      <Animated.View
        style={[
          styles.card,
          {
            width: dimensions.width,
            height: dimensions.height,
            borderColor: selected ? borderColor : 'rgba(255,255,255,0.15)',
            borderWidth: selected ? 3 : 1,
          },
        ]}
      >
        {/* Gradient background layers */}
        <View style={[styles.gradientTop, { backgroundColor: colors.primary }]} />
        <View style={[styles.gradientBottom, { backgroundColor: colors.secondary }]} />
        <View style={styles.innerDarkOverlay} />

        {/* Glow effect */}
        {selected && (
          <Animated.View
            style={[
              styles.glowOverlay,
              { backgroundColor: colors.glow, opacity: glowOpacity },
            ]}
          />
        )}

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.emoji, { fontSize: dimensions.emoji }]}>{emoji}</Text>
          <Text style={[styles.name, { fontSize: dimensions.name }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.subtitle, { fontSize: dimensions.subtitle, color: colors.secondary }]} numberOfLines={1}>
            {martialArt}
          </Text>
        </View>

        {/* Corner accents */}
        <View style={[styles.cornerTL, { borderColor: colors.glow }]} />
        <View style={[styles.cornerBR, { borderColor: colors.glow }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    opacity: 0.3,
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    opacity: 0.15,
  },
  innerDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 26, 0.75)',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 2,
  },
  emoji: {
    marginBottom: 8,
  },
  name: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRadius: 2,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderRadius: 2,
  },
});
