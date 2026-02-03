# Beast Arena Server — Deployment Guide

## Infrastructure Overview

```
                    ┌─────────────────────┐
                    │   CDN / Load Balancer│
                    │   (Fly.io Anycast)   │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Beast Arena Server  │
                    │  (Go binary on Fly)  │
                    │  2 shared-cpu, 512MB │
                    └───┬────────────┬────┘
                        │            │
             ┌──────────▼──┐  ┌─────▼──────────┐
             │ PostgreSQL   │  │ Redis (Upstash) │
             │ (Neon / Fly) │  │ or Fly Redis    │
             └─────────────┘  └────────────────┘
```

---

## 1. PostgreSQL (Managed)

### Option A: Neon (Recommended — serverless, free tier)
```bash
# Create project at https://neon.tech
# Connection string format:
# postgres://user:password@ep-xxx.region.aws.neon.tech/beast_arena?sslmode=require

flyctl secrets set DB_URL="postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/beast_arena?sslmode=require"
```

**Neon Config:**
- Plan: Free tier (0.5 GB storage, 190 compute hours/month) → Scale to Pro ($19/mo)
- Region: us-east-2 or ap-southeast-1 (match Fly region)
- Enable connection pooling (PgBouncer built-in)
- Enable auto-suspend after 5 min of inactivity (free tier)
- Branching: use for staging/preview environments

### Option B: Fly Postgres (co-located, lowest latency)
```bash
flyctl postgres create \
  --name beast-arena-db \
  --region sin \
  --vm-size shared-cpu-1x \
  --initial-cluster-size 1 \
  --volume-size 10

flyctl postgres attach beast-arena-db --app beast-arena-server
# DB_URL is auto-set as a secret
```

**Fly Postgres Config:**
- HA: single node for MVP, scale to 2-node cluster for production
- Volume: 10GB initial → resize with `flyctl volumes extend`
- Backups: daily WAL-based (automatic)

### Option C: Supabase Postgres
```bash
# Create project at https://supabase.com
# Use direct connection string (not pooler) for pgx:
flyctl secrets set DB_URL="postgres://postgres.xxxx:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

### Running Migrations
```bash
# Connect to production DB and run migrations
flyctl ssh console --app beast-arena-server
cat /app/migrations/001_init.sql | psql $DB_URL

# Or from local machine:
psql "$DB_URL" -f beast-arena-server/migrations/001_init.sql
```

---

## 2. Redis (Managed)

### Option A: Upstash Redis (Recommended — serverless, free tier)
```bash
# Create at https://upstash.com
# Use the REST or redis:// connection string

flyctl secrets set REDIS_URL="rediss://default:xxxx@global-xxx.upstash.io:6379"
```

**Upstash Config:**
- Plan: Free tier (10K commands/day) → Pay-as-you-go ($0.2/100K commands)
- Region: Global (multi-region) or ap-southeast-1
- Enable TLS (rediss://)
- Max data: 256MB free → 1GB pro
- Eviction: allkeys-lru for matchmaking queue

### Option B: Fly Redis
```bash
flyctl redis create \
  --name beast-arena-redis \
  --region sin \
  --plan free  # or $15/mo for single-node persistent

# Set the connection string
flyctl secrets set REDIS_URL="redis://default:xxx@fly-beast-arena-redis.upstash.io:6379"
```

### Option C: Railway Redis
```bash
# Add Redis plugin in Railway dashboard
# Connection string auto-provided
```

### Redis Data Stored:
| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `matchmaking:queue` | Player matchmaking queue | — |
| `matchmaking:player:{id}` | Player's selected character | 5m |
| `match:created:{id}` | Pub/sub channel for match notifications | — |
| `session:{token}` | Active player sessions | 24h |

---

## 3. Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PORT` | Yes | Server port | `8080` |
| `ENV` | Yes | Environment | `production` |
| `DB_URL` | Yes | PostgreSQL connection string | `postgres://...` |
| `REDIS_URL` | Yes | Redis connection string | `redis://...` or `rediss://...` |
| `JWT_SECRET` | Yes | JWT signing key (min 32 chars) | `openssl rand -hex 32` |
| `CHAR_DIR` | No | Character configs directory | `/app/characters` |
| `GIN_MODE` | No | Gin framework mode | `release` |

### Setting Secrets on Fly.io
```bash
flyctl secrets set \
  DB_URL="postgres://..." \
  REDIS_URL="rediss://..." \
  JWT_SECRET="$(openssl rand -hex 32)"
```

---

## 4. Deployment

### First Deploy
```bash
cd beast-arena-server

# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch (creates app + first deploy)
flyctl launch --no-deploy
# Edit fly.toml as needed, then:
flyctl deploy
```

### Subsequent Deploys
```bash
flyctl deploy
```

### Monitoring
```bash
# View logs
flyctl logs --app beast-arena-server

# SSH into running machine
flyctl ssh console --app beast-arena-server

# Check status
flyctl status --app beast-arena-server

# Scale up
flyctl scale count 2 --app beast-arena-server
```

---

## 5. Production Checklist

- [ ] Set strong JWT_SECRET (≥32 random bytes)
- [ ] Enable PostgreSQL SSL (`?sslmode=require`)
- [ ] Enable Redis TLS (`rediss://`)
- [ ] Run database migrations
- [ ] Verify /health endpoint returns OK
- [ ] Set up alerting on health check failures
- [ ] Configure Fly.io auto-scaling rules
- [ ] Set up log drain (Grafana Cloud / Datadog)
- [ ] Test WebSocket connections through load balancer
- [ ] Verify CORS settings for production domain
