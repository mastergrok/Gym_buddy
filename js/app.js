// Gym Buddy — Telegram Mini App to log a gym session.

import {
  tg, tgAtLeast, round3, fr, parseNum, fmtClock, fmtMinSec, daysAgo, hash32, store, el,
  hapticImpact, hapticNotify, hapticAlarm, hapticSelect, primeAudio, blip, beep, fanfare
} from './util.js';
import { exerciseInfo, REST_CLASS, weightStep, plateBreakdown } from './catalog.js';
import { addSession, exerciseLog, records, e1rm, syncCloud, onHistoryChange } from './history.js';
import { buildRaw, encodePayload } from './payload.js';
import { settings, saveSettings, pullCloudSettings } from './settings.js';
import { openSheet, closeSheet, sheetHead, sheetOpen, toast } from './sheets.js';
import * as panels from './panels.js';
import { displayTarget, miniPlates, plateText } from './format.js';

const STALE_MS = 6 * 3600 * 1000; // an untouched session older than this is archived, not resumed
const FEEL_EMOJI = { 1: '😌', 2: '🙂', 3: '🥵' };
const FEEL_LABEL = { 1: 'facile', 2: 'ok', 3: 'dur' };

const DEFAULT_PROGRAMME = {
  title: 'Séance',
  exercises: [
    { name: 'Développé couché barre', sets: 4, reps: 10, weight: 60, unit: 'kg', rest: 120 },
    { name: 'Dips', sets: 4, reps: 10, rest: 90 },
    { name: 'Développé militaire haltères', sets: 3, reps: 12, weight: 17.5, unit: 'kg par bras', rest: 90 },
    { name: 'Élévations latérales haltères', sets: 3, reps: 12, weight: 10, unit: 'kg', rest: 60 },
    { name: 'Pike push-ups', sets: 3, reps: 10, rest: 60 },
    { name: 'L-sit', sets: 4, seconds: 15, rest: 60 },
    { name: 'ATR libre', sets: 5, seconds: 10, rest: 60 }
  ]
};

// ---------------------------------------------------------------- programme

function decodeParam(p) {
  if (!p) return null;
  try {
    let s = String(p).trim().replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return normalizeProgramme(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  } catch (e) {
    return null;
  }
}

export function normalizeProgramme(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.exercises)) return null;
  const exercises = raw.exercises.map(normalizeExercise).filter(Boolean);
  if (!exercises.length) return null;
  let title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) title = 'Séance';
  const prog = { title: title.slice(0, 120), exercises };
  const wt = Math.round(Number(raw.week_target));
  if (isFinite(wt) && wt >= 1 && wt <= 14) prog.week_target = wt;
  return prog;
}

function normalizeExercise(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const sets = Math.round(Number(raw.sets));
  if (!isFinite(sets) || sets < 1 || sets > 100) return null;
  let seconds = null;
  let reps = null;
  if (raw.seconds != null && raw.seconds !== '') {
    seconds = Number(raw.seconds);
    if (!isFinite(seconds) || seconds < 0) return null;
  } else if (raw.reps != null && raw.reps !== '') {
    reps = Number(raw.reps);
    if (!isFinite(reps) || reps < 0) return null;
  } else return null;
  let weight = null;
  if (raw.weight != null && raw.weight !== '') {
    weight = Number(raw.weight);
    if (!isFinite(weight) || weight < 0) return null;
  }
  let unit = typeof raw.unit === 'string' && raw.unit.trim() ? raw.unit.trim() : null;
  // rest is optional: missing means "let the app choose" (auto rest).
  let rest = null;
  if (raw.rest != null && raw.rest !== '' && isFinite(Number(raw.rest)) && Number(raw.rest) >= 0) rest = Math.round(Number(raw.rest));
  const ex = { name, sets, rest };
  if (seconds != null) ex.seconds = round3(seconds); else ex.reps = round3(reps);
  if (weight != null) { ex.weight = round3(weight); ex.unit = unit || 'kg'; }
  Object.defineProperty(ex, 'info', { value: exerciseInfo(name), enumerable: false });
  return ex;
}

function canonical(prog) {
  return JSON.stringify({
    title: prog.title,
    exercises: prog.exercises.map((ex) => {
      const o = { name: ex.name, sets: ex.sets, rest: ex.rest };
      if (ex.seconds != null) o.seconds = ex.seconds; else o.reps = ex.reps;
      if (ex.weight != null) { o.weight = ex.weight; o.unit = ex.unit || 'kg'; }
      return o;
    })
  });
}

function loadProgramme() {
  let p = null;
  try { p = new URLSearchParams(location.search).get('p'); } catch (e) {}
  return decodeParam(p) || normalizeProgramme(JSON.parse(JSON.stringify(DEFAULT_PROGRAMME)));
}

// Text for the bot (dot decimals, unchanged format).
function payloadTarget(ex) {
  const n = (v) => String(round3(v));
  let t = ex.sets + ' × ' + (ex.seconds != null ? n(ex.seconds) + ' s' : n(ex.reps));
  if (ex.weight != null) t += ' · ' + n(ex.weight) + ' ' + (ex.unit || 'kg');
  return t;
}

// ---------------------------------------------------------------- state

const programme = loadProgramme();
if (programme.week_target && programme.week_target !== settings.weekTarget) {
  settings.weekTarget = programme.week_target;
  saveSettings();
}
const CANON = canonical(programme);
const storageKey = 'gymbuddy:v1:' + hash32(CANON);

let started = Date.now();
let cells = programme.exercises.map(blankRow);
let rest = null;       // { mode: 'rest'|'feel', i, s, start, base, adj, manual, until, reason, warned, done }
let hold = null;       // { i, s, phase, until, holdMs, shown }
let restTick = 0;
let holdTick = 0;
let clockTick = 0;
let hideTimer = 0;
let sealed = false;
let endedAt = 0;
let summarySent = false;
let lastClock = -1;
const recCache = new Map();

const list = document.getElementById('exercise-list');
const sid = () => started.toString(36);

function blankRow(ex) {
  const row = [];
  for (let s = 0; s < ex.sets; s++) row.push(blankCell(ex));
  return row;
}

function blankCell(ex) {
  return {
    done: false,
    reps: ex.reps != null ? ex.reps : null,
    seconds: ex.seconds != null ? ex.seconds : null,
    weight: ex.weight != null ? ex.weight : null,
    feel: 0,
    pr: '',
    at: 0
  };
}

