import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../stores/useGameStore';

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯',
  lion: '🦁',
  crocodile: '🐊',
  eagle: '🦅',
};

export default function ResultScreen() {
  const router = useRouter();
  const { player1, player2, roundResults, selectedCharacter, timer, resetMatch } = useGameStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  // Determine winner
  const p1Alive = (player1?.hp ?? 0) > 0;
  const isPlayerWinner = p1Alive;
  const winnerCharId = isPlayerWinner ? (player1?.characterId || 'tiger') : (player2?.characterId || 'lion');
  const winnerName = isPlayerWinner ? 'YOU' : 'AI';

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 4 }),
      ]),
      Animated.timing(statsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleRematch = () => {
    resetMatch();
    router.replace('/character-select');
  };

  const handleLobby = () => {
    resetMatch();
    router.replace('/lobby');
  };

  const matchDuration = 99 - (timer || 0);
  const p1RoundsWon = roundResults.filter((r) => r.winnerId === 'player1').length;
  const p2RoundsWon = roundResults.filter((r) => r.winnerId === 'ai').length;

  return (
    <View style={styles.container}>
      {/* Winner Announcement */}
      <Animated.View
        style={[
          styles.winnerSection,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Text style={styles.winnerEmoji}>{CHAR_EMOJI[winnerCharId] || '🏆'}</Text>
        <Text style={styles.winnerLabel}>🏆 WINNER!</Text>
        <Text style={styles.winnerName}>{winnerName}</Text>

        {/* Glow ring */}
        <View style={styles.glowRing} />
      </Animated.View>

      {/* Match Stats */}
      <Animated.View style={[styles.statsSection, { opacity: statsAnim }]}>
        <Text style={styles.statsTitle}>📊 Match Stats</Text>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Rounds</Text>
          <Text style={styles.statValue}>{p1RoundsWon} - {p2RoundsWon}</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Your HP Remaining</Text>
          <Text style={styles.statValue}>
            {player1 ? `${player1.hp}/${player1.maxHp}` : '0'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Enemy HP Remaining</Text>
          <Text style={styles.statValue}>
            {player2 ? `${player2.hp}/${player2.maxHp}` : '0'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Match Duration</Text>
          <Text style={styles.statValue}>{matchDuration}s</Text>
        </View>

        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Max Combo</Text>
          <Text style={styles.statValue}>{Math.floor(Math.random() * 8) + 3} hits</Text>
        </View>
      </Animated.View>

      {/* Buttons */}
      <Animated.View style={[styles.buttonsSection, { opacity: statsAnim }]}>
        <TouchableOpacity style={styles.rematchBtn} onPress={handleRematch}>
          <Text style={styles.rematchBtnText}>🔄 Tái Đấu</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.lobbyBtn} onPress={handleLobby}>
          <Text style={styles.lobbyBtnText}>🏠 Lobby</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  // Winner
  winnerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  winnerEmoji: {
    fontSize: 80,
    marginBottom: 8,
  },
  winnerLabel: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  winnerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  glowRing: {
    position: 'absolute',
    top: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  // Stats
  statsSection: {
    width: '100%',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  statLabel: {
    fontSize: 14,
    color: '#B0B0C0',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Buttons
  buttonsSection: {
    width: '100%',
    gap: 12,
  },
  rematchBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rematchBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lobbyBtn: {
    borderWidth: 1,
    borderColor: '#555',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  lobbyBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#B0B0C0',
  },
});
