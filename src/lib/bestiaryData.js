// All monsters from Jainga's Bestiary
// hp_type: "weak" | "standard" | "tough" | "hulking"
// Scaling rules (N = floor/wave number):
//   weak:    ceil(N/2) dice
//   standard: N dice
//   tough:   N*2 dice
//   hulking: N*3 dice
// Damage scaling:
//   light:      ceil(N/2) dice
//   medium:     N dice
//   heavy:      N*2 dice
//   devastating: N*3 dice
// HP Averaged: diceCount * (dieFaces/2) — no roll

export function getDiceCount(hpType, floorWave) {
  const n = Math.max(1, floorWave);
  switch (hpType) {
    case 'weak':    return Math.ceil(n / 2);
    case 'standard': return n;
    case 'tough':   return n * 2;
    case 'hulking': return n * 3;
    default:        return n;
  }
}

export function getDamageDiceCount(damageType, floorWave) {
  const n = Math.max(1, floorWave);
  switch (damageType) {
    case 'light':       return Math.ceil(n / 2);
    case 'medium':      return n;
    case 'heavy':       return n * 2;
    case 'devastating': return n * 3;
    default:            return n;
  }
}

export function getDieFaces(dieType) {
  return parseInt(dieType.replace('d', ''), 10) || 6;
}

export function formatHp(hpType, floorWave, dieType, averaged) {
  const count = getDiceCount(hpType, floorWave);
  if (averaged) {
    const faces = getDieFaces(dieType);
    return `${count * Math.floor(faces / 2)} (avg)`;
  }
  return `${count}${dieType}`;
}

export function formatDamage(damageType, floorWave, dieType) {
  const count = getDamageDiceCount(damageType, floorWave);
  return `${count}${dieType}`;
}

