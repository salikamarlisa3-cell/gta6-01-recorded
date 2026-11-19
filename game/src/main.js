// SOLSTICE BAY — Cache Run. Boot, the game state, and the one loop.
// createGame(seed) builds a complete, DOM-free game state whose update()
// advances the whole simulation (player, traffic, pedestrians, police,
// missions, Cache Run) in fixed steps; the browser shell below feeds it
// input, paints it, and handles screens, sound and saving. Screenshot
// scenes in shots.js drive the very same update() with a scripted driver.
import { CACHE_RUN, PISTOL, PLAYER, STEP, VEHICLE_TYPES } from './config.js';
import { createRandom } from './random.js';
import { createCity, districtAt } from './world.js';
import { createPedestrians, createTraffic, updatePedestrians, updateTraffic } from './entities.js';
import { addHeat, updatePolice } from './police.js';
import { startCacheRun, startStoryMission, updateCacheRun, updateStoryMission } from './missions.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CACHE_RUN, ACTION_CONFIRM, ACTION_ENTER_CAR, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RELOAD, ACTION_WEAPON } from './input.js';
import { createRenderer, SCREEN_BUSTED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED } from './render.js';
import { stageShot } from './shots.js';
import { clearSave, loadSave, storeSave } from './save.js';

const MAX_FRAME = 0.25;
const DINER = { x: 1520, y: 1300 };
const HQ = { x: 3320, y: 800 };
const HOSPITAL = { x: 920, y: 1800 };

