import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '../stores/usePlayerStore';
import * as api from '../services/api';
import { useState } from 'react';

export default function LoginScreen() {
  const router = useRouter();
  const setFullProfile = usePlayerStore((s) => s.setFullProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check for existing guest token (would use AsyncStorage in production)
      const existingToken = usePlayerStore.getState().guestToken;
      const res = await api.guestLogin(existingToken || undefined);

      if (res.data) {
        setFullProfile({
          playerId: res.data.player_id,
          displayName: res.data.display_name,
          token: res.data.token,
          guestToken: res.data.guest_token,
          wins: res.data.wins,
          losses: res.data.losses,
          rankPoints: res.data.rank_points,
          selectedCharacter: res.data.selected_character || 'tiger',
          freePracticeLeft: res.data.free_practice_left,
        });
        router.replace('/lobby');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch (e) {
      setError('Connection failed — is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Stars background */}
      <View style={styles.starsContainer}>
        {[...Array(8)].map((_, i) => (
          <View key={i} style={[styles.star, {
            top: `${10 + Math.random() * 40}%`,
            left: `${10 + Math.random() * 80}%`,
            width: 1 + Math.random() * 2,
            height: 1 + Math.random() * 2,
          }]} />
        ))}
      </View>

      <Text style={styles.title}>🐯 BEAST ARENA</Text>
      <Text style={styles.subtitle}>Mobile Fighting Game</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.connectBtn, loading && styles.connectBtnDisabled]}
        onPress={handleGuestLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.connectBtnText}>⚡ Quick Play (Guest)</Text>
        )}
      </TouchableOpacity>

      {/* POST-MVP: Wallet connect button */}
      <TouchableOpacity style={styles.walletBtn} disabled>
        <Text style={styles.walletBtnText}>🔗 Connect Wallet (Coming Soon)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 1,
    opacity: 0.3,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#B0B0C0',
    marginBottom: 60,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '80%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  connectBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '80%',
    alignItems: 'center',
  },
  connectBtnDisabled: {
    opacity: 0.7,
  },
  connectBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  walletBtn: {
    borderWidth: 1,
    borderColor: '#9945FF',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
    opacity: 0.5,
  },
  walletBtnText: {
    color: '#9945FF',
    fontSize: 16,
  },
});
