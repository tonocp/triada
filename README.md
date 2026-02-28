# 🛠️ Mobile Template – Vue 3 + shadcn-vue + Capacitor

Modern Vue 3 template for **web and mobile apps** (via Capacitor).  
It ships with:

- Two production-ready navigation layouts: **TopNav** and **BottomNav**
- **TailwindCSS v4** (via `@tailwindcss/vite`)
- A **Makefile-first workflow** that:
    - Enforces the correct Node.js version
    - Auto-detects the package manager (**pnpm** preferred, `npm` fallback)
    - Wraps all npm scripts into consistent `make` targets
- Quality tooling: ESLint, Stylelint, Vitest, TypeScript, Commitlint, Prettier
- Optional **Docker** workflow for production builds

---

## 🚀 Tech Stack

| Area            | Tech / Version                                |
|-----------------|-----------------------------------------------|
| Core            | Vue `3.5.24` (Script Setup)                   |
| Language        | TypeScript `5.9.3`                            |
| Build Tool      | Vite `7.2.2`                                  |
| Styling         | TailwindCSS `4.1.17` + `@tailwindcss/vite`    |
| Mobile          | Capacitor `7.4.4`                             |
| State           | Pinia `3.0.4`                                 |
| Router          | Vue Router `4.6.3`                            |
| UI System       | `reka-ui` + **shadcn-vue–style** architecture |
| Icons           | `lucide-vue-next`                             |
| Utilities       | `@vueuse/core`                                |
| Tests           | Vitest `4.0.12`                               |
| Linting / Style | ESLint 9, Stylelint 16, Prettier              |

The UI layer follows a **shadcn-vue compatible architecture** (driven by `components.json` via `reka-ui`), making it
easy to scaffold and share headless, themeable components.

---

## 📦 Requirements

This project enforces a **strict Node.js toolchain** to guarantee reproducible builds.

### Runtime & Tooling

- **Node.js**: `22.21.1` (required major: `>=22`, recommended: `22.21.1`)
- **Package Manager**:
    - Preferred: **pnpm** `10.22.0`
    - Fallback: **npm**
- **Mobile Tooling**:
    - **iOS**: Xcode + CocoaPods
    - **Android**: Android Studio + Android SDK
- **Optional**:
    - Docker (for production image builds)
    - A Node version manager: `nvm`, `fnm`, `volta`, or `asdf`

> 💡 The Makefile will **auto-detect** your package manager. If `pnpm` is available, it will be used. Otherwise it falls
> back to `npm`.

---

## ⚙️ Node Version Management

The Makefile provides a **robust Node version story**:

- Reads `.nvmrc` for the required version
- Tries to resolve Node from:
    - `nvm`
    - `fnm`
    - `volta`
    - `asdf`
- Updates `PATH` so `node` commands use the correct binary
- Fails fast with friendly guidance if the version is missing or too old

### Inspect Node version

```bash
make node-version
```

Shows:

- Required & recommended Node versions
- Your current `node -v`
- The `.nvmrc` value (if present)

### Install the correct Node.js version

```bash
make setup-node
```

This target:

- Detects `nvm`, `fnm`, `volta`, or `asdf`
- Installs **Node.js 22.21.1**
- Activates it for the project
- Prints clear instructions if no version manager is installed

---

## ⚡ Quick Start – The Make Way

The recommended workflow is **Make-first**. You rarely need to call `pnpm`/`npm` directly.

### 1. Check or install Node

```bash
make node-version    # Show current & required Node versions
make setup-node      # Install & activate Node 22.21.1
```

### 2. Install dependencies

```bash
make install         # Node check + pnpm/npm install
```

If you know your Node setup is already correct and want to skip the version check:

```bash
make install-deps
```

### 3. Start web development server

```bash
make dev             # Web dev server (Vite) – defaults to port 5173
```

This maps to the underlying script:

```bash
pnpm dev             # or npm run dev
```

### 4. Mobile development with live reload

If it's your first time running the mobile app, you'll need to run the following commands:

```bash
 ## add iOS platform (requires Xcode and CocoaPods)
make cap-add-ios
 ## add Android platform (requires Android Studio and SDK)
make cap-add-android
```

Then, you can run the following commands to start the mobile app in development mode:

```bash
make build-sync    # Build web assets and sync them to native projects
```

🚨If it's your first time on Android, you should also open the project in Android Studio to install dependencies:

```bash
# Open and install the dependencies on Android (requires Android Studio and SDK)
# Gradle sync will be triggered automatically
make cap-open-android     
```

📲 To start the iOS app in development mode:

```bash
# Run on iOS simulator/device with HMR
make dev-ios         
```

📲 To start Android App in development mode:

```bash
make dev-android
```

### ⚠️ 5. Build for production

---

## 🧰 Makefile Command Reference

The Makefile is the **single source of truth** for all tasks. Below is a categorized overview.

### 🧱 Node.js Setup

| Target         | Description                           |
|----------------|---------------------------------------|
| `node-version` | Show current & required Node versions |
| `setup-node`   | Install & activate Node `22.21.1`     |

---

### 📦 Dependencies & Cleanup

| Target         | Description                                            |
|----------------|--------------------------------------------------------|
| `install`      | Node version check + install deps via pnpm/npm         |
| `install-deps` | Install deps without Node version check                |
| `clean`        | Remove `node_modules`, lockfiles & clean package cache |

`clean` will also:

- `pnpm store prune` (if using pnpm), **or**
- `npm cache clean --force` (if using npm)

---

### 💻 Development

