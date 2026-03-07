# Triada

Hybrid mobile application (web + iOS + Android) built with Vue 3, TypeScript, and Capacitor.

## Current stack

- Vue 3 + Vite + TypeScript
- Capacitor 7 (Android/iOS)
- PrimeVue 4 + PrimeIcons + Aura
- Pinia (state management)
- Vue Router (navigation)
- vue-i18n (`es` default, `en` fallback)
- Platform-aware persistence:
  - SQLite on native runtime
  - IndexedDB on web runtime

## Requirements

- Node `v22.21.1` (aligned with Volta pin)
- pnpm `10.30.3`
- iOS: Xcode + CocoaPods
- Android: Android Studio + Android SDK
- Native E2E: Maestro CLI

## Installation

```bash
pnpm install
```

Android local environment variables:

```bash
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

## Main commands

Development:

```bash
pnpm dev
pnpm dev:server
pnpm dev:android
pnpm dev:ios
```

Build and preview:

```bash
pnpm build
pnpm preview
```

PWA build verification:

```bash
pnpm build
pnpm preview
```

Then open `http://localhost:4173`, verify installability in DevTools (`Application` -> `Manifest`) and test offline mode from DevTools (`Network` -> `Offline`).

## Docker deployment

Build and run with Docker Compose:

```bash
docker compose up --build -d
```

Open `http://localhost:8081`.

Stop and remove containers:

```bash
docker compose down
```

Capacitor:

```bash
pnpm cap:add:ios
pnpm cap:add:android
pnpm cap:sync
pnpm cap:sync:ios
pnpm cap:sync:android
pnpm cap:open:ios
pnpm cap:open:android
pnpm cap:build:ios
pnpm cap:build:android
```

Quality:

```bash
pnpm format
pnpm lint
pnpm lint:check
pnpm type-check
pnpm build:check
```

`pnpm build:check` is scoped to `src/` checks only (format + Vitest coverage + type-check + lint).

## Testing

Unit and integration (Vitest):

```bash
pnpm test:unit
pnpm test:unit:coverage
```

Web E2E (Cypress):

```bash
pnpm test:e2e
pnpm test:e2e:dev
```

Native E2E (Maestro):

```bash
pnpm test:e2e:native:android
pnpm test:e2e:native:ios
pnpm test:e2e:native
```

Included Maestro flows:

- `maestro/flows/android-smoke.yaml`
- `maestro/flows/ios-smoke.yaml`

If Maestro is not installed:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Architecture best practices

### 1) Layering and boundaries

- `src/domain`: pure business rules, framework-agnostic.
- `src/data`: infrastructure, repositories, storage adapters.
- `src/features` and `src/shared`: UI, composables, and components.
- Do not place persistence logic directly in Vue pages/components.

### 2) Platform persistence access

- Use `src/data/repositories/BudgetRepository.ts` as the single facade.
- Do not import concrete SQLite or IndexedDB implementations from UI code.
- Keep feature parity across `BudgetRepository.sqlite.ts` and `BudgetRepository.indexeddb.ts`.

### 3) Stable contracts

- Domain types are contracts (`BudgetYear`, `BudgetMonth`, `BudgetAllocation`).
- Any contract change must update repositories, tests, and consumers.

### 4) Money precision model

- Store all money in integer minor units (cents).
- Never use floating point values as persisted source-of-truth financial state.

### 5) Error handling and resilience

- Wrap async boundaries in `try/catch`.
- Log actionable error context.
- Provide user feedback for failures (toast/empty/error states).

### 6) i18n first

- Avoid hardcoded user-facing strings.
- When adding new keys, update both locale files:
  - `src/shared/i18n/locales/es.ts`
  - `src/shared/i18n/locales/en.ts`

### 7) Testing strategy

- Unit: domain rules, utilities, i18n, and mapping logic.
- Integration: repository behavior with real storage adapters (IndexedDB in web tests).
- Web E2E: setup -> dashboard flow and persistence after reload.
- Native E2E: iOS and Android smoke flows via Maestro.

## Directory structure

```text
src/
  data/
    database/
    repositories/
  domain/
    entities/
  features/
    dashboard/pages/
    setup/pages/
  shared/
    components/
    composables/
    i18n/
  router/
```

## Definition of Done

Before closing any significant task:

```bash
pnpm build:check
pnpm test:e2e
```

For native UX-impacting changes, also run native E2E on at least one device/emulator per platform.
