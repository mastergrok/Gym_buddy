// Bottom sheets: scroll lock (the page never jumps), keyboard-aware position,
// Telegram BackButton, tap outside to close, toast.

import { tg, tgAtLeast, el } from './util.js';

const stack = [];
let lockedY = 0;

function lockScroll() {
  lockedY = window.scrollY || window.pageYOffset || 0;
  document.body.style.top = -lockedY + 'px';
  document.body.classList.add('locked');
}

function unlockScroll() {
  document.body.classList.remove('locked');
  document.body.style.top = '';
  window.scrollTo(0, lockedY);
}

function backButton(show) {
  const bb = tg && tg.BackButton;
  if (!bb || !tgAtLeast('6.1')) return;
  try { show ? bb.show() : bb.hide(); } catch (e) {}
}

if (tg && tg.BackButton && tgAtLeast('6.1')) {
  try { tg.BackButton.onClick(() => { const top = stack[stack.length - 1]; if (top) closeSheet(top); }); } catch (e) {}
}

function cleanup(dlg) {
  const i = stack.indexOf(dlg);
  if (i < 0) return;
  stack.splice(i, 1);
  if (!stack.length) {
    unlockScroll();
    backButton(false);
  }
  if (dlg._onClose) { const fn = dlg._onClose; dlg._onClose = null; fn(); }
}

export function openSheet(dlg, onClose) {
  if (stack.includes(dlg)) return;
  if (!stack.length) lockScroll();
  stack.push(dlg);
  dlg._onClose = onClose || null;
  try {
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  } catch (e) { dlg.setAttribute('open', ''); }
  dlg.scrollTop = 0;
  backButton(true);
}

export function closeSheet(dlg) {
  try {
    if (typeof dlg.close === 'function' && dlg.open) dlg.close();
    else dlg.removeAttribute('open');
  } catch (e) { dlg.removeAttribute('open'); }
  cleanup(dlg);
}

export function sheetOpen() { return stack.length > 0; }

// Wire every sheet once: Esc, tap on the backdrop.
document.querySelectorAll('dialog.sheet').forEach((dlg) => {
  dlg.addEventListener('close', () => cleanup(dlg));
  dlg.addEventListener('click', (e) => {
    if (e.target !== dlg) return;
    const r = dlg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeSheet(dlg);
  });
});

// Standard sheet header.
export function sheetHead(dlg, title, id) {
  return [
    el('div', { class: 'grab', 'aria-hidden': 'true' }),
    el('div', { class: 'sheet-head' },
      el('h2', { id, text: title }),
      el('button', { type: 'button', class: 'x', 'aria-label': 'Fermer', text: '✕', onclick: () => closeSheet(dlg) }))
  ];
}

// Keep sheets above the on-screen keyboard (iOS overlays it instead of resizing).
function syncKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;
  const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
  document.documentElement.style.setProperty('--kb', (kb > 60 ? kb : 0) + 'px');
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', syncKeyboard);
  window.visualViewport.addEventListener('scroll', syncKeyboard);
}

// When a field inside a sheet gets focus, keep it visible inside the sheet only,
// never by scrolling the page behind.
document.addEventListener('focusin', (e) => {
  const sheet = e.target.closest && e.target.closest('dialog.sheet');
  if (!sheet || !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  setTimeout(() => {
    syncKeyboard();
    const r = e.target.getBoundingClientRect();
    const s = sheet.getBoundingClientRect();
    if (r.bottom > s.bottom - 12) sheet.scrollTop += r.bottom - s.bottom + 24;
    else if (r.top < s.top + 12) sheet.scrollTop -= s.top - r.top + 24;
  }, 320);
});

let toastTimer = 0;
export function toast(text, opts) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.className = (opts && opts.gold) ? 'gold' : '';
  t.hidden = false;
  // restart the entrance animation
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, (opts && opts.ms) || 2600);
}
