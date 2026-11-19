// Keyboard and mouse input for an on-foot / in-car open world.
// Held keys are exposed as a plain state object the simulation reads each
// step; one-shot presses (interact, enter car, pause, confirm, weapon swap,
// Cache Run) are queued as bit flags and taken exactly once by the loop.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_ENTER_CAR = 8;
export const ACTION_CACHE_RUN = 16;
export const ACTION_WEAPON = 32;
export const ACTION_RELOAD = 64;
export const ACTION_MUTE = 128;

const ACTION_KEYS = new Map([
  ['Space', ACTION_CONFIRM],
  ['Enter', ACTION_CONFIRM],
  ['KeyP', ACTION_PAUSE],
  ['Escape', ACTION_PAUSE],
  ['KeyE', ACTION_INTERACT],
  ['KeyF', ACTION_ENTER_CAR],
  ['KeyB', ACTION_CACHE_RUN],
  ['KeyQ', ACTION_WEAPON],
  ['Digit1', ACTION_WEAPON],
  ['Digit2', ACTION_WEAPON],
  ['KeyR', ACTION_RELOAD],
  ['KeyM', ACTION_MUTE],
]);

const HELD_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'KeyA', 'KeyD', 'KeyW', 'KeyS', 'ShiftLeft', 'ShiftRight', 'Space',
]);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false };

  window.addEventListener('keydown', (event) => {
    if (HELD_KEYS.has(event.code)) {
      held.add(event.code);
      event.preventDefault();
    }
    const action = ACTION_KEYS.get(event.code);
    if (action !== undefined) {
      if (!event.repeat) actions |= action;
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.down = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });

  return {
    mouse,
    /** Movement axes, each -1, 0 or 1: x is strafe/steer, y is forward/back. */
    axes() {
      const x = (held.has('ArrowRight') || held.has('KeyD') ? 1 : 0) - (held.has('ArrowLeft') || held.has('KeyA') ? 1 : 0);
      const y = (held.has('ArrowDown') || held.has('KeyS') ? 1 : 0) - (held.has('ArrowUp') || held.has('KeyW') ? 1 : 0);
      return { x, y };
    },
    running() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    handbrake() {
      return held.has('Space');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
