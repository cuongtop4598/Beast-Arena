// ─── Frame-by-Frame Spritesheet VFX System ───

export type VFXElement = 'fire' | 'lightning' | 'water' | 'wind' | 'neutral';

export interface VFXDefinition {
  name: string;
  element: VFXElement;
  spritesheet: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
  scale: number;
  blendMode: 'normal' | 'additive' | 'multiply';
}

export interface VFXInstance {
  id: number;
  definition: VFXDefinition;
  x: number;
  y: number;
  currentFrame: number;
  elapsed: number;
  flipX: boolean;
  alpha: number;
  rotation: number;
  active: boolean;
}

// ─── Built-in VFX Presets ───

export const VFX_PRESETS: Record<string, Omit<VFXDefinition, 'spritesheet'>> = {
  fire_burst: {
    name: 'fire_burst', element: 'fire',
    frameWidth: 128, frameHeight: 128, frameCount: 12,
    fps: 24, loop: false, scale: 1.0, blendMode: 'additive',
  },
  lightning_strike: {
    name: 'lightning_strike', element: 'lightning',
    frameWidth: 64, frameHeight: 256, frameCount: 8,
    fps: 30, loop: false, scale: 1.0, blendMode: 'additive',
  },
  water_splash: {
    name: 'water_splash', element: 'water',
    frameWidth: 128, frameHeight: 128, frameCount: 10,
    fps: 20, loop: false, scale: 1.0, blendMode: 'normal',
  },
  wind_slash: {
    name: 'wind_slash', element: 'wind',
    frameWidth: 192, frameHeight: 64, frameCount: 8,
    fps: 24, loop: false, scale: 1.0, blendMode: 'additive',
  },
  hit_spark: {
    name: 'hit_spark', element: 'neutral',
    frameWidth: 64, frameHeight: 64, frameCount: 6,
    fps: 30, loop: false, scale: 0.8, blendMode: 'additive',
  },
};

/**
 * Spritesheet-based VFX player for Beast Arena.
 * Supports element-typed effects with frame-by-frame animation.
 */
export class VFXSystem {
  private instances: VFXInstance[] = [];
  private nextId: number = 0;
  private gl: WebGL2RenderingContext | null = null;
  private textureCache: Map<string, WebGLTexture> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /** Play a VFX effect at a position */
  playEffect(definition: VFXDefinition, x: number, y: number, flipX: boolean = false): number {
    const id = this.nextId++;
    this.instances.push({
      id, definition, x, y,
      currentFrame: 0, elapsed: 0,
      flipX, alpha: 1.0, rotation: 0,
      active: true,
    });
    return id;
  }

  /** Play a preset effect by name */
  playPreset(name: string, spritesheet: string, x: number, y: number, flipX?: boolean): number {
    const preset = VFX_PRESETS[name];
    if (!preset) {
      console.warn(`[VFXSystem] Unknown preset: ${name}`);
      return -1;
    }
    return this.playEffect({ ...preset, spritesheet }, x, y, flipX);
  }

  /** Update all active VFX instances */
  update(dt: number): void {
    for (const vfx of this.instances) {
      if (!vfx.active) continue;
      vfx.elapsed += dt;
      const frameDuration = 1.0 / vfx.definition.fps;
      vfx.currentFrame = Math.floor(vfx.elapsed / frameDuration);

      if (vfx.currentFrame >= vfx.definition.frameCount) {
        if (vfx.definition.loop) {
          vfx.currentFrame = 0;
          vfx.elapsed = 0;
        } else {
          vfx.active = false;
        }
      }
    }
    // Remove expired instances
    this.instances = this.instances.filter((v) => v.active);
  }

  /** Render all active VFX to WebGL */
  render(): void {
    if (!this.gl) return;
    for (const vfx of this.instances) {
      if (!vfx.active) continue;
      // In production: draw spritesheet frame at (x, y)
      // using currentFrame to compute UV coordinates:
      // u = (currentFrame * frameWidth) / sheetWidth
      // Apply blendMode, alpha, rotation, scale, flipX
    }
  }

  /** Cancel a specific effect */
  cancelEffect(id: number): void {
    const vfx = this.instances.find((v) => v.id === id);
    if (vfx) vfx.active = false;
  }

  /** Get count of active effects */
  getActiveCount(): number {
    return this.instances.filter((v) => v.active).length;
  }

  /** Clean up all effects */
  destroy(): void {
    this.instances = [];
    this.textureCache.clear();
    this.gl = null;
  }
}
