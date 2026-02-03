/**
 * AudioManager — Howler.js-based audio engine for Beast Arena.
 * Supports BGM (looping), SFX (one-shot), UI sounds, volume control, mute toggle.
 * Works on web; on native, logs warnings gracefully.
 */

// Howler is web-only; we guard all usage behind a try/catch + platform check.
let Howl: any;
let Howler: any;
let howlerAvailable = false;

try {
  const howlerModule = require('howler');
  Howl = howlerModule.Howl;
  Howler = howlerModule.Howler;
  howlerAvailable = true;
} catch {
  // Howler not available (native environment) — audio will be no-op
}

// --- Asset path maps ---

const AUDIO_BASE = '/assets/audio';

const SFX_FILES: Record<string, string> = {
  hit_light: `${AUDIO_BASE}/sfx/hit_light.mp3`,
  hit_heavy: `${AUDIO_BASE}/sfx/hit_heavy.mp3`,
  block: `${AUDIO_BASE}/sfx/block.mp3`,
  combo_1: `${AUDIO_BASE}/sfx/combo_1.mp3`,
  combo_2: `${AUDIO_BASE}/sfx/combo_2.mp3`,
  combo_3: `${AUDIO_BASE}/sfx/combo_3.mp3`,
  combo_4: `${AUDIO_BASE}/sfx/combo_4.mp3`,
  combo_5: `${AUDIO_BASE}/sfx/combo_5.mp3`,
  ko: `${AUDIO_BASE}/sfx/ko.mp3`,
  round_start: `${AUDIO_BASE}/sfx/round_start.mp3`,
  supply_drop: `${AUDIO_BASE}/sfx/supply_drop.mp3`,
};

const BGM_FILES: Record<string, string> = {
  menu_theme: `${AUDIO_BASE}/bgm/menu_theme.mp3`,
  character_select: `${AUDIO_BASE}/bgm/character_select.mp3`,
  fight_theme: `${AUDIO_BASE}/bgm/fight_theme.mp3`,
  victory_theme: `${AUDIO_BASE}/bgm/victory_theme.mp3`,
};

const UI_FILES: Record<string, string> = {
  tap: `${AUDIO_BASE}/ui/tap.mp3`,
  navigate: `${AUDIO_BASE}/ui/navigate.mp3`,
  confirm: `${AUDIO_BASE}/ui/confirm.mp3`,
  cancel: `${AUDIO_BASE}/ui/cancel.mp3`,
};

// --- Types ---

export type SFXName = keyof typeof SFX_FILES;
export type BGMName = keyof typeof BGM_FILES;
export type UISound = keyof typeof UI_FILES;

// --- AudioManager singleton ---

class AudioManager {
  private sfxCache: Map<string, any> = new Map();
  private uiCache: Map<string, any> = new Map();
  private bgmCache: Map<string, any> = new Map();
  private currentBGM: any | null = null;
  private currentBGMName: string | null = null;

  private _masterVolume = 1.0;
  private _sfxVolume = 0.8;
  private _bgmVolume = 0.5;
  private _uiVolume = 0.7;
  private _muted = false;
  private _initialized = false;

  // --- Initialization ---

  /** Preload all audio assets (call once at app startup). No-op on native. */
  preloadAll(): void {
    if (!howlerAvailable) {
      console.log('[AudioManager] Howler not available — audio disabled (native env)');
      return;
    }
    if (this._initialized) return;
    this._initialized = true;

    try {
      Object.entries(SFX_FILES).forEach(([key, src]) => {
        this.sfxCache.set(key, new Howl({ src: [src], preload: true, volume: this._sfxVolume }));
      });
      Object.entries(UI_FILES).forEach(([key, src]) => {
        this.uiCache.set(key, new Howl({ src: [src], preload: true, volume: this._uiVolume }));
      });
      Object.entries(BGM_FILES).forEach(([key, src]) => {
        this.bgmCache.set(key, new Howl({ src: [src], preload: true, loop: true, volume: this._bgmVolume }));
      });
      console.log('[AudioManager] Preloaded all audio assets');
    } catch (e) {
      console.warn('[AudioManager] Preload error:', e);
    }
  }

  // --- SFX ---

  playSFX(name: string): void {
    if (this._muted || !howlerAvailable) return;
    const sound = this.sfxCache.get(name);
    if (sound) {
      sound.volume(this._sfxVolume * this._masterVolume);
      sound.play();
    }
  }

  /** Play combo SFX based on combo count (1-5) */
  playComboSFX(comboCount: number): void {
    const idx = Math.min(Math.max(comboCount, 1), 5);
    this.playSFX(`combo_${idx}`);
  }

  // --- UI Sounds ---

  playUI(name: string): void {
    if (this._muted || !howlerAvailable) return;
    const sound = this.uiCache.get(name);
    if (sound) {
      sound.volume(this._uiVolume * this._masterVolume);
      sound.play();
    }
  }

  // --- BGM ---

  playBGM(name: string): void {
    if (!howlerAvailable) return;
    if (this.currentBGMName === name && this.currentBGM?.playing()) return;

    this.stopBGM();

    const bgm = this.bgmCache.get(name);
    if (bgm) {
      bgm.volume(this._bgmVolume * this._masterVolume);
      if (!this._muted) {
        bgm.play();
      }
      this.currentBGM = bgm;
      this.currentBGMName = name;
    }
  }

  stopBGM(): void {
    if (this.currentBGM) {
      this.currentBGM.stop();
      this.currentBGM = null;
      this.currentBGMName = null;
    }
  }

  pauseBGM(): void {
    this.currentBGM?.pause();
  }

  resumeBGM(): void {
    if (!this._muted && this.currentBGM) {
      this.currentBGM.play();
    }
  }

  // --- Volume Control ---

  get masterVolume(): number { return this._masterVolume; }
  set masterVolume(v: number) {
    this._masterVolume = Math.max(0, Math.min(1, v));
    if (howlerAvailable && Howler) {
      Howler.volume(this._masterVolume);
    }
  }

  get sfxVolume(): number { return this._sfxVolume; }
  set sfxVolume(v: number) { this._sfxVolume = Math.max(0, Math.min(1, v)); }

  get bgmVolume(): number { return this._bgmVolume; }
  set bgmVolume(v: number) {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this.currentBGM) {
      this.currentBGM.volume(this._bgmVolume * this._masterVolume);
    }
  }

  get uiVolume(): number { return this._uiVolume; }
  set uiVolume(v: number) { this._uiVolume = Math.max(0, Math.min(1, v)); }

  // --- Mute ---

  get muted(): boolean { return this._muted; }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (howlerAvailable && Howler) {
      Howler.mute(this._muted);
    }
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (howlerAvailable && Howler) {
      Howler.mute(muted);
    }
  }

  // --- Cleanup ---

  dispose(): void {
    this.stopBGM();
    this.sfxCache.forEach((h) => h.unload());
    this.uiCache.forEach((h) => h.unload());
    this.bgmCache.forEach((h) => h.unload());
    this.sfxCache.clear();
    this.uiCache.clear();
    this.bgmCache.clear();
    this._initialized = false;
  }
}

/** Global singleton */
export const audioManager = new AudioManager();
export default audioManager;
