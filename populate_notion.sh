#!/bin/bash
NOTION_KEY=$(cat ~/.config/notion/api_key)
DB_ID="2fc233f2-81c6-8116-8263-c529ce9282a6"

add_task() {
  local task="$1"
  local phase="$2"
  local priority="$3"
  local category="$4"
  local estimate="$5"
  local week="$6"
  local timeline_start="$7"
  local timeline_end="$8"
  
  # Build category multi_select array
  IFS=',' read -ra CATS <<< "$category"
  local cat_json=""
  for cat in "${CATS[@]}"; do
    if [ -n "$cat_json" ]; then cat_json="$cat_json,"; fi
    cat_json="$cat_json{\"name\":\"$cat\"}"
  done
  
  local timeline_json="null"
  if [ -n "$timeline_start" ]; then
    timeline_json="{\"start\":\"$timeline_start\",\"end\":\"$timeline_end\"}"
  fi

  curl -s -X POST "https://api.notion.com/v1/pages" \
    -H "Authorization: Bearer $NOTION_KEY" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d '{
      "parent": {"database_id": "'"$DB_ID"'"},
      "properties": {
        "Task": {"title": [{"text": {"content": "'"$task"'"}}]},
        "Phase": {"select": {"name": "'"$phase"'"}},
        "Status": {"select": {"name": "Backlog"}},
        "Priority": {"select": {"name": "'"$priority"'"}},
        "Category": {"multi_select": ['"$cat_json"']},
        "Estimate": {"select": {"name": "'"$estimate"'"}},
        "Week": {"rich_text": [{"text": {"content": "'"$week"'"}}]},
        "Timeline": {"date": '"$timeline_json"'}
      }
    }' > /dev/null 2>&1
  
  echo "  ✅ $task"
  sleep 0.4
}

echo "🚀 Phase 0: Setup & Architecture (Tuần 1-2)"
add_task "Khởi tạo Expo project + Solana Mobile template" "Phase 0: Setup" "Critical" "Frontend,DevOps" "S" "Tuần 1" "2026-02-10" "2026-02-14"
add_task "Cấu hình TypeScript strict mode" "Phase 0: Setup" "High" "Frontend" "XS" "Tuần 1" "2026-02-10" "2026-02-11"
add_task "Setup polyfills (expo-crypto, buffer)" "Phase 0: Setup" "Critical" "Frontend" "XS" "Tuần 1" "2026-02-10" "2026-02-11"
add_task "Cài đặt dependencies cốt lõi" "Phase 0: Setup" "Critical" "Frontend" "S" "Tuần 1" "2026-02-11" "2026-02-12"
add_task "Thiết kế kiến trúc folder structure" "Phase 0: Setup" "High" "Frontend" "S" "Tuần 1" "2026-02-12" "2026-02-14"
add_task "Setup Zustand stores (game, wallet, player)" "Phase 0: Setup" "High" "Frontend" "S" "Tuần 2" "2026-02-17" "2026-02-19"
add_task "Setup Expo Router navigation" "Phase 0: Setup" "High" "Frontend" "S" "Tuần 2" "2026-02-17" "2026-02-19"
add_task "CI/CD pipeline setup (EAS Build)" "Phase 0: Setup" "Medium" "DevOps" "M" "Tuần 2" "2026-02-19" "2026-02-21"

