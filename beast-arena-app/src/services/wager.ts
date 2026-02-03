import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { connection, solToLamports } from './solana';

const PLATFORM_FEE_PERCENT = 5;
// TODO: Replace with actual escrow program ID after deployment
const ESCROW_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');

export interface WagerConfig {
  amount: number; // in SOL
  matchId: string;
  playerPubkey: PublicKey;
}

export function calculateFee(amount: number): number {
  return amount * (PLATFORM_FEE_PERCENT / 100);
}

export function calculatePotentialWin(amount: number): number {
  return amount * 2 - calculateFee(amount) * 2;
}

export async function createWagerDeposit(config: WagerConfig): Promise<Transaction> {
  const { amount, playerPubkey } = config;
  const lamports = solToLamports(amount + calculateFee(amount));

  // Create escrow deposit transaction
  // TODO: Replace with actual Anchor CPI call
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: playerPubkey,
      toPubkey: ESCROW_PROGRAM_ID, // escrow PDA
      lamports,
    })
  );

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = playerPubkey;

  return tx;
}

export async function claimWinnings(
  matchId: string,
  winnerPubkey: PublicKey
): Promise<string> {
  // TODO: Call escrow program's claim instruction
  // This will be replaced with actual Anchor instruction
  console.log(`Claiming winnings for match ${matchId} to ${winnerPubkey.toBase58()}`);
  return 'pending_tx_signature';
}

export async function buyPracticeTurns(
  playerPubkey: PublicKey,
  turns: number,
  pricePerTurn: number = 0.01
): Promise<Transaction> {
  const totalLamports = solToLamports(turns * pricePerTurn);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: playerPubkey,
      toPubkey: ESCROW_PROGRAM_ID,
      lamports: totalLamports,
    })
  );

  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = playerPubkey;

  return tx;
}
