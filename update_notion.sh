#!/bin/bash
NOTION_KEY=$(cat ~/.config/notion/api_key)
DB_ID="2fc233f2-81c6-8116-8263-c529ce9282a6"

# Query all Phase 3: Blockchain tasks and archive them
echo "🗑️ Archiving old Phase 3 (Blockchain) tasks..."
BLOCKCHAIN_TASKS=$(curl -s -X POST "https://api.notion.com/v1/databases/$DB_ID/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"property": "Phase", "select": {"equals": "Phase 3: Blockchain"}},
    "page_size": 100
  }')

echo "$BLOCKCHAIN_TASKS" | node -e "
const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const ids = (d.results||[]).map(r => r.id);
console.log(JSON.stringify(ids));
" > /tmp/blockchain_ids.json

# Archive each blockchain task
for id in $(cat /tmp/blockchain_ids.json | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).forEach(i=>console.log(i))"); do
  curl -s -X PATCH "https://api.notion.com/v1/pages/$id" \
    -H "Authorization: Bearer $NOTION_KEY" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d '{"archived": true}' > /dev/null
  echo "  archived $id"
  sleep 0.3
done

# Also archive old Phase 4 Multiplayer tasks (will recreate with Go)
echo "🗑️ Archiving old Phase 4 (Multiplayer) tasks..."
MP_TASKS=$(curl -s -X POST "https://api.notion.com/v1/databases/$DB_ID/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"property": "Phase", "select": {"equals": "Phase 4: Multiplayer"}},
    "page_size": 100
  }')

for id in $(echo "$MP_TASKS" | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).results.forEach(r=>console.log(r.id))"); do
  curl -s -X PATCH "https://api.notion.com/v1/pages/$id" \
    -H "Authorization: Bearer $NOTION_KEY" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d '{"archived": true}' > /dev/null
  echo "  archived $id"
  sleep 0.3
done

# Also archive Phase 7 Launch tasks (will recreate as MVP launch)
echo "🗑️ Archiving old Phase 7 (Launch) tasks..."
LAUNCH_TASKS=$(curl -s -X POST "https://api.notion.com/v1/databases/$DB_ID/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"property": "Phase", "select": {"equals": "Phase 7: Launch"}},
    "page_size": 100
  }')

for id in $(echo "$LAUNCH_TASKS" | node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).results.forEach(r=>console.log(r.id))"); do
  curl -s -X PATCH "https://api.notion.com/v1/pages/$id" \
    -H "Authorization: Bearer $NOTION_KEY" \
    -H "Notion-Version: 2022-06-28" \
    -H "Content-Type: application/json" \
    -d '{"archived": true}' > /dev/null
  echo "  archived $id"
  sleep 0.3
done

echo ""
echo "Now updating database with new phase options..."
# Add new phase options to database
curl -s -X PATCH "https://api.notion.com/v1/databases/$DB_ID" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "Phase": {
        "select": {
          "options": [
            {"name": "Phase 0: Setup", "color": "gray"},
            {"name": "Phase 1: Game Engine", "color": "blue"},
            {"name": "Phase 2: UI/UX", "color": "purple"},
            {"name": "Phase 3: Go Backend", "color": "orange"},
            {"name": "Phase 4: Multiplayer (Go)", "color": "red"},
            {"name": "Phase 5: Art & Audio", "color": "pink"},
            {"name": "Phase 6: Testing", "color": "yellow"},
            {"name": "Phase 7: MVP Launch", "color": "green"},
            {"name": "Phase 8: Solana (POST-MVP)", "color": "brown"}
          ]
        }
      }
    }
  }' > /dev/null

add_task() {
  local task="$1" phase="$2" priority="$3" category="$4" estimate="$5" week="$6" ts="$7" te="$8"
  IFS=',' read -ra CATS <<< "$category"
  local cat_json=""
  for cat in "${CATS[@]}"; do
    [ -n "$cat_json" ] && cat_json="$cat_json,"
    cat_json="$cat_json{\"name\":\"$cat\"}"
  done
  local tl="null"
  [ -n "$ts" ] && tl="{\"start\":\"$ts\",\"end\":\"$te\"}"

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
        "Timeline": {"date": '"$tl"'}
      }
    }' > /dev/null 2>&1
  echo "  ✅ $task"
  sleep 0.4
}

