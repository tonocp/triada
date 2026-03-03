# AGENTS.md - Project Guidelines

## Overview

This is a Vue 3 + PrimeVue + Capacitor hybrid mobile app (Triada budget app). The project uses:
- **Vue 3** with Composition API (`<script setup>`)
- **PrimeVue** UI component library (v4)
- **Pinia** for state management
- **Vue Router** for routing
- **Capacitor** for hybrid mobile (iOS/Android)
- **Vite** as build tool
- **TypeScript** with strict mode
- **Vitest** for unit testing
- **ESLint** + **Prettier** for code quality
- **vue-i18n** for internationalization
- **@capacitor-community/sqlite** for local SQLite database

---

## Commands

### Development
```bash
pnpm dev              # Start Vite dev server (accessible on network)
pnpm dev:android      # Run on Android device/emulator
pnpm dev:ios          # Run on iOS simulator/device
```

### Build & Preview
```bash
pnpm build            # TypeScript check + Vite production build
pnpm preview          # Preview production build
```

### Linting
```bash
pnpm lint             # Run ESLint
pnpm lint:fix         # Run ESLint with auto-fix
pnpm lint:quiet       # Run ESLint (errors only)
```

### Testing
```bash
pnpm test:unit              # Run all unit tests (Vitest)
pnpm test:unit:watch        # Run tests in watch mode
pnpm test:unit -- run src/views/HomePage.spec.ts   # Run single test file
pnpm test:unit -- run -t "test name"              # Run tests matching pattern
```

### Capacitor
```bash
pnpm cap:add:ios       # Add iOS platform
pnpm cap:add:android   # Add Android platform
pnpm cap:sync          # Sync web assets to native
pnpm cap:open:ios     # Open Xcode
pnpm cap:open:android # Open Android Studio
```

---

## Code Style Guidelines

### General
- **Language**: English for code, comments, and commit messages
- **Quotes**: Single quotes (`'`) everywhere
- **Arrow functions**: Always use parentheses `() =>`
- **Print width**: 100 characters max
- **No comments**: Unless absolutely necessary for explaining complex logic

### TypeScript
- **Strict mode**: Enabled in `tsconfig.app.json`
- **TypeScript features**: Use `erasableSyntaxOnly` (no `enum`, no `namespace`)
- **Explicit types**: Always define return types for functions when not obvious
- **Avoid `any`**: Use `unknown` or proper types instead

### Vue 3 + Composition API
- Use `<script setup lang="ts">` syntax
- Prefer `ref()` over `reactive()` for primitives
- Use composables for reusable logic (put in `src/shared/composables/`)
- Use Pinia stores for global state (put in `src/stores/`)

### Imports
- Use path alias `@/` for `src/` directory
- Order imports: Vue → Router → Pinia → PrimeVue → i18n → External → Internal

### PrimeVue Components
- Import components directly (tree-shaking is automatic in v4)
- Use built-in props (no custom wrappers unless needed)
- Follow PrimeVue naming: `Button`, `InputText`, `Card`, etc.

---

## Architecture

### Feature-Based + Clean Architecture

```
src/
├── domain/
│   └── entities/           # BudgetYear, BudgetMonth, Bucket, Transaction
├── data/
│   ├── database/          # SQLite init, migrations
│   └── repositories/       # BudgetRepository, TransactionRepository
├── features/
│   ├── setup/
│   │   └── pages/         # SetupPage
│   └── dashboard/
│       └── pages/         # DashboardPage
├── shared/
│   ├── components/        # Atomic: Button, Input, Card, BucketDisplay
│   ├── composables/       # useCurrency, useTheme
│   ├── i18n/              # Internationalization (es, en)
│   │   └── locales/       # Translation files
│   └── router/
└── App.vue
```

### Key Principles
1. **Dependency rule**: Domain layer has no external dependencies
2. **Feature-first**: Each feature has its own folder under `features/`
3. **Shared components**: Reusable UI in `shared/components/`
4. **i18n**: All user-facing text goes through `useI18n()` from vue-i18n

---

## Internationalization (i18n)

### Structure
- Default locale: **Spanish (es)**
- Supported locales: Spanish (es), English (en)
- Translation files: `src/shared/i18n/locales/`

### Usage
```typescript
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// In template
{{ t('setup.title') }}
{{ t('dashboard.monthlyIncome') }}
```

### Changing Locale
```typescript
import { setLocale, getLocale } from '@/shared/i18n';

setLocale('en'); // Switch to English
getLocale(); // Get current locale
```

---

## Currency

### Supported Currencies
- USD ($) - US Dollar (default)
- EUR (€) - Euro

### Usage
```typescript
import { useCurrency } from '@/shared/composables/useCurrency';

const { currency, currencyInfo, formatCurrency, setCurrency } = useCurrency();

// Format amount (stored as minor units, e.g., cents)
formatCurrency(1500); // Returns "$15.00" or "€15.00"

// Set currency
setCurrency('EUR');
```

---

## TDD Workflow

### Test Structure
- Use **Vitest** with **Vue Test Utils**
- Place tests alongside source files: `HomePage.vue` → `HomePage.spec.ts`
- Use descriptive test names: `should display user name when logged in`

### Test File Example
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import HomePage from './HomePage.vue';

describe('HomePage', () => {
  let wrapper: ReturnType<typeof mount>;

  beforeEach(() => {
    wrapper = mount(HomePage);
  });

  it('should render welcome message', () => {
    expect(wrapper.text()).toContain('Welcome');
  });
});
```

### Running Tests
```bash
# Single test file
pnpm test:unit -- run src/views/HomePage.spec.ts

# Single test by name
pnpm test:unit -- run -t "should render welcome"

# Watch mode
pnpm test:unit:watch
```

---

## Development Workflow

### Iteration Process

1. **Plan**: Create a todo list with specific, actionable tasks
2. **Implement**: Write the minimum code needed
3. **Test First**: Write tests BEFORE implementation (TDD)
4. **Verify**: Run linter and full test suite (`pnpm lint:fix && pnpm build`)
5. **Confirm**: Wait for user approval before continuing

### Before Each Step
- Always run `pnpm lint:fix` and `pnpm build` before marking a task complete
- Never proceed to the next task without explicit user confirmation

### Commit Messages
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Keep messages short and descriptive

---

## Important Notes

- **Triada** is a budget app following the 50/30/20 rule
- Mobile-first approach for UI design
- Use PrimeVue components for consistency
- Keep business logic in domain layer, away from Vue components
- Always write tests for new features (TDD)
- All monetary values stored as **minor units** (cents/pennies) as integers
