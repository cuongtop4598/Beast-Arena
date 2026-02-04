import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

/**
 * FighterSprite — renders a chibi martial arts fighter using View elements.
 * Shows distinct poses for each action state.
 * Body parts are positioned/rotated to form recognizable martial arts stances.
 */

export type FighterPose =
  | 'idle'
  | 'walk'
  | 'jab'
  | 'cross'
  | 'hook'
  | 'knee'
  | 'special_rush'
  | 'special_elbow'
  | 'special_kick'
  | 'special_grab'
  | 'ultimate'
  | 'block'
  | 'hit'
  | 'ko';

interface FighterSpriteProps {
  characterId: string;
  pose: FighterPose;
  facing: 'left' | 'right';
  size?: number;
  moving?: boolean;
}

// Character color palettes
const CHAR_COLORS: Record<string, { primary: string; secondary: string; accent: string; skin: string; belt: string }> = {
  tiger: { primary: '#FF6B35', secondary: '#CC4400', accent: '#FFD700', skin: '#FF9955', belt: '#FF0000' },
  lion: { primary: '#DAA520', secondary: '#B8860B', accent: '#FFD700', skin: '#F0C060', belt: '#000000' },
  crocodile: { primary: '#2D8B46', secondary: '#1A5C2E', accent: '#90EE90', skin: '#3DA55D', belt: '#CC0000' },
  eagle: { primary: '#5C3A1E', secondary: '#3D2510', accent: '#87CEEB', skin: '#F5DEB3', belt: '#1E90FF' },
};

// Pose definitions: rotation angles for limbs (degrees)
interface PoseDef {
  bodyTilt: number;
  headTilt: number;
  leftArmUpper: number;
  leftArmLower: number;
  rightArmUpper: number;
  rightArmLower: number;
  leftLegUpper: number;
  leftLegLower: number;
  rightLegUpper: number;
  rightLegLower: number;
  bodyY: number; // vertical offset
}

const POSES: Record<FighterPose, PoseDef> = {
  idle: {
    bodyTilt: 0, headTilt: 0,
    leftArmUpper: -30, leftArmLower: -60,
    rightArmUpper: 30, rightArmLower: 60,
    leftLegUpper: 10, leftLegLower: 0,
    rightLegUpper: -10, rightLegLower: 0,
    bodyY: 0,
  },
  walk: {
    bodyTilt: 5, headTilt: 0,
    leftArmUpper: -40, leftArmLower: -30,
    rightArmUpper: 40, rightArmLower: 30,
    leftLegUpper: 30, leftLegLower: -20,
    rightLegUpper: -30, rightLegLower: 20,
    bodyY: -2,
  },
  jab: {
    bodyTilt: 10, headTilt: 5,
    leftArmUpper: -20, leftArmLower: -70,
    rightArmUpper: 90, rightArmLower: 0, // straight punch
    leftLegUpper: 15, leftLegLower: 0,
    rightLegUpper: -20, rightLegLower: 10,
    bodyY: 0,
  },
  cross: {
    bodyTilt: 15, headTilt: 5,
    leftArmUpper: -30, leftArmLower: -80,
    rightArmUpper: 80, rightArmLower: 10, // cross punch rotated body
    leftLegUpper: 10, leftLegLower: 0,
    rightLegUpper: -25, rightLegLower: 15,
    bodyY: -2,
  },
  hook: {
    bodyTilt: -10, headTilt: -5,
    leftArmUpper: -30, leftArmLower: -60,
    rightArmUpper: 60, rightArmLower: -90, // hook angle
    leftLegUpper: 15, leftLegLower: 0,
    rightLegUpper: -15, rightLegLower: 10,
    bodyY: -3,
  },
  knee: {
    bodyTilt: -5, headTilt: 0,
    leftArmUpper: -50, leftArmLower: -80,
    rightArmUpper: -40, rightArmLower: -70, // clinch grab
    leftLegUpper: 10, leftLegLower: 0,
    rightLegUpper: -80, rightLegLower: -120, // knee raised high
    bodyY: -5,
  },
  special_rush: {
    bodyTilt: 25, headTilt: 10,
    leftArmUpper: -60, leftArmLower: -40,
    rightArmUpper: 70, rightArmLower: 20, // charging punch
    leftLegUpper: 40, leftLegLower: -30,
    rightLegUpper: -40, rightLegLower: 30,
    bodyY: -8,
  },
  special_elbow: {
    bodyTilt: 20, headTilt: 10,
    leftArmUpper: -20, leftArmLower: -60,
    rightArmUpper: 50, rightArmLower: -130, // elbow strike
    leftLegUpper: 10, leftLegLower: 0,
    rightLegUpper: -20, rightLegLower: 10,
    bodyY: -3,
  },
  special_kick: {
    bodyTilt: -15, headTilt: -5,
    leftArmUpper: -50, leftArmLower: -50,
    rightArmUpper: 50, rightArmLower: 50, // balance arms
    leftLegUpper: 15, leftLegLower: 0,
    rightLegUpper: 100, rightLegLower: 10, // high roundhouse
    bodyY: -10,
  },
  special_grab: {
    bodyTilt: 5, headTilt: 0,
    leftArmUpper: 40, leftArmLower: 80, // reaching
    rightArmUpper: 40, rightArmLower: 80,
    leftLegUpper: 20, leftLegLower: -10,
    rightLegUpper: -20, rightLegLower: 10,
    bodyY: -5,
  },
  ultimate: {
    bodyTilt: 0, headTilt: -10,
    leftArmUpper: -120, leftArmLower: -30, // arms raised
    rightArmUpper: 120, rightArmLower: 30,
    leftLegUpper: 20, leftLegLower: -10,
    rightLegUpper: -20, rightLegLower: 10,
    bodyY: -15,
  },
  block: {
    bodyTilt: -5, headTilt: -5,
    leftArmUpper: -10, leftArmLower: -120, // guard up
    rightArmUpper: 10, rightArmLower: 120,
    leftLegUpper: 10, leftLegLower: 0,
    rightLegUpper: -10, rightLegLower: 0,
    bodyY: 3,
  },
  hit: {
    bodyTilt: -20, headTilt: -15,
    leftArmUpper: -40, leftArmLower: -20,
    rightArmUpper: 50, rightArmLower: 20,
    leftLegUpper: 5, leftLegLower: 0,
    rightLegUpper: -5, rightLegLower: 0,
    bodyY: 5,
  },
  ko: {
    bodyTilt: -60, headTilt: -30,
    leftArmUpper: -30, leftArmLower: -10,
    rightArmUpper: 60, rightArmLower: 10,
    leftLegUpper: 30, leftLegLower: 20,
    rightLegUpper: 10, rightLegLower: 30,
    bodyY: 20,
  },
};

