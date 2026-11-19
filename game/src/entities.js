// Traffic and pedestrians: the city's moving population.
// Traffic cars follow the road grid lane by lane, choose a new heading at
// intersections, brake for whatever is ahead and honk when blocked.
// Pedestrians stroll along block edges and flee anything fast or loud.
import { PARKED_COUNT, PEDESTRIAN_COUNT, ROADS, TRAFFIC_COUNT, VEHICLE_TYPES, WORLD } from './config.js';
import { onRoad } from './world.js';

let nextId = 1;

export function makeVehicle(rand, x, y, angle, typeId) {
  const type = VEHICLE_TYPES.find((t) => t.id === typeId) || rand.pick(VEHICLE_TYPES);
  return {
    id: nextId++,
    kind: 'car',
    type,
    x, y, angle,
    speed: 0,
    health: type.health,
    color: rand.pick(type.colors),
    driver: true,
    parked: false,
    honk: 0,
    dead: false,
  };
}

/** A point in the correct lane for a heading along the grid. */
function lanePoint(rand) {
  if (rand.chance(0.5)) {
    const ax = rand.pick(ROADS.avenueXs);
    const dir = rand.chance(0.5) ? 1 : -1;
    return { x: ax + dir * ROADS.laneOffset, y: rand.range(80, WORLD.height - 80), angle: dir > 0 ? Math.PI / 2 : -Math.PI / 2 };
  }
  const sy = rand.pick(ROADS.streetYs);
  const dir = rand.chance(0.5) ? 1 : -1;
  return { x: rand.range(80, WORLD.width - 80), y: sy + dir * ROADS.laneOffset, angle: dir > 0 ? 0 : Math.PI };
}

export function createTraffic(rand) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const spot = lanePoint(rand);
    const car = makeVehicle(rand, spot.x, spot.y, spot.angle);
    car.speed = rand.range(90, 150);
    car.cruise = car.speed;
    cars.push(car);
  }
  // Parked cars on lots and road edges: the player's easiest first ride.
  for (let i = 0; i < PARKED_COUNT; i += 1) {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 24; tries += 1) {
      x = rand.range(90, WORLD.width - 90);
      y = rand.range(90, WORLD.height - 90);
      if (onRoad(x, y)) break;
    }
    const car = makeVehicle(rand, x, y, rand.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]));
    car.parked = true;
    car.driver = false;
    cars.push(car);
  }
  return cars;
}

export function createPedestrians(rand) {
  const peds = [];
  for (let i = 0; i < PEDESTRIAN_COUNT; i += 1) {
    let x = rand.range(70, WORLD.width - 70);
    let y = rand.range(70, WORLD.height - 70);
    if (onRoad(x, y)) { x += 74; y += 62; }
    peds.push({
      id: nextId++,
      kind: 'ped',
      x, y,
      angle: rand.range(0, Math.PI * 2),
      speed: rand.range(34, 62),
      health: 30,
      color: rand.pick(['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#ffc6ff', '#ffadad']),
      panic: 0,
      dead: false,
      turnTimer: rand.range(1, 5),
    });
  }
  return peds;
}

function aheadBlocked(car, cars, player) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const look = 74 + Math.abs(car.speed) * 0.35;
  const check = (ox, oy, oradius) => {
    const dx = ox - car.x;
    const dy = oy - car.y;
    const forward = dx * fx + dy * fy;
    const side = Math.abs(dx * -fy + dy * fx);
    return forward > 4 && forward < look && side < 26 + oradius;
  };
  for (const other of cars) {
    if (other === car || other.dead) continue;
    if (check(other.x, other.y, 18)) return true;
  }
  if (player && player.car !== car && check(player.x, player.y, 14)) return true;
  if (player && player.car && player.car !== car && check(player.car.x, player.car.y, 18)) return true;
  return false;
}

export function updateTraffic(rand, cars, player, dt, city) {
  for (const car of cars) {
    if (car.dead || car.parked) continue;
    if (player && player.car === car) continue;
    const blocked = aheadBlocked(car, cars, player);
    const target = blocked ? 0 : (car.cruise || 120);
    car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), 260 * dt);
    if (blocked && car.speed < 12) {
      car.honk -= dt;
      if (car.honk <= 0) car.honk = rand.range(1.4, 3.4);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    // At an intersection, sometimes turn onto the crossing road (snapping to
    // its lane); otherwise keep straight and wrap around the city edge.
    const nearAvenue = ROADS.avenueXs.some((ax) => Math.abs(nx - ax) < 10);
    const nearStreet = ROADS.streetYs.some((sy) => Math.abs(ny - sy) < 10);
    if ((nearAvenue || nearStreet) && rand.chance(dt * 0.55)) {
      const horizontal = Math.abs(Math.cos(car.angle)) > 0.5;
      if (horizontal && nearAvenue) {
        const ax = ROADS.avenueXs.reduce((best, axv) => (Math.abs(nx - axv) < Math.abs(nx - best) ? axv : best), ROADS.avenueXs[0]);
        const dir = rand.chance(0.5) ? 1 : -1;
        car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        car.x = ax + dir * ROADS.laneOffset;
        car.y = ny;
        continue;
      }
      if (!horizontal && nearStreet) {
        const sy = ROADS.streetYs.reduce((best, syv) => (Math.abs(ny - syv) < Math.abs(ny - best) ? syv : best), ROADS.streetYs[0]);
        const dir = rand.chance(0.5) ? 1 : -1;
        car.angle = dir > 0 ? 0 : Math.PI;
        car.y = sy + dir * ROADS.laneOffset;
        car.x = nx;
        continue;
      }
    }
    car.x = Math.min(WORLD.width - 30, Math.max(30, nx));
    car.y = Math.min(WORLD.height - 30, Math.max(30, ny));
    if (!city.collides(car.x, car.y, 16) || onRoad(car.x, car.y)) {
      // road driving is fine
    } else {
      car.speed = 0;
    }
  }
}

export function updatePedestrians(rand, peds, player, dt, city) {
  for (const ped of peds) {
    if (ped.dead) continue;
    if (ped.panic > 0) ped.panic -= dt;
    // Flee the player's car when it comes fast and close, or any gunfire panic
    // the main loop stamped onto them.
    if (player && player.car && Math.abs(player.car.speed) > 190) {
      const dx = ped.x - player.car.x;
      const dy = ped.y - player.car.y;
      if (dx * dx + dy * dy < 130 * 130) {
        ped.angle = Math.atan2(dy, dx);
        ped.panic = 1.2;
      }
    }
    ped.turnTimer -= dt;
    if (ped.turnTimer <= 0) {
      ped.turnTimer = rand.range(1.5, 5);
      ped.angle += rand.range(-1.1, 1.1);
    }
    const speed = ped.panic > 0 ? 172 : ped.speed;
    const nx = ped.x + Math.cos(ped.angle) * speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * speed * dt;
    if (city.collides(nx, ny, 9)) {
      ped.angle += Math.PI / 2 + rand.range(-0.4, 0.4);
    } else {
      ped.x = nx;
      ped.y = ny;
    }
  }
}
