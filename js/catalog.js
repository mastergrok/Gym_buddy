// Exercise catalogue: name matching, animation key, muscles, equipment, rest class.
// One source of truth for everything the app knows about an exercise.

export function foldName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export const MUSCLES = {
  pecs: 'Pectoraux',
  dos: 'Dos',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  avbras: 'Avant-bras',
  abdos: 'Abdos',
  quadris: 'Quadriceps',
  ischios: 'Ischios',
  fessiers: 'Fessiers',
  adducteurs: 'Adducteurs',
  mollets: 'Mollets'
};

// Rest by class, in seconds, used when the programme gives no rest
// (or when "repos auto" is on in the settings).
export const REST_CLASS = {
  heavy: { s: 180, label: 'mouvement lourd' },
  compound: { s: 120, label: 'polyarticulaire' },
  iso: { s: 75, label: 'isolation' },
  core: { s: 60, label: 'gainage' },
  skill: { s: 90, label: 'technique' },
  cardio: { s: 60, label: 'cardio' },
  unknown: { s: 90, label: 'standard' }
};

// key: [primary muscles, secondary muscles, equipment, rest class]
// equipment: bar (barbell, plates on both sides), ez (fixed/EZ bar, no plate maths),
// db (dumbbells), kb, machine, cable, bw (bodyweight), cardio
const E = {
  'ab-wheel': ['abdos', '', 'bw', 'core'],
  'abductor-machine': ['fessiers', '', 'machine', 'iso'],
  'active-hang': ['dos', 'avbras', 'bw', 'core'],
  'adductor-machine': ['adducteurs', '', 'machine', 'iso'],
  'back-lever': ['dos', 'biceps abdos', 'bw', 'skill'],
  'barbell-row': ['dos', 'biceps', 'bar', 'compound'],
  'battle-ropes': ['', 'epaules', 'cardio', 'cardio'],
  'bench-bar': ['pecs', 'triceps epaules', 'bar', 'heavy'],
  'bench-db': ['pecs', 'triceps epaules', 'db', 'compound'],
  'bike': ['', '', 'cardio', 'cardio'],
  'box-jump': ['quadris', 'fessiers mollets', 'bw', 'skill'],
  'bulgarian-squat': ['quadris fessiers', '', 'db', 'compound'],
  'burpee': ['', '', 'cardio', 'cardio'],
  'cable-crunch': ['abdos', '', 'cable', 'core'],
  'cable-fly': ['pecs', '', 'cable', 'iso'],
  'cable-row': ['dos', 'biceps', 'cable', 'compound'],
  'calf-raise-machine': ['mollets', '', 'machine', 'iso'],
  'calf-raise-seated': ['mollets', '', 'machine', 'iso'],
  'calf-raise-standing': ['mollets', '', 'bw', 'iso'],
  'chest-press': ['pecs', 'triceps', 'machine', 'compound'],
  'chin-up': ['dos', 'biceps', 'bw', 'compound'],
  'crunch': ['abdos', '', 'bw', 'core'],
  'curl-bar': ['biceps', 'avbras', 'ez', 'iso'],
  'curl-db': ['biceps', '', 'db', 'iso'],
  'curl-incline': ['biceps', '', 'db', 'iso'],
  'dead-bug': ['abdos', '', 'bw', 'core'],
  'deadlift': ['ischios fessiers dos', 'quadris avbras', 'bar', 'heavy'],
  'decline-pushup': ['pecs', 'triceps epaules', 'bw', 'compound'],
  'dips': ['pecs triceps', 'epaules', 'bw', 'compound'],
  'dragon-flag': ['abdos', '', 'bw', 'core'],
  'dumbbell-pullover': ['dos', 'pecs', 'db', 'iso'],
  'face-pull': ['epaules', 'dos', 'cable', 'iso'],
  'farmer-walk': ['avbras', 'dos abdos', 'db', 'skill'],
  'front-lever': ['dos', 'abdos', 'bw', 'skill'],
  'front-raise': ['epaules', '', 'db', 'iso'],
  'front-squat': ['quadris', 'fessiers abdos', 'bar', 'heavy'],
  'glute-bridge': ['fessiers', 'ischios', 'bw', 'iso'],
  'goblet-squat': ['quadris fessiers', '', 'kb', 'compound'],
  'good-morning': ['ischios', 'fessiers dos', 'bar', 'compound'],
  'hack-squat': ['quadris', 'fessiers', 'machine', 'compound'],
  'hammer-curl': ['biceps', 'avbras', 'db', 'iso'],
  'handstand-exit': ['epaules', 'abdos', 'bw', 'skill'],
  'handstand-free': ['epaules', 'triceps abdos', 'bw', 'skill'],
  'handstand-pushup': ['epaules triceps', '', 'bw', 'compound'],
  'handstand-wall-back': ['epaules', 'triceps abdos', 'bw', 'skill'],
  'handstand-wall-front': ['epaules', 'triceps abdos', 'bw', 'skill'],
  'hanging-leg-raise': ['abdos', '', 'bw', 'core'],
  'hip-thrust': ['fessiers', 'ischios', 'bar', 'compound'],
  'hollow-hold': ['abdos', '', 'bw', 'core'],
  'incline-db': ['pecs', 'epaules triceps', 'db', 'compound'],
  'jump-rope': ['', 'mollets', 'cardio', 'cardio'],
  'kettlebell-swing': ['fessiers ischios', 'dos', 'kb', 'compound'],
  'l-sit': ['abdos', 'triceps quadris', 'bw', 'core'],
  'lat-pulldown': ['dos', 'biceps', 'cable', 'compound'],
  'lateral-raise': ['epaules', '', 'db', 'iso'],
  'leg-curl-prone': ['ischios', '', 'machine', 'iso'],
  'leg-curl-seated': ['ischios', '', 'machine', 'iso'],
  'leg-extension': ['quadris', '', 'machine', 'iso'],
  'leg-press': ['quadris fessiers', '', 'machine', 'compound'],
  'muscle-up': ['dos', 'pecs triceps', 'bw', 'skill'],
  'nordic-curl': ['ischios', '', 'bw', 'compound'],
  'ohp-bar': ['epaules', 'triceps', 'bar', 'heavy'],
  'ohp-db': ['epaules', 'triceps', 'db', 'compound'],
  'overhead-triceps-extension': ['triceps', '', 'db', 'iso'],
  'pallof-press': ['abdos', '', 'cable', 'core'],
  'pec-deck': ['pecs', '', 'machine', 'iso'],
  'pike-pushup': ['epaules triceps', '', 'bw', 'compound'],
  'pistol-squat': ['quadris fessiers', '', 'bw', 'compound'],
  'plank': ['abdos', '', 'bw', 'core'],
  'preacher-curl': ['biceps', '', 'db', 'iso'],
  'press-handstand': ['epaules abdos', '', 'bw', 'skill'],
  'pullover-cable': ['dos', '', 'cable', 'iso'],
  'pullup-pronation': ['dos', 'biceps', 'bw', 'compound'],
  'pushup': ['pecs', 'triceps epaules', 'bw', 'compound'],
  'rdl': ['ischios fessiers', 'dos', 'bar', 'heavy'],
  'reverse-fly': ['epaules', 'dos', 'db', 'iso'],
  'reverse-lunge': ['quadris fessiers', '', 'db', 'compound'],
  'row-db-bench': ['dos', 'biceps', 'db', 'compound'],
  'rower': ['', '', 'cardio', 'cardio'],
  'run': ['', '', 'cardio', 'cardio'],
  'shrug': ['dos', '', 'db', 'iso'],
  'side-plank': ['abdos', '', 'bw', 'core'],
  'ski-erg': ['', '', 'cardio', 'cardio'],
  'skin-the-cat': ['dos epaules', '', 'bw', 'skill'],
  'skullcrusher': ['triceps', '', 'ez', 'iso'],
  'sled-push': ['quadris', '', 'cardio', 'cardio'],
  'squat-bar': ['quadris fessiers', 'ischios abdos', 'bar', 'heavy'],
  'step-up': ['quadris fessiers', '', 'db', 'compound'],
  'straddle-planche': ['epaules', 'pecs abdos', 'bw', 'skill'],
  'suitcase-carry': ['abdos', 'avbras', 'db', 'core'],
  'support-hold': ['triceps epaules', '', 'bw', 'skill'],
  'tbar-row': ['dos', 'biceps', 'ez', 'compound'],
  'toes-to-bar': ['abdos', 'dos', 'bw', 'core'],
  'triceps-pushdown': ['triceps', '', 'cable', 'iso'],
  'tuck-planche': ['epaules', 'pecs abdos', 'bw', 'skill'],
  'v-sit': ['abdos', '', 'bw', 'core'],
  'wall-walk': ['epaules', 'abdos', 'bw', 'skill']
};

