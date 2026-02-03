import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

export type ActionType = 'attack' | 'block' | 'jump';

interface ActionButtonsProps {
  onAction: (action: ActionType) => void;
}

interface ButtonConfig {
  action: ActionType;
  icon: string;
  label: string;
  color: string;
  offsetX: number;
  offsetY: number;
}

const BUTTONS: ButtonConfig[] = [
  { action: 'attack', icon: '⚔️', label: 'ATK', color: '#FF6B35', offsetX: -70, offsetY: 0 },
  { action: 'block', icon: '🛡️', label: 'DEF', color: '#3B82F6', offsetX: 0, offsetY: 50 },
  { action: 'jump', icon: '⬆️', label: 'JMP', color: '#22C55E', offsetX: 0, offsetY: -50 },
];

const BUTTON_SIZE = 56;

const ActionButton: React.FC<{ config: ButtonConfig; onPress: () => void }> = ({ config, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, friction: 5 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  };

  return (
    <Animated.View
      style={[
        styles.buttonWrapper,
        {
          right: -config.offsetX,
          bottom: -config.offsetY,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.button, { borderColor: config.color }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>{config.icon}</Text>
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onAction }) => {
  return (
    <View style={styles.container}>
      {BUTTONS.map((btn) => (
        <ActionButton key={btn.action} config={btn} onPress={() => onAction(btn.action)} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  buttonWrapper: {
    position: 'absolute',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 1,
  },
});
