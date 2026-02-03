/**
 * ComboTracker - Tracks consecutive hits and combo damage.
 * Resets if no hit within the combo window (1.5s).
 */

export interface ComboState {
  hits: number;
  totalDamage: number;
  isActive: boolean;
  lastHitTime: number;
}

const COMBO_WINDOW_MS = 1500; // 1.5 seconds between hits to keep combo alive

export class ComboTracker {
  private hits: number = 0;
  private totalDamage: number = 0;
  private lastHitTime: number = 0;
  private active: boolean = false;
  private onComboUpdate?: (state: ComboState) => void;

  constructor(onComboUpdate?: (state: ComboState) => void) {
    this.onComboUpdate = onComboUpdate;
  }

  /**
   * Register a hit in the combo.
   * @param damage Damage dealt by this hit
   * @returns Current combo state
   */
  registerHit(damage: number): ComboState {
    const now = Date.now();

    // Check if combo window expired
    if (this.active && now - this.lastHitTime > COMBO_WINDOW_MS) {
      this.reset();
    }

    this.hits++;
    this.totalDamage += damage;
    this.lastHitTime = now;
    this.active = true;

    const state = this.getState();
    this.onComboUpdate?.(state);
    return state;
  }

  /**
   * Update — call periodically to check for combo timeout.
   */
  update(): void {
    if (!this.active) return;

    const now = Date.now();
    if (now - this.lastHitTime > COMBO_WINDOW_MS) {
      this.reset();
    }
  }

  /**
   * Reset the combo counter.
   */
  reset(): void {
    this.hits = 0;
    this.totalDamage = 0;
    this.active = false;
    this.onComboUpdate?.(this.getState());
  }

  /**
   * Get current combo state.
   */
  getState(): ComboState {
    return {
      hits: this.hits,
      totalDamage: this.totalDamage,
      isActive: this.active,
      lastHitTime: this.lastHitTime,
    };
  }

  /**
   * Get feedback intensity based on combo length (0-1).
   * Higher combos = stronger feedback.
   */
  getFeedbackIntensity(): number {
    return Math.min(this.hits / 10, 1.0);
  }

  /**
   * Whether this is a notable combo (3+ hits).
   */
  isNotable(): boolean {
    return this.hits >= 3;
  }

  get currentHits(): number {
    return this.hits;
  }

  get currentDamage(): number {
    return this.totalDamage;
  }
}
