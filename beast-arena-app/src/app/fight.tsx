import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../stores/useGameStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { registry } from '../characters/registry';
import * as api from '../services/api';

// Stage color themes
const STAGE_COLORS: Record<string, [string, string]> = {
  ancient_temple: ['#3D1F00', '#8B4513'],
  bamboo_forest: ['#0A2E1A', '#2E8B57'],
  thunder_peak: ['#1A0033', '#4B0082'],
};

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯',
  lion: '🦁',
  crocodile: '🐊',
  eagle: '🦅',
};

type Announcement = {
  text: string;
  color: string;
  fontSize: number;
};

export default function FightScreen() {
  const router = useRouter();
  const { selectedCharacter, selectedStage, player1, player2, timer, setTimer, startMatch, updateFighters, endRound, round } = useGameStore();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const announceAnim = useRef(new Animated.Value(0)).current;
  const announceScale = useRef(new Animated.Value(0.3)).current;

  // Fighter positions (animated)
  const p1X = useRef(new Animated.Value(100)).current;
  const p2X = useRef(new Animated.Value(Dimensions.get('window').width - 180)).current;

  // HP animations
  const p1HpAnim = useRef(new Animated.Value(1)).current;
  const p2HpAnim = useRef(new Animated.Value(1)).current;

  const stageColors = STAGE_COLORS[selectedStage || 'ancient_temple'] || STAGE_COLORS.ancient_temple;
  const charId = selectedCharacter || 'tiger';
  const charConfig = registry.get(charId);
  const opponentId = charId === 'tiger' ? 'lion' : 'tiger';

  // Initialize match — call backend for practice mode
  useEffect(() => {
    const initBackend = async () => {
      const gameMode = useGameStore.getState().gameMode;
      if (gameMode === 'practice') {
        const res = await api.startPractice(charId, selectedStage || 'ancient_temple');
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

    // Show "ROUND 1" → "FIGHT!" sequence
    showAnnouncement({ text: `ROUND ${round}`, color: '#FFFFFF', fontSize: 48 }, 1200, () => {
      showAnnouncement({ text: 'FIGHT!', color: '#FFD700', fontSize: 72 }, 1000, () => {
        startTimer();
        startSimulation();
      });
    });
  }, []);

  const showAnnouncement = (ann: Announcement, duration: number, onDone?: () => void) => {
    setAnnouncement(ann);
    announceAnim.setValue(0);
    announceScale.setValue(0.3);

    Animated.parallel([
      Animated.timing(announceAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(announceScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(announceAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
          setAnnouncement(null);
          onDone?.();
        });
      }, duration - 400);
    });
  };

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

      // Random damage exchange every 2s
      const p1Dmg = Math.floor(Math.random() * 15) + 5;
      const p2Dmg = Math.floor(Math.random() * 12) + 3;

      const newP1Hp = Math.max(0, state.player1.hp - p2Dmg);
      const newP2Hp = Math.max(0, state.player2.hp - p1Dmg);

      updateFighters(
        { hp: newP1Hp, ultGauge: Math.min(100, (state.player1.ultGauge || 0) + 5) },
        { hp: newP2Hp, ultGauge: Math.min(100, (state.player2.ultGauge || 0) + 3) }
      );

      // Animate HP bars
      p1HpAnim.setValue(newP1Hp / state.player1.maxHp);
      p2HpAnim.setValue(newP2Hp / state.player2.maxHp);

      // Check KO
      if (newP1Hp <= 0 || newP2Hp <= 0) {
        clearInterval(simRef.current!);
        const winnerId = newP1Hp > 0 ? 'player1' : 'ai';
        showAnnouncement({ text: 'K.O!', color: '#EF4444', fontSize: 80 }, 1500, () => {
          endFight();
        });
      }
    }, 2000);
  };

  const endFight = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (simRef.current) clearInterval(simRef.current);
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
  const p1MaxHp = state.player1?.maxHp ?? 100;
  const p2Hp = state.player2?.hp ?? 100;
  const p2MaxHp = state.player2?.maxHp ?? 100;

  return (
    <View style={[styles.container, { backgroundColor: stageColors[0] }]}>
      {/* Background layers */}
      <View style={[styles.bgLayer, { backgroundColor: stageColors[1], opacity: 0.3 }]} />
      <View style={styles.groundLine} />

      {/* HUD - Simplified inline for MVP */}
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

      {/* Announcement overlay */}
      {announcement && (
        <Animated.View
          style={[
            styles.announcementContainer,
            { opacity: announceAnim, transform: [{ scale: announceScale }] },
          ]}
        >
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

      {/* Controls placeholder */}
      {/* TODO: Import ControlsOverlay from components/game */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  groundLine: {
    position: 'absolute',
    bottom: '25%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    padding: 4,
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
  // Announcement
  announcementContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  announcementText: {
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 8,
  },
});
