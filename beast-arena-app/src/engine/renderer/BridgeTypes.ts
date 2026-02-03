/**
 * Bridge message types for WebView ↔ React Native communication.
 * The game engine (RN side) sends state updates to the renderer (WebView side).
 * The renderer sends events back (e.g., animation complete, ready signal).
 */

import type { FighterActionState, Vector2D } from '../types';

// ─── RN → WebView Messages ───

/** Fighter rendering data sent each frame */
export interface FighterRenderState {
  playerId: string;
  characterId: string;
  position: Vector2D;
  facing: 'left' | 'right';
  state: FighterActionState;
  currentAnimation: string;
  hp: number;
  maxHp: number;
  comboCounter: number;
  isGrounded: boolean;
  activeHitbox: { x: number; y: number; w: number; h: number } | null;
}

/** VFX spawn command */
export interface VFXSpawnCommand {
  id: string;
  key: string;          // spritesheet key (e.g., 'slash_01', 'fire_burst')
  position: Vector2D;
  scale?: number;
  rotation?: number;
  flipX?: boolean;
  tint?: number;        // hex color tint
  speed?: number;       // playback speed multiplier (default 1.0)
}

/** Camera state for rendering */
export interface CameraRenderState {
  x: number;
  y: number;
  zoom: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
}

/** Stage/background config */
export interface StageConfig {
  id: string;
  layers: ParallaxLayerConfig[];
  groundY: number;
  ambientColor?: number;
}

export interface ParallaxLayerConfig {
  /** Asset key or URL for the layer texture */
  textureKey: string;
  /** Scroll speed multiplier (0 = static sky, 1 = moves with camera) */
  scrollFactor: number;
  /** Y position offset from top */
  y: number;
  /** Scale of the layer */
  scale?: number;
  /** Tint color */
  tint?: number;
  /** Alpha transparency */
  alpha?: number;
}

/** Spine skeleton config for a character */
export interface SpineCharacterConfig {
  characterId: string;
  atlasUrl: string;
  skeletonUrl: string;
  defaultAnimation: string;
  scale: number;
  /** Animation name mapping from FighterActionState to Spine animation names */
  animationMap: Record<string, string>;
}

// ─── Message Envelopes ───

export type RNToWebViewMessage =
  | { type: 'init'; stage: StageConfig; characters: SpineCharacterConfig[] }
  | { type: 'frame'; fighters: [FighterRenderState, FighterRenderState]; camera: CameraRenderState }
  | { type: 'spawnVFX'; vfx: VFXSpawnCommand }
  | { type: 'clearVFX'; id?: string }
  | { type: 'setStage'; stage: StageConfig }
  | { type: 'resize'; width: number; height: number }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'setDebug'; enabled: boolean };

export type WebViewToRNMessage =
  | { type: 'ready' }
  | { type: 'animationComplete'; playerId: string; animation: string }
  | { type: 'vfxComplete'; id: string }
  | { type: 'error'; message: string }
  | { type: 'fps'; value: number };
