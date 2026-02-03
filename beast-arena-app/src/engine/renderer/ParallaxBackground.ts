/**
 * ParallaxBackground — Multi-layer parallax scrolling background system.
 *
 * Renders 3-4 layers of scrolling backgrounds that move at different speeds
 * relative to the camera, creating depth illusion.
 *
 * Layer order (back to front):
 * 1. Sky / distant backdrop (scrollFactor ~0.0-0.1) — nearly static
 * 2. Far mountains / buildings (scrollFactor ~0.2-0.4) — slow scroll
 * 3. Mid-ground foliage / structures (scrollFactor ~0.5-0.7)
 * 4. Near-ground elements / ground plane (scrollFactor ~0.8-1.0)
 *
 * Uses PixiJS TilingSprite for seamless horizontal scrolling.
 */

import type { ParallaxLayerConfig, StageConfig } from './BridgeTypes';

// ─── Stage Presets ───

export const STAGE_PRESETS: Record<string, StageConfig> = {
  ancient_temple: {
    id: 'ancient_temple',
    groundY: 500,
    ambientColor: 0x8B4513,
    layers: [
      {
        textureKey: 'assets/stages/ancient_temple/sky.png',
        scrollFactor: 0.0,
        y: 0,
        scale: 1.0,
        tint: 0x3D1F00,
        alpha: 1.0,
      },
      {
        textureKey: 'assets/stages/ancient_temple/mountains.png',
        scrollFactor: 0.15,
        y: 80,
        scale: 1.0,
        alpha: 0.7,
      },
      {
        textureKey: 'assets/stages/ancient_temple/pillars.png',
        scrollFactor: 0.45,
        y: 150,
        scale: 1.0,
        alpha: 0.85,
      },
      {
        textureKey: 'assets/stages/ancient_temple/ground.png',
        scrollFactor: 0.9,
        y: 420,
        scale: 1.0,
        alpha: 1.0,
      },
    ],
  },
  bamboo_forest: {
    id: 'bamboo_forest',
    groundY: 500,
    ambientColor: 0x2E8B57,
    layers: [
      {
        textureKey: 'assets/stages/bamboo_forest/sky.png',
        scrollFactor: 0.0,
        y: 0,
        scale: 1.0,
        tint: 0x0A2E1A,
        alpha: 1.0,
      },
      {
        textureKey: 'assets/stages/bamboo_forest/far_trees.png',
        scrollFactor: 0.2,
        y: 60,
        scale: 1.0,
        alpha: 0.6,
      },
      {
        textureKey: 'assets/stages/bamboo_forest/bamboo_mid.png',
        scrollFactor: 0.5,
        y: 120,
        scale: 1.0,
        alpha: 0.8,
      },
      {
        textureKey: 'assets/stages/bamboo_forest/ground.png',
        scrollFactor: 0.85,
        y: 430,
        scale: 1.0,
        alpha: 1.0,
      },
    ],
  },
  thunder_peak: {
    id: 'thunder_peak',
    groundY: 500,
    ambientColor: 0x4B0082,
    layers: [
      {
        textureKey: 'assets/stages/thunder_peak/sky.png',
        scrollFactor: 0.0,
        y: 0,
        scale: 1.0,
        tint: 0x1A0033,
        alpha: 1.0,
      },
      {
        textureKey: 'assets/stages/thunder_peak/clouds.png',
        scrollFactor: 0.1,
        y: 40,
        scale: 1.0,
        alpha: 0.5,
      },
      {
        textureKey: 'assets/stages/thunder_peak/rocks.png',
        scrollFactor: 0.4,
        y: 180,
        scale: 1.0,
        alpha: 0.85,
      },
      {
        textureKey: 'assets/stages/thunder_peak/platform.png',
        scrollFactor: 0.95,
        y: 400,
        scale: 1.0,
        alpha: 1.0,
      },
    ],
  },
};

// ─── WebView-side Parallax System Code ───

/**
 * Returns the JavaScript source code for the ParallaxBackground class
 * that runs inside the WebView.
 */