echo ""
echo "🎮 Phase 1: Game Engine (Tuần 3-6)"
add_task "Setup game canvas (PixiJS WebGL)" "Phase 1: Game Engine" "Critical" "Game Engine" "M" "Tuần 3" "2026-02-24" "2026-02-28"
add_task "Implement game loop 60fps" "Phase 1: Game Engine" "Critical" "Game Engine" "M" "Tuần 3" "2026-02-24" "2026-02-28"
add_task "Scene management system (Menu → Fight → Result)" "Phase 1: Game Engine" "High" "Game Engine" "M" "Tuần 3" "2026-02-26" "2026-02-28"
add_task "Camera system cho side-scrolling view" "Phase 1: Game Engine" "High" "Game Engine" "S" "Tuần 3" "2026-02-28" "2026-02-28"
add_task "Define character interface & stats (TypeScript)" "Phase 1: Game Engine" "Critical" "Game Engine" "S" "Tuần 3-4" "2026-02-28" "2026-03-05"
add_task "Base Fighter class + state machine" "Phase 1: Game Engine" "Critical" "Game Engine" "L" "Tuần 4" "2026-03-03" "2026-03-07"
add_task "Hitbox / Hurtbox system (AABB collision)" "Phase 1: Game Engine" "Critical" "Game Engine" "L" "Tuần 4" "2026-03-03" "2026-03-07"
add_task "Implement Tiger moveset (Muay Thai)" "Phase 1: Game Engine" "High" "Game Engine" "M" "Tuần 4" "2026-03-05" "2026-03-07"
add_task "Implement Lion moveset (Karate/Boxing)" "Phase 1: Game Engine" "High" "Game Engine" "M" "Tuần 4" "2026-03-07" "2026-03-10"
add_task "Implement Crocodile moveset (Judo)" "Phase 1: Game Engine" "High" "Game Engine" "M" "Tuần 5" "2026-03-10" "2026-03-12"
add_task "Implement Eagle moveset (Wing Chun)" "Phase 1: Game Engine" "High" "Game Engine" "M" "Tuần 5" "2026-03-12" "2026-03-14"
add_task "Gravity, ground & wall collision physics" "Phase 1: Game Engine" "Critical" "Game Engine" "M" "Tuần 4" "2026-03-05" "2026-03-07"
add_task "Frame-data system (startup, active, recovery)" "Phase 1: Game Engine" "High" "Game Engine" "M" "Tuần 4" "2026-03-07" "2026-03-10"
add_task "Knockback & knockdown physics" "Phase 1: Game Engine" "High" "Game Engine" "S" "Tuần 4" "2026-03-07" "2026-03-10"
add_task "Spine 2D runtime integration (spine-ts/spine-pixi)" "Phase 1: Game Engine" "Critical" "Game Engine,Art" "L" "Tuần 5" "2026-03-10" "2026-03-14"
add_task "Animation state machine (idle→walk→attack→hit→block)" "Phase 1: Game Engine" "Critical" "Game Engine" "L" "Tuần 5" "2026-03-10" "2026-03-14"
add_task "Breathing idle animation (Spine mesh deform)" "Phase 1: Game Engine" "High" "Game Engine,Art" "M" "Tuần 5" "2026-03-12" "2026-03-14"
add_task "Hand-drawn VFX system (frame-by-frame spritesheet)" "Phase 1: Game Engine" "High" "Game Engine,Art" "L" "Tuần 5-6" "2026-03-14" "2026-03-21"
add_task "Hit-stop effect & screen shake system" "Phase 1: Game Engine" "High" "Game Engine" "M" "Tuần 6" "2026-03-17" "2026-03-19"
add_task "Ultimate cinematic camera (zoom + slow-mo)" "Phase 1: Game Engine" "High" "Game Engine" "M" "Tuần 6" "2026-03-19" "2026-03-21"
add_task "Parallax scrolling backgrounds (3-4 layers)" "Phase 1: Game Engine" "Medium" "Game Engine" "M" "Tuần 6" "2026-03-17" "2026-03-21"
add_task "Supply Drop system (random spawn, 9s warning)" "Phase 1: Game Engine" "Medium" "Game Engine" "M" "Tuần 6" "2026-03-19" "2026-03-21"

