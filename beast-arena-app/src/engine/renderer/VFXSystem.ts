/**
 * VFXSystem — Hand-drawn frame-by-frame spritesheet VFX player.
 *
 * Plays frame-by-frame animations from spritesheets for hit effects,
 * special move VFX, ultimate animations, etc.
 *
 * Architecture:
 * - VFX definitions describe spritesheet layout and playback settings
 * - Active VFX instances are spawned at positions and auto-cleanup on complete
 * - Supports tint, scale, rotation, speed multiplier, and flip
 * - All rendering happens inside the WebView PixiJS context
 */

import type { VFXSpawnCommand } from './BridgeTypes';

// ─── VFX Definition Types ───

export interface VFXDefinition {
  /** Unique key to reference this VFX */
  key: string;
  /** Spritesheet texture URL or asset key */
  textureUrl: string;
  /** Number of frames in the spritesheet */
  frameCount: number;
  /** Frames per row in the spritesheet (for grid layout) */
  framesPerRow: number;
  /** Individual frame width in pixels */
  frameWidth: number;
  /** Individual frame height in pixels */
  frameHeight: number;
  /** Playback speed in frames per second */
  fps: number;
  /** Whether the animation should loop */
  loop: boolean;
  /** Anchor point (0-1) */
  anchorX: number;
  anchorY: number;
  /** Blend mode */
  blendMode?: string;
  /** Default scale */
  defaultScale?: number;
}

/** Pre-configured VFX definitions for all game effects */
export const VFX_DEFINITIONS: VFXDefinition[] = [
  // Hit effects
  {
    key: 'hit_slash',
    textureUrl: 'assets/vfx/hit_slash.png',
    frameCount: 6,
    framesPerRow: 6,
    frameWidth: 128,
    frameHeight: 128,
    fps: 24,
    loop: false,
    anchorX: 0.5,
    anchorY: 0.5,
  },
  {
    key: 'hit_impact',
    textureUrl: 'assets/vfx/hit_impact.png',
    frameCount: 8,
    framesPerRow: 4,
    frameWidth: 96,
    frameHeight: 96,
    fps: 30,
    loop: false,
    anchorX: 0.5,
    anchorY: 0.5,
    blendMode: 'add',
  },
  {
    key: 'hit_heavy',
    textureUrl: 'assets/vfx/hit_heavy.png',
    frameCount: 10,
    framesPerRow: 5,
    frameWidth: 192,
    frameHeight: 192,
    fps: 24,
    loop: false,
    anchorX: 0.5,
    anchorY: 0.5,
    blendMode: 'add',
  },
  // Special effects
  {
    key: 'fire_burst',
    textureUrl: 'assets/vfx/fire_burst.png',
    frameCount: 12,
    framesPerRow: 4,
    frameWidth: 128,
    frameHeight: 128,
    fps: 20,
    loop: false,
    anchorX: 0.5,
    anchorY: 0.5,
    blendMode: 'add',
  },
  {
    key: 'energy_wave',
    textureUrl: 'assets/vfx/energy_wave.png',
    frameCount: 8,
    framesPerRow: 4,
    frameWidth: 256,
    frameHeight: 128,
    fps: 18,
    loop: false,
    anchorX: 0.0,
    anchorY: 0.5,
  },
  {
    key: 'dust_cloud',
    textureUrl: 'assets/vfx/dust_cloud.png',
    frameCount: 8,
    framesPerRow: 4,
    frameWidth: 64,
    frameHeight: 64,
    fps: 16,
    loop: false,
    anchorX: 0.5,
    anchorY: 1.0,
    defaultScale: 0.8,
  },
  {
    key: 'ko_explosion',
    textureUrl: 'assets/vfx/ko_explosion.png',
    frameCount: 16,
    framesPerRow: 4,
    frameWidth: 256,
    frameHeight: 256,
    fps: 24,
    loop: false,
    anchorX: 0.5,
    anchorY: 0.5,
    blendMode: 'add',
  },
  // Ultimate VFX
  {
    key: 'ultimate_aura',
    textureUrl: 'assets/vfx/ultimate_aura.png',
    frameCount: 12,
    framesPerRow: 4,
    frameWidth: 256,
    frameHeight: 256,
    fps: 16,
    loop: true,
    anchorX: 0.5,
    anchorY: 0.5,
    blendMode: 'add',
    defaultScale: 1.5,
  },
  // Landing / movement
  {
    key: 'land_dust',
    textureUrl: 'assets/vfx/land_dust.png',
    frameCount: 6,
    framesPerRow: 6,
    frameWidth: 96,
    frameHeight: 48,
    fps: 20,
    loop: false,
    anchorX: 0.5,
    anchorY: 1.0,
  },
  {
    key: 'dash_trail',
    textureUrl: 'assets/vfx/dash_trail.png',
    frameCount: 4,
    framesPerRow: 4,
    frameWidth: 128,
    frameHeight: 64,
    fps: 24,
    loop: false,
    anchorX: 0.0,
    anchorY: 0.5,
  },
];

// ─── WebView-side VFX System Code ───

/**
 * Returns the JavaScript source code for the VFXSystem class
 * that runs inside the WebView.
 */
