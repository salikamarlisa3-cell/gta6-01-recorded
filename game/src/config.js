// SOLSTICE BAY — central tuning table.
// Every gameplay number lives here so the rest of the code stays readable:
// world size, the six districts, vehicle classes, on-foot speeds, the wanted
// curve and the Cache Run economy (four caches, +20 seconds apiece).

/** Fixed simulation step in seconds: 60 updates per second at any refresh rate. */
export const STEP = 1 / 60;

/** Logical viewport the renderer paints before scaling to the real canvas. */
export const VIEW = { width: 1280, height: 720 };

/** The whole city, in world units. The bay itself fills the south-west corner. */
export const WORLD = { width: 4800, height: 3200 };

/** Roads are a grid: avenues run north-south, streets run east-west. */
export const ROADS = {
  avenueXs: [320, 920, 1520, 2120, 2720, 3320, 3920, 4520],
  streetYs: [300, 800, 1300, 1800, 2300, 2800],
  avenueWidth: 118,
  streetWidth: 104,
  laneOffset: 29,
};

/** Six districts, each a rectangle with its own building palette and name. */
export const DISTRICTS = [
  { name: 'Coral Strand', x: 0, y: 2300, w: 1500, h: 900, roof: '#e2725b', wall: '#f4a261' },
  { name: 'Neon Palms', x: 1500, y: 2300, w: 1700, h: 900, roof: '#9b5de5', wall: '#f15bb5' },
  { name: 'Harbor Row', x: 3200, y: 2300, w: 1600, h: 900, roof: '#4361ee', wall: '#4cc9f0' },
  { name: 'Mesa Heights', x: 0, y: 0, w: 1600, h: 1300, roof: '#bc6c25', wall: '#dda15e' },
  { name: 'Saltflats Market', x: 1600, y: 0, w: 1600, h: 1300, roof: '#606c38', wall: '#a7c957' },
  { name: 'Old Fort', x: 3200, y: 0, w: 1600, h: 1300, roof: '#6d6875', wall: '#b5838d' },
];

/** Named landmarks drawn as special props; two of them anchor respawns. */
export const LANDMARKS = [
  { name: 'Solstice Lighthouse', x: 210, y: 2980, kind: 'lighthouse' },
  { name: 'Skyneedle Tower', x: 2380, y: 1150, kind: 'tower' },
  { name: 'Bayview Wheel', x: 3560, y: 2620, kind: 'wheel' },
  { name: 'SBPD Headquarters', x: 3320, y: 800, kind: 'police' },
  { name: 'St. Solana Hospital', x: 920, y: 1800, kind: 'hospital' },
  { name: "Mama Lina's Diner", x: 1520, y: 1300, kind: 'diner' },
];

export const PLAYER = {
  radius: 13,
  walkSpeed: 168,
  runSpeed: 268,
  maxHealth: 100,
  maxArmor: 100,
  punchRange: 34,
  punchDamage: 22,
  startX: 1520,
  startY: 1420,
  startMoney: 45,
};

export const PISTOL = {
  damage: 34,
  range: 460,
  cooldown: 0.22,
  magazine: 12,
  reloadSeconds: 1.1,
  startAmmo: 36,
};

/** Vehicle classes: footprint, performance and toughness differ per class. */
export const VEHICLE_TYPES = [
  { id: 'pico', name: 'Pico Hatch', w: 44, h: 24, topSpeed: 335, accel: 300, grip: 5.4, health: 90, colors: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'] },
  { id: 'regal', name: 'Regal Sedan', w: 52, h: 26, topSpeed: 385, accel: 330, grip: 4.8, health: 120, colors: ['#8ecae6', '#219ebc', '#023047', '#ffb703'] },
  { id: 'vyper', name: 'Vyper GT', w: 54, h: 25, topSpeed: 520, accel: 470, grip: 5.9, health: 100, colors: ['#ff5d8f', '#f72585', '#7209b7', '#3a0ca3'] },
  { id: 'mule', name: 'Mule Pickup', w: 56, h: 28, topSpeed: 345, accel: 285, grip: 4.2, health: 170, colors: ['#a7c957', '#606c38', '#bc6c25', '#dda15e'] },
  { id: 'dart', name: 'Dart Motorcycle', w: 34, h: 15, topSpeed: 470, accel: 520, grip: 6.4, health: 60, colors: ['#e0aaff', '#5a189a', '#ff8500', '#2ec4b6'] },
];

export const TRAFFIC_COUNT = 17;
export const PEDESTRIAN_COUNT = 52;
export const PARKED_COUNT = 22;

/** Wanted heat: crimes add heat, stars are derived, heat cools when unseen. */
export const WANTED = {
  heatPerStar: 30,
  maxStars: 5,
  coolRate: 2.6,
  bustSeconds: 2.4,
  bustRadius: 64,
};

/** Cache Run: sweep all four caches before the clock dies; each cache +20 s. */
export const CACHE_RUN = {
  cacheCount: 4,
  startSeconds: 75,
  bonusSeconds: 20,
  pickupRadius: 56,
  basePay: 160,
  perSecondPay: 9,
  respectPay: 6,
};

/** A full day-night cycle, in seconds of play. */
export const DAY_SECONDS = 260;

export const SAVE_KEY = 'solstice-bay.cache-run.save.v1';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
