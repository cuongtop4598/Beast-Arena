import { HapticFeedback, HapticEventType } from './HapticFeedback';
import { ScreenShake } from './ScreenShake';
import { HitStop } from './HitStop';

// --- Types ---

export type FeedbackEventType =
  | 'light_hit'
  | 'heavy_hit'
  | 'block'
  | 'counter'
  | 'special'
  | 'ultimate'
  | 'ko'
  | 'combo';

export interface FeedbackEvent {
  type: FeedbackEventType;
  intensity: number; // 0-1 (used for scaling effects)
  position?: { x: number; y: number };
}

export interface FeedbackManagerConfig {
  hapticEnabled: boolean;
  shakeEnabled: boolean;
  hitStopEnabled: boolean;
}

// --- Manager ---

export class FeedbackManager {
  private haptic: HapticFeedback;
  private shake: ScreenShake;
  private hitStop: HitStop;
  private config: FeedbackManagerConfig;

  constructor(
    haptic: HapticFeedback,
    shake: ScreenShake,
    hitStop: HitStop,
    config?: Partial<FeedbackManagerConfig>
  ) {
    this.haptic = haptic;
    this.shake = shake;
    this.hitStop = hitStop;
    this.config = {
      hapticEnabled: true,
      shakeEnabled: true,
      hitStopEnabled: true,
      ...config,
    };
  }

  /**
   * Trigger feedback for a game event.
   * Coordinates all subsystems (haptic + shake + hitstop).
   */
  triggerFeedback(event: FeedbackEvent): void {
    const { type, intensity } = event;

    // Haptic
    if (this.config.hapticEnabled && type !== 'combo') {
      this.haptic.trigger(type as HapticEventType);
    }

    // Screen shake
    if (this.config.shakeEnabled) {
      if (type === 'combo') {
        // Scale shake by combo intensity
        this.shake.trigger({
          intensity: 3 + intensity * 10,
          duration: 100 + intensity * 200,
        });
      } else {
        this.shake.trigger(type);
      }
    }

    // Hit stop
    if (this.config.hitStopEnabled) {
      this.hitStop.triggerPreset(type);
    }
  }

  /**
   * Quick trigger for common events.
   */
  lightHit(position?: { x: number; y: number }) {
    this.triggerFeedback({ type: 'light_hit', intensity: 0.2, position });
  }

  heavyHit(position?: { x: number; y: number }) {
    this.triggerFeedback({ type: 'heavy_hit', intensity: 0.5, position });
  }

  blocked(position?: { x: number; y: number }) {
    this.triggerFeedback({ type: 'block', intensity: 0.3, position });
  }

  specialHit(position?: { x: number; y: number }) {
    this.triggerFeedback({ type: 'special', intensity: 0.7, position });
  }

  ultimateHit(position?: { x: number; y: number }) {
    this.triggerFeedback({ type: 'ultimate', intensity: 1.0, position });
  }

  knockout(position?: { x: number; y: number }) {
    this.triggerFeedback({ type: 'ko', intensity: 1.0, position });
  }

  comboHit(comboIntensity: number, position?: { x: number; y: number }) {
    this.triggerFeedback({ type: 'combo', intensity: comboIntensity, position });
  }

  /**
   * Update config at runtime.
   */
  setConfig(config: Partial<FeedbackManagerConfig>) {
    Object.assign(this.config, config);
    this.haptic.setEnabled(this.config.hapticEnabled);
    this.shake.setEnabled(this.config.shakeEnabled);
    this.hitStop.setEnabled(this.config.hitStopEnabled);
  }

  /**
   * Get the ScreenShake instance (for applying transforms to views).
   */
  getScreenShake(): ScreenShake {
    return this.shake;
  }

  /**
   * Get the HitStop instance (for game loop integration).
   */
  getHitStop(): HitStop {
    return this.hitStop;
  }
}
