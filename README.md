# Triada

Offline-first budgeting PWA built with Vue 3, TypeScript, and Vite. 50/30/20 rule, data stays on the device.

## Current stack

- Vue 3 + Vite + TypeScript
- PrimeVue 4 + PrimeIcons + Aura
- Pinia (state management)
- Vue Router (navigation)
- vue-i18n (`es` default, `en` fallback)
- Installable, offline-first PWA (`vite-plugin-pwa` / Workbox service worker + web manifest)
- Persistence: IndexedDB (via a repository facade)

## Requirements

- Node `>=24.19.0` (aligned with the Volta pin)
- pnpm `10.30.3`

## Installation

```bash
pnpm install
```

## Main commands

Development:

```bash
pnpm dev
```

Build and preview:

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

PWA + Docker verification:

- Open `http://localhost:8081` and install the app from the browser install UI.
- After the first load, reload once so the Service Worker controls the page.
- Disconnect the network and reload `/year`; the app should still render the cached shell and data.

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

E2E (Cypress):

```bash
pnpm test:e2e
pnpm test:e2e:dev
```

Cypress covers installability-related behavior and an offline-first smoke flow after Service Worker activation.

## Architecture best practices

### 1) Layering and boundaries

- `src/domain`: pure business rules, framework-agnostic.
- `src/data`: infrastructure, repositories, storage adapters.
- `src/features` and `src/shared`: UI, composables, and components.
- Do not place persistence logic directly in Vue pages/components.

### 2) Persistence access

- Use `src/data/repositories/BudgetRepository.ts` as the single facade.
- Do not import the concrete IndexedDB implementation from UI code.

### 3) Stable contracts

- Domain types are contracts (`BudgetYear`, `BudgetMonth`, `BudgetAllocation`).
- Any contract change must update the repository, tests, and consumers.

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
- Integration: repository behavior against a real IndexedDB adapter (`fake-indexeddb`).
- E2E: setup -> year/month flow and persistence after reload.

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
    settings/pages/
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
