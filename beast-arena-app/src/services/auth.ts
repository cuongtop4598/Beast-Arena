/**
 * Beast Arena — Authentication Service
 *
 * Supports two auth flows:
 * 1. Guest login (MVP) — anonymous play with locally stored token
 * 2. Wallet login (Phase 8) — SIWS (Sign In With Solana)
 *
 * Wallet login can also "link" to an existing guest account for migration.
 */

const SOLANA_NETWORK = 'devnet';
function getNetwork() { return SOLANA_NETWORK; }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthResponse {
  player_id: string;
  display_name: string;
  token: string; // JWT
  guest_token?: string;
  wins: number;
  losses: number;
  rank_points: number;
  selected_character: string;
  free_practice_left: number;
  wallet_address?: string;
  is_new?: boolean;
}

export interface SIWSMessage {
  domain: string;
  address: string;
  statement: string;
  nonce: string;
  issued_at: string;
  expiration_time?: string;
  chain_id?: string;
}

// ---------------------------------------------------------------------------
// API base URL
// ---------------------------------------------------------------------------

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

// ---------------------------------------------------------------------------
// Guest Auth (existing MVP flow)
// ---------------------------------------------------------------------------

/**
 * Login as guest — creates new account or restores existing one.
 */
export async function guestLogin(guestToken?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guest_token: guestToken ?? undefined }),
  });

  if (!res.ok) {
    throw new Error(`Guest login failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// SIWS — Sign In With Solana
// ---------------------------------------------------------------------------

/**
 * Build a SIWS message for the user to sign.
 * Follows the Sign-In With Solana (SIWS) spec.
 */
export function buildSIWSMessage(
  walletAddress: string,
  nonce: string
): SIWSMessage {
  const now = new Date();
  const expiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 min

  return {
    domain: 'beastarena.gg',
    address: walletAddress,
    statement: 'Sign in to Beast Arena with your Solana wallet.',
    nonce,
    issued_at: now.toISOString(),
    expiration_time: expiry.toISOString(),
    chain_id: getNetwork(),
  };
}

/**
 * Serialize the SIWS message to a human-readable string for signing.
 */
export function serializeSIWSMessage(msg: SIWSMessage): string {
  return [
    `${msg.domain} wants you to sign in with your Solana account:`,
    msg.address,
    '',
    msg.statement,
    '',
    `Nonce: ${msg.nonce}`,
    `Issued At: ${msg.issued_at}`,
    msg.expiration_time ? `Expiration Time: ${msg.expiration_time}` : '',
    msg.chain_id ? `Chain ID: ${msg.chain_id}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Request a nonce from the server to prevent replay attacks.
 */
export async function requestNonce(walletAddress: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet_address: walletAddress }),
  });

  if (!res.ok) {
    throw new Error(`Nonce request failed: ${res.status}`);
  }

  const data = await res.json();
  return data.nonce;
}

/**
 * Full SIWS wallet login flow:
 * 1. Request nonce from server
 * 2. Build SIWS message
 * 3. Sign message with wallet (caller provides signMessage)
 * 4. Submit signature to server for verification
 *
 * @param walletAddress - Base58 public key
 * @param signMessage   - Function from MWA that signs a message
 * @returns AuthResponse with JWT
 */
export async function walletLogin(
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<AuthResponse> {
  // 1. Get nonce
  const nonce = await requestNonce(walletAddress);

  // 2. Build SIWS message
  const siwsMessage = buildSIWSMessage(walletAddress, nonce);
  const messageText = serializeSIWSMessage(siwsMessage);
  const messageBytes = new TextEncoder().encode(messageText);

  // 3. Sign with wallet
  const signature = await signMessage(messageBytes);

  // 4. Verify on server & get JWT
  const res = await fetch(`${API_URL}/api/auth/wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet_address: walletAddress,
      message: messageText,
      signature: Buffer.from(signature).toString('base64'),
      siws: siwsMessage,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error ?? `Wallet login failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Link Wallet to Guest Account
// ---------------------------------------------------------------------------

/**
 * Link a Solana wallet to an existing guest account.
 * This allows a guest player to "upgrade" to a wallet-based account
 * while keeping all their stats, history, and progress.
 *
 * @param jwt           - Current guest JWT
 * @param walletAddress - Base58 public key
 * @param signMessage   - MWA sign function
 */
export async function linkWalletToGuest(
  jwt: string,
  walletAddress: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<AuthResponse> {
  // 1. Get nonce
  const nonce = await requestNonce(walletAddress);

  // 2. Build & sign SIWS message
  const siwsMessage = buildSIWSMessage(walletAddress, nonce);
  const messageText = serializeSIWSMessage(siwsMessage);
  const messageBytes = new TextEncoder().encode(messageText);
  const signature = await signMessage(messageBytes);

  // 3. Submit link request with existing JWT
  const res = await fetch(`${API_URL}/api/auth/link-wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      wallet_address: walletAddress,
      message: messageText,
      signature: Buffer.from(signature).toString('base64'),
      siws: siwsMessage,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error ?? `Link wallet failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

/** Check if a JWT is still valid (not expired). */
export function isTokenValid(jwt: string): boolean {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp ?? 0;
    return Date.now() / 1000 < exp;
  } catch {
    return false;
  }
}
