// Training history: kept on the phone (localStorage) and mirrored to Telegram
// CloudStorage when available, so it survives a cleared WebView or a new phone.
//
// Session record (compact on purpose, it is also what goes to the cloud):
// { id, t: start ms, d: duration s, n: title, x: [{ n: name, u: unit|null, h: 1 for holds,
//   s: [[value, weight|null, feel 0-3]] }] }   value = reps, or seconds for holds.

import { tg, tgAtLeast, store } from './util.js';
import { foldName } from './catalog.js';

const KEY = 'gymbuddy:history';
const MAX_LOCAL = 1500;
const CLOUD_MAX = 900; // CloudStorage allows 1024 keys per user and bot
const CHUNK = 4000;

let sessions = null;
const listeners = new Set();

function load() {
  if (sessions) return sessions;
  const raw = store.json(KEY, []);
  sessions = Array.isArray(raw) ? raw.filter(valid) : [];
  sessions.sort((a, b) => a.t - b.t);
  return sessions;
}

function valid(s) {
  return s && typeof s.id === 'string' && typeof s.t === 'number' && Array.isArray(s.x);
}

function persist() {
  while (sessions.length > MAX_LOCAL) sessions.shift();
  if (!store.set(KEY, JSON.stringify(sessions))) {
    // Storage full: drop the oldest tenth and try again.
    sessions.splice(0, Math.ceil(sessions.length / 10));
    store.set(KEY, JSON.stringify(sessions));
  }
}

function emit() { listeners.forEach((fn) => { try { fn(); } catch (e) {} }); }

export function onHistoryChange(fn) { listeners.add(fn); }

export function allSessions() { return load(); }

export function addSession(sess) {
  load();
  if (!valid(sess) || !sess.x.length) return;
  const i = sessions.findIndex((s) => s.id === sess.id);
  if (i >= 0) sessions[i] = sess; else sessions.push(sess);
  sessions.sort((a, b) => a.t - b.t);
  persist();
  cloudPut(sess);
  emit();
}

export function clearHistory() {
  load();
  const ids = sessions.map((s) => s.id);
  sessions = [];
  persist();
  cloudRemoveAll(ids);
  emit();
}

export function exportHistory() {
  return JSON.stringify({ app: 'gym_buddy', v: 1, exported: new Date().toISOString(), sessions: load() });
}

export function importHistory(text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data && data.sessions;
  if (!Array.isArray(list)) throw new Error('format');
  load();
  const known = new Set(sessions.map((s) => s.id));
  let added = 0;
  list.filter(valid).forEach((s) => {
    if (known.has(s.id)) return;
    sessions.push(s);
    known.add(s.id);
    added += 1;
    cloudPut(s);
  });
  sessions.sort((a, b) => a.t - b.t);
  persist();
  emit();
  return added;
}

// ---------- per-exercise queries ----------

// Sessions where this exercise appears, oldest first: [{ t, id, hold, unit, sets: [[v, w, f]] }]
export function exerciseLog(name, excludeId) {
  const f = foldName(name);
  const out = [];
  for (const s of load()) {
    if (s.id === excludeId) continue;
    for (const x of s.x) {
      if (foldName(x.n) === f && x.s && x.s.length) {
        out.push({ t: s.t, id: s.id, hold: !!x.h, unit: x.u || null, sets: x.s });
        break;
      }
    }
  }
  return out;
}

export function e1rm(w, r) {
  if (!(w > 0) || !(r > 0) || r > 12) return 0;
  return r === 1 ? w : w * (1 + r / 30);
}

// Best values from a list of [v, w] sets.
export function bestOf(sets, hold) {
  const b = { w: 0, e: 0, reps: 0, sec: 0, vol: 0, wReps: 0 };
  for (const st of sets) {
    const v = Number(st[0]) || 0;
    const w = Number(st[1]) || 0;
    if (hold) { if (v > b.sec) b.sec = v; continue; }
    if (w > 0) {
      if (w > b.w || (w === b.w && v > b.wReps)) { b.w = w; b.wReps = v; }
      const e = e1rm(w, v);
      if (e > b.e) b.e = e;
      b.vol += w * v;
    } else if (v > b.reps) b.reps = v;
  }
  return b;
}

export function records(name, excludeId) {
  const log = exerciseLog(name, excludeId);
  const r = { sessions: log.length, w: 0, wReps: 0, e: 0, reps: 0, sec: 0, vol: 0 };
  for (const entry of log) {
    const b = bestOf(entry.sets, entry.hold);
    if (b.w > r.w || (b.w === r.w && b.wReps > r.wReps)) { r.w = b.w; r.wReps = b.wReps; }
    if (b.e > r.e) r.e = b.e;
    if (b.reps > r.reps) r.reps = b.reps;
    if (b.sec > r.sec) r.sec = b.sec;
    if (b.vol > r.vol) r.vol = b.vol;
  }
  return r;
}

