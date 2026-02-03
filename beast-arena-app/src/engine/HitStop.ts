/**
 * HitStop - Frame freeze effect on impact.
 * Pauses game loop for N frames to add weight to attacks.
 */

export const HITSTOP_PRESETS: Record<string, number> = {
  light_hit: 0,
  heavy_hit: 3,
  block: 1,
  counter: 2,
  special: 4,
  ultimate: 10,
  ko: 5,
};

export class HitStop {
  private freezeFrames: number = 0;
  private enabled: boolean = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Trigger a frame freeze.
   * @param frames Number of frames to freeze (at 60fps, 3 frames ≈ 50ms)
   */
  trigger(frames: number): void {
    if (!this.enabled) return;
    // Take the larger freeze if already frozen
    this.freezeFrames = Math.max(this.freezeFrames, frames);
  }

  /**
   * Trigger from a preset name.
   */
  triggerPreset(type: string): void {
    const frames = HITSTOP_PRESETS[type] ?? 0;
    if (frames > 0) {
      this.trigger(frames);
    }
  }

  /**
   * Called every frame by the game loop.
   * @returns true if the game should PAUSE this frame
   */
  shouldPause(): boolean {
    return this.freezeFrames > 0;
  }

  /**
   * Consume one freeze frame. Call this every frame.
   */
  update(): void {
    if (this.freezeFrames > 0) {
      this.freezeFrames--;
    }
  }

  /**
   * Current remaining freeze frames.
   */
  get remaining(): number {
    return this.freezeFrames;
  }

  /**
   * Force clear all freeze.
   */
  clear(): void {
    this.freezeFrames = 0;
  }
}