export function createGame(seed, saved) {
  const rand = createRandom(seed);
  const city = createCity(rand);
  const G = {
    rand,
    city,
    elapsed: 0,
    heat: 0,
    bustTimer: 0,
    ramCooldown: 0,
    busted: false,
    wasted: false,
    storyIndex: 0,
    mission: null,
    activity: null,
    police: [],
    effects: [],
    message: '',
    messageTimer: 0,
    districtName: '',
    hasSave: Boolean(saved),
    stats: { missions: 0, caches: 0, earned: 0, arrests: 0, wasted: 0 },
    audio: null,
    save: null,
  };
  G.player = {
    x: PLAYER.startX, y: PLAYER.startY, vx: 0, vy: 0,
    health: PLAYER.maxHealth, armor: 0,
    money: PLAYER.startMoney,
    car: null, weapon: 'fists', aim: 0,
    mag: PISTOL.magazine, ammo: PISTOL.startAmmo,
    cooldown: 0, reload: 0,
  };
  if (saved) {
    G.player.x = saved.x ?? G.player.x;
    G.player.y = saved.y ?? G.player.y;
    G.player.money = saved.money ?? G.player.money;
    G.storyIndex = saved.storyIndex ?? 0;
    if (saved.stats) G.stats = { ...G.stats, ...saved.stats };
  }
  G.traffic = createTraffic(rand);
  G.peds = createPedestrians(rand);

  G.flash = (text) => {
    G.message = text;
    G.messageTimer = 4.2;
  };

  G.enterCar = (car) => {
    if (!car || car.dead) return false;
    if (car.driver && !car.parked) {
      addHeat(G, 16);
      G.flash(`You yanked the driver out of a ${car.type.name}!`);
    } else {
      G.flash(`You are driving the ${car.type.name}. WASD to drive, F to get out.`);
    }
    car.driver = false;
    car.parked = false;
    G.player.car = car;
    if (G.audio) G.audio.ui();
    return true;
  };

  G.exitCar = () => {
    const car = G.player.car;
    if (!car) return;
    car.speed = 0;
    G.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
    G.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    if (city.collides(G.player.x, G.player.y, 13)) {
      G.player.x = car.x;
      G.player.y = car.y + 34;
    }
    G.player.car = null;
  };

  G.nearestCar = (maxDist) => {
    let best = null;
    let bestDist = maxDist;
    for (const car of [...G.traffic, ...G.police]) {
      if (car.dead) continue;
      const d = Math.hypot(car.x - G.player.x, car.y - G.player.y);
      if (d < bestDist) { bestDist = d; best = car; }
    }
    return best;
  };

  G.hurtPlayer = (amount) => {
    const p = G.player;
    const absorbed = Math.min(p.armor, amount * 0.7);
    p.armor -= absorbed;
    p.health -= amount - absorbed;
    if (p.health <= 0 && !p.car) {
      p.health = 0;
      G.wasted = true;
    }
  };

  G.attack = () => {
    const p = G.player;
    if (p.car || p.cooldown > 0 || p.reload > 0) return;
    if (p.weapon === 'pistol') {
      if (p.mag <= 0) { G.startReload(); return; }
      p.mag -= 1;
      p.cooldown = PISTOL.cooldown;
      addHeat(G, 14);
      if (G.audio) G.audio.shot();
      for (const ped of G.peds) ped.panic = Math.max(ped.panic, 1.6);
      // Hitscan: nearest living target within range and a narrow aim cone.
      let target = null;
      let targetDist = PISTOL.range;
      const consider = (obj, radius) => {
        const d = Math.hypot(obj.x - p.x, obj.y - p.y);
        if (d > targetDist) return;
        let diff = Math.atan2(obj.y - p.y, obj.x - p.x) - p.aim;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) < 0.14 + radius / Math.max(d, 1)) { target = obj; targetDist = d; }
      };
      for (const ped of G.peds) if (!ped.dead) consider(ped, 10);
      for (const car of G.traffic) if (!car.dead) consider(car, 22);
      G.effects.push({ x: p.x + Math.cos(p.aim) * 26, y: p.y + Math.sin(p.aim) * 26, size: 9, life: 0.09, maxLife: 0.09, color: '#ffd166' });
      if (target) {
        target.health -= PISTOL.damage;
        G.effects.push({ x: target.x, y: target.y, size: 13, life: 0.16, maxLife: 0.16, color: '#e63946' });
        if (target.kind === 'ped' && target.health <= 0 && !target.dead) {
          target.dead = true;
          addHeat(G, 22);
          G.flash('That was a person. The bay saw it.');
        }
        if (target.kind === 'car' && target.health <= 0 && !target.dead) {
          target.dead = true;
          target.speed = 0;
          addHeat(G, 10);
        }
      }
      return;
    }
    // Fists.
    p.cooldown = 0.32;
    if (G.audio) G.audio.punch();
    for (const ped of G.peds) {
      if (ped.dead) continue;
      if (Math.hypot(ped.x - p.x, ped.y - p.y) <= PLAYER.punchRange) {
        ped.health -= PLAYER.punchDamage;
        ped.panic = 2;
        addHeat(G, 7);
        if (ped.health <= 0) { ped.dead = true; addHeat(G, 18); }
        break;
      }
    }
  };

  G.startReload = () => {
    const p = G.player;
    if (p.weapon !== 'pistol' || p.reload > 0 || p.mag >= PISTOL.magazine || p.ammo <= 0) return;
    p.reload = PISTOL.reloadSeconds;
  };

  function finishReload() {
    const p = G.player;
    const take = Math.min(PISTOL.magazine - p.mag, p.ammo);
    p.mag += take;
    p.ammo -= take;
    p.reload = 0;
  }

  function driveCar(dt, ctl) {
    const car = G.player.car;
    const type = car.type;
    const throttle = ctl ? -ctl.y : 0;
    const steer = ctl ? ctl.x : 0;
    if (throttle !== 0) car.speed += type.accel * throttle * dt * (car.speed * throttle < 0 ? 1.7 : 1);
    car.speed -= car.speed * 0.55 * dt;
    if (ctl && ctl.handbrake) car.speed -= car.speed * 2.4 * dt;
    car.speed = Math.max(-type.topSpeed * 0.36, Math.min(type.topSpeed, car.speed));
    if (Math.abs(car.speed) > 4) {
      car.angle += steer * type.grip * dt * (car.speed / type.topSpeed) * (car.speed < 0 ? -1 : 1);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (city.collides(nx, ny, 17)) {
      const impact = Math.abs(car.speed);
      if (impact > 210) {
        car.health -= impact * 0.06;
        G.hurtPlayer(impact * 0.012);
        G.effects.push({ x: car.x, y: car.y, size: 16, life: 0.3, maxLife: 0.3, color: '#adb5bd' });
        if (car.health <= 0 && !car.dead) { car.dead = true; G.flash('Your ride is wrecked!'); G.exitCar(); }
      }
      car.speed *= -0.28;
    } else {
      car.x = nx;
      car.y = ny;
    }
    G.player.x = car.x;
    G.player.y = car.y;
    // Running into traffic or pedestrians.
    for (const other of G.traffic) {
      if (other === car || other.dead) continue;
      if (Math.hypot(other.x - car.x, other.y - car.y) < 34) {
        other.health -= Math.abs(car.speed) * 0.05 + 4;
        car.health -= 3;
        car.speed *= 0.55;
        other.speed = (other.speed || 0) * 0.4;
        addHeat(G, 5);
        if (other.health <= 0) other.dead = true;
      }
    }
    if (Math.abs(car.speed) > 120) {
      for (const ped of G.peds) {
        if (ped.dead) continue;
        if (Math.hypot(ped.x - car.x, ped.y - car.y) < 24) {
          ped.dead = true;
          addHeat(G, 26);
          G.flash('You hit a pedestrian!');
          car.speed *= 0.7;
        }
      }
    }
  }

  function walkPlayer(dt, ctl) {
    const p = G.player;
    const speed = ctl && ctl.run ? 268 : 168;
    let mx = ctl ? ctl.x : 0;
    let my = ctl ? ctl.y : 0;
    const len = Math.hypot(mx, my) || 1;
    if (mx || my) { mx /= len; my /= len; }
    p.vx = mx * speed;
    p.vy = my * speed;
    const nx = p.x + p.vx * dt;
    const ny = p.y + p.vy * dt;
    if (!city.collides(nx, p.y, 13)) p.x = nx;
    if (!city.collides(p.x, ny, 13)) p.y = ny;
    // Wading into traffic hurts.
    for (const car of G.traffic) {
      if (car.dead || car.parked) continue;
      if (Math.abs(car.speed) > 130 && Math.hypot(car.x - p.x, car.y - p.y) < 24) {
        G.hurtPlayer(16);
        p.x -= car.x > p.x ? 16 : -16;
        G.flash('A car clipped you!');
        break;
      }
    }
  }

  G.update = (dt, ctl) => {
    G.elapsed += dt;
    if (G.messageTimer > 0) G.messageTimer -= dt;
    if (G.player.cooldown > 0) G.player.cooldown -= dt;
    if (G.player.reload > 0) {
      G.player.reload -= dt;
      if (G.player.reload <= 0) finishReload();
    }
    for (let i = G.effects.length - 1; i >= 0; i -= 1) {
      G.effects[i].life -= dt;
      if (G.effects[i].life <= 0) G.effects.splice(i, 1);
    }
    if (G.player.car) driveCar(dt, ctl);
    else walkPlayer(dt, ctl);
    updateTraffic(rand, G.traffic, G.player, dt, city);
    updatePedestrians(rand, G.peds, G.player, dt, city);
    updatePolice(G, dt);
    updateCacheRun(G, dt);
    updateStoryMission(G);
    // Slow health regen only while no star is watching.
    if (G.heat < 30 && G.player.health > 0 && G.player.health < 100) G.player.health = Math.min(100, G.player.health + dt * 1.4);
    const d = districtAt(G.player.x, G.player.y);
    G.districtName = d ? d.name : 'The Bay';
    if (G.player.car && G.player.car.health <= 0 && !G.player.car.dead) {
      G.player.car.dead = true;
      G.exitCar();
    }
  };

  G.respawnBusted = () => {
    const fine = Math.min(G.player.money, 60 + G.stats.arrests * 15);
    G.player.money -= fine;
    G.stats.arrests += 1;
    G.heat = 0;
    G.police = [];
    G.bustTimer = 0;
    G.busted = false;
    if (G.player.car) G.exitCar();
    G.player.x = HQ.x + 80;
    G.player.y = HQ.y + 70;
    G.flash(`Released. Fine: $${fine}.`);
    if (G.save) G.save();
  };

  G.respawnWasted = () => {
    const bill = Math.min(G.player.money, 45);
    G.player.money -= bill;
    G.stats.wasted += 1;
    G.heat = 0;
    G.police = [];
    G.wasted = false;
    G.player.health = 70;
    if (G.player.car) G.exitCar();
    G.player.x = HOSPITAL.x + 70;
    G.player.y = HOSPITAL.y + 60;
    G.flash(`Discharged. Hospital bill: $${bill}.`);
    if (G.save) G.save();
  };

  return G;
}