function sanitizeCell(cell, ex) {
  const base = blankCell(ex);
  if (!cell || typeof cell !== 'object') return base;
  base.done = !!cell.done;
  if (ex.seconds != null && cell.seconds != null && isFinite(Number(cell.seconds))) base.seconds = round3(cell.seconds);
  if (ex.reps != null && cell.reps != null && isFinite(Number(cell.reps))) base.reps = round3(cell.reps);
  if (Object.prototype.hasOwnProperty.call(cell, 'weight')) {
    if (cell.weight == null || cell.weight === '') base.weight = null;
    else if (isFinite(Number(cell.weight)) && Number(cell.weight) >= 0) base.weight = round3(cell.weight);
  }
  if ([1, 2, 3].includes(cell.feel)) base.feel = cell.feel;
  if (typeof cell.pr === 'string') base.pr = cell.pr;
  if (typeof cell.at === 'number') base.at = cell.at;
  return base;
}

const counts = () => {
  let done = 0, total = 0;
  cells.forEach((row) => row.forEach((c) => { total += 1; if (c.done) done += 1; }));
  return { done, total };
};
const allDone = () => cells.every((row) => row.every((c) => c.done));

// ---------------------------------------------------------------- persistence

function save() {
  if (sealed) return;
  store.set(storageKey, JSON.stringify({
    v: 1,
    canon: CANON,
    started,
    active: Date.now(),
    rest: rest && rest.mode === 'rest' && !rest.done ? rest : null,
    hold: hold ? { i: hold.i, s: hold.s, phase: hold.phase, until: hold.until, holdMs: hold.holdMs } : null,
    cells
  }));
}

// Session record for the history (only finished sets).
function makeRecord(prog, rows, start, end) {
  const x = [];
  prog.exercises.forEach((ex, i) => {
    const isHold = ex.seconds != null;
    const s = (rows[i] || []).filter((c) => c.done).map((c) => [
      round3(isHold ? c.seconds : c.reps) || 0,
      c.weight != null ? round3(c.weight) : null,
      c.feel || 0
    ]);
    if (!s.length) return;
    const item = { n: ex.name, u: ex.unit || (s.some((v) => v[1] != null) ? 'kg' : null), s };
    if (isHold) item.h = 1;
    x.push(item);
  });
  if (!x.length) return null;
  return { id: start.toString(36), t: start, d: Math.max(0, Math.round((end - start) / 1000)), n: prog.title, x };
}

function archiveSaved(data) {
  try {
    const prog = normalizeProgramme(JSON.parse(data.canon));
    if (!prog || !Array.isArray(data.cells)) return;
    const rows = prog.exercises.map((ex, i) => (Array.isArray(data.cells[i]) ? data.cells[i] : []).map((c) => sanitizeCell(c, ex)));
    const doneAts = rows.flat().filter((c) => c.done && c.at).map((c) => c.at);
    const end = doneAts.length ? Math.max(...doneAts) : (data.active || data.started);
    const rec = makeRecord(prog, rows, data.started, end);
    if (rec) addSession(rec);
  } catch (e) {}
}

// Sessions left open (app closed without "Terminer") go to the history instead of being lost.
function archiveOrphans() {
  for (const key of store.keys()) {
    if (!key || !key.startsWith('gymbuddy:v1:') || key === storageKey) continue;
    const data = store.json(key, null);
    if (!data || typeof data.started !== 'number') { store.del(key); continue; }
    if (Date.now() - (data.active || data.started) > STALE_MS) {
      archiveSaved(data);
      store.del(key);
    }
  }
}

function restore() {
  const data = store.json(storageKey, null);
  if (!data || data.v !== 1 || data.canon !== CANON) return;
  // Same programme as a previous day: archive the old one, start fresh.
  if (Date.now() - (data.active || data.started || 0) > STALE_MS) {
    archiveSaved(data);
    store.del(storageKey);
    return;
  }
  if (!Array.isArray(data.cells) || data.cells.length !== programme.exercises.length) return;
  const next = [];
  for (let i = 0; i < programme.exercises.length; i++) {
    const ex = programme.exercises[i];
    if (!Array.isArray(data.cells[i]) || data.cells[i].length !== ex.sets) return;
    next.push(data.cells[i].map((c) => sanitizeCell(c, ex)));
  }
  cells = next;
  if (typeof data.started === 'number' && data.started > 0 && data.started <= Date.now() + 2000) started = data.started;
  const r = data.rest || (data.restRunning ? { mode: 'rest', i: data.restIndex, s: -1, until: data.restUntil, start: data.restUntil - data.restTotal, base: data.restTotal / 1000, adj: 0, manual: 0 } : null);
  if (r && typeof r.until === 'number' && r.until > Date.now() && programme.exercises[r.i]) {
    rest = Object.assign({ reason: '', warned: false, done: false }, r, { mode: 'rest' });
  }
  restoreHold(data.hold);
}

function restoreHold(saved) {
  if (!saved || typeof saved !== 'object') return;
  const { i, s } = saved;
  const ex = programme.exercises[i];
  if (!ex || ex.seconds == null || !cells[i] || !cells[i][s] || cells[i][s].done) return;
  const holdMs = Number(saved.holdMs);
  let until = Number(saved.until);
  if (!isFinite(holdMs) || holdMs <= 0 || !isFinite(until)) return;
  let phase = saved.phase === 'hold' ? 'hold' : 'ready';
  if (phase === 'ready' && until <= Date.now()) {
    const late = Date.now() - until;
    if (late >= holdMs) { queueMicrotask(() => toggleSet(i, s)); return; }
    phase = 'hold';
    until = Date.now() + (holdMs - late);
  } else if (phase === 'hold' && until <= Date.now()) {
    queueMicrotask(() => toggleSet(i, s));
    return;
  }
  hold = { i, s, phase, until, holdMs, shown: Math.ceil(Math.max(0, until - Date.now()) / 1000) };
}

// ---------------------------------------------------------------- records

function recFor(i) {
  if (!recCache.has(i)) recCache.set(i, records(programme.exercises[i].name, sid()));
  return recCache.get(i);
}

// Recompute 🏆 flags for one exercise. Returns indexes of sets that just became records.
function updatePRs(i) {
  const ex = programme.exercises[i];
  const r = recFor(i);
  const before = cells[i].map((c) => c.pr);
  cells[i].forEach((c) => { c.pr = ''; });
  if (!r.sessions) return []; // first time: nothing to beat
  const best = { w: r.w, e: r.e, reps: r.reps, sec: r.sec };
  const order = cells[i].map((c, s) => ({ c, s })).filter((o) => o.c.done)
    .sort((a, b) => (a.c.at || 0) - (b.c.at || 0) || a.s - b.s);
  for (const { c } of order) {
    if (ex.seconds != null) {
      if (c.seconds > best.sec) { c.pr = 's'; best.sec = c.seconds; }
      continue;
    }
    const w = Number(c.weight) || 0;
    const reps = Number(c.reps) || 0;
    if (w > 0 && reps > 0) {
      const e = e1rm(w, reps);
      // Only beat a real previous weighted best (first time with a load is not a record).
      if (best.w > 0 && w > best.w) c.pr = 'w';
      else if (best.e > 0 && e > best.e + 0.05) c.pr = 'e';
      if (w > best.w) best.w = w;
      if (e > best.e) best.e = e;
    } else if (w === 0 && reps > best.reps && !(r.w > 0 && ex.weight != null)) {
      c.pr = 'r';
      best.reps = reps;
    }
  }
  return cells[i].map((c, s) => (c.pr && c.pr !== before[s] ? s : -1)).filter((s) => s >= 0);
}

