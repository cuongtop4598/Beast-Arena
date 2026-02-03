/**
 * SlowMotion - Temporarily reduces game speed for dramatic effect.
 * Used during ultimates and KO moments.
 */

export class SlowMotion {
  private targetScale: number = 1.0;
  private currentScale: number = 1.0;
  private remainingMs: number = 0;
  private easeInMs: number = 100;
  private easeOutMs: number = 200;
  private totalDuration: number = 0;
  private elapsedMs: number = 0;
  private active: boolean = false;

  /**
   * Trigger slow-motion effect.
   * @param durationMs Total duration of the slow-mo (including ease in/out)
   * @param timeScale Target speed (0.3 = 30% speed, very slow)
   */
  trigger(durationMs: number, timeScale: number = 0.3): void {
    this.targetScale = timeScale;
    this.totalDuration = durationMs;
    this.remainingMs = durationMs;
    this.elapsedMs = 0;
    this.active = true;
  }

  /**
   * Update slow-motion state. Call every frame with real delta time.
   * @param dtMs Real (unscaled) delta time in milliseconds
   */
  update(dtMs: number): void {
    if (!this.active) {
      this.currentScale = 1.0;
      return;
    }

    this.elapsedMs += dtMs;
    this.remainingMs -= dtMs;

    if (this.remainingMs <= 0) {
      // Done
      this.active = false;
      this.currentScale = 1.0;
      return;
    }

    // Ease in (first easeInMs)
    if (this.elapsedMs < this.easeInMs) {
      const t = this.elapsedMs / this.easeInMs;
      this.currentScale = lerp(1.0, this.targetScale, easeOutCubic(t));
    }
    // Ease out (last easeOutMs)
    else if (this.remainingMs < this.easeOutMs) {
      const t = this.remainingMs / this.easeOutMs;
      this.currentScale = lerp(1.0, this.targetScale, easeOutCubic(t));
    }
    // Sustain
    else {
      this.currentScale = this.targetScale;
    }
  }

  /**
   * Get the current time scale multiplier.
   * Multiply your game delta time by this value.
   */
  getTimeScale(): number {
    return this.currentScale;
  }

  /**
   * Whether slow-mo is currently active.
   */
  isActive(): boolean {
    return this.active;
  }

  /**
   * Force cancel slow-mo.
   */
  cancel(): void {
    this.active = false;
    this.currentScale = 1.0;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
