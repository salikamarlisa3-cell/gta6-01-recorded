// Missions and the Cache Run activity — pure logic, no DOM, no drawing.
// The story is a short chain for fixer Mama Lina: each mission is a sequence
// of go-to markers with a line of dialogue at each end and a cash payout.
// The Cache Run is the repeatable headline activity: four of Lina's supply
// caches appear across the bay, the clock starts at 75 seconds, and every
// cache you sweep buys back +20 seconds. Finish all four to get paid — the
// payout grows with every second left on the clock.
import { CACHE_RUN } from './config.js';

export const STORY = [
  {
    title: 'First Shift',
    intro: 'Lina: Juno! My diner cooler died. Grab the pickup by the lot and bring it back here — gently.',
    done: 'Lina: She lives! Dinner is on me. Cash is on the counter.',
    pay: 90,
    steps: [
      { x: 1660, y: 1470, label: 'Reach the diner pickup' },
      { x: 1520, y: 1300, label: "Return to Mama Lina's Diner" },
    ],
  },
  {
    title: 'Cold Chain',
    intro: 'Lina: Ice run. Harbor Row cold storage, then straight to Saltflats Market. Do not melt my margins.',
    done: 'Lina: Still frozen. You drive like the bay owes you money.',
    pay: 140,
    steps: [
      { x: 3560, y: 2620, label: 'Reach Harbor Row cold storage' },
      { x: 2380, y: 1150, label: 'Deliver to Saltflats Market' },
    ],
  },
  {
    title: 'Night Ferry Money',
    intro: 'Lina: A ferryman at the lighthouse holds my takings. Collect, then bank them at the Skyneedle.',
    done: 'Lina: Counted twice. Clean work, Juno.',
    pay: 210,
    steps: [
      { x: 210, y: 2980, label: 'Meet the ferryman at the lighthouse' },
      { x: 2380, y: 1150, label: 'Bank the takings at the Skyneedle' },
    ],
  },
  {
    title: 'The Solstice Cache',
    intro: 'Lina: Last job. My brother hid a cache by the Bayview Wheel. Take it to Old Fort and we are square.',
    done: 'Lina: Square — and then some. The bay is yours now, Juno.',
    pay: 320,
    steps: [
      { x: 3560, y: 2620, label: 'Pick up the Solstice Cache at the wheel' },
      { x: 3920, y: 800, label: 'Deliver it to Old Fort' },
    ],
  },
];

/** Pick `count` cache spots that are far apart, so a run crosses the city. */
export function chooseCacheSpots(rand, spots, count) {
  const pool = rand.shuffled(spots);
  const chosen = [];
  for (const spot of pool) {
    if (chosen.every((c) => Math.hypot(c.x - spot.x, c.y - spot.y) > 950)) chosen.push(spot);
    if (chosen.length === count) break;
  }
  // Very small spot lists: top up with whatever remains.
  for (const spot of pool) {
    if (chosen.length >= count) break;
    if (!chosen.includes(spot)) chosen.push(spot);
  }
  return chosen;
}

/**
 * Start a Cache Run on game state G. Returns the run object (also G.activity).
 * G needs: rand, city.cacheSpots, player {x, y, money}, stats, flash, audio.
 */
export function startCacheRun(G) {
  const caches = chooseCacheSpots(G.rand, G.city.cacheSpots, CACHE_RUN.cacheCount);
  G.activity = {
    kind: 'cache',
    caches,
    index: 0,
    timeLeft: CACHE_RUN.startSeconds,
    collected: 0,
  };
  G.flash(`Cache Run! Sweep ${CACHE_RUN.cacheCount} caches — each one buys +${CACHE_RUN.bonusSeconds}s`);
  if (G.audio) G.audio.pickup();
  return G.activity;
}

/** The payout for finishing with `timeLeft` seconds still on the clock. */
export function cachePayout(timeLeft) {
  return CACHE_RUN.basePay + Math.ceil(Math.max(0, timeLeft)) * CACHE_RUN.perSecondPay;
}

/**
 * Advance the Cache Run one step. Handles pickups (+20 s each), the final
 * payout, and running out of time. Returns 'collected' | 'finished' |
 * 'failed' | null for this step.
 */
export function updateCacheRun(G, dt) {
  const run = G.activity;
  if (!run || run.kind !== 'cache') return null;
  run.timeLeft -= dt;
  if (run.timeLeft <= 0) {
    G.activity = null;
    G.flash('Cache Run failed — the trail went cold.');
    return 'failed';
  }
  const spot = run.caches[run.index];
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  if (Math.hypot(px - spot.x, py - spot.y) <= CACHE_RUN.pickupRadius) {
    run.index += 1;
    run.collected += 1;
    if (G.audio) G.audio.pickup();
    if (run.index >= run.caches.length) {
      const pay = cachePayout(run.timeLeft);
      G.player.money += pay;
      G.stats.caches += 1;
      G.stats.earned += pay;
      G.activity = null;
      G.flash(`Cache Run complete! +$${pay}`);
      if (G.audio) G.audio.cash();
      if (G.save) G.save();
      return 'finished';
    }
    run.timeLeft += CACHE_RUN.bonusSeconds;
    G.flash(`Cache ${run.collected}/${run.caches.length} — +${CACHE_RUN.bonusSeconds}s`);
    return 'collected';
  }
  return null;
}

/** Start the next story mission, if any remain and none is active. */
export function startStoryMission(G) {
  if (G.mission || G.storyIndex >= STORY.length) return null;
  const def = STORY[G.storyIndex];
  G.mission = { def, step: 0 };
  G.flash(def.intro);
  return G.mission;
}

/** Advance the story mission when the player reaches the current marker. */
export function updateStoryMission(G) {
  const mission = G.mission;
  if (!mission) return null;
  const step = mission.def.steps[mission.step];
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  if (Math.hypot(px - step.x, py - step.y) > 62) return null;
  mission.step += 1;
  if (G.audio) G.audio.pickup();
  if (mission.step >= mission.def.steps.length) {
    G.player.money += mission.def.pay;
    G.stats.missions += 1;
    G.stats.earned += mission.def.pay;
    G.flash(`${mission.def.done} +$${mission.def.pay}`);
    if (G.audio) G.audio.cash();
    G.mission = null;
    G.storyIndex += 1;
    if (G.save) G.save();
    return 'finished';
  }
  G.flash(mission.def.steps[mission.step].label);
  return 'advanced';
}

/** The current objective line for the HUD. */
export function objectiveText(G) {
  if (G.activity && G.activity.kind === 'cache') {
    const run = G.activity;
    return `Cache Run — cache ${run.index + 1}/${run.caches.length} · ${Math.ceil(run.timeLeft)}s`;
  }
  if (G.mission) return `${G.mission.def.title} — ${G.mission.def.steps[G.mission.step].label}`;
  if (G.storyIndex < STORY.length) return `Free roam — press E at the diner for work, B for a Cache Run`;
  return 'Free roam — the bay is yours. B for a Cache Run';
}
