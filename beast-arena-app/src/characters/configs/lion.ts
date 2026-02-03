import { CharacterConfig } from '../types';

export const lionConfig: CharacterConfig = {
  id: 'lion',
  name: 'Lion',
  title: 'Karate Lion',
  martialArt: 'Karate',
  stats: { hp: 28, atk: 24, spd: 20, def: 22, special: 6 },
  moveset: {
    normalAttack: [
      { id: 'lion_jab', name: 'Straight Punch', damage: 35, startup: 4, active: 3, recovery: 7, cooldown: 0, type: 'strike', animationKey: 'attack_jab' },
      { id: 'lion_uppercut', name: 'Uppercut', damage: 50, startup: 6, active: 4, recovery: 10, cooldown: 0, type: 'strike', animationKey: 'attack_uppercut' },
      { id: 'lion_body_blow', name: 'Body Blow', damage: 60, startup: 7, active: 5, recovery: 11, cooldown: 0, type: 'strike', effect: 'stun', animationKey: 'attack_body' },
    ],
    specialSkill1: { id: 'lion_roar', name: 'Tiếng Gầm Sư Tử', damage: 80, startup: 12, active: 6, recovery: 16, cooldown: 5000, type: 'projectile', effect: 'stun', animationKey: 'special_roar' },
    specialSkill2: { id: 'lion_power_punch', name: 'Quyền Vương', damage: 140, startup: 14, active: 5, recovery: 20, cooldown: 6000, type: 'strike', effect: 'knockdown', animationKey: 'special_power_punch' },
    specialSkill3: { id: 'lion_counter', name: 'Phản Đòn', damage: 110, startup: 2, active: 8, recovery: 15, cooldown: 4000, type: 'strike', effect: 'knockback', animationKey: 'special_counter' },
    specialSkill4: { id: 'lion_guard', name: 'Giáp Sư Tử', damage: 0, startup: 5, active: 60, recovery: 10, cooldown: 8000, type: 'buff', animationKey: 'special_guard' },
    ultimate: { id: 'lion_thunder', name: 'Sấm Sét Vương Giả', damage: 380, startup: 22, active: 12, recovery: 28, cooldown: 0, type: 'strike', effect: 'knockdown', animationKey: 'ultimate_thunder' },
  },
  unlockCondition: { type: 'free' },
};