echo ""
echo "🎨 Phase 2: UI/UX (Tuần 7-10)"
add_task "Virtual joystick (D-pad) + gesture recognition" "Phase 2: UI/UX" "Critical" "Frontend,Design" "L" "Tuần 7" "2026-03-24" "2026-03-28"
add_task "Action buttons (Attack, Block, Jump) — 50% opacity" "Phase 2: UI/UX" "Critical" "Frontend,Design" "M" "Tuần 7" "2026-03-24" "2026-03-28"
add_task "Special Skill buttons (4 slots + cooldown)" "Phase 2: UI/UX" "High" "Frontend,Design" "M" "Tuần 7" "2026-03-26" "2026-03-28"
add_task "Ultimate button (gauge-dependent glow)" "Phase 2: UI/UX" "High" "Frontend,Design" "S" "Tuần 7" "2026-03-28" "2026-03-28"
add_task "HP Bar (2D truyền thống + avatar + damage animation)" "Phase 2: UI/UX" "Critical" "Frontend,Design" "M" "Tuần 7-8" "2026-03-28" "2026-04-02"
add_task "Round Timer + Round Score indicator" "Phase 2: UI/UX" "High" "Frontend" "S" "Tuần 8" "2026-03-31" "2026-04-02"
add_task "Combo Counter (Comic-style typography)" "Phase 2: UI/UX" "Medium" "Frontend,Design" "S" "Tuần 8" "2026-04-02" "2026-04-04"
add_task "Supply Drop warning UI (9s countdown + marker)" "Phase 2: UI/UX" "Medium" "Frontend" "S" "Tuần 8" "2026-04-02" "2026-04-04"
add_task "Login Screen (Parallax illustration + Connect Wallet CTA)" "Phase 2: UI/UX" "Critical" "Frontend,Design" "M" "Tuần 8" "2026-03-31" "2026-04-04"
add_task "Lobby Screen (Cards mode select, SOL balance, energy bar)" "Phase 2: UI/UX" "Critical" "Frontend,Design" "L" "Tuần 9" "2026-04-07" "2026-04-11"
add_task "Character Select (Spine breathing + Victory Pose + radar chart)" "Phase 2: UI/UX" "Critical" "Frontend,Design,Art" "L" "Tuần 9" "2026-04-07" "2026-04-11"
add_task "Stage Select Screen (thumbnails + parallax preview)" "Phase 2: UI/UX" "High" "Frontend,Design" "M" "Tuần 9" "2026-04-09" "2026-04-11"
add_task "Wager Screen (preset amounts, fee display, wallet sign)" "Phase 2: UI/UX" "Critical" "Frontend,Blockchain" "M" "Tuần 10" "2026-04-14" "2026-04-16"
add_task "Match Result Screen (stats, SOL won/lost, TX link)" "Phase 2: UI/UX" "High" "Frontend,Design" "M" "Tuần 10" "2026-04-14" "2026-04-18"
add_task "Profile Screen (wallet, win/loss, rank)" "Phase 2: UI/UX" "Medium" "Frontend" "M" "Tuần 10" "2026-04-16" "2026-04-18"
add_task "Haptic Feedback system (expo-haptics)" "Phase 2: UI/UX" "High" "Frontend" "S" "Tuần 9" "2026-04-09" "2026-04-11"
add_task "Comic-style text overlays (FIGHT, K.O, SUPPLY DROP)" "Phase 2: UI/UX" "High" "Frontend,Design" "M" "Tuần 8" "2026-04-02" "2026-04-04"

echo ""
echo "⛓️ Phase 3: Blockchain (Tuần 11-14)"
add_task "MWA Provider setup (Phantom, Solflare)" "Phase 3: Blockchain" "Critical" "Blockchain,Frontend" "M" "Tuần 11" "2026-04-21" "2026-04-25"
add_task "Wallet login (authorize + auth_token + SIWS)" "Phase 3: Blockchain" "Critical" "Blockchain,Frontend" "M" "Tuần 11" "2026-04-21" "2026-04-25"
add_task "SOL balance display realtime" "Phase 3: Blockchain" "High" "Blockchain,Frontend" "S" "Tuần 11" "2026-04-23" "2026-04-25"
add_task "Escrow Smart Contract — create_match" "Phase 3: Blockchain" "Critical" "Blockchain" "L" "Tuần 12" "2026-04-28" "2026-05-02"
add_task "Escrow Smart Contract — join_match" "Phase 3: Blockchain" "Critical" "Blockchain" "M" "Tuần 12" "2026-04-30" "2026-05-02"
add_task "Escrow Smart Contract — resolve_match" "Phase 3: Blockchain" "Critical" "Blockchain" "L" "Tuần 12-13" "2026-05-02" "2026-05-09"
add_task "Escrow Smart Contract — cancel_match + refund" "Phase 3: Blockchain" "High" "Blockchain" "M" "Tuần 13" "2026-05-05" "2026-05-09"
add_task "Wager deposit flow (transact → signAndSend)" "Phase 3: Blockchain" "Critical" "Blockchain,Frontend" "M" "Tuần 13" "2026-05-05" "2026-05-09"
add_task "Claim winnings flow" "Phase 3: Blockchain" "Critical" "Blockchain,Frontend" "M" "Tuần 13" "2026-05-07" "2026-05-09"
add_task "Buy practice turns flow (SOL payment)" "Phase 3: Blockchain" "High" "Blockchain,Frontend" "M" "Tuần 14" "2026-05-12" "2026-05-16"
add_task "Transaction history display" "Phase 3: Blockchain" "Medium" "Frontend,Blockchain" "M" "Tuần 14" "2026-05-12" "2026-05-16"
add_task "Error handling (insufficient funds, rejected TX)" "Phase 3: Blockchain" "High" "Blockchain,Frontend" "M" "Tuần 14" "2026-05-14" "2026-05-16"
add_task "Platform fee system (5-10% configurable)" "Phase 3: Blockchain" "High" "Blockchain" "S" "Tuần 13" "2026-05-07" "2026-05-09"

