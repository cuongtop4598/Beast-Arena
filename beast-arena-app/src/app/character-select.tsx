import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../stores/useGameStore';
import { registry } from '../characters/registry';
import { CharacterConfig } from '../characters/types';

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯',
  lion: '🦁',
  crocodile: '🐊',
  eagle: '🦅',
};

function StatBar({ label, value, max = 32 }: { label: string; value: number; max?: number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBarBg}>
        <View style={[styles.statBarFill, { width: `${(value / max) * 100}%` }]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function CharacterSelectScreen() {
  const router = useRouter();
  const { selectedCharacter, selectCharacter } = useGameStore();
  const characters = registry.getAll();
  const selected = selectedCharacter ? registry.get(selectedCharacter) : null;

  const handleConfirm = () => {
    if (!selectedCharacter) return;
    // TODO: navigate to stage select or directly to fight
    router.push('/stage-select');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CHỌN CHIẾN BINH</Text>

      {/* Character Preview */}
      <View style={styles.preview}>
        {selected ? (
          <>
            <Text style={styles.previewEmoji}>{CHAR_EMOJI[selected.id] || '❓'}</Text>
            <Text style={styles.previewName}>{selected.name}</Text>
            <Text style={styles.previewTitle}>{selected.title}</Text>

            {/* Stats */}
            <View style={styles.statsContainer}>
              <StatBar label="HP" value={selected.stats.hp} />
              <StatBar label="ATK" value={selected.stats.atk} />
              <StatBar label="SPD" value={selected.stats.spd} />
              <StatBar label="DEF" value={selected.stats.def} />
              <StatBar label="SPC" value={selected.stats.special} max={20} />
            </View>
          </>
        ) : (
          <Text style={styles.previewPlaceholder}>Chọn một chiến binh</Text>
        )}
      </View>

      {/* Character Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.charList}>
        {characters.map((char) => (
          <TouchableOpacity
            key={char.id}
            style={[
              styles.charCard,
              selectedCharacter === char.id && styles.charCardSelected,
            ]}
            onPress={() => selectCharacter(char.id)}
          >
            <Text style={styles.charEmoji}>{CHAR_EMOJI[char.id] || '❓'}</Text>
            <Text style={styles.charName}>{char.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Confirm Button */}
      <TouchableOpacity
        style={[styles.confirmBtn, !selectedCharacter && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={!selectedCharacter}
      >
        <Text style={styles.confirmBtnText}>✅ CHỌN TƯỚNG</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D1A', padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFD700', textAlign: 'center', marginBottom: 20 },
  preview: { alignItems: 'center', minHeight: 280, justifyContent: 'center' },
  previewEmoji: { fontSize: 80, marginBottom: 8 },
  previewName: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  previewTitle: { fontSize: 16, color: '#FF6B35', marginBottom: 16 },
  previewPlaceholder: { fontSize: 18, color: '#555' },
  statsContainer: { width: '100%', paddingHorizontal: 20 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statLabel: { width: 40, color: '#B0B0C0', fontSize: 12, fontWeight: 'bold' },
  statBarBg: { flex: 1, height: 8, backgroundColor: '#333', borderRadius: 4, marginHorizontal: 8 },
  statBarFill: { height: '100%', backgroundColor: '#FF6B35', borderRadius: 4 },
  statValue: { width: 24, color: '#FFFFFF', fontSize: 12, textAlign: 'right' },
  charList: { maxHeight: 120, marginBottom: 20 },
  charCard: {
    width: 80,
    height: 100,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  charCardSelected: { borderColor: '#FFD700' },
  charEmoji: { fontSize: 36, marginBottom: 4 },
  charName: { fontSize: 12, color: '#FFFFFF' },
  confirmBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#333', opacity: 0.5 },
  confirmBtnText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
});
