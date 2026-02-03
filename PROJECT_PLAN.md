# 🐯 BEAST ARENA - KẾ HOẠCH THỰC HIỆN DỰ ÁN

**Game:** Mobile Web3 Fighting Game  
**Tech Stack:** React Native (TSX) + Expo + **Golang** Backend  
**Platforms:** iOS, Android  
**Thể loại:** Đối kháng 1v1, GameFi  
**Approach:** MVP First → Solana Integration sau  

---

## PHASE 0: KHỞI TẠO & KIẾN TRÚC (Tuần 1-2)

### 0.1 Project Setup
- [ ] Khởi tạo Expo project (blank template — Solana sẽ tích hợp sau)
  ```bash
  npx create-expo-app beast-arena --template blank-typescript
  ```
- [ ] Cấu hình TypeScript strict mode
- [ ] Setup Golang backend project
  ```bash
  mkdir beast-arena-server && cd beast-arena-server
  go mod init github.com/yourorg/beast-arena-server
  ```
- [ ] Cài đặt dependencies cốt lõi

### 0.2 Dependencies chính

**Frontend (React Native):**
```json
{
  "react-native-reanimated": "latest",
  "react-native-game-engine": "latest",
  "pixi.js": "hoặc @pixi/react-native",
  "spine-runtimes": "cho Spine 2D animation",
  "zustand": "state management",
  "socket.io-client": "realtime PvP",
  "@react-navigation/native": "navigation",
  "expo-av": "sound effects & music",
  "expo-haptics": "haptic feedback",
  "react-native-gesture-handler": "touch controls"
}
```

**Backend (Golang):**
```
github.com/gorilla/websocket     # WebSocket cho realtime PvP
github.com/gin-gonic/gin         # HTTP REST API
github.com/redis/go-redis/v9     # Redis cho matchmaking & sessions
github.com/jackc/pgx/v5          # PostgreSQL driver
github.com/golang-jwt/jwt/v5     # JWT authentication
go.uber.org/zap                  # Structured logging
```
```

### 0.3 Kiến trúc hệ thống

```
beast-arena/
├── src/
│   ├── app/                    # Expo Router screens
│   │   ├── (auth)/             # Login/wallet connect
│   │   ├── (main)/             # Home, lobby, shop
│   │   ├── (game)/             # Game screens
│   │   └── _layout.tsx
│   ├── engine/                 # Game Engine core
│   │   ├── GameLoop.ts         # Main game loop (60fps)
│   │   ├── Physics.ts          # Hitbox, collision detection
│   │   ├── InputManager.ts     # Touch → action mapping
│   │   ├── AnimationManager.ts # Spine/Spritesheet controller
│   │   ├── AIController.ts     # Practice mode AI
│   │   └── NetworkSync.ts      # PvP state sync
│   ├── characters/             # Character system (expandable)
│   │   ├── types.ts            # CharacterConfig, Skill, Stats interfaces
│   │   ├── registry.ts         # CharacterRegistry — auto-register all chars
│   │   └── configs/            # 1 file per character (data-driven)
│   │       ├── tiger.ts        # 🐯 Muay Thai (MVP)
│   │       ├── lion.ts         # 🦁 Karate/Boxing (MVP)
│   │       ├── crocodile.ts    # 🐊 Judo/Wrestling (MVP)
│   │       ├── eagle.ts        # 🦅 Wing Chun (MVP)
│   │       └── ...             # Thêm nhân vật = thêm file ở đây
│   ├── components/             # UI Components
│   │   ├── game/               # HUD, HP bar, timer, controls
│   │   ├── lobby/              # Room, matchmaking UI
│   │   ├── wallet/             # Wallet connect, balance
│   │   └── common/             # Buttons, modals, etc.
│   ├── blockchain/             # Solana integration
│   │   ├── WalletProvider.tsx   # MWA context
│   │   ├── escrow.ts           # Smart contract interactions
│   │   ├── transactions.ts     # TX builders
│   │   └── constants.ts        # Program IDs, RPC
│   ├── services/               # Backend communication
│   │   ├── matchmaking.ts      # Find opponent
│   │   ├── socket.ts           # WebSocket realtime
│   │   └── api.ts              # REST API
│   ├── stores/                 # Zustand stores
│   │   ├── useGameStore.ts     # Game state
│   │   ├── useWalletStore.ts   # Wallet state
│   │   └── usePlayerStore.ts   # Player profile
│   ├── assets/                 # Sprites, sounds, maps
│   │   ├── characters/         # Spine files / spritesheets
│   │   ├── maps/               # Parallax backgrounds
│   │   ├── effects/            # Hit effects, particles
│   │   ├── ui/                 # UI elements
│   │   └── audio/              # SFX & BGM
│   └── utils/                  # Helpers
├── server/                     # Game Server (Golang)
│   ├── cmd/
│   │   └── server/main.go      # Entrypoint
│   ├── internal/
│   │   ├── game/               # Game logic, fighter, physics
│   │   ├── characters/         # Character configs (JSON, synced with client)
│   │   │   ├── tiger.json
│   │   │   ├── lion.json
│   │   │   ├── crocodile.json
│   │   │   └── eagle.json
│   │   ├── room/               # Room management
│   │   ├── matchmaking/        # Matchmaking engine
│   │   ├── netcode/            # Rollback netcode, sync
│   │   ├── ai/                 # Practice mode AI
│   │   ├── auth/               # JWT auth (later: wallet auth)
│   │   ├── ws/                 # WebSocket handler
│   │   └── api/                # REST API handlers
│   ├── pkg/                    # Shared utilities
│   ├── go.mod
│   └── go.sum
├── programs/                   # [POST-MVP] Solana Programs (Anchor)
│   └── beast-arena-escrow/     # Escrow smart contract
└── docs/                       # Documentation
```

---

## PHASE 1: GAME ENGINE CƠ BẢN (Tuần 3-6)

### 1.1 Game Loop & Rendering (Tuần 3)
- [ ] Setup game canvas (PixiJS hoặc custom Canvas với react-native-skia)
- [ ] Implement game loop 60fps với `requestAnimationFrame`
- [ ] Hệ thống scene management (Menu → Fight → Result)
- [ ] Camera system cho side-scrolling view

**File chính:** `engine/GameLoop.ts`
```tsx
// Core game loop structure
interface GameState {
  player1: FighterState;
  player2: FighterState;
  timer: number;
  round: number;
  roundResults: RoundResult[];
  supplyDrops: SupplyDrop[];
  stage: StageConfig;
}

