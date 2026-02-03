# 🎨 BEAST ARENA - UI/UX SPECIFICATION

Chi tiết đặc tả giao diện và trải nghiệm người dùng.

---

## 1. ART DIRECTION

### Visual Style
- **2D Cartoon / Hand-drawn** — phong cách truyện tranh Âu Mỹ hoặc Anime sắc sảo
- Đường nét cơ bắp rõ ràng, nhấn mạnh đặc điểm loài vật
- Màu sắc đậm, tương phản cao, dễ nhìn trên mobile

### Animation Technology
| Thành phần | Công nghệ | Chi tiết |
|-----------|----------|---------|
| Character combat | **Spine 2D** | Skeletal animation, mesh deform, blend states |
| Character idle/select | Spine 2D + Live2D | "Breathing" effect, biểu cảm mặt |
| VFX đòn đánh | **Frame-by-frame** | Hand-drawn PNG sequences, 12-24fps |
| Background | Parallax layers | 3-4 layers, animated elements |
| UI transitions | react-native-reanimated | Smooth 60fps UI animations |

### VFX Palette (per Character)
```
🐯 Tiger (Muay Thai):
   - Đòn thường: Orange spark trails
   - Special: 🔥 Lửa cháy trên chỏ/đầu gối
   - Ultimate: Phượng hoàng lửa bao trùm

🦁 Lion (Karate):
   - Đòn thường: Golden impact bursts
   - Special: ⚡ Sấm sét bao quanh nắm đấm
   - Ultimate: Gầm sư tử — shockwave sấm sét

🐊 Crocodile (Judo):
   - Đòn thường: Earth/mud splashes
   - Special: 🌊 Đất nứt, sóng nước khi quật
   - Ultimate: Đầm lầy nuốt chửng — water vortex

🦅 Eagle (Wing Chun):
   - Đòn thường: White feather trails
   - Special: 🌪️ Gió xoáy, lông vũ bay tán loạn
   - Ultimate: Bão táp từ trên cao — tornado of feathers
```

---

## 2. SCREEN FLOW

```
[Splash] → [Login] → [Lobby]
                        ├── [Character Select] → [Stage Select] → [Wager?] → [Fight] → [Result]
                        ├── [Practice] → [Character Select] → [Fight] → [Result]
                        ├── [Profile]
                        └── [Settings]
```

---

## 3. SCREEN SPECIFICATIONS

### 3.1 Splash Screen
```
┌──────────────────────────┐
│                          │
│                          │
│     🐯 BEAST ARENA 🐯    │
│      [Loading Bar]       │
│                          │
│     "Loading assets..."  │
│                          │
└──────────────────────────┘
```
- Logo animation: Claw slash → logo appears
- Duration: 2-3s (or until assets loaded)
- Background: Dark with subtle particle effects

### 3.2 Login Screen
```
┌──────────────────────────┐
│ ╔══ Parallax BG ══════╗  │
│ ║  Tiger vs Lion       ║  │
│ ║  illustration        ║  │
│ ║  (subtle parallax)   ║  │
│ ╚═════════════════════╝  │
│                          │
│     🐯 BEAST ARENA       │
│                          │
│  ┌────────────────────┐  │
│  │  🔗 Connect Wallet │  │  ← Primary CTA, glow pulse
│  └────────────────────┘  │
│                          │
│   [Phantom] [Solflare]   │  ← Wallet icons below
│                          │
│  v1.0.0  |  Terms  |  ?  │
└──────────────────────────┘
```
- **Nền:** Illustration tĩnh hoặc parallax nhẹ — 2 beast-men đối đầu
- **Parallax:** 2-3 layers, react to device tilt (expo-sensors accelerometer)
- **CTA:** "Connect Wallet" — large, glowing pulse animation
- **Flat Design:** Clean, minimal UI elements

### 3.3 Lobby (Main Menu)
```
┌──────────────────────────┐
│ [🐯 Avatar]  4zMM...xKnr │
│              💰 12.5 SOL  │
│──────────────────────────│
│                          │
│  ┌──────────┐ ┌────────┐ │
│  │ ⚔️ PVP   │ │ 🥊 TẬP │ │  ← Swipeable cards
│  │ THÁCH ĐẤU│ │ LUYỆN  │ │
│  │          │ │        │ │
│  │ [Glow]   │ │ 3/5 ⚡ │ │  ← Practice shows free turns
│  └──────────┘ └────────┘ │
│                          │
│  ┌──────────────────────┐│
│  │ ⚡ Lượt tập: ███░░ 3/5││  ← Energy bar
│  └──────────────────────┘│
│                          │
│  📊 Win: 24  Loss: 12     │
│  🏆 Rank: Silver III      │
│                          │
│ [🏠Home] [👤Profile] [⚙️] │
└──────────────────────────┘
```
- **Header:** Avatar 2D (selected character), wallet address truncated, SOL balance (realtime)
- **Mode cards:** Swipeable horizontal — PvP card has glow/premium feel
- **Energy bar:** "Lượt tập miễn phí: 3/5" — animated progress bar
- **Quick stats:** Win/Loss ratio, Rank badge

