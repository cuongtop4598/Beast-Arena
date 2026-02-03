import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useGameStore } from '../stores/useGameStore';

// ─── Preset Wager Options ───

interface WagerOption {
  label: string;
  sol: number;
}

const WAGER_OPTIONS: WagerOption[] = [
  { label: '0.05 SOL', sol: 0.05 },
  { label: '0.1 SOL', sol: 0.1 },
  { label: '0.25 SOL', sol: 0.25 },
  { label: '0.5 SOL', sol: 0.5 },
  { label: '1 SOL', sol: 1 },
];

const PLATFORM_FEE_PERCENT = 5; // 5% platform fee

export default function WagerScreen() {
  const router = useRouter();
  const player = usePlayerStore();
  const { selectedCharacter, selectedStage } = useGameStore();

  const [selectedWager, setSelectedWager] = useState<number | null>(null);
  const [signing, setSigning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // Pulse the sign button when a wager is selected
  React.useEffect(() => {
    if (selectedWager !== null) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [selectedWager]);

  const fee = selectedWager !== null ? selectedWager * (PLATFORM_FEE_PERCENT / 100) : 0;
  const total = selectedWager !== null ? selectedWager + fee : 0;
  const potentialWin = selectedWager !== null ? selectedWager * 2 - fee * 2 : 0;

  const handleSign = useCallback(async () => {
    if (selectedWager === null) return;

    // Check wallet connectivity (placeholder — wallet SDK not yet integrated)
    if (!player.playerId) {
      Alert.alert('Wallet Required', 'Please connect a Solana wallet to place a wager.');
      return;
    }

    setSigning(true);
    try {
      // TODO: actual Solana transaction signing via @solana/wallet-adapter
      // For now simulate a brief delay
      await new Promise((r) => setTimeout(r, 1200));

      // Navigate to fight with wager context (could store in game store)
      router.push('/fight');
    } catch {
      Alert.alert('Transaction Failed', 'Could not sign the wager transaction. Try again.');
    } finally {
      setSigning(false);
    }
  }, [selectedWager, player.playerId]);

  const handleSkip = () => {
    router.push('/fight');
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚡ PLACE WAGER</Text>
        <View style={{ width: 60 }} />
      </View>

      <Text style={styles.subtitle}>
        Stake SOL and earn double if you win!
      </Text>

      {/* Wager Option Cards */}
      <View style={styles.optionsGrid}>
        {WAGER_OPTIONS.map((opt) => {
          const isSelected = selectedWager === opt.sol;
          return (
            <TouchableOpacity
              key={opt.sol}
              style={[styles.optionCard, isSelected && styles.optionCardSelected]}
              onPress={() => setSelectedWager(isSelected ? null : opt.sol)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionSol, isSelected && styles.optionSolSelected]}>
                {opt.label}
              </Text>
              {isSelected && <Text style={styles.optionCheck}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Fee Breakdown */}
      {selectedWager !== null && (
        <View style={styles.feeCard}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Wager amount</Text>
            <Text style={styles.feeValue}>{selectedWager.toFixed(2)} SOL</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>
              Platform fee ({PLATFORM_FEE_PERCENT}%)
            </Text>
            <Text style={styles.feeValueFee}>+{fee.toFixed(4)} SOL</Text>
          </View>
          <View style={styles.feeDivider} />
          <View style={styles.feeRow}>
            <Text style={styles.feeTotalLabel}>Total deducted</Text>
            <Text style={styles.feeTotalValue}>{total.toFixed(4)} SOL</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeWinLabel}>🏆 Potential win</Text>
            <Text style={styles.feeWinValue}>{potentialWin.toFixed(4)} SOL</Text>
          </View>
        </View>
      )}

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Sign & Confirm Button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[
            styles.signBtn,
            selectedWager === null && styles.signBtnDisabled,
            signing && styles.signBtnSigning,
          ]}
          onPress={handleSign}
          disabled={selectedWager === null || signing}
        >
          <Text style={styles.signBtnText}>
            {signing ? '⏳ Signing…' : '✍️ Sign & Enter Match'}
          </Text>
          {!signing && selectedWager !== null && (
            <Text style={styles.signBtnSub}>{total.toFixed(4)} SOL</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Skip / Free play */}
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipBtnText}>Play without wager →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    padding: 20,
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B0C0',
    textAlign: 'center',
    marginBottom: 28,
  },
  // Options
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    width: '28%',
    aspectRatio: 1.6,
    backgroundColor: '#1A1A2E',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  optionSol: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#B0B0C0',
  },
  optionSolSelected: {
    color: '#FF6B35',
  },
  optionCheck: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  // Fee breakdown
  feeCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#333',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  feeLabel: {
    fontSize: 14,
    color: '#B0B0C0',
  },
  feeValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  feeValueFee: {
    fontSize: 14,
    color: '#EAB308',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 6,
  },
  feeTotalLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  feeTotalValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  feeWinLabel: {
    fontSize: 15,
    color: '#22C55E',
    fontWeight: 'bold',
  },
  feeWinValue: {
    fontSize: 15,
    color: '#22C55E',
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  // Actions
  spacer: {
    flex: 1,
  },
  signBtn: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  signBtnDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  signBtnSigning: {
    backgroundColor: '#9945FF',
  },
  signBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  signBtnSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  skipBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  skipBtnText: {
    fontSize: 15,
    color: '#555',
  },
});