| Target        | Description                                           |
|---------------|-------------------------------------------------------|
| `run`         | Alias for `dev`                                       |
| `dev`         | Start web app in development mode (Vite)              |
| `dev-android` | Start app on Android with live reload (Capacitor HMR) |
| `dev-ios`     | Start app on iOS with live reload (Capacitor HMR)     |

Under the hood these map to:

```bash
# package.json
"dev": "vite --host",
"dev:android": "npx cap run android -l --port 5173",
"dev:ios": "npx cap run ios -l --port 5173"
```

---

### 🏗️ Build & Preview

| Target       | Description                                         |
|--------------|-----------------------------------------------------|
| `build`      | Type-check (vue-tsc) + Vite production build        |
| `build-sync` | Build web assets and sync them to native projects   |
| `preview`    | Preview the production build locally (Vite preview) |
| `type-check` | Run TypeScript type checking via `vue-tsc`          |

Relevant scripts:

```bash
"build": "vue-tsc -p tsconfig.app.json --noEmit && vite build",
"preview": "vite preview",
"build:sync": "npm run build && npm run cap:sync"
```

> ✅ `make build-sync` is your **one-liner** to build the web app and sync it into the native shells.

---

### 📱 Mobile (Capacitor)

| Target             | Description                                       |
|--------------------|---------------------------------------------------|
| `cap-add-ios`      | Add iOS platform and run `pod install`            |
| `cap-add-android`  | Add Android platform                              |
| `cap-sync`         | Sync web assets & Capacitor config to native      |
| `cap-open-ios`     | Open iOS workspace in Xcode                       |
| `cap-open-android` | Open Android project in Android Studio            |
| `cap-copy`         | Copy only web assets to native (faster than sync) |

Backed by these scripts:

```bash
"cap:add:ios": "npx cap add ios && cd ios/App && pod install && cd -",
"cap:add:android": "npx cap add android",
"cap:sync": "npx cap sync && cd ios/App && pod install && cd -",
"cap:open:ios": "npx cap open ios",
"cap:open:android": "npx cap open android",
"cap:copy": "npx cap copy"
```

---

### 🛡️ Code Quality

| Target       | Description                                  |
|--------------|----------------------------------------------|
| `lint`       | Run ESLint + Stylelint                       |
| `lint-fix`   | Fix ESLint & Stylelint issues where possible |
| `lint-quiet` | Run ESLint in quiet mode                     |

Scripts used:

```bash
"lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts",
"lint:quiet": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --quiet",
"lint:fix": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
"stylelint": "stylelint src/**/*.{css,scss}"
```

> 🧹 Run `make lint-fix` regularly to keep your codebase clean and consistent.

---

### 🧪 Testing

| Target            | Description                         |
|-------------------|-------------------------------------|
| `test-unit`       | Run unit tests (Vitest, single run) |
| `test-unit-watch` | Run unit tests in watch mode        |
| `test-e2e`        | Run end-to-end tests (placeholder)  |

Corresponding scripts:

```bash
"test:unit": "vitest --run",
"test:unit:watch": "vitest",
"test:e2e": "echo acceptance test"
```

> 🧩 E2E tests are currently a placeholder – plug in your favourite E2E framework (Cypress, Playwright, etc.) under
`test:e2e`.

---

### 🐳 Docker & Deploy

| Target         | Description                                             |
|----------------|---------------------------------------------------------|
| `login`        | Log in to GitLab Registry                               |
| `build-docker` | Build a production Docker image (`linux/amd64`)         |
| `push-docker`  | Push Docker image to registry                           |
| `run-docker`   | Run the production container on `http://localhost:8081` |
| `stop-docker`  | Stop and remove the running container                   |

Implementation:

```bash
# Build image
make build-docker
# Run container
make run-docker
# Push to registry (after login)
make login
make push-docker
```

The image is tagged as:

```bash
template-front:latest
```

---

### 🆘 Help

To list all available Make targets with their descriptions:

```bash
make help
```

You will see a short header plus a categorized list (based on `##@` groups in the Makefile).

---

## 🧭 Project Structure

```text
├── src/
│   ├── assets/              # Global styles & static assets
│   ├── modules/             # Domain-based modules (Dashboard, Shared, etc.)
│   │   ├── shared/
│   │   │   ├── layouts/     # TopNavLayout.vue, BottomNavLayout.vue
│   ├── router/              # Vue Router configuration
│   ├── App.vue
│   └── main.ts
├── android/                 # Native Android project (Capacitor)
├── ios/                     # Native iOS project (Capacitor)
├── Makefile                 # Automation & DX entry point
├── capacitor.config.ts      # Capacitor configuration
├── vite.config.ts           # Vite configuration
├── package.json
├── tsconfig.app.json
└── .nvmrc                   # Node.js version used by the Makefile
```

---

## 📱 Mobile Setup – First Run

For a clean, end-to-end mobile setup:

```bash
make setup-node      # Ensure Node 22.21.1 is installed
make install         # Install dependencies
make build           # Type-check + Vite production build
make cap-add-ios     # Add iOS platform + pod install
make cap-add-android # Add Android platform
```

Then, for day-to-day mobile development with HMR:

```bash
make dev-ios
make dev-android
```

When you change the web app and need to refresh the native shells:

```bash
make build-sync
```

This will:

1. Build the web app
2. Run `npm run cap:sync` under the hood
3. Ensure iOS pods are refreshed (`cd ios/App && pod install && cd -`)

---

## 📖 Useful Resources

- Vue 3 – https://vuejs.org
- Vue Router – https://router.vuejs.org
- Pinia – https://pinia.vuejs.org
- Vite – https://vite.dev
- TailwindCSS v4 – https://tailwindcss.com
- Capacitor – https://capacitorjs.com
- Vitest – https://vitest.dev
- pnpm – https://pnpm.io