interface FighterState {
  characterId: CharacterId;
  position: Vector2D;
  velocity: Vector2D;
  hp: number;
  maxHp: number;
  state: FighterActionState; // idle | walking | attacking | blocking | stunned | knockdown
  facing: 'left' | 'right';
  comboCounter: number;
  ultimateGauge: number;
  activeBuffs: Buff[];
  currentAnimation: string;
}
```

### 1.2 Character System — Expandable Architecture (Tuần 3-4)

> 🔌 **Thiết kế mở rộng:** Hệ thống nhân vật được xây dựng dạng **data-driven plugin**.
> Thêm nhân vật mới chỉ cần thêm 1 JSON config + 1 Spine asset bundle — KHÔNG sửa engine code.
> MVP: 4 nhân vật. Mở rộng không giới hạn sau release.

- [ ] Define character interface & stats
- [ ] **Character Registry pattern** — load nhân vật từ config files
- [ ] Implement base Fighter class với state machine
- [ ] Hitbox / Hurtbox system (rectangle-based)
- [ ] Implement 4 nhân vật MVP:

**Character Registry Architecture:**
```tsx
// characters/registry.ts
// Thêm nhân vật = thêm 1 file vào folder, tự register

export interface CharacterConfig {
  id: string;                    // unique ID: "tiger", "lion", ...
  name: string;                  // Display name
  title: string;                 // "Muay Thai Tiger"
  martialArt: string;            // "Muay Thai"
  stats: CharacterStats;         // HP, ATK, SPD, DEF, Special (tổng = 100)
  moveset: CharacterMoveset;     // 6 skills
  assets: CharacterAssets;       // Spine files, VFX spritesheets, audio
  unlockCondition?: UnlockCondition; // Cho nhân vật mở khóa sau
}

interface CharacterAssets {
  spineAtlas: string;            // path to .atlas
  spineJson: string;             // path to .json (Spine data)
  splashArt: string;             // character select art
  portrait: string;              // lobby avatar
  vfxSheet: string;              // VFX spritesheet
  sounds: CharacterSounds;       // grunts, specials, voice lines
}

// Registry: tự scan & register tất cả characters
class CharacterRegistry {
  private characters: Map<string, CharacterConfig> = new Map();

  register(config: CharacterConfig) {
    this.characters.set(config.id, config);
  }

  get(id: string): CharacterConfig { ... }
  getAll(): CharacterConfig[] { ... }
  getAvailable(player: Player): CharacterConfig[] { ... } // filter locked chars
}

export const registry = new CharacterRegistry();
```

**Thêm nhân vật mới (ví dụ Wolf):**
```tsx
// characters/configs/wolf.ts
import { registry } from '../registry';

registry.register({
  id: 'wolf',
  name: 'Wolf',
  title: 'Taekwondo Wolf',
  martialArt: 'Taekwondo',
  stats: { hp: 24, atk: 22, spd: 26, def: 18, special: 10 },
  moveset: { /* ... */ },
  assets: { /* point to wolf Spine + VFX files */ },
  unlockCondition: { type: 'wins', value: 50 }, // Mở khóa sau 50 trận thắng
});
```

**MVP Characters (4 nhân vật, tổng stats = 100):**

| Stat | Tiger 🐯 | Lion 🦁 | Crocodile 🐊 | Eagle 🦅 |
|------|---------|---------|-------------|---------|
| HP | 22 | 28 | 30 | 18 |
| ATK | 26 | 24 | 22 | 20 |
| SPD | 28 | 20 | 14 | 32 |
| DEF | 16 | 22 | 28 | 12 |
| Special | 8 | 6 | 6 | 18 |
| **Total** | **100** | **100** | **100** | **100** |

**Moveset interface (chung cho mọi nhân vật):**
```tsx
interface CharacterMoveset {
  normalAttack: ComboChain;      // 3-4 hit combo
  specialSkill1: Skill;          // Skill slot 1
  specialSkill2: Skill;          // Skill slot 2
  specialSkill3: Skill;          // Skill slot 3
  specialSkill4: Skill;          // Skill slot 4
  ultimate: UltimateSkill;       // Cinematic 2D ultimate
}

