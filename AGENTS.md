# AGENTS.md

Operational guide for coding agents working in this repository.

## 1) Project context

- Installable offline-first PWA (`vite-plugin-pwa` manifest + Service Worker)
- Vue 3 + TypeScript + Vite
- PrimeVue 4 + PrimeIcons
- Pinia for state
- i18n with `es` default and `en` fallback
- Persistence: IndexedDB, behind a repository facade

## 2) Architecture principles (mandatory)

1. **Layer separation**
   - `domain`: pure business rules.
   - `data`: infrastructure, repositories, adapters.
   - `features/shared`: presentation and UI composables.
   - Do not mix infrastructure concerns into `domain`.

2. **Single repository facade**
   - Consume persistence through `src/data/repositories/BudgetRepository.ts`.
   - Do not import the concrete IndexedDB implementation from UI.

3. **Money safety model**
   - Keep money values in minor units (integer cents).
   - Do not use floats as persisted financial source of truth.

4. **Errors and recovery**
   - Handle async boundaries with `try/catch`.
   - Include actionable context in logs.
   - Provide consistent user feedback (toast / empty state / error state).

5. **i18n first**
   - Avoid hardcoded user-facing strings when translation keys exist.
   - When adding keys, update both `es.ts` and `en.ts`.

## 3) Code standards

- Use strict TypeScript and avoid `any` unless strongly justified.
- Prefer `import type` for type-only imports.
- Keep naming semantic and consistent.
- Add comments only for non-obvious decisions.
- Respect repository lint/format standards and avoid unnecessary style churn.

## 4) Testing strategy (mandatory)

### 4.0 TDD methodology (mandatory)

- Follow TDD in every change: **Red -> Green -> Refactor**.
- Start by adding or updating a failing test that captures the requested behavior.
- Implement the minimal production change required to make the test pass.
- Refactor only after tests are green, keeping behavior unchanged.
- Do not ship behavior changes without accompanying tests (unit/integration/E2E depending on scope).

### 4.1 Unit tests

- Framework: Vitest.
- Cover pure logic, i18n behavior, simple composables, and facade contracts.
- File naming: `*.spec.ts`.
- Include edge cases, error paths, and fallback behavior (not only happy paths).

### 4.2 Integration tests

- Cover real repository/infrastructure behavior.
- Use `fake-indexeddb` for web persistence integration tests.
- Validate business invariants (for example 50/30/20 allocation and bucket order).
- Validate null/empty states, partial/corrupted data recovery paths, and sorting consistency.

### 4.3 E2E

- Framework: Cypress.
- Minimum required flows:
  - initial setup,
  - setup -> year redirect when a budget exists,
  - persistence after reload,
  - offline render after Service Worker activation.
- Also cover critical UX edge cases when relevant (invalid income, locale/currency persistence, rounding display behavior).

### 4.4 Coverage policy

- Runtime logic should keep line coverage at 100%.
- Coverage execution is scoped to `src/` (`vitest run src --coverage`).
- Files that only declare static types/contracts or static locale dictionaries may be excluded from coverage thresholds when they do not represent executable runtime logic.
- Any exclusion must be explicit and justified in `vitest.config.ts`.

## 5) Official commands

Install:

```bash
pnpm install
```

Development:

```bash
pnpm dev
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

`pnpm build:check` is scoped to `src/` quality gates (format + Vitest coverage + type-check + lint) and does not run the production bundle build.

Current script pipeline:

```bash
pnpm format && pnpm test:unit:coverage && pnpm type-check && pnpm lint:check
```

Tests:

```bash
pnpm test:unit
pnpm test:unit:coverage
pnpm test:e2e
pnpm test:e2e:dev
```

Deploy/runtime checks:

```bash
docker compose up --build -d
docker compose down
```

## 6) Step completion rule

At the end of each user-authorized step, run:

```bash
pnpm build:check
```

Scope reminder: this command validates only `src/` quality gates.

If user flow screens are changed (setup/dashboard/navigation), also run:

```bash
pnpm test:e2e
```

## 7) Git hooks and local quality gates

- Husky is enabled in this repository (`prepare` script in `package.json`).
- `pre-commit` runs:

```bash
pnpm build:check
```

- Do not bypass hooks unless explicitly requested by the user.
- If hooks fail, fix the root cause before committing.

## 8) Commit and PR expectations

- Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- Keep PRs focused and avoid unrelated refactors.
- Include in PR description:
  - functional changes,
  - evidence of executed tests.

## 9) Agent restrictions

- Do not revert user changes unless explicitly requested.
- Do not use destructive git commands.
- Do not add dependencies without clear technical justification.
- Any domain contract change requires corresponding test updates.
- Do not disable or weaken existing test/coverage/hook guardrails without explicit user approval.
