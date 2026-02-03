import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useGameStore } from '../stores/useGameStore';

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯', lion: '🦁', crocodile: '🐊', eagle: '🦅',
};

export default function LobbyScreen() {
  const router = useRouter();
  const player = usePlayerStore();
  const setGameMode = useGameStore((s) => s.setGameMode);

  const handlePvP = () => {
    setGameMode('pvp');
    router.push('/character-select');
  };

  const handlePractice = () => {
    setGameMode('practice');
    router.push('/character-select');
  };

  const winRate = player.wins + player.losses > 0
    ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(1)
    : '0.0';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.avatar}>
          {CHAR_EMOJI[player.selectedCharacter] || '🐯'}
        </Text>
        <View>
          <Text style={styles.playerName}>{player.displayName}</Text>
          <Text style={styles.playerInfo}>
            🏆 {player.rankPoints} pts • W:{player.wins} L:{player.losses} ({winRate}%)
          </Text>
        </View>
      </View>

      {/* Mode Cards */}
      <Text style={styles.sectionTitle}>Chọn chế độ</Text>

      <TouchableOpacity style={styles.pvpCard} onPress={handlePvP}>
        <Text style={styles.cardEmoji}>⚔️</Text>
        <Text style={styles.cardTitle}>Thách Đấu PvP</Text>
        <Text style={styles.cardDesc}>Đấu với người chơi thực</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.practiceCard} onPress={handlePractice}>
        <Text style={styles.cardEmoji}>🥊</Text>
        <Text style={styles.cardTitle}>Tập Luyện</Text>
        <Text style={styles.cardDesc}>
          Đấu với AI • Lượt miễn phí: {player.freePracticeLeft}/5
        </Text>
      </TouchableOpacity>

      {/* Energy Bar */}
      <View style={styles.energyBar}>
        <View style={[styles.energyFill, { width: `${(player.freePracticeLeft / 5) * 100}%` }]} />
      </View>

      {player.freePracticeLeft === 0 && (
        <Text style={styles.noTurns}>⏰ Hết lượt miễn phí — reset mỗi ngày!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A', padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  avatar: { fontSize: 48, marginRight: 16 },
  playerName: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  playerInfo: { fontSize: 14, color: '#B0B0C0', marginTop: 4 },
  sectionTitle: { fontSize: 18, color: '#B0B0C0', marginBottom: 16 },
  pvpCard: {
    backgroundColor: '#1A1A2E',
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  practiceCard: {
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 40, marginBottom: 8 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  cardDesc: { fontSize: 14, color: '#B0B0C0' },
  energyBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 8,
  },
  energyFill: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  noTurns: {
    color: '#EAB308',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
});
