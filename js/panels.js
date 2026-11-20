// Sheets: exercise history & records, week summary, plate calculator, settings,
// animation preview, JSON summary.

import { tg, tgAtLeast, fr, parseNum, round3, fmtDate, fmtDuration, weekStart, el, esc, store, hapticSelect } from './util.js';
import { exerciseInfo, MUSCLES, plateBreakdown, PLATE_COLORS } from './catalog.js';
import { allSessions, exerciseLog, bestOf, clearHistory, exportHistory, importHistory, syncCloud } from './history.js';
import { settings, saveSettings, ALL_PLATES } from './settings.js';
import { openSheet, closeSheet, sheetHead, toast } from './sheets.js';
import { displayTarget, plateText } from './format.js';

let ctx = null;
export function init(c) { ctx = c; }

const $ = (id) => document.getElementById(id);
const DAY = 86400000;

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch (e) {}
  try {
    const ta = el('textarea', { readonly: true, style: 'position:fixed;left:-9999px' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}

// ================================================================ history

function currentEntry(i) {
  const ex = ctx.programme.exercises[i];
  const isHold = ex.seconds != null;
  const sets = ctx.cells()[i].filter((c) => c.done).map((c) => [isHold ? c.seconds : c.reps, c.weight, c.feel || 0]);
  if (!sets.length) return null;
  return { t: ctx.started(), hold: isHold, sets, now: true };
}

function metricOf(entry, weighted) {
  const b = bestOf(entry.sets, entry.hold);
  if (entry.hold) return b.sec;
  if (weighted) return b.e || b.w;
  return b.reps;
}

function chartSvg(entries, weighted, unit) {
  const pts = entries.slice(-16);
  const vals = pts.map((e) => metricOf(e, weighted));
  const W = 340, H = 150, L = 36, R = 10, T = 14, B = 24;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi === lo) { lo = Math.max(0, lo - 5); hi += 5; }
  const padV = (hi - lo) * 0.12;
  lo = Math.max(0, lo - padV); hi += padV;
  const x = (k) => (pts.length === 1 ? (L + W - R) / 2 : L + (k * (W - L - R)) / (pts.length - 1));
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let best = -Infinity;
  const dots = pts.map((e, k) => {
    const v = vals[k];
    const pr = k > 0 && v > best;
    best = Math.max(best, v);
    return { cx: x(k), cy: y(v), v, pr, now: !!e.now, t: e.t };
  });
  const line = dots.map((d) => d.cx.toFixed(1) + ',' + d.cy.toFixed(1)).join(' ');
  const area = 'M' + dots[0].cx.toFixed(1) + ',' + (H - B) + ' L' + line.replace(/ /g, ' L') + ' L' + dots[dots.length - 1].cx.toFixed(1) + ',' + (H - B) + ' Z';
  const grid = [lo, (lo + hi) / 2, hi].map((v) =>
    `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text x="${L - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${esc(fr(Math.round(v)))}</text>`).join('');
  const circles = dots.map((d) => `<circle class="dot${d.now ? ' now' : d.pr ? ' pr' : ''}" cx="${d.cx.toFixed(1)}" cy="${d.cy.toFixed(1)}" r="${d.now || d.pr ? 4.5 : 3.2}"><title>${esc(fmtDate(d.t) + ' : ' + fr(round3(d.v)) + ' ' + unit)}</title></circle>`).join('');
  const labels = `<text x="${L}" y="${H - 6}">${esc(fmtDate(pts[0].t))}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(pts[pts.length - 1].now ? "aujourd'hui" : fmtDate(pts[pts.length - 1].t))}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Progression">${grid}${pts.length > 1 ? `<path class="area" d="${area}"/><polyline class="line" points="${line}"/>` : ''}${circles}${labels}</svg>`;
}

export function openHistory(i) {
  const ex = ctx.programme.exercises[i];
  const dlg = $('dlg-history');
  const log = exerciseLog(ex.name, ctx.sid());
  const cur = currentEntry(i);
  const entries = cur ? log.concat([cur]) : log.slice();
  const isHold = ex.seconds != null;
  const weighted = !isHold && (ex.weight != null || entries.some((e) => e.sets.some((s) => Number(s[1]) > 0)));
  const parts = [...sheetHead(dlg, ex.name, 'hist-title'), el('p', { class: 'sub', text: 'Objectif du jour : ' + displayTarget(ex) })];

  if (!entries.length) {
    parts.push(el('p', { class: 'empty', text: 'Pas encore d’historique. Valide tes séries : la courbe et les records arrivent dès la prochaine séance.' }));
    dlg.replaceChildren(...parts);
    openSheet(dlg);
    return;
  }

  // Records, all time (today included).
  const all = { w: 0, wReps: 0, e: 0, reps: 0, sec: 0, vol: 0 };
  entries.forEach((en) => {
    const b = bestOf(en.sets, en.hold);
    if (b.w > all.w || (b.w === all.w && b.wReps > all.wReps)) { all.w = b.w; all.wReps = b.wReps; }
    all.e = Math.max(all.e, b.e); all.reps = Math.max(all.reps, b.reps); all.sec = Math.max(all.sec, b.sec); all.vol = Math.max(all.vol, b.vol);
  });
  const rec = (v, l) => el('div', { class: 'rec' }, el('b', { text: v }), el('span', { text: l }));
  const recs = el('div', { class: 'records' });
  if (isHold) {
    recs.append(rec(fr(all.sec) + ' s', '🏆 Meilleur maintien'), rec(String(entries.length), 'séances'));
  } else if (weighted) {
    recs.append(
      rec(all.w ? fr(all.w) + ' kg × ' + fr(all.wReps) : '—', '🏆 Charge max'),
      rec(all.e ? fr(Math.round(all.e * 2) / 2) + ' kg' : '—', '🏆 1RM estimé'),
      rec(all.vol ? fr(Math.round(all.vol)) + ' kg' : '—', 'Meilleur volume (séance)'),
      rec(String(entries.length), 'séances'));
  } else {
    recs.append(rec(fr(all.reps), '🏆 Max répétitions'), rec(String(entries.length), 'séances'));
  }
  parts.push(recs);

  const unit = isHold ? 's' : weighted ? 'kg' : 'rép.';
  parts.push(el('h3', { text: isHold ? 'Meilleur maintien par séance' : weighted ? '1RM estimé par séance' : 'Max répétitions par séance' }));
  parts.push(el('div', { html: chartSvg(entries, weighted, unit) }));
  if (weighted) parts.push(el('p', { class: 'muted small', text: '1RM estimé = charge × (1 + répétitions / 30), sur les séries de 12 répétitions ou moins. Point doré : nouveau record.' }));

  parts.push(el('h3', { text: 'Séances' }));
  const ul = el('ul', { class: 'log' });
  entries.slice().reverse().slice(0, 20).forEach((en) => {
    ul.append(el('li', {},
      el('span', { class: 'd', text: en.now ? "Aujourd'hui" : fmtDate(en.t, true) }),
      el('span', { class: 'v', text: ctx.summarizeSets(en.sets, en.hold) })));
  });
  parts.push(ul);
  dlg.replaceChildren(...parts);
  openSheet(dlg);
}

// ================================================================ week

let weekOffset = 0;

function weekSessions(ws) {
  const we = ws + 7 * DAY;
  const list = allSessions().filter((s) => s.t >= ws && s.t < we);
  if (!ctx.sealed()) {
    const cur = ctx.currentRecord();
    if (cur && cur.t >= ws && cur.t < we && !list.some((s) => s.id === cur.id)) list.push(Object.assign({ live: true }, cur));
  }
  return list.sort((a, b) => a.t - b.t);
}

function muscleSets(sessions) {
  const m = {};
  let sets = 0, tonnage = 0, dur = 0;
  for (const s of sessions) {
    dur += s.d || 0;
    for (const x of s.x) {
      const info = exerciseInfo(x.n);
      const perArm = /par bras/.test(x.u || '') ? 2 : 1;
      for (const st of x.s) {
        sets += 1;
        if (!x.h && st[1] > 0) tonnage += st[1] * st[0] * perArm;
        if (info.equip === 'cardio') { m.cardio = (m.cardio || 0) + 1; continue; }
        if (!info.primary.length) { m.autre = (m.autre || 0) + 1; continue; }
        info.primary.forEach((k) => { m[k] = (m[k] || 0) + 1; });
        info.secondary.forEach((k) => { m[k] = (m[k] || 0) + 0.5; });
      }
    }
  }
  return { m, sets, tonnage, dur };
}

function weekRecords(sessions) {
  const out = [];
  for (const s of sessions) {
    for (const x of s.x) {
      const prior = exerciseLog(x.n).filter((e) => e.t < s.t && e.id !== s.id);
      if (!prior.length) continue;
      const before = { w: 0, e: 0, reps: 0, sec: 0 };
      prior.forEach((p) => { const b = bestOf(p.sets, p.hold); before.w = Math.max(before.w, b.w); before.e = Math.max(before.e, b.e); before.reps = Math.max(before.reps, b.reps); before.sec = Math.max(before.sec, b.sec); });
      const b = bestOf(x.s, !!x.h);
      let txt = '';
      if (x.h && b.sec > before.sec) txt = fr(b.sec) + ' s';
      else if (before.w > 0 && b.w > before.w) txt = fr(b.w) + ' kg × ' + fr(b.wReps);
      else if (before.e > 0 && b.e > before.e + 0.05) txt = '1RM estimé ' + fr(Math.round(b.e * 2) / 2) + ' kg';
      else if (!x.h && b.reps > before.reps && !b.w) txt = fr(b.reps) + ' répétitions';
      if (txt) out.push(x.n + '\u00a0: ' + txt);
    }
  }
  return out;
}

export function openWeek() {
  const dlg = $('dlg-week');
  const ws = weekStart(Date.now()) - weekOffset * 7 * DAY;
  const sessions = weekSessions(ws);
  const prev = muscleSets(weekSessions(ws - 7 * DAY));
  const cur = muscleSets(sessions);
  const target = settings.weekTarget || 3;
  const label = weekOffset === 0 ? 'Cette semaine' : weekOffset === 1 ? 'Semaine dernière' : 'Semaine du ' + fmtDate(ws);

  const nav = el('div', { class: 'week-nav' },
    el('button', { type: 'button', 'aria-label': 'Semaine précédente', text: '‹', onclick: () => { weekOffset += 1; openWeekRefresh(); } }),
    el('span', { text: label + ' · ' + fmtDate(ws) + ' – ' + fmtDate(ws + 6 * DAY) }),
    el('button', { type: 'button', 'aria-label': 'Semaine suivante', text: '›', disabled: weekOffset === 0, onclick: () => { weekOffset = Math.max(0, weekOffset - 1); openWeekRefresh(); } }));

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = el('div', { class: 'days' });
  ['L', 'M', 'M', 'J', 'V', 'S', 'D'].forEach((d, k) => {
    const t0 = ws + k * DAY;
    const has = sessions.some((s) => s.t >= t0 && s.t < t0 + DAY);
    days.append(el('div', { class: 'day' + (has ? ' done' : '') + (t0 === today.getTime() ? ' today' : '') }, d, el('i')));
  });

  const n = sessions.length;
  const goalTxt = n >= target ? `✅ ${n} / ${target} séances — objectif atteint` : `${n} / ${target} séances · encore ${target - n}`;

  const parts = [...sheetHead(dlg, 'Bilan de la semaine', 'week-title'), nav, days, el('p', { class: 'goal', text: goalTxt })];

  const stat = (v, l) => el('div', { class: 'stat' }, el('b', { text: v }), el('span', { text: l }));
  const deltaSets = cur.sets - prev.sets;
  const dTxt = prev.sets ? (deltaSets >= 0 ? '▲ ' : '▼ ') + Math.abs(deltaSets) + ' vs sem. préc.' : 'séries';
  const statsBox = el('div', { class: 'stats' },
    stat(String(cur.sets), dTxt),
    stat(cur.tonnage ? fr(Math.round(cur.tonnage)) + ' kg' : '—', 'tonnage'),
    stat(cur.dur ? fmtDuration(cur.dur) : '—', 'temps'));
  statsBox.firstChild.querySelector('span').className = prev.sets ? (deltaSets >= 0 ? 'delta-up' : 'delta-down') : '';
  parts.push(statsBox);

  parts.push(el('h3', { text: 'Séries par muscle' }));
  const entries = Object.entries(cur.m).filter(([k]) => k !== 'cardio' && k !== 'autre').sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    parts.push(el('p', { class: 'empty', text: n ? 'Aucun muscle reconnu sur ces exercices.' : 'Aucune séance cette semaine.' }));
  } else {
    const scale = Math.max(20, ...entries.map((e) => e[1]));
    entries.forEach(([k, v]) => {
      const pv = prev.m[k] || 0;
      parts.push(el('div', { class: 'mbar' },
        el('span', { text: MUSCLES[k] || k }),
        el('span', { class: 'track' },
          el('span', { class: 'zone', style: `left:${(10 / scale) * 100}%;width:${(10 / scale) * 100}%` }),
          el('span', { class: 'fill', style: `width:${Math.min(100, (v / scale) * 100)}%` })),
        el('b', { text: fr(v), title: pv ? 'Semaine précédente : ' + fr(pv) : '' })));
    });
    parts.push(el('p', { class: 'muted small', text: 'Une série compte 1 pour les muscles principaux, ½ pour les secondaires. Zone pointillée : 10 à 20 séries par semaine, le repère courant pour progresser.' }));
  }
  const extra = [];
  if (cur.m.cardio) extra.push('Cardio : ' + fr(cur.m.cardio) + ' séries');
  if (cur.m.autre) extra.push('Exercices non classés : ' + fr(cur.m.autre) + ' séries');
  if (extra.length) parts.push(el('p', { class: 'muted small', text: extra.join(' · ') }));

  const prs = weekRecords(sessions);
  if (prs.length) {
    parts.push(el('h3', { text: 'Records de la semaine' }));
    parts.push(el('ul', { class: 'pr-list' }, ...prs.map((t) => el('li', { text: '🏆 ' + t }))));
  }

  parts.push(el('h3', { text: 'Séances' }));
  if (!n) parts.push(el('p', { class: 'empty', text: '—' }));
  else {
    parts.push(el('ul', { class: 'log' }, ...sessions.map((s) => el('li', {},
      el('span', { class: 'd', text: fmtDate(s.t, true) }),
      el('span', { class: 'v', text: s.n + ' · ' + s.x.reduce((a, x) => a + x.s.length, 0) + ' séries' + (s.d ? ' · ' + fmtDuration(s.d) : '') + (s.live ? ' · en cours' : '') })))));
  }
  dlg.replaceChildren(...parts);
  if (!dlg.open) openSheet(dlg, () => { weekOffset = 0; });
}

