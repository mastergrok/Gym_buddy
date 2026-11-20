// Small shared helpers: numbers, dates, storage, haptics, sound.

export const tg = (window.Telegram && window.Telegram.WebApp) || null;

export function tgAtLeast(v) {
  try { return !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast(v)); } catch (e) { return false; }
}

export function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

// French number: 62.5 -> "62,5"
export function fr(n) {
  if (n == null || !isFinite(Number(n))) return '0';
  return String(round3(n)).replace('.', ',');
}

export function parseNum(str) {
  if (str == null) return null;
  const s = String(str).trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) ? round3(n) : null;
}

export function fmtClock(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h > 0 ? h + ':' + p(m) + ':' + p(s) : p(m) + ':' + p(s);
}

export function fmtMinSec(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return m + ' min';
  return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0');
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export function fmtDate(ms, withDay) {
  const d = new Date(ms);
  return (withDay ? DAYS[d.getDay()] + ' ' : '') + d.getDate() + ' ' + MONTHS[d.getMonth()];
}

export function daysAgo(ms) {
  const a = new Date(ms); a.setHours(0, 0, 0, 0);
  const b = new Date(); b.setHours(0, 0, 0, 0);
  const d = Math.round((b - a) / 86400000);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 7) return 'il y a ' + d + ' j';
  if (d < 14) return 'il y a 1 sem.';
  if (d < 60) return 'il y a ' + Math.floor(d / 7) + ' sem.';
  return fmtDate(ms);
}

// Monday 00:00 of the week containing ms.
export function weekStart(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function utf8len(s) {
  return new TextEncoder().encode(s).length;
}

export const store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } },
  del(key) { try { localStorage.removeItem(key); } catch (e) {} },
  json(key, fallback) {
    const raw = this.get(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback; }
  },
  keys() {
    const out = [];
    try { for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {}
    return out;
  }
};

export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k === 'style') node.style.cssText = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- haptics ----------
function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
}

export function hapticImpact(style) {
  const h = tg && tg.HapticFeedback;
  if (h && h.impactOccurred && tgAtLeast('6.1')) {
    try { h.impactOccurred(style || 'medium'); return; } catch (e) {}
  }
  vibrate(style === 'heavy' ? 35 : 15);
}

export function hapticNotify(type) {
  const h = tg && tg.HapticFeedback;
  if (h && h.notificationOccurred && tgAtLeast('6.1')) {
    try { h.notificationOccurred(type || 'success'); return; } catch (e) {}
  }
  vibrate(type === 'warning' ? [60, 60, 60] : [120, 80, 120]);
}

// Long, noticeable buzz for the end of a rest: phone may be on the bench.
export function hapticAlarm() {
  hapticNotify('success');
  setTimeout(() => hapticImpact('heavy'), 260);
  setTimeout(() => hapticImpact('heavy'), 520);
  setTimeout(() => hapticNotify('success'), 820);
}

export function hapticSelect() {
  const h = tg && tg.HapticFeedback;
  if (h && h.selectionChanged && tgAtLeast('6.1')) {
    try { h.selectionChanged(); } catch (e) {}
  }
}

// ---------- sound ----------
let audioCtx = null;
export const sound = { on: true };

function ctx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

export function primeAudio() {
  try {
    const c = ctx();
    if (c && c.state === 'suspended' && c.resume) c.resume();
  } catch (e) {}
}

function tone(c, freq, start, stop, gain) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain || 0.18, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + stop);
  o.start(t);
  o.stop(c.currentTime + stop + 0.02);
}

function play(fn) {
  if (!sound.on) return;
  try {
    const c = ctx();
    if (!c) return;
    const run = () => fn(c);
    if (c.state === 'suspended' && c.resume) {
      const p = c.resume();
      if (p && p.then) p.then(run).catch(() => {});
      else run();
    } else run();
  } catch (e) {}
}

export function blip(freq) { play((c) => tone(c, freq || 740, 0, 0.09)); }
export function beep() { play((c) => { tone(c, 880, 0, 0.22); tone(c, 1175, 0.16, 0.38); }); }
export function fanfare() {
  play((c) => { tone(c, 784, 0, 0.14); tone(c, 988, 0.12, 0.26); tone(c, 1319, 0.24, 0.6, 0.22); });
}
