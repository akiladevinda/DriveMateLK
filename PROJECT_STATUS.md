# DriveMate LK — Project Status

Last updated: 2026-07-13

## Completed

- [x] Expo SDK 54 TypeScript project with Expo Router (downgraded from 57 for App Store Expo Go)
- [x] Theme tokens (light/dark) and reusable UI + card components
- [x] Environment validation (`.env.example`)
- [x] Supabase client with Secure Store session adapter
- [x] Localization architecture (EN complete; SI/TA placeholders)
- [x] Auth service + Zustand auth store
- [x] Auth screens (sign-in, sign-up, forgot password, verify email)
- [x] Onboarding flow (welcome, permissions, add vehicle, complete)
- [x] Bottom tabs: Home, Vehicles, AI, Garages, More
- [x] Vehicle CRUD screens + detail sub-routes
- [x] Fuel / expense / document services + create forms
- [x] AI provider abstraction (`MockAIProvider`, `GeminiAIProvider`)
- [x] AI screens: dashboard scanner, symptom assistant, chat, inspection, resale
- [x] Health-score and fuel-economy pure calculation engines
- [x] Full SQL migrations (profiles → vehicles → docs/fuel → AI/garages → insurance/resale → storage)
- [x] Seed data (categories, templates, demo garages/providers, checklists)
- [x] Edge Functions for AI, reports, notifications stub, delete-account
- [x] EAS profiles (`eas.json`)
- [x] README / DECISIONS / PROJECT_STATUS
- [x] **Reminder service** — CRUD/snooze/complete + idempotent `expo-notifications` scheduling; `/reminders` screen linked from More
- [x] **Garage service** — list/filter, detail, favorites; Garages tab + detail wired to seeded data
- [x] **Roadside service** — Supabase requests + `MockRoadsideProvider` status simulation; roadside screens wired
- [x] **Valuation providers** — rule-based + mock market estimate; `/resale/valuation` wired with AI safety disclaimer
- [x] **Report service** — vehicle passport HTML/PDF via `expo-print` + `expo-sharing`; `/reports/vehicle-passport` wired
- [x] **Subscription entitlements** — `MockEntitlementProvider` (free vs premium); settings/subscription wired
- [x] **Unit tests** — vitest suite for fuel calculations, health score, money utils
- [x] **Family sharing** — `sharing-service` (invite/list/revoke/accept architecture) + `/vehicles/[id]/sharing` wired
- [x] **Insurance hub** — `insurance-service` (policies + claims, no live purchase) + hub/create screens with Zod forms
- [x] **Leasing hub** — `leasing-service` (lease records + payments CRUD, estimated remaining labelled as estimate)
- [x] **Accident assistant** — `/accident` safety checklist, 119 call, location share, claim draft + PDF package stub
- [x] **Maintenance + service services** — schedules CRUD, service records with optional linked expense + timeline
- [x] **Analytics** — `analytics-service` monthly fuel/expense aggregation + vehicle analytics with MetricCards/bar chart

## In progress

- [ ] Deepen garage discovery (map filters, quote compare) beyond shell
- [ ] Vehicle Health Score persistence + Edge/DB recalculation trigger wiring
- [ ] Digital vehicle passport PDF generation polish (branding, share links)
- [ ] Family sharing invitation accept flow via Edge Function (RLS bypass for token lookup)
- [ ] Offline draft queue for fuel/expenses

## Remaining / launch-targeted shells present

These have routes + domain models; mock/demo providers where external partnerships are required:

- [ ] Insurance purchase (architecture only — no live purchasing)
- [ ] OBD-II native BLE (interface + mock only until dev build)
- [ ] Marketplace payments (live billing beyond mock entitlements)
- [ ] Global search
- [ ] Verified garage review moderation tooling

## Known issues

- npm peer resolution may require `--legacy-peer-deps` on Node 24 with Expo 54.
- Project targets Expo SDK 54 so it runs in App Store / Play Store Expo Go. Newer SDKs (55–57) may need a development build or `eas go`.
- Sinhala/Tamil strings are English placeholders pending human review.
- Google Maps keys optional; map view degrades without them.
- Gemini calls require Edge Function secrets; otherwise mock AI responses are used.
- `delete-account` Edge Function must be deployed before production account deletion works.
- Roadside dispatch uses demo status simulation until live provider partnerships exist.
- Invitation accept by token may require Edge Function in production due to invitation RLS.

## Required external configuration

1. Supabase project URL + anon key in `.env`
2. Apply migrations + seed
3. Deploy Edge Functions + set Gemini secrets
4. EAS project ID in `app.config.ts` `extra.eas.projectId`
5. Optional: Google Maps Android/iOS keys
6. Optional: Apple/Google OAuth credentials for social sign-in

## Database migrations created

1. `20260313000001_init_extensions_and_helpers.sql`
2. `20260313000002_profiles_and_settings.sql`
3. `20260313000003_vehicles.sql`
4. `20260313000004_documents_maintenance_fuel_expenses.sql`
5. `20260313000005_ai_garages_roadside.sql`
6. `20260313000006_insurance_leasing_resale_subscriptions.sql`
7. `20260313000007_storage_buckets.sql`
8. `20260313000008_rls_verification_notes.sql`

## Test status

- TypeScript / lint: `npm run typecheck`, `npm run lint`
- Unit tests: `npm run test` (vitest — fuel calculations, health score, money)
- RLS: manual two-user verification steps documented in migration 08
