import { CharacterConfig } from '../types';

export const crocodileConfig: CharacterConfig = {
  id: 'crocodile',
  name: 'Crocodile',
  title: 'Judo Crocodile',
  martialArt: 'Judo',
  stats: { hp: 30, atk: 22, spd: 14, def: 28, special: 6 },
  moveset: {
    normalAttack: [
      { id: 'croc_slap', name: 'Tail Slap', damage: 40, startup: 5, active: 5, recovery: 8, cooldown: 0, type: 'strike', animationKey: 'attack_slap' },
      { id: 'croc_bite', name: 'Jaw Snap', damage: 55, startup: 7, active: 4, recovery: 10, cooldown: 0, type: 'strike', animationKey: 'attack_bite' },
      { id: 'croc_slam', name: 'Ground Slam', damage: 65, startup: 9, active: 6, recovery: 14, cooldown: 0, type: 'strike', effect: 'knockdown', animationKey: 'attack_slam' },
    ],
    specialSkill1: { id: 'croc_tail_sweep', name: 'Đuôi Cá Sấu', damage: 90, startup: 8, active: 10, recovery: 16, cooldown: 4000, type: 'strike', effect: 'knockdown', animationKey: 'special_tail' },
    specialSkill2: { id: 'croc_grab', name: 'Khóa Hàm', damage: 130, startup: 10, active: 8, recovery: 18, cooldown: 5000, type: 'grab', effect: 'stun', animationKey: 'special_grab' },
    specialSkill3: { id: 'croc_roll', name: 'Death Roll', damage: 160, startup: 14, active: 12, recovery: 22, cooldown: 7000, type: 'grab', effect: 'knockdown', animationKey: 'special_roll' },
    specialSkill4: { id: 'croc_armor', name: 'Vảy Thép', damage: 0, startup: 6, active: 90, recovery: 12, cooldown: 10000, type: 'buff', animationKey: 'special_armor' },
    ultimate: { id: 'croc_abyss', name: 'Vực Sâu Đầm Lầy', damage: 400, startup: 25, active: 18, recovery: 30, cooldown: 0, type: 'grab', effect: 'knockdown', animationKey: 'ultimate_abyss' },
  },
  unlockCondition: { type: 'free' },
};
