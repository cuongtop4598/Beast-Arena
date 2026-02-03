import { CharacterConfig } from '@/characters/types';
import { registry } from '@/characters/registry';
import {
  FighterState, FighterActionState, GAME_CONFIG,
  PlayerInput, InputAction, GameEvent, GameSnapshot,
  RoundResult, MatchResult, SupplyDrop,
} from './types';
import {
  createFighter, updateFighter, faceOpponent,
  moveFighter, jumpFighter, blockFighter,
  executeSkill, executeCombo, calculateDamage,
  takeDamage, canAct,
} from './Fighter';
import {
  applyGravity, applyVelocity, checkBoundaries,
  checkHitboxCollision, resolveOverlap, applyKnockback,
} from './Physics';
import { CameraState, createCamera, updateCamera, triggerShake, triggerSlowMo } from './Camera';
import { createSupplyDropManager, applySupplyItem } from './SupplyDrop';

type EventCallback = (event: GameEvent) => void;

export class GameEngine {
  // State
  player1!: FighterState;
  player2!: FighterState;
  p1Config!: CharacterConfig;
  p2Config!: CharacterConfig;
  camera: CameraState;
  frame: number = 0;
  timer: number = GAME_CONFIG.roundTime;
  timerFrameAcc: number = 0;
  round: number = 1;
  roundResults: RoundResult[] = [];
  supplyDrops: SupplyDrop[] = [];
  isRunning: boolean = false;
  isPaused: boolean = false;
  matchOver: boolean = false;

  // Systems
  private supplyMgr = createSupplyDropManager();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners: EventCallback[] = [];
  private inputQueue: PlayerInput[] = [];

  // Combo tracking
  private comboDamage: Map<string, number> = new Map();

  constructor() {
    this.camera = createCamera();
  }

  /** Initialize a match */
  init(
    p1CharId: string, p1PlayerId: string,
    p2CharId: string, p2PlayerId: string,
    _stageId: string
  ): void {
    this.p1Config = registry.get(p1CharId)!;
    this.p2Config = registry.get(p2CharId)!;

    this.player1 = createFighter(this.p1Config, p1PlayerId, 300, 'right');
    this.player2 = createFighter(this.p2Config, p2PlayerId, 980, 'left');

    this.frame = 0;
    this.timer = GAME_CONFIG.roundTime;
    this.timerFrameAcc = 0;
    this.round = 1;
    this.roundResults = [];
    this.matchOver = false;
    this.supplyMgr.reset();
    this.comboDamage.clear();
    this.camera = createCamera();
  }

