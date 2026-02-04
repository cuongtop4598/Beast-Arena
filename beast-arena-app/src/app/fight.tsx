import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../stores/useGameStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { registry } from '../characters/registry';
import { SkillDef } from '../characters/types';
import * as api from '../services/api';
import { audioManager } from '../engine/AudioManager';
import { useAnnouncerManager } from '../engine/AnnouncerManager';
import StageBackground from '../components/game/StageBackground';

const { width: SCREEN_W } = Dimensions.get('window');

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯',
  lion: '🦁',
  crocodile: '🐊',
  eagle: '🦅',
};

const ELEMENT_COLORS: Record<string, string> = {
  tiger: '#FF6B35',
  lion: '#FFD700',
  crocodile: '#22C55E',
  eagle: '#3B82F6',
};

const SKILL_ICONS: Record<string, string> = {
  strike: '👊',
  grab: '🤜',
  projectile: '💥',
  buff: '✨',
};

const EFFECT_ICONS: Record<string, string> = {
  stun: '💫',
  knockback: '💨',
  knockdown: '⬇️',
  slow: '🐌',
};

export default function FightScreen() {
  const router = useRouter();
  const { selectedCharacter, selectedStage, player1, player2, timer, setTimer, startMatch, updateFighters, endRound, round } = useGameStore();
  const { announcement, announceRound, announceFight, announceKO, announceCombo, clear: clearAnnouncer } = useAnnouncerManager();

  // HP animations
  const p1HpAnim = useRef(new Animated.Value(1)).current;
  const p2HpAnim = useRef(new Animated.Value(1)).current;
  // Ult gauge animation
  const p1UltAnim = useRef(new Animated.Value(0)).current;

  // Skill cooldown tracking
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [comboIndex, setComboIndex] = useState(0);
  const [isAttacking, setIsAttacking] = useState(false);
  const [fightStarted, setFightStarted] = useState(false);
  const [hitFlash, setHitFlash] = useState<'p1' | 'p2' | null>(null);
  const [lastSkillName, setLastSkillName] = useState<string | null>(null);
  const [comboCount, setComboCount] = useState(0);

  // Fighter position animations
  const p1PosX = useRef(new Animated.Value(0)).current;
  const p2PosX = useRef(new Animated.Value(0)).current;
  const p1Shake = useRef(new Animated.Value(0)).current;
  const p2Shake = useRef(new Animated.Value(0)).current;

  const stageId = selectedStage || 'ancient_temple';
  const charId = selectedCharacter || 'tiger';
  const charConfig = registry.get(charId);
  const opponentId = charId === 'tiger' ? 'lion' : charId === 'lion' ? 'tiger' : charId === 'crocodile' ? 'eagle' : 'tiger';
  const opponentConfig = registry.get(opponentId);
  const charColor = ELEMENT_COLORS[charId] || '#FF6B35';

  // --- Audio ---
  useEffect(() => {
    audioManager.playBGM('fight_theme');
    return () => {
      audioManager.stopBGM();
      clearAnnouncer();
    };
  }, [clearAnnouncer]);

  // Initialize match
  useEffect(() => {
    const initBackend = async () => {
      const gameMode = useGameStore.getState().gameMode;
      if (gameMode === 'practice') {
        const res = await api.startPractice(charId, stageId);
        if (res.data) {
          usePlayerStore.getState().setFreePractice(res.data.free_practice_left);
        }
      }
    };
    initBackend();

    const p1Char = registry.get(charId);
    const p2Char = registry.get(opponentId);
    const maxHp1 = p1Char?.stats.hp ? p1Char.stats.hp * 10 : 1000;
    const maxHp2 = p2Char?.stats.hp ? p2Char.stats.hp * 10 : 1000;

    startMatch(`match_${Date.now()}`, {
      characterId: charId,
      playerId: 'player1',
      hp: maxHp1,
      maxHp: maxHp1,
      ultGauge: 0,
      position: { x: 100, y: 400 },
      facing: 'right',
      state: 'idle',
      comboCount: 0,
    }, {
      characterId: opponentId,
      playerId: 'ai',
      hp: maxHp2,
      maxHp: maxHp2,
      ultGauge: 0,
      position: { x: 600, y: 400 },
      facing: 'left',
      state: 'idle',
      comboCount: 0,
    });

    announceRound(round);
    setTimeout(() => {
      announceFight();
      setTimeout(() => {
        setFightStarted(true);
        startTimer();
        startAILoop();
      }, 1300);
    }, 1200);
  }, []);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const comboResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = () => {
    let t = 99;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimer(t);
      if (t <= 0) {
        clearInterval(timerRef.current!);
        endFight();
      }
    }, 1000);
  };

  // AI auto-attacks periodically
  const startAILoop = () => {
    aiRef.current = setInterval(() => {
      const state = useGameStore.getState();
      if (!state.player1 || !state.player2 || state.player1.hp <= 0 || state.player2.hp <= 0) return;

      const aiChar = registry.get(opponentId);
      if (!aiChar) return;

      // AI picks a random attack
      const aiMoves = [
        ...aiChar.moveset.normalAttack,
        aiChar.moveset.specialSkill1,
        aiChar.moveset.specialSkill2,
      ];
      const aiMove = aiMoves[Math.floor(Math.random() * aiMoves.length)];
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

      // Shake P1
      shakeAnim(p1Shake);
      setHitFlash('p1');
      setTimeout(() => setHitFlash(null), 150);
      audioManager.playSFX(dmg > 30 ? 'hit_heavy' : 'hit_light');

      if (newP1Hp <= 0) {
        clearInterval(aiRef.current!);
        announceKO();
        audioManager.playSFX('ko');
        setTimeout(() => endFight(), 2000);
      }
    }, 2500 + Math.random() * 1500);
  };

  const shakeAnim = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 5, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -5, duration: 40, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 30, useNativeDriver: true }),
    ]).start();
  };

  // Player uses a skill
  const useSkill = useCallback((skill: SkillDef, isCombo = false) => {
    if (!fightStarted || isAttacking) return;

    const state = useGameStore.getState();
    if (!state.player1 || !state.player2 || state.player2.hp <= 0 || state.player1.hp <= 0) return;

    // Check cooldown
    if (skill.cooldown > 0 && cooldowns[skill.id] && Date.now() < cooldowns[skill.id]) return;

    // Check ult gauge
    if (skill === charConfig?.moveset.ultimate && (state.player1.ultGauge || 0) < 100) return;

    setIsAttacking(true);
    setLastSkillName(skill.name);

    // Calculate damage based on stats
    const atkMulti = (charConfig?.stats.atk || 20) / 25;
    const defMulti = (opponentConfig?.stats.def || 16) / 30;
    const rawDmg = skill.damage * atkMulti * (1 - defMulti * 0.3);
    const dmg = Math.floor(rawDmg * (0.8 + Math.random() * 0.4));

    const newP2Hp = Math.max(0, state.player2.hp - dmg);

    // Combo tracking
    const newCombo = isCombo ? comboCount + 1 : 1;
    setComboCount(newCombo);
    if (newCombo >= 3) {
      announceCombo(newCombo);
    }

    // Reset combo after 2s of no attacks
    if (comboResetRef.current) clearTimeout(comboResetRef.current);
    comboResetRef.current = setTimeout(() => {
      setComboCount(0);
      setComboIndex(0);
    }, 2000);

    // Ult gauge gain (more for specials)
    const ultGain = skill.cooldown > 0 ? 15 : 5;
    const newUlt = skill === charConfig?.moveset.ultimate ? 0 : Math.min(100, (state.player1.ultGauge || 0) + ultGain);

    updateFighters(
      { ultGauge: newUlt, comboCount: newCombo },
      { hp: newP2Hp }
    );

    Animated.timing(p2HpAnim, { toValue: newP2Hp / state.player2.maxHp, duration: 300, useNativeDriver: false }).start();
    Animated.timing(p1UltAnim, { toValue: newUlt / 100, duration: 300, useNativeDriver: false }).start();

    // Shake P2
    shakeAnim(p2Shake);
    setHitFlash('p2');
    setTimeout(() => setHitFlash(null), 150);

    // SFX
    audioManager.playSFX(dmg > 50 ? 'hit_heavy' : 'hit_light');

    // Set cooldown
    if (skill.cooldown > 0) {
      setCooldowns(prev => ({ ...prev, [skill.id]: Date.now() + skill.cooldown }));
    }

    // Recovery time based on skill frames
    const recoveryMs = Math.max(200, (skill.startup + skill.active + skill.recovery) * 16);
    setTimeout(() => {
      setIsAttacking(false);
      setLastSkillName(null);
    }, Math.min(recoveryMs, 800));

    // Check KO
    if (newP2Hp <= 0) {
      if (aiRef.current) clearInterval(aiRef.current);
      announceKO();
      audioManager.playSFX('ko');
      setTimeout(() => endFight(), 2000);
    }
  }, [fightStarted, isAttacking, cooldowns, comboCount, charConfig, opponentConfig]);

  // Normal attack combo chain
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
    audioManager.stopBGM();
    setTimeout(() => router.replace('/result'), 500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (aiRef.current) clearInterval(aiRef.current);
      if (comboResetRef.current) clearTimeout(comboResetRef.current);
    };
  }, []);

  // Cooldown timer display
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
  const p2Hp = state.player2?.hp ?? 100;
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
          {p1Ult >= 100 ? '⚡ ULT READY!' : `⚡ ${p1Ult}%`}
        </Text>
      </View>

      {/* Arena with fighters */}
      <View style={styles.arena}>
        {/* Combo counter */}
        {comboCount >= 2 && (
          <View style={styles.comboDisplay}>
            <Text style={[styles.comboText, { color: charColor }]}>{comboCount} HIT COMBO!</Text>
          </View>
        )}

        {/* Skill name display */}
        {lastSkillName && (
          <View style={styles.skillNameDisplay}>
            <Text style={styles.skillNameText}>{lastSkillName}</Text>
          </View>
        )}

        {/* P1 Fighter */}
        <Animated.View style={[styles.fighter, styles.fighterLeft, {
          transform: [{ translateX: Animated.add(p1PosX, p1Shake) }],
        }]}>
          <Text style={[styles.fighterEmoji, hitFlash === 'p1' && styles.hitFlash]}>{CHAR_EMOJI[charId]}</Text>
          <Text style={styles.fighterHpText}>{p1Hp}</Text>
        </Animated.View>

        {/* P2 Fighter */}
        <Animated.View style={[styles.fighter, styles.fighterRight, {
          transform: [{ translateX: Animated.add(p2PosX, p2Shake) }],
        }]}>
          <Text style={[styles.fighterEmoji, { transform: [{ scaleX: -1 }] }, hitFlash === 'p2' && styles.hitFlash]}>{CHAR_EMOJI[opponentId]}</Text>
          <Text style={styles.fighterHpText}>{p2Hp}</Text>
        </Animated.View>
      </View>

      {/* Controls Panel */}
      {moveset && (
        <View style={styles.controlsPanel}>
          {/* Row 1: Normal Attack (big) + Block */}
          <View style={styles.controlRow}>
            <TouchableOpacity
              style={[styles.normalAtkBtn, { backgroundColor: charColor }, isAttacking && styles.btnDisabled]}
              onPress={doNormalAttack}
              activeOpacity={0.7}
              disabled={!fightStarted}
            >
              <Text style={styles.normalAtkEmoji}>👊</Text>
              <Text style={styles.normalAtkText}>Đánh</Text>
              <Text style={styles.comboHint}>
                {moveset.normalAttack[comboIndex % moveset.normalAttack.length]?.name}
              </Text>
            </TouchableOpacity>

            <View style={styles.specialGrid}>
              {/* Special Skills 1-4 */}
              {([moveset.specialSkill1, moveset.specialSkill2, moveset.specialSkill3, moveset.specialSkill4] as SkillDef[]).map((skill, i) => {
                const cdLeft = getCooldownLeft(skill.id);
                const onCooldown = cdLeft > 0;
                return (
                  <TouchableOpacity
                    key={skill.id}
                    style={[
                      styles.specialBtn,
                      onCooldown && styles.btnCooldown,
                      isAttacking && styles.btnDisabled,
                    ]}
                    onPress={() => useSkill(skill)}
                    activeOpacity={0.7}
                    disabled={!fightStarted || onCooldown}
                  >
                    <Text style={styles.specialBtnEmoji}>
                      {skill.effect ? EFFECT_ICONS[skill.effect] || '⚔️' : SKILL_ICONS[skill.type] || '⚔️'}
                    </Text>
                    <Text style={styles.specialBtnName} numberOfLines={1}>{skill.name}</Text>
                    {onCooldown && (
                      <View style={styles.cdOverlay}>
                        <Text style={styles.cdText}>{cdLeft}s</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Row 2: Ultimate */}
          <TouchableOpacity
            style={[
              styles.ultBtn,
              p1Ult < 100 && styles.ultBtnLocked,
              p1Ult >= 100 && { backgroundColor: charColor, borderColor: '#FFD700' },
            ]}
            onPress={() => moveset.ultimate && useSkill(moveset.ultimate)}
            activeOpacity={0.7}
            disabled={!fightStarted || p1Ult < 100}
          >
            <Text style={styles.ultBtnEmoji}>🔥</Text>
            <Text style={[styles.ultBtnText, p1Ult >= 100 && styles.ultBtnTextReady]}>
              {moveset.ultimate?.name || 'Ultimate'}
            </Text>
            {p1Ult < 100 && <Text style={styles.ultBtnPct}>{p1Ult}%</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Announcer overlay */}
      {announcement && (
        <Animated.View
          style={[
            styles.announcementContainer,
            {
              opacity: announcement.opacity,
              transform: [
                { scale: announcement.scale },
                { translateY: announcement.translateY },
                { rotate: announcement.rotation.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-15deg', '15deg'],
                }) },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.announcementStroke,
              { color: announcement.strokeColor, fontSize: announcement.fontSize + 2 },
            ]}
          >
            {announcement.text}
          </Text>
          <Text
            style={[
              styles.announcementText,
              { color: announcement.color, fontSize: announcement.fontSize },
            ]}
          >
            {announcement.text}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // HUD
  hudTop: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  hpSection: { flex: 1 },
  hpSectionRight: { alignItems: 'flex-end' },
  charLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 3,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  hpBarBg: {
    height: 12,
    backgroundColor: 'rgba(51,51,51,0.8)',
    borderRadius: 6,
    overflow: 'hidden',
    width: '100%',
  },
  hpBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 6,
  },
  hpFillP1: { left: 0, backgroundColor: '#22C55E' },
  hpFillP2: { right: 0, backgroundColor: '#EF4444' },
  timerBox: {
    width: 50,
    alignItems: 'center',
    marginHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontVariant: ['tabular-nums'],
  },
  timerUrgent: { color: '#EF4444' },
  roundLabel: { fontSize: 9, color: '#B0B0C0', fontWeight: 'bold' },

  // Ult gauge bar
  ultBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 6,
    zIndex: 10,
  },
  ultBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(51,51,51,0.6)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ultBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 3,
  },
  ultLabel: {
    fontSize: 10,
    color: '#888',
    marginLeft: 8,
    fontWeight: 'bold',
    width: 80,
  },
  ultReady: {
    color: '#FFD700',
  },

  // Arena
  arena: {
    flex: 1,
    justifyContent: 'center',
  },
  fighter: {
    position: 'absolute',
    bottom: '30%',
    alignItems: 'center',
  },
  fighterLeft: { left: SCREEN_W * 0.15 },
  fighterRight: { right: SCREEN_W * 0.15 },
  fighterEmoji: { fontSize: 56 },
  hitFlash: { opacity: 0.5 },
  fighterHpText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 2,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Combo display
  comboDisplay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  comboText: {
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    letterSpacing: 2,
  },

  // Skill name popup
  skillNameDisplay: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 15,
  },
  skillNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },

  // Controls Panel
  controlsPanel: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  controlRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // Normal attack button
  normalAtkBtn: {
    width: 90,
    height: 90,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  normalAtkEmoji: { fontSize: 28 },
  normalAtkText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 2,
  },
  comboHint: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },

  // Special skills 2x2 grid
  specialGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specialBtn: {
    width: '47%',
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  specialBtnEmoji: { fontSize: 18, marginRight: 6 },
  specialBtnName: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
    flex: 1,
  },
  btnCooldown: {
    opacity: 0.4,
    backgroundColor: 'rgba(100,100,100,0.3)',
  },
  btnDisabled: { opacity: 0.6 },
  cdOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },

  // Ultimate button
  ultBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(50,50,50,0.6)',
    gap: 8,
  },
  ultBtnLocked: { opacity: 0.4 },
  ultBtnEmoji: { fontSize: 20 },
  ultBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
  },
  ultBtnTextReady: { color: '#FFF' },
  ultBtnPct: {
    fontSize: 11,
    color: '#666',
    fontWeight: 'bold',
  },

  // Announcement
  announcementContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  announcementText: {
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 10,
    letterSpacing: 4,
  },
  announcementStroke: {
    position: 'absolute',
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 12,
    letterSpacing: 4,
    opacity: 0.5,
  },
});
