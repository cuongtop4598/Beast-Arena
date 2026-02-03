import { Animated } from 'react-native';

export interface ShakePreset {
  intensity: number; // max pixel offset
  duration: number; // ms
}

export const SHAKE_PRESETS: Record<string, ShakePreset> = {
  light_hit: { intensity: 2, duration: 100 },
  heavy_hit: { intensity: 6, duration: 200 },
  block: { intensity: 1, duration: 80 },
  special: { intensity: 8, duration: 300 },
  ultimate: { intensity: 12, duration: 500 },
  ko: { intensity: 15, duration: 800 },
};

export class ScreenShake {
  public shakeX: Animated.Value;
  public shakeY: Animated.Value;
  private enabled: boolean = true;
  private shaking: boolean = false;

  constructor() {
    this.shakeX = new Animated.Value(0);
    this.shakeY = new Animated.Value(0);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  trigger(preset: string | ShakePreset): void {
    if (!this.enabled || this.shaking) return;

    const config: ShakePreset =
      typeof preset === 'string'
        ? SHAKE_PRESETS[preset] || SHAKE_PRESETS.light_hit
        : preset;

    this.shaking = true;
    const { intensity, duration } = config;
    const steps = Math.floor(duration / 30); // ~30ms per shake step
    const stepDuration = duration / steps;

    const animations: Animated.CompositeAnimation[] = [];

    for (let i = 0; i < steps; i++) {
      const decay = 1 - i / steps; // linear decay
      const offsetX = (Math.random() * 2 - 1) * intensity * decay;
      const offsetY = (Math.random() * 2 - 1) * intensity * decay;

      animations.push(
        Animated.parallel([
          Animated.timing(this.shakeX, {
            toValue: offsetX,
            duration: stepDuration,
            useNativeDriver: true,
          }),
          Animated.timing(this.shakeY, {
            toValue: offsetY,
            duration: stepDuration,
            useNativeDriver: true,
          }),
        ])
      );
    }

    // Return to center
    animations.push(
      Animated.parallel([
        Animated.timing(this.shakeX, { toValue: 0, duration: 30, useNativeDriver: true }),
        Animated.timing(this.shakeY, { toValue: 0, duration: 30, useNativeDriver: true }),
      ])
    );

    Animated.sequence(animations).start(() => {
      this.shaking = false;
    });
  }

  /**
   * Get transform style to apply to a container View
   */
  getTransformStyle() {
    return {
      transform: [
        { translateX: this.shakeX },
        { translateY: this.shakeY },
      ],
    };
  }
}
