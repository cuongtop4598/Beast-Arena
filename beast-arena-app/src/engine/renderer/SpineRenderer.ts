/**
 * SpineRenderer — Spine 2D runtime integration for character rendering.
 *
 * This module defines the SpineRenderer class that manages Spine skeletons
 * within a PixiJS container. It runs inside the WebView context.
 *
 * Uses @esotericsoftware/spine-pixi for PixiJS 8 integration.
 *
 * Architecture:
 * - Each fighter has a Spine skeleton with animation states
 * - The renderer maps FighterActionState → Spine animation names
 * - Supports animation blending, track layering, and mesh deform (breathing)
 * - The BreathingAnimation system applies subtle mesh deform on idle
 */

import type { FighterRenderState, SpineCharacterConfig } from './BridgeTypes';

// ─── Types ───

export interface SpineInstance {
  characterId: string;
  playerId: string;
  config: SpineCharacterConfig;
  currentAnimation: string;
  previousAnimation: string;
  /** PixiJS container reference (opaque in RN context) */
  container: unknown;
  /** Spine skeleton reference */
  skeleton: unknown;
  /** Animation state for track management */
  animationState: unknown;
  /** Whether breathing overlay is active */
  breathingActive: boolean;
}

/** Animation transition config */
export interface AnimationTransition {
  from: string;
  to: string;
  mixDuration: number; // seconds
}

/** Default animation mix durations for smooth transitions */
export const DEFAULT_MIX_DURATION = 0.15; // 150ms crossfade

export const ANIMATION_TRANSITIONS: AnimationTransition[] = [
  { from: 'idle', to: 'walk', mixDuration: 0.1 },
  { from: 'walk', to: 'idle', mixDuration: 0.2 },
  { from: 'idle', to: 'attack_1', mixDuration: 0.05 },
  { from: 'attack_1', to: 'attack_2', mixDuration: 0.05 },
  { from: 'attack_2', to: 'attack_3', mixDuration: 0.05 },
  { from: '*', to: 'hit_stun', mixDuration: 0.05 },
  { from: 'hit_stun', to: 'idle', mixDuration: 0.15 },
  { from: '*', to: 'knockdown', mixDuration: 0.0 },
  { from: 'knockdown', to: 'idle', mixDuration: 0.3 },
  { from: '*', to: 'ultimate', mixDuration: 0.1 },
  { from: 'ultimate', to: 'idle', mixDuration: 0.2 },
  { from: '*', to: 'block', mixDuration: 0.08 },
  { from: 'block', to: 'idle', mixDuration: 0.1 },
  { from: '*', to: 'victory', mixDuration: 0.2 },
  { from: '*', to: 'defeat', mixDuration: 0.1 },
];

// ─── WebView-side Spine Renderer Code ───

/**
 * Returns the JavaScript source code for the SpineRenderer class
 * that runs inside the WebView. This is injected into the WebView HTML.
 */
