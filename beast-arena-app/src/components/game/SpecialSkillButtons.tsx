import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

export interface SkillSlot {
  id: string;
  name: string;
  icon: string;
  cooldownTotal: number; // total cooldown in seconds
  cooldownRemaining: number; // remaining cooldown in seconds (0 = ready)
}

interface SpecialSkillButtonsProps {
  skills: SkillSlot[];
  onActivate: (skillId: string) => void;
}

const SKILL_SIZE = 48;

const SkillButton: React.FC<{ skill: SkillSlot; onPress: () => void }> = ({ skill, onPress }) => {
  const isOnCooldown = skill.cooldownRemaining > 0;
  const cooldownPct = skill.cooldownTotal > 0 ? skill.cooldownRemaining / skill.cooldownTotal : 0;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOnCooldown) {
      // Subtle pulse when ready
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnCooldown]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[styles.skillBtn, isOnCooldown && styles.skillBtnDisabled]}
        onPress={onPress}
        disabled={isOnCooldown}
        activeOpacity={0.7}
      >
        <Text style={styles.skillIcon}>{skill.icon}</Text>
        {isOnCooldown && (
          <View style={styles.cooldownOverlay}>
            {/* Simple cooldown fill from bottom */}
            <View style={[styles.cooldownFill, { height: `${cooldownPct * 100}%` }]} />
            <Text style={styles.cooldownText}>{Math.ceil(skill.cooldownRemaining)}s</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export const SpecialSkillButtons: React.FC<SpecialSkillButtonsProps> = ({ skills, onActivate }) => {
  return (
    <View style={styles.container}>
      {skills.slice(0, 4).map((skill) => (
        <SkillButton key={skill.id} skill={skill} onPress={() => onActivate(skill.id)} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
    opacity: 0.6,
  },
  skillBtn: {
    width: SKILL_SIZE,
    height: SKILL_SIZE,
    borderRadius: SKILL_SIZE / 2,
    backgroundColor: 'rgba(26, 26, 46, 0.8)',
    borderWidth: 2,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  skillBtnDisabled: {
    borderColor: '#555',
  },
  skillIcon: {
    fontSize: 20,
  },
  cooldownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cooldownFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  cooldownText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