echo ""
echo "🏗️ Phase 3: Go Backend (Tuần 10-13)"
add_task "Init Go module + project structure" "Phase 3: Go Backend" "Critical" "Backend" "S" "Tuần 10" "2026-04-14" "2026-04-16"
add_task "Setup Gin HTTP server + gorilla/websocket" "Phase 3: Go Backend" "Critical" "Backend" "M" "Tuần 10" "2026-04-14" "2026-04-18"
add_task "PostgreSQL schema design + migrations" "Phase 3: Go Backend" "Critical" "Backend" "M" "Tuần 10" "2026-04-16" "2026-04-18"
add_task "Redis setup (matchmaking queue + sessions)" "Phase 3: Go Backend" "High" "Backend" "S" "Tuần 10" "2026-04-16" "2026-04-18"
add_task "Docker Compose (Go server + Postgres + Redis)" "Phase 3: Go Backend" "High" "Backend,DevOps" "S" "Tuần 10" "2026-04-18" "2026-04-18"
add_task "Guest login system (JWT)" "Phase 3: Go Backend" "Critical" "Backend" "M" "Tuần 11" "2026-04-21" "2026-04-25"
add_task "Player profile CRUD API" "Phase 3: Go Backend" "High" "Backend" "M" "Tuần 11" "2026-04-21" "2026-04-25"
add_task "REST API: matchmaking endpoints" "Phase 3: Go Backend" "Critical" "Backend" "M" "Tuần 11" "2026-04-23" "2026-04-25"
add_task "REST API: practice mode endpoints" "Phase 3: Go Backend" "High" "Backend" "S" "Tuần 11" "2026-04-25" "2026-04-25"
add_task "Leaderboard API (ranked by ELO)" "Phase 3: Go Backend" "Medium" "Backend" "S" "Tuần 12" "2026-04-28" "2026-04-30"
add_task "Game state struct (server-side mirror)" "Phase 3: Go Backend" "Critical" "Backend,Game Engine" "L" "Tuần 12" "2026-04-28" "2026-05-02"
add_task "Server-authoritative damage calculation" "Phase 3: Go Backend" "Critical" "Backend,Game Engine" "L" "Tuần 12-13" "2026-04-30" "2026-05-09"
add_task "Round management Bo3 logic (Go)" "Phase 3: Go Backend" "High" "Backend,Game Engine" "M" "Tuần 13" "2026-05-05" "2026-05-09"
add_task "Supply drop spawn scheduler (Go)" "Phase 3: Go Backend" "Medium" "Backend,Game Engine" "S" "Tuần 13" "2026-05-07" "2026-05-09"
add_task "Match result persistence + ELO calculation" "Phase 3: Go Backend" "High" "Backend" "M" "Tuần 13" "2026-05-07" "2026-05-09"
add_task "Daily free practice turn tracking (Redis TTL)" "Phase 3: Go Backend" "High" "Backend" "S" "Tuần 13" "2026-05-09" "2026-05-09"

echo ""
echo "🌐 Phase 4: Multiplayer — Go (Tuần 14-17)"
add_task "WebSocket connection handler (gorilla/websocket)" "Phase 4: Multiplayer (Go)" "Critical" "Backend" "M" "Tuần 14" "2026-05-12" "2026-05-16"
add_task "Room Manager — goroutine per match" "Phase 4: Multiplayer (Go)" "Critical" "Backend" "L" "Tuần 14" "2026-05-12" "2026-05-16"
add_task "Matchmaking engine — Redis queue + ELO matching" "Phase 4: Multiplayer (Go)" "Critical" "Backend" "L" "Tuần 14" "2026-05-14" "2026-05-16"
add_task "Game loop goroutine (60fps tick + broadcast)" "Phase 4: Multiplayer (Go)" "Critical" "Backend,Game Engine" "L" "Tuần 14-15" "2026-05-14" "2026-05-23"
add_task "Rollback Netcode — deterministic simulation (Go)" "Phase 4: Multiplayer (Go)" "Critical" "Backend,Game Engine" "XL" "Tuần 15-16" "2026-05-19" "2026-05-30"
add_task "Rollback Netcode — state snapshot ring buffer" "Phase 4: Multiplayer (Go)" "Critical" "Game Engine" "L" "Tuần 15" "2026-05-19" "2026-05-23"
add_task "Rollback Netcode — resimulate + desync recovery" "Phase 4: Multiplayer (Go)" "Critical" "Backend,Game Engine" "L" "Tuần 16" "2026-05-26" "2026-05-30"
add_task "Lag compensation + input delay buffer" "Phase 4: Multiplayer (Go)" "High" "Backend,Game Engine" "L" "Tuần 16" "2026-05-26" "2026-05-30"
add_task "Latency display (ping indicator)" "Phase 4: Multiplayer (Go)" "Medium" "Frontend" "S" "Tuần 16" "2026-05-28" "2026-05-30"
add_task "Referee/Spectator mode (read-only WebSocket)" "Phase 4: Multiplayer (Go)" "Medium" "Backend,Frontend" "M" "Tuần 16" "2026-05-28" "2026-05-30"
add_task "Server-side anti-cheat (input validation)" "Phase 4: Multiplayer (Go)" "Critical" "Backend" "L" "Tuần 17" "2026-06-02" "2026-06-06"
add_task "Match replay recording (JSONB)" "Phase 4: Multiplayer (Go)" "Medium" "Backend" "M" "Tuần 17" "2026-06-02" "2026-06-06"
add_task "Practice Mode AI — Go goroutine" "Phase 4: Multiplayer (Go)" "High" "Backend,Game Engine" "L" "Tuần 17" "2026-06-04" "2026-06-06"
add_task "Training dummy mode" "Phase 4: Multiplayer (Go)" "Medium" "Game Engine" "S" "Tuần 17" "2026-06-06" "2026-06-06"