function openWeekRefresh() {
  hapticSelect();
  openWeek();
}

// ================================================================ plates

export function openPlates(weight) {
  const dlg = $('dlg-plates');
  const st = { w: weight > 0 ? weight : 60 };
  const input = el('input', { inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', 'aria-label': 'Charge totale en kg' });
  const viz = el('div', { class: 'barviz', 'aria-hidden': 'true' });
  const txt = el('p', { class: 'plate-text' });
  const note = el('p', { class: 'plate-note' });
  const barChips = el('div', { class: 'chips' });

  const draw = () => {
    input.value = fr(st.w);
    const pb = plateBreakdown(st.w, settings.bar, settings.plates);
    viz.replaceChildren();
    const side = (pb && pb.perSide) || [];
    const plate = (p) => {
      const h = 34 + Math.round(Math.sqrt(p / 25) * 56);
      const w = p >= 10 ? 12 : p >= 2.5 ? 9 : 7;
      return el('span', { class: 'plate', style: `height:${h}px;width:${w}px;background:${PLATE_COLORS[p] || '#999'}`, title: fr(p) + ' kg' });
    };
    viz.append(el('span', { class: 'shaft', style: 'width:22px' }), el('span', { class: 'sleeve' }));
    side.slice().reverse().forEach((p) => viz.append(plate(p)));
    viz.append(el('span', { class: 'shaft', style: 'width:90px' }));
    side.forEach((p) => viz.append(plate(p)));
    viz.append(el('span', { class: 'sleeve' }), el('span', { class: 'shaft', style: 'width:22px' }));
    txt.textContent = pb && pb.perSide.length ? 'Par côté : ' + pb.perSide.map(fr).join(' + ') + ' kg' : plateText(pb, settings.bar);
    let n = 'Barre ' + fr(settings.bar) + ' kg';
    if (pb && pb.rest > 0) n += ' · avec tes disques : ' + fr(round3(st.w - pb.rest * 2)) + ' kg';
    note.textContent = n;
    barChips.replaceChildren(...[20, 15, 10].map((b) => el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(settings.bar === b), text: 'Barre ' + b + ' kg',
      onclick: () => { settings.bar = b; saveSettings(); ctx.onSettingsChanged('bar'); draw(); }
    })));
  };
  const bump = (d) => { hapticSelect(); st.w = Math.max(0, round3(st.w + d)); draw(); };
  input.addEventListener('input', () => { const v = parseNum(input.value); if (v != null && v >= 0) { st.w = v; const keep = input.value; draw(); input.value = keep; } });
  input.addEventListener('blur', draw);
  input.addEventListener('focus', () => input.select());
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });

  dlg.replaceChildren(
    ...sheetHead(dlg, 'Calcul des disques', 'plates-title'),
    el('div', { class: 'stepper' },
      el('span', { class: 'stepper-label', text: 'Charge totale (barre comprise)' }),
      el('button', { type: 'button', text: '−2,5', onclick: () => bump(-2.5) }),
      input,
      el('button', { type: 'button', text: '+2,5', onclick: () => bump(2.5) })),
    viz, txt, note,
    el('h3', { text: 'Barre' }), barChips,
    el('p', { class: 'muted small', text: 'Les disques disponibles se règlent dans ⚙️ Réglages.' }));
  draw();
  openSheet(dlg);
}

