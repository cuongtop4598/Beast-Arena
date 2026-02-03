import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../stores/usePlayerStore';
import * as api from '../services/api';

const CHAR_EMOJI: Record<string, string> = {
  tiger: '🐯',
  lion: '🦁',
  crocodile: '🐊',
  eagle: '🦅',
};

/** Derive a rank title from ELO/rank points */
function getRank(rp: number): { title: string; color: string; icon: string } {
  if (rp >= 2000) return { title: 'Grandmaster', color: '#FF4500', icon: '👑' };
  if (rp >= 1600) return { title: 'Diamond', color: '#B9F2FF', icon: '💎' };
  if (rp >= 1400) return { title: 'Platinum', color: '#70D6FF', icon: '🔷' };
  if (rp >= 1200) return { title: 'Gold', color: '#FFD700', icon: '🏅' };
  if (rp >= 1000) return { title: 'Silver', color: '#C0C0C0', icon: '🥈' };
  return { title: 'Bronze', color: '#CD7F32', icon: '🥉' };
}

/** Abbreviate a wallet-like address: 5abc…xyz9 */
function shortenAddr(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ProfileScreen() {
  const router = useRouter();
  const player = usePlayerStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [matchHistory, setMatchHistory] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getMatchHistory(10);
      if (res.data?.matches) setMatchHistory(res.data.matches);
    } catch {
      /* offline / no backend */
    } finally {
      setLoading(false);
    }
  };

  const rank = getRank(player.rankPoints);
  const totalGames = player.wins + player.losses;
  const winRate = totalGames > 0 ? ((player.wins / totalGames) * 100).toFixed(1) : '—';

  // Use playerId as a stand-in for wallet address until wallet connect is live
  const walletAddr = player.playerId || 'Not connected';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>PROFILE</Text>
          <View style={styles.backBtn} />
        </View>

        {/* Avatar Card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarEmoji}>
              {CHAR_EMOJI[player.selectedCharacter] || '🐯'}
            </Text>
          </View>
          <Text style={styles.displayName}>{player.displayName}</Text>

          {/* Wallet address row */}
          <View style={styles.walletRow}>
            <Text style={styles.walletIcon}>🔗</Text>
            <Text style={styles.walletAddress}>{shortenAddr(walletAddr)}</Text>
          </View>
        </View>

        {/* Rank Card */}
        <View style={styles.rankCard}>
          <Text style={styles.rankIcon}>{rank.icon}</Text>
          <View style={styles.rankInfo}>
            <Text style={[styles.rankTitle, { color: rank.color }]}>{rank.title}</Text>
            <Text style={styles.rankPoints}>{player.rankPoints} RP</Text>
          </View>
          <View style={styles.rankBar}>
            <View
              style={[
                styles.rankBarFill,
                {
                  width: `${Math.min(100, ((player.rankPoints % 200) / 200) * 100)}%`,
                  backgroundColor: rank.color,
                },
              ]}
            />
          </View>
          <Text style={styles.rankNext}>
            {200 - (player.rankPoints % 200)} RP to next tier
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBox label="Wins" value={String(player.wins)} color="#22C55E" />
          <StatBox label="Losses" value={String(player.losses)} color="#EF4444" />
          <StatBox label="Win Rate" value={`${winRate}%`} color="#FF6B35" />
          <StatBox label="Total" value={String(totalGames)} color="#B0B0C0" />
        </View>

        {/* Recent Matches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📜 Recent Matches</Text>
          {loading && <ActivityIndicator color="#FF6B35" style={{ marginTop: 12 }} />}
          {matchHistory && matchHistory.length === 0 && (
            <Text style={styles.emptyText}>No matches yet — start fighting!</Text>
          )}
          {matchHistory === null && !loading && (
            <Text style={styles.emptyText}>Offline — match history unavailable</Text>
          )}
          {matchHistory &&
            matchHistory.slice(0, 5).map((m: any, i: number) => (
              <View key={i} style={styles.matchRow}>
                <Text style={styles.matchResult}>
                  {m.winner_id === player.playerId ? '🏆 WIN' : '💀 LOSS'}
                </Text>
                <Text style={styles.matchDetail}>
                  vs {m.opponent_name || 'Opponent'} • {m.stage_id || '—'}
                </Text>
              </View>
            ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

// ─── Stat Box Sub-Component ───

const StatBox: React.FC<{ label: string; value: string; color: string }> = ({
  label,
  value,
  color,
}) => (
  <View style={styles.statBox}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Styles ───

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
  },
  scroll: {
    padding: 20,
    paddingTop: 56,
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    width: 70,
  },
  backBtnText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 2,
  },
  // Avatar card
  avatarCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 52,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(153, 69, 255, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(153, 69, 255, 0.3)',
  },
  walletIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  walletAddress: {
    fontSize: 13,
    color: '#9945FF',
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  // Rank card
  rankCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  rankIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 12,
  },
  rankTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  rankPoints: {
    fontSize: 16,
    color: '#B0B0C0',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  rankBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
    overflow: 'hidden',
    marginBottom: 6,
  },
  rankBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  rankNext: {
    fontSize: 12,
    color: '#666',
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Recent matches section
  section: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  matchResult: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    width: 80,
  },
  matchDetail: {
    fontSize: 13,
    color: '#B0B0C0',
    flex: 1,
  },
});
