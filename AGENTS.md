# AGENTS.md

Operational guide for coding agents working in this repository.

## 1) Project context

- Hybrid mobile app with Capacitor (web + iOS + Android)
- Vue 3 + TypeScript + Vite
- PrimeVue 4 + PrimeIcons
- Pinia for state
- i18n with `es` default and `en` fallback
- Platform-aware persistence:
  - native: SQLite
  - web: IndexedDB

## 2) Architecture principles (mandatory)

1. **Layer separation**
   - `domain`: pure business rules.
   - `data`: infrastructure, repositories, adapters.
   - `features/shared`: presentation and UI composables.
   - Do not mix infrastructure concerns into `domain`.

2. **Single repository facade**
   - Consume persistence through `src/data/repositories/BudgetRepository.ts`.
   - Do not import concrete implementations (`sqlite` / `indexeddb`) from UI.

3. **Web/native parity**
   - Any repository contract change must be mirrored in both implementations.
   - Do not accept platform divergence unless explicitly documented and approved.

4. **Money safety model**
   - Keep money values in minor units (integer cents).
   - Do not use floats as persisted financial source of truth.

5. **Errors and recovery**
   - Handle async boundaries with `try/catch`.
   - Include actionable context in logs.
   - Provide consistent user feedback (toast / empty state / error state).

6. **i18n first**
   - Avoid hardcoded user-facing strings when translation keys exist.
   - When adding keys, update both `es.ts` and `en.ts`.

## 3) Code standards

- Use strict TypeScript and avoid `any` unless strongly justified.
- Prefer `import type` for type-only imports.
- Keep naming semantic and consistent.
- Add comments only for non-obvious decisions.
- Respect repository lint/format standards and avoid unnecessary style churn.

## 4) Testing strategy (mandatory)

### 4.1 Unit tests

- Framework: Vitest.
- Cover pure logic, i18n behavior, simple composables, and facade contracts.
- File naming: `*.spec.ts`.

### 4.2 Integration tests

- Cover real repository/infrastructure behavior.
- Use `fake-indexeddb` for web persistence integration tests.
- Validate business invariants (for example 50/30/20 allocation and bucket order).

### 4.3 Web E2E

- Framework: Cypress.
- Minimum required flows:
  - initial setup,
  - setup -> dashboard redirect when budget exists,
  - persistence after reload.

### 4.4 Native E2E

- Framework: Maestro.
- Required smoke flows for iOS and Android when critical UX changes:
  - app launch,
  - setup completion,
  - dashboard visible with expected budget output.

## 5) Official commands

Install:

```bash
pnpm install
```

Development:

```bash
pnpm dev
pnpm dev:server
pnpm dev:android
pnpm dev:ios
```

Quality:

```bash
pnpm format
pnpm lint
pnpm lint:check
pnpm type-check
pnpm build
pnpm build:check
```

Tests:

```bash
pnpm test:unit
pnpm test:unit:coverage
pnpm test:e2e
pnpm test:e2e:dev
pnpm test:e2e:native:android
pnpm test:e2e:native:ios
pnpm test:e2e:native
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

## 6) Step completion rule

At the end of each user-authorized step, run:

```bash
pnpm build:check
```

If user flow screens are changed (setup/dashboard/navigation), also run:

```bash
pnpm test:e2e
```

If native UX is affected, also run Maestro tests on iOS and Android when environment is available.

## 7) Commit and PR expectations

- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- Keep PRs focused and avoid unrelated refactors.
- Include in PR description:
  - functional changes,
  - platform impact,
  - evidence of executed tests.

## 8) Agent restrictions

- Do not revert user changes unless explicitly requested.
- Do not use destructive git commands.
- Do not add dependencies without clear technical justification.
- Any domain contract change requires corresponding test updates.