export function prText(ex, c) {
  if (c.pr === 's') return 'Record de maintien\u00a0: ' + fr(c.seconds) + '\u00a0s';
  if (c.pr === 'r') return 'Record\u00a0: ' + fr(c.reps) + ' répétitions';
  if (c.pr === 'w') return 'Record de charge\u00a0: ' + fr(c.weight) + '\u00a0kg × ' + fr(c.reps);
  if (c.pr === 'e') return 'Record\u00a0: ' + fr(c.weight) + '\u00a0kg × ' + fr(c.reps) + ' (1RM estimé ' + fr(Math.round(e1rm(c.weight, c.reps) * 2) / 2) + '\u00a0kg)';
  return '';
}

function celebrate(i, s) {
  const ex = programme.exercises[i];
  toast('🏆 ' + prText(ex, cells[i][s]), { gold: true, ms: 3600 });
  fanfare();
  hapticNotify('success');
  announce('Nouveau record, ' + ex.name);
}

// ---------------------------------------------------------------- rendering

function animSrc(key) {
  return './assets/exercises/' + settings.avatar + '/' + key + '.webp';
}

function buildAnim(ex) {
  const btn = el('button', { type: 'button', class: 'ex-anim', 'data-act': 'anim', 'aria-label': 'Voir l’animation : ' + ex.name });
  const info = ex.info;
  if (info.key && !prefersStill()) {
    const img = el('img', { src: animSrc(info.key), alt: '', loading: 'lazy', decoding: 'async', width: '76', height: '76' });
    img.addEventListener('error', () => img.replaceWith(el('span', { class: 'anim-none', text: '🏋️' })), { once: true });
    btn.append(img);
    if (info.approx) btn.append(el('span', { class: 'approx', title: 'Mouvement proche', text: '≈' }));
  } else {
    btn.append(el('span', { class: 'anim-none', text: info.key ? '🏋️' : '💪' }));
  }
  return btn;
}

function prefersStill() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}

function restLabelFor(i) {
  const ex = programme.exercises[i];
  if (settings.restMode !== 'auto' && ex.rest != null) return 'Repos ' + fmtMinSec(ex.rest * 1000);
  const cls = REST_CLASS[ex.info.restClass] || REST_CLASS.unknown;
  return 'Repos auto ' + fmtMinSec(restPlan(i, 0).base * 1000) + ' · ' + cls.label;
}

function nextUndone(i) {
  return cells[i].findIndex((c) => !c.done);
}

function currentWeight(i) {
  const s = nextUndone(i);
  const c = s >= 0 ? cells[i][s] : cells[i][cells[i].length - 1];
  return c && c.weight != null ? c.weight : null;
}

function summarizeSets(sets, isHold) {
  const vals = sets.map((v) => fr(v[0]) + (isHold ? ' s' : ''));
  const ws = sets.map((v) => v[1]);
  let txt;
  if (ws.every((w) => w == null)) txt = vals.join(' · ');
  else if (ws.every((w) => w === ws[0])) txt = fr(ws[0]) + ' kg × ' + vals.join(', ');
  else txt = sets.map((v) => (v[1] != null ? fr(v[1]) + '×' : '') + fr(v[0])).join(' · ');
  const feels = sets.map((v) => v[2]).filter(Boolean);
  if (feels.includes(3)) txt += ' 🥵';
  else if (feels.length && feels.every((f) => f === 1)) txt += ' 😌';
  return txt;
}

function buildLast(i) {
  const ex = programme.exercises[i];
  const log = exerciseLog(ex.name, sid());
  if (!log.length) return null;
  const last = log[log.length - 1];
  const box = el('div', { class: 'last' },
    el('span', { class: 'last-text' }, '↺ ', el('b', { text: daysAgo(last.t) }), '\u00a0: ' + summarizeSets(last.sets, last.hold)));
  if (last.hold || sealed) return box;
  const top = Math.max(0, ...last.sets.map((v) => Number(v[1]) || 0));
  if (!(top > 0) || nextUndone(i) < 0) return box;
  const cur = currentWeight(i);
  const step = weightStep(ex.info, top, settings);
  const up = round3(top + step);
  const chips = el('div', { class: 'last-chips' });
  if (cur !== top) {
    chips.append(el('button', { type: 'button', class: 'chip', 'data-act': 'setw', 'data-i': i, 'data-w': top, 'aria-label': 'Reprendre ' + fr(top) + ' kg', text: '= ' + fr(top) }));
  }
  if (cur !== up) {
    const atTop = last.sets.filter((v) => Number(v[1]) === top);
    const hitReps = ex.reps == null || atTop.every((v) => v[0] >= ex.reps);
    const notHard = atTop.every((v) => v[2] !== 3);
    const easy = hitReps && notHard && atTop.some((v) => v[2]);
    chips.append(el('button', {
      type: 'button', class: 'chip' + (easy ? ' suggest' : ''), 'data-act': 'setw', 'data-i': i, 'data-w': up,
      'aria-label': 'Passer à ' + fr(up) + ' kg' + (easy ? ', suggéré' : ''), text: (easy ? '💡 ' : '') + '+' + fr(step) + ' kg'
    }));
  }
  if (chips.children.length) box.append(chips);
  return box;
}

function buildPlatesLine(i) {
  const ex = programme.exercises[i];
  if (ex.info.equip !== 'bar' || sealed) return null;
  const w = currentWeight(i);
  if (!(w > 0)) return null;
  const pb = plateBreakdown(w, settings.bar, settings.plates);
  return el('button', { type: 'button', class: 'plates-line', 'data-act': 'plates', 'data-w': w, 'aria-label': 'Disques pour ' + fr(w) + ' kg' },
    miniPlates(pb.perSide || []),
    el('span', { text: '🏋️ ' + fr(w) + '\u00a0kg → par côté\u00a0: ' + plateText(pb, settings.bar) }));
}

function setText(c, ex) {
  if (ex.seconds != null) return fr(c.seconds) + ' s';
  return fr(c.reps) + (c.weight != null ? ' × ' + fr(c.weight) : '');
}

function differs(c, ex) {
  if (ex.seconds != null ? c.seconds !== ex.seconds : c.reps !== ex.reps) return true;
  return c.weight !== (ex.weight != null ? ex.weight : null);
}

