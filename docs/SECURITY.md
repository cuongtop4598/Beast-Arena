# Security Review Checklist - Beast Arena

## API Security
- [ ] All endpoints require JWT authentication
- [ ] Rate limiting on all API routes (100 req/min)
- [ ] Input validation on all request bodies
- [ ] SQL injection prevention (parameterized queries)
- [ ] CORS configured for production domains only

## WebSocket Security
- [ ] JWT auth on WebSocket handshake
- [ ] Input validation on all WS messages
- [ ] Anti-cheat: input rate limiting (max 60/sec)
- [ ] Anti-cheat: contradictory input detection
- [ ] Anti-cheat: server-authoritative state
- [ ] Connection timeout for idle sockets (30s)
- [ ] Max message size limit (1KB)

## Solana / Smart Contract
- [ ] Escrow program security audit (external)
- [ ] PDA seed collision prevention
- [ ] Signer validation on all instructions
- [ ] Overflow/underflow checks
- [ ] Reentrancy protection
- [ ] Authority key management (multisig recommended)

## Infrastructure
- [ ] HTTPS only (TLS 1.3)
- [ ] Environment variables for secrets (never in code)
- [ ] Database credentials in Fly.io secrets
- [ ] Redis AUTH enabled
- [ ] Docker non-root user
- [ ] Health check endpoints (no sensitive data)

## Client
- [ ] No sensitive data in client-side storage
- [ ] Wallet private keys never touch server
- [ ] Transaction signing only via MWA (on-device)
- [ ] Certificate pinning for API calls
