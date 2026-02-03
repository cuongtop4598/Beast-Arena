import { registry } from '../registry';

registry.register({
  id: 'eagle',
  name: 'Eagle',
  title: 'Wing Chun Eagle',
  martialArt: 'Wing Chun',
  stats: { hp: 18, atk: 20, spd: 32, def: 12, special: 18 },
  moveset: {
    normalAttack: [
      { id: 'eagle_palm', name: 'Chain Palm', damage: 25, startup: 2, active: 2, recovery: 4, cooldown: 0, type: 'strike', animationKey: 'attack_palm' },
      { id: 'eagle_finger', name: 'Crane Finger', damage: 30, startup: 3, active: 2, recovery: 5, cooldown: 0, type: 'strike', animationKey: 'attack_finger' },
      { id: 'eagle_wing', name: 'Wing Slash', damage: 40, startup: 4, active: 3, recovery: 6, cooldown: 0, type: 'strike', animationKey: 'attack_wing' },
      { id: 'eagle_kick', name: 'Crane Kick', damage: 50, startup: 5, active: 4, recovery: 8, cooldown: 0, type: 'strike', effect: 'knockback', animationKey: 'attack_kick' },
    ],
    specialSkill1: { id: 'eagle_dive', name: 'Đại Bàng Lao Xuống', damage: 110, startup: 8, active: 6, recovery: 12, cooldown: 3500, type: 'strike', effect: 'knockdown', animationKey: 'special_dive' },
    specialSkill2: { id: 'eagle_tornado', name: 'Gió Xoáy', damage: 85, startup: 6, active: 12, recovery: 10, cooldown: 4000, type: 'projectile', effect: 'slow', animationKey: 'special_tornado' },
    specialSkill3: { id: 'eagle_feather', name: 'Lông Vũ Sắc', damage: 70, startup: 4, active: 8, recovery: 8, cooldown: 2500, type: 'projectile', effect: 'knockback', animationKey: 'special_feather' },
    specialSkill4: { id: 'eagle_aerial', name: 'Thiên Không Vũ', damage: 130, startup: 10, active: 14, recovery: 16, cooldown: 6000, type: 'strike', effect: 'knockback', animationKey: 'special_aerial' },
    ultimate: { id: 'eagle_storm', name: 'Bão Táp Đại Bàng', damage: 320, startup: 18, active: 20, recovery: 22, cooldown: 0, type: 'strike', effect: 'knockdown', animationKey: 'ultimate_storm' },
  },
  unlockCondition: { type: 'free' },
});