function buildSet(i, s) {
  const ex = programme.exercises[i];
  const c = cells[i][s];
  const cls = ['set'];
  if (c.done && c.pr) cls.push('pr');
  if (hold && hold.i === i && hold.s === s) cls.push('timing');
  const label = 'Série ' + (s + 1) + ' sur ' + ex.sets + ', ' + setText(c, ex) + ', ' + (c.done ? 'faite' : 'à faire') +
    (c.done && c.feel ? ', ressenti ' + FEEL_LABEL[c.feel] : '') + (c.done && c.pr ? ', record' : '');
  const btn = el('button', { type: 'button', class: cls.join(' '), 'data-i': i, 'data-s': s, 'aria-pressed': String(c.done), 'aria-label': label });
  if (c.done) btn.append(el('span', { class: 'set-mark', 'aria-hidden': 'true', text: c.pr ? '🏆' : '✅' }));
  btn.append(el('span', { class: 'set-n', text: String(s + 1) }));
  btn.append(el('span', { class: 'set-actual' + (!c.done && differs(c, ex) ? ' changed' : ''), text: setText(c, ex) }));
  if (c.done && c.feel) btn.append(el('span', { class: 'set-feel', 'aria-hidden': 'true', text: FEEL_EMOJI[c.feel] }));
  const edit = el('button', { type: 'button', class: 'edit', 'data-act': 'edit', 'data-i': i, 'data-s': s, 'aria-label': 'Modifier la série ' + (s + 1) + ' de ' + ex.name, text: '✎' });
  return el('div', { class: 'set-wrap' }, btn, edit);
}

function buildHoldLaunch(i) {
  const ex = programme.exercises[i];
  if (ex.seconds == null || sealed) return null;
  const running = hold && hold.i === i;
  const s = running ? hold.s : nextUndone(i);
  if (s < 0) return null;
  if (running) {
    return el('button', { type: 'button', class: 'hold-launch', 'data-act': 'hold-cancel', text: 'Annuler le chrono', 'aria-label': 'Annuler le chrono de ' + ex.name });
  }
  const secs = cells[i][s].seconds != null ? cells[i][s].seconds : ex.seconds;
  return el('button', {
    type: 'button', class: 'hold-launch', 'data-act': 'hold', 'data-i': i, 'data-s': s,
    text: '⏱ Chrono · série ' + (s + 1) + ' · ' + fr(secs) + ' s',
    'aria-label': 'Lancer le chrono de la série ' + (s + 1) + ' de ' + ex.name + ', ' + fr(secs) + ' secondes'
  });
}

function buildCard(i, old) {
  const ex = programme.exercises[i];
  const doneCount = cells[i].filter((c) => c.done).length;
  const cls = ['exercise'];
  if (doneCount === ex.sets) cls.push('complete');
  if (rest && rest.mode === 'rest' && !rest.done && rest.i === i) cls.push('resting');
  const card = el('article', { class: cls.join(' '), 'data-i': i });
  const anim = (old && old.querySelector('.ex-anim')) || buildAnim(ex);
  card.append(el('div', { class: 'ex-head' },
    anim,
    el('div', { class: 'ex-title' },
      el('h2', { text: ex.name }),
      el('div', { class: 'ex-target', text: displayTarget(ex) }),
      el('div', { class: 'ex-meta', text: restLabelFor(i) })),
    el('div', { class: 'ex-side' },
      el('span', { class: 'ex-count', text: doneCount + ' / ' + ex.sets }),
      el('button', { type: 'button', class: 'ex-hist', 'data-act': 'hist', 'data-i': i, 'aria-label': 'Historique et records : ' + ex.name, text: '📈' }))));
  const last = buildLast(i);
  if (last) card.append(last);
  const plates = buildPlatesLine(i);
  if (plates) card.append(plates);
  const sets = el('div', { class: 'sets' });
  cells[i].forEach((c, s) => sets.append(buildSet(i, s)));
  card.append(sets);
  const launch = buildHoldLaunch(i);
  if (launch) card.append(launch);
  return card;
}

// Replace one card in place: the rest of the page does not move.
function renderCard(i, freshAnim) {
  const old = list.querySelector('.exercise[data-i="' + i + '"]');
  const card = buildCard(i, freshAnim ? null : old);
  if (old) old.replaceWith(card); else list.append(card);
}

function renderCards(freshAnim) {
  if (!list.children.length) {
    list.append(...programme.exercises.map((ex, i) => buildCard(i, null)));
    return;
  }
  programme.exercises.forEach((ex, i) => renderCard(i, freshAnim));
}

function renderHeader() {
  document.getElementById('session-title').textContent = programme.title;
  document.title = programme.title;
  const c = counts();
  const label = document.getElementById('progress-label');
  label.textContent = c.done + ' / ' + c.total + ' ' + (c.total === 1 ? 'série' : 'séries');
  label.setAttribute('aria-label', c.done + ' séries faites sur ' + c.total);
  const bar = document.getElementById('progress');
  bar.setAttribute('aria-valuemax', String(c.total));
  bar.setAttribute('aria-valuenow', String(c.done));
  document.getElementById('progress-fill').style.width = c.total ? (c.done / c.total) * 100 + '%' : '0%';
}

function renderAll() {
  renderHeader();
  renderCards();
  renderRest();
  renderHold();
}

// Bottom padding follows the floating bars, so the last set is never hidden.
const pad = () => {
  const r = document.getElementById('rest-bar');
  const h = document.getElementById('hold-bar');
  const px = Math.max(r.hidden ? 0 : r.offsetHeight, h.hidden ? 0 : h.offsetHeight + 12);
  document.documentElement.style.setProperty('--bottom-pad', px + 'px');
};
if (window.ResizeObserver) {
  const ro = new ResizeObserver(pad);
  ro.observe(document.getElementById('rest-bar'));
  ro.observe(document.getElementById('hold-bar'));
}

// ---------------------------------------------------------------- clock

function tickClock() {
  if (sealed) return;
  const sec = Math.max(0, Math.floor((Date.now() - started) / 1000));
  if (sec === lastClock) return;
  lastClock = sec;
  const node = document.getElementById('stopwatch');
  node.textContent = fmtClock(sec);
  node.setAttribute('datetime', 'PT' + sec + 'S');
}

// ---------------------------------------------------------------- rest

function restPlan(i, s) {
  const ex = programme.exercises[i];
  if (settings.restMode !== 'auto' && ex.rest != null) return { base: ex.rest, reason: '' };
  const key = ex.info.restClass || 'unknown';
  const cls = REST_CLASS[key] || REST_CLASS.unknown;
  let base = cls.s;
  const cell = cells[i][s] || cells[i][0];
  const reps = ex.seconds == null && cell ? Number(cell.reps) : null;
  if (reps != null && reps > 0) {
    if (reps <= 5 && key === 'heavy') base += 60;
    else if (reps <= 5 && key === 'compound') base += 30;
    else if (reps >= 15 && (key === 'iso' || key === 'compound')) base -= 15;
  }
  return { base, reason: 'auto · ' + cls.label };
}