// ---------- Telegram CloudStorage mirror ----------

function cloud() {
  if (!tg || !tg.CloudStorage || !tgAtLeast('6.9')) return null;
  return tg.CloudStorage;
}

function cs(method, ...args) {
  const c = cloud();
  if (!c) return Promise.reject(new Error('no cloud'));
  return new Promise((resolve, reject) => {
    try {
      c[method](...args, (err, res) => (err ? reject(err) : resolve(res)));
    } catch (e) { reject(e); }
  });
}

function cloudPut(sess) {
  if (!cloud()) return Promise.resolve();
  const json = JSON.stringify(sess);
  if (json.length <= CHUNK) return cs('setItem', 's_' + sess.id, json).catch(() => {});
  const parts = [];
  for (let i = 0; i < json.length; i += CHUNK) parts.push(json.slice(i, i + CHUNK));
  return Promise.all(parts.map((p, i) => cs('setItem', 'p_' + sess.id + '_' + i, p)))
    .then(() => cs('setItem', 's_' + sess.id, '#' + parts.length))
    .catch(() => {});
}

function cloudRemoveAll(ids) {
  if (!cloud()) return;
  cs('getKeys').then((keys) => {
    const drop = keys.filter((k) => /^[sp]_/.test(k));
    for (let i = 0; i < drop.length; i += 50) cs('removeItems', drop.slice(i, i + 50)).catch(() => {});
  }).catch(() => {});
  return ids;
}

async function cloudGet(keys) {
  const out = {};
  for (let i = 0; i < keys.length; i += 20) {
    Object.assign(out, await cs('getItems', keys.slice(i, i + 20)));
  }
  return out;
}

let syncing = null;

// Two-way merge. Resolves with the number of sessions pulled from the cloud.
export function syncCloud() {
  if (!cloud()) return Promise.resolve(0);
  if (syncing) return syncing;
  syncing = (async () => {
    load();
    const keys = await cs('getKeys');
    const cloudIds = keys.filter((k) => k.startsWith('s_')).map((k) => k.slice(2));
    const local = new Set(sessions.map((s) => s.id));
    const missing = cloudIds.filter((id) => !local.has(id));
    let pulled = 0;
    if (missing.length) {
      const vals = await cloudGet(missing.map((id) => 's_' + id));
      for (const id of missing) {
        let json = vals['s_' + id];
        if (!json) continue;
        if (json[0] === '#') {
          const n = Number(json.slice(1));
          const partKeys = [];
          for (let i = 0; i < n; i++) partKeys.push('p_' + id + '_' + i);
          const parts = await cloudGet(partKeys);
          json = partKeys.map((k) => parts[k] || '').join('');
        }
        try {
          const s = JSON.parse(json);
          if (valid(s)) { sessions.push(s); pulled += 1; }
        } catch (e) {}
      }
      if (pulled) {
        sessions.sort((a, b) => a.t - b.t);
        persist();
        emit();
      }
    }
    // Push what the cloud does not have yet (newest first), within the key budget.
    const inCloud = new Set(cloudIds);
    const toPush = sessions.filter((s) => !inCloud.has(s.id)).slice(-CLOUD_MAX).reverse();
    for (const s of toPush) await cloudPut(s);
    // Keep under the key limit: drop the oldest sessions from the cloud only.
    const total = cloudIds.length + toPush.length;
    if (total > CLOUD_MAX) {
      const ordered = sessions.map((s) => s.id).filter((id) => inCloud.has(id) || toPush.some((p) => p.id === id));
      const drop = ordered.slice(0, total - CLOUD_MAX).map((id) => 's_' + id);
      for (let i = 0; i < drop.length; i += 50) await cs('removeItems', drop.slice(i, i + 50)).catch(() => {});
    }
    return pulled;
  })().catch(() => 0).finally(() => { syncing = null; });
  return syncing;
}

// Settings mirror (tiny, one key).
export function cloudSaveSettings(obj) {
  if (!cloud()) return;
  cs('setItem', 'cfg', JSON.stringify(obj)).catch(() => {});
}

export function cloudLoadSettings() {
  if (!cloud()) return Promise.resolve(null);
  return cs('getItem', 'cfg').then((v) => (v ? JSON.parse(v) : null)).catch(() => null);
}
