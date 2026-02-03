// Character system types — shared interface, data-driven
// Add new characters by adding config files to configs/

export interface CharacterStats {
  hp: number;
  atk: number;
  spd: number;
  def: number;
  special: number;
}

export interface SkillDef {
  id: string;
  name: string;
  damage: number;
  startup: number;      // frames before active
  active: number;       // frames hitbox is active
  recovery: number;     // frames after attack
  cooldown: number;     // milliseconds
  type: 'strike' | 'grab' | 'projectile' | 'buff';
  effect?: 'stun' | 'knockdown' | 'knockback' | 'slow';
  animationKey: string; // Spine animation name
  vfxKey?: string;      // VFX spritesheet key
  sfxKey?: string;      // Sound effect key
}

export interface CharacterMoveset {
  normalAttack: SkillDef[];    // combo chain (3-4 hits)
  specialSkill1: SkillDef;
  specialSkill2: SkillDef;
  specialSkill3: SkillDef;
  specialSkill4: SkillDef;
  ultimate: SkillDef;
}

export interface CharacterAssets {
  spineAtlas?: string;
  spineJson?: string;
  splashArt?: string;
  portrait?: string;
  vfxSheet?: string;
}

export interface UnlockCondition {
  type: 'free' | 'wins' | 'purchase';
  value?: number;
}

export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  martialArt: string;
  stats: CharacterStats;
  moveset: CharacterMoveset;
  assets?: CharacterAssets;
  unlockCondition?: UnlockCondition;
}

export type CharacterId = string;