function feelAdj(feel) {
  if (!settings.feelAdjust) return 0;
  return feel === 3 ? 30 : feel === 1 ? -15 : 0;
}

function restUntil(r) {
  return r.start + Math.max(10, r.base + r.adj) * 1000 + r.manual;
}

function startRest(i, s) {
  const plan = restPlan(i, s);
  rest = { mode: 'rest', i, s, start: Date.now(), base: plan.base, reason: plan.reason, adj: feelAdj(cells[i][s].feel), manual: 0, warned: false, done: false };
  rest.until = restUntil(rest);
  clearTimeout(hideTimer);
  announce('Repos ' + Math.round((rest.until - rest.start) / 1000) + ' secondes');
  if (!restTick) restTick = setInterval(tickRest, 200);
}

function startFeelOnly(i, s) {
  rest = { mode: 'feel', i, s, done: false };
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (rest && rest.mode === 'feel') { rest = null; renderRest(); } }, 9000);
}

function tickRest() {
  if (!rest || rest.mode !== 'rest' || rest.done) return;
  const left = rest.until - Date.now();
  if (left <= 0) { completeRest(); return; }
  if (settings.restWarn && !rest.warned && left <= 10000 && rest.until - rest.start >= 30000) {
    rest.warned = true;
    hapticImpact('medium');
    blip(660);
  }
  renderRest();
}

function completeRest() {
  if (!rest || rest.mode !== 'rest' || rest.done) return;
  rest.done = true;
  if (sealed) { rest = null; renderRest(); return; }
  save();
  hapticAlarm();
  beep();
  announce('Repos terminé');
  renderRest();
  syncResting();
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => { if (rest && rest.done) { rest = null; renderRest(); } }, 4000);
}

function adjustRest(deltaMs) {
  if (!rest || rest.mode !== 'rest' || rest.done) return;
  primeAudio();
  rest.manual += deltaMs;
  rest.until = restUntil(rest);
  if (rest.until <= Date.now()) { completeRest(); return; }
  if (rest.until - Date.now() > 10000) rest.warned = false;
  save();
  renderRest();
}

function skipRest() {
  if (!rest) return;
  rest = null;
  clearTimeout(hideTimer);
  save();
  renderRest();
  syncResting();
}

function setFeel(feel) {
  if (!rest) return;
  const c = cells[rest.i] && cells[rest.i][rest.s];
  if (!c) return;
  c.feel = c.feel === feel ? 0 : feel;
  hapticSelect();
  if (rest.mode === 'rest' && !rest.done) {
    rest.adj = feelAdj(c.feel);
    rest.until = restUntil(rest);
    if (rest.until <= Date.now()) completeRest();
  } else if (rest.mode === 'feel') {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (rest && rest.mode === 'feel') { rest = null; renderRest(); } }, 900);
  }
  save();
  renderCard(rest.i);
  renderRest();
}

function syncResting() {
  list.querySelectorAll('.exercise').forEach((card) => {
    card.classList.toggle('resting', !!(rest && rest.mode === 'rest' && !rest.done && Number(card.dataset.i) === rest.i));
  });
}

function renderRest() {
  const bar = document.getElementById('rest-bar');
  if (!rest || sealed) {
    bar.hidden = true;
    bar.className = '';
    pad();
    return;
  }
  bar.hidden = false;
  const ex = programme.exercises[rest.i];
  const c = cells[rest.i] && cells[rest.i][rest.s];
  bar.className = rest.mode === 'feel' ? 'feel-only' : rest.done ? 'is-done' : '';
  const label = document.getElementById('rest-label');
  const time = document.getElementById('rest-time');
  if (rest.mode === 'feel') {
    label.textContent = ex ? ex.name : '';
    time.textContent = 'Série ' + (rest.s + 1) + ' validée';
  } else if (rest.done) {
    const ni = nextTarget();
    label.textContent = ni ? 'À toi : ' + ni : 'Repos terminé';
    time.textContent = 'Go !';
  } else {
    const left = Math.max(0, rest.until - Date.now());
    // Most useful first: the label is cut on small screens.
    const parts = ['Repos'];
    if (rest.adj > 0) parts.push('+' + rest.adj + ' s, série dure');
    if (rest.adj < 0) parts.push('−' + -rest.adj + ' s, série facile');
    if (rest.reason) parts.push(rest.reason);
    if (ex) parts.push(ex.name);
    label.textContent = parts.join(' · ');
    time.textContent = fmtMinSec(left);
    const total = Math.max(1, rest.until - rest.start);
    document.getElementById('rest-progress-fill').style.width = Math.max(0, Math.min(100, (left / total) * 100)) + '%';
  }
  const feelRow = document.getElementById('feel-row');
  feelRow.hidden = !c || rest.s < 0;
  if (c) {
    document.getElementById('feel-q').textContent = 'Série ' + (rest.s + 1) + ' ?';
    feelRow.querySelectorAll('.feel').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.feel) === c.feel)));
  }
  pad();
}

// Next set to do: same exercise first, then the following ones, then anything left.
function nextTarget() {
  const n = programme.exercises.length;
  const from = rest ? rest.i : 0;
  for (let k = 0; k < n; k++) {
    const i = (from + k) % n;
    const s = nextUndone(i);
    if (s >= 0) {
      const ex = programme.exercises[i];
      return ex.name + ' · série ' + (s + 1) + ' (' + setText(cells[i][s], ex) + ')';
    }
  }
  return '';
}

// ---------------------------------------------------------------- holds

function hideHold() {
  document.getElementById('hold-bar').hidden = true;
  pad();
}

function holdSeconds(i, s) {
  const ex = programme.exercises[i];
  const c = cells[i] && cells[i][s];
  const n = c && c.seconds != null ? Number(c.seconds) : Number(ex && ex.seconds);
  return isFinite(n) && n > 0 ? n : 0;
}

function clearHold() {
  hold = null;
  if (holdTick) { clearInterval(holdTick); holdTick = 0; }
  hideHold();
}

function renderHold() {
  if (!hold || sealed) { hideHold(); return; }
  const bar = document.getElementById('hold-bar');
  bar.hidden = false;
  const ex = programme.exercises[hold.i];
  const left = Math.max(0, hold.until - Date.now());
  document.getElementById('hold-label').textContent = (hold.phase === 'ready' ? 'Prépare-toi' : 'Maintiens') + ' · ' + (ex ? ex.name : '') + ' · série ' + (hold.s + 1);
  const s = Math.ceil(left / 1000);
  document.getElementById('hold-time').textContent = s >= 60 ? fmtMinSec(left) : String(s);
  const total = hold.phase === 'ready' ? 3000 : hold.holdMs || 1;
  document.getElementById('hold-progress-fill').style.width = Math.max(0, Math.min(100, (left / total) * 100)) + '%';
  pad();
}