echo ""
echo "🚀 Phase 7: MVP Launch (Tuần 21-22)"
add_task "Deploy Golang server (Fly.io / Railway)" "Phase 7: MVP Launch" "Critical" "DevOps,Backend" "M" "Tuần 21" "2026-06-30" "2026-07-04"
add_task "Deploy PostgreSQL + Redis (managed)" "Phase 7: MVP Launch" "Critical" "DevOps" "S" "Tuần 21" "2026-06-30" "2026-07-02"
add_task "Build release APK (signed)" "Phase 7: MVP Launch" "Critical" "DevOps" "S" "Tuần 21" "2026-07-02" "2026-07-04"
add_task "Submit Google Play Store" "Phase 7: MVP Launch" "Critical" "DevOps" "M" "Tuần 22" "2026-07-07" "2026-07-11"
add_task "TestFlight iOS build" "Phase 7: MVP Launch" "High" "DevOps" "M" "Tuần 22" "2026-07-07" "2026-07-11"
add_task "Monitoring setup (Prometheus + Grafana)" "Phase 7: MVP Launch" "High" "DevOps" "M" "Tuần 21" "2026-07-02" "2026-07-04"
add_task "Security review (API + WebSocket)" "Phase 7: MVP Launch" "Critical" "Backend" "L" "Tuần 21" "2026-06-30" "2026-07-04"
add_task "Terms of Service & Privacy Policy" "Phase 7: MVP Launch" "High" "Design" "S" "Tuần 21" "2026-06-30" "2026-07-02"
add_task "Community Discord/Telegram setup" "Phase 7: MVP Launch" "Medium" "Design" "S" "Tuần 22" "2026-07-07" "2026-07-09"
add_task "Beta testing (50-100 players)" "Phase 7: MVP Launch" "Critical" "Frontend,Backend" "L" "Tuần 22" "2026-07-07" "2026-07-11"

echo ""
echo "🔗 Phase 8: Solana Integration — POST-MVP (Tuần 23-28)"
add_task "Thêm Solana dependencies (web3.js, MWA)" "Phase 8: Solana (POST-MVP)" "Critical" "Blockchain,Frontend" "M" "Tuần 23" "" ""
add_task "MWA Provider setup (Phantom, Solflare)" "Phase 8: Solana (POST-MVP)" "Critical" "Blockchain,Frontend" "M" "Tuần 23" "" ""
add_task "Wallet login + SIWS authentication" "Phase 8: Solana (POST-MVP)" "Critical" "Blockchain,Frontend" "M" "Tuần 23-24" "" ""
add_task "Link wallet to existing guest account" "Phase 8: Solana (POST-MVP)" "High" "Blockchain,Backend" "M" "Tuần 24" "" ""
add_task "SOL balance display realtime" "Phase 8: Solana (POST-MVP)" "High" "Blockchain,Frontend" "S" "Tuần 24" "" ""
add_task "Escrow Smart Contract (Anchor/Rust)" "Phase 8: Solana (POST-MVP)" "Critical" "Blockchain" "XL" "Tuần 24-26" "" ""
add_task "Wager deposit + claim flow" "Phase 8: Solana (POST-MVP)" "Critical" "Blockchain,Frontend" "L" "Tuần 26-27" "" ""
add_task "Buy practice turns bằng SOL" "Phase 8: Solana (POST-MVP)" "High" "Blockchain,Frontend" "M" "Tuần 27" "" ""
add_task "Smart contract security audit" "Phase 8: Solana (POST-MVP)" "Critical" "Blockchain" "XL" "Tuần 27" "" ""
add_task "Publisher Portal KYC/KYB + dApp Store submit" "Phase 8: Solana (POST-MVP)" "Critical" "DevOps" "M" "Tuần 28" "" ""
add_task "Deploy Anchor program → Mainnet-beta" "Phase 8: Solana (POST-MVP)" "Critical" "Blockchain,DevOps" "M" "Tuần 28" "" ""

echo ""
echo "✅ Notion Roadmap đã cập nhật xong!"
echo "   - Archived: old Phase 3 (Blockchain), Phase 4 (Node.js), Phase 7"
echo "   - Added: Phase 3 (Go Backend), Phase 4 (Go Multiplayer), Phase 7 (MVP), Phase 8 (Solana POST-MVP)"