// ---------------------------------------------------------------------------
// Browser shell: input, screens, sound, saving. Skipped when there is no DOM
// (headless tests import createGame only).
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
  const seed = Number.isInteger(seedParam) ? seedParam : 20261119;
  const shot = params.get('shot');
  const canvas = document.getElementById('game');
  const status = document.getElementById('status');
  const renderer = createRenderer(canvas);

  if (shot) {
    const G = createGame(seed);
    const screen = stageShot(G, shot);
    let painted = 0;
    const paint = () => {
      renderer.draw(G, screen);
      painted += 1;
      if (painted < 3) requestAnimationFrame(paint);
      else window.__shotReady = true;
    };
    requestAnimationFrame(paint);
  } else {
    bootGame(renderer, canvas, status, seed);
  }
}

function bootGame(renderer, canvas, status, seed) {
  const saved = loadSave();
  let G = createGame(seed, saved);
  const audio = createAudio();
  G.audio = audio;
  G.save = () => storeSave(G);
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let sirenTimer = 0;

  status.textContent = 'Solstice Bay. Press Enter to play.';

  function freshStart() {
    clearSave();
    G = createGame(seed);
    G.audio = audio;
    G.save = () => storeSave(G);
    screen = SCREEN_PLAY;
    G.flash('Welcome to Solstice Bay, Juno. Mama Lina is waiting at the diner — press E there.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) status.textContent = audio.toggleMute() ? 'Muted.' : 'Sound on.';
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
      if (actions & 64) { /* reload key doubles as nothing on title */ }
      // C continues a save explicitly; Enter also continues when a save exists.
      return;
    }
    if (screen === SCREEN_BUSTED && (actions & ACTION_CONFIRM)) { G.respawnBusted(); screen = SCREEN_PLAY; return; }
    if (screen === SCREEN_WASTED && (actions & ACTION_CONFIRM)) { G.respawnWasted(); screen = SCREEN_PLAY; return; }
    if (actions & ACTION_PAUSE) {
      screen = screen === SCREEN_PAUSED ? SCREEN_PLAY : screen === SCREEN_PLAY ? SCREEN_PAUSED : screen;
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_ENTER_CAR) {
      if (G.player.car) G.exitCar();
      else {
        const car = G.nearestCar(78);
        if (car) G.enterCar(car);
        else G.flash('No car in reach.');
      }
    }
    if (actions & ACTION_INTERACT) {
      if (!G.mission && !G.activity && Math.hypot(G.player.x - DINER.x, G.player.y - DINER.y) < 110) startStoryMission(G);
      else if (G.storyIndex >= 4) G.flash('Lina: All jobs done. Cache Runs pay the rent now — press B.');
    }
    if ((actions & ACTION_CACHE_RUN) && !G.activity) startCacheRun(G);
    if (actions & ACTION_WEAPON) G.player.weapon = G.player.weapon === 'fists' ? 'pistol' : 'fists';
    if (actions & ACTION_RELOAD) G.startReload();
    // Title-screen fresh start shortcut: N wipes the save mid-game too.
    if (actions & ACTION_CONFIRM && G.player.car) { /* confirm in car = nothing */ }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        const axes = input.axes();
        const ctl = { x: axes.x, y: axes.y, run: input.running(), handbrake: input.handbrake() };
        // Aim from the mouse through the camera.
        const cam = renderer.cameraFor(G);
        const worldMouse = renderer.screenToWorld(input.mouse.x, input.mouse.y, cam);
        G.player.aim = Math.atan2(worldMouse.y - G.player.y, worldMouse.x - G.player.x);
        if (input.mouse.down) G.attack();
        G.update(STEP, ctl);
        accumulator -= STEP;
        if (G.busted) { screen = SCREEN_BUSTED; break; }
        if (G.wasted) { screen = SCREEN_WASTED; break; }
      }
      audio.engine(G.player.car ? G.player.car.speed : 0, 1 / 60);
      if (G.police.length) {
        sirenTimer -= 1 / 60;
        if (sirenTimer <= 0) { audio.sirenTick(Math.floor(G.elapsed * 2)); sirenTimer = 0.42; }
      }
    } else {
      accumulator = 0;
      audio.stopEngine();
      if (screen === SCREEN_TITLE) G.update(STEP, null);
    }
    renderer.draw(G, screen);
  }
  requestAnimationFrame(frame);

  // A hidden tab pauses play rather than letting the bay run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  });
  // Keep the CACHE_RUN import referenced for tree-shaken readers of this file.
  void CACHE_RUN;
  void VEHICLE_TYPES;
}