function startHold(i, s) {
  if (sealed) return;
  const ex = programme.exercises[i];
  if (!ex || ex.seconds == null || !cells[i][s] || cells[i][s].done) return;
  primeAudio();
  const holdMs = Math.round(holdSeconds(i, s) * 1000);
  if (holdMs < 400) { toggleSet(i, s); return; }
  if (rest) { rest = null; renderRest(); }
  hold = { i, s, phase: 'ready', until: Date.now() + 3000, holdMs, shown: 3 };
  hapticImpact('medium');
  blip(740);
  save();
  renderHold();
  renderCard(i);
  announce('Prépare-toi, ' + ex.name);
  if (!holdTick) holdTick = setInterval(tickHold, 80);
}

function tickHold() {
  if (!hold) return;
  const left = hold.until - Date.now();
  if (left <= 0) {
    if (hold.phase === 'ready') {
      hold.phase = 'hold';
      hold.until = Date.now() + hold.holdMs;
      hold.shown = Math.ceil(hold.holdMs / 1000);
      hapticImpact('heavy');
      blip(880);
      save();
      renderHold();
      announce('Maintiens');
    } else {
      const { i, s } = hold;
      clearHold();
      hapticNotify('success');
      beep();
      announce('Maintien terminé');
      if (!sealed && !cells[i][s].done) toggleSet(i, s); else { save(); renderCard(i); }
    }
    return;
  }
  const sec = Math.ceil(left / 1000);
  if (hold.phase === 'ready' && sec !== hold.shown) { hapticImpact('light'); blip(740); }
  hold.shown = sec;
  renderHold();
}

function cancelHold() {
  if (!hold) return;
  const i = hold.i;
  clearHold();
  save();
  renderCard(i);
}

// ---------------------------------------------------------------- sets

function toggleSet(i, s) {
  if (sealed || !cells[i] || !cells[i][s]) return;
  if (hold && hold.i === i && hold.s === s) clearHold();
  const c = cells[i][s];
  c.done = !c.done;
  c.at = c.done ? Date.now() : 0;
  const fresh = updatePRs(i);
  if (c.done) {
    primeAudio();
    hapticImpact('light');
    const plan = restPlan(i, s);
    if (!allDone() && plan.base > 0) startRest(i, s); else startFeelOnly(i, s);
    if (fresh.includes(s)) celebrate(i, s);
  } else if (rest && rest.i === i && rest.s === s) {
    rest = null;
  }
  save();
  renderHeader();
  renderCard(i);
  renderRest();
  syncResting();
}

function applyWeight(i, w) {
  const ex = programme.exercises[i];
  let n = 0;
  cells[i].forEach((c) => { if (!c.done) { c.weight = w; n += 1; } });
  if (!n) return;
  hapticSelect();
  save();
  renderCard(i);
  toast(fr(w) + ' kg pour les ' + n + ' série' + (n > 1 ? 's' : '') + ' restante' + (n > 1 ? 's' : '') + ' · ' + ex.name);
}

// ---------------------------------------------------------------- set editor (bottom sheet)