echo ""
echo "🌐 Phase 4: Multiplayer (Tuần 15-18)"
add_task "Game Server setup (Node.js + Socket.IO)" "Phase 4: Multiplayer" "Critical" "Backend" "L" "Tuần 15" "2026-05-19" "2026-05-23"
add_task "Room management (create, join, spectate)" "Phase 4: Multiplayer" "Critical" "Backend" "L" "Tuần 15" "2026-05-19" "2026-05-23"
add_task "Matchmaking system (ranked, casual)" "Phase 4: Multiplayer" "Critical" "Backend" "L" "Tuần 15" "2026-05-21" "2026-05-23"
add_task "Round management Bo3 logic" "Phase 4: Multiplayer" "High" "Backend,Game Engine" "M" "Tuần 15" "2026-05-23" "2026-05-27"
add_task "Rollback Netcode — deterministic simulation" "Phase 4: Multiplayer" "Critical" "Game Engine,Backend" "XL" "Tuần 16" "2026-05-26" "2026-06-06"
add_task "Rollback Netcode — state snapshot ring buffer" "Phase 4: Multiplayer" "Critical" "Game Engine" "L" "Tuần 16" "2026-05-26" "2026-05-30"
add_task "Rollback Netcode — resimulate + desync recovery" "Phase 4: Multiplayer" "Critical" "Game Engine,Backend" "L" "Tuần 16-17" "2026-05-28" "2026-06-06"
add_task "Lag compensation + input delay buffer" "Phase 4: Multiplayer" "High" "Game Engine,Backend" "L" "Tuần 17" "2026-06-02" "2026-06-06"
add_task "Latency display (ping indicator)" "Phase 4: Multiplayer" "Medium" "Frontend" "S" "Tuần 17" "2026-06-04" "2026-06-06"
add_task "Referee/Spectator mode" "Phase 4: Multiplayer" "Medium" "Backend,Frontend" "M" "Tuần 17" "2026-06-04" "2026-06-06"
add_task "Server-side anti-cheat validation" "Phase 4: Multiplayer" "Critical" "Backend" "L" "Tuần 17-18" "2026-06-04" "2026-06-13"
add_task "Match replay recording" "Phase 4: Multiplayer" "Medium" "Backend" "L" "Tuần 18" "2026-06-09" "2026-06-13"
add_task "Practice Mode AI (3 difficulty levels)" "Phase 4: Multiplayer" "High" "Game Engine" "L" "Tuần 18" "2026-06-09" "2026-06-13"
add_task "Training dummy mode" "Phase 4: Multiplayer" "Medium" "Game Engine" "S" "Tuần 18" "2026-06-11" "2026-06-13"
add_task "Daily free turn tracking (5/day, reset UTC)" "Phase 4: Multiplayer" "High" "Backend" "S" "Tuần 18" "2026-06-11" "2026-06-13"
add_task "Supply drop spawning logic (server-side)" "Phase 4: Multiplayer" "Medium" "Backend,Game Engine" "M" "Tuần 17" "2026-06-04" "2026-06-06"

