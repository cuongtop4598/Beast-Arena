import { useEffect, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getBalance, connection } from '../services/solana';

export function useSolBalance(publicKey: PublicKey | null) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) {
      setBalance(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const bal = await getBalance(publicKey);
      setBalance(bal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to account changes for realtime updates
  useEffect(() => {
    if (!publicKey) return;

    const subId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        setBalance(accountInfo.lamports / 1e9);
      },
      'confirmed'
    );

    return () => {
      connection.removeAccountChangeListener(subId);
    };
  }, [publicKey]);

  return { balance, loading, error, refresh };
}