function openEdit(i, s) {
  if (sealed) return;
  const ex = programme.exercises[i];
  const c = cells[i][s];
  const isHold = ex.seconds != null;
  const dlg = document.getElementById('dlg-edit');
  const st = { v: isHold ? c.seconds : c.reps, w: c.weight, feel: c.feel || 0 };

  const valInput = el('input', { id: 'edit-v', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': isHold ? 'Secondes' : 'Répétitions' });
  const wInput = el('input', { id: 'edit-w', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', placeholder: 'sans', 'aria-label': 'Charge en ' + (ex.unit || 'kg') });
  const platesBox = el('div');
  const err = el('p', { class: 'err', hidden: true });
  const vStep = isHold ? 5 : 1;
  const wStep = () => weightStep(ex.info, st.w || ex.weight || 0, settings);

  const syncInputs = () => {
    valInput.value = st.v != null ? fr(st.v) : '';
    wInput.value = st.w != null ? fr(st.w) : '';
    wMinus.textContent = '−' + fr(wStep());
    wPlus.textContent = '+' + fr(wStep());
    platesBox.replaceChildren();
    if (ex.info.equip === 'bar' && st.w > 0) {
      const pb = plateBreakdown(st.w, settings.bar, settings.plates);
      platesBox.append(el('p', { class: 'plate-note' }, miniPlates(pb.perSide || []), ' Par côté : ' + plateText(pb, settings.bar)));
    }
  };
  const bump = (key, d) => {
    hapticSelect();
    if (key === 'v') st.v = Math.max(0, round3((Number(st.v) || 0) + d));
    else {
      const base = st.w != null ? st.w : (ex.weight != null ? ex.weight : 0);
      const next = round3(base + d);
      st.w = next <= 0 ? null : next;
    }
    syncInputs();
  };
  const vMinus = el('button', { type: 'button', 'aria-label': 'Moins', text: '−' + vStep, onclick: () => bump('v', -vStep) });
  const vPlus = el('button', { type: 'button', 'aria-label': 'Plus', text: '+' + vStep, onclick: () => bump('v', vStep) });
  const wMinus = el('button', { type: 'button', 'aria-label': 'Moins de charge', onclick: () => bump('w', -wStep()) });
  const wPlus = el('button', { type: 'button', 'aria-label': 'Plus de charge', onclick: () => bump('w', wStep()) });
  valInput.addEventListener('input', () => { const n = parseNum(valInput.value); if (n != null) st.v = n; });
  wInput.addEventListener('input', () => { const t = wInput.value.trim(); st.w = t === '' ? null : parseNum(t); });
  [valInput, wInput].forEach((inp) => {
    inp.addEventListener('focus', () => inp.select());
    inp.addEventListener('blur', syncInputs);
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } });
  });

  const feelBtns = [1, 2, 3].map((f) => el('button', {
    type: 'button', class: 'feel', 'aria-pressed': String(st.feel === f),
    text: FEEL_EMOJI[f] + ' ' + (f === 1 ? 'Facile' : f === 2 ? 'OK' : 'Dur'),
    onclick: () => { st.feel = st.feel === f ? 0 : f; hapticSelect(); feelBtns.forEach((b, k) => b.setAttribute('aria-pressed', String(st.feel === k + 1))); }
  }));

  const following = cells[i].slice(s + 1).filter((x) => !x.done).length;
  const applyBox = el('input', { type: 'checkbox', id: 'edit-apply' });
  const target = 'Prévu : ' + (isHold ? fr(ex.seconds) + ' s' : fr(ex.reps) + ' rép.') + (ex.weight != null ? ' · ' + fr(ex.weight) + ' ' + (ex.unit || 'kg') : '');

  const commit = (validate) => {
    if (st.v == null || !(st.v >= 0) || (st.w != null && !(st.w >= 0))) {
      err.hidden = false;
      err.textContent = 'Nombre invalide';
      return;
    }
    if (isHold) c.seconds = st.v; else c.reps = st.v;
    c.weight = st.w;
    c.feel = st.feel;
    if (applyBox.checked) cells[i].forEach((x, k) => { if (k > s && !x.done) x.weight = st.w; });
    closeSheet(dlg);
    if (validate && !c.done) { toggleSet(i, s); return; }
    const fresh = updatePRs(i);
    if (fresh.includes(s)) celebrate(i, s);
    save();
    renderCard(i);
    renderHeader();
    renderRest();
  };

  dlg.replaceChildren(
    ...sheetHead(dlg, 'Série ' + (s + 1) + ' · ' + ex.name, 'edit-title'),
    el('p', { class: 'sub', text: target }),
    el('div', { class: 'stepper' }, el('span', { class: 'stepper-label', text: isHold ? 'Secondes' : 'Répétitions' }), vMinus, valInput, vPlus),
    el('div', { class: 'stepper' }, el('span', { class: 'stepper-label', text: 'Charge (' + (ex.unit || 'kg') + ')' }), wMinus, wInput, wPlus),
    platesBox,
    el('h3', { text: 'Ressenti' }),
    el('div', { class: 'feel-pick' }, ...feelBtns),
    following ? el('label', { class: 'check' }, applyBox, 'Même charge pour les ' + following + ' série' + (following > 1 ? 's' : '') + ' suivante' + (following > 1 ? 's' : '')) : null,
    err,
    el('div', { class: 'actions' },
      el('button', { type: 'button', class: 'btn ghost', text: 'Enregistrer', onclick: () => commit(false) }),
      c.done ? el('button', { type: 'button', class: 'btn primary', text: 'OK', onclick: () => commit(false) })
        : el('button', { type: 'button', class: 'btn primary', text: '✓ Valider la série', onclick: () => commit(true) }))
  );
  syncInputs();
  openSheet(dlg);
}

// ---------------------------------------------------------------- finish & send

function askFinish(done) {
  const c = counts();
  const msg = c.done < c.total ? 'Terminer la séance ? ' + (c.total - c.done) + ' série(s) non faite(s).' : 'Terminer la séance ?';
  if (tg && tg.showConfirm && tgAtLeast('6.2')) {
    try { tg.showConfirm(msg, (ok) => done(!!ok)); return; } catch (e) {}
  }
  done(window.confirm(msg));
}

function currentRecord() {
  return makeRecord(programme, cells, started, sealed ? endedAt : Date.now());
}

function stopSession() {
  if (clockTick) { clearInterval(clockTick); clockTick = 0; }
  tickClock();
  sealed = true;
  endedAt = Date.now();
  rest = null;
  clearTimeout(hideTimer);
  if (restTick) { clearInterval(restTick); restTick = 0; }
  clearHold();
  renderRest();
  const rec = currentRecord();
  if (rec) addSession(rec);
  store.del(storageKey);
  if (tg && tg.disableClosingConfirmation && tgAtLeast('6.2')) { try { tg.disableClosingConfirmation(); } catch (e) {} }
}

function showEndScreen() {
  const c = counts();
  const sec = Math.max(0, Math.floor((endedAt - started) / 1000));
  let tonnage = 0;
  const prs = [];
  programme.exercises.forEach((ex, i) => cells[i].forEach((cell) => {
    if (!cell.done) return;
    if (ex.seconds == null && cell.weight > 0) tonnage += cell.weight * cell.reps * (/par bras/.test(ex.unit || '') ? 2 : 1);
    if (cell.pr) prs.push(ex.name + ' — ' + prText(ex, cell));
  }));
  const stats = document.getElementById('end-stats');
  const stat = (v, l) => el('div', { class: 'stat' }, el('b', { text: v }), el('span', { text: l }));
  stats.replaceChildren(
    stat(c.done + ' / ' + c.total, 'séries'),
    stat(fmtClock(sec), 'durée'),
    stat(tonnage ? fr(Math.round(tonnage)) + ' kg' : '—', 'tonnage'),
    stat(String(prs.length), prs.length > 1 ? 'records' : 'record'));
  const prBox = document.getElementById('end-prs');
  prBox.replaceChildren();
  if (prs.length) prBox.append(el('ul', { class: 'pr-list' }, ...prs.map((t) => el('li', { text: '🏆 ' + t }))));
  document.body.classList.add('session-ended');
  document.getElementById('end-screen').hidden = false;
  setMainButton('📤 Envoyer');
  window.scrollTo(0, 0);
  try { document.getElementById('end-title').focus({ preventScroll: true }); } catch (e) {}
}

function canSend() {
  // sendData only works from a reply-keyboard web_app button: initData has no query_id there.
  if (!tg || typeof tg.sendData !== 'function') return false;
  if (!tg.platform || tg.platform === 'unknown') return false;
  if (tg.initDataUnsafe && tg.initDataUnsafe.query_id) return false;
  return true;
}

function closeApp() {
  if (tg && tg.close) { try { tg.close(); } catch (e) {} }
}

function submitSession() {
  if (summarySent) { closeApp(); return; }
  if (!sealed) stopSession();
  const comment = String(document.getElementById('session-comment').value || '').trim();
  const raw = buildRaw({ programme, cells, started, ended: endedAt, comment, formatTarget: payloadTarget });
  const enc = encodePayload(raw);
  store.set('gymbuddy:last-payload', JSON.stringify({ at: Date.now(), json: enc.json, short: enc.short }));
  if (canSend()) {
    try {
      tg.sendData(enc.json);
      summarySent = true;
      closeApp();
      return;
    } catch (e) {}
  }
  panels.showSummary(enc.json, enc.short);
}

function onFinish() {
  if (sealed) { submitSession(); return; }
  askFinish((ok) => {
    if (!ok) return;
    stopSession();
    showEndScreen();
  });
}

// ---------------------------------------------------------------- Telegram

function isLight(hex) {
  const c = String(hex || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}/.test(c)) return false;
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 160;
}

function applyTheme() {
  const p = (tg && tg.themeParams) || {};
  const root = document.documentElement;
  [['--bg', p.bg_color], ['--text', p.text_color], ['--hint', p.hint_color], ['--link', p.link_color],
    ['--btn', p.button_color], ['--btn-text', p.button_text_color], ['--secondary', p.secondary_bg_color],
    ['--header', p.header_bg_color || p.bg_color], ['--section', p.section_bg_color || p.secondary_bg_color],
    ['--accent', p.accent_text_color || p.button_color], ['--destructive', p.destructive_text_color]]
    .forEach(([k, v]) => { if (typeof v === 'string' && v.trim()) root.style.setProperty(k, v); });
  if (p.bg_color) {
    root.style.colorScheme = isLight(p.bg_color) ? 'light' : 'dark';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', p.bg_color);
    try { if (tgAtLeast('6.1')) { tg.setHeaderColor(p.bg_color); tg.setBackgroundColor(p.bg_color); } } catch (e) {}
  }
}