interface Skill {
  id: string;           // unique skill ID
  name: string;
  damage: number;
  startup: number;      // frames trước khi active
  active: number;       // frames hitbox active
  recovery: number;     // frames sau khi đánh
  cooldown: number;     // milliseconds
  type: 'strike' | 'grab' | 'projectile' | 'buff';
  effect?: 'stun' | 'knockdown' | 'knockback' | 'slow';
  hitbox: HitboxDef;
  animationKey: string; // map tới Spine animation name
  vfxKey: string;       // map tới VFX spritesheet
  sfxKey: string;       // map tới sound effect
}
```

### 1.3 Physics & Collision (Tuần 4)
- [ ] Gravity, ground detection
- [ ] Hitbox vs Hurtbox collision detection (AABB)
- [ ] Knockback physics
- [ ] Wall/boundary collision
- [ ] Frame-data system (startup, active, recovery frames)

### 1.4 Animation System — Spine/Live2D + VFX (Tuần 5-6)

#### Skeletal Animation (Spine hoặc Live2D)
- [ ] **Spine Runtime integration** cho React Native (via WebGL canvas)
  - `spine-ts` / `spine-pixi` runtime
  - Hoặc custom native module wrap `spine-c` runtime
- [ ] Animation state machine:
  ```
  idle → walk → jump → crouch
    ↓       ↓
  attack → combo_chain (3-4 hits)
    ↓
  special_1/2/3/4 → recovery
    ↓
  ultimate → cinematic_camera → recovery
    ↓
  hit_stun → knockback → knockdown → getup
    ↓
  block → block_stun
    ↓
  victory / defeat
  ```
- [ ] **"Breathing" idle:** Cơ bắp co giãn nhẹ, tóc/lông bay — Spine mesh deform
- [ ] **Blend transitions:** Mượt giữa các state (0.1-0.2s crossfade)
- [ ] Character Select: Splash Art + Spine idle + Victory Pose animation

#### Hand-drawn VFX (Frame-by-Frame)
- [ ] **Đòn đánh thường:** Spark impacts, motion blur trails
- [ ] **Special Skills VFX:**
  - 🔥 Tiger: Lửa cháy trên chỏ/đầu gối
  - ⚡ Lion: Sấm sét bao quanh đấm
  - 🌊 Crocodile: Đất nứt / sóng nước khi quật
  - 🌪️ Eagle: Gió xoáy / lông vũ bay
- [ ] **Ultimate VFX:** Full-screen cinematic — camera zoom + slow-mo + hand-drawn effect overlay
- [ ] **Format:** Spritesheet atlas cho VFX frames (PNG sequence → TexturePacker)
- [ ] Hit-stop effect (freeze 2-3 frames khi trúng đòn nặng)
- [ ] Screen shake system (configurable intensity/duration)

#### Parallax Backgrounds
- [ ] 3-4 layer parallax per stage
- [ ] Animated elements: Lá rơi, mây trôi, đuốc cháy, nước chảy
- [ ] Render pipeline: Background layers → Characters → VFX → HUD

**Lựa chọn Animation Engine:**
- **Option A — Spine 2D** (RECOMMENDED): Skeletal animation, file nhỏ, blend mượt, "breathing" dễ
  - License: $69/seat (Essential) hoặc $339 (Professional cho mesh deform)
  - Runtime: `spine-ts` (TypeScript, chạy trên PixiJS/WebGL)
- **Option B — Live2D:** Tốt cho biểu cảm mặt, breathing, nhưng phức tạp hơn cho fighting
  - License: Free (indie < $1k revenue) hoặc $25/mo
  - Ít phù hợp cho combat animation nhiều state
- **Option C — Hybrid:** Spine cho combat + Live2D cho character select / lobby portraits
- **Prototype:** Dùng spritesheet placeholder → swap Spine khi art sẵn

---

## PHASE 2: UI/UX, CONTROLS & SCREEN FLOW (Tuần 7-10)

### 2.0 Art Style & Visual Direction
- **Visual:** 2D Cartoon / Hand-drawn — phong cách truyện tranh Âu Mỹ hoặc Anime sắc sảo
- **Animation Engine:** Spine Animation (primary) hoặc Live2D — giữ chi tiết bản vẽ gốc, chuyển động mượt
- **VFX:** Hand-drawn frame-by-frame cho đòn đặc biệt (lửa, sấm sét, gió xoáy) → tạo cảm giác "lực" nghệ thuật
- **UI Style:** Flat Design — nút bấm gọn gàng, text Comic style cho "K.O", "FIGHT", "SUPPLY DROP"

### 2.1 Touch Controls (Tuần 7)
- [ ] Virtual joystick (D-pad) bên trái cho di chuyển
- [ ] Nút hành động bên phải: Attack, Block, Jump
- [ ] 4 nút Special Skills (với cooldown indicator)
- [ ] Nút Ultimate (khi gauge đầy → glow effect)
- [ ] Gesture recognition: swipe = dash, double tap = dodge
- [ ] **Nút bấm trong suốt (Opacity 50%)** — không che tầm nhìn
- [ ] **Icon kỹ năng:** Vector đơn giản hóa, dễ nhận diện

```tsx
// Control Layout
interface ControlLayout {
  dpad: {
    position: 'bottom-left';
    type: 'floating-joystick' | 'fixed-dpad';
  };
  actionButtons: {
    position: 'bottom-right';
    buttons: ['attack', 'block', 'jump'];
    layout: 'arc';
    opacity: 0.5; // Transparent buttons
  };
  specialSkills: {
    position: 'right-side';
    slots: 4;
    showCooldown: true;
    iconStyle: 'vector-simplified';
  };
  ultimate: {
    position: 'center-bottom';
    requireGaugeFull: true;
  };
}
```

### 2.2 Game HUD — In-game (Tuần 7-8)
- [ ] **HP Bar:** Thanh 2D truyền thống đối xứng, avatar nhỏ nhân vật bên cạnh, animation khi giảm
- [ ] **Round Timer:** Đếm ngược 60-99s, giữa màn hình trên cùng
- [ ] **Round Score:** Dots indicator (● ● ○)
- [ ] **Ultimate Gauge:** Bên dưới HP bar, charge dần khi đánh/chịu đòn
- [ ] **Buff/Debuff icons:** Hiện dưới HP bar
- [ ] **Supply Drop Warning:** Countdown 9s + marker vị trí rơi
- [ ] **Combo Counter:** Số hit + tổng damage, Comic-style typography
- [ ] **Thông báo text:** "K.O", "FIGHT!", "ROUND 1", "SUPPLY DROP" — Comic art typography 2D

### 2.3 Screen Flow Chi Tiết (Tuần 8-10)

#### 📱 Màn hình Login
- [ ] **Nền:** Illustration tĩnh hoặc động nhẹ (Parallax) — cuộc đối đầu giữa các loài thú
- [ ] **UI:** Flat Design, nút bấm gọn gàng
- [ ] **Nút "Connect Wallet"** nổi bật — primary CTA
- [ ] Animation: Subtle parallax layers khi tilt device (accelerometer)

```tsx
// LoginScreen.tsx
const LoginScreen = () => (
  <ParallaxBackground layers={[bgFar, bgMid, bgClose]}>
    <Logo animated />
    <ConnectWalletButton 
      style="primary"
      onPress={connectWallet}
      label="Connect Wallet"
    />
    <SupportedWallets icons={['phantom', 'solflare']} />
  </ParallaxBackground>
);
```

#### 🏠 Màn hình Chính (Lobby)
- [ ] **Header:** Avatar 2D nhân vật, địa chỉ ví (truncated), số dư SOL realtime
- [ ] **Chế độ chơi:** Dạng thẻ bài (Cards) hoặc banner ngang — swipeable
  - Card "⚔️ Thách Đấu PvP" — glow effect
  - Card "🥊 Tập Luyện" — muted style
- [ ] **Thanh năng lượng:** "Lượt tập miễn phí: 3/5" — progress bar
- [ ] **Quick Stats:** Win/Loss ratio, Rank badge

```tsx
// LobbyScreen.tsx
interface LobbyState {
  walletAddress: string;        // Truncated: "4zMM...xKnr"
  solBalance: number;           // Realtime
  avatar: CharacterId;          // Selected character avatar
  freePracticeLeft: number;     // 0-5
  totalPracticePerDay: number;  // 5
  winRate: number;
  rank: string;
}
```

#### 🎭 Màn hình Chọn Tướng (Character Select) — ĐẶC BIỆT
- [ ] **Character Art:** Splash Art chất lượng cao, đứng (KHÔNG phải 3D xoay)
- [ ] **Idle Animation:** Spine "Breathing" animation — nhân vật thở nhẹ, cơ bắp co giãn
- [ ] **Khi chọn:** Chớp sáng màn hình → Victory Pose animation 2D hoành tráng
- [ ] **Stats:** Radar chart phẳng (HP/ATK/SPD/DEF/Special)
- [ ] **Skill List:** Flat design, icon + tên + mô tả ngắn
- [ ] **Sound:** Mỗi nhân vật có voice line khi được chọn

```tsx
// CharacterSelectScreen.tsx
interface CharacterSelectCard {
  characterId: CharacterId;
  splashArt: SpineAnimation;    // Full-body Spine idle with breathing
  victoryPose: SpineAnimation;  // Triggered on select
  name: string;
  title: string;                // "Muay Thai Tiger", "Karate Lion"
  stats: RadarChartData;
  skills: SkillPreview[];
  voiceLine: AudioClip;         // "You dare challenge ME?"
}
```

#### 🗺️ Màn hình Chọn Sàn Đấu (Stage Select)
- [ ] Map thumbnails với preview parallax animation
- [ ] Tên + mô tả ngắn stage
- [ ] Supply drop spawn zone highlight

#### ⚔️ Màn hình Vào Trận (Fight Screen)
- [ ] Góc nhìn: **Ngang hoàn toàn (Side-scrolling)**
- [ ] Parallax background 3-4 layers
- [ ] HUD overlay (xem 2.2)
- [ ] Controls overlay transparent (xem 2.1)
- [ ] VFX layer: Hand-drawn frame-by-frame effects

#### 🏆 Màn hình Kết Quả (Result)
- [ ] Winner spotlight animation
- [ ] Stats recap: Damage dealt, combos, perfect rounds
- [ ] SOL won/lost display với transaction link
- [ ] "Rematch" / "Back to Lobby" buttons

### 2.4 UX Feedback System (Tuần 9)
- [ ] **Haptic Feedback:**
  - Rung nhẹ khi đánh trúng (light impact)
  - Rung mạnh khi trúng đòn nặng / Ultimate (heavy impact)
  - Rung pattern đặc biệt cho K.O
- [ ] **Sound Design:**
  - Mono/Stereo rõ ràng
  - Tiếng "Bốp", "Chát" đanh thép — game đối kháng 2D cổ điển
  - Hit confirm sounds khác nhau: light hit, heavy hit, block, counter
  - Announcer voice: "ROUND 1... FIGHT!", "K.O!", "PERFECT!"
- [ ] **Visual Feedback:**
  - Hit-stop (freeze 2-3 frames khi đòn trúng mạnh)
  - Screen shake khi heavy hit
  - Flash trắng khi K.O
  - Slow-mo cho Ultimate finish

```tsx
// FeedbackManager.ts
interface HapticPattern {
  lightHit: 'impactLight';
  heavyHit: 'impactHeavy';
  block: 'impactMedium';
  ultimate: 'notificationSuccess';
  ko: [number, number, number]; // Custom vibration pattern
}

