// The city itself: a pure, DOM-free description of Solstice Bay built from a
// seeded random source. Roads form a grid; the blocks between them are filled
// with buildings (solid), parks, parking lots and the water of the bay. Every
// other system — movement, traffic, missions, rendering — reads this layout
// and never invents its own geometry.
import { DISTRICTS, LANDMARKS, ROADS, WORLD } from './config.js';

/** Is the point on a north-south avenue (including its full width)? */
export function onAvenue(x) {
  return ROADS.avenueXs.some((ax) => Math.abs(x - ax) <= ROADS.avenueWidth / 2);
}

/** Is the point on an east-west street? */
export function onStreet(y) {
  return ROADS.streetYs.some((sy) => Math.abs(y - sy) <= ROADS.streetWidth / 2);
}

export function onRoad(x, y) {
  return onAvenue(x) || onStreet(y);
}

/** The district containing a point, or null on the water / outskirts. */
export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return null;
}

/** Axis-aligned rectangle overlap test shared by every collision check. */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function createCity(rand) {
  // The bay: a big water rectangle in the south-west, cut by the road grid's
  // bridges (roads stay drivable over it, blocks inside it stay water).
  const water = { x: 0, y: 2650, w: 1350, h: 550 };

  const buildings = [];
  const parks = [];
  const lots = [];

  // Fill each block (the rectangle between neighbouring roads) with either a
  // park, a parking lot, or 2-4 buildings with alleys between them.
  const xEdges = [0, ...ROADS.avenueXs.flatMap((ax) => [ax - ROADS.avenueWidth / 2, ax + ROADS.avenueWidth / 2]), WORLD.width];
  const yEdges = [0, ...ROADS.streetYs.flatMap((sy) => [sy - ROADS.streetWidth / 2, sy + ROADS.streetWidth / 2]), WORLD.height];
  for (let xi = 0; xi + 1 < xEdges.length; xi += 2) {
    for (let yi = 0; yi + 1 < yEdges.length; yi += 2) {
      const block = {
        x: xEdges[xi] + 10,
        y: yEdges[yi] + 10,
        w: xEdges[xi + 1] - xEdges[xi] - 20,
        h: yEdges[yi + 1] - yEdges[yi] - 20,
      };
      if (block.w < 90 || block.h < 80) continue;
      if (rectsOverlap(block, water)) continue;
      const district = districtAt(block.x + block.w / 2, block.y + block.h / 2);
      const roll = rand.next();
      if (roll < 0.14) {
        parks.push({ ...block, trees: makeTrees(rand, block) });
        continue;
      }
      if (roll < 0.26) {
        lots.push(block);
        continue;
      }
      const cols = rand.int(1, 2);
      const rows = rand.int(1, 2);
      const gap = 16;
      const bw = (block.w - gap * (cols - 1)) / cols;
      const bh = (block.h - gap * (rows - 1)) / rows;
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          buildings.push({
            x: block.x + c * (bw + gap),
            y: block.y + r * (bh + gap),
            w: bw,
            h: bh,
            roof: district ? district.roof : '#7f8c8d',
            wall: district ? district.wall : '#bdc3c7',
            floors: rand.int(2, 9),
            seed: rand.int(1, 99999),
          });
        }
      }
    }
  }

  // Cache spots: pleasant, reachable places on roads near landmarks and
  // parks — the Cache Run picks four of these per run, far apart.
  const cacheSpots = [];
  for (const lm of LANDMARKS) cacheSpots.push({ x: lm.x + 70, y: lm.y + 40, label: lm.name });
  for (const park of parks.slice(0, 10)) cacheSpots.push({ x: park.x + park.w / 2, y: park.y + park.h / 2, label: 'park cache' });
  for (const lot of lots.slice(0, 10)) cacheSpots.push({ x: lot.x + lot.w / 2, y: lot.y + lot.h / 2, label: 'lot cache' });
  for (const ax of ROADS.avenueXs) {
    for (const sy of ROADS.streetYs) cacheSpots.push({ x: ax + 84, y: sy + 76, label: 'corner cache' });
  }

  return {
    width: WORLD.width,
    height: WORLD.height,
    water,
    buildings,
    parks,
    lots,
    landmarks: LANDMARKS,
    cacheSpots,
    /** Solid rectangles a body of the given radius must not enter. */
    collides(x, y, radius) {
      if (x < radius || y < radius || x > WORLD.width - radius || y > WORLD.height - radius) return true;
      if (pointInRect(x, y, water) && !onRoad(x, y)) return true;
      for (const b of buildings) {
        if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return true;
      }
      return false;
    },
  };
}

function makeTrees(rand, block) {
  const trees = [];
  const count = rand.int(3, 8);
  for (let i = 0; i < count; i += 1) {
    trees.push({ x: rand.range(block.x + 18, block.x + block.w - 18), y: rand.range(block.y + 18, block.y + block.h - 18), r: rand.range(9, 16) });
  }
  return trees;
}
