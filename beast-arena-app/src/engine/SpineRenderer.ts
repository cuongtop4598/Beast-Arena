// ─── Spine 2D Runtime Wrapper ───

export interface SpineSkeletonData {
  name: string;
  atlasUrl: string;
  jsonUrl: string;
}

export interface SpineAnimation {
  name: string;
  loop: boolean;
  mixDuration: number;
}

export interface SpineInstance {
  id: string;
  skeletonData: SpineSkeletonData;
  currentAnimation: string;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  timeScale: number;
  tint: number;
  loaded: boolean;
}

const DEFAULT_MIX_DURATION = 0.2;

/**
 * Spine 2D skeleton renderer for Beast Arena fighters.
 * Wraps spine-ts runtime for WebGL rendering inside GameCanvas.
 */
export class SpineRenderer {
  private instances: Map<string, SpineInstance> = new Map();
  private gl: WebGL2RenderingContext | null = null;
  private skeletonCache: Map<string, SpineSkeletonData> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /** Load a skeleton from atlas + JSON */
  async loadSkeleton(id: string, data: SpineSkeletonData): Promise<SpineInstance> {
    // Cache skeleton data for reuse
    this.skeletonCache.set(data.name, data);

    const instance: SpineInstance = {
      id,
      skeletonData: data,
      currentAnimation: 'idle',
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      flipX: false,
      timeScale: 1,
      tint: 0xffffff,
      loaded: false,
    };

    // In production, this loads via spine-ts AssetManager
    // For now, mark as loaded after data is registered
    instance.loaded = true;
    this.instances.set(id, instance);
    return instance;
  }

  /** Set animation on a skeleton instance */
  setAnimation(
    id: string,
    animationName: string,
    loop: boolean = true,
    mixDuration: number = DEFAULT_MIX_DURATION,
  ): void {
    const instance = this.instances.get(id);
    if (!instance) {
      console.warn(`[SpineRenderer] Instance not found: ${id}`);
      return;
    }
    instance.currentAnimation = animationName;
    // In production: skeleton.state.setAnimation(0, animationName, loop)
    // with crossfade mix duration
  }

  /** Set position for a skeleton instance */
  setPosition(id: string, x: number, y: number): void {
    const instance = this.instances.get(id);
    if (!instance) return;
    instance.x = x;
    instance.y = y;
  }

  /** Set flip (facing direction) */
  setFlip(id: string, flipX: boolean): void {
    const instance = this.instances.get(id);
    if (!instance) return;
    instance.flipX = flipX;
  }

  /** Set time scale for slowmo effects */
  setTimeScale(id: string, scale: number): void {
    const instance = this.instances.get(id);
    if (!instance) return;
    instance.timeScale = scale;
  }

  /** Update all skeleton animations */
  update(dt: number): void {
    for (const instance of this.instances.values()) {
      if (!instance.loaded) continue;
      // In production: skeleton.state.update(dt * instance.timeScale)
      // skeleton.state.apply(skeleton)
      // skeleton.updateWorldTransform()
    }
  }

  /** Render all skeletons to WebGL */
  render(): void {
    if (!this.gl) return;
    for (const instance of this.instances.values()) {
      if (!instance.loaded) continue;
      // In production: skeletonRenderer.draw(batch, skeleton)
      // with position, scale, flip, and tint applied
    }
  }

  /** Remove a skeleton instance */
  removeInstance(id: string): void {
    this.instances.delete(id);
  }

  /** Get instance for direct manipulation */
  getInstance(id: string): SpineInstance | undefined {
    return this.instances.get(id);
  }

  /** Clean up all instances */
  destroy(): void {
    this.instances.clear();
    this.skeletonCache.clear();
    this.gl = null;
  }
}
