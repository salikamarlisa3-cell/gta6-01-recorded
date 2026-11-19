// Rendering: the city from above, then its people and cars, then darkness
// for the night, then the HUD and any full-screen panel. The camera follows
// the player (or their car) and clamps to the world; the 1280x720 logical
// view is scaled to the window with the margin filled dark.
import { FONT, ROADS, VIEW } from './config.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.ox = (canvas.width - VIEW.width * view.scale) / 2;
    view.oy = (canvas.height - VIEW.height * view.scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function cameraFor(G) {
    const focus = G.player.car || G.player;
    return {
      x: Math.max(0, Math.min(G.city.width - VIEW.width, focus.x - VIEW.width / 2)),
      y: Math.max(0, Math.min(G.city.height - VIEW.height, focus.y - VIEW.height / 2)),
    };
  }

  function drawGround(G, cam) {
    ctx.fillStyle = '#8a9a5b';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const city = G.city;
    // Water of the bay.
    ctx.fillStyle = '#1d6f8e';
    ctx.fillRect(city.water.x - cam.x, city.water.y - cam.y, city.water.w, city.water.h);
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    for (let i = 0; i < 7; i += 1) {
      const wy = city.water.y + 40 + i * 74 - cam.y;
      if (wy > -6 && wy < VIEW.height) ctx.fillRect(city.water.x - cam.x + 30, wy, city.water.w - 80, 3);
    }
    // Roads: asphalt, then centre dashes.
    ctx.fillStyle = '#3c4048';
    for (const ax of ROADS.avenueXs) ctx.fillRect(ax - ROADS.avenueWidth / 2 - cam.x, -cam.y, ROADS.avenueWidth, city.height);
    for (const sy of ROADS.streetYs) ctx.fillRect(-cam.x, sy - ROADS.streetWidth / 2 - cam.y, city.width, ROADS.streetWidth);
    ctx.fillStyle = '#f4d35e';
    for (const ax of ROADS.avenueXs) {
      for (let y = 18; y < city.height; y += 54) ctx.fillRect(ax - 2 - cam.x, y - cam.y, 4, 26);
    }
    for (const sy of ROADS.streetYs) {
      for (let x = 18; x < city.width; x += 54) ctx.fillRect(x - cam.x, sy - 2 - cam.y, 26, 4);
    }
    // Parks and parking lots.
    for (const park of city.parks) {
      if (!visible(park, cam)) continue;
      ctx.fillStyle = '#588157';
      ctx.fillRect(park.x - cam.x, park.y - cam.y, park.w, park.h);
      for (const tree of park.trees) {
        ctx.fillStyle = '#386641';
        ctx.beginPath();
        ctx.arc(tree.x - cam.x, tree.y - cam.y, tree.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#6c757d';
    for (const lot of city.lots) {
      if (!visible(lot, cam)) continue;
      ctx.fillRect(lot.x - cam.x, lot.y - cam.y, lot.w, lot.h);
    }
    // Buildings: wall shadow, then roof, then windows lit at night.
    const night = darkness(G) > 0.34;
    for (const b of city.buildings) {
      if (!visible(b, cam)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(b.x - cam.x + 6, b.y - cam.y + 7, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x - cam.x + 5, b.y - cam.y + 5, Math.max(0, b.w - 10), Math.max(0, b.h - 10));
      if (night) {
        ctx.fillStyle = '#ffe66d';
        const cols = Math.max(1, Math.floor(b.w / 26));
        const rows = Math.max(1, Math.floor(b.h / 26));
        for (let c = 0; c < cols; c += 1) {
          for (let r = 0; r < rows; r += 1) {
            if ((b.seed + c * 7 + r * 13) % 3 === 0) ctx.fillRect(b.x - cam.x + 10 + c * 26, b.y - cam.y + 10 + r * 26, 7, 9);
          }
        }
      }
    }
    // Landmarks.
    for (const lm of city.landmarks) drawLandmark(lm, cam);
    // Cache markers.
    if (G.activity && G.activity.kind === 'cache') {
      const spot = G.activity.caches[G.activity.index];
      const pulse = 30 + Math.sin(G.elapsed * 5) * 7;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(spot.x - cam.x, spot.y - cam.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(spot.x - cam.x, spot.y - cam.y, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    if (G.mission) {
      const step = G.mission.def.steps[G.mission.step];
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(step.x - cam.x, step.y - cam.y, 30 + Math.sin(G.elapsed * 5) * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function visible(r, cam) {
    return r.x + r.w > cam.x - 60 && r.x < cam.x + VIEW.width + 60 && r.y + r.h > cam.y - 60 && r.y < cam.y + VIEW.height + 60;
  }

  function drawLandmark(lm, cam) {
    const x = lm.x - cam.x;
    const y = lm.y - cam.y;
    if (x < -90 || y < -90 || x > VIEW.width + 90 || y > VIEW.height + 90) return;
    ctx.fillStyle = '#e9ecef';
    if (lm.kind === 'lighthouse') {
      ctx.fillRect(x - 11, y - 44, 22, 62);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(x - 11, y - 26, 22, 10);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.arc(x, y - 52, 9, 0, Math.PI * 2); ctx.fill();
    } else if (lm.kind === 'tower') {
      ctx.beginPath(); ctx.moveTo(x, y - 84); ctx.lineTo(x - 15, y + 22); ctx.lineTo(x + 15, y + 22); ctx.closePath(); ctx.fill();
    } else if (lm.kind === 'wheel') {
      ctx.strokeStyle = '#f15bb5';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, 42, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 28, y + 48); ctx.lineTo(x, y); ctx.lineTo(x + 28, y + 48); ctx.stroke();
    } else {
      ctx.fillRect(x - 30, y - 20, 60, 40);
      ctx.fillStyle = lm.kind === 'police' ? '#4361ee' : lm.kind === 'hospital' ? '#e63946' : '#f4a261';
      ctx.fillRect(x - 30, y - 20, 60, 12);
    }
    ctx.fillStyle = 'rgba(238,241,245,0.92)';
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(lm.name, x, y + 66);
  }

  function drawCar(car, cam, elapsed) {
    const x = car.x - cam.x;
    const y = car.y - cam.y;
    if (x < -80 || y < -80 || x > VIEW.width + 80 || y > VIEW.height + 80) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(car.angle);
    const t = car.type;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-t.w / 2 + 3, -t.h / 2 + 4, t.w, t.h);
    ctx.fillStyle = car.dead ? '#343a40' : car.color;
    ctx.fillRect(-t.w / 2, -t.h / 2, t.w, t.h);
    ctx.fillStyle = '#caf0f8';
    ctx.fillRect(-t.w * 0.08, -t.h / 2 + 3, t.w * 0.3, t.h - 6);
    ctx.fillStyle = '#212529';
    ctx.fillRect(-t.w / 2 + 3, -t.h / 2 - 2, 9, 5);
    ctx.fillRect(-t.w / 2 + 3, t.h / 2 - 3, 9, 5);
    ctx.fillRect(t.w / 2 - 12, -t.h / 2 - 2, 9, 5);
    ctx.fillRect(t.w / 2 - 12, t.h / 2 - 3, 9, 5);
    if (car.police) {
      ctx.fillStyle = '#4361ee';
      ctx.fillRect(-8, -t.h / 2, 16, t.h);
      ctx.fillStyle = Math.floor(elapsed * 4) % 2 ? '#e63946' : '#4cc9f0';
      ctx.fillRect(-5, -4, 10, 8);
    }
    if (car.health < car.type.health * 0.4) {
      ctx.fillStyle = 'rgba(80,80,80,0.55)';
      ctx.beginPath(); ctx.arc(t.w * 0.28, 0, 9 + Math.sin(elapsed * 9) * 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawActors(G, cam) {
    for (const car of G.traffic) drawCar(car, cam, G.elapsed);
    for (const unit of G.police) drawCar(unit, cam, G.elapsed);
    if (G.player.car) drawCar(G.player.car, cam, G.elapsed);
    for (const ped of G.peds) {
      const x = ped.x - cam.x;
      const y = ped.y - cam.y;
      if (x < -30 || y < -30 || x > VIEW.width + 30 || y > VIEW.height + 30) continue;
      ctx.fillStyle = ped.dead ? '#6c757d' : ped.color;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2e2a';
      ctx.beginPath(); ctx.arc(x, y - 2, 3.6, 0, Math.PI * 2); ctx.fill();
    }
    if (!G.player.car) {
      const p = G.player;
      const x = p.x - cam.x;
      const y = p.y - cam.y;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(x + 3, y + 6, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffb703';
      ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#023047';
      ctx.beginPath(); ctx.arc(x, y - 3, 5.4, 0, Math.PI * 2); ctx.fill();
      // Aim line for the pistol.
      if (p.weapon === 'pistol') {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(p.aim) * 30, y + Math.sin(p.aim) * 30);
        ctx.stroke();
      }
    }
    // Muzzle / impact flashes are short-lived particles stamped by main.
    for (const fx of G.effects) {
      ctx.fillStyle = fx.color;
      ctx.globalAlpha = Math.max(0, fx.life / fx.maxLife);
      ctx.beginPath(); ctx.arc(fx.x - cam.x, fx.y - cam.y, fx.size * (fx.life / fx.maxLife) + 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** 0 at noon, up to 0.62 in the deep of night. */
  function darkness(G) {
    const phase = (G.elapsed % 260) / 260;
    return Math.max(0, Math.sin(phase * Math.PI * 2 - Math.PI / 2)) * 0.31 + Math.max(0, -Math.cos(phase * Math.PI * 2)) * 0.31;
  }

  function drawNight(G, cam) {
    const d = darkness(G);
    if (d <= 0.02) return;
    ctx.fillStyle = `rgba(8,10,38,${d.toFixed(3)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    // Headlight cone for the player's car.
    if (G.player.car) {
      const car = G.player.car;
      const x = car.x - cam.x;
      const y = car.y - cam.y;
      ctx.fillStyle = 'rgba(255,240,170,0.16)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(car.angle - 0.32) * 190, y + Math.sin(car.angle - 0.32) * 190);
      ctx.lineTo(x + Math.cos(car.angle + 0.32) * 190, y + Math.sin(car.angle + 0.32) * 190);
      ctx.closePath();
      ctx.fill();
    }
  }

  function panel(title, lines, prompt) {
    ctx.fillStyle = 'rgba(8,10,16,0.6)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = `bold 54px ${FONT}`;
    ctx.fillText(title, VIEW.width / 2, 218);
    ctx.fillStyle = '#eef1f5';
    ctx.font = `19px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 286 + i * 30));
    ctx.fillStyle = '#4cc9f0';
    ctx.font = `bold 21px ${FONT}`;
    ctx.fillText(prompt, VIEW.width / 2, 286 + lines.length * 30 + 38);
  }

  function draw(G, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    const cam = cameraFor(G);
    drawGround(G, cam);
    drawActors(G, cam);
    drawNight(G, cam);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(ctx, G, screen);
    if (screen === SCREEN_TITLE) {
      panel('SOLSTICE BAY', [
        'An open-world bay city — drive it, walk it, work it.',
        'You are Juno Caldera, mechanic, courier, occasional problem.',
        'WASD drive / walk · F enter car · E work · B Cache Run · mouse aim, click to fight',
        'Story: four jobs for Mama Lina. Side money: Cache Runs, +20s per cache.',
        G.hasSave ? 'Your save continues automatically — cash, story and stats intact' : 'Finish all four story jobs to own the bay',
      ], 'Press Enter to play');
    } else if (screen === SCREEN_PAUSED) {
      panel('Paused', [`Cash $${G.player.money} · missions ${G.stats.missions} · cache runs ${G.stats.caches}`], 'Press P to resume');
    } else if (screen === SCREEN_BUSTED) {
      panel('BUSTED', ['The SBPD got their cuffs on you.', 'You were fined and released outside headquarters.'], 'Press Enter');
    } else if (screen === SCREEN_WASTED) {
      panel('WASTED', ['St. Solana patched you up — the bill stings.', 'Your ride and your pride stayed where you fell.'], 'Press Enter');
    }
    return cam;
  }

  /** Convert a mouse position in client pixels to world coordinates. */
  function screenToWorld(clientX, clientY, cam) {
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (clientX * ratio - view.ox) / view.scale + cam.x,
      y: (clientY * ratio - view.oy) / view.scale + cam.y,
    };
  }

  return { draw, cameraFor, screenToWorld };
}
