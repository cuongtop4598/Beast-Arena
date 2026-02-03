import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VirtualJoystick, JoystickDirection } from './VirtualJoystick';
import { ActionButtons, ActionType } from './ActionButtons';
import { SpecialSkillButtons, SkillSlot } from './SpecialSkillButtons';
import { UltimateButton } from './UltimateButton';

export type ControlInput =
  | { type: 'move'; direction: JoystickDirection }
  | { type: 'move_stop' }
  | { type: 'action'; action: ActionType }
  | { type: 'special'; skillId: string }
  | { type: 'ultimate' };

interface ControlsOverlayProps {
  skills: SkillSlot[];
  ultGauge: number;
  onInput: (input: ControlInput) => void;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  skills,
  ultGauge,
  onInput,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Joystick - Bottom Left */}
      <View style={styles.joystickArea}>
        <VirtualJoystick
          onMove={(direction) => onInput({ type: 'move', direction })}
          onRelease={() => onInput({ type: 'move_stop' })}
        />
      </View>

      {/* Action Buttons - Bottom Right */}
      <View style={styles.actionArea}>
        <ActionButtons onAction={(action) => onInput({ type: 'action', action })} />
      </View>

      {/* Special Skills - Right Center */}
      <View style={styles.skillsArea}>
        <SpecialSkillButtons
          skills={skills}
          onActivate={(skillId) => onInput({ type: 'special', skillId })}
        />
      </View>

      {/* Ultimate - Bottom Center */}
      <View style={styles.ultimateArea}>
        <UltimateButton
          gaugePercent={ultGauge}
          onActivate={() => onInput({ type: 'ultimate' })}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  joystickArea: {
    position: 'absolute',
    left: 20,
    bottom: 20,
  },
  actionArea: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
  skillsArea: {
    position: 'absolute',
    right: 12,
    top: '30%',
  },
  ultimateArea: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -32,
  },
});