export const ANIM_KEYS = new Set(Object.keys(E));

// Exact names (folded). A leading "~" marks an approximate animation:
// the closest movement we have, not the exact variant.
const ALIASES = {
  'tractions prise neutre': '~pullup-pronation',
  'tractions neutres': '~pullup-pronation',
  'neutral grip pull ups': '~pullup-pronation',
  'tractions lestees': 'pullup-pronation',
  'muscle up': 'muscle-up',
  'rowing halteres': 'row-db-bench',
  'rowing t bar': 'tbar-row',
  't bar row': 'tbar-row',
  'rowing machine convergente': '~cable-row',
  'pull over poulie': 'pullover-cable',
  'pullover poulie': 'pullover-cable',
  'curl incline': 'curl-incline',
  'curl incline halteres': 'curl-incline',
  'developpe incline barre': '~incline-db',
  'incline bench press': '~incline-db',
  'push press': '~ohp-bar',
  'chest press machine': 'chest-press',
  'chest press': 'chest-press',
  'developpe couche machine': 'chest-press',
  'dips lestes': 'dips',
  'pompes diamant': '~pushup',
  'pompes declinees': 'decline-pushup',
  'pompes en atr': 'handstand-pushup',
  'pompes en poirier': 'handstand-pushup',
  'elevations laterales poulie': '~lateral-raise',
  'reverse pec deck': '~reverse-fly',
  'barre au front': 'skullcrusher',
  'skull crusher': 'skullcrusher',
  'skull crushers': 'skullcrusher',
  'fentes marchees': '~reverse-lunge',
  'fentes': 'reverse-lunge',
  'good morning': 'good-morning',
  'hack squat': 'hack-squat',
  'leg curl assis': 'leg-curl-seated',
  'seated leg curl': 'leg-curl-seated',
  'leg curl': 'leg-curl-prone',
  'nordic curl': 'nordic-curl',
  'mollets assis': 'calf-raise-seated',
  'seated calf raise': 'calf-raise-seated',
  'pistol squat': 'pistol-squat',
  'atr ventre au mur': 'handstand-wall-front',
  'sorties controlees': 'handstand-exit',
  'sortie d atr': 'handstand-exit',
  'v sit': 'v-sit',
  'tuck planche': 'tuck-planche',
  'straddle planche': 'straddle-planche',
  'front lever tuck': 'front-lever',
  'front lever': 'front-lever',
  'back lever tuck': 'back-lever',
  'back lever': 'back-lever',
  'support sur barres paralleles': 'support-hold',
  'support aux barres': 'support-hold',
  'skin the cat': 'skin-the-cat',
  'dragon flag': 'dragon-flag',
  'planche laterale': 'side-plank',
  'gainage lateral': 'side-plank',
  'side plank': 'side-plank',
  'dead bug': 'dead-bug',
  'crunch poulie a genoux': 'cable-crunch',
  'crunch poulie': 'cable-crunch',
  'cable crunch': 'cable-crunch',
  'releves de jambes suspendu': 'hanging-leg-raise',
  'releves de jambes': 'hanging-leg-raise',
  'hanging leg raise': 'hanging-leg-raise',
  'hanging leg raises': 'hanging-leg-raise',
  'toes to bar': 'toes-to-bar',
  'pallof press': 'pallof-press',
  'ab wheel': 'ab-wheel',
  'roue abdominale': 'ab-wheel',
  'farmer walk': 'farmer-walk',
  'marche du fermier': 'farmer-walk',
  'suitcase carry': 'suitcase-carry',
  'kettlebell swing': 'kettlebell-swing',
  'swing kettlebell': 'kettlebell-swing',
  'box jump': 'box-jump',
  'box jumps': 'box-jump',
  'burpees': 'burpee',
  'burpee': 'burpee',
  'corde a sauter': 'jump-rope',
  'jump rope': 'jump-rope',
  'battle ropes': 'battle-ropes',
  'battle rope': 'battle-ropes',
  'sled push': 'sled-push',
  'prowler': 'sled-push',
  'rameur': 'rower',
  'velo': 'bike',
  'velo a bras': '~bike',
  'assault bike': 'bike',
  'course': 'run',
  'course a pied': 'run',
  'tapis de course': 'run',
  'sprints': 'run',
  'ski erg': 'ski-erg',
  'skierg': 'ski-erg',
  'developpe militaire halteres assis': 'ohp-db'
};

