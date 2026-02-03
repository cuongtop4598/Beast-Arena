/**
 * Phase 6 — Unit tests for Character Registry
 * Tests character registration, lookup, stats validation
 */

import { registry } from '../characters/registry';
import type { CharacterConfig, CharacterStats } from '../characters/types';

describe('Character Registry', () => {
  // ============================================================
  // All 4 characters registered
  // ============================================================
  test('has exactly 4 characters registered', () => {
    expect(registry.count).toBe(4);
  });

  test('getAll returns 4 characters', () => {
    const all = registry.getAll();
    expect(all).toHaveLength(4);
  });

  test('all expected characters are registered', () => {
    const ids = registry.getAll().map((c) => c.id).sort();
    expect(ids).toEqual(['crocodile', 'eagle', 'lion', 'tiger']);
  });

  // ============================================================
  // Get by ID
  // ============================================================
  test('get tiger by id', () => {
    const tiger = registry.get('tiger');
    expect(tiger).toBeDefined();
    expect(tiger!.id).toBe('tiger');
    expect(tiger!.name).toBe('Tiger');
  });

  test('get lion by id', () => {
    const lion = registry.get('lion');
    expect(lion).toBeDefined();
    expect(lion!.id).toBe('lion');
  });

  test('get crocodile by id', () => {
    const croc = registry.get('crocodile');
    expect(croc).toBeDefined();
    expect(croc!.id).toBe('crocodile');
  });

  test('get eagle by id', () => {
    const eagle = registry.get('eagle');
    expect(eagle).toBeDefined();
    expect(eagle!.id).toBe('eagle');
  });

  test('get nonexistent character returns undefined', () => {
    const dragon = registry.get('dragon');
    expect(dragon).toBeUndefined();
  });

  test('has() returns true for registered characters', () => {
    expect(registry.has('tiger')).toBe(true);
    expect(registry.has('lion')).toBe(true);
    expect(registry.has('crocodile')).toBe(true);
    expect(registry.has('eagle')).toBe(true);
  });

  test('has() returns false for unregistered characters', () => {
    expect(registry.has('dragon')).toBe(false);
    expect(registry.has('')).toBe(false);
  });

  // ============================================================
  // getAvailable
  // ============================================================
  test('getAvailable returns characters without unlock conditions or free ones', () => {
    const available = registry.getAvailable();
    expect(available.length).toBeGreaterThan(0);

    // All available characters should either have no unlockCondition or type === 'free'
    for (const char of available) {
      if (char.unlockCondition) {
        expect(char.unlockCondition.type).toBe('free');
      }
    }
  });

  test('getAvailable is a subset of getAll', () => {
    const all = registry.getAll();
    const available = registry.getAvailable();
    const allIds = new Set(all.map((c) => c.id));

    for (const char of available) {
      expect(allIds.has(char.id)).toBe(true);
    }
  });

  // ============================================================
  // Stats validation
  // ============================================================
  describe('character stats are valid numbers', () => {
    const allChars = registry.getAll();

    test.each(allChars.map((c) => [c.id, c] as [string, CharacterConfig]))(
      '%s has valid stats',
      (id, char) => {
        const stats = char.stats;

        // All stats should be positive numbers
        expect(stats.hp).toBeGreaterThan(0);
        expect(stats.atk).toBeGreaterThan(0);
        expect(stats.spd).toBeGreaterThan(0);
        expect(stats.def).toBeGreaterThan(0);
        expect(stats.special).toBeGreaterThan(0);

        // All stats should be finite
        expect(Number.isFinite(stats.hp)).toBe(true);
        expect(Number.isFinite(stats.atk)).toBe(true);
        expect(Number.isFinite(stats.spd)).toBe(true);
        expect(Number.isFinite(stats.def)).toBe(true);
        expect(Number.isFinite(stats.special)).toBe(true);

        // All stats should be integers
        expect(Number.isInteger(stats.hp)).toBe(true);
        expect(Number.isInteger(stats.atk)).toBe(true);
        expect(Number.isInteger(stats.spd)).toBe(true);
        expect(Number.isInteger(stats.def)).toBe(true);
        expect(Number.isInteger(stats.special)).toBe(true);

        // Stats sum should be roughly 100 (balanced)
        const sum = stats.hp + stats.atk + stats.spd + stats.def + stats.special;
        expect(sum).toBeGreaterThanOrEqual(90);
        expect(sum).toBeLessThanOrEqual(110);
      }
    );
  });

  // ============================================================
  // Character metadata validation
  // ============================================================
  describe('character metadata', () => {
    const allChars = registry.getAll();

    test.each(allChars.map((c) => [c.id, c] as [string, CharacterConfig]))(
      '%s has required metadata',
      (id, char) => {
        expect(char.name).toBeTruthy();
        expect(char.title).toBeTruthy();
        expect(char.martialArt).toBeTruthy();
      }
    );

    test.each(allChars.map((c) => [c.id, c] as [string, CharacterConfig]))(
      '%s has valid moveset',
      (id, char) => {
        const moveset = char.moveset;

        // Normal attack chain should have at least 1 move
        expect(moveset.normalAttack.length).toBeGreaterThan(0);

        // All skills should have valid damage, startup, active, recovery
        const allSkills = [
          ...moveset.normalAttack,
          moveset.specialSkill1,
          moveset.specialSkill2,
          moveset.specialSkill3,
          moveset.specialSkill4,
          moveset.ultimate,
        ];

        for (const skill of allSkills) {
          expect(skill.id).toBeTruthy();
          expect(skill.name).toBeTruthy();
          expect(skill.damage).toBeGreaterThanOrEqual(0);
          expect(skill.startup).toBeGreaterThanOrEqual(0);
          expect(skill.active).toBeGreaterThan(0);
          expect(skill.recovery).toBeGreaterThanOrEqual(0);
          expect(skill.animationKey).toBeTruthy();
        }

        // Ultimate should have the highest damage
        const ultDamage = moveset.ultimate.damage;
        for (const normal of moveset.normalAttack) {
          expect(ultDamage).toBeGreaterThan(normal.damage);
        }
      }
    );
  });
});
