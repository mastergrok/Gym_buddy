// User settings, kept locally and mirrored to Telegram CloudStorage.

import { store, sound } from './util.js';
import { cloudSaveSettings, cloudLoadSettings } from './history.js';

const KEY = 'gymbuddy:settings';

export const DEFAULTS = {
  avatar: 'female',
  sound: true,
  restMode: 'programme', // 'programme': use the coach's rest when given; 'auto': always adapt
  feelAdjust: true,      // "Dur" adds 30 s of rest, "Facile" removes 15 s
  restWarn: true,        // buzz 10 s before the end of the rest
  bar: 20,
  barStep: 2.5,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  weekTarget: 3
};

export const ALL_PLATES = [25, 20, 15, 10, 5, 2.5, 2, 1.25, 1, 0.5];

const hadLocal = store.get(KEY) != null;
export const settings = Object.assign({}, DEFAULTS, store.json(KEY, {}));

// Migration from the first version, which only stored the avatar.
const oldAvatar = store.get('gymbuddy:avatar');
if (!hadLocal && (oldAvatar === 'male' || oldAvatar === 'female')) settings.avatar = oldAvatar;
sound.on = !!settings.sound;

export function saveSettings() {
  sound.on = !!settings.sound;
  store.set(KEY, JSON.stringify(settings));
  cloudSaveSettings(settings);
}

// On a new phone, bring back the settings saved in Telegram.
export async function pullCloudSettings() {
  if (hadLocal) return false;
  const remote = await cloudLoadSettings();
  if (!remote || typeof remote !== 'object') return false;
  for (const k of Object.keys(DEFAULTS)) if (k in remote) settings[k] = remote[k];
  sound.on = !!settings.sound;
  store.set(KEY, JSON.stringify(settings));
  return true;
}