### 3.4 Character Select — KEY SCREEN
```
┌──────────────────────────┐
│  ← Back    CHỌN CHIẾN BINH│
│──────────────────────────│
│                          │
│       ┌──────────┐       │
│       │          │       │
│       │  SPINE   │       │  ← Full body Splash Art
│       │  IDLE    │       │     Spine "breathing" animation
│       │  ANIM    │       │     Muscle flex, fur/hair wave
│       │          │       │
│       └──────────┘       │
│                          │
│  ┌─────────────────────┐ │
│  │ Stats Radar Chart   │ │  ← HP/ATK/SPD/DEF/Special
│  │    ╱╲               │ │
│  │   ╱  ╲              │ │
│  │  ╱    ╲             │ │
│  └─────────────────────┘ │
│                          │
│  Skills:                 │
│  [🔥 Hổ Vồ] [⚡ Chỏ Thép]│  ← Flat icon + name
│  [💨 Đá Xoáy] [🦵 Gối]  │
│  [💥 Tuyệt Kỹ: Hỏa Hổ] │
│                          │
│ [🐯] [🦁] [🐊] [🦅]      │  ← Character thumbnails
│                          │
│  ┌────────────────────┐  │
│  │    ✅ CHỌN TƯỚNG    │  │  ← Triggers flash + Victory Pose
│  └────────────────────┘  │
└──────────────────────────┘
```
**Interactions:**
1. Tap character thumbnail → Splash art slides in, Spine idle starts
2. Swipe left/right → Switch characters with transition
3. Tap "CHỌN TƯỚNG" → Screen flash white → Character does Victory Pose → Transition to Stage Select
4. Character voice line plays on select: "Ngươi dám thách thức TA?"

### 3.5 Stage Select
```
┌──────────────────────────┐
│  ← Back    CHỌN SÀN ĐẤU  │
│──────────────────────────│
│                          │
│  ┌──────────────────────┐│
│  │  [Parallax Preview]  ││  ← Mini parallax animation
│  │  🌴 Rừng Nhiệt Đới   ││
│  └──────────────────────┘│
│                          │
│  [🌴][🏛️][🌫️][⛰️][🏯]    │  ← Stage thumbnails, scrollable
│                          │
│  ┌────────────────────┐  │
│  │    ✅ VÀO TRẬN      │  │
│  └────────────────────┘  │
└──────────────────────────┘
```

### 3.6 Wager Screen (PvP Mode only)
```
┌──────────────────────────┐
│       ĐẶT CƯỢC          │
│──────────────────────────│
│                          │
│  💰 Số dư: 12.5 SOL      │
│                          │
│  Mức cược:               │
│  [0.1] [0.5] [1.0] [5.0]│  ← Preset amounts
│  ┌────────────────────┐  │
│  │  Custom: [___] SOL │  │  ← Manual input
│  └────────────────────┘  │
│                          │
│  Platform fee: 5%        │
│  Bạn nhận nếu thắng:    │
│  💰 1.90 SOL             │
│                          │
│  ┌────────────────────┐  │
│  │ 🔐 XÁC NHẬN CƯỢC   │  │  ← Triggers wallet sign
│  └────────────────────┘  │
│                          │
│  ⏳ Đang tìm đối thủ... │  ← Matchmaking spinner
└──────────────────────────┘
```

### 3.7 Fight Screen (In-Game HUD)
```
┌──────────────────────────────────────────┐
│ [🐯 Avatar] ████████░░ HP  ⏱ 75  HP ░░████████ [🦁 Avatar] │
│             ███░░░ ULT          ULT ░░░███             │
│             ● ● ○ Round          Round ○ ● ●           │
│──────────────────────────────────────────│
│                                          │
│  ╔═══════════════════════════════════╗   │
│  ║                                   ║   │
│  ║     [PARALLAX BACKGROUND]         ║   │
│  ║                                   ║   │
│  ║   🐯 ←→ 🦁                       ║   │  ← Game canvas
│  ║   [VFX LAYER]                     ║   │
│  ║                                   ║   │
│  ╚═══════════════════════════════════╝   │
│                                          │
│  [Supply Drop ⚠️ 5s]                     │  ← Warning banner
│                                          │
│  ┌───┐                    [Skill1][Sk2]  │
│  │ ⊕ │  ← Joystick      [Skill3][Sk4]  │  ← 50% opacity
│  │D-P│                    [ATK][BLK][JMP]│
│  └───┘                    [💥 ULTIMATE]  │
└──────────────────────────────────────────┘
```
**HUD Elements:**
- HP Bars: Truyền thống 2D, đối xứng, avatar nhỏ bên cạnh
  - Damage animation: HP giảm nhanh (white) → HP thực tế giảm chậm (red lag)