interface SoundBank {
  hits: {
    light: AudioClip[];       // 3-4 variants
    heavy: AudioClip[];
    block: AudioClip[];
    counter: AudioClip[];
  };
  announcer: {
    fight: AudioClip;
    roundStart: AudioClip[];  // "Round 1", "Round 2", "Final Round"
    ko: AudioClip;
    perfect: AudioClip;
    timeOver: AudioClip;
  };
  characters: Record<CharacterId, {
    grunt: AudioClip[];
    special: AudioClip[];
    ultimate: AudioClip;
    victory: AudioClip;
    defeat: AudioClip;
  }>;
}

---

## PHASE 3: MVP BACKEND — GOLANG (Tuần 10-13)

> ⚠️ **MVP Approach:** Phase này tập trung vào backend Golang thuần — 
> chưa cần Solana/wallet. Auth bằng email/guest account. Wager system mock.

### 3.1 Golang Project Setup (Tuần 10)
- [ ] Init Go module + project structure
- [ ] Setup Gin HTTP server + gorilla/websocket
- [ ] PostgreSQL schema design + migrations
- [ ] Redis setup cho matchmaking queue & session store
- [ ] Docker Compose cho local dev (Go server + Postgres + Redis)

```go
// cmd/server/main.go
package main

import (
    "github.com/gin-gonic/gin"
    "beast-arena-server/internal/api"
    "beast-arena-server/internal/ws"
    "beast-arena-server/internal/matchmaking"
)

func main() {
    r := gin.Default()
    
    // REST API
    r.POST("/api/auth/guest", api.GuestLogin)      // MVP: guest account
    r.GET("/api/profile/:id", api.GetProfile)
    r.GET("/api/leaderboard", api.GetLeaderboard)
    
    // WebSocket for game
    r.GET("/ws/game", ws.HandleGameConnection)
    
    // Matchmaking
    r.POST("/api/match/find", api.FindMatch)
    r.POST("/api/match/practice", api.StartPractice)
    
    r.Run(":8080")
}
```

