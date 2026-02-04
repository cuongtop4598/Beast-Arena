import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../stores/useGameStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { registry } from '../characters/registry';
import { SkillDef } from '../characters/types';
import * as api from '../services/api';
import { audioManager } from '../engine/AudioManager';
import { useAnnouncerManager } from '../engine/AnnouncerManager';
import StageBackground from '../components/game/StageBackground';
import VirtualJoystick, { JoystickInput } from '../components/game/VirtualJoystick';
import FighterSprite, { FighterPose } from '../components/game/FighterSprite';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Arena bounds
const ARENA_LEFT = 20;
const ARENA_RIGHT = SCREEN_W - 20;
const ARENA_TOP = 120;
const ARENA_BOTTOM = SCREEN_H - 260;
const MOVE_SPEED = 3;

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯', lion: '🦁', crocodile: '🐊', eagle: '🦅',
};

const ELEMENT_COLORS: Record<string, string> = {
  tiger: '#FF6B35', lion: '#FFD700', crocodile: '#22C55E', eagle: '#3B82F6',
};

const EFFECT_ICONS: Record<string, string> = {
  stun: '💫', knockback: '💨', knockdown: '⬇️', slow: '🐌',
};

const SKILL_POSE_MAP: Record<string, FighterPose> = {
  'tiger_jab': 'jab', 'tiger_cross': 'cross', 'tiger_hook': 'hook', 'tiger_knee': 'knee',
  'tiger_rush': 'special_rush', 'tiger_elbow': 'special_elbow', 'tiger_spin_kick': 'special_kick', 'tiger_clinch': 'special_grab',
  'tiger_inferno': 'ultimate',
  'lion_jab': 'jab', 'lion_front_kick': 'cross', 'lion_roundhouse': 'hook', 'lion_uppercut': 'knee',
  'lion_kata_barrage': 'special_rush', 'lion_thunder_palm': 'special_elbow', 'lion_spinning_back': 'special_kick', 'lion_seoi_nage': 'special_grab',
  'lion_raijin': 'ultimate',
  'crocodile_jab': 'jab', 'croc_sweep': 'cross', 'croc_headbutt': 'hook', 'croc_tail_whip': 'knee',
  'croc_death_roll': 'special_rush', 'croc_iron_grip': 'special_elbow', 'croc_suplex': 'special_kick', 'croc_submission': 'special_grab',
  'croc_tsunami': 'ultimate',
  'eagle_wing_jab': 'jab', 'eagle_beak_strike': 'cross', 'eagle_talon_rake': 'hook', 'eagle_chain_punch': 'knee',
  'eagle_phoenix_strike': 'special_rush', 'eagle_wind_palm': 'special_elbow', 'eagle_crane_kick': 'special_kick', 'eagle_sky_dive': 'special_grab',
  'eagle_tempest': 'ultimate',
};

