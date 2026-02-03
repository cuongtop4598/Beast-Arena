import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useGameStore } from '../stores/useGameStore';
import { registry } from '../characters/registry';
import { audioManager } from '../engine/AudioManager';
import CharacterPortrait from '../components/CharacterPortrait';

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

  // Play character select BGM
  useEffect(() => {
    audioManager.playBGM('character_select');
    return () => { audioManager.stopBGM(); };
  }, []);

  const handleSelectChar = (id: string) => {
    audioManager.playUI('navigate');
    selectCharacter(id);
  };

  const handleConfirm = () => {
    if (!selectedCharacter) return;
    audioManager.playUI('confirm');
    router.push('/stage-select');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CHỌN CHIẾN BINH</Text>

      {/* Character Preview — uses CharacterPortrait */}
      <View style={styles.preview}>
        {selected ? (
          <>
            <CharacterPortrait
              characterId={selected.id}
              name={selected.name}
              martialArt={selected.martialArt}
              selected={true}
              size="large"
            />

            {/* Stats below portrait */}
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

      {/* Character Grid — uses CharacterPortrait cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.charList}>
        {characters.map((char) => (
          <TouchableOpacity
            key={char.id}
            style={styles.charCardWrapper}
            onPress={() => handleSelectChar(char.id)}
            activeOpacity={0.7}
          >
            <CharacterPortrait
              characterId={char.id}
              name={char.name}
              martialArt={char.martialArt}
              selected={selectedCharacter === char.id}
              size="small"
            />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 215, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  preview: { alignItems: 'center', minHeight: 320, justifyContent: 'center' },
  previewPlaceholder: { fontSize: 18, color: '#555' },
  statsContainer: { width: '100%', paddingHorizontal: 20, marginTop: 16 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statLabel: { width: 40, color: '#B0B0C0', fontSize: 12, fontWeight: 'bold' },
  statBarBg: { flex: 1, height: 8, backgroundColor: '#333', borderRadius: 4, marginHorizontal: 8 },
  statBarFill: { height: '100%', backgroundColor: '#FF6B35', borderRadius: 4 },
  statValue: { width: 24, color: '#FFFFFF', fontSize: 12, textAlign: 'right' },
  charList: { maxHeight: 140, marginBottom: 20 },
  charCardWrapper: { marginRight: 12 },
  confirmBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#333', opacity: 0.5 },
  confirmBtnText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
});
