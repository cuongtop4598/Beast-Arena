// ─── WebGL Game Canvas ───

import { GAME_CONFIG } from './types';

export interface GameCanvasConfig {
  width: number;
  height: number;
  antialias: boolean;
  backgroundColor: number;
}

const DEFAULT_CONFIG: GameCanvasConfig = {
  width: 1280,
  height: 720,
  antialias: true,
  backgroundColor: 0x1a1a2e,
};

/**
 * WebGL2-based game canvas for Beast Arena.
 * Designed to run inside a WebView for React Native integration.
 * Uses raw WebGL2 context with PixiJS-compatible rendering pipeline.
 */
export class GameCanvas {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private config: GameCanvasConfig;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private onRenderCallback: ((dt: number) => void) | null = null;

  constructor(config: Partial<GameCanvasConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Initialize the WebGL2 canvas and context */
  init(container: HTMLElement): boolean {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.objectFit = 'contain';
    container.appendChild(this.canvas);

    const gl = this.canvas.getContext('webgl2', {
      antialias: this.config.antialias,
      alpha: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });

    if (!gl) {
      console.error('[GameCanvas] WebGL2 not supported');
      return false;
    }

    this.gl = gl;
    this.setupGL();
    return true;
  }

  private setupGL(): void {
    const { gl } = this;
    if (!gl) return;

    const r = ((this.config.backgroundColor >> 16) & 0xff) / 255;
    const g = ((this.config.backgroundColor >> 8) & 0xff) / 255;
    const b = (this.config.backgroundColor & 0xff) / 255;
    gl.clearColor(r, g, b, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.viewport(0, 0, this.config.width, this.config.height);
  }

  /** Set the render callback invoked each frame */
  onRender(callback: (dt: number) => void): void {
    this.onRenderCallback = callback;
  }

  /** Start the render loop */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  /** Stop the render loop */
  stop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05); // cap at 50ms
    this.lastTime = now;
    this.render(dt);
    this.animFrameId = requestAnimationFrame(this.tick);
  };

  /** Clear and render one frame */
  render(dt: number): void {
    const { gl } = this;
    if (!gl) return;
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.onRenderCallback?.(dt);
  }

  /** Resize canvas to new dimensions */
  resize(width: number, height: number): void {
    if (!this.canvas || !this.gl) return;
    this.config.width = width;
    this.config.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  getGL(): WebGL2RenderingContext | null {
    return this.gl;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  /** Clean up resources */
  destroy(): void {
    this.stop();
    this.canvas?.remove();
    this.canvas = null;
    this.gl = null;
  }
}