export default function FightScreen() {
  const router = useRouter();
  const { selectedCharacter, selectedStage, player1, player2, timer, setTimer, startMatch, updateFighters, round } = useGameStore();
  const { announcement, announceRound, announceFight, announceKO, announceCombo, clear: clearAnnouncer } = useAnnouncerManager();

  // HP & Ult animations
  const p1HpAnim = useRef(new Animated.Value(1)).current;
  const p2HpAnim = useRef(new Animated.Value(1)).current;
  const p1UltAnim = useRef(new Animated.Value(0)).current;

  // Fighter positions (animated)
  const p1X = useRef(new Animated.Value(SCREEN_W * 0.25)).current;
  const p1Y = useRef(new Animated.Value(ARENA_BOTTOM - 60)).current;
  const p2X = useRef(new Animated.Value(SCREEN_W * 0.65)).current;
  const p2Y = useRef(new Animated.Value(ARENA_BOTTOM - 60)).current;

  // Raw position tracking for movement
  const p1Pos = useRef({ x: SCREEN_W * 0.25, y: ARENA_BOTTOM - 60 });
  const p2Pos = useRef({ x: SCREEN_W * 0.65, y: ARENA_BOTTOM - 60 });
  const joystickInput = useRef<JoystickInput>({ dx: 0, dy: 0, angle: 0, magnitude: 0, active: false });

  // State
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [comboIndex, setComboIndex] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [fightStarted, setFightStarted] = useState(false);
  const [p1Pose, setP1Pose] = useState<FighterPose>('idle');
  const [p2Pose, setP2Pose] = useState<FighterPose>('idle');
  const [p1Facing, setP1Facing] = useState<'left' | 'right'>('right');
  const [p2Facing, setP2Facing] = useState<'left' | 'right'>('left');
  const [isMoving, setIsMoving] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [lastSkillName, setLastSkillName] = useState<string | null>(null);
  const [dmgPopups, setDmgPopups] = useState<Array<{ id: number; x: number; y: number; dmg: number; crit: boolean }>>([]);

  const stageId = selectedStage || 'ancient_temple';
  const charId = selectedCharacter || 'tiger';
  const charConfig = registry.get(charId);
  const opponentId = charId === 'tiger' ? 'lion' : charId === 'lion' ? 'tiger' : charId === 'crocodile' ? 'eagle' : 'tiger';
  const opponentConfig = registry.get(opponentId);
  const charColor = ELEMENT_COLORS[charId] || '#FF6B35';

  // --- Audio ---
  useEffect(() => {
    audioManager.playBGM('fight_theme');
    return () => { audioManager.stopBGM(); clearAnnouncer(); };
  }, [clearAnnouncer]);

  // Init match
  useEffect(() => {
    const initBackend = async () => {
      const gameMode = useGameStore.getState().gameMode;
      if (gameMode === 'practice') {
        const res = await api.startPractice(charId, stageId);
        if (res.data) usePlayerStore.getState().setFreePractice(res.data.free_practice_left);
      }
    };
    initBackend();

    const p1Char = registry.get(charId);
    const p2Char = registry.get(opponentId);
    const maxHp1 = p1Char?.stats.hp ? p1Char.stats.hp * 10 : 1000;
    const maxHp2 = p2Char?.stats.hp ? p2Char.stats.hp * 10 : 1000;

    startMatch(`match_${Date.now()}`, {
      characterId: charId, playerId: 'player1',
      hp: maxHp1, maxHp: maxHp1, ultGauge: 0,
      position: { x: SCREEN_W * 0.25, y: ARENA_BOTTOM - 60 },
      facing: 'right', state: 'idle', comboCount: 0,
    }, {
      characterId: opponentId, playerId: 'ai',
      hp: maxHp2, maxHp: maxHp2, ultGauge: 0,
      position: { x: SCREEN_W * 0.65, y: ARENA_BOTTOM - 60 },
      facing: 'left', state: 'idle', comboCount: 0,
    });

    announceRound(round);
    setTimeout(() => {
      announceFight();
      setTimeout(() => { setFightStarted(true); startTimer(); startGameLoop(); startAILoop(); }, 1300);
    }, 1200);
  }, []);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupId = useRef(0);

  const startTimer = () => {
    let t = 99;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimer(t);
      if (t <= 0) { clearInterval(timerRef.current!); endFight(); }
    }, 1000);
  };

  // 30fps game loop for movement
  const startGameLoop = () => {
    gameLoopRef.current = setInterval(() => {
      const input = joystickInput.current;
      if (!input.active || input.magnitude < 0.1) {
        setIsMoving(false);
        return;
      }

      setIsMoving(true);
      const speed = MOVE_SPEED * input.magnitude;
      let nx = p1Pos.current.x + input.dx * speed;
      let ny = p1Pos.current.y + input.dy * speed;

      // Clamp to arena
      nx = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT - 40, nx));
      ny = Math.max(ARENA_TOP, Math.min(ARENA_BOTTOM, ny));

      p1Pos.current = { x: nx, y: ny };
      p1X.setValue(nx);
      p1Y.setValue(ny);

      // Auto-face opponent
      if (nx < p2Pos.current.x) setP1Facing('right');
      else setP1Facing('left');

      // Set walk pose if not attacking
      if (!isAttacking) setP1Pose('walk');
    }, 33);
  };

  // AI movement + attacks
  const startAILoop = () => {
    aiRef.current = setInterval(() => {
      const state = useGameStore.getState();
      if (!state.player1 || !state.player2 || state.player1.hp <= 0 || state.player2.hp <= 0) return;

      const aiChar = registry.get(opponentId);
      if (!aiChar) return;

      // AI movement: approach player
      const dx = p1Pos.current.x - p2Pos.current.x;
      const dy = p1Pos.current.y - p2Pos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 80) {
        // Move toward player
        const moveSpeed = 1.5;
        const nx = p2Pos.current.x + (dx / dist) * moveSpeed;
        const ny = p2Pos.current.y + (dy / dist) * moveSpeed;
        p2Pos.current = {
          x: Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT - 40, nx)),
          y: Math.max(ARENA_TOP, Math.min(ARENA_BOTTOM, ny)),
        };
        p2X.setValue(p2Pos.current.x);
        p2Y.setValue(p2Pos.current.y);
        setP2Pose('walk');
        setP2Facing(dx > 0 ? 'right' : 'left');
      } else {
        // Close enough — attack
        setP2Facing(dx > 0 ? 'right' : 'left');

        const aiMoves = [...aiChar.moveset.normalAttack, aiChar.moveset.specialSkill1, aiChar.moveset.specialSkill2];
        const aiMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];

        // Show AI attack pose
        const aiPose = SKILL_POSE_MAP[aiMove.id] || 'jab';
        setP2Pose(aiPose);
        setTimeout(() => setP2Pose('idle'), 600);

        const atkMulti = (aiChar.stats.atk || 20) / 25;
        const defMulti = (registry.get(charId)?.stats.def || 16) / 30;
        const rawDmg = aiMove.damage * atkMulti * (1 - defMulti * 0.3);
        const dmg = Math.floor(rawDmg * (0.8 + Math.random() * 0.4));

        const newP1Hp = Math.max(0, state.player1.hp - dmg);
        updateFighters(
          { hp: newP1Hp, ultGauge: Math.min(100, (state.player1.ultGauge || 0) + 3) },
          {}
        );
        Animated.timing(p1HpAnim, { toValue: newP1Hp / state.player1.maxHp, duration: 300, useNativeDriver: false }).start();

        // Show hit on P1
        setP1Pose('hit');
        setTimeout(() => { if (!isAttacking) setP1Pose('idle'); }, 400);
        audioManager.playSFX(dmg > 30 ? 'hit_heavy' : 'hit_light');

        // Damage popup on P1
        addDmgPopup(p1Pos.current.x, p1Pos.current.y - 30, dmg, false);

        if (newP1Hp <= 0) {
          clearInterval(aiRef.current!);
          clearInterval(gameLoopRef.current!);
          setP1Pose('ko');
          announceKO();
          audioManager.playSFX('ko');
          setTimeout(() => endFight(), 2000);
        }
      }
    }, 2000 + Math.random() * 1500);
  };

  const addDmgPopup = (x: number, y: number, dmg: number, crit: boolean) => {
    const id = ++popupId.current;
    setDmgPopups(prev => [...prev, { id, x, y, dmg, crit }]);
    setTimeout(() => setDmgPopups(prev => prev.filter(p => p.id !== id)), 1000);
  };

  // Player uses a skill
  const useSkill = useCallback((skill: SkillDef, isCombo = false) => {
    if (!fightStarted || isAttacking) return;
    const state = useGameStore.getState();
    if (!state.player1 || !state.player2 || state.player2.hp <= 0 || state.player1.hp <= 0) return;
    if (skill.cooldown > 0 && cooldowns[skill.id] && Date.now() < cooldowns[skill.id]) return;
    if (skill === charConfig?.moveset.ultimate && (state.player1.ultGauge || 0) < 100) return;

    setIsAttacking(true);

    // Set fighter pose
    const pose = SKILL_POSE_MAP[skill.id] || 'jab';
    setP1Pose(pose);
    setLastSkillName(skill.name);

    // Damage calc
    const atkMulti = (charConfig?.stats.atk || 20) / 25;
    const defMulti = (opponentConfig?.stats.def || 16) / 30;
    const rawDmg = skill.damage * atkMulti * (1 - defMulti * 0.3);
    const crit = Math.random() < 0.15;
    const dmg = Math.floor(rawDmg * (0.8 + Math.random() * 0.4) * (crit ? 1.5 : 1));

    // Check distance — need to be close for melee
    const dx = p2Pos.current.x - p1Pos.current.x;
    const dy = p2Pos.current.y - p1Pos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const range = skill.type === 'projectile' ? 300 : 120;

    if (dist > range) {
      // Too far — whiff
      setLastSkillName(`${skill.name} (Miss!)`);
      const recoveryMs = Math.max(300, (skill.startup + skill.active + skill.recovery) * 16);
      setTimeout(() => { setIsAttacking(false); setP1Pose('idle'); setLastSkillName(null); }, Math.min(recoveryMs, 600));
      return;
    }

    const newP2Hp = Math.max(0, state.player2.hp - dmg);

    // Combo
    const newCombo = isCombo ? comboCount + 1 : 1;
    setComboCount(newCombo);
    if (newCombo >= 3) announceCombo(newCombo);
    if (comboResetRef.current) clearTimeout(comboResetRef.current);
    comboResetRef.current = setTimeout(() => { setComboCount(0); setComboIndex(0); }, 2000);

    // Ult gauge
    const ultGain = skill.cooldown > 0 ? 15 : 5;
    const newUlt = skill === charConfig?.moveset.ultimate ? 0 : Math.min(100, (state.player1.ultGauge || 0) + ultGain);

    updateFighters({ ultGauge: newUlt, comboCount: newCombo }, { hp: newP2Hp });
    Animated.timing(p2HpAnim, { toValue: newP2Hp / state.player2.maxHp, duration: 300, useNativeDriver: false }).start();
    Animated.timing(p1UltAnim, { toValue: newUlt / 100, duration: 300, useNativeDriver: false }).start();

    // Hit effect on P2
    setP2Pose('hit');
    setTimeout(() => setP2Pose('idle'), 400);
    audioManager.playSFX(dmg > 50 ? 'hit_heavy' : 'hit_light');

    // Damage popup
    addDmgPopup(p2Pos.current.x, p2Pos.current.y - 30, dmg, crit);

    // Knockback effect on P2
    if (skill.effect === 'knockback' || skill.effect === 'knockdown') {
      const kbDist = 30;
      const kbDir = dx !== 0 ? dx / Math.abs(dx) : 1;
      p2Pos.current.x = Math.max(ARENA_LEFT, Math.min(ARENA_RIGHT - 40, p2Pos.current.x + kbDir * kbDist));
      Animated.spring(p2X, { toValue: p2Pos.current.x, friction: 5, useNativeDriver: false }).start();
    }

    // Cooldown
    if (skill.cooldown > 0) setCooldowns(prev => ({ ...prev, [skill.id]: Date.now() + skill.cooldown }));

    const recoveryMs = Math.max(200, (skill.startup + skill.active + skill.recovery) * 16);
    setTimeout(() => { setIsAttacking(false); setP1Pose('idle'); setLastSkillName(null); }, Math.min(recoveryMs, 800));

    if (newP2Hp <= 0) {
      if (aiRef.current) clearInterval(aiRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      setP2Pose('ko');
      announceKO();
      audioManager.playSFX('ko');
      setTimeout(() => endFight(), 2000);
    }
  }, [fightStarted, isAttacking, cooldowns, comboCount, charConfig, opponentConfig]);

  const doNormalAttack = useCallback(() => {
    if (!charConfig) return;
    const chain = charConfig.moveset.normalAttack;
    const skill = chain[comboIndex % chain.length];
    useSkill(skill, comboIndex > 0);
    setComboIndex(prev => (prev + 1) % chain.length);
  }, [charConfig, comboIndex, useSkill]);

  const endFight = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (aiRef.current) clearInterval(aiRef.current);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    audioManager.stopBGM();
    setTimeout(() => router.replace('/result'), 500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiRef.current) clearInterval(aiRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      if (comboResetRef.current) clearTimeout(comboResetRef.current);
    };
  }, []);

  // Joystick handler
  const handleJoystick = useCallback((input: JoystickInput) => {
    joystickInput.current = input;
    if (!input.active || input.magnitude < 0.1) {
      setIsMoving(false);
      if (!isAttacking) setP1Pose('idle');
    }
  }, [isAttacking]);

  // Cooldown timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, []);
  const getCooldownLeft = (skillId: string) => {
    const cd = cooldowns[skillId];
    if (!cd || now >= cd) return 0;
    return Math.ceil((cd - now) / 1000);
  };

  const state = useGameStore.getState();
  const p1Hp = state.player1?.hp ?? 100;
  const p1Ult = state.player1?.ultGauge ?? 0;
  const moveset = charConfig?.moveset;

  return (
    <View style={styles.container}>
      <StageBackground stageId={stageId} />

      {/* HUD */}
      <View style={styles.hudTop}>
        <View style={styles.hpSection}>
          <Text style={styles.charLabel}>{CHAR_EMOJI[charId]} {charConfig?.name}</Text>
          <View style={styles.hpBarBg}>
            <Animated.View style={[styles.hpBarFill, styles.hpFillP1, {
              width: p1HpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
            }]} />
          </View>
        </View>
        <View style={styles.timerBox}>
          <Text style={[styles.timerText, timer <= 10 && styles.timerUrgent]}>{timer}</Text>
          <Text style={styles.roundLabel}>R{round}</Text>
        </View>
        <View style={[styles.hpSection, styles.hpSectionRight]}>
          <Text style={styles.charLabel}>{opponentConfig?.name} {CHAR_EMOJI[opponentId]}</Text>
          <View style={styles.hpBarBg}>
            <Animated.View style={[styles.hpBarFill, styles.hpFillP2, {
              width: p2HpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
            }]} />
          </View>
        </View>
      </View>

      {/* Ult Gauge */}
      <View style={styles.ultBarContainer}>
        <View style={styles.ultBarBg}>
          <Animated.View style={[styles.ultBarFill, {
            width: p1UltAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            backgroundColor: p1Ult >= 100 ? '#FFD700' : charColor,
          }]} />
        </View>
        <Text style={[styles.ultLabel, p1Ult >= 100 && styles.ultReady]}>
          {p1Ult >= 100 ? '⚡ ULT!' : `⚡ ${p1Ult}%`}
        </Text>
      </View>

      {/* Arena */}
      <View style={styles.arena}>
        {/* Combo counter */}
        {comboCount >= 2 && (
          <View style={styles.comboDisplay}>
            <Text style={[styles.comboText, { color: charColor }]}>{comboCount} HIT!</Text>
          </View>
        )}

        {/* Skill name */}
        {lastSkillName && (
          <View style={styles.skillNameDisplay}>
            <Text style={styles.skillNameText}>{lastSkillName}</Text>
          </View>
        )}

        {/* Damage popups */}
        {dmgPopups.map(p => (
          <View key={p.id} style={[styles.dmgPopup, { left: p.x, top: p.y }]}>
            <Text style={[styles.dmgText, p.crit && styles.dmgCrit]}>
              {p.crit ? '💥' : ''}{p.dmg}
            </Text>
          </View>
        ))}

        {/* P1 Fighter Sprite */}
        <Animated.View style={[styles.fighterContainer, { left: p1X, top: p1Y }]}>
          <FighterSprite
            characterId={charId}
            pose={p1Pose}
            facing={p1Facing}
            size={70}
            moving={isMoving && p1Pose === 'walk'}
          />
        </Animated.View>

        {/* P2 Fighter Sprite */}
        <Animated.View style={[styles.fighterContainer, { left: p2X, top: p2Y }]}>
          <FighterSprite
            characterId={opponentId}
            pose={p2Pose}
            facing={p2Facing}
            size={70}
            moving={p2Pose === 'walk'}
          />
        </Animated.View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controlsPanel}>
        {/* Left: Joystick */}
        <View style={styles.joystickArea}>
          <VirtualJoystick
            size={110}
            onMove={handleJoystick}
            color={charColor}
          />
        </View>

        {/* Right: Skill buttons */}
        {moveset && (
          <View style={styles.skillArea}>
            {/* Special skills in a circle layout around normal attack */}
            <View style={styles.skillCircle}>
              {/* Top: Special 1 */}
              <TouchableOpacity
                style={[styles.sBtn, styles.sBtnTop, getCooldownLeft(moveset.specialSkill1.id) > 0 && styles.btnCooldown]}
                onPress={() => useSkill(moveset.specialSkill1)}
                disabled={!fightStarted}
                activeOpacity={0.7}
              >
                {getCooldownLeft(moveset.specialSkill1.id) > 0 ? (
                  <Text style={styles.cdText}>{getCooldownLeft(moveset.specialSkill1.id)}</Text>
                ) : (
                  <>
                    <Text style={styles.sBtnIcon}>{EFFECT_ICONS[moveset.specialSkill1.effect || ''] || '⚔️'}</Text>
                    <Text style={styles.sBtnLabel} numberOfLines={1}>{moveset.specialSkill1.name.split(' ').pop()}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Left: Special 2 */}
              <TouchableOpacity
                style={[styles.sBtn, styles.sBtnLeft, getCooldownLeft(moveset.specialSkill2.id) > 0 && styles.btnCooldown]}
                onPress={() => useSkill(moveset.specialSkill2)}
                disabled={!fightStarted}
                activeOpacity={0.7}
              >
                {getCooldownLeft(moveset.specialSkill2.id) > 0 ? (
                  <Text style={styles.cdText}>{getCooldownLeft(moveset.specialSkill2.id)}</Text>
                ) : (
                  <>
                    <Text style={styles.sBtnIcon}>{EFFECT_ICONS[moveset.specialSkill2.effect || ''] || '⚔️'}</Text>
                    <Text style={styles.sBtnLabel} numberOfLines={1}>{moveset.specialSkill2.name.split(' ').pop()}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Center: Normal Attack */}
              <TouchableOpacity
                style={[styles.normalBtn, { backgroundColor: charColor }, isAttacking && styles.btnDisabled]}
                onPress={doNormalAttack}
                disabled={!fightStarted}
                activeOpacity={0.7}
              >
                <Text style={styles.normalBtnIcon}>👊</Text>
              </TouchableOpacity>

              {/* Right: Special 3 */}
              <TouchableOpacity
                style={[styles.sBtn, styles.sBtnRight, getCooldownLeft(moveset.specialSkill3.id) > 0 && styles.btnCooldown]}
                onPress={() => useSkill(moveset.specialSkill3)}
                disabled={!fightStarted}
                activeOpacity={0.7}
              >
                {getCooldownLeft(moveset.specialSkill3.id) > 0 ? (
                  <Text style={styles.cdText}>{getCooldownLeft(moveset.specialSkill3.id)}</Text>
                ) : (
                  <>
                    <Text style={styles.sBtnIcon}>{EFFECT_ICONS[moveset.specialSkill3.effect || ''] || '⚔️'}</Text>
                    <Text style={styles.sBtnLabel} numberOfLines={1}>{moveset.specialSkill3.name.split(' ').pop()}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Bottom: Special 4 */}
              <TouchableOpacity
                style={[styles.sBtn, styles.sBtnBottom, getCooldownLeft(moveset.specialSkill4.id) > 0 && styles.btnCooldown]}
                onPress={() => useSkill(moveset.specialSkill4)}
                disabled={!fightStarted}
                activeOpacity={0.7}
              >
                {getCooldownLeft(moveset.specialSkill4.id) > 0 ? (
                  <Text style={styles.cdText}>{getCooldownLeft(moveset.specialSkill4.id)}</Text>
                ) : (
                  <>
                    <Text style={styles.sBtnIcon}>{EFFECT_ICONS[moveset.specialSkill4.effect || ''] || '⚔️'}</Text>
                    <Text style={styles.sBtnLabel} numberOfLines={1}>{moveset.specialSkill4.name.split(' ').pop()}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Ultimate */}
            <TouchableOpacity
              style={[styles.ultBtn, p1Ult < 100 ? styles.ultBtnLocked : { backgroundColor: charColor, borderColor: '#FFD700' }]}
              onPress={() => moveset.ultimate && useSkill(moveset.ultimate)}
              disabled={!fightStarted || p1Ult < 100}
              activeOpacity={0.7}
            >
              <Text style={styles.ultBtnIcon}>🔥</Text>
              <Text style={[styles.ultBtnText, p1Ult >= 100 && { color: '#FFF' }]}>
                {p1Ult >= 100 ? 'ULT' : `${p1Ult}%`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Announcer */}
      {announcement && (
        <Animated.View style={[styles.announcementContainer, {
          opacity: announcement.opacity,
          transform: [
            { scale: announcement.scale },
            { translateY: announcement.translateY },
            { rotate: announcement.rotation.interpolate({ inputRange: [-1, 1], outputRange: ['-15deg', '15deg'] }) },
          ],
        }]}>
          <Text style={[styles.announcementStroke, { color: announcement.strokeColor, fontSize: announcement.fontSize + 2 }]}>
            {announcement.text}
          </Text>
          <Text style={[styles.announcementText, { color: announcement.color, fontSize: announcement.fontSize }]}>
            {announcement.text}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // HUD
  hudTop: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, alignItems: 'flex-start', zIndex: 10 },
  hpSection: { flex: 1 },
  hpSectionRight: { alignItems: 'flex-end' },
  charLabel: { fontSize: 12, fontWeight: 'bold', color: '#FFF', marginBottom: 2, textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  hpBarBg: { height: 10, backgroundColor: 'rgba(51,51,51,0.8)', borderRadius: 5, overflow: 'hidden', width: '100%' },
  hpBarFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 5 },
  hpFillP1: { left: 0, backgroundColor: '#22C55E' },
  hpFillP2: { right: 0, backgroundColor: '#EF4444' },
  timerBox: { width: 46, alignItems: 'center', marginHorizontal: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  timerText: { fontSize: 18, fontWeight: 'bold', color: '#FFF', fontVariant: ['tabular-nums'] },
  timerUrgent: { color: '#EF4444' },
  roundLabel: { fontSize: 8, color: '#B0B0C0', fontWeight: 'bold' },

  // Ult bar
  ultBarContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginTop: 4, zIndex: 10 },
  ultBarBg: { flex: 1, height: 5, backgroundColor: 'rgba(51,51,51,0.6)', borderRadius: 3, overflow: 'hidden' },
  ultBarFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: 3 },
  ultLabel: { fontSize: 9, color: '#888', marginLeft: 6, fontWeight: 'bold', width: 50 },
  ultReady: { color: '#FFD700' },

  // Arena
  arena: { flex: 1, position: 'relative', overflow: 'hidden' },
  fighterContainer: { position: 'absolute', zIndex: 5 },

  // Combo
  comboDisplay: { position: 'absolute', top: 5, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  comboText: { fontSize: 20, fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5, letterSpacing: 2 },

  // Skill name
  skillNameDisplay: { position: 'absolute', top: '25%', left: 0, right: 0, alignItems: 'center', zIndex: 15 },
  skillNameText: { fontSize: 15, fontWeight: 'bold', color: '#FFD700', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },

  // Damage popup
  dmgPopup: { position: 'absolute', zIndex: 30 },
  dmgText: { fontSize: 18, fontWeight: '900', color: '#FFF', textShadowColor: '#000', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  dmgCrit: { color: '#FFD700', fontSize: 22 },

  // Controls
  controlsPanel: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingBottom: 16,
    paddingTop: 6,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    height: 170,
  },
  joystickArea: { justifyContent: 'center', alignItems: 'center', width: 120 },

  // Skill area (right side)
  skillArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  skillCircle: {
    width: 160,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Normal attack (center)
  normalBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    zIndex: 2,
  },
  normalBtnIcon: { fontSize: 26 },

  // Special buttons (around center)
  sBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sBtnTop: { top: 0 },
  sBtnBottom: { bottom: 0 },
  sBtnLeft: { left: 0, top: '50%', marginTop: -22 },
  sBtnRight: { right: 0, top: '50%', marginTop: -22 },
  sBtnIcon: { fontSize: 18 },
  sBtnLabel: { fontSize: 7, color: '#CCC', marginTop: 1 },

  btnCooldown: { opacity: 0.35, backgroundColor: 'rgba(100,100,100,0.3)' },
  btnDisabled: { opacity: 0.5 },
  cdText: { fontSize: 16, fontWeight: 'bold', color: '#FF6B35' },

  // Ultimate
  ultBtn: {
    marginTop: 4,
    width: 70,
    height: 28,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(50,50,50,0.6)',
    gap: 4,
  },
  ultBtnLocked: { opacity: 0.35 },
  ultBtnIcon: { fontSize: 14 },
  ultBtnText: { fontSize: 11, fontWeight: 'bold', color: '#888' },

  // Announcement
  announcementContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  announcementText: { fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 10, letterSpacing: 4 },
  announcementStroke: { position: 'absolute', fontWeight: '900', textShadowColor: '#000', textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 12, letterSpacing: 4, opacity: 0.5 },
});
