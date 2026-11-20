# Gym Buddy

Telegram Mini App for logging a gym session. Static files, no build, served by GitHub Pages from the root of `main`:

**https://mastergrok.github.io/Gym_buddy/**

GitHub Pages uses the repository name as written (`Gym_buddy`). The lowercase path `https://mastergrok.github.io/gym_buddy/` is not served.

## What it does

- **Session**: tap a set to validate it. Long press or ✎ opens the set editor: a bottom sheet with −/+ steppers for reps (or seconds) and load, so the keyboard is optional. The page never moves when the sheet opens or closes.
- **Last time**: each exercise shows what you did last time (`↺ il y a 2 j : 62,5 kg × 10, 10, 9`) with two buttons: `= 62,5` takes back that load, `+2,5 kg` adds one step. The step follows the equipment: 2.5 kg for a barbell, 2 or 1 kg for dumbbells depending on the load, 5 kg for a machine stack. `💡` marks the button when every set at that load hit the target reps and none was rated hard.
- **Feel (RPE)**: after each set, the rest bar asks `😌 Facile · 🙂 OK · 🥵 Dur` in one tap. It goes in the payload so the coach can adjust loads.
- **Rest**: the programme's `rest` when given, otherwise automatic by exercise type (heavy barbell 3 min, compound 2 min, isolation 1 min 15, core 1 min, plus or minus by reps). `Dur` adds 30 s, `Facile` removes 15 s. Light buzz and beep 10 s before the end, then a long buzz and a beep at the end. The timer is based on timestamps, so it stays right after the phone sleeps.
- **Records 🏆**: heaviest load, estimated 1RM (Epley, sets of 12 reps or fewer), max reps (bodyweight) and longest hold. A record needs at least one previous session of that exercise. A beaten record shows a toast, a sound and 🏆 on the set.
- **History 📈**: per exercise, records, a curve of the best estimated 1RM (or reps or seconds) per session, and the list of sessions.
- **Plates 🏋️**: for barbell exercises, the card shows what to load on each side. The calculator sheet draws the bar. Bar weight and available plates are in the settings.
- **Week 📊**: sessions done against the weekly goal, sets per muscle (1 for primary muscles, 0.5 for secondary), tonnage, time, comparison with the previous week, records of the week.
- **Offline**: a service worker caches the app and every animation it has shown. Everything is saved on the phone as you go. On Android the app opens with no network once it has been opened online. iOS does not run service workers inside Telegram: an app already open keeps working offline, but opening it needs the network.
- **Backup**: history and settings are copied to Telegram `CloudStorage` (Bot API 6.9+), so a cleared WebView or a new phone gets them back. Manual export and import (copy/paste) are in the settings.
- A session left open (app closed without **Terminer**) is filed into the history after 6 hours instead of being resumed the next time the same programme opens.

## Programme query param `p`