export function getParallaxBackgroundSource(): string {
  return `
class ParallaxBackground {
  constructor(app) {
    this.app = app;
    this.container = new PIXI.Container();
    this.container.label = 'parallax-bg';
    this.layers = [];       // { config, sprite, baseX }
    this.stageWidth = 1280;
    this.stageHeight = 720;
  }

  /**
   * Setup parallax layers from stage config
   */
  async setup(stageConfig) {
    // Clear existing layers
    this.destroy();
    this.container = new PIXI.Container();
    this.container.label = 'parallax-bg';

    const layerConfigs = stageConfig.layers || [];

    for (let i = 0; i < layerConfigs.length; i++) {
      const config = layerConfigs[i];
      await this._createLayer(config, i);
    }

    // If no textures loaded, create procedural backgrounds
    if (this.layers.length === 0 && layerConfigs.length > 0) {
      this._createProceduralLayers(stageConfig);
    }
  }

  async _createLayer(config, index) {
    let texture;
    try {
      texture = await PIXI.Assets.load(config.textureKey);
    } catch (err) {
      console.warn('[Parallax] Texture not found, creating procedural:', config.textureKey);
      texture = this._generateProceduralTexture(config, index);
    }

    // Use TilingSprite for seamless horizontal scrolling
    const sprite = new PIXI.TilingSprite({
      texture: texture,
      width: this.stageWidth * 3, // 3x width for scroll room
      height: texture.height * (config.scale || 1),
    });

    sprite.position.set(-this.stageWidth, config.y || 0);
    sprite.alpha = config.alpha != null ? config.alpha : 1;

    if (config.tint != null) {
      sprite.tint = config.tint;
    }

    if (config.scale) {
      sprite.scale.y = config.scale;
    }

    this.container.addChild(sprite);
    this.layers.push({
      config,
      sprite,
      baseX: 0,
    });
  }

  _generateProceduralTexture(config, index) {
    // Generate a procedural texture as placeholder
    const canvas = document.createElement('canvas');
    const w = 512;
    const h = 256;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // Different style per layer depth
    const depth = config.scrollFactor || 0;

    if (depth < 0.1) {
      // Sky layer — gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0a0a2e');
      grad.addColorStop(1, '#1a1a3e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Stars
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.7) + ')';
        ctx.fillRect(Math.random() * w, Math.random() * h * 0.7, 2, 2);
      }
    } else if (depth < 0.3) {
      // Far mountains
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2a2a4e';
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) {
        const y = h * 0.3 + Math.sin(x * 0.02) * 40 + Math.sin(x * 0.005) * 60;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.fill();
    } else if (depth < 0.7) {
      // Mid-ground — trees/structures
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#1a3a1a';
      for (let x = 0; x < w; x += 30 + Math.random() * 20) {
        const treeH = 80 + Math.random() * 120;
        const treeW = 15 + Math.random() * 10;
        ctx.fillRect(x, h - treeH, treeW, treeH);
        // Canopy
        ctx.beginPath();
        ctx.fillStyle = '#2a5a2a';
        ctx.arc(x + treeW / 2, h - treeH, treeW * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a3a1a';
      }
    } else {
      // Ground layer
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#3a2a1a');
      grad.addColorStop(1, '#2a1a0a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      // Ground details
      ctx.strokeStyle = '#4a3a2a';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 10 + Math.random() * 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 5, 5);
        ctx.stroke();
      }
    }

    return PIXI.Texture.from(canvas);
  }

  _createProceduralLayers(stageConfig) {
    const configs = stageConfig.layers || [];
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      const texture = this._generateProceduralTexture(config, i);

      const sprite = new PIXI.TilingSprite({
        texture: texture,
        width: this.stageWidth * 3,
        height: 256 * (config.scale || 1),
      });

      sprite.position.set(-this.stageWidth, config.y || 0);
      sprite.alpha = config.alpha != null ? config.alpha : 1;

      if (config.tint != null) {
        sprite.tint = config.tint;
      }

      this.container.addChild(sprite);
      this.layers.push({ config, sprite, baseX: 0 });
    }
  }

  /**
   * Update parallax positions based on camera
   */
  update(cameraX, cameraY, cameraZoom) {
    const centerX = this.stageWidth / 2;

    for (const layer of this.layers) {
      const factor = layer.config.scrollFactor || 0;
      // Offset the tiling based on camera position and scroll factor
      const offsetX = (cameraX - centerX) * factor;
      layer.sprite.tilePosition.x = -offsetX;

      // Subtle vertical parallax
      const offsetY = (cameraY - this.stageHeight / 2) * factor * 0.3;
      layer.sprite.position.y = (layer.config.y || 0) - offsetY;
    }
  }

  /**
   * Set the viewport size
   */
  resize(width, height) {
    this.stageWidth = width;
    this.stageHeight = height;
    for (const layer of this.layers) {
      layer.sprite.width = width * 3;
    }
  }

  /**
   * Destroy all layers
   */
  destroy() {
    for (const layer of this.layers) {
      layer.sprite.destroy();
    }
    this.layers = [];
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.destroy({ children: true });
  }
}
`;
}
