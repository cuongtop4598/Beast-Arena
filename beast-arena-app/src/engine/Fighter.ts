import { CharacterConfig, SkillDef } from '@/characters/types';
import {
  FighterState, FighterActionState, Vector2D, Rect,
  GAME_CONFIG, Buff, HitboxDef,
  hpFromStat, speedFromStat, damageMultiplier, defenseReduction, cooldownReduction,
} from './types';

// State transition rules
const INTERRUPTIBLE: Set<FighterActionState> = new Set([
  FighterActionState.Idle,
  FighterActionState.Walking,
  FighterActionState.Crouching,
]);

const ACTIONABLE: Set<FighterActionState> = new Set([
  ...INTERRUPTIBLE,
  FighterActionState.Recovery,
]);

export function createFighter(
  config: CharacterConfig,
  playerId: string,
  startX: number,
  facing: 'left' | 'right'
): FighterState {
  const maxHp = hpFromStat(config.stats.hp);
  return {
    characterId: config.id,
    playerId,
    position: { x: startX, y: GAME_CONFIG.groundY },
    velocity: { x: 0, y: 0 },
    hp: maxHp,
    maxHp,
    state: FighterActionState.Idle,
    facing,
    comboCounter: 0,
    comboWindow: 0,
    ultimateGauge: 0,
    activeBuffs: [],
    currentAnimation: 'idle',
    hurtbox: { ...GAME_CONFIG.hurtboxDefault },
    activeHitbox: null,
    cooldowns: new Map(),
    frameCounter: 0,
    stunFrames: 0,
    invincibleFrames: 0,
    currentSkillId: null,
    startupFrames: 0,
    activeFrames: 0,
    recoveryFrames: 0,
    isGrounded: true,
    hasHitThisAttack: false,
  };
}

export function canAct(fighter: FighterState): boolean {
  return ACTIONABLE.has(fighter.state);
}

export function canInterrupt(fighter: FighterState): boolean {
  return INTERRUPTIBLE.has(fighter.state);
}

/** Move fighter left/right based on SPD stat */
export function moveFighter(
  fighter: FighterState,
  config: CharacterConfig,
  direction: 'left' | 'right'
): void {
  if (!canInterrupt(fighter)) return;
  const spd = speedFromStat(config.stats.spd);
  const speedBuff = fighter.activeBuffs
    .filter((b) => b.type === 'speed')
    .reduce((acc, b) => acc + b.value, 0);

  fighter.velocity.x = (direction === 'right' ? 1 : -1) * (spd + speedBuff);
  fighter.state = FighterActionState.Walking;
  fighter.facing = direction;
  fighter.currentAnimation = 'walk';
}

/** Make fighter jump */
export function jumpFighter(fighter: FighterState): void {
  if (!canInterrupt(fighter) || !fighter.isGrounded) return;
  fighter.velocity.y = -14;
  fighter.isGrounded = false;
  fighter.state = FighterActionState.Jumping;
  fighter.currentAnimation = 'jump';
}

/** Block stance */
export function blockFighter(fighter: FighterState): void {
  if (!canInterrupt(fighter)) return;
  fighter.state = FighterActionState.Blocking;
  fighter.velocity.x = 0;
  fighter.currentAnimation = 'block';
}

/** Execute a skill (normal attack, special, or ultimate) */
export function executeSkill(
  fighter: FighterState,
  skill: SkillDef,
  config: CharacterConfig
): boolean {
  if (!canAct(fighter)) return false;

  // Check cooldown
  const remaining = fighter.cooldowns.get(skill.id) ?? 0;
  if (remaining > 0) return false;

  // Ultimate requires full gauge
  if (skill.id === config.moveset.ultimate.id && fighter.ultimateGauge < 1.0) return false;

  // Set state
  fighter.state = skill.type === 'buff' ? FighterActionState.Special : FighterActionState.Attacking;
  if (skill === config.moveset.ultimate) {
    fighter.state = FighterActionState.Ultimate;
    fighter.ultimateGauge = 0;
  }

  fighter.currentSkillId = skill.id;
  fighter.startupFrames = skill.startup;
  fighter.activeFrames = skill.active;
  fighter.recoveryFrames = skill.recovery;
  fighter.frameCounter = 0;
  fighter.activeHitbox = null;
  fighter.hasHitThisAttack = false;
  fighter.velocity.x = 0;
  fighter.currentAnimation = skill.animationKey;

  // Apply cooldown with special stat reduction
  if (skill.cooldown > 0) {
    const cdMs = skill.cooldown * cooldownReduction(config.stats.special);
    fighter.cooldowns.set(skill.id, cdMs);
  }

  return true;
}

/** Execute next combo hit (normal attack chain) */
export function executeCombo(
  fighter: FighterState,
  config: CharacterConfig
): boolean {
  const chain = config.moveset.normalAttack;
  const nextIdx = Math.min(fighter.comboCounter, chain.length - 1);
  const skill = chain[nextIdx];

  if (fighter.comboWindow > 0 || fighter.comboCounter === 0) {
    if (executeSkill(fighter, skill, config)) {
      fighter.comboCounter++;
      fighter.comboWindow = GAME_CONFIG.comboWindowFrames;
      return true;
    }
  }
  return false;
}

