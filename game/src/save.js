// localStorage save: position, cash, story progress and lifetime stats.
// Saving is best-effort — private windows and disabled storage just mean the
// save lasts for the visit instead of between visits.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function storeSave(G) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      x: Math.round(G.player.x),
      y: Math.round(G.player.y),
      money: G.player.money,
      storyIndex: G.storyIndex,
      stats: G.stats,
    }));
  } catch {
    // Storage unavailable: nothing to do.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage unavailable: nothing to do.
  }
}