### 3.2 Database Schema (Tuần 10)
```sql
-- players table (MVP: no wallet, use guest ID)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(50),
    guest_token VARCHAR(255),     -- MVP auth
    -- wallet_address VARCHAR(44), -- POST-MVP: Solana
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    rank_points INT DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID REFERENCES players(id),
    player2_id UUID REFERENCES players(id),
    winner_id UUID REFERENCES players(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, cancelled
    mode VARCHAR(20),                      -- pvp, practice
    -- wager_amount BIGINT,               -- POST-MVP: SOL lamports
    rounds JSONB,                          -- round results
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

### 3.3 Auth System — MVP (Tuần 11)
- [ ] **Guest login:** Generate UUID + JWT token (không cần đăng ký)
- [ ] **Display name:** Tự chọn hoặc auto-generate ("Tiger_7823")
- [ ] JWT middleware cho tất cả protected routes
- [ ] Profile CRUD (stats, win/loss, rank)
- [ ] **[POST-MVP]** Wallet login sẽ thay thế/bổ sung guest auth

```go
// internal/auth/guest.go
type GuestLoginResponse struct {
    PlayerID    string `json:"player_id"`
    DisplayName string `json:"display_name"`
    Token       string `json:"token"` // JWT
}
```

### 3.4 REST API Endpoints (Tuần 11-12)
- [ ] `POST /api/auth/guest` — Tạo guest account + JWT
- [ ] `GET /api/profile/:id` — Player profile + stats
- [ ] `PATCH /api/profile` — Update display name
- [ ] `GET /api/leaderboard` — Top players by rank
- [ ] `POST /api/match/find` — Queue matchmaking (PvP)
- [ ] `POST /api/match/practice` — Start practice match
- [ ] `GET /api/match/:id` — Match result/replay data
- [ ] `GET /api/match/history` — Player match history

### 3.5 Game State Management — Server-side (Tuần 12-13)
- [ ] Game state struct in Go (mirror của client GameState)
- [ ] Server-authoritative damage calculation
- [ ] Round management (Bo3) logic
- [ ] Supply drop spawn scheduler
- [ ] Match result persistence → PostgreSQL
- [ ] ELO/rank point calculation sau match
- [ ] Practice mode: daily free turn tracking (5/day, reset UTC)

```go
// internal/game/state.go
type GameState struct {
    MatchID      string
    Player1      *FighterState
    Player2      *FighterState
    Timer        int
    Round        int
    RoundResults []RoundResult
    SupplyDrops  []SupplyDrop
    StageID      string
    Status       MatchStatus
}