// Ordered pattern rules. First match wins, so specific variants come before generic ones.
const RULES = [
  [/^(tractions? supination|tractions? en supination|chin ups?|chinups?)$/, 'chin-up'],
  [/^(face pulls?|face pulls? poulie|tirage visage)$/, 'face-pull'],
  [/^(shrugs?( halteres?| barre)?|dumbbell shrugs?|haussements? d epaules( halteres?)?)$/, 'shrug'],
  [/^(elevations? frontales?( halteres?)?|front raises?|dumbbell front raises?)$/, 'front-raise'],
  [/^(oiseau halteres?|oiseau avec halteres?|oiseau|reverse fly|reverse flyes|reverse flies|dumbbell reverse fly|bent over dumbbell fly)$/, 'reverse-fly'],
  [/^(pull over halteres?|pullover halteres?|pull over|pullover|dumbbell pullovers?|dumbbell pull overs?)$/, 'dumbbell-pullover'],
  [/^(curl pupitre|curl au pupitre|preacher curls?|scott curls?|curl scott)$/, 'preacher-curl'],
  [/^(extension(s)? triceps (nuque|au dessus de la tete|halteres? nuque)|overhead (dumbbell )?triceps extensions?|dumbbell triceps extensions?)$/, 'overhead-triceps-extension'],
  [/^(crunchs?|crunchs? au sol|abdominal crunch(es)?)$/, 'crunch'],
  [/^(ecartes? (a la )?poulie( vis a vis)?|cable fly|cable flyes|cable flies|cable crossover|vis a vis)$/, 'cable-fly'],
  [/^(pec deck|pec deck machine|machine chest fly|butterfly|ecartes? machine)$/, 'pec-deck'],
  [/^(front squats?|squat avant|squat barre avant)$/, 'front-squat'],
  [/^(rowing barre|rowing barre buste penche|rowing buste penche|barbell rows?|bent over barbell rows?|bent over rows?)$/, 'barbell-row'],
  [/^(mollets? (debout )?(a la )?machine|calf raises? machine|machine calf raises?|standing machine calf raises?)$/, 'calf-raise-machine'],
  [/^(planche|gainage|planche avant|planche sur avant bras|gainage ventral|forearm planks?|planks?)$/, 'plank'],
  [/^(souleve de terre|souleve de terre classique|souleve de terre barre|deadlifts?|conventional deadlifts?)$/, 'deadlift'],
  [/^(step ups?|step ups? sur box|step up box|montees? sur box|montees? sur banc)$/, 'step-up'],
  [/^(mollets( debout)?|standing calf raises?|calf raises?)$/, 'calf-raise-standing'],
  [/^(leg curl allonge|leg curl couche|prone leg curls?|lying leg curls?)$/, 'leg-curl-prone'],
  [/^(developpe incline halteres?|incline dumbbell press|incline dumbbell bench press)$/, 'incline-db'],
  [/^(extension triceps poulie haute|extensions? triceps poulie|triceps poulie|pushdown|triceps pushdowns?|cable triceps pushdowns?)$/, 'triceps-pushdown'],
  [/^(tirage horizontal poulie basse|tirage horizontal|rowing poulie basse|seated cable rows?)$/, 'cable-row'],
  [/^(leg extensions?|extension des jambes|extensions? de jambes?)$/, 'leg-extension'],
  [/^(squat bulgare|squats? bulgares?|bulgarian split squats?|fentes? bulgares?)$/, 'bulgarian-squat'],
  [/^(curl marteau|curls? marteau|hammer curls?)$/, 'hammer-curl'],
  [/^(curl barre|curl barre ez|curl ez|barbell curls?|curl biceps barre)$/, 'curl-bar'],
  [/^(curl halteres?|curls? biceps|dumbbell curls?|curl biceps halteres?)$/, 'curl-db'],
  [/^(leg press|presse a cuisses|presse a jambes|presse( inclinee)?)$/, 'leg-press'],
  [/^(tirage vertical poulie haute|tirage vertical|tirage poitrine|lat pulldowns?)$/, 'lat-pulldown'],
  [/^(pompes?|pompes? classiques?|push ups?|pushups?)$/, 'pushup'],
  [/^(goblet squats?|squat goblet|squat kettlebell)$/, 'goblet-squat'],
  [/^(rowing halteres? sur banc|rowing un bras( sur banc)?|rowing haltere un bras|one arm dumbbell rows?|single arm dumbbell rows?|tirage halteres? sur banc)$/, 'row-db-bench'],
  [/^(fentes? arriere|fentes? halteres?|reverse lunges?)$/, 'reverse-lunge'],
  [/^(developpe couche halteres?|dumbbell bench press|bench press halteres?)$/, 'bench-db'],
  [/^(souleve de terre roumain|souleve de terre jambes tendues|romanian deadlifts?|rdl|souleve de terre jambes semi tendues)$/, 'rdl'],
  [/^(dips|dips aux barres paralleles|parallel bar dips|bar dips)$/, 'dips'],
  [/^(developpe couche barre|barbell bench press|bench press barre|bench press|developpe couche)$/, 'bench-bar'],
  [/^(tractions? pronation|tractions? en pronation|pull ups?|pullups?|tractions?)$/, 'pullup-pronation'],
  [/^(hip thrusts?|hip thrust barre|barbell hip thrusts?)$/, 'hip-thrust'],
  [/^(squat barre|squat|squats|barbell back squats?|back squats?)$/, 'squat-bar'],
  [/^(elevations? laterales? halteres?|dumbbell lateral raises?|lateral raises?|elevations? laterales?)$/, 'lateral-raise'],
  // Skills, calisthenics and leg machines
  [/press (to |en |vers )?(atr|handstand|poirier)|press atr|press handstand|monte(e)? en press/, 'press-handstand'],
  [/montees? (des )?pieds au mur|pieds au mur|wall walks?|marche au mur/, 'wall-walk'],
  [/ventre au mur|face au mur|chest to wall|belly to wall/, 'handstand-wall-front'],
  [/dos au mur|back to wall|(atr|poirier|handstand) (contre le |au )?mur|wall handstand/, 'handstand-wall-back'],
  [/\b(pompes?|push ups?) (en )?(atr|poirier|handstand)|handstand push ups?|hspu/, 'handstand-pushup'],
  [/\batr\b|poirier|handstand|appui tendu renverse/, 'handstand-free'],
  [/\bl ?sit\b|equerre/, 'l-sit'],
  [/hollow|gainage creux|position creuse|\bbanane\b/, 'hollow-hold'],
  [/pike/, 'pike-pushup']
];

