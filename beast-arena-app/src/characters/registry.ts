import { CharacterConfig } from './types';

/**
 * CharacterRegistry — data-driven, expandable character system.
 * Add new characters by calling registry.register() with a config.
 * No engine code changes needed.
 */
class CharacterRegistry {
  private characters: Map<string, CharacterConfig> = new Map();

  register(config: CharacterConfig): void {
    this.characters.set(config.id, config);
  }

  get(id: string): CharacterConfig | undefined {
    return this.characters.get(id);
  }

  getAll(): CharacterConfig[] {
    return Array.from(this.characters.values());
  }

  getAvailable(): CharacterConfig[] {
    // TODO: filter by unlock condition based on player data
    return this.getAll().filter(
      (c) => !c.unlockCondition || c.unlockCondition.type === 'free'
    );
  }

  has(id: string): boolean {
    return this.characters.has(id);
  }

  get count(): number {
    return this.characters.size;
  }
}

export const registry = new CharacterRegistry();

// Auto-import all character configs
// Each config file calls registry.register()
import './configs/tiger';
import './configs/lion';
import './configs/crocodile';
import './configs/eagle';