type FighterState struct {
    CharacterID string       // lookup từ CharacterRegistry
    Position    Vector2D
    HP          int
    MaxHP       int
    State       FighterAction
    UltGauge    float64
    ActiveBuffs []Buff
}

// internal/game/character_registry.go
// Server-side cũng data-driven — đồng bộ config với client
type CharacterConfig struct {
    ID         string            `json:"id"`
    Stats      CharacterStats    `json:"stats"`
    Moveset    map[string]Skill  `json:"moveset"`
}

var Registry = map[string]*CharacterConfig{}

func LoadCharacters(path string) error {
    // Load từ JSON files — thêm nhân vật = thêm file
    files, _ := os.ReadDir(path)
    for _, f := range files {
        var cfg CharacterConfig
        data, _ := os.ReadFile(filepath.Join(path, f.Name()))
        json.Unmarshal(data, &cfg)
        Registry[cfg.ID] = &cfg
    }
    return nil
}
```

---

## PHASE 4: MULTIPLAYER & BACKEND (Tuần 14-17)

### 4.1 Game Server — Golang WebSocket (Tuần 14-15)
- [ ] Gorilla WebSocket server với connection pooling
- [ ] Room management (create, join, spectate) — Go channels
- [ ] Matchmaking engine (ranked ELO, casual random) — Redis queue
- [ ] Game state authority (server-authoritative cho anti-cheat)
- [ ] Concurrent room goroutines (1 goroutine per active match)
- [ ] Referee/spectator mode (read-only WebSocket)

```
Server Architecture (Golang):
┌─────────────┐     WebSocket     ┌───────────────────┐
│  Player 1   │◄──────────────────│                   │
│  (Mobile)   │──────────────────►│  Game Server (Go) │
└─────────────┘                   │                   │
                                  │  ┌─── Goroutine ──┐│
┌─────────────┐     WebSocket     │  │ Room Manager   ││
│  Player 2   │◄──────────────────│  │ Match Loop     ││
│  (Mobile)   │──────────────────►│  │ State Sync     ││
└─────────────┘                   │  │ Anti-cheat     ││
                                  │  └────────────────┘│
┌─────────────┐     WebSocket     │                   │
│  Spectator  │◄──────────────────│  [Redis] ← Queue  │
│  (Optional) │                   │  [Postgres] ← Data│
└─────────────┘                   └───────────────────┘
                                         │
                                  [POST-MVP: Solana RPC]
```

```go
// internal/room/manager.go
type RoomManager struct {
    rooms    map[string]*GameRoom
    mu       sync.RWMutex
    redis    *redis.Client
    matchCh  chan MatchRequest
}

type GameRoom struct {
    ID        string
    State     *game.GameState
    Player1   *PlayerConn
    Player2   *PlayerConn
    Spectators []*PlayerConn
    inputCh   chan PlayerInput
    done      chan struct{}
}

// Each room runs its own goroutine
func (r *GameRoom) Run() {
    ticker := time.NewTicker(16 * time.Millisecond) // 60fps
    defer ticker.Stop()
    for {
        select {
        case input := <-r.inputCh:
            r.State.ProcessInput(input)
        case <-ticker.C:
            r.State.Tick()
            r.BroadcastState()
        case <-r.done:
            return
        }
    }
}
```

### 4.2 Netcode — Rollback + Server-Authoritative (Tuần 15-16)

**Architecture: Server-Authoritative with Rollback Prediction**

```
Player Input → Local Prediction (instant feedback)
     ↓
  Send to Server → Server validates → Broadcast authoritative state
     ↓
  Client receives → Compare with prediction
     ↓
  Match? → Continue smoothly
  Mismatch? → Rollback local state → Replay with corrected state