// Rules that need a test on top of the pattern.
function special(n) {
  if (/^(developpe militaire halteres?|dumbbell overhead press|dumbbell shoulder press|developpe epaules? halteres?|developpe arnold|arnold press)( [a-z0-9]+)*$/.test(n) && !/\bbarre\b|barbell/.test(n)) return 'ohp-db';
  if (/scapul|suspension active|hang actif|active hang|dead hang|suspension (a la |barre|passive)|^suspension$/.test(n) && !/jambes?|genoux|knee|leg|relev/.test(n)) return 'active-hang';
  if (/(militaire|overhead press|\bohp\b|developpe epaules?|shoulder press)/.test(n) && (/barre|barbell/.test(n) || /^(developpe militaire|overhead press|ohp|military press)$/.test(n))) return 'ohp-bar';
  if (/pont fessier|glute bridge|\bpont\b/.test(n)) return 'glute-bridge';
  if (/abduct/.test(n)) return 'abductor-machine';
  if (/adduct/.test(n)) return 'adductor-machine';
  return '';
}

const cache = new Map();

// Returns { key, approx } where key is the animation/catalogue key ('' if unknown).
export function matchExercise(name) {
  const n = foldName(name);
  if (cache.has(n)) return cache.get(n);
  let raw = ALIASES[n] || '';
  if (!raw) {
    for (const [re, key] of RULES) {
      if (re.test(n)) { raw = key; break; }
    }
  }
  if (!raw) raw = special(n);
  const out = { key: raw.replace(/^~/, ''), approx: raw.startsWith('~') };
  cache.set(n, out);
  return out;
}