export function getVFXSystemSource(): string {
  return `
class VFXSystem {
  constructor(app) {
    this.app = app;
    this.container = new PIXI.Container();
    this.container.label = 'vfx-layer';
    this.activeEffects = new Map(); // id → effect instance
    this.definitions = new Map();   // key → VFX definition
    this.textures = new Map();      // key → frame textures array
  }

  /**
   * Register VFX definitions
   */
  registerDefinitions(defs) {
    for (const def of defs) {
      this.definitions.set(def.key, def);
    }
  }

  /**
   * Preload textures for a VFX definition.
   * Creates frame textures from the spritesheet.
   */
  async preload(key) {
    const def = this.definitions.get(key);
    if (!def || this.textures.has(key)) return;

    try {
      const baseTexture = await PIXI.Assets.load(def.textureUrl);
      const frames = [];

      for (let i = 0; i < def.frameCount; i++) {
        const col = i % def.framesPerRow;
        const row = Math.floor(i / def.framesPerRow);
        const rect = new PIXI.Rectangle(
          col * def.frameWidth,
          row * def.frameHeight,
          def.frameWidth,
          def.frameHeight
        );
        frames.push(new PIXI.Texture({ source: baseTexture.source, frame: rect }));
      }

      this.textures.set(key, frames);
    } catch (err) {
      console.warn('[VFXSystem] Failed to preload:', key, err);
      // Create placeholder frames
      this._createPlaceholderFrames(key, def);
    }
  }

  _createPlaceholderFrames(key, def) {
    // Generate simple placeholder VFX frames using graphics
    const frames = [];
    const canvas = document.createElement('canvas');
    canvas.width = def.frameWidth * def.framesPerRow;
    canvas.height = def.frameHeight * Math.ceil(def.frameCount / def.framesPerRow);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < def.frameCount; i++) {
      const col = i % def.framesPerRow;
      const row = Math.floor(i / def.framesPerRow);
      const cx = col * def.frameWidth + def.frameWidth / 2;
      const cy = row * def.frameHeight + def.frameHeight / 2;
      const progress = i / def.frameCount;

      // Draw expanding circle that fades out
      ctx.save();
      const radius = (def.frameWidth / 2) * (0.2 + progress * 0.8);
      const alpha = 1 - progress * 0.8;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      // Inner bright core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const baseTexture = PIXI.Texture.from(canvas);
    for (let i = 0; i < def.frameCount; i++) {
      const col = i % def.framesPerRow;
      const row = Math.floor(i / def.framesPerRow);
      const rect = new PIXI.Rectangle(
        col * def.frameWidth,
        row * def.frameHeight,
        def.frameWidth,
        def.frameHeight
      );
      frames.push(new PIXI.Texture({ source: baseTexture.source, frame: rect }));
    }

    this.textures.set(key, frames);
  }

  /**
   * Preload all registered definitions
   */
  async preloadAll() {
    const promises = [];
    for (const [key] of this.definitions) {
      promises.push(this.preload(key));
    }
    await Promise.all(promises);
  }

  /**
   * Spawn a VFX effect
   */
  spawn(command) {
    const def = this.definitions.get(command.key);
    if (!def) {
      console.warn('[VFXSystem] Unknown VFX key:', command.key);
      return;
    }

    let frames = this.textures.get(command.key);
    if (!frames) {
      // Try to create placeholder on the fly
      this._createPlaceholderFrames(command.key, def);
      frames = this.textures.get(command.key);
      if (!frames) return;
    }

    const sprite = new PIXI.AnimatedSprite(frames);
    sprite.anchor.set(def.anchorX, def.anchorY);
    sprite.position.set(command.position.x, command.position.y);
    sprite.animationSpeed = (command.speed || 1.0) * (def.fps / 60);
    sprite.loop = def.loop;
    sprite.scale.set(
      (command.scale || def.defaultScale || 1) * (command.flipX ? -1 : 1),
      command.scale || def.defaultScale || 1
    );

    if (command.rotation) {
      sprite.rotation = command.rotation;
    }

    if (command.tint != null) {
      sprite.tint = command.tint;
    }

    if (def.blendMode) {
      sprite.blendMode = def.blendMode;
    }

    // Auto-remove on complete (unless looping)
    if (!def.loop) {
      sprite.onComplete = () => {
        this.remove(command.id);
        // Notify RN
        sendToRN({ type: 'vfxComplete', id: command.id });
      };
    }

    sprite.play();
    this.container.addChild(sprite);
    this.activeEffects.set(command.id, { sprite, def, command });
  }

  /**
   * Remove an active VFX effect
   */
  remove(id) {
    const effect = this.activeEffects.get(id);
    if (effect) {
      effect.sprite.stop();
      this.container.removeChild(effect.sprite);
      effect.sprite.destroy();
      this.activeEffects.delete(id);
    }
  }

  /**
   * Remove all active VFX
   */
  clear() {
    for (const [id] of this.activeEffects) {
      this.remove(id);
    }
  }

  /**
   * Update (called each frame)
   */
  update(deltaTime) {
    // AnimatedSprite handles its own frame advancement
    // Additional logic (particle movement, etc.) can go here
  }

  /**
   * Destroy the VFX system
   */
  destroy() {
    this.clear();
    this.container.destroy({ children: true });
    this.textures.clear();
    this.definitions.clear();
  }
}
`;
}