```

- [ ] **Deterministic game simulation** — cùng input = cùng output trên mọi client
- [ ] **Input-based sync** — chỉ gửi input (8-16 bytes/frame), không gửi full state
- [ ] **Rollback netcode implementation:**
  - Save game state snapshot mỗi frame (ring buffer ~10 frames)
  - Khi nhận input delay từ đối thủ → rollback + resimulate
  - Max rollback window: 8 frames (~133ms ở 60fps)
- [ ] **Lag compensation:** Input delay buffer (1-3 frames configurable)
- [ ] **Desync detection:** Periodic state hash comparison
- [ ] **Desync recovery:** Full state sync khi hash mismatch
- [ ] **Latency display:** Ping indicator (ms) + connection quality icon
- [ ] **Lockstep fallback:** Cho trường hợp quá lag (>200ms) → switch to lockstep mode

### 4.3 Anti-Cheat — Golang (Tuần 16-17)
- [ ] Server-side input validation (rate limit per connection)
- [ ] HP/damage verification — server is source of truth
- [ ] Match replay recording → PostgreSQL JSONB
- [ ] Report system API endpoint
- [ ] Go middleware: request signing, timestamp validation

### 4.4 Practice Mode AI — Golang (Tuần 17)
- [ ] AI engine chạy server-side (Go goroutine giả lập player 2)
- [ ] 3 difficulty levels: Easy, Normal, Hard
- [ ] AI behavior trees:
  - Easy: Random actions, slow reaction (300ms delay)
  - Normal: Basic combos, blocks occasionally (150ms delay)
  - Hard: Reads player patterns, optimal punishes (50ms delay)
- [ ] Training dummy mode (đứng yên, hiện damage numbers)
- [ ] Daily free turn tracking: Redis counter per player, TTL reset UTC

---

## PHASE 5: ART & AUDIO (Song song với Phase 1-4)

### 5.1 Character Art
- [ ] 4 nhân vật × ~30 animation states mỗi nhân vật
- [ ] Mỗi state: idle, walk, jump, crouch, 4-hit combo, 4 specials, ultimate, hit, block, knockdown, victory, defeat
- [ ] Style: 2D Hand-drawn / Comic Art hoặc Spine 2D skeletal
- [ ] Resolution: Optimize cho mobile (max 2x retina)

### 5.2 Stage Art
- [ ] 4-5 stages với parallax layers (3-4 layers mỗi stage)
- [ ] Stages: Rừng nhiệt đới, Đấu trường La Mã, Đầm lầy, Vách núi, Dojo
- [ ] Animated background elements (lá rơi, mây trôi, đuốc cháy)

### 5.3 UI Art
- [ ] HP bars, timer, round indicators
- [ ] Character select portraits
- [ ] Button icons, skill icons
- [ ] Victory/Defeat screens
- [ ] Loading screens
- [ ] Phong cách: Cartoon/Comic nhất quán

### 5.4 Audio
- [ ] BGM: 1 menu track + 4-5 stage battle tracks
- [ ] SFX: Hit sounds, block sounds, special move sounds, UI sounds
- [ ] Voice: Character grunts, victory quotes, announcer ("Round 1... FIGHT!")
- [ ] Integration: `expo-av` cho playback

---

## PHASE 6: TESTING & MVP LAUNCH (Tuần 18-20)

### 6.1 Performance
- [ ] Target: 60fps stable trên mid-range devices
- [ ] Memory profiling (< 300MB RAM)
- [ ] Asset lazy loading (load character assets khi select)
- [ ] Texture atlas optimization
- [ ] Network bandwidth optimization (< 5KB/s per player)

### 6.2 Testing
- [ ] Unit tests: Game logic, damage calculation, collision
- [ ] Integration tests: Wallet connect, transaction flow
- [ ] Load testing: Server với 100+ concurrent matches
- [ ] Device testing: Android 10+ (ưu tiên), iOS 15+
- [ ] Testnet testing: Solana Devnet trước → Mainnet-beta

### 6.3 Balance Testing
- [ ] Playtesting tất cả matchups (4×4 = 16 combinations)
- [ ] Damage/HP tuning
- [ ] Cooldown tuning
- [ ] Supply drop balance
- [ ] Wager flow UX testing

---

## PHASE 7: MVP LAUNCH (Tuần 21-22)

### 7.1 MVP Deployment
- [ ] Build release APK (signed)
- [ ] Deploy Golang server (Fly.io / Railway / AWS ECS)
- [ ] Deploy PostgreSQL + Redis (managed service)
- [ ] Setup monitoring (Prometheus + Grafana hoặc Datadog)
- [ ] Submit lên Google Play Store (standard, chưa cần dApp Store)
- [ ] TestFlight cho iOS

### 7.2 MVP Launch Checklist
- [ ] Security review (API, WebSocket, anti-cheat)
- [ ] Terms of service & privacy policy
- [ ] Marketing materials ready
- [ ] Community Discord/Telegram setup
- [ ] Beta testing với nhóm nhỏ (50-100 players)

---

## PHASE 8: SOLANA INTEGRATION (POST-MVP — Tuần 23-28)

> 🔗 Phase này chỉ bắt đầu SAU KHI MVP stable và có user base.

### 8.1 Wallet Integration (Tuần 23-24)
- [ ] Thêm Solana dependencies vào frontend
- [ ] MWA Provider setup (Phantom, Solflare)
- [ ] Login bằng wallet (authorize + auth_token + SIWS)
- [ ] Hiển thị SOL balance realtime
- [ ] Link wallet to existing guest account (migration)

### 8.2 Escrow Smart Contract (Tuần 24-26)
- [ ] Viết Anchor program cho escrow/wager system (Rust)
- [ ] `create_match` — deposit wager
- [ ] `join_match` — đối thủ deposit
- [ ] `resolve_match` — server submit kết quả → release funds
- [ ] `cancel_match` — refund
- [ ] Platform fee: 5-10% configurable
- [ ] **Smart contract audit** (bắt buộc)

### 8.3 Transaction Flow (Tuần 26-27)
- [ ] Wager deposit/claim flow
- [ ] Buy practice turns bằng SOL
- [ ] Transaction history
- [ ] Error handling (insufficient funds, rejected TX)

### 8.4 dApp Store Launch (Tuần 27-28)
- [ ] Publisher Portal KYC/KYB
- [ ] Submit lên Solana dApp Store
- [ ] Deploy Anchor program → Mainnet-beta

---

## TIMELINE TỔNG HỢP

### 🎯 MVP (Tuần 1-22 = ~5.5 tháng)
```
Tuần  1-2:  ████ Phase 0 - Setup (Expo + Golang)
Tuần  3-6:  ████████ Phase 1 - Game Engine + Spine/VFX
Tuần  7-10: ████████ Phase 2 - UI/UX, Screen Flow, Controls
Tuần 10-13: ████████ Phase 3 - Golang Backend (API, DB, Auth)
Tuần 14-17: ████████ Phase 4 - Multiplayer (Go WebSocket, Rollback)
Tuần  3-17: ████████████████████████████████████ Phase 5 - Art & Audio (parallel)
Tuần 18-20: ██████ Phase 6 - Testing & Optimization
Tuần 21-22: ████ Phase 7 - MVP Launch (Play Store)
```

### 🔗 POST-MVP: Solana (Tuần 23-28 = +1.5 tháng)
```
Tuần 23-24: ████ Phase 8.1 - Wallet Integration (MWA)
Tuần 24-26: ██████ Phase 8.2 - Escrow Smart Contract (Anchor/Rust)
Tuần 26-27: ████ Phase 8.3 - Transaction Flow
Tuần 27-28: ████ Phase 8.4 - dApp Store Launch + Audit