// ================================================================ settings

function seg(options, value, onPick) {
  const box = el('div', { class: 'seg', role: 'group' });
  options.forEach(([v, label]) => box.append(el('button', {
    type: 'button', 'aria-pressed': String(value === v), text: label,
    onclick: () => { hapticSelect(); box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false')); box.querySelector(`[data-v="${v}"]`).setAttribute('aria-pressed', 'true'); onPick(v); },
    'data-v': v
  })));
  return box;
}

function sw(checked, onChange) {
  const i = el('input', { type: 'checkbox', class: 'switch', role: 'switch' });
  i.checked = !!checked;
  i.addEventListener('change', () => { hapticSelect(); onChange(i.checked); });
  return i;
}

function row(label, help, control) {
  return el('div', { class: 'row' }, el('div', { class: 'lbl' }, label, help ? el('small', { text: help }) : null), control);
}

export function openSettings() {
  const dlg = $('dlg-settings');
  const changed = (what) => { saveSettings(); ctx.onSettingsChanged(what); };

  const barInput = el('input', { class: 'num', inputmode: 'decimal', value: fr(settings.bar), 'aria-label': 'Poids de la barre' });
  barInput.addEventListener('change', () => { const v = parseNum(barInput.value); if (v != null && v >= 0 && v <= 50) { settings.bar = v; changed('bar'); } barInput.value = fr(settings.bar); });

  const plates = el('div', { class: 'chips' }, ...ALL_PLATES.map((p) => el('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(settings.plates.includes(p)), text: fr(p),
    onclick: (e) => {
      hapticSelect();
      const on = settings.plates.includes(p);
      settings.plates = on ? settings.plates.filter((x) => x !== p) : settings.plates.concat(p).sort((a, b) => b - a);
      e.currentTarget.setAttribute('aria-pressed', String(!on));
      changed('plates');
    }
  })));

  const goalVal = el('b', { text: String(settings.weekTarget), style: 'min-width:24px;text-align:center' });
  const goal = el('div', { class: 'seg' },
    el('button', { type: 'button', text: '−', 'aria-label': 'Moins', onclick: () => { settings.weekTarget = Math.max(1, settings.weekTarget - 1); goalVal.textContent = settings.weekTarget; changed('goal'); } }),
    goalVal,
    el('button', { type: 'button', text: '+', 'aria-label': 'Plus', onclick: () => { settings.weekTarget = Math.min(14, settings.weekTarget + 1); goalVal.textContent = settings.weekTarget; changed('goal'); } }));

  const io = el('textarea', { class: 'io', placeholder: 'Colle ici une sauvegarde pour l’importer', 'aria-label': 'Sauvegarde' });
  const count = allSessions().length;
  const cloudOn = !!(tg && tg.CloudStorage && tgAtLeast('6.9'));
  const lastPayload = store.json('gymbuddy:last-payload', null);

  dlg.replaceChildren(
    ...sheetHead(dlg, 'Réglages', 'settings-title'),
    el('h3', { text: 'Séance' }),
    row('Personnage des animations', null, seg([['female', 'Femme'], ['male', 'Homme']], settings.avatar, (v) => { settings.avatar = v; changed('avatar'); })),
    row('Repos', settings.restMode === 'auto' ? 'Auto : adapté à l’exercice (lourd 3 min, polyarticulaire 2 min, isolation 1 min 15, gainage 1 min).' : 'Celui du programme. Auto seulement quand le programme n’en donne pas.',
      seg([['programme', 'Programme'], ['auto', 'Auto']], settings.restMode, (v) => { settings.restMode = v; changed('rest'); openSettings(); })),
    row('Repos selon le ressenti', '« Dur » ajoute 30 s, « Facile » retire 15 s.', sw(settings.feelAdjust, (v) => { settings.feelAdjust = v; changed('rest'); })),
    row('Alerte 10 s avant la fin du repos', 'Petite vibration et bip.', sw(settings.restWarn, (v) => { settings.restWarn = v; changed('rest'); })),
    row('Son', null, sw(settings.sound, (v) => { settings.sound = v; changed('sound'); })),
    row('Objectif de séances par semaine', null, goal),
    el('h3', { text: 'Disques' }),
    row('Poids de la barre (kg)', null, barInput),
    el('p', { class: 'muted small', text: 'Disques disponibles (kg), par paire :' }),
    plates,
    el('h3', { text: 'Données' }),
    el('p', { class: 'muted small', text: count + ' séance' + (count > 1 ? 's' : '') + ' enregistrée' + (count > 1 ? 's' : '') + ' sur ce téléphone · ' + (cloudOn ? 'copie dans ton compte Telegram ✓' : 'pas de copie Telegram (ouvre l’app depuis Telegram)') }),
    el('div', { class: 'actions' },
      el('button', { type: 'button', class: 'btn ghost', text: 'Copier la sauvegarde', onclick: async () => { const ok = await copyText(exportHistory()); toast(ok ? 'Sauvegarde copiée' : 'Copie impossible'); if (!ok) io.value = exportHistory(); } }),
      el('button', { type: 'button', class: 'btn ghost', text: 'Importer', onclick: () => {
        if (!io.value.trim()) { io.focus(); toast('Colle d’abord la sauvegarde'); return; }
        try { const n = importHistory(io.value); io.value = ''; toast(n + ' séance' + (n > 1 ? 's' : '') + ' importée' + (n > 1 ? 's' : '')); ctx.onSettingsChanged('history'); } catch (e) { toast('Sauvegarde illisible'); }
      } })),
    io,
    cloudOn ? el('button', { type: 'button', class: 'btn ghost block', style: 'margin-top:8px', text: 'Synchroniser avec Telegram', onclick: async () => { const n = await syncCloud(); toast(n ? n + ' séance(s) récupérée(s)' : 'Déjà à jour'); } }) : null,
    lastPayload ? el('button', { type: 'button', class: 'btn ghost block', style: 'margin-top:8px', text: 'Revoir la dernière séance envoyée (' + fmtDate(lastPayload.at) + ')', onclick: () => showSummary(lastPayload.json, lastPayload.short) }) : null,
    el('button', { type: 'button', class: 'btn danger block', style: 'margin-top:8px', text: 'Effacer tout l’historique', onclick: () => {
      const go = (ok) => { if (!ok) return; clearHistory(); toast('Historique effacé'); openSettings(); };
      if (tg && tg.showConfirm && tgAtLeast('6.2')) tg.showConfirm('Effacer tout l’historique ? Copie la sauvegarde avant si tu veux la garder.', go);
      else go(window.confirm('Effacer tout l’historique ?'));
    } })
  );
  if (!dlg.open) openSheet(dlg);
}

