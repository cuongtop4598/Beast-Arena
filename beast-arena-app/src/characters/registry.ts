import { CharacterConfig } from './types';

/**
 * CharacterRegistry — data-driven, expandable character system.
 * Add new characters by adding config files to configs/ and importing here.
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

// Register all characters (no circular imports — configs export data, we import it)
import { tigerConfig } from './configs/tiger';
import { lionConfig } from './configs/lion';
import { crocodileConfig } from './configs/crocodile';
import { eagleConfig } from './configs/eagle';

registry.register(tigerConfig);
registry.register(lionConfig);
registry.register(crocodileConfig);
registry.register(eagleConfig);