// Full info used across the app.
export function exerciseInfo(name) {
  const m = matchExercise(name);
  const n = foldName(name);
  const e = E[m.key];
  if (!e) {
    // Unknown name: guess what we safely can from words.
    let equip = 'other';
    if (/\bbarre\b|barbell/.test(n)) equip = 'bar';
    else if (/haltere|dumbbell/.test(n)) equip = 'db';
    else if (/machine|presse/.test(n)) equip = 'machine';
    else if (/poulie|cable/.test(n)) equip = 'cable';
    return { key: '', approx: false, primary: [], secondary: [], equip, restClass: 'unknown' };
  }
  let equip = e[2];
  // A named variant overrides the default equipment of the animation.
  if (equip !== 'cardio') {
    if (/haltere|dumbbell/.test(n) && equip === 'bar') equip = 'db';
    else if (/\bbarre\b|barbell/.test(n) && (equip === 'db' || equip === 'kb')) equip = 'bar';
    else if (/machine|smith|convergente/.test(n) && equip !== 'machine') equip = 'machine';
  }
  return {
    key: m.key,
    approx: m.approx,
    primary: e[0] ? e[0].split(' ') : [],
    secondary: e[1] ? e[1].split(' ') : [],
    equip,
    restClass: e[3]
  };
}