Tổng MVP: ~22 tuần (~5.5 tháng)
Tổng Full: ~28 tuần (~7 tháng)
```

---

## TECH STACK SUMMARY

### MVP Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React Native (TSX) + Expo |
| Game Rendering | PixiJS (WebGL) + react-native-skia (fallback) |
| Skeletal Animation | **Spine 2D** (`spine-ts` / `spine-pixi`) — primary |
| VFX | Hand-drawn frame-by-frame spritesheet (TexturePacker) |
| State Management | Zustand |
| Navigation | Expo Router |
| **Backend** | **Golang** (Gin + gorilla/websocket) |
| Netcode | **Rollback Netcode** + Server-Authoritative (Go) |
| Realtime | **gorilla/websocket** (native Go WebSocket) |
| Database | **PostgreSQL** (pgx) + **Redis** (go-redis) |
| Auth | JWT (golang-jwt) — guest account MVP |
| Audio | expo-av (music) + expo-audio (SFX) |
| Haptic | expo-haptics |
| Deployment | EAS Build → Play Store / TestFlight |
| Server Deploy | Fly.io / Railway / AWS ECS + Docker |

### POST-MVP (Solana)
| Layer | Technology |
|-------|-----------|
| Blockchain | Solana, Anchor Framework (Rust) |
| Wallet | Mobile Wallet Adapter (MWA) |
| dApp Store | Solana dApp Store |

### Tại sao Golang cho Backend?
- **Performance:** Goroutines xử lý hàng ngàn concurrent connections dễ dàng
- **Low latency:** Compiled language, GC tuning tốt cho game server
- **Concurrency:** 1 goroutine per game room, channels cho communication
- **WebSocket native:** gorilla/websocket là industry standard
- **Deploy đơn giản:** Single binary, Docker image nhỏ (~20MB)

### Frontend Dependencies
```json
{
  "dependencies": {
    "pixi.js": "^7.x",
    "@pixi/spine-pixi": "latest",
    "react-native-reanimated": "latest",
    "react-native-gesture-handler": "latest",
    "react-native-skia": "latest",
    "zustand": "latest",
    "expo-router": "latest",
    "expo-av": "latest",
    "expo-haptics": "latest",
    "expo-sensors": "latest",
    "@react-navigation/native": "latest",
    "react-native-safe-area-context": "latest"
  }
}
```

### Golang Dependencies
```
github.com/gin-gonic/gin           # HTTP framework
github.com/gorilla/websocket       # WebSocket
github.com/jackc/pgx/v5            # PostgreSQL
github.com/redis/go-redis/v9       # Redis
github.com/golang-jwt/jwt/v5       # JWT auth
go.uber.org/zap                    # Logging
github.com/prometheus/client_golang # Metrics
```

---

## TEAM ĐỀ XUẤT (Minimum Viable)

| Role | Số người | Nhiệm vụ |
|------|----------|-----------|
| Lead Dev / Game Dev | 1 | Game engine, physics, controls |
| Frontend Dev | 1 | UI/UX, screens, wallet integration |
| Blockchain Dev | 1 | Smart contract, transaction flow |
| Backend Dev | 1 | Game server, matchmaking, anti-cheat |
| 2D Artist | 1-2 | Character sprites, stages, UI |
| Sound Designer | 1 (freelance) | BGM, SFX |
| QA | 1 | Testing |

**Solo dev approach:** Có thể 1 người làm tất cả code (Phase 0-4, 6-7) nhưng PHẢI outsource art (Phase 5). Thời gian sẽ x2-3 (~12-15 tháng).

---

## RỦI RO & GIẢI PHÁP

| Rủi ro | Giải pháp |
|--------|-----------|
| Performance 2D rendering trên RN | Dùng react-native-skia hoặc native module cho game canvas |
| Realtime PvP latency | Rollback netcode, server đặt gần target audience |
| Smart contract exploit | Audit bởi bên thứ 3 trước mainnet |
| Art production chậm | Bắt đầu art từ Phase 1, dùng placeholder assets |
| Solana network congestion | Priority fees, retry logic |
| App Store rejection | Comply policy, KYC/KYB sớm |

---

## BƯỚC TIẾP THEO (Ngay bây giờ)

1. **Scaffold project** - Init Expo + Solana template
2. **Prototype game loop** - Canvas rendering + 1 character placeholder
3. **Touch controls** - Joystick + action buttons
4. **Wallet connect** - MWA integration cơ bản

Bạn muốn bắt đầu từ bước nào? Tôi có thể scaffold project và code ngay.