- Timer: Center top, đếm ngược, flash đỏ khi <10s
- Round dots: ● = won, ○ = not yet
- Ultimate gauge: Dưới HP bar, glow khi đầy
- Controls: **50% opacity** — không che tầm nhìn
- Combo counter: Pop-up "5 HITS! 2400 DMG" — Comic typography
- Notifications: "FIGHT!", "K.O!", "SUPPLY DROP!" — Hand-drawn comic text

### 3.8 Result Screen
```
┌──────────────────────────┐
│                          │
│     🏆 CHIẾN THẮNG! 🏆   │  ← hoặc "THUA CUỘC..."
│                          │
│  ┌──────────────────────┐│
│  │  [Winner Spotlight]  ││  ← Victory animation
│  │  🐯 Tiger            ││
│  │  Victory Pose        ││
│  └──────────────────────┘│
│                          │
│  Stats:                  │
│  Damage Dealt: 4,500     │
│  Max Combo: 12 hits      │
│  Perfect Rounds: 1       │
│                          │
│  💰 +0.95 SOL            │  ← Hoặc -1.0 SOL
│  📋 TX: 4zMM...xKnr     │  ← Tap to view on Solscan
│                          │
│  [🔄 Rematch] [🏠 Lobby] │
└──────────────────────────┘
```

---

## 4. FEEDBACK SYSTEM

### 4.1 Haptic Patterns
```tsx
import * as Haptics from 'expo-haptics';

const HAPTIC_MAP = {
  lightHit:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  mediumHit:    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavyHit:     () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  block:        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  specialSkill: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  ultimate:     () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  ko:           () => {
    // Custom pattern: heavy → pause → heavy → pause → heavy
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
  },
  buttonTap:    () => Haptics.selectionAsync(),
};
```

### 4.2 Sound Design Direction
- **Phong cách:** Game đối kháng 2D cổ điển (Street Fighter, KOF vibe)
- **Hit sounds:** "Bốp" đanh thép, "Chát" sắc gọn — KHÔNG muffled
- **Variety:** 3-4 variants mỗi loại sound → random pick → tránh lặp
- **Spatial:** Stereo panning theo vị trí nhân vật (left/right)
- **Announcer:** Giọng trầm, hùng hồn — "ROUND ONE... FIGHT!"

### 4.3 Visual Feedback
| Event | Visual Effect |
|-------|-------------|
| Light hit | Small spark, 1-frame hitstop |
| Heavy hit | Large impact burst, 3-frame hitstop, slight screen shake |
| Block | Shield flash, knockback sparks |
| Special skill | Character-specific VFX, 2-frame hitstop |
| Ultimate | Full cinematic: slow-mo → zoom → hand-drawn VFX → flash |
| K.O | Screen flash white → slow-mo fall → "K.O!" comic text |
| Supply Drop | Warning icon (9s) → parachute animation → item glow |
| Combo | Escalating hit counter + damage total, increasing text size |

---

## 5. RESPONSIVE DESIGN

### Device Targets
- **Primary:** 16:9 phones (1080x1920, 1440x2560)
- **Secondary:** 19.5:9 tall phones (1080x2340)
- **Tablet:** Scaled up, wider camera view advantage

### Safe Areas
- Respect notch/dynamic island (expo-safe-area)
- Controls positioned within thumb reach (bottom 40% of screen)
- HUD outside notch safe area

### Landscape Lock
- Game ALWAYS in landscape mode during fight
- Lobby/menus in portrait mode
- Smooth transition animation between orientations

---

## 6. COLOR PALETTE

```
Primary:        #FF6B35 (Beast Orange)
Secondary:      #1A1A2E (Dark Navy)
Accent:         #FFD700 (Gold)
HP Bar Player:  #00FF88 → #FF3333 (gradient as HP decreases)
HP Bar Enemy:   #FF4444
Ultimate Gauge: #8B5CF6 (Purple glow)
Background:     #0D0D1A (Deep dark)
Text Primary:   #FFFFFF
Text Secondary: #B0B0C0
Success:        #22C55E (Win)
Danger:         #EF4444 (Lose)
SOL:            #9945FF → #14F195 (Solana gradient)
```