// ================================================================ animation preview

export function openAnim(i) {
  const ex = ctx.programme.exercises[i];
  const info = ex.info;
  const dlg = $('dlg-anim');
  const parts = [...sheetHead(dlg, ex.name, 'anim-title')];
  if (info.key) {
    parts.push(el('img', { class: 'anim-big', src: './assets/exercises/' + settings.avatar + '/' + info.key + '.webp', alt: 'Animation : ' + ex.name }));
    if (info.approx) parts.push(el('p', { class: 'anim-note', text: '≈ Animation d’un mouvement proche : cette variante n’est pas encore illustrée.' }));
  } else {
    parts.push(el('p', { class: 'empty', text: 'Pas encore d’animation pour cet exercice.' }));
  }
  const mus = (arr) => arr.map((k) => MUSCLES[k] || k).join(', ');
  if (info.primary.length) {
    parts.push(el('p', { class: 'anim-note' }, el('b', { text: mus(info.primary) }), info.secondary.length ? ' · aussi : ' + mus(info.secondary) : ''));
  }
  dlg.replaceChildren(...parts);
  openSheet(dlg);
}

// ================================================================ JSON summary (outside the keyboard button)

export function showSummary(json, short) {
  const dlg = $('dlg-summary');
  let pretty = json;
  try { pretty = JSON.stringify(JSON.parse(json), null, 2); } catch (e) {}
  const copyBtn = el('button', { type: 'button', class: 'btn primary', text: 'Copier', onclick: async () => { copyBtn.textContent = (await copyText(json)) ? 'Copié ✓' : 'Copie impossible'; } });
  dlg.replaceChildren(
    ...sheetHead(dlg, 'Résumé de la séance', 'summary-title'),
    el('p', { class: 'sub', text: 'L’envoi direct ne marche que depuis le bouton « Séance » du clavier du bot. Copie le JSON et colle-le au bot.' }),
    short ? el('p', { class: 'muted small', text: 'Clés raccourcies pour rester sous 4096 octets.' }) : null,
    el('pre', { id: 'summary-json', translate: 'no', text: pretty }),
    el('p', { class: 'muted small', text: new TextEncoder().encode(json).length + ' octets' }),
    el('div', { class: 'actions' }, copyBtn, el('button', { type: 'button', class: 'btn ghost', text: 'Fermer', onclick: () => closeSheet(dlg) })));
  openSheet(dlg);
}


