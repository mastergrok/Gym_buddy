# Gym Buddy

Telegram Mini App for logging a gym session. It is a single static page (no build) served by GitHub Pages from the root of `main`:

**https://mastergrok.github.io/Gym_buddy/**

GitHub Pages uses the repository name as written (`Gym_buddy`). The lowercase path `https://mastergrok.github.io/gym_buddy/` is not served.

Open the URL above for the default session. Finished sets, edits and the running rest timer are stored in `localStorage`, keyed by the programme, so closing the page does not drop progress. **Terminer** clears that saved state.

## Programme query param `p`

`p` is the [base64url](https://datatracker.ietf.org/doc/html/rfc4648#section-5) encoding (UTF-8 JSON, no padding) of:

```json
{
  "title": "Poussée",
  "exercises": [
    {"name": "Développé couché barre", "sets": 4, "reps": 10, "weight": 60, "unit": "kg", "rest": 120},
    {"name": "Dips", "sets": 4, "reps": 10, "rest": 90},
    {"name": "L-sit", "sets": 4, "seconds": 15, "rest": 60}
  ]
}
```

- `sets`, `reps` and `seconds` are exact numbers. Never send a range.
- Use `reps` for repetitions. For a hold, omit `reps` and send `seconds` instead.
- `weight` is optional. `unit` defaults to `kg` when `weight` is set (`kg par bras` is a valid unit).
- `rest` is the rest after a completed set, in seconds.
- The page does not add a warm-up block. Put only the work you want logged.

If `p` is missing or not valid JSON of that shape, the page loads this default session (title `Séance`):

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

Example (bench + L-sit): <https://mastergrok.github.io/Gym_buddy/?p=eyJ0aXRsZSI6IlBvdXNzw6llIiwiZXhlcmNpc2VzIjpbeyJuYW1lIjoiRMOpdmVsb3Bww6kgY291Y2jDqSBiYXJyZSIsInNldHMiOjQsInJlcHMiOjEwLCJ3ZWlnaHQiOjYwLCJ1bml0Ijoia2ciLCJyZXN0IjoxMjB9LHsibmFtZSI6Ikwtc2l0Iiwic2V0cyI6NCwic2Vjb25kcyI6MTUsInJlc3QiOjYwfV19>

## Reply-keyboard `web_app` button

`Telegram.WebApp.sendData` only works when the Mini App is opened from a **reply-keyboard** button (`KeyboardButton` with `web_app`). It does not work from the menu button, an inline button, a direct link, or a normal browser. Outside that button the page shows the JSON and a **Copier** button instead of calling `sendData`.

```python
from telegram import KeyboardButton, ReplyKeyboardMarkup, WebAppInfo

url = "https://mastergrok.github.io/Gym_buddy/?p=" + p
markup = ReplyKeyboardMarkup(
    [[KeyboardButton(text="Séance", web_app=WebAppInfo(url=url))]],
    resize_keyboard=True,
)
await bot.send_message(chat_id, "Lance la séance", reply_markup=markup)
```

Raw Bot API `reply_markup`:

```json
{
  "keyboard": [[{
    "text": "Séance",
    "web_app": {"url": "https://mastergrok.github.io/Gym_buddy/?p=..."}
  }]],
  "resize_keyboard": true
}
```

The bot then receives `message.web_app_data.data`: a JSON string of at most 4096 bytes.

## Payload

```json
{
  "type": "gym_session",
  "title": "Séance",
  "started": "2026-11-12T11:00:00.000Z",
  "duration_s": 1234,
  "exercises": [{
    "name": "Développé couché barre",
    "target": "4 × 10 · 60 kg",
    "sets": [{"done": true, "reps": 10, "weight": 60}]
  }]
}
```

Holds use `seconds` instead of `reps`. `weight` is omitted when the set has none. If that object would exceed 4096 bytes, keys are shortened (`t`, `n`, `s`, `d`, `e`, and per set `ok`, `r` or `sec`, `w`), then targets (`g`) are dropped, then sets are removed from the end until it fits.
