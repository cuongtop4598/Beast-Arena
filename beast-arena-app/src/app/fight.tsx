import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../stores/useGameStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { registry } from '../characters/registry';
import * as api from '../services/api';
import { audioManager } from '../engine/AudioManager';
import { useAnnouncerManager } from '../engine/AnnouncerManager';
import StageBackground from '../components/game/StageBackground';

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯',
  lion: '🦁',
  crocodile: '🐊',
  eagle: '🦅',
};

export default function FightScreen() {
  const router = useRouter();
  const { selectedCharacter, selectedStage, player1, player2, timer, setTimer, startMatch, updateFighters, endRound, round } = useGameStore();
  const { announcement, announceRound, announceFight, announceKO, clear: clearAnnouncer } = useAnnouncerManager();

  // HP animations
  const p1HpAnim = useRef(new Animated.Value(1)).current;
  const p2HpAnim = useRef(new Animated.Value(1)).current;

  const stageId = selectedStage || 'ancient_temple';
  const charId = selectedCharacter || 'tiger';
  const charConfig = registry.get(charId);
  const opponentId = charId === 'tiger' ? 'lion' : 'tiger';

  // --- Audio: Play fight BGM on mount ---
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
          console.log('[Fight] Practice match created:', res.data.match_id);
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

    // Announcement sequence: ROUND → FIGHT! → start
    announceRound(round);
    setTimeout(() => {
      announceFight();
      setTimeout(() => {
        startTimer();
        startSimulation();
      }, 1300);
    }, 1200);
  }, []);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Simple MVP fight simulation (AI auto-fights)
  const startSimulation = () => {
    simRef.current = setInterval(() => {
      const state = useGameStore.getState();
      if (!state.player1 || !state.player2) return;

      // Random damage exchange
      const p1Dmg = Math.floor(Math.random() * 15) + 5;
      const p2Dmg = Math.floor(Math.random() * 12) + 3;

      const newP1Hp = Math.max(0, state.player1.hp - p2Dmg);
      const newP2Hp = Math.max(0, state.player2.hp - p1Dmg);

      // Play hit SFX on damage
      if (p1Dmg > 10) {
        audioManager.playSFX('hit_heavy');
      } else {
        audioManager.playSFX('hit_light');
      }

      updateFighters(
        { hp: newP1Hp, ultGauge: Math.min(100, (state.player1.ultGauge || 0) + 5) },
        { hp: newP2Hp, ultGauge: Math.min(100, (state.player2.ultGauge || 0) + 3) }
      );

      // Animate HP bars
      Animated.timing(p1HpAnim, { toValue: newP1Hp / state.player1.maxHp, duration: 300, useNativeDriver: false }).start();
      Animated.timing(p2HpAnim, { toValue: newP2Hp / state.player2.maxHp, duration: 300, useNativeDriver: false }).start();

      // Check KO
      if (newP1Hp <= 0 || newP2Hp <= 0) {
        clearInterval(simRef.current!);
        announceKO();
        audioManager.playSFX('ko');
        setTimeout(() => endFight(), 2000);
      }
    }, 2000);
  };

  const endFight = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (simRef.current) clearInterval(simRef.current);
    audioManager.stopBGM();
    setTimeout(() => router.replace('/result'), 500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (simRef.current) clearInterval(simRef.current);
    };
  }, []);

  const state = useGameStore.getState();
  const p1Hp = state.player1?.hp ?? 100;
  const p2Hp = state.player2?.hp ?? 100;

  return (
    <View style={styles.container}>
      {/* Rich stage background with particles */}
      <StageBackground stageId={stageId} />

      {/* HUD */}
      <View style={styles.hudTop}>
        {/* P1 HP */}
        <View style={styles.hpSection}>
          <Text style={styles.charLabel}>{CHAR_EMOJI[charId]} {charConfig?.name}</Text>
          <View style={styles.hpBarBg}>
            <Animated.View style={[styles.hpBarFill, styles.hpFillP1, {
              width: p1HpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
            }]} />
          </View>
        </View>

        {/* Timer */}
        <View style={styles.timerBox}>
          <Text style={[styles.timerText, timer <= 10 && styles.timerUrgent]}>{timer}</Text>
          <Text style={styles.roundLabel}>R{round}</Text>
        </View>

        {/* P2 HP */}
        <View style={[styles.hpSection, styles.hpSectionRight]}>
          <Text style={styles.charLabel}>{registry.get(opponentId)?.name} {CHAR_EMOJI[opponentId]}</Text>
          <View style={styles.hpBarBg}>
            <Animated.View style={[styles.hpBarFill, styles.hpFillP2, {
              width: p2HpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
            }]} />
          </View>
        </View>
      </View>

      {/* Fighters */}
      <View style={styles.arena}>
        <Animated.View style={[styles.fighter, { left: 100 }]}>
          <Text style={styles.fighterEmoji}>{CHAR_EMOJI[charId]}</Text>
          <Text style={styles.fighterHpText}>{p1Hp}</Text>
        </Animated.View>

        <Animated.View style={[styles.fighter, { right: 100 }]}>
          <Text style={[styles.fighterEmoji, { transform: [{ scaleX: -1 }] }]}>{CHAR_EMOJI[opponentId]}</Text>
          <Text style={styles.fighterHpText}>{p2Hp}</Text>
        </Animated.View>
      </View>

      {/* Announcer overlay — comic-style */}
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
          {/* Comic-style text with stroke effect */}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  hpSection: {
    flex: 1,
  },
  hpSectionRight: {
    alignItems: 'flex-end',
  },
  charLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  hpBarBg: {
    height: 14,
    backgroundColor: 'rgba(51, 51, 51, 0.8)',
    borderRadius: 7,
    overflow: 'hidden',
    width: '100%',
  },
  hpBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 7,
  },
  hpFillP1: {
    left: 0,
    backgroundColor: '#22C55E',
  },
  hpFillP2: {
    right: 0,
    backgroundColor: '#EF4444',
  },
  timerBox: {
    width: 60,
    alignItems: 'center',
    marginHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  timerUrgent: {
    color: '#EF4444',
  },
  roundLabel: {
    fontSize: 10,
    color: '#B0B0C0',
    fontWeight: 'bold',
  },
  // Arena
  arena: {
    flex: 1,
    justifyContent: 'center',
  },
  fighter: {
    position: 'absolute',
    bottom: '28%',
    alignItems: 'center',
  },
  fighterEmoji: {
    fontSize: 64,
  },
  fighterHpText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // Announcement - comic style
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
