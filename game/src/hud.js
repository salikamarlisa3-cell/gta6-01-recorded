// Heads-up display, drawn on the same canvas after the world: health and
// armour bars, cash, wanted stars, weapon and ammo, the current objective,
// any flashing message, the Cache Run clock, and a minimap that tracks the
// player, traffic, police and the active objective.
import { FONT, VIEW, WORLD } from './config.js';
import { objectiveText } from './missions.js';
import { starsForHeat } from './police.js';

function bar(ctx, x, y, w, frac, fill, label) {
  ctx.fillStyle = 'rgba(10,12,18,0.72)';
  ctx.fillRect(x - 3, y - 3, w + 6, 20);
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(x, y, w, 14);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), 14);
  ctx.fillStyle = '#eef1f5';
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, x, y - 5);
}

export function drawHud(ctx, G, screen) {
  const p = G.player;
  ctx.textBaseline = 'alphabetic';
  bar(ctx, 22, 34, 168, p.health / 100, '#e63946', 'HEALTH');
  bar(ctx, 22, 76, 168, p.armor / 100, '#4cc9f0', 'ARMOUR');

  ctx.fillStyle = 'rgba(10,12,18,0.72)';
  ctx.fillRect(19, 96, 174, 30);
  ctx.fillStyle = '#ffd166';
  ctx.font = `bold 19px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.money}`, 26, 118);

  // Wanted stars, top centre.
  const stars = starsForHeat(G.heat);
  ctx.font = `26px ${FONT}`;
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', VIEW.width / 2 - 52 + i * 26, 36);
  }
  if (G.bustTimer > 0.15) {
    ctx.fillStyle = '#e63946';
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText('BUSTED IN…', VIEW.width / 2, 62);
  }

  // Weapon readout, bottom right.
  ctx.fillStyle = 'rgba(10,12,18,0.72)';
  ctx.fillRect(VIEW.width - 196, VIEW.height - 58, 174, 38);
  ctx.fillStyle = '#eef1f5';
  ctx.font = `15px ${FONT}`;
  ctx.textAlign = 'right';
  const weapon = p.weapon === 'pistol' ? `PISTOL  ${p.mag} / ${p.ammo}` : 'FISTS';
  ctx.fillText(weapon, VIEW.width - 30, VIEW.height - 32);

  // Objective line, bottom centre.
  ctx.fillStyle = 'rgba(10,12,18,0.66)';
  const objective = objectiveText(G);
  ctx.font = `15px ${FONT}`;
  const w = Math.min(760, ctx.measureText(objective).width + 28);
  ctx.fillRect((VIEW.width - w) / 2, VIEW.height - 58, w, 34);
  ctx.fillStyle = '#eef1f5';
  ctx.textAlign = 'center';
  ctx.fillText(objective, VIEW.width / 2, VIEW.height - 35);

  // District name, under the minimap, when it changes.
  if (G.districtName) {
    ctx.fillStyle = 'rgba(238,241,245,0.85)';
    ctx.font = `italic 14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(G.districtName, 22, 316);
  }

  // Flashing message (mission dialogue, pickups, warnings).
  if (G.message && G.messageTimer > 0) {
    ctx.font = `bold 19px ${FONT}`;
    const mw = Math.min(900, ctx.measureText(G.message).width + 36);
    ctx.fillStyle = 'rgba(10,12,18,0.78)';
    ctx.fillRect((VIEW.width - mw) / 2, 84, mw, 42);
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.fillText(G.message, VIEW.width / 2, 112);
  }

  drawMinimap(ctx, G);
  if (screen === 'play') drawCompassHint(ctx, G);
}

function objectivePoint(G) {
  if (G.activity && G.activity.kind === 'cache') return G.activity.caches[G.activity.index];
  if (G.mission) return G.mission.def.steps[G.mission.step];
  return null;
}

function drawMinimap(ctx, G) {
  const mw = 196;
  const mh = 132;
  const x0 = 22;
  const y0 = 142;
  const sx = mw / WORLD.width;
  const sy = mh / WORLD.height;
  ctx.fillStyle = 'rgba(16,24,32,0.85)';
  ctx.fillRect(x0 - 3, y0 - 3, mw + 6, mh + 6);
  ctx.fillStyle = '#274156';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = '#1d6f8e';
  ctx.fillRect(x0 + G.city.water.x * sx, y0 + G.city.water.y * sy, G.city.water.w * sx, G.city.water.h * sy);
  ctx.fillStyle = '#596275';
  for (const b of G.city.buildings) ctx.fillRect(x0 + b.x * sx, y0 + b.y * sy, Math.max(1.6, b.w * sx), Math.max(1.6, b.h * sy));
  const dot = (x, y, color, size) => {
    ctx.fillStyle = color;
    ctx.fillRect(x0 + x * sx - size / 2, y0 + y * sy - size / 2, size, size);
  };
  for (const car of G.traffic) if (!car.dead) dot(car.x, car.y, '#c0c6d4', 2.4);
  for (const unit of G.police) dot(unit.x, unit.y, '#4cc9f0', 4);
  const target = objectivePoint(G);
  if (target) {
    const pulse = 5 + Math.sin(G.elapsed * 6) * 1.6;
    dot(target.x, target.y, '#ffd166', pulse);
  }
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  dot(px, py, '#ffffff', 5.4);
}

/** A small arrow at the screen edge pointing toward the objective. */
function drawCompassHint(ctx, G) {
  const target = objectivePoint(G);
  if (!target) return;
  const px = G.player.car ? G.player.car.x : G.player.x;
  const py = G.player.car ? G.player.car.y : G.player.y;
  const dist = Math.hypot(target.x - px, target.y - py);
  if (dist < 240) return;
  const angle = Math.atan2(target.y - py, target.x - px);
  const cx = VIEW.width / 2 + Math.cos(angle) * 86;
  const cy = 150 + Math.sin(angle) * 54;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(-8, -7);
  ctx.lineTo(-8, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#eef1f5';
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(dist)}m`, cx, cy + 22);
}