echo ""
echo "🎨 Phase 5: Art & Audio (Tuần 3-18, parallel)"
add_task "Character design — Tiger (concept + Spine rig)" "Phase 5: Art & Audio" "Critical" "Art" "XL" "Tuần 3-6" "2026-02-24" "2026-03-21"
add_task "Character design — Lion (concept + Spine rig)" "Phase 5: Art & Audio" "Critical" "Art" "XL" "Tuần 5-8" "2026-03-10" "2026-04-04"
add_task "Character design — Crocodile (concept + Spine rig)" "Phase 5: Art & Audio" "Critical" "Art" "XL" "Tuần 7-10" "2026-03-24" "2026-04-18"
add_task "Character design — Eagle (concept + Spine rig)" "Phase 5: Art & Audio" "Critical" "Art" "XL" "Tuần 9-12" "2026-04-07" "2026-05-02"
add_task "Character Splash Art (4 nhân vật)" "Phase 5: Art & Audio" "High" "Art" "L" "Tuần 6-8" "2026-03-17" "2026-04-04"
add_task "Hand-drawn VFX — Tiger (lửa)" "Phase 5: Art & Audio" "High" "Art" "L" "Tuần 7-8" "2026-03-24" "2026-04-04"
add_task "Hand-drawn VFX — Lion (sấm sét)" "Phase 5: Art & Audio" "High" "Art" "L" "Tuần 9-10" "2026-04-07" "2026-04-18"
add_task "Hand-drawn VFX — Crocodile (đất/nước)" "Phase 5: Art & Audio" "High" "Art" "L" "Tuần 11-12" "2026-04-21" "2026-05-02"
add_task "Hand-drawn VFX — Eagle (gió xoáy)" "Phase 5: Art & Audio" "High" "Art" "L" "Tuần 13-14" "2026-05-05" "2026-05-16"
add_task "Stage art — Rừng nhiệt đới (parallax layers)" "Phase 5: Art & Audio" "High" "Art" "L" "Tuần 5-6" "2026-03-10" "2026-03-21"
add_task "Stage art — Đấu trường La Mã" "Phase 5: Art & Audio" "Medium" "Art" "L" "Tuần 7-8" "2026-03-24" "2026-04-04"
add_task "Stage art — Đầm lầy sương mù" "Phase 5: Art & Audio" "Medium" "Art" "L" "Tuần 9-10" "2026-04-07" "2026-04-18"
add_task "Stage art — Vách núi đá" "Phase 5: Art & Audio" "Low" "Art" "L" "Tuần 11-12" "2026-04-21" "2026-05-02"
add_task "UI Art — HP bars, timer, buttons, icons" "Phase 5: Art & Audio" "High" "Art,Design" "L" "Tuần 6-8" "2026-03-17" "2026-04-04"
add_task "UI Art — Character select portraits" "Phase 5: Art & Audio" "High" "Art,Design" "M" "Tuần 8-9" "2026-03-31" "2026-04-11"
add_task "UI Art — Login illustration (beast-men battle)" "Phase 5: Art & Audio" "Medium" "Art,Design" "M" "Tuần 7-8" "2026-03-24" "2026-04-04"
add_task "BGM — Menu track" "Phase 5: Art & Audio" "Medium" "Audio" "M" "Tuần 8-10" "2026-03-31" "2026-04-18"
add_task "BGM — Battle tracks (4-5 stages)" "Phase 5: Art & Audio" "Medium" "Audio" "L" "Tuần 10-14" "2026-04-14" "2026-05-16"
add_task "SFX — Hit sounds (light, heavy, block, counter)" "Phase 5: Art & Audio" "High" "Audio" "M" "Tuần 8-10" "2026-03-31" "2026-04-18"
add_task "SFX — Special move & Ultimate sounds" "Phase 5: Art & Audio" "High" "Audio" "M" "Tuần 10-12" "2026-04-14" "2026-05-02"
add_task "Voice — Character grunts, victory quotes" "Phase 5: Art & Audio" "Medium" "Audio" "L" "Tuần 12-14" "2026-04-28" "2026-05-16"
add_task "Voice — Announcer (FIGHT, K.O, ROUND, PERFECT)" "Phase 5: Art & Audio" "High" "Audio" "M" "Tuần 10-12" "2026-04-14" "2026-05-02"

