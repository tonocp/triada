# AGENTS.md

## Purpose
Operational guide for coding agents working in this repository.
Follow these commands and conventions unless the user explicitly asks otherwise.

## Project Snapshot
- Vue 3 + TypeScript + Vite hybrid mobile app (Capacitor)
- PrimeVue 4 UI + PrimeIcons + Aura theme
- State: Pinia
- Router: Vue Router
- i18n: vue-i18n (`es` default, `en` fallback)
- Persistence: SQLite on native, IndexedDB on web
- Package manager: `pnpm@10.30.3`
- Node baseline: Volta pin `v22.21.1`

## Install and Setup
```bash
pnpm install
```

Android local environment:
```bash
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

## Build, Lint, and Test Commands

### Development
```bash
pnpm dev
pnpm dev:server
pnpm dev:android
pnpm dev:ios
```

### Build / Preview
```bash
pnpm build
pnpm preview
```
`pnpm build` runs `vue-tsc -p tsconfig.app.json --noEmit` then `vite build`.

### Lint
```bash
pnpm lint
pnpm lint:quiet
pnpm lint:fix
```

### Unit Tests (Vitest)
```bash
pnpm test:unit
pnpm test:unit:watch
```

Single test file:
```bash
pnpm test:unit -- run src/domain/entities/Bucket.spec.ts
```

Single test by name pattern:
```bash
pnpm test:unit -- run -t "should total 100"
```

Single file in watch mode:
```bash
pnpm vitest src/domain/entities/Bucket.spec.ts
```

### Capacitor Utilities
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

## Code Style Guidelines
Derived from `prettier.config.cjs`, `common.config.cjs`, `eslint.config.mjs`, and TS configs.

### Formatting
- Use single quotes.
- Always include arrow-function parentheses.
- Target max line length of 100 characters.
- Let Prettier + ESLint format code; avoid manual style churn.
- Imports are auto-organized via `prettier-plugin-organize-imports`.

### Imports
- Prefer `@/` alias for `src/*` imports.
- Use `import type` for type-only imports.
- Avoid fragile deep relative paths when alias imports are clearer.
- Keep imports used; unused imports fail type/lint checks.

### TypeScript
- Strict typing is required (`strict: true`).
- Avoid `any`; use concrete types or `unknown` with narrowing.
- Prefer explicit return types on exported/non-trivial functions.
- Respect `erasableSyntaxOnly` (no `enum`, no `namespace`).
- Model nullable states explicitly (`T | null`) and guard them.
- Prefer `as const` for fixed domain constants.

### Vue / Composition API
- Use `<script setup lang="ts">` for SFC logic.
- Prefer `ref`, `computed`, `watch`, `onMounted` patterns.
- Keep feature pages under `src/features/*/pages`.
- Put reusable UI in `src/shared/components`.
- Put shared composables in `src/shared/composables`.

### Naming Conventions
- Component and page filenames: PascalCase.
- Composables: `useXxx` naming.
- Variables/functions: camelCase.
- Constants: UPPER_SNAKE_CASE for static config maps.
- Types/interfaces: PascalCase.
- DTO-like creation payloads: suffix with `Input`.

### Error Handling
- Wrap async UI/data boundaries in `try/catch`.
- Log actionable context: `console.error('Failed to ...', error)`.
- Show user-facing feedback for failures (toast/dialog/message).
- Re-throw only when upstream handling is required.
- Guard early for invalid state and return fast.

### Testing
- Frameworks: Vitest + Vue Test Utils.
- Co-locate tests with source as `*.spec.ts`.
- Prefer behavior-focused assertions over implementation details.
- Use descriptive names (`should ... when ...`).
- Keep tests deterministic and side-effect-light.

## Architecture and Domain Notes
- Keep `domain` framework-agnostic.
- Use repository abstraction in `src/data/repositories`.
- Runtime storage is platform-aware (SQLite native, IndexedDB web).
- Store money as integer minor units (cents), not floats.
- Budget buckets implement 50/30/20 (`needs`, `wants`, `savings`).

## i18n Requirements
- Avoid hardcoded user-facing strings when translation keys exist.
- Update both locales when adding new keys:
  - `src/shared/i18n/locales/es.ts`
  - `src/shared/i18n/locales/en.ts`
- Preserve locale defaults (`es`) and fallback (`en`).

## Commit / PR Expectations
- Use conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
- Keep PRs focused; avoid unrelated refactors.
- Before finishing substantial work, run:
```bash
pnpm lint:fix && pnpm test:unit && pnpm build
```

## Iterative Workflow (Requested by User)
- Work in explicitly authorized steps. Complete one step at a time.
- At the end of each step, run:
```bash
pnpm build:check
```
- Do not continue to the next step until the user explicitly authorizes it.
- If tests or build fail, fix issues within the current step before considering it complete.

## Cursor and Copilot Rules
- `.cursorrules`: not found
- `.cursor/rules/`: not found
- `.github/copilot-instructions.md`: not found
- If added later, treat those files as higher-priority agent instructions.