export default function FighterSprite({ characterId, pose, facing, size = 80, moving = false }: FighterSpriteProps) {
  const colors = CHAR_COLORS[characterId] || CHAR_COLORS.tiger;
  const poseDef = POSES[pose] || POSES.idle;
  const scale = size / 80;
  const flipX = facing === 'left' ? -1 : 1;

  // Breathing/idle animation
  const breathAnim = useRef(new Animated.Value(0)).current;
  const walkCycle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (pose === 'idle' || pose === 'block') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(breathAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathAnim, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [pose]);

  useEffect(() => {
    if (moving) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(walkCycle, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(walkCycle, { toValue: -1, duration: 500, useNativeDriver: true }),
          Animated.timing(walkCycle, { toValue: 0, duration: 250, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      walkCycle.setValue(0);
    }
  }, [moving]);

  const headSize = 22 * scale;
  const bodyH = 20 * scale;
  const bodyW = 16 * scale;
  const limbW = 6 * scale;
  const armLen = 16 * scale;
  const legLen = 18 * scale;

  // Character-specific head decoration
  const renderHeadDecor = () => {
    switch (characterId) {
      case 'tiger':
        return (
          <>
            {/* Headband */}
            <View style={{ position: 'absolute', top: headSize * 0.55, left: -2, right: -2, height: 3 * scale, backgroundColor: colors.belt, borderRadius: 1 }} />
            {/* Ears */}
            <View style={{ position: 'absolute', top: -3 * scale, left: 2, width: 6 * scale, height: 6 * scale, backgroundColor: colors.primary, borderRadius: 3 * scale }} />
            <View style={{ position: 'absolute', top: -3 * scale, right: 2, width: 6 * scale, height: 6 * scale, backgroundColor: colors.primary, borderRadius: 3 * scale }} />
            {/* Stripes */}
            <View style={{ position: 'absolute', top: 3 * scale, left: headSize * 0.25, width: 2 * scale, height: 4 * scale, backgroundColor: '#000', borderRadius: 1, transform: [{ rotate: '-10deg' }] }} />
            <View style={{ position: 'absolute', top: 3 * scale, right: headSize * 0.25, width: 2 * scale, height: 4 * scale, backgroundColor: '#000', borderRadius: 1, transform: [{ rotate: '10deg' }] }} />
          </>
        );
      case 'lion':
        return (
          <>
            {/* Mane */}
            <View style={{ position: 'absolute', top: -4 * scale, left: -5 * scale, right: -5 * scale, bottom: -2 * scale, backgroundColor: colors.accent, borderRadius: headSize * 0.7, opacity: 0.7, zIndex: -1 }} />
          </>
        );
      case 'crocodile':
        return (
          <>
            {/* Snout/jaw */}
            <View style={{ position: 'absolute', bottom: -3 * scale, left: headSize * 0.2, right: headSize * 0.2, height: 5 * scale, backgroundColor: colors.secondary, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
            {/* Teeth */}
            <View style={{ position: 'absolute', bottom: -1 * scale, left: headSize * 0.3, width: 2 * scale, height: 2 * scale, backgroundColor: '#FFF' }} />
            <View style={{ position: 'absolute', bottom: -1 * scale, right: headSize * 0.3, width: 2 * scale, height: 2 * scale, backgroundColor: '#FFF' }} />
          </>
        );
      case 'eagle':
        return (
          <>
            {/* Beak */}
            <View style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -3 * scale, width: 0, height: 0, borderLeftWidth: 3 * scale, borderRightWidth: 3 * scale, borderTopWidth: 5 * scale, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DAA520' }} />
            {/* Crest */}
            <View style={{ position: 'absolute', top: -4 * scale, left: headSize * 0.3, right: headSize * 0.3, height: 5 * scale, backgroundColor: colors.secondary, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          </>
        );
      default:
        return null;
    }
  };

  // Effect overlay for special/ultimate
  const renderEffect = () => {
    if (pose === 'ultimate') {
      return (
        <View style={[styles.effectAura, {
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: size * 0.75,
          borderColor: colors.accent,
          top: -size * 0.15,
          left: -size * 0.25,
        }]} />
      );
    }
    if (pose.startsWith('special_')) {
      return (
        <View style={[styles.effectGlow, {
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: size * 0.3,
          backgroundColor: `${colors.accent}40`,
          top: size * 0.1,
          right: facing === 'right' ? -size * 0.15 : undefined,
          left: facing === 'left' ? -size * 0.15 : undefined,
        }]} />
      );
    }
    return null;
  };

  const bodyBreathY = pose === 'idle' ? breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) : 0;

  return (
    <Animated.View style={[
      styles.spriteContainer,
      {
        width: size,
        height: size * 1.4,
        transform: [
          { scaleX: flipX },
          { translateY: poseDef.bodyY * scale },
        ],
      },
    ]}>
      {renderEffect()}

      <Animated.View style={[styles.bodyRoot, {
        transform: [
          { rotate: `${poseDef.bodyTilt}deg` },
          ...(typeof bodyBreathY === 'number' ? [] : [{ translateY: bodyBreathY }]),
        ],
      }]}>
        {/* Head */}
        <View style={[styles.head, {
          width: headSize,
          height: headSize,
          borderRadius: headSize / 2,
          backgroundColor: colors.skin,
          top: -headSize * 0.8,
          transform: [{ rotate: `${poseDef.headTilt}deg` }],
        }]}>
          {renderHeadDecor()}
          {/* Eyes */}
          <View style={[styles.eye, { left: headSize * 0.25, top: headSize * 0.35, width: 3 * scale, height: 3 * scale, borderRadius: 1.5 * scale }]} />
          <View style={[styles.eye, { right: headSize * 0.25, top: headSize * 0.35, width: 3 * scale, height: 3 * scale, borderRadius: 1.5 * scale }]} />
          {/* Mouth — changes with pose */}
          {(pose === 'hit' || pose === 'ko') ? (
            <View style={{ position: 'absolute', bottom: headSize * 0.15, left: headSize * 0.3, right: headSize * 0.3, height: 3 * scale, backgroundColor: '#333', borderRadius: 2 }} />
          ) : (pose.includes('special') || pose === 'ultimate') ? (
            <View style={{ position: 'absolute', bottom: headSize * 0.12, left: headSize * 0.25, right: headSize * 0.25, height: 4 * scale, backgroundColor: '#333', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 }} />
          ) : null}
        </View>

        {/* Torso */}
        <View style={[styles.torso, {
          width: bodyW,
          height: bodyH,
          backgroundColor: colors.primary,
          borderRadius: 4 * scale,
        }]}>
          {/* Belt */}
          <View style={{
            position: 'absolute',
            bottom: 2 * scale,
            left: 0,
            right: 0,
            height: 3 * scale,
            backgroundColor: colors.belt,
          }} />
        </View>

        {/* Left Arm */}
        <View style={[styles.limbPivot, {
          top: 2 * scale,
          left: -limbW / 2,
          transform: [{ rotate: `${poseDef.leftArmUpper}deg` }],
        }]}>
          <View style={[styles.limb, {
            width: limbW,
            height: armLen,
            backgroundColor: colors.primary,
            borderRadius: limbW / 2,
          }]} />
          {/* Forearm */}
          <View style={[styles.limbPivot, {
            top: armLen - 2,
            left: 0,
            transform: [{ rotate: `${poseDef.leftArmLower}deg` }],
          }]}>
            <View style={[styles.limb, {
              width: limbW,
              height: armLen * 0.9,
              backgroundColor: colors.skin,
              borderRadius: limbW / 2,
            }]} />
            {/* Fist */}
            <View style={{
              position: 'absolute',
              top: armLen * 0.8,
              left: -1,
              width: limbW + 2,
              height: limbW + 2,
              borderRadius: (limbW + 2) / 2,
              backgroundColor: characterId === 'tiger' ? '#FFF' : colors.skin,
              borderWidth: characterId === 'tiger' ? 1 : 0,
              borderColor: colors.belt,
            }} />
          </View>
        </View>

        {/* Right Arm */}
        <View style={[styles.limbPivot, {
          top: 2 * scale,
          right: -limbW / 2,
          transform: [{ rotate: `${poseDef.rightArmUpper}deg` }],
        }]}>
          <View style={[styles.limb, {
            width: limbW,
            height: armLen,
            backgroundColor: colors.primary,
            borderRadius: limbW / 2,
          }]} />
          <View style={[styles.limbPivot, {
            top: armLen - 2,
            left: 0,
            transform: [{ rotate: `${poseDef.rightArmLower}deg` }],
          }]}>
            <View style={[styles.limb, {
              width: limbW,
              height: armLen * 0.9,
              backgroundColor: colors.skin,
              borderRadius: limbW / 2,
            }]} />
            <View style={{
              position: 'absolute',
              top: armLen * 0.8,
              left: -1,
              width: limbW + 2,
              height: limbW + 2,
              borderRadius: (limbW + 2) / 2,
              backgroundColor: characterId === 'tiger' ? '#FFF' : colors.skin,
              borderWidth: characterId === 'tiger' ? 1 : 0,
              borderColor: colors.belt,
            }} />
          </View>
        </View>

        {/* Left Leg */}
        <View style={[styles.limbPivot, {
          top: bodyH - 2,
          left: bodyW * 0.15,
          transform: [{ rotate: `${poseDef.leftLegUpper + (moving ? 20 : 0)}deg` }],
        }]}>
          <View style={[styles.limb, {
            width: limbW + 1,
            height: legLen,
            backgroundColor: colors.secondary,
            borderRadius: limbW / 2,
          }]} />
          <View style={[styles.limbPivot, {
            top: legLen - 2,
            left: 0,
            transform: [{ rotate: `${poseDef.leftLegLower}deg` }],
          }]}>
            <View style={[styles.limb, {
              width: limbW + 1,
              height: legLen * 0.85,
              backgroundColor: colors.secondary,
              borderRadius: limbW / 2,
            }]} />
            {/* Foot */}
            <View style={{
              position: 'absolute',
              top: legLen * 0.75,
              left: -2,
              width: limbW + 5,
              height: 4 * scale,
              backgroundColor: '#333',
              borderRadius: 2,
            }} />
          </View>
        </View>

        {/* Right Leg */}
        <View style={[styles.limbPivot, {
          top: bodyH - 2,
          right: bodyW * 0.15,
          transform: [{ rotate: `${poseDef.rightLegUpper + (moving ? -20 : 0)}deg` }],
        }]}>
          <View style={[styles.limb, {
            width: limbW + 1,
            height: legLen,
            backgroundColor: colors.secondary,
            borderRadius: limbW / 2,
          }]} />
          <View style={[styles.limbPivot, {
            top: legLen - 2,
            left: 0,
            transform: [{ rotate: `${poseDef.rightLegLower}deg` }],
          }]}>
            <View style={[styles.limb, {
              width: limbW + 1,
              height: legLen * 0.85,
              backgroundColor: colors.secondary,
              borderRadius: limbW / 2,
            }]} />
            <View style={{
              position: 'absolute',
              top: legLen * 0.75,
              left: -2,
              width: limbW + 5,
              height: 4 * scale,
              backgroundColor: '#333',
              borderRadius: 2,
            }} />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  spriteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyRoot: {
    alignItems: 'center',
    position: 'relative',
  },
  head: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 10,
    overflow: 'visible',
  },
  eye: {
    position: 'absolute',
    backgroundColor: '#111',
  },
  torso: {
    overflow: 'hidden',
  },
  limbPivot: {
    position: 'absolute',
    transformOrigin: 'top center',
  },
  limb: {},
  effectAura: {
    position: 'absolute',
    borderWidth: 3,
    opacity: 0.4,
    zIndex: -1,
  },
  effectGlow: {
    position: 'absolute',
    zIndex: -1,
  },
});
