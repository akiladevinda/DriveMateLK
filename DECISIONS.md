# DriveMate LK — Architecture Decisions

## Why Supabase (no separate Node server)

The product needs auth, Postgres, file storage, RLS and serverless functions. Supabase Free Plan covers the launch backend without operating a dedicated Express/Node host. Privileged work (Gemini calls, account deletion, report generation) runs in Edge Functions so secrets never ship in the mobile binary.

## Why Expo + Expo Router

Expo keeps iOS/Android delivery aligned, supports EAS Build for store submission, and Expo Router provides file-based navigation that matches the large feature surface (tabs + nested vehicle modules).

## Why Expo SDK 54 (not latest)

The project was initially created on SDK 57, but App Store Expo Go lagged behind newer SDKs. DriveMate LK targets **SDK 54** so developers can scan the QR code in the public Expo Go app without waiting for store approval of newer Expo Go builds or creating a custom development client first.

## State management

- **TanStack Query**: server state (vehicles, documents, fuel, garages).
- **Zustand**: client session/profile bootstrap and UI preferences (theme, language, active vehicle).
- Avoids Redux boilerplate while keeping a clear split between remote and local state.

## Money as integer minor units

All financial amounts are stored and calculated as integers (e.g. LKR paisa). Display formatting happens at the edge. This prevents floating-point drift in monthly/lifetime ownership totals.

## AI provider abstraction

`AIProvider` is implemented by `GeminiAIProvider` (Edge Functions) and `MockAIProvider` (local/dev without keys). The mobile app never calls Gemini directly. Every AI response includes a safety notice: guidance is not a confirmed mechanical diagnosis.

## Mock integrations for partnership features

Roadside dispatch, marketplace payments, subscription billing and live market valuation require partners or credentials. Each has a production interface plus a clearly labelled mock/demo implementation so the UX and data model ship without pretending the integration is live.

## Storage design

Private buckets with paths `{userId}/{vehicleId}/{recordId}/{filename}` and short-lived signed URLs. Sensitive documents are never public. Demo garage images may use public demo assets only when explicitly marked demo.

## Security

- RLS on every application table
- Vehicle access via ownership or `vehicle_members` permissions
- Secure Store for session persistence
- Rate limiting + usage tracking on AI Edge Functions
- Shareable vehicle reports use revocable/expiring tokens; sensitive identifiers excluded by default

## Localization

English ships complete. Sinhala and Tamil files exist with infrastructure, but copy remains pending human review rather than shipping unchecked machine translation.

## Theme

Brand palette from DriveMate LK identity:

- Navy `#0D1B2A` / surface `#1B263B`
- Accent green `#2EC946`
- Warning orange `#F9A826`
- Off-white `#F5F7FA`

Dark mode is the default first-run theme. Screens consume `useTheme()` semantic tokens — no hardcoded one-off palette values in feature screens.

## Health score positioning

Vehicle Health Score is an app-generated maintenance indicator based on documents, reminders and reported issues. It is never marketed as proof of mechanical roadworthiness.
