// The SBPD: a wanted-heat model plus pursuit cars.
// Crimes add heat; every 30 heat is a star (max 5). Police cars spawn at the
// city edge of view when stars exist, chase the player, and try to hold the
// bust circle: stay inside it while slow for long enough and you are busted.
// Heat cools slowly, faster when no police can see the player.
import { WANTED } from './config.js';
import { makeVehicle } from './entities.js';

export function starsForHeat(heat) {
  return Math.min(WANTED.maxStars, Math.floor(heat / WANTED.heatPerStar));
}

export function addHeat(G, amount) {
  G.heat = Math.min(WANTED.maxStars * WANTED.heatPerStar, G.heat + amount);
}

export function createPoliceUnit(rand, player) {
  // Spawn off-screen but on a road near the player, heading at them.
  const angle = rand.range(0, Math.PI * 2);
  const dist = rand.range(560, 720);
  const car = makeVehicle(rand, player.x + Math.cos(angle) * dist, player.y + Math.sin(angle) * dist, angle + Math.PI, 'regal');
  car.color = '#f8f9fa';
  car.police = true;
  car.driver = true;
  car.cruise = 430;
  return car;
}

export function updatePolice(G, dt) {
  const stars = starsForHeat(G.heat);
  // Keep the unit count matched to the star count.
  while (G.police.length < stars) G.police.push(createPoliceUnit(G.rand, G.player));
  if (G.police.length > stars) G.police.length = stars;

  let anySees = false;
  let busting = false;
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  const playerSpeed = G.player.car ? Math.abs(G.player.car.speed) : Math.hypot(G.player.vx || 0, G.player.vy || 0);

  for (const unit of G.police) {
    if (unit.dead) continue;
    const dx = px - unit.x;
    const dy = py - unit.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (dist < 620) anySees = true;
    const wantedAngle = Math.atan2(dy, dx);
    let diff = wantedAngle - unit.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    unit.angle += Math.max(-3.4 * dt, Math.min(3.4 * dt, diff));
    const top = stars >= 4 ? 470 : 425;
    const target = dist > 46 ? top : 60;
    unit.speed += Math.sign(target - unit.speed) * Math.min(Math.abs(target - unit.speed), 380 * dt);
    const nx = unit.x + Math.cos(unit.angle) * unit.speed * dt;
    const ny = unit.y + Math.sin(unit.angle) * unit.speed * dt;
    if (!G.city.collides(nx, ny, 17)) {
      unit.x = nx;
      unit.y = ny;
    } else {
      unit.speed *= 0.4;
      unit.angle += 1.7 * dt;
    }
    if (dist < WANTED.bustRadius && playerSpeed < 62) busting = true;
    // A hard ram damages the player's ride a little.
    if (dist < 34 && Math.abs(unit.speed) > 240 && G.player.car && G.ramCooldown <= 0) {
      G.player.car.health -= 7;
      G.ramCooldown = 0.8;
      G.flash('Police ram!');
    }
  }
  if (G.ramCooldown > 0) G.ramCooldown -= dt;

  if (busting) {
    G.bustTimer += dt;
    if (G.bustTimer >= WANTED.bustSeconds) {
      G.busted = true;
    }
  } else {
    G.bustTimer = Math.max(0, G.bustTimer - dt * 1.6);
  }

  // Cooling: slow while watched, quicker when nobody can see you.
  if (stars > 0) G.heat = Math.max(0, G.heat - WANTED.coolRate * (anySees ? 0.25 : 1) * dt);
  return { stars, anySees };
}
