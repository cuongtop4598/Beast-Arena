import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayerStore } from '@/stores/usePlayerStore';
import * as api from '@/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const setPlayer = usePlayerStore((s) => s.setPlayer);

  const handleGuestLogin = async () => {
    const res = await api.guestLogin();
    if (res.data) {
      setPlayer(res.data.player_id, res.data.display_name, res.data.token);
      router.replace('/lobby');
    }
  };

  return (
    <View style={styles.container}>
      {/* TODO: Parallax illustration background */}
      <Text style={styles.title}>🐯 BEAST ARENA</Text>
      <Text style={styles.subtitle}>Mobile Fighting Game</Text>

      <TouchableOpacity style={styles.connectBtn} onPress={handleGuestLogin}>
        <Text style={styles.connectBtnText}>⚡ Quick Play (Guest)</Text>
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
  connectBtn: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '80%',
    alignItems: 'center',
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
