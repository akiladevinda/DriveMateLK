# DriveMate LK website

Marketing landing page inspired by modern app sites like [ParkUsher](https://www.parkusher.app/).

## Run locally

```bash
cd website
npx serve .
```

Open the URL shown (usually `http://localhost:3000`).

## Add screenshots

1. Put files in `assets/screenshot/` (source of truth)
2. Copy into the site folder (required for local preview):

```bash
cp -f assets/screenshot/*.png website/img/shots/
```

Or drop PNGs directly into `website/img/shots/`.

| File | Used for |
|------|----------|
| `hero.mp4` | Hero video (from `assets/screenshot/hero.MOV`) |
| `home.png` | Poster + gallery |
| `scan-fault.png` | Scan Fault section |
| `garages.png` | Gallery |
| `fuel.png` | Ownership section |
| `reminders.png` | Ownership section |
| `documents.png` | Ownership section |

Until files exist, the page shows labeled placeholders.

## Store links

Edit `website/js/config.js`:

```js
appStoreUrl: 'https://apps.apple.com/...',
playStoreUrl: 'https://play.google.com/store/apps/details?id=com.drivematelk.app',
```

## Deploy

Publish the `website/` folder (screenshots are already under `website/img/shots/`).
When you add new shots to `assets/screenshot/`, copy them again:

```bash
cp -f assets/screenshot/*.png website/img/shots/
```
