import { FighterState, Rect, Vector2D, GAME_CONFIG, FighterActionState } from './types';

/** Apply gravity to a fighter */
export function applyGravity(fighter: FighterState): void {
  if (!fighter.isGrounded) {
    fighter.velocity.y += GAME_CONFIG.gravity;
  }
}

/** Apply velocity to position */
export function applyVelocity(fighter: FighterState): void {
  fighter.position.x += fighter.velocity.x;
  fighter.position.y += fighter.velocity.y;

  // Ground check
  if (fighter.position.y >= GAME_CONFIG.groundY) {
    fighter.position.y = GAME_CONFIG.groundY;
    fighter.velocity.y = 0;
    fighter.isGrounded = true;
  } else {
    fighter.isGrounded = false;
  }
}

/** Keep fighter within stage boundaries */
export function checkBoundaries(fighter: FighterState): void {
  const halfWidth = GAME_CONFIG.pushboxWidth / 2;
  if (fighter.position.x - halfWidth < 0) {
    fighter.position.x = halfWidth;
    fighter.velocity.x = 0;
  }
  if (fighter.position.x + halfWidth > GAME_CONFIG.stageWidth) {
    fighter.position.x = GAME_CONFIG.stageWidth - halfWidth;
    fighter.velocity.x = 0;
  }
}

/** AABB collision detection */
export function checkAABB(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/** Get world-space rect from fighter-local rect */
export function toWorldRect(fighter: FighterState, local: Rect): Rect {
  const flip = fighter.facing === 'left' ? -1 : 1;
  return {
    x: fighter.position.x + local.x * flip - (flip === -1 ? local.w : 0),
    y: fighter.position.y + local.y,
    w: local.w,
    h: local.h,
  };
}

/** Check if attacker's hitbox overlaps defender's hurtbox */
export function checkHitboxCollision(
  attacker: FighterState,
  defender: FighterState
): boolean {
  if (!attacker.activeHitbox) return false;
  const hitbox = toWorldRect(attacker, attacker.activeHitbox);
  const hurtbox = toWorldRect(defender, defender.hurtbox);
  return checkAABB(hitbox, hurtbox);
}

/** Prevent two fighters from overlapping (pushbox) */
export function resolveOverlap(f1: FighterState, f2: FighterState): void {
  const halfW = GAME_CONFIG.pushboxWidth / 2;
  const dist = Math.abs(f1.position.x - f2.position.x);
  const minDist = GAME_CONFIG.pushboxWidth;

  if (dist < minDist && Math.abs(f1.position.y - f2.position.y) < 100) {
    const overlap = (minDist - dist) / 2;
    if (f1.position.x < f2.position.x) {
      f1.position.x -= overlap;
      f2.position.x += overlap;
    } else {
      f1.position.x += overlap;
      f2.position.x -= overlap;
    }
    // Re-check boundaries after push
    checkBoundaries(f1);
    checkBoundaries(f2);
  }
}

/** Apply knockback force to a fighter */
export function applyKnockback(
  fighter: FighterState,
  direction: 'left' | 'right',
  force: number
): void {
  const sign = direction === 'right' ? 1 : -1;
  fighter.velocity.x = sign * force;
  fighter.velocity.y = -force * 0.3; // slight upward pop
}

/** Get distance between two fighters */
export function getDistance(f1: FighterState, f2: FighterState): number {
  const dx = f1.position.x - f2.position.x;
  const dy = f1.position.y - f2.position.y;
  return Math.sqrt(dx * dx + dy * dy);
}