`p` is the [base64url](https://datatracker.ietf.org/doc/html/rfc4648#section-5) encoding (UTF-8 JSON, no padding) of:

```json
{
  "title": "Poussée",
  "week_target": 4,
  "exercises": [
    {"name": "Développé couché barre", "sets": 4, "reps": 10, "weight": 60, "unit": "kg", "rest": 120},
    {"name": "Dips", "sets": 4, "reps": 10},
    {"name": "L-sit", "sets": 4, "seconds": 15, "rest": 60}
  ]
}
```

- `sets`, `reps` and `seconds` are exact numbers. Never send a range.
- Use `reps` for repetitions. For a hold, omit `reps` and send `seconds` instead. A hold shows **⏱ Chrono**: a 3-2-1 get-ready (beep and `HapticFeedback`), then a countdown. At zero the set is ticked and the rest starts. Tapping the set still validates it directly.
- `weight` is optional. `unit` defaults to `kg` when `weight` is set (`kg par bras` is a valid unit).
- `rest` is optional, in seconds. **Omit it to let the app choose** by exercise type. The user can also force automatic rest in the settings.
- `week_target` is optional: sessions planned per week (1–14). It updates the goal in the week summary.
- Use plain exercise names (`Développé couché barre`, `Squat barre`, `Tractions`, `Leg curl`…). The name picks the animation, the muscles and the equipment. The history and records follow the exact name, so keep the same name for the same exercise from one session to the next.
- The page does not add a warm-up block. Put only the work you want logged.

If `p` is missing or invalid, the page loads this default session (title `Séance`):

| Exercice | Cible | Repos |
| --- | --- | --- |
| Développé couché barre | 4 × 10 · 60 kg | 120 s |
| Dips | 4 × 10 | 90 s |
| Développé militaire haltères | 3 × 12 · 17.5 kg par bras | 90 s |
| Élévations latérales haltères | 3 × 12 · 10 kg | 60 s |
| Pike push-ups | 3 × 10 | 60 s |
| L-sit | 4 × 15 s | 60 s |
| ATR libre | 5 × 10 s | 60 s |

Encode in Node:

```js
const p = Buffer.from(JSON.stringify(programme)).toString('base64url');
const url = 'https://mastergrok.github.io/Gym_buddy/?p=' + p;
```

## Reply-keyboard `web_app` button

`Telegram.WebApp.sendData` only works when the Mini App is opened from a **reply-keyboard** button (`KeyboardButton` with `web_app`). It does not work from the menu button, an inline button, a direct link, or a normal browser. Outside that button the page shows the JSON and a **Copier** button instead.

```python
from telegram import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo

url = "https://mastergrok.github.io/Gym_buddy/?p=" + p
markup = ReplyKeyboardMarkup(
    [[KeyboardButton(text="Séance", web_app=WebAppInfo(url=url))]],
    resize_keyboard=True,
)
await bot.send_message(chat_id, "Lance la séance", reply_markup=markup)
```

The bot then receives `message.web_app_data.data`: a JSON string of at most 4096 bytes.

## Payload

```json
{
  "type": "gym_session",
  "title": "Séance",
  "started": "2026-11-12T11:00:00.000Z",
  "duration_s": 1234,
  "comment": "Facile, sauf les dips. Série 3 sautée, épaule fatiguée.",
  "exercises": [{
    "name": "Développé couché barre",
    "target": "4 × 10 · 60 kg",
    "sets": [
      {"done": true, "reps": 10, "weight": 65, "rpe": "ok", "pr": true},
      {"done": true, "reps": 9, "weight": 65, "rpe": "dur"},
      {"done": false, "reps": 10, "weight": 65}
    ]
  }]
}
```

- `rpe` is the feel of a done set: `"facile"`, `"ok"` or `"dur"`. Absent when not given. Use it to adjust the next loads: all `facile`/`ok` with target reps met → go up; `dur` or missed reps → stay or go down.
- `pr` is `true` when the set beat a record (load, estimated 1RM, reps or hold time).
- `weight` is the load actually used; it can differ from the target when the user changed it.
- `comment` is the optional note from the end screen. It is always present and may be `""`.

Holds use `seconds` instead of `reps`. `weight` is omitted when the set has none. If the object would exceed 4096 bytes, keys are shortened (`t`, `n`, `s`, `d`, `e`, and per set `ok`, `r` or `sec`, `w`, `f` for feel as 1 = facile, 2 = ok, 3 = dur, `pr`), then targets (`g`) are dropped. Then the comment is cut from the end, then feel and record flags are dropped, then sets are removed from the end until it fits. `comment` keeps its name.

## Files

| Path | Role |
| --- | --- |
| `index.html` | Markup |
| `css/app.css` | Styles (Telegram theme colours) |
| `js/app.js` | Session: sets, rest, holds, records, set editor, finish and send |
| `js/panels.js` | Sheets: history, week, plates, settings, animation, JSON summary |
| `js/catalog.js` | Exercise names → animation, muscles, equipment, rest class; plate maths |
| `js/history.js` | History store (localStorage) and Telegram CloudStorage mirror |
| `js/payload.js` | `sendData` payload and the 4096-byte fitting |
| `js/sheets.js` | Bottom sheets: scroll lock, keyboard offset, BackButton, toast |
| `js/settings.js`, `js/util.js`, `js/format.js` | Settings, helpers |
| `sw.js` | Offline cache |
| `assets/exercises/{female,male}/*.webp` | Animated exercise illustrations |

Animations are animated WebP (converted from the original GIFs at quality 62: 47 MB → 6.8 MB, no visible change). To add one, drop `<key>.webp` in both folders and add the key to `catalog.js`. Names ending with `≈` in the app use the closest animation available.
