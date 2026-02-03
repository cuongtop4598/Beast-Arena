// ─── Parallax Scrolling Background ───

export interface ParallaxLayer {
  id: string;
  imageUrl: string;
  speedMultiplier: number; // 0.0 = static, 1.0 = full camera speed
  y: number;
  width: number;
  height: number;
  repeatX: boolean;
  alpha: number;
  tint: number;
  loaded: boolean;
}

export interface ParallaxConfig {
  canvasWidth: number;
  canvasHeight: number;
}

const DEFAULT_CONFIG: ParallaxConfig = {
  canvasWidth: 1280,
  canvasHeight: 720,
};

/**
 * Multi-layer parallax scrolling for Beast Arena stages.
 * Supports 3-4 layers with independent speed multipliers.
 * Layers are rendered back-to-front (index 0 = farthest).
 */
export class ParallaxBackground {
  private layers: ParallaxLayer[] = [];
  private cameraX: number = 0;
  private gl: WebGL2RenderingContext | null = null;
  private config: ParallaxConfig;
  private textureCache: Map<string, WebGLTexture> = new Map();

  constructor(gl: WebGL2RenderingContext, config: Partial<ParallaxConfig> = {}) {
    this.gl = gl;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Add a parallax layer (ordered back-to-front) */
  addLayer(
    id: string,
    imageUrl: string,
    speedMultiplier: number,
    options: Partial<Pick<ParallaxLayer, 'y' | 'alpha' | 'tint' | 'repeatX'>> = {},
  ): ParallaxLayer {
    const layer: ParallaxLayer = {
      id,
      imageUrl,
      speedMultiplier,
      y: options.y ?? 0,
      width: this.config.canvasWidth,
      height: this.config.canvasHeight,
      repeatX: options.repeatX ?? true,
      alpha: options.alpha ?? 1.0,
      tint: options.tint ?? 0xffffff,
      loaded: false,
    };

    this.layers.push(layer);
    // Sort by speed: slowest (farthest) first
    this.layers.sort((a, b) => a.speedMultiplier - b.speedMultiplier);
    return layer;
  }

  /** Remove a layer by id */
  removeLayer(id: string): void {
    this.layers = this.layers.filter((l) => l.id !== id);
  }

  /** Update parallax based on camera position */
  update(cameraX: number): void {
    this.cameraX = cameraX;
  }

  /** Render all layers back-to-front */
  render(): void {
    if (!this.gl) return;

    for (const layer of this.layers) {
      const offsetX = -this.cameraX * layer.speedMultiplier;

      if (layer.repeatX) {
        // Tile the layer to fill the viewport
        const startX = offsetX % layer.width;
        // In production: draw texture at (startX, layer.y)
        // and (startX + layer.width, layer.y) for seamless wrap
        // Apply alpha and tint uniforms
      } else {
        // Single image, just offset
        // In production: draw texture at (offsetX, layer.y)
      }
    }
  }

  /** Get layer by id */
  getLayer(id: string): ParallaxLayer | undefined {
    return this.layers.find((l) => l.id === id);
  }

  /** Set layer alpha for transitions (e.g. time-of-day) */
  setLayerAlpha(id: string, alpha: number): void {
    const layer = this.layers.find((l) => l.id === id);
    if (layer) layer.alpha = Math.max(0, Math.min(1, alpha));
  }

  /** Create a typical 4-layer arena setup */
  static createArenaLayers(
    bg: ParallaxBackground,
    stageId: string,
    basePath: string,
  ): void {
    bg.addLayer(`${stageId}_sky`, `${basePath}/sky.png`, 0.0);
    bg.addLayer(`${stageId}_far`, `${basePath}/far.png`, 0.2, { alpha: 0.9 });
    bg.addLayer(`${stageId}_mid`, `${basePath}/mid.png`, 0.5);
    bg.addLayer(`${stageId}_near`, `${basePath}/near.png`, 0.8, { y: 100 });
  }

  /** Clean up all layers */
  destroy(): void {
    this.layers = [];
    this.textureCache.clear();
    this.gl = null;
  }
}
