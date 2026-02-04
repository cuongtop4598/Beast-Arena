import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

/**
 * GameView — placeholder for future WebGL/PixiJS game canvas.
 * The actual fight rendering is now handled directly in fight.tsx
 * using FighterSprite + VirtualJoystick components.
 */
export default function GameView() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Game Canvas (Reserved for PixiJS WebGL)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#666',
    fontSize: 12,
  },
});
