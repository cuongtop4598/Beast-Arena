// ─── Core Types ───

export interface Vector2D {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type HitboxDef = Rect & {
  damage?: number;
  knockback?: Vector2D;
};

// ─── Fighter States ───

export enum FighterActionState {
  Idle = 'idle',
  Walking = 'walking',
  Jumping = 'jumping',
  Crouching = 'crouching',
  Attacking = 'attacking',
  Blocking = 'blocking',
  Stunned = 'stunned',
  Knockdown = 'knockdown',
  Special = 'special',
  Ultimate = 'ultimate',
  HitStun = 'hit_stun',
  Recovery = 'recovery',
  Victory = 'victory',
  Defeat = 'defeat',
}

export interface Buff {
  id: string;
  type: 'speed' | 'damage' | 'armor' | 'heal';
  value: number;
  remainingFrames: number;
}

export interface FighterState {
  characterId: string;
  playerId: string;
  position: Vector2D;
  velocity: Vector2D;
  hp: number;
  maxHp: number;
  state: FighterActionState;
  facing: 'left' | 'right';
  comboCounter: number;
  comboWindow: number;       // frames remaining to chain next hit
  ultimateGauge: number;     // 0.0 - 1.0
  activeBuffs: Buff[];
  currentAnimation: string;
  hurtbox: Rect;
  activeHitbox: HitboxDef | null;
  cooldowns: Map<string, number>; // skillId → remaining ms
  frameCounter: number;      // frames in current state
  stunFrames: number;        // remaining stun frames
  invincibleFrames: number;  // i-frames after knockdown getup
  currentSkillId: string | null;
  startupFrames: number;     // remaining startup frames for current skill
  activeFrames: number;      // remaining active frames
  recoveryFrames: number;    // remaining recovery frames
  isGrounded: boolean;
  hasHitThisAttack: boolean; // prevent multi-hit per swing
}

// ─── Input ───

export enum InputAction {
  Left = 'left',
  Right = 'right',
  Jump = 'jump',
  Crouch = 'crouch',
  Attack = 'attack',
  Block = 'block',
  Special1 = 'special1',
  Special2 = 'special2',
  Special3 = 'special3',
  Special4 = 'special4',
  Ultimate = 'ultimate',
}

export interface PlayerInput {
  frame: number;
  playerId: string;
  actions: InputAction[];
}

// ─── Supply Drops ───

export interface SupplyDropItem {
  id: string;
  type: 'weapon' | 'heal' | 'speed';
  name: string;
  value: number;
  duration: number; // frames, 0 = instant
}

export interface SupplyDrop {
  id: string;
  item: SupplyDropItem;
  position: Vector2D;
  spawnFrame: number;
  warningFrame: number; // 9s * 60fps = 540 frames before spawn
  active: boolean;
  claimed: boolean;
}

// ─── Round / Match ───

export interface RoundResult {
  round: number;
  winnerId: string;
  method: 'ko' | 'timeout';
  p1Hp: number;
  p2Hp: number;
  durationFrames: number;
}

export interface MatchResult {
  matchId: string;
  winnerId: string;
  rounds: RoundResult[];
  totalFrames: number;
}

// ─── Game Config ───

export const GAME_CONFIG = {
  stageWidth: 1280,
  stageHeight: 720,
  gravity: 0.8,
  groundY: 500,
  fps: 60,
  frameMs: 1000 / 60,
  roundTime: 99,         // seconds
  roundsToWin: 2,        // Bo3
  comboWindowFrames: 12,  // frames to chain next hit
  ultChargePerHit: 0.05,
  ultChargePerDamage: 0.001,
  knockdownInvincibleFrames: 30,
  pushboxWidth: 60,       // fighter push collision width
  hurtboxDefault: { x: -30, y: -120, w: 60, h: 120 } as Rect,
} as const;

// ─── Events ───

export type GameEvent =
  | { type: 'stateUpdate'; state: GameSnapshot }
  | { type: 'hit'; attackerId: string; defenderId: string; damage: number; skillId: string }
  | { type: 'roundEnd'; result: RoundResult }
  | { type: 'matchEnd'; result: MatchResult }
  | { type: 'ko'; loserId: string }
  | { type: 'supplyDrop'; drop: SupplyDrop }
  | { type: 'supplyPickup'; playerId: string; item: SupplyDropItem }
  | { type: 'comboCounter'; playerId: string; count: number; totalDamage: number };

export interface GameSnapshot {
  frame: number;
  timer: number;
  round: number;
  player1: FighterState;
  player2: FighterState;
  supplyDrops: SupplyDrop[];
  roundResults: RoundResult[];
}

// ─── Stat Scaling ───

export function hpFromStat(stat: number): number {
  return 600 + stat * 30; // 18→1140, 22→1260, 28→1440, 30→1500
}

export function speedFromStat(stat: number): number {
  return 2 + stat * 0.15; // 14→4.1, 20→5.0, 28→6.2, 32→6.8
}

export function damageMultiplier(atk: number): number {
  return 0.6 + atk * 0.02; // 20→1.0, 22→1.04, 24→1.08, 26→1.12
}

export function defenseReduction(def: number): number {
  return 1 - def * 0.01; // 12→0.88, 16→0.84, 22→0.78, 28→0.72
}

export function cooldownReduction(special: number): number {
  return 1 - special * 0.02; // 6→0.88, 8→0.84, 18→0.64
}
