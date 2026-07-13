# DriveMate LK

Your intelligent vehicle companion for Sri Lanka.

DriveMate LK is a production-structured React Native (Expo) application for managing vehicles, documents, maintenance, fuel, expenses, AI warning-light guidance, garages, roadside assistance, inspections, resale reports and a digital vehicle passport.

## Stack

- Expo SDK 54 + Expo Router (App Store Expo Go compatible)
- TypeScript (strict)
- Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- TanStack Query + Zustand
- React Hook Form + Zod
- Gemini API via Supabase Edge Functions only (never from the mobile client)

## Requirements

- Node.js 20.19+ or 22.13+ (or compatible current LTS)
- npm
- Expo Go or a development build
- A Supabase project (free plan is enough to start)
- Optional: Gemini API key for live AI (mock provider works without it)

## Quick start

```bash
cp .env.example .env
# Fill EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

npm install --legacy-peer-deps
npx expo start
```

## Environment variables

Client (`.env`):

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=
EXPO_PUBLIC_SUPPORT_EMAIL=
EXPO_PUBLIC_PRIVACY_POLICY_URL=
EXPO_PUBLIC_TERMS_URL=
```

Never put `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in the mobile app.

### Edge Function secrets

```bash
supabase secrets set GEMINI_API_KEY=your_key
supabase secrets set GEMINI_TEXT_MODEL=gemini-2.0-flash
supabase secrets set GEMINI_VISION_MODEL=gemini-2.0-flash
supabase secrets set SUPABASE_URL=...
supabase secrets set SUPABASE_ANON_KEY=...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

## Supabase setup

1. Create a project at https://supabase.com
2. Install CLI: `brew install supabase/tap/supabase` (or npm global)
3. Link: `supabase link --project-ref <ref>`
4. Apply migrations: `supabase db push` (or `supabase db reset` locally)
5. Deploy functions: `supabase functions deploy`
6. Confirm storage buckets from migration `20260313000007_storage_buckets.sql`

Seed data includes fictional demo garages and roadside providers clearly marked `(Demo)`.

## Scripts

```bash
npm start          # Expo dev server
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm run android
npm run ios
```

## App identifiers

- Android package / iOS bundle: `com.drivematelk.app`
- Change these in `app.config.ts` before store submission.

## EAS Build

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform android
eas build --profile preview --platform ios
eas build --profile production --platform all
```

Profiles live in `eas.json`.

## AI safety

AI features are guidance only. The app must never present warning-light or symptom analysis as a confirmed mechanical diagnosis. Critical warnings escalate conservatively and recommend professional inspection.

## Localization

- English: complete
- Sinhala / Tamil: infrastructure ready; copy marked pending human review in `src/localization/translations.ts`

## Documentation

- `PROJECT_STATUS.md` — module progress
- `DECISIONS.md` — architecture decisions
- `supabase/migrations/` — schema + RLS
- `supabase/functions/` — secure backend

## Auth email redirects (important)

Supabase defaults Site URL to `http://localhost:3000`. That breaks mobile confirmation emails.

In **Supabase → Authentication → URL Configuration**:

1. **Site URL:** `drivematelk://auth/callback` (or keep a public site URL if you have one)
2. **Redirect URLs** (add all of these):
   - `drivematelk://**`
   - `exp://**` (Expo Go)
   - `http://localhost:8081/**`

For faster local testing: **Authentication → Providers → Email → disable Confirm email**.

The app sends `emailRedirectTo` via `expo-linking` (`auth/callback`).