export function getSpineRendererSource(): string {
  return `
class SpineRenderer {
  constructor(app) {
    this.app = app;
    this.instances = new Map(); // playerId → spine instance data
    this.loaded = new Map();    // characterId → loaded skeleton data
  }

  /**
   * Load a Spine character skeleton
   */
  async loadCharacter(config) {
    if (this.loaded.has(config.characterId)) return;

    try {
      // spine-pixi provides Spine class that integrates with PixiJS
      // Load atlas and skeleton JSON
      const spineData = await PIXI.Assets.load([
        { alias: config.characterId + '_atlas', src: config.atlasUrl },
        { alias: config.characterId + '_skel', src: config.skeletonUrl },
      ]);

      this.loaded.set(config.characterId, {
        config: config,
        assets: spineData,
      });
    } catch (err) {
      console.warn('[SpineRenderer] Failed to load character:', config.characterId, err);
      // Create a fallback placeholder
      this.loaded.set(config.characterId, { config: config, assets: null });
    }
  }

  /**
   * Create a Spine instance for a fighter
   */
  createInstance(playerId, config, parentContainer) {
    const loaded = this.loaded.get(config.characterId);

    let container;
    let skeleton = null;
    let animState = null;

    if (loaded && loaded.assets && typeof spine !== 'undefined' && spine.Spine) {
      // Use actual Spine runtime
      try {
        const spineObj = spine.Spine.from({
          skeleton: config.characterId + '_skel',
          atlas: config.characterId + '_atlas',
        });
        spineObj.scale.set(config.scale);
        container = spineObj;
        skeleton = spineObj.skeleton;
        animState = spineObj.state;

        // Set default mix durations
        if (animState && animState.data) {
          animState.data.defaultMix = ${DEFAULT_MIX_DURATION};
        }

        // Play default animation
        if (animState) {
          animState.setAnimation(0, config.defaultAnimation || 'idle', true);
        }
      } catch (e) {
        console.warn('[SpineRenderer] Spine creation failed, using placeholder:', e);
        container = this._createPlaceholder(config);
      }
    } else {
      // Fallback: colored rectangle placeholder
      container = this._createPlaceholder(config);
    }

    parentContainer.addChild(container);

    const instance = {
      playerId,
      characterId: config.characterId,
      config,
      container,
      skeleton,
      animState,
      currentAnimation: config.defaultAnimation || 'idle',
      previousAnimation: '',
      breathingActive: false,
      breathingTime: 0,
    };

    this.instances.set(playerId, instance);
    return instance;
  }

  _createPlaceholder(config) {
    // Simple colored rectangle as Spine placeholder
    const container = new PIXI.Container();
    const colors = {
      tiger: 0xFF8C00,
      lion: 0xDAA520,
      crocodile: 0x228B22,
      eagle: 0x4169E1,
    };
    const color = colors[config.characterId] || 0xCCCCCC;

    const body = new PIXI.Graphics();
    body.roundRect(-30, -120, 60, 120, 8);
    body.fill({ color: color, alpha: 0.9 });

    // Head
    body.circle(0, -140, 20);
    body.fill({ color: color, alpha: 0.9 });

    container.addChild(body);

    // Add label
    const label = new PIXI.Text({
      text: config.characterId.charAt(0).toUpperCase(),
      style: { fontSize: 24, fill: 0xFFFFFF, fontWeight: 'bold' },
    });
    label.anchor.set(0.5);
    label.position.set(0, -80);
    container.addChild(label);

    return container;
  }

  /**
   * Update a fighter's animation based on state
   */
  updateAnimation(playerId, fighterState) {
    const instance = this.instances.get(playerId);
    if (!instance) return;

    const targetAnim = instance.config.animationMap[fighterState.currentAnimation]
      || fighterState.currentAnimation
      || 'idle';

    if (targetAnim !== instance.currentAnimation) {
      instance.previousAnimation = instance.currentAnimation;
      instance.currentAnimation = targetAnim;

      if (instance.animState) {
        // Determine if animation should loop
        const looping = ['idle', 'walk', 'block', 'run'].includes(targetAnim);
        instance.animState.setAnimation(0, targetAnim, looping);
      }
    }

    // Update position and facing
    const c = instance.container;
    c.position.set(fighterState.position.x, fighterState.position.y);
    c.scale.x = Math.abs(c.scale.x) * (fighterState.facing === 'left' ? -1 : 1);
  }

  /**
   * Update breathing animation (called each frame during idle)
   */
  updateBreathing(playerId, deltaTime) {
    const instance = this.instances.get(playerId);
    if (!instance) return;

    const isIdle = instance.currentAnimation === 'idle';

    if (isIdle && !instance.breathingActive) {
      instance.breathingActive = true;
      instance.breathingTime = 0;
    } else if (!isIdle && instance.breathingActive) {
      instance.breathingActive = false;
    }

    if (!instance.breathingActive) return;

    instance.breathingTime += deltaTime;

    // Subtle breathing: sine wave scale on Y axis
    // Spine mesh deform would modify specific vertices, but for the placeholder
    // we apply a subtle scale oscillation
    const breathCycle = Math.sin(instance.breathingTime * 2.5) * 0.015;
    const baseScaleY = instance.config.scale || 1;

    if (instance.skeleton && instance.skeleton.findBone) {
      // With real Spine: apply mesh deform on chest/torso bone
      const chest = instance.skeleton.findBone('chest') || instance.skeleton.findBone('torso');
      if (chest) {
        chest.scaleY = 1 + breathCycle;
        chest.scaleX = 1 - breathCycle * 0.3; // slight horizontal compress on inhale
      }
    } else {
      // Placeholder: apply to container
      const absScaleX = Math.abs(instance.container.scale.x);
      instance.container.scale.y = baseScaleY * (1 + breathCycle);
      // Don't override facing direction
    }
  }

  /**
   * Remove a fighter instance
   */
  removeInstance(playerId) {
    const instance = this.instances.get(playerId);
    if (instance) {
      instance.container.parent?.removeChild(instance.container);
      instance.container.destroy({ children: true });
      this.instances.delete(playerId);
    }
  }

  /**
   * Destroy all instances
   */
  destroy() {
    for (const [id] of this.instances) {
      this.removeInstance(id);
    }
    this.loaded.clear();
  }
}
`;
}