// Weight step for +/- buttons and "+2,5 kg".
export function weightStep(info, weight, settings) {
  const w = Number(weight) || 0;
  switch (info.equip) {
    case 'bar': return settings.barStep || 2.5;
    case 'ez': return 2.5;
    case 'db':
      if (w > 0 && w % 2.5 !== 0 && w % 2 === 0) return 2;
      if (w > 0 && w % 2.5 !== 0) return 1;
      return 2.5;
    case 'kb': return 4;
    case 'machine':
    case 'cable':
      return w > 0 && w % 5 === 0 ? 5 : 2.5;
    default: return 2.5;
  }
}

// Plate maths. total includes the bar. Returns { perSide: [plates], rest, possible }.
export function plateBreakdown(total, bar, plates) {
  const t = Number(total);
  const b = Number(bar) || 0;
  if (!isFinite(t) || t <= 0) return null;
  if (t < b) return { perSide: [], rest: 0, below: true };
  let side = Math.round(((t - b) / 2) * 1000) / 1000;
  const avail = (plates || []).slice().sort((a, c) => c - a);
  const out = [];
  for (const p of avail) {
    while (side + 1e-9 >= p) {
      out.push(p);
      side = Math.round((side - p) * 1000) / 1000;
    }
  }
  return { perSide: out, rest: side, below: false };
}

// IWF-ish colours so the plate picture matches what's in the gym.
export const PLATE_COLORS = {
  25: '#d8333f', 20: '#2f6fd6', 15: '#e8c22c', 10: '#2fa45a', 5: '#e9eef3',
  2.5: '#4b5360', 2: '#3d8bd4', 1.25: '#b8c0c8', 1: '#9aa3ab', 0.5: '#c9ced3'
};
