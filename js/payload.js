// Session payload for Telegram.WebApp.sendData (max 4096 bytes).

import { round3, utf8len } from './util.js';

const LIMIT = 4096;
export const FEEL = { 1: 'facile', 2: 'ok', 3: 'dur' };

// programme: normalized programme; cells: per-exercise per-set state.
export function buildRaw({ programme, cells, started, ended, comment, formatTarget }) {
  return {
    type: 'gym_session',
    title: programme.title,
    started: new Date(started).toISOString(),
    duration_s: Math.max(0, Math.round((ended - started) / 1000)),
    comment: comment || '',
    exercises: programme.exercises.map((ex, i) => ({
      name: ex.name,
      target: formatTarget(ex),
      sets: cells[i].map((cell) => {
        const set = { done: !!cell.done };
        if (ex.seconds != null) set.seconds = round3(cell.seconds);
        else set.reps = round3(cell.reps);
        if (cell.weight != null) set.weight = round3(cell.weight);
        if (cell.done && cell.feel) set.rpe = FEEL[cell.feel];
        if (cell.done && cell.pr) set.pr = true;
        return set;
      })
    }))
  };
}

function packShortSet(set) {
  const o = { ok: set.done ? 1 : 0 };
  if (set.seconds != null) o.sec = set.seconds; else o.r = set.reps;
  if (set.weight != null) o.w = set.weight;
  if (set.rpe) o.f = set.rpe === 'facile' ? 1 : set.rpe === 'ok' ? 2 : 3;
  if (set.pr) o.pr = 1;
  return o;
}

function toShort(raw, withTarget) {
  return {
    t: 'gym_session',
    n: raw.title,
    s: raw.started,
    d: raw.duration_s,
    comment: raw.comment || '',
    e: raw.exercises.map((ex) => {
      const item = { n: ex.name };
      if (withTarget) item.g = ex.target;
      item.s = ex.sets.map(packShortSet);
      return item;
    })
  };
}

function clip(text, max) {
  const s = String(text || '');
  return s.length <= max ? s : s.slice(0, max).replace(/[\uD800-\uDBFF]$/, '');
}

function fitShort(raw) {
  const c = JSON.parse(JSON.stringify(raw));
  if (c.comment) {
    let lo = 0, hi = c.comment.length, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      c.comment = clip(raw.comment, mid);
      if (utf8len(JSON.stringify(toShort(c, false))) <= LIMIT) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    c.comment = clip(raw.comment, best);
    const trimmed = JSON.stringify(toShort(c, false));
    if (utf8len(trimmed) <= LIMIT) return trimmed;
    c.comment = '';
  }
  const packed = () => JSON.stringify(toShort(c, false));
  // Still too big: drop feel and record flags before dropping any set.
  if (utf8len(packed()) > LIMIT) c.exercises.forEach((ex) => ex.sets.forEach((s) => { delete s.rpe; delete s.pr; }));
  let guard = 0;
  while (utf8len(packed()) > LIMIT && guard++ < 10000) {
    let removed = false;
    for (let i = c.exercises.length - 1; i >= 0; i--) {
      if (c.exercises[i].sets.length) {
        c.exercises[i].sets.pop();
        removed = true;
        if (!c.exercises[i].sets.length) c.exercises.splice(i, 1);
        break;
      }
    }
    if (!removed) break;
  }
  const obj = toShort(c, false);
  let json = JSON.stringify(obj);
  if (utf8len(json) > LIMIT) { obj.n = String(obj.n || '').slice(0, 40); json = JSON.stringify(obj); }
  while (utf8len(json) > LIMIT && obj.e.length) { obj.e.pop(); json = JSON.stringify(obj); }
  return json;
}

export function encodePayload(raw) {
  const full = JSON.stringify(raw);
  if (utf8len(full) <= LIMIT) return { json: full, short: false };
  const withTarget = JSON.stringify(toShort(raw, true));
  if (utf8len(withTarget) <= LIMIT) return { json: withTarget, short: true };
  const bare = JSON.stringify(toShort(raw, false));
  if (utf8len(bare) <= LIMIT) return { json: bare, short: true };
  return { json: fitShort(raw), short: true };
}
