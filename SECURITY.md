# 🔒 Beast Arena — Security Review Checklist

## Authentication & Authorization

- [ ] JWT secret is ≥256 bits (32+ random bytes), stored as environment secret
- [ ] JWT tokens expire within 7 days; refresh token flow implemented
- [ ] Guest tokens are cryptographically random (32 bytes hex)
- [ ] All `/api/*` protected routes require valid JWT via `AuthMiddleware`
- [ ] Player ID extracted from JWT claims, never from request body (prevent IDOR)
- [ ] Rate limiting on `/api/auth/guest` endpoint (prevent mass account creation)
- [ ] SIWS (Sign In With Solana) validates signature server-side before issuing JWT

## API Security

- [ ] Input validation on all endpoints (display name length, character ID existence)
- [ ] SQL injection prevention — using parameterized queries (pgx `$1` placeholders)
- [ ] Request size limits configured in Gin (default 32MB, reduce to 1MB)
- [ ] CORS restricted to production domains (not `*` in production)
- [ ] HTTP security headers set:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Strict-Transport-Security: max-age=31536000`
- [ ] API versioning (future-proof breaking changes)
- [ ] Error messages don't leak internal details in production

## WebSocket Security

- [ ] WebSocket `CheckOrigin` restricted to allowed origins in production
- [ ] Authentication required on WebSocket connect (token in query param or first message)
- [ ] Message size limits (max 4KB per message)
- [ ] Message rate limiting per connection (max 60 messages/second)
- [ ] Ping/pong heartbeat with timeout (detect dead connections)
- [ ] Input validation on all game actions received via WebSocket

## Game Integrity / Anti-Cheat

- [ ] **Server-authoritative** game state — client sends inputs, server computes outcomes
- [ ] Damage calculations performed server-side only
- [ ] HP/state cannot be modified by client messages
- [ ] Input timestamp validation (reject stale or future-dated inputs)
- [ ] Match replay recording for dispute resolution (JSONB in PostgreSQL)
- [ ] Cooldown enforcement server-side (prevent skill spam)
- [ ] Rate limit on matchmaking queue joins (prevent queue flooding)
- [ ] Desync detection via periodic state hash comparison

## Database Security

- [ ] PostgreSQL connection uses SSL (`sslmode=require`)
- [ ] Database credentials stored as environment secrets (never in code)
- [ ] Database user has minimum required privileges (no SUPERUSER)
- [ ] Connection pool limits configured (MaxConns=20)
- [ ] Prepared statements used for all queries
- [ ] No raw SQL string concatenation anywhere in codebase

## Redis Security

- [ ] Redis connection uses TLS (`rediss://`)
- [ ] Redis password/auth configured
- [ ] Key expiration (TTL) set on all temporary data
- [ ] No sensitive data stored in Redis without encryption

## Solana / Blockchain Security

- [ ] Escrow program audited by reputable firm before mainnet deployment
- [ ] Program authority is a multisig wallet
- [ ] Match resolution requires server signature (oracle pattern)
- [ ] Wager amounts validated (min/max bounds)
- [ ] Transaction simulation before submission
- [ ] Rent-exempt account validation
- [ ] PDA derivation uses consistent seeds
- [ ] No unchecked arithmetic in Anchor program (use checked_*)
- [ ] Account owner and discriminator checks on all instructions
- [ ] Timeout/expiry mechanism for abandoned matches (auto-refund)

## Infrastructure

- [ ] HTTPS enforced everywhere (Fly.io auto-TLS)
- [ ] Environment secrets never committed to git
- [ ] `.env` files in `.gitignore`
- [ ] Docker image runs as non-root user
- [ ] Health check endpoint (`/health`) does not expose sensitive info
- [ ] Logging does not include tokens, passwords, or PII
- [ ] Log aggregation and alerting configured
- [ ] Dependency vulnerability scanning (Go: `govulncheck`, npm: `npm audit`)

## Mobile App Security

- [ ] API keys/secrets not bundled in app binary
- [ ] Certificate pinning for API requests (optional, recommended)
- [ ] Secure storage for guest token (`expo-secure-store`)
- [ ] No sensitive data in AsyncStorage (unencrypted)
- [ ] Deep link scheme (`beast-arena://`) validated
- [ ] ProGuard/R8 enabled for Android release builds
- [ ] App Transport Security enabled for iOS

## Incident Response

- [ ] Security contact email published (security@beastarena.gg)
- [ ] Bug bounty program considered for post-launch
- [ ] Incident response plan documented
- [ ] Ability to force-logout all users (rotate JWT secret)
- [ ] Ability to pause matchmaking/wagers during incidents
- [ ] Smart contract emergency pause mechanism (admin instruction)

---

## Review Schedule

| Frequency | Action |
|-----------|--------|
| Pre-launch | Full checklist review |
| Monthly | Dependency updates + vulnerability scan |
| Per release | Security-relevant code review |
| Quarterly | Penetration testing (when budget allows) |
| Before mainnet | Smart contract audit (mandatory) |

## Tools

```bash
# Go vulnerability check
govulncheck ./...

# npm audit
cd beast-arena-app && npm audit

# Check for secrets in git history
gitleaks detect --source .

# Anchor program verify
anchor verify <PROGRAM_ID>
```
