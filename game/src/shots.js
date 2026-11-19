// Deterministic screenshot scenes behind ?shot=cover|drive|chase|cache.
// Each scene builds the real game state from the given seed, then steps the
// real simulation with a simple scripted driver, so the frame is a genuine
// moment of play — never a posed mock-up — and the same seed always yields
// the same frame.
import { STEP } from './config.js';
import { startCacheRun } from './missions.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Steer the player's car toward a point for one step (used by scenes). */
function driveToward(G, tx, ty) {
  const car = G.player.car;
  if (!car) return { x: 0, y: 0, handbrake: false };
  const angle = Math.atan2(ty - car.y, tx - car.x);
  let diff = angle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return { x: Math.max(-1, Math.min(1, diff * 2.2)), y: diff > 2.4 ? 1 : -1, handbrake: false, run: false };
}

function stepScene(G, seconds, driver) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) G.update(STEP, driver ? driver() : null);
}

/**
 * Stage the named scene on a freshly created game G (from main.createGame).
 * Returns the screen to paint over the staged state.
 */
export function stageShot(G, name) {
  if (name === 'drive' || name === 'chase' || name === 'cache') {
    // Put Juno straight into the nearest parked car.
    const car = G.traffic.find((c) => c.parked) || G.traffic[0];
    G.enterCar(car);
    startCacheRun(G);
    const first = G.activity.caches[0];
    if (name === 'drive') {
      stepScene(G, 7, () => driveToward(G, first.x, first.y));
      G.flash('Cache Run — cache 1 is across the bay!');
    } else if (name === 'cache') {
      // Teleport close and roll in: the pickup ring is in frame, clock live.
      car.x = first.x - 120;
      car.y = first.y - 60;
      car.angle = Math.atan2(first.y - car.y, first.x - car.x);
      stepScene(G, 2.2, () => driveToward(G, first.x, first.y));
    } else {
      // Chase: crime witnessed, heat high, units already converging.
      G.heat = 96;
      stepScene(G, 5, () => driveToward(G, first.x, first.y));
      G.flash('The SBPD is on you — lose them or lose everything!');
    }
    return SCREEN_PLAY;
  }
  // Cover: the title screen over the diner blocks at full midday (elapsed is
  // a whole number of day cycles, so the night darkness is exactly zero).
  G.elapsed = 520;
  stepScene(G, 3, null);
  return SCREEN_TITLE;
}
