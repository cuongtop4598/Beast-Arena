import * as Haptics from 'expo-haptics';

export type HapticEventType =
  | 'light_hit'
  | 'heavy_hit'
  | 'block'
  | 'counter'
  | 'special'
  | 'ultimate'
  | 'ko';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HapticFeedback {
  private enabled: boolean = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  async trigger(type: HapticEventType): Promise<void> {
    if (!this.enabled) return;

    try {
      switch (type) {
        case 'light_hit':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'heavy_hit':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'block':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'counter':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await delay(50);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'special':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'ultimate':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'ko':
          // Triple heavy impact pattern
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await delay(100);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await delay(100);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    } catch {
      // Haptics not available on this device — silently ignore
    }
  }
}