// ─── Default animation maps for each character ───

export const DEFAULT_ANIMATION_MAPS: Record<string, Record<string, string>> = {
  tiger: {
    idle: 'idle',
    walk: 'walk',
    jump: 'jump',
    block: 'block',
    attack_1: 'claw_swipe',
    attack_2: 'double_strike',
    attack_3: 'rising_claw',
    special_1: 'tiger_palm',
    special_2: 'prey_seize',
    special_3: 'roar_wave',
    special_4: 'pounce',
    ultimate: 'king_fury',
    hit_stun: 'hit',
    knockdown: 'knockdown',
    stunned: 'stunned',
    victory: 'victory',
    defeat: 'defeat',
  },
  lion: {
    idle: 'idle',
    walk: 'walk',
    jump: 'jump',
    block: 'block',
    attack_1: 'hook',
    attack_2: 'uppercut',
    attack_3: 'haymaker',
    special_1: 'mane_guard',
    special_2: 'pride_rally',
    special_3: 'power_slam',
    special_4: 'ground_pound',
    ultimate: 'lion_heart',
    hit_stun: 'hit',
    knockdown: 'knockdown',
    stunned: 'stunned',
    victory: 'victory',
    defeat: 'defeat',
  },
  crocodile: {
    idle: 'idle',
    walk: 'walk',
    jump: 'jump',
    block: 'block',
    attack_1: 'jaw_snap',
    attack_2: 'tail_whip',
    attack_3: 'death_roll_hit',
    special_1: 'armored_charge',
    special_2: 'death_roll',
    special_3: 'tail_sweep',
    special_4: 'submerge',
    ultimate: 'ancient_fury',
    hit_stun: 'hit',
    knockdown: 'knockdown',
    stunned: 'stunned',
    victory: 'victory',
    defeat: 'defeat',
  },
  eagle: {
    idle: 'idle',
    walk: 'walk',
    jump: 'jump',
    block: 'block',
    attack_1: 'wing_slash',
    attack_2: 'talon_strike',
    attack_3: 'beak_thrust',
    special_1: 'updraft',
    special_2: 'feather_storm',
    special_3: 'dive_bomb',
    special_4: 'wind_barrier',
    ultimate: 'sky_sovereign',
    hit_stun: 'hit',
    knockdown: 'knockdown',
    stunned: 'stunned',
    victory: 'victory',
    defeat: 'defeat',
  },
};
