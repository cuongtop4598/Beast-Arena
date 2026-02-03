import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

const NETWORK = 'devnet';
const RPC_URL = clusterApiUrl(NETWORK);

export const connection = new Connection(RPC_URL, 'confirmed');

export async function getBalance(publicKey: PublicKey): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}

export async function requestAirdrop(publicKey: PublicKey, amount: number = 1): Promise<string> {
  const sig = await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig);
  return sig;
}

// MWA (Mobile Wallet Adapter) helpers
export const SUPPORTED_WALLETS = [
  { name: 'Phantom', icon: '👻', scheme: 'phantom://' },
  { name: 'Solflare', icon: '🔥', scheme: 'solflare://' },
] as const;

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}