export const BESTIARY = [
  // ─── ZOMBIES ─────────────────────────────────────────────────────────────
  {
    id: 'lesser_zombie',
    name: 'Lesser Zombie',
    category: 'Zombies',
    size: 'Medium',
    hp_type: 'weak',
    defense: 8,
    speed: '10ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Sluggish', description: 'The Zombie can only take the move action once per turn.' },
      { name: 'Contagious', description: 'If the Zombie reduces a creature who is not undead to 0 hp, that creature becomes a Standard Zombie.' },
    ],
    actions: [
      { name: 'Maul', action_slot: 'Primary', range: 'Melee', to_hit: '+2', damage_type: 'light', damage_keyword: 'bludgeoning', effect: '' },
    ],
  },
  {
    id: 'standard_zombie',
    name: 'Standard Zombie',
    category: 'Zombies',
    size: 'Medium',
    hp_type: 'standard',
    defense: 9,
    speed: '10ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Sluggish', description: 'The Zombie can only take the move action once per turn.' },
      { name: 'Contagious', description: 'If the Zombie reduces a creature who is not undead to 0 hp, that creature becomes a Standard Zombie.' },
    ],
    actions: [
      { name: 'Maul', action_slot: 'Primary', range: 'Melee', to_hit: '+3', damage_type: 'medium', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'greater_zombie',
    name: 'Greater Zombie',
    category: 'Zombies',
    size: 'Large',
    hp_type: 'tough',
    defense: 10,
    speed: '10ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Sluggish', description: 'The Zombie can only take the move action once per turn.' },
      { name: 'Contagious', description: 'If the Zombie reduces a creature who is not undead to 0 hp, that creature becomes a Standard Zombie.' },
    ],
    actions: [
      { name: 'Maul', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'heavy', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'frenzied_zombie',
    name: 'Frenzied Zombie',
    category: 'Zombies',
    size: 'Medium',
    hp_type: 'weak',
    defense: 10,
    speed: '30ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Crazed Critical', description: 'If the Zombie rolls a critical hit against a creature, it can attack again without using an action.' },
      { name: 'Contagious', description: 'If the Zombie reduces a creature who is not undead to 0 hp, that creature becomes a Standard Zombie.' },
    ],
    actions: [
      { name: 'Maul', action_slot: 'Primary/Secondary/Tertiary', range: 'Melee', to_hit: '+3', damage_type: 'light', damage_keyword: 'bludgeoning', effect: '' },
    ],
  },
  {
    id: 'hulking_zombie',
    name: 'Hulking Zombie',
    category: 'Zombies',
    size: 'Large',
    hp_type: 'hulking',
    defense: 12,
    speed: '10ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Sluggish', description: 'The Zombie can only take the move action once per turn.' },
      { name: 'Contagious', description: 'If the Zombie reduces a creature who is not undead to 0 hp, that creature becomes a Standard Zombie.' },
    ],
    actions: [
      { name: 'Maul', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'heavy', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'diseased_zombie',
    name: 'Diseased Zombie',
    category: 'Zombies',
    size: 'Medium',
    hp_type: 'standard',
    defense: 9,
    speed: '10ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Sluggish', description: 'The Zombie can only take the move action once per turn.' },
      { name: 'Diseased', description: 'When the Zombie deals damage against a creature, that creature must succeed on a 12 Constitution check or take light damage at the end of their next turn at which point they are no longer poisoned. This can stack.' },
      { name: 'Contagious', description: 'If the Zombie reduces a creature who is not undead to 0 hp, that creature becomes a Standard Zombie.' },
    ],
    actions: [
      { name: 'Maul', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'exploding_zombie',
    name: 'Exploding Zombie',
    category: 'Zombies',
    size: 'Medium',
    hp_type: 'standard',
    defense: 10,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Sluggish', description: 'The Zombie can only take the move action once per turn.' },
      { name: 'Contagious', description: 'If the Zombie reduces a creature who is not undead to 0 hp, that creature becomes a Standard Zombie.' },
    ],
    actions: [
      { name: 'EXPLODE', action_slot: 'Primary', range: 'AOE 20ft sphere', to_hit: '+4', damage_type: 'medium', damage_keyword: '', effect: 'The Zombie is reduced to 0 hp and dies.' },
    ],
  },

  // ─── SHADES ──────────────────────────────────────────────────────────────
  {
    id: 'lesser_shade',
    name: 'Lesser Shade',
    category: 'Shades',
    size: 'Medium',
    hp_type: 'weak',
    defense: 13,
    speed: '30ft Flying',
    vulnerabilities: ['Radiant'],
    resistances: ['Slashing', 'Bludgeoning', 'Piercing'],
    immunities: ['Prone', 'Grappled', 'Restrained'],
    attributes: [
      { name: 'Incorporeal', description: 'The shade can move through solid objects and creatures, but it cannot end its turn in the same space.' },
      { name: 'Draining', description: 'When the shade deals damage to a creature that is not undead, that creature must succeed on a 13 Constitution check or have their Strength score reduced by 1d4.' },
    ],
    actions: [
      { name: 'Withering Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+2', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'standard_shade',
    name: 'Standard Shade',
    category: 'Shades',
    size: 'Medium',
    hp_type: 'standard',
    defense: 13,
    speed: '30ft Flying',
    vulnerabilities: ['Radiant'],
    resistances: ['Slashing', 'Bludgeoning', 'Piercing'],
    immunities: ['Prone', 'Grappled', 'Restrained'],
    attributes: [
      { name: 'Incorporeal', description: 'The shade can move through solid objects and creatures, but it cannot end its turn in the same space.' },
      { name: 'Draining', description: 'When the shade deals damage to a creature that is not undead, that creature must succeed on a 13 Constitution check or have their Strength score reduced by 1d4.' },
    ],
    actions: [
      { name: 'Withering Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+3', damage_type: 'medium', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'greater_shade',
    name: 'Greater Shade',
    category: 'Shades',
    size: 'Medium',
    hp_type: 'tough',
    defense: 13,
    speed: '30ft Flying',
    vulnerabilities: ['Radiant'],
    resistances: ['Slashing', 'Bludgeoning', 'Piercing'],
    immunities: ['Prone', 'Grappled', 'Restrained'],
    attributes: [
      { name: 'Incorporeal', description: 'The shade can move through solid objects and creatures, but it cannot end its turn in the same space.' },
      { name: 'Draining', description: 'When the shade deals damage to a creature that is not undead, that creature must succeed on a 13 Constitution check or have their Strength score reduced by 1d4.' },
    ],
    actions: [
      { name: 'Withering Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'heavy', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'leaching_shade',
    name: 'Leaching Shade',
    category: 'Shades',
    size: 'Medium',
    hp_type: 'standard',
    defense: 13,
    speed: '30ft Flying',
    vulnerabilities: ['Radiant'],
    resistances: ['Slashing', 'Bludgeoning', 'Piercing'],
    immunities: ['Prone', 'Grappled', 'Restrained'],
    attributes: [
      { name: 'Incorporeal', description: 'The shade can move through solid objects and creatures, but it cannot end its turn in the same space.' },
      { name: 'Draining', description: 'When the shade deals damage to a creature that is not undead, that creature must succeed on a 13 Constitution check or have their Strength score reduced by 1d4.' },
    ],
    actions: [
      { name: 'Withering Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+3', damage_type: 'medium', damage_keyword: '', effect: 'The shade regains hit points equal to half the damage dealt.' },
    ],
  },
  {
    id: 'assassin_shade',
    name: 'Assassin Shade',
    category: 'Shades',
    size: 'Medium',
    hp_type: 'weak',
    defense: 13,
    speed: '30ft Flying',
    vulnerabilities: ['Radiant'],
    resistances: ['Slashing', 'Bludgeoning', 'Piercing'],
    immunities: ['Prone', 'Grappled', 'Restrained'],
    attributes: [
      { name: 'Incorporeal', description: 'The shade can move through solid objects and creatures, but it cannot end its turn in the same space.' },
      { name: 'Draining', description: 'When the shade deals damage to a creature that is not undead, that creature must succeed on a 13 Constitution check or have their Strength score reduced by 1d4.' },
    ],
    actions: [
      { name: 'Withering Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Invisibility', action_slot: 'Primary', range: '—', to_hit: '—', damage_type: null, damage_keyword: '', effect: 'The shade goes invisible and is untraceable. All attacks directed toward it within 5 feet have disadvantage. All others cannot target the Assassin Shade.' },
    ],
  },
  {
    id: 'flickering_shade',
    name: 'Flickering Shade',
    category: 'Shades',
    size: 'Medium',
    hp_type: 'weak',
    defense: 13,
    speed: '30ft Flying',
    vulnerabilities: ['Radiant'],
    resistances: ['Slashing', 'Bludgeoning', 'Piercing'],
    immunities: ['Prone', 'Grappled', 'Restrained'],
    attributes: [
      { name: 'Incorporeal', description: 'The shade can move through solid objects and creatures, but it cannot end its turn in the same space.' },
      { name: 'Draining', description: 'When the shade deals damage to a creature that is not undead, that creature must succeed on a 13 Constitution check or have their Strength score reduced by 1d4.' },
    ],
    actions: [
      { name: 'Withering Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+2', damage_type: 'light', damage_keyword: '', effect: '' },
      { name: 'Withering Touch', action_slot: 'Secondary', range: 'Melee', to_hit: '+2', damage_type: 'light', damage_keyword: '', effect: '' },
      { name: 'Withering Touch', action_slot: 'Tertiary', range: 'Melee', to_hit: '+2', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'blighted_shade',
    name: 'Blighted Shade',
    category: 'Shades',
    size: 'Medium',
    hp_type: 'standard',
    defense: 14,
    speed: '30ft Flying',
    vulnerabilities: ['Radiant'],
    resistances: ['Slashing', 'Bludgeoning', 'Piercing'],
    immunities: ['Prone', 'Grappled', 'Restrained'],
    attributes: [
      { name: 'Incorporeal', description: 'The shade can move through solid objects and creatures, but it cannot end its turn in the same space.' },
      { name: 'Draining', description: 'When the shade deals damage to a creature that is not undead, that creature must succeed on a 13 Constitution check or have their Strength score reduced by 1d4.' },
    ],
    actions: [
      { name: 'Withering Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+3', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Blighting Aura', action_slot: 'Primary', range: 'AOE 20ft sphere', to_hit: '+3', damage_type: 'medium', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'possessing_shade',
    name: 'Possessing Shade',
    category: 'Shades',
    size: 'Medium',
    hp_type: 'standard',
    defense: 16,
    speed: '30ft Flying',
    vulnerabilities: ['Radiant'],
    resistances: ['Slashing', 'Bludgeoning', 'Piercing'],
    immunities: ['Prone', 'Grappled', 'Restrained'],
    attributes: [
      { name: 'Incorporeal', description: 'The shade can move through solid objects and creatures, but it cannot end its turn in the same space.' },
      { name: 'Draining', description: 'When the shade deals damage to a creature that is not undead, that creature must succeed on a 13 Constitution check or have their Strength score reduced by 1d4.' },
    ],
    actions: [
      { name: 'Withering Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+3', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Possession', action_slot: 'Primary', range: 'Melee', to_hit: '+3', damage_type: null, damage_keyword: '', effect: 'Target creature must succeed on a 13 Wisdom check or be possessed. While possessed, all Action use is determined by the Shade. The possessed creature can remake the wisdom save at the end of each of its turns. The effect also ends if the possessed creature receives healing from a magical source.' },
    ],
  },

  // ─── AMALGAMS ─────────────────────────────────────────────────────────────
  {
    id: 'severed_hand',
    name: 'Severed Hand',
    category: 'Amalgams',
    size: 'Tiny',
    hp_type: 'weak',
    defense: 12,
    speed: '30ft',
    vulnerabilities: ['Fire'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Skiddish', description: 'As a reactionary action, when targeted with an attack, the Severed Hand can move 5 feet in any direction before the attack hits. If still within range, the attack is rolled normally. If out of range, the attack is considered a miss.' },
      { name: 'Weakness', description: 'When targeted by an attack that deals piercing damage, roll a luck die after dealing damage. On a 20+, the Amalgam drops to 0 hp.' },
    ],
    actions: [
      { name: 'Scratch', action_slot: 'Primary', range: 'Melee', to_hit: '+2', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'flesh_construct',
    name: 'Flesh Construct',
    category: 'Amalgams',
    size: 'Medium',
    hp_type: 'tough',
    defense: 16,
    speed: '20ft',
    vulnerabilities: ['Fire'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Resilient', description: 'Once per turn, can reduce the damage of an incoming attack by half (not fire damage).' },
      { name: 'Weakness', description: 'When targeted by an attack that deals piercing damage, roll a luck die after dealing damage. On a 20+, the Amalgam drops to 0 hp.' },
    ],
    actions: [
      { name: 'Slam', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'heavy', damage_keyword: '', effect: '' },
      { name: 'Slam', action_slot: 'Secondary', range: 'Melee', to_hit: '+4', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'sewn_mass',
    name: 'Sewn Mass',
    category: 'Amalgams',
    size: 'Large',
    hp_type: 'hulking',
    defense: 13,
    speed: '20ft',
    vulnerabilities: ['Fire'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Resilient', description: 'Once per turn, can reduce the damage of an incoming attack by half (not fire damage).' },
      { name: 'Weakness', description: 'When targeted by an attack that deals piercing damage, roll a luck die after dealing damage. On a 20+, the Amalgam drops to 0 hp.' },
    ],
    actions: [
      { name: 'Slam', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'heavy', damage_keyword: '', effect: '' },
      { name: 'Blood Spray', action_slot: 'Primary', range: 'Ranged', to_hit: '+3', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Slam', action_slot: 'Secondary', range: 'Melee', to_hit: '+4', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'visceral_sludge',
    name: 'Visceral Sludge',
    category: 'Amalgams',
    size: 'Large',
    hp_type: 'hulking',
    defense: 13,
    speed: '15ft',
    vulnerabilities: ['Fire'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Formless', description: 'Can pass through gaps as small as one inch.' },
      { name: 'Faceless', description: 'Cannot be flanked.' },
      { name: 'Weakness', description: 'When targeted by an attack that deals piercing damage, roll a luck die after dealing damage. On a 20+, the Amalgam drops to 0 hp.' },
    ],
    actions: [
      { name: 'Latch', action_slot: 'Primary', range: 'Melee', to_hit: '+3', damage_type: 'light', damage_keyword: '', effect: 'The target creature is grappled as the Visceral Sludge engulfs them. At the end of each turn, the engulfed creature can attempt a 15 Strength check to escape.' },
      { name: 'Consume', action_slot: 'Primary/Secondary/Tertiary', range: 'Melee', to_hit: '—', damage_type: 'light', damage_keyword: '', effect: 'Deals light damage to a creature it currently engulfs.' },
    ],
  },
  {
    id: 'sanguine_horror',
    name: 'Sanguine Horror',
    category: 'Amalgams',
    size: 'Medium',
    hp_type: 'tough',
    defense: 16,
    speed: '35ft',
    vulnerabilities: ['Fire'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Weakness', description: 'When targeted by an attack that deals piercing damage, roll a luck die after dealing damage. On a 20+, the Amalgam drops to 0 hp.' },
    ],
    actions: [
      { name: 'Splatter', action_slot: 'Primary/Secondary/Tertiary', range: 'Ranged', to_hit: '+3', damage_type: 'light', damage_keyword: '', effect: 'Target is splattered with infected blood; on its next turn it also takes heavy bleeding damage at the end of its turn unless it receives healing. Does not stack.' },
    ],
  },
  {
    id: 'bestial_hulk',
    name: 'Bestial Hulk',
    category: 'Amalgams',
    size: 'Large',
    hp_type: 'hulking',
    defense: 16,
    speed: '40ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Weakness', description: 'When targeted by an attack that deals piercing damage, roll a luck die after dealing damage. On a 20+, the Amalgam drops to 0 hp.' },
    ],
    actions: [
      { name: 'Claw', action_slot: 'Primary/Secondary', range: 'Melee', to_hit: '+6', damage_type: 'heavy', damage_keyword: '', effect: '' },
      { name: 'Pounce (Recharge 3)', action_slot: 'Primary', range: 'Ranged', to_hit: '+6', damage_type: 'devastating', damage_keyword: '', effect: 'Bestial Hulk leaps toward its target, landing in an unoccupied space within 5 feet.' },
    ],
  },

  // ─── SKELETONS ────────────────────────────────────────────────────────────
  {
    id: 'wolf_skeleton',
    name: 'Wolf Skeleton',
    category: 'Skeletons',
    size: 'Medium',
    hp_type: 'standard',
    defense: 13,
    speed: '40ft',
    vulnerabilities: ['Bludgeoning'],
    resistances: [],
    immunities: [],
    attributes: [],
    actions: [
      { name: 'Bite', action_slot: 'Primary/Secondary', range: 'Melee', to_hit: '+3', damage_type: 'medium', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'rat_skeleton_swarm',
    name: 'Rat Skeleton Swarm',
    category: 'Skeletons',
    size: 'Medium Group',
    hp_type: 'standard',
    defense: 12,
    speed: '30ft',
    vulnerabilities: ['Bludgeoning'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Swarm', description: 'When it reaches half or fewer hit points, it loses its tertiary action attacks.' },
    ],
    actions: [
      { name: 'Bite', action_slot: 'Primary/Secondary/Tertiary', range: 'Melee', to_hit: '+2', damage_type: 'light', damage_keyword: '', effect: '' },
      { name: 'Reknit', action_slot: 'Primary', range: '—', to_hit: '—', damage_type: 'light', damage_keyword: '', effect: 'Regain light HP.' },
    ],
  },
  {
    id: 'humanoid_skeleton',
    name: 'Humanoid Skeleton',
    category: 'Skeletons',
    size: 'Medium',
    hp_type: 'standard',
    defense: 15,
    speed: '30ft',
    vulnerabilities: ['Bludgeoning'],
    resistances: [],
    immunities: [],
    attributes: [],
    actions: [
      { name: 'Sword', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Shortbow', action_slot: 'Primary', range: 'Ranged', to_hit: '+4', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Dagger', action_slot: 'Primary', range: 'Melee', to_hit: '+4', damage_type: 'light', damage_keyword: '', effect: '' },
      { name: 'Dagger', action_slot: 'Secondary', range: 'Melee', to_hit: '+4', damage_type: 'light', damage_keyword: '', effect: '' },
      { name: 'Reknit', action_slot: 'Primary', range: '—', to_hit: '—', damage_type: 'light', damage_keyword: '', effect: 'Regain light HP.' },
    ],
  },
  {
    id: 'bone_beast',
    name: 'Bone Beast',
    category: 'Skeletons',
    size: 'Large',
    hp_type: 'tough',
    defense: 16,
    speed: '35ft',
    vulnerabilities: ['Bludgeoning'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Intimidating', description: 'When the Bone Beast attacks a creature, it makes a Wisdom contest against their Wisdom. On a success, the Bone Beast can make a Light melee attack without spending an action.' },
    ],
    actions: [
      { name: 'Stab', action_slot: 'Primary/Secondary', range: 'Melee', to_hit: '+5', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Slash', action_slot: 'Primary', range: 'Melee', to_hit: '+5', damage_type: 'heavy', damage_keyword: '', effect: '' },
      { name: 'Reknit', action_slot: 'Primary', range: '—', to_hit: '—', damage_type: 'light', damage_keyword: '', effect: 'Regain light HP.' },
    ],
  },
  {
    id: 'skeletal_knight',
    name: 'Skeletal Knight',
    category: 'Skeletons',
    size: 'Medium',
    hp_type: 'standard',
    defense: 17,
    speed: '25ft',
    vulnerabilities: ['Bludgeoning'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Defensive', description: 'All allies of the skeleton within 5 feet of the Skeletal Knight receive +2 to their Defense.' },
    ],
    actions: [
      { name: 'Longsword', action_slot: 'Primary/Secondary', range: 'Melee', to_hit: '+5', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Pommel Strike', action_slot: 'Tertiary', range: 'Melee', to_hit: '+5', damage_type: 'light', damage_keyword: '', effect: '' },
      { name: 'Parry', action_slot: 'Reactionary', range: '—', to_hit: '—', damage_type: null, damage_keyword: '', effect: 'When targeted by an attack you can see, add +2 to Defense.' },
      { name: 'Reknit', action_slot: 'Primary', range: '—', to_hit: '—', damage_type: 'light', damage_keyword: '', effect: 'Regain light HP.' },
    ],
  },
  {
    id: 'ogre_skeleton',
    name: 'Ogre Skeleton',
    category: 'Skeletons',
    size: 'Large',
    hp_type: 'hulking',
    defense: 15,
    speed: '30ft',
    vulnerabilities: ['Bludgeoning'],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Sweep', description: 'When the Ogre takes the Club action, it can target two creatures within melee range with the same attack roll.' },
    ],
    actions: [
      { name: 'Club', action_slot: 'Primary', range: 'Melee', to_hit: '+5', damage_type: 'devastating', damage_keyword: '', effect: '' },
      { name: 'Rock Throw', action_slot: 'Primary', range: 'Ranged', to_hit: '+5', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Reknit', action_slot: 'Primary', range: '—', to_hit: '—', damage_type: 'light', damage_keyword: '', effect: 'Regain light HP.' },
    ],
  },
  {
    id: 'bone_mound',
    name: 'Bone Mound',
    category: 'Skeletons',
    size: 'Large',
    hp_type: 'hulking',
    defense: 14,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    attributes: [
      { name: 'Faceless', description: 'Cannot be flanked.' },
    ],
    actions: [
      { name: 'Slam', action_slot: 'Primary/Secondary/Tertiary', range: 'Melee', to_hit: '+6', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Bone Spike', action_slot: 'Primary/Secondary', range: 'Ranged', to_hit: '+6', damage_type: 'medium', damage_keyword: '', effect: '' },
    ],
  },

  // ─── SLIMES ───────────────────────────────────────────────────────────────
  {
    id: 'small_ooze',
    name: 'Small Ooze',
    category: 'Slimes',
    size: 'Small',
    hp_type: 'weak',
    defense: 11,
    speed: '15ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
    ],
    actions: [
      { name: 'Acidic Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+2', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'standard_ooze',
    name: 'Standard Ooze',
    category: 'Slimes',
    size: 'Medium',
    hp_type: 'standard',
    defense: 13,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
    ],
    actions: [
      { name: 'Acidic Touch', action_slot: 'Primary', range: 'Melee', to_hit: '+2', damage_type: 'medium', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'large_ooze',
    name: 'Large Ooze',
    category: 'Slimes',
    size: 'Large',
    hp_type: 'tough',
    defense: 14,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
    ],
    actions: [
      { name: 'Acid Slam', action_slot: 'Primary', range: 'Melee', to_hit: '+5', damage_type: 'heavy', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'tentacled_ooze',
    name: 'Tentacled Ooze',
    category: 'Slimes',
    size: 'Large',
    hp_type: 'standard',
    defense: 13,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
    ],
    actions: [
      { name: 'Acid Slap', action_slot: 'Primary/Secondary/Tertiary', range: 'Melee', to_hit: '+3', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'slime_warrior',
    name: 'Slime Warrior',
    category: 'Slimes',
    size: 'Medium',
    hp_type: 'standard',
    defense: 16,
    speed: '30ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
    ],
    actions: [
      { name: 'Acid Blade', action_slot: 'Primary', range: 'Melee', to_hit: '+5', damage_type: 'medium', damage_keyword: '', effect: '' },
      { name: 'Acid Spray', action_slot: 'Secondary', range: 'Melee', to_hit: '+5', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'splatter_fiend',
    name: 'Splatter Fiend',
    category: 'Slimes',
    size: 'Large',
    hp_type: 'tough',
    defense: 13,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
    ],
    actions: [
      { name: 'Acid Splatter', action_slot: 'Primary', range: 'AOE 20ft circle', to_hit: '+4', damage_type: 'medium', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'gumdrop_ooze',
    name: 'Gumdrop Ooze',
    category: 'Slimes',
    size: 'Small',
    hp_type: 'weak',
    defense: 14,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
      { name: 'Hidden', description: 'These creatures are hidden until they drop from the ceiling and attack unless a creature with a Wisdom score of 17+ has line of sight.' },
    ],
    actions: [
      { name: 'Engulf', action_slot: 'Primary', range: 'Melee', to_hit: '+5', damage_type: 'heavy', damage_keyword: '', effect: '' },
      { name: 'Acid Burn', action_slot: 'Primary', range: '—', to_hit: '—', damage_type: 'medium', damage_keyword: '', effect: 'Deal medium damage to an engulfed creature.' },
    ],
  },
  {
    id: 'bulb_sprayer_ooze',
    name: 'Bulb Sprayer Ooze',
    category: 'Slimes',
    size: 'Medium',
    hp_type: 'standard',
    defense: 14,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
    ],
    actions: [
      { name: 'Acid Jet', action_slot: 'Primary', range: 'AOE 60ft line', to_hit: '+4', damage_type: 'heavy', damage_keyword: '', effect: '' },
      { name: 'Bulb Slam', action_slot: 'Primary/Secondary', range: 'Melee', to_hit: '+4', damage_type: 'light', damage_keyword: '', effect: '' },
    ],
  },
  {
    id: 'mountain_jelly',
    name: 'Mountain Jelly',
    category: 'Slimes',
    size: 'Huge',
    hp_type: 'tough',
    defense: 14,
    speed: '20ft',
    vulnerabilities: [],
    resistances: [],
    immunities: ['Slashing', 'Acid'],
    attributes: [
      { name: 'Formless', description: 'Can move through spaces as small as one inch wide.' },
      { name: 'Splittable', description: 'When the Ooze takes slashing damage and has more than 1 hp, it splits into two identical Oozes. Split the HP between them as evenly as possible.' },
    ],
    actions: [
      { name: 'Acid Lure', action_slot: 'Primary/Secondary', range: 'Range 30ft', to_hit: '+5', damage_type: 'light', damage_keyword: '', effect: 'Tow the creature 15ft closer. If the creature would enter the Mountain Jelly\'s space, it is engulfed and takes light damage at the end of each turn. A 15 Strength save frees them.' },
    ],
  },
];

export const CATEGORIES = ['Zombies', 'Shades', 'Amalgams', 'Skeletons', 'Slimes'];