function setMainButton(text) {
  const mb = tg && tg.MainButton;
  if (!mb) return;
  try {
    const params = { text, is_visible: true };
    const p = tg.themeParams || {};
    if (p.button_color) { params.color = p.button_color; params.text_color = p.button_text_color; }
    mb.setParams(params);
  } catch (e) {
    try { mb.setText(text); mb.show(); } catch (e2) {}
  }
}

function setupTelegram() {
  if (!tg) return;
  try { tg.ready(); } catch (e) {}
  try { tg.expand(); } catch (e) {}
  applyTheme();
  try { tg.onEvent('themeChanged', applyTheme); } catch (e) {}
  // Scrolling the list must never collapse the Mini App.
  if (tgAtLeast('7.7') && tg.disableVerticalSwipes) { try { tg.disableVerticalSwipes(); } catch (e) {} }
  if (tgAtLeast('6.2') && tg.enableClosingConfirmation) { try { tg.enableClosingConfirmation(); } catch (e) {} }
  if (tg.MainButton && tg.platform && tg.platform !== 'unknown') {
    setMainButton('🏁 Terminer');
    try { tg.MainButton.onClick(onFinish); } catch (e) {}
    document.body.classList.add('has-mainbutton');
  }
}

function announce(text) {
  const live = document.getElementById('live');
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 30);
}

// ---------------------------------------------------------------- events

let armSwallow = false;
let swallow = false;
document.addEventListener('pointerup', () => {
  if (!armSwallow) return;
  armSwallow = false;
  swallow = true;
  setTimeout(() => { swallow = false; }, 0);
}, true);
document.addEventListener('pointercancel', () => { armSwallow = false; }, true);
document.addEventListener('click', (e) => {
  if (!swallow) return;
  swallow = false;
  e.preventDefault();
  e.stopPropagation();
}, true);

list.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]');
  if (act) {
    const i = Number(act.dataset.i);
    switch (act.dataset.act) {
      case 'edit': openEdit(i, Number(act.dataset.s)); return;
      case 'hold': startHold(i, Number(act.dataset.s)); return;
      case 'hold-cancel': cancelHold(); return;
      case 'hist': panels.openHistory(i); return;
      case 'setw': applyWeight(i, Number(act.dataset.w)); return;
      case 'plates': panels.openPlates(Number(act.dataset.w)); return;
      case 'anim': {
        const card = act.closest('.exercise');
        panels.openAnim(Number(card.dataset.i));
        return;
      }
      default: break;
    }
  }
  const setBtn = e.target.closest('.set');
  if (setBtn) toggleSet(Number(setBtn.dataset.i), Number(setBtn.dataset.s));
});

let pressTimer = 0;
list.addEventListener('pointerdown', (e) => {
  const setBtn = e.target.closest('.set');
  if (!setBtn || e.button > 0) return;
  const i = Number(setBtn.dataset.i);
  const s = Number(setBtn.dataset.s);
  const x = e.clientX, y = e.clientY;
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => { armSwallow = true; hapticImpact('light'); openEdit(i, s); }, 450);
  const cancel = () => { clearTimeout(pressTimer); detach(); };
  const move = (ev) => { if (Math.hypot(ev.clientX - x, ev.clientY - y) > 12) cancel(); };
  function detach() {
    setBtn.removeEventListener('pointermove', move);
    setBtn.removeEventListener('pointerup', cancel);
    setBtn.removeEventListener('pointercancel', cancel);
    setBtn.removeEventListener('pointerleave', cancel);
  }
  setBtn.addEventListener('pointermove', move);
  setBtn.addEventListener('pointerup', cancel);
  setBtn.addEventListener('pointercancel', cancel);
  setBtn.addEventListener('pointerleave', cancel);
});
list.addEventListener('contextmenu', (e) => { if (e.target.closest('.set, .edit')) e.preventDefault(); });

document.querySelector('.tools').addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]');
  if (!b) return;
  if (b.dataset.open === 'week') panels.openWeek();
  else if (b.dataset.open === 'plates') {
    // Start from the barbell exercise in progress, if any.
    const i = programme.exercises.findIndex((ex, k) => ex.info.equip === 'bar' && nextUndone(k) >= 0 && currentWeight(k) > 0);
    panels.openPlates(i >= 0 ? currentWeight(i) : null);
  }
  else if (b.dataset.open === 'settings') panels.openSettings();
});

document.getElementById('finish-btn').addEventListener('click', onFinish);
document.getElementById('send-session').addEventListener('click', submitSession);
document.getElementById('rest-plus').addEventListener('click', () => adjustRest(15000));
document.getElementById('rest-minus').addEventListener('click', () => adjustRest(-15000));
document.getElementById('rest-skip').addEventListener('click', skipRest);
document.getElementById('hold-cancel').addEventListener('click', cancelHold);
document.getElementById('feel-row').addEventListener('click', (e) => {
  const b = e.target.closest('.feel');
  if (b) setFeel(Number(b.dataset.feel));
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || sealed) return;
  tickClock();
  if (rest) tickRest();
  if (hold) tickHold();
});

function syncOnline() {
  document.getElementById('offline').hidden = navigator.onLine !== false;
}
window.addEventListener('online', syncOnline);
window.addEventListener('offline', syncOnline);

onHistoryChange(() => {
  recCache.clear();
  if (sealed) return;
  programme.exercises.forEach((ex, i) => updatePRs(i));
  renderCards();
});

// ---------------------------------------------------------------- context for panels

panels.init({
  programme,
  cells: () => cells,
  sid,
  started: () => started,
  sealed: () => sealed,
  currentRecord,
  summarizeSets,
  recFor,
  onSettingsChanged(what) {
    if (what === 'avatar') renderCards(true);
    else renderCards();
    renderRest();
  }
});

// ---------------------------------------------------------------- boot

archiveOrphans();
restore();
recCache.clear(); // the session id may have changed with the restored start time
programme.exercises.forEach((ex, i) => updatePRs(i));
setupTelegram();
renderAll();
syncOnline();
tickClock();
clockTick = setInterval(tickClock, 250);
if (rest && !restTick) restTick = setInterval(tickRest, 200);
if (hold && !holdTick) holdTick = setInterval(tickHold, 80);
save();

pullCloudSettings().then((changed) => { if (changed) { renderCards(true); } });
syncCloud().then((n) => { if (n) toast('Historique synchronisé : ' + n + ' séance' + (n > 1 ? 's' : '')); });

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Exposed for tests and debugging.
window.__gb = { programme, get cells() { return cells; }, get rest() { return rest; }, toggleSet, openEdit, sheetOpen };