  /** Start the game loop */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      if (!this.isPaused && !this.matchOver) {
        this.tick();
      }
    }, GAME_CONFIG.frameMs);
  }

  /** Stop the game loop */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Pause / unpause */
  pause(): void { this.isPaused = true; }
  resume(): void { this.isPaused = false; }

  /** Queue player input */
  queueInput(input: PlayerInput): void {
    this.inputQueue.push(input);
  }

  /** Subscribe to game events */
  on(callback: EventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private emit(event: GameEvent): void {
    for (const cb of this.listeners) cb(event);
  }

  /** Main tick — called 60 times per second */
  private tick(): void {
    this.frame++;

    // 1. Process inputs
    this.processInputs();

    // 2. Update fighters
    this.updateFighters();

    // 3. Physics
    this.updatePhysics();

    // 4. Collision detection (hits)
    this.checkHits();

    // 5. Supply drops
    this.updateSupplyDrops();

    // 6. Timer
    this.updateTimer();

    // 7. Check round end
    this.checkRoundEnd();

    // 8. Camera
    updateCamera(this.camera, this.player1, this.player2);

    // 9. Emit state snapshot
    this.emit({
      type: 'stateUpdate',
      state: this.getSnapshot(),
    });
  }

  private processInputs(): void {
    while (this.inputQueue.length > 0) {
      const input = this.inputQueue.shift()!;
      const fighter = input.playerId === this.player1.playerId ? this.player1 : this.player2;
      const config = input.playerId === this.player1.playerId ? this.p1Config : this.p2Config;

      for (const action of input.actions) {
        this.processAction(fighter, config, action);
      }

      // If no directional input, stop walking
      const hasDir = input.actions.some((a) =>
        a === InputAction.Left || a === InputAction.Right
      );
      if (!hasDir && fighter.state === FighterActionState.Walking) {
        fighter.state = FighterActionState.Idle;
        fighter.currentAnimation = 'idle';
      }

      // If block released
      if (!input.actions.includes(InputAction.Block) && fighter.state === FighterActionState.Blocking) {
        fighter.state = FighterActionState.Idle;
        fighter.currentAnimation = 'idle';
      }
    }
  }

  private processAction(
    fighter: FighterState,
    config: CharacterConfig,
    action: InputAction
  ): void {
    switch (action) {
      case InputAction.Left:
        moveFighter(fighter, config, 'left');
        break;
      case InputAction.Right:
        moveFighter(fighter, config, 'right');
        break;
      case InputAction.Jump:
        jumpFighter(fighter);
        break;
      case InputAction.Block:
        blockFighter(fighter);
        break;
      case InputAction.Attack:
        executeCombo(fighter, config);
        break;
      case InputAction.Special1:
        executeSkill(fighter, config.moveset.specialSkill1, config);
        break;
      case InputAction.Special2:
        executeSkill(fighter, config.moveset.specialSkill2, config);
        break;
      case InputAction.Special3:
        executeSkill(fighter, config.moveset.specialSkill3, config);
        break;
      case InputAction.Special4:
        executeSkill(fighter, config.moveset.specialSkill4, config);
        break;
      case InputAction.Ultimate:
        executeSkill(fighter, config.moveset.ultimate, config);
        break;
    }
  }

  private updateFighters(): void {
    faceOpponent(this.player1, this.player2);
    faceOpponent(this.player2, this.player1);
    updateFighter(this.player1, this.p1Config);
    updateFighter(this.player2, this.p2Config);
  }

  private updatePhysics(): void {
    // Gravity & movement
    applyGravity(this.player1);
    applyGravity(this.player2);
    applyVelocity(this.player1);
    applyVelocity(this.player2);
    checkBoundaries(this.player1);
    checkBoundaries(this.player2);
    resolveOverlap(this.player1, this.player2);
  }

  private checkHits(): void {
    this.checkHit(this.player1, this.player2, this.p1Config, this.p2Config);
    this.checkHit(this.player2, this.player1, this.p2Config, this.p1Config);
  }

  private checkHit(
    attacker: FighterState,
    defender: FighterState,
    atkConfig: CharacterConfig,
    defConfig: CharacterConfig
  ): void {
    if (attacker.hasHitThisAttack) return;
    if (!attacker.activeHitbox) return;
    if (defender.invincibleFrames > 0) return;

    if (checkHitboxCollision(attacker, defender)) {
      attacker.hasHitThisAttack = true;

      // Find current skill
      const skillId = attacker.currentSkillId;
      const skill = this.findSkill(atkConfig, skillId);
      if (!skill) return;

      const damage = calculateDamage(skill, atkConfig, defConfig, attacker, defender);

      // Apply damage
      takeDamage(defender, damage, skill.effect);

      // Knockback
      const kbDir = attacker.facing;
      const kbForce = skill.effect === 'knockdown' ? 8 : skill.effect === 'knockback' ? 6 : 3;
      applyKnockback(defender, kbDir, kbForce);

      // Charge attacker's ult
      attacker.ultimateGauge = Math.min(1, attacker.ultimateGauge + GAME_CONFIG.ultChargePerHit);

      // Camera effects
      if (attacker.state === FighterActionState.Ultimate) {
        triggerShake(this.camera, 12, 20);
        triggerSlowMo(this.camera, 0.3, 30);
      } else if (skill.effect === 'knockdown') {
        triggerShake(this.camera, 8, 10);
      } else {
        triggerShake(this.camera, 3, 5);
      }

      // Track combo damage
      const prevDmg = this.comboDamage.get(attacker.playerId) ?? 0;
      this.comboDamage.set(attacker.playerId, prevDmg + damage);

      this.emit({
        type: 'hit',
        attackerId: attacker.playerId,
        defenderId: defender.playerId,
        damage,
        skillId: skillId ?? 'unknown',
      });

      if (attacker.comboCounter > 1) {
        this.emit({
          type: 'comboCounter',
          playerId: attacker.playerId,
          count: attacker.comboCounter,
          totalDamage: this.comboDamage.get(attacker.playerId) ?? damage,
        });
      }
    }
  }

  private findSkill(config: CharacterConfig, skillId: string | null) {
    if (!skillId) return null;
    const m = config.moveset;
    const all = [...m.normalAttack, m.specialSkill1, m.specialSkill2, m.specialSkill3, m.specialSkill4, m.ultimate];
    return all.find((s) => s.id === skillId) ?? null;
  }

  private updateSupplyDrops(): void {
    const newDrop = this.supplyMgr.update(this.frame);
    if (newDrop) {
      this.emit({ type: 'supplyDrop', drop: newDrop });
    }

    // Check pickups
    for (const fighter of [this.player1, this.player2]) {
      const item = this.supplyMgr.checkPickup(fighter);
      if (item) {
        applySupplyItem(fighter, item);
        this.emit({ type: 'supplyPickup', playerId: fighter.playerId, item });
      }
    }

    this.supplyDrops = this.supplyMgr.getActiveDrops();
  }

  private updateTimer(): void {
    this.timerFrameAcc++;
    if (this.timerFrameAcc >= GAME_CONFIG.fps) {
      this.timerFrameAcc = 0;
      this.timer = Math.max(0, this.timer - 1);
    }
  }

  private checkRoundEnd(): void {
    let winnerId: string | null = null;
    let method: 'ko' | 'timeout' = 'ko';

    // KO check
    if (this.player1.hp <= 0) {
      winnerId = this.player2.playerId;
      this.player1.state = FighterActionState.Defeat;
      this.player2.state = FighterActionState.Victory;
      this.emit({ type: 'ko', loserId: this.player1.playerId });
    } else if (this.player2.hp <= 0) {
      winnerId = this.player1.playerId;
      this.player2.state = FighterActionState.Defeat;
      this.player1.state = FighterActionState.Victory;
      this.emit({ type: 'ko', loserId: this.player2.playerId });
    }

    // Timeout check
    if (!winnerId && this.timer <= 0) {
      method = 'timeout';
      winnerId = this.player1.hp >= this.player2.hp
        ? this.player1.playerId
        : this.player2.playerId;
    }

    if (winnerId) {
      const result: RoundResult = {
        round: this.round,
        winnerId,
        method,
        p1Hp: this.player1.hp,
        p2Hp: this.player2.hp,
        durationFrames: this.frame,
      };
      this.roundResults.push(result);
      this.emit({ type: 'roundEnd', result });

      // Check match end (Bo3)
      const p1Wins = this.roundResults.filter((r) => r.winnerId === this.player1.playerId).length;
      const p2Wins = this.roundResults.filter((r) => r.winnerId === this.player2.playerId).length;

      if (p1Wins >= GAME_CONFIG.roundsToWin || p2Wins >= GAME_CONFIG.roundsToWin) {
        this.matchOver = true;
        const matchResult: MatchResult = {
          matchId: `match_${Date.now()}`,
          winnerId,
          rounds: this.roundResults,
          totalFrames: this.frame,
        };
        this.emit({ type: 'matchEnd', result: matchResult });
        this.stop();
      } else {
        // Start next round after delay
        setTimeout(() => this.startNextRound(), 2000);
      }
    }
  }

  private startNextRound(): void {
    this.round++;
    this.timer = GAME_CONFIG.roundTime;
    this.timerFrameAcc = 0;
    this.comboDamage.clear();
    this.supplyMgr.reset();

    // Reset fighter positions and HP, keep ult gauge
    const p1Ult = this.player1.ultimateGauge;
    const p2Ult = this.player2.ultimateGauge;

    this.player1 = createFighter(this.p1Config, this.player1.playerId, 300, 'right');
    this.player2 = createFighter(this.p2Config, this.player2.playerId, 980, 'left');

    this.player1.ultimateGauge = p1Ult;
    this.player2.ultimateGauge = p2Ult;
  }

  /** Get serializable snapshot of current state */
  getSnapshot(): GameSnapshot {
    return {
      frame: this.frame,
      timer: this.timer,
      round: this.round,
      player1: { ...this.player1, cooldowns: new Map(this.player1.cooldowns), activeBuffs: [...this.player1.activeBuffs] },
      player2: { ...this.player2, cooldowns: new Map(this.player2.cooldowns), activeBuffs: [...this.player2.activeBuffs] },
      supplyDrops: [...this.supplyDrops],
      roundResults: [...this.roundResults],
    };
  }
}
