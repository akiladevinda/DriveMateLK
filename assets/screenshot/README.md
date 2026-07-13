# App screenshots

Drop PNG/JPG screenshots here. Current files:

| File | Used for |
|------|----------|
| `hero.MOV` | Landing hero video (converted to `website/img/shots/hero.mp4`) |
| `home.png` | Gallery + poster fallback |
| `scan-fault.png` | Scan Fault section |
| `scan-fault2.png` | Ownership grid + gallery |
| `garages.png` | Ownership + gallery |
| `mylist.png` | Vehicles list + gallery |

Optional later: `fuel.png`, `reminders.png`, `documents.png`

Recommended: portrait phone screenshots (~1170×2532 or similar).

After replacing `hero.MOV`, re-encode for the site:

```bash
avconvert -s assets/screenshot/hero.MOV -p PresetAppleM4V720pHD -o website/img/shots/hero.m4v --replace
mv website/img/shots/hero.m4v website/img/shots/hero.mp4
```
