# AGENTS.md - Project Guidelines

## Overview

This is a Vue 3 + PrimeVue + Capacitor hybrid mobile app boilerplate. The project uses:
- **Vue 3** with Composition API (`<script setup>`)
- **PrimeVue** UI component library (v4)
- **Pinia** for state management
- **Vue Router** for routing
- **Capacitor** for hybrid mobile (iOS/Android)
- **Vite** as build tool
- **TypeScript** with strict mode
- **Vitest** for unit testing
- **ESLint** + **Prettier** for code quality

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
- Use composables for reusable logic (put in `src/composables/`)
- Use Pinia stores for global state (put in `src/stores/`)

### Imports
- Use path alias `@/` for `src/` directory
- Order imports: Vue → Router → Pinia → PrimeVue → External → Internal

### PrimeVue Components
- Import components directly (tree-shaking is automatic in v4)
- Use built-in props (no custom wrappers unless needed)
- Follow PrimeVue naming: `Button`, `InputText`, `Card`, etc.

---

## Architecture

### Atomic Design

Structure the codebase following Atomic Design principles:

```
src/
├── atoms/          # Basic UI elements (Button, Input, Icon)
├── molecules/      # Simple combinations (SearchBar, FormField)
├── organisms/      # Complex UI sections (Header, Sidebar)
├── templates/      # Page layouts (AuthLayout, DashboardLayout)
├── pages/          # Full pages (HomePage, ProfilePage)
├── composables/    # Reusable logic (useAuth, useFetch)
├── stores/         # Pinia stores
├── services/       # External API integrations
├── types/          # TypeScript interfaces/types
└── utils/          # Helper functions
```

### Hexagonal Architecture

```
src/
├── domain/              # Business logic (core)
│   ├── entities/        # Business objects
│   ├── repositories/    # Repository interfaces
│   └── usecases/        # Business use cases
├── application/         # Application services
│   └── ports/          # Input/output ports
├── infrastructure/      # External implementations
│   ├── api/            # HTTP clients
│   ├── storage/        # Local storage
│   └── plugins/        # Framework integrations
└── presentation/       # UI layer
    ├── atoms/
    ├── molecules/
    ├── organisms/
    ├── templates/
    └── pages/
```

### Key Principles
1. **Dependency rule**: Domain layer has no external dependencies
2. **Ports & Adapters**: Define interfaces in application layer, implement in infrastructure
3. **Use cases**: encapsulate business logic in `src/domain/usecases/`
4. **Repositories**: Abstract data access behind interfaces

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
4. **Verify**: Run linter and full test suite
5. **Confirm**: Wait for user approval before continuing

### Before Each Step
- Always run `pnpm lint:fix` and `pnpm test:unit` before marking a task complete
- Never proceed to the next task without explicit user confirmation

### Commit Messages
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Keep messages short and descriptive

---

## Important Notes

- This is a **boilerplate** - extend it as needed
- Mobile-first approach for UI design
- Use PrimeVue components for consistency
- Keep business logic in domain layer, away from Vue components
- Always write tests for new features (TDD)
