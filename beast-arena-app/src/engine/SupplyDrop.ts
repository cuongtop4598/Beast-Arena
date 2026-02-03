import { SupplyDrop, SupplyDropItem, FighterState, GAME_CONFIG, Buff } from './types';

const SUPPLY_ITEMS: SupplyDropItem[] = [
  { id: 'iron_gloves', type: 'weapon', name: 'Găng Tay Sắt', value: 0.3, duration: 600 },
  { id: 'nunchaku', type: 'weapon', name: 'Côn Nhị Khúc', value: 0.5, duration: 300 },
  { id: 'grilled_meat', type: 'heal', name: 'Thịt Nướng', value: 200, duration: 0 },
  { id: 'energy_drink', type: 'speed', name: 'Thuốc Tăng Lực', value: 3, duration: 480 },
  { id: 'shoulder_armor', type: 'weapon', name: 'Giáp Vai', value: 0.2, duration: 900 },
];

const SPAWN_INTERVAL_MIN = 20 * 60; // 20s in frames
const SPAWN_INTERVAL_MAX = 30 * 60; // 30s in frames
const WARNING_FRAMES = 9 * 60;      // 9 seconds warning

let dropIdCounter = 0;

export function createSupplyDropManager() {
  let nextSpawnFrame = randomBetween(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
  const drops: SupplyDrop[] = [];

  function update(currentFrame: number): SupplyDrop | null {
    let newDrop: SupplyDrop | null = null;

    // Check if it's time to spawn a new drop
    if (currentFrame >= nextSpawnFrame - WARNING_FRAMES && !drops.some((d) => !d.active && !d.claimed)) {
      // Schedule warning
      const item = SUPPLY_ITEMS[Math.floor(Math.random() * SUPPLY_ITEMS.length)];
      const drop: SupplyDrop = {
        id: `drop_${++dropIdCounter}`,
        item: { ...item },
        position: {
          x: randomBetween(150, GAME_CONFIG.stageWidth - 150),
          y: GAME_CONFIG.groundY,
        },
        spawnFrame: nextSpawnFrame,
        warningFrame: nextSpawnFrame - WARNING_FRAMES,
        active: false,
        claimed: false,
      };
      drops.push(drop);
      newDrop = drop;
    }

    // Activate drops that have reached spawn frame
    for (const drop of drops) {
      if (!drop.active && !drop.claimed && currentFrame >= drop.spawnFrame) {
        drop.active = true;
      }
    }

    // Schedule next spawn
    if (currentFrame >= nextSpawnFrame) {
      nextSpawnFrame = currentFrame + randomBetween(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
    }

    return newDrop;
  }

  function checkPickup(fighter: FighterState): SupplyDropItem | null {
    for (const drop of drops) {
      if (!drop.active || drop.claimed) continue;
      const dist = Math.abs(fighter.position.x - drop.position.x);
      if (dist < 50 && Math.abs(fighter.position.y - drop.position.y) < 60) {
        drop.claimed = true;
        drop.active = false;
        return drop.item;
      }
    }
    return null;
  }

  function getActiveDrops(): SupplyDrop[] {
    return drops.filter((d) => !d.claimed);
  }

  function reset(): void {
    drops.length = 0;
    nextSpawnFrame = randomBetween(SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX);
  }

  return { update, checkPickup, getActiveDrops, reset };
}

/** Apply a supply drop item to a fighter */
export function applySupplyItem(fighter: FighterState, item: SupplyDropItem): void {
  switch (item.type) {
    case 'heal':
      fighter.hp = Math.min(fighter.maxHp, fighter.hp + item.value);
      break;
    case 'weapon':
      fighter.activeBuffs.push({
        id: item.id,
        type: 'damage',
        value: item.value,
        remainingFrames: item.duration,
      });
      break;
    case 'speed':
      fighter.activeBuffs.push({
        id: item.id,
        type: 'speed',
        value: item.value,
        remainingFrames: item.duration,
      });
      break;
  }
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