/** Calculate damage from attacker to defender */
export function calculateDamage(
  skill: SkillDef,
  attackerConfig: CharacterConfig,
  defenderConfig: CharacterConfig,
  attacker: FighterState,
  defender: FighterState
): number {
  let dmg = skill.damage;
  dmg *= damageMultiplier(attackerConfig.stats.atk);
  dmg *= defenseReduction(defenderConfig.stats.def);

  // Damage buff
  const dmgBuff = attacker.activeBuffs
    .filter((b) => b.type === 'damage')
    .reduce((acc, b) => acc + b.value, 0);
  dmg *= 1 + dmgBuff;

  // Armor buff reduces incoming
  const armorBuff = defender.activeBuffs
    .filter((b) => b.type === 'armor')
    .reduce((acc, b) => acc + b.value, 0);
  dmg *= 1 - armorBuff;

  // Blocking halves damage
  if (defender.state === FighterActionState.Blocking) {
    dmg *= 0.5;
  }

  return Math.round(dmg);
}

/** Apply damage and effects to defender */
export function takeDamage(
  defender: FighterState,
  damage: number,
  effect?: string
): void {
  if (defender.invincibleFrames > 0) return;

  defender.hp = Math.max(0, defender.hp - damage);

  // Charge ult for both fighters
  defender.ultimateGauge = Math.min(1, defender.ultimateGauge + damage * GAME_CONFIG.ultChargePerDamage);

  // Apply effect
  if (defender.state === FighterActionState.Blocking) {
    defender.stunFrames = 8; // block stun
    defender.state = FighterActionState.Stunned;
    return;
  }

  switch (effect) {
    case 'stun':
      defender.stunFrames = 30;
      defender.state = FighterActionState.Stunned;
      defender.currentAnimation = 'stunned';
      break;
    case 'knockdown':
      defender.stunFrames = 60;
      defender.state = FighterActionState.Knockdown;
      defender.currentAnimation = 'knockdown';
      defender.velocity.y = -8;
      break;
    case 'knockback':
      defender.stunFrames = 15;
      defender.state = FighterActionState.HitStun;
      defender.currentAnimation = 'hit_stun';
      break;
    case 'slow':
      defender.activeBuffs.push({ id: 'slow', type: 'speed', value: -2, remainingFrames: 180 });
      defender.stunFrames = 10;
      defender.state = FighterActionState.HitStun;
      defender.currentAnimation = 'hit_stun';
      break;
    default:
      defender.stunFrames = 12;
      defender.state = FighterActionState.HitStun;
      defender.currentAnimation = 'hit_stun';
  }
}

/** Update fighter each frame */
export function updateFighter(fighter: FighterState, config: CharacterConfig): void {
  fighter.frameCounter++;

  // Update cooldowns
  fighter.cooldowns.forEach((val, key) => {
    if (val > 0) fighter.cooldowns.set(key, val - GAME_CONFIG.frameMs);
    else fighter.cooldowns.delete(key);
  });

  // Update buffs
  fighter.activeBuffs = fighter.activeBuffs.filter((b) => {
    b.remainingFrames--;
    if (b.type === 'heal' && b.remainingFrames > 0) {
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + b.value);
    }
    return b.remainingFrames > 0;
  });

  // Combo window decay
  if (fighter.comboWindow > 0) {
    fighter.comboWindow--;
    if (fighter.comboWindow === 0) fighter.comboCounter = 0;
  }

  // Invincibility decay
  if (fighter.invincibleFrames > 0) fighter.invincibleFrames--;

  // State-specific updates
  switch (fighter.state) {
    case FighterActionState.Attacking:
    case FighterActionState.Special:
    case FighterActionState.Ultimate:
      if (fighter.startupFrames > 0) {
        fighter.startupFrames--;
        fighter.activeHitbox = null;
      } else if (fighter.activeFrames > 0) {
        fighter.activeFrames--;
        // Hitbox active during active frames — use skill's hitbox
        fighter.activeHitbox = { x: 20, y: -80, w: 80, h: 80 }; // default, should come from skill
      } else if (fighter.recoveryFrames > 0) {
        fighter.recoveryFrames--;
        fighter.activeHitbox = null;
      } else {
        // Attack done → recovery → idle
        fighter.state = FighterActionState.Idle;
        fighter.currentAnimation = 'idle';
        fighter.activeHitbox = null;
        fighter.currentSkillId = null;
        fighter.hasHitThisAttack = false;
      }
      break;

    case FighterActionState.Stunned:
    case FighterActionState.HitStun:
      if (fighter.stunFrames > 0) {
        fighter.stunFrames--;
        fighter.velocity.x *= 0.9; // friction
      } else {
        fighter.state = FighterActionState.Idle;
        fighter.currentAnimation = 'idle';
      }
      break;

    case FighterActionState.Knockdown:
      if (fighter.stunFrames > 0) {
        fighter.stunFrames--;
      } else {
        fighter.state = FighterActionState.Idle;
        fighter.currentAnimation = 'idle';
        fighter.invincibleFrames = GAME_CONFIG.knockdownInvincibleFrames;
      }
      break;

    case FighterActionState.Blocking:
      fighter.velocity.x = 0;
      break;

    case FighterActionState.Idle:
      fighter.velocity.x *= 0.85; // deceleration
      if (Math.abs(fighter.velocity.x) < 0.1) fighter.velocity.x = 0;
      break;

    case FighterActionState.Walking:
      // Velocity set by moveFighter, friction handled in idle
      break;

    case FighterActionState.Jumping:
      if (fighter.isGrounded) {
        fighter.state = FighterActionState.Idle;
        fighter.currentAnimation = 'idle';
      }
      break;
  }
}

/** Auto-face opponent */
export function faceOpponent(fighter: FighterState, opponent: FighterState): void {
  if (canInterrupt(fighter)) {
    fighter.facing = fighter.position.x < opponent.position.x ? 'right' : 'left';
  }
}
