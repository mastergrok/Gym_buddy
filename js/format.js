// Display helpers shared by the session view and the sheets.

import { fr, el } from './util.js';
import { PLATE_COLORS } from './catalog.js';

export function displayTarget(ex) {
  let t = ex.sets + ' × ' + (ex.seconds != null ? fr(ex.seconds) + ' s' : fr(ex.reps));
  if (ex.weight != null) t += ' · ' + fr(ex.weight) + ' ' + (ex.unit || 'kg');
  return t;
}

export function miniPlates(perSide) {
  const box = el('span', { class: 'mini-plates', 'aria-hidden': 'true' });
  perSide.forEach((p) => {
    const h = 8 + Math.round(Math.sqrt(p / 25) * 14);
    box.append(el('span', { class: 'plate', style: `width:4px;height:${h}px;background:${PLATE_COLORS[p] || '#999'}` }));
  });
  return box;
}

export function plateText(pb, bar) {
  if (!pb) return '';
  if (pb.below) return 'Moins que la barre (' + fr(bar) + ' kg)';
  if (!pb.perSide.length && !pb.rest) return 'Barre seule';
  let t = pb.perSide.length ? pb.perSide.map(fr).join(' + ') : '—';
  if (pb.rest > 0) t += ' (manque ' + fr(pb.rest) + ' / côté)';
  return t;
}
