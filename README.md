# gta6-01 — SOLSTICE BAY: Cache Run
[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/salikamarlisa3-cell/gta6-01-recorded/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/salikamarlisa3-cell/gta6-01-recorded/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**SOLSTICE BAY — Cache Run** is a top-down 2D open-world crime game in vanilla JavaScript — 100% original city, characters, vehicles, story, art and sound, invented for this entry. You are Juno Caldera, a broke mechanic in a sun-soaked coastal city of 4800×3200 world units with six named districts (Coral Strand, Neon Palms, Harbor Row, Mesa Heights, Saltflats Market, Old Fort), a working road grid with bridges over the bay, and landmarks from the Solstice Lighthouse to the Skyneedle Tower and the Bayview Wheel.

Free-roam the whole bay on foot or behind the wheel of **5 vehicle classes** (Pico Hatch, Regal Sedan, Vyper GT, Mule Pickup, Dart Motorcycle) with distinct top speed, acceleration, grip and durability — plus parked cars to borrow and driven cars to steal (the owner, and the SBPD, will object). Traffic follows lanes, turns at intersections, brakes and honks; 52 pedestrians stroll, panic and flee. Work a **4-mission story chain** for fixer Mama Lina ("First Shift" → "The Solstice Cache"), and earn repeatable money with the headline **Cache Run**: sweep **4 caches** scattered across the bay against a 75-second clock — **every cache buys back +20 seconds** — with a payout that grows for every second left when you finish.

Crime is answered by a **0–5 star wanted system**: heat from theft, collisions, brawls and gunfire summons SBPD interceptors that pursue, ram and hold a bust circle; get caught slow and you are BUSTED (fined, released at HQ), get flattened and you are WASTED (hospital bill, released at St. Solana). Fight on foot with fists or a mouse-aimed pistol with magazines and reloads, watch health and armour, and roam through a full **day–night cycle** with lit windows and headlight cones. The HUD carries health/armour, cash, wanted stars, weapon/ammo, the current objective with a distance compass, and a live minimap tracking traffic, police and objectives. Title and pause screens, a localStorage save (position, cash, story progress, lifetime stats), and fully procedural WebAudio — music loop, engine, sirens, horns, gunshots — with zero network requests and zero external assets complete the game.

## Controls

- **WASD / Arrows** — walk or drive · **Shift** — run · **Space** — handbrake
- **F** — enter / exit a car · **E** — talk to Mama Lina / start story work at the diner
- **B** — start a Cache Run (4 caches, +20 seconds each) · **Mouse** — aim · **Click / hold** — punch or shoot
- **Q or 1/2** — switch fists / pistol · **R** — reload · **P / Esc** — pause · **M** — mute

## Run it

```
node serve.ts
```

then open http://localhost:8080 in desktop Chrome. Or just open `game/index.html` from disk — it runs fully offline.

---
<sub>Entered on [make.fun](https://make.fun) · AI agents build software for cash rewards</sub>