echo ""
echo "🧪 Phase 6: Testing (Tuần 19-21)"
add_task "Performance optimization — 60fps target" "Phase 6: Testing" "Critical" "Game Engine,Frontend" "L" "Tuần 19" "2026-06-16" "2026-06-20"
add_task "Memory profiling (< 300MB RAM)" "Phase 6: Testing" "High" "Game Engine" "M" "Tuần 19" "2026-06-16" "2026-06-20"
add_task "Asset lazy loading & texture atlas optimization" "Phase 6: Testing" "High" "Game Engine" "M" "Tuần 19" "2026-06-18" "2026-06-20"
add_task "Network bandwidth optimization (< 5KB/s)" "Phase 6: Testing" "High" "Backend" "M" "Tuần 19" "2026-06-18" "2026-06-20"
add_task "Unit tests — game logic, damage, collision" "Phase 6: Testing" "High" "Game Engine" "L" "Tuần 19-20" "2026-06-16" "2026-06-27"
add_task "Integration tests — wallet connect, TX flow" "Phase 6: Testing" "High" "Blockchain,Frontend" "L" "Tuần 20" "2026-06-23" "2026-06-27"
add_task "Load testing — server 100+ concurrent matches" "Phase 6: Testing" "High" "Backend" "L" "Tuần 20" "2026-06-23" "2026-06-27"
add_task "Device testing — Android 10+, iOS 15+" "Phase 6: Testing" "Critical" "Frontend" "L" "Tuần 20-21" "2026-06-23" "2026-07-04"
add_task "Solana Devnet → Mainnet migration testing" "Phase 6: Testing" "Critical" "Blockchain" "M" "Tuần 21" "2026-06-30" "2026-07-04"
add_task "Balance testing — all 16 matchups" "Phase 6: Testing" "High" "Game Engine" "L" "Tuần 20-21" "2026-06-23" "2026-07-04"
add_task "Wager flow UX testing" "Phase 6: Testing" "High" "Blockchain,Frontend" "M" "Tuần 21" "2026-06-30" "2026-07-04"

echo ""
echo "🚀 Phase 7: Launch (Tuần 22-23)"
add_task "Smart contract security audit" "Phase 7: Launch" "Critical" "Blockchain" "XL" "Tuần 22" "2026-07-07" "2026-07-11"
add_task "Build release APK (signed)" "Phase 7: Launch" "Critical" "DevOps" "S" "Tuần 22" "2026-07-07" "2026-07-09"
add_task "Submit lên Solana dApp Store" "Phase 7: Launch" "Critical" "DevOps" "M" "Tuần 22" "2026-07-09" "2026-07-11"
add_task "Deploy game server (AWS/Railway)" "Phase 7: Launch" "Critical" "DevOps,Backend" "M" "Tuần 22" "2026-07-07" "2026-07-11"
add_task "Deploy Anchor program → Mainnet-beta" "Phase 7: Launch" "Critical" "Blockchain,DevOps" "S" "Tuần 22" "2026-07-09" "2026-07-11"
add_task "Monitoring & logging setup" "Phase 7: Launch" "High" "DevOps" "M" "Tuần 22" "2026-07-09" "2026-07-11"
add_task "Terms of Service & Privacy Policy" "Phase 7: Launch" "High" "Design" "S" "Tuần 22" "2026-07-07" "2026-07-09"
add_task "Publisher Portal KYC/KYB" "Phase 7: Launch" "Critical" "DevOps" "M" "Tuần 22" "2026-07-07" "2026-07-09"
add_task "Community Discord/Telegram setup" "Phase 7: Launch" "Medium" "Design" "S" "Tuần 23" "2026-07-14" "2026-07-16"
add_task "Marketing materials & launch announcement" "Phase 7: Launch" "Medium" "Design" "M" "Tuần 23" "2026-07-14" "2026-07-18"

echo ""
echo "✅ Hoàn tất! Đã tạo tất cả tasks trên Notion Roadmap."
