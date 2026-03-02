SHELL = /bin/bash
.DEFAULT_GOAL := help

# Node.js version requirements
REQUIRED_NODE_MAJOR := 22
REQUIRED_NODE_VERSION := 22.21.1
NVMRC_FILE := .nvmrc

# Auto-detect package manager (pnpm preferred, fallback to npm)
PKG_MANAGER := $(shell command -v pnpm 2> /dev/null)
ifndef PKG_MANAGER
	PKG_MANAGER := npm
	PKG_RUN := npm run
else
	PKG_MANAGER := pnpm
	PKG_RUN := pnpm
endif

# Get the correct Node.js binary path from version managers
define get_node_path
$(shell \
	if [ -f "$(NVMRC_FILE)" ]; then \
		NODE_VERSION=$$(cat $(NVMRC_FILE) | sed 's/v//'); \
		if [ -d "$$HOME/.nvm/versions/node/v$$NODE_VERSION" ]; then \
			echo "$$HOME/.nvm/versions/node/v$$NODE_VERSION/bin"; \
		elif [ -d "$$HOME/.fnm/node-versions/v$$NODE_VERSION" ]; then \
			echo "$$HOME/.fnm/node-versions/v$$NODE_VERSION/bin"; \
		elif command -v volta >/dev/null 2>&1; then \
			echo "$$(volta which node | xargs dirname)"; \
		elif command -v asdf >/dev/null 2>&1; then \
			echo "$$(asdf where nodejs $$NODE_VERSION 2>/dev/null)/bin"; \
		fi; \
	fi)
endef

# Update PATH with correct Node.js version
NODE_BIN_PATH := $(call get_node_path)
ifneq ($(NODE_BIN_PATH),)
	export PATH := $(NODE_BIN_PATH):$(PATH)
endif

# Check Node.js version (after PATH is updated)
define check_node_version
	@NODE_VERSION=$$(node -v 2>/dev/null | sed 's/v//'); \
	if [ -z "$$NODE_VERSION" ]; then \
		echo "❌ Node.js is not installed!"; \
		echo ""; \
		echo "Please install Node.js $(REQUIRED_NODE_VERSION) or higher:"; \
		echo "  • nvm:   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"; \
		echo "  • volta: curl https://get.volta.sh | bash"; \
		echo "  • fnm:   curl -fsSL https://fnm.vercel.app/install | bash"; \
		echo ""; \
		echo "After installation, run: make setup-node"; \
		exit 1; \
	fi; \
	NODE_MAJOR=$$(echo $$NODE_VERSION | cut -d. -f1); \
	if [ $$NODE_MAJOR -lt $(REQUIRED_NODE_MAJOR) ]; then \
		echo "❌ Node.js version $$NODE_VERSION is too old!"; \
		echo ""; \
		echo "Required: Node.js $(REQUIRED_NODE_MAJOR)+ (recommended: $(REQUIRED_NODE_VERSION))"; \
		echo "Current:  Node.js $$NODE_VERSION"; \
		echo ""; \
		if [ -f "$(NVMRC_FILE)" ]; then \
			echo "✨ This project requires Node.js $(REQUIRED_NODE_VERSION)"; \
			echo ""; \
			echo "Run: make setup-node"; \
		else \
			echo "Please upgrade your Node.js installation."; \
		fi; \
		exit 1; \
	fi
endef

##@ Node.js Setup
node-version: ## show current Node.js version and requirements
	@echo "Node.js Version Information:"
	@echo "  Required: >= $(REQUIRED_NODE_MAJOR).x (recommended: $(REQUIRED_NODE_VERSION))"
	@NODE_VERSION=$$(node -v 2>/dev/null || echo "not installed"); \
	echo "  Current:  $$NODE_VERSION"
	@if [ -f "$(NVMRC_FILE)" ]; then \
		echo "  .nvmrc:   $$(cat $(NVMRC_FILE))"; \
	fi

setup-node: ## setup Node.js with the correct version
	@echo "🔧 Setting up Node.js $(REQUIRED_NODE_VERSION)..."
	@if [ -s "$$HOME/.nvm/nvm.sh" ]; then \
		export NVM_DIR="$$HOME/.nvm"; \
		. "$$NVM_DIR/nvm.sh"; \
		nvm install $(REQUIRED_NODE_VERSION); \
		nvm use $(REQUIRED_NODE_VERSION); \
		echo "✅ Node.js $(REQUIRED_NODE_VERSION) installed via nvm"; \
	elif command -v fnm >/dev/null 2>&1; then \
		fnm install $(REQUIRED_NODE_VERSION); \
		fnm use $(REQUIRED_NODE_VERSION); \
		echo "✅ Node.js $(REQUIRED_NODE_VERSION) installed via fnm"; \
	elif command -v volta >/dev/null 2>&1; then \
		volta install node@$(REQUIRED_NODE_VERSION); \
		echo "✅ Node.js $(REQUIRED_NODE_VERSION) installed via volta"; \
	elif command -v asdf >/dev/null 2>&1; then \
		asdf plugin add nodejs || true; \
		asdf install nodejs $(REQUIRED_NODE_VERSION); \
		asdf local nodejs $(REQUIRED_NODE_VERSION); \
		echo "✅ Node.js $(REQUIRED_NODE_VERSION) installed via asdf"; \
	else \
		echo "❌ No Node.js version manager detected!"; \
		echo ""; \
		echo "Please install one of the following:"; \
		echo "  • nvm:   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"; \
		echo "  • volta: curl https://get.volta.sh | bash"; \
		echo "  • fnm:   curl -fsSL https://fnm.vercel.app/install | bash"; \
		echo ""; \
		echo "Then restart your terminal and run: make setup-node"; \
		exit 1; \
	fi

##@ Dependencies
install: node-version ## install and configure dependencies
	$(call check_node_version)
	@$(PKG_MANAGER) install

install-deps: ## install dependencies (without Node.js check)
	@$(PKG_MANAGER) install

clean: ## remove dependencies and cache
	@if [ "$(PKG_MANAGER)" = "pnpm" ]; then \
		pnpm store prune; \
	else \
		npm cache clean --force; \
	fi
	@rm -rf node_modules
	@rm -f pnpm-lock.yaml package-lock.json

##@ Development
run: dev ## alias to start app in development mode
dev: ## start app in development mode (web)
	$(call check_node_version)
	@$(PKG_RUN) dev

dev-android: ## start app in development mode for Android
	$(call check_node_version)
	@$(PKG_RUN) dev:android

dev-ios: ## start app in development mode for iOS
	$(call check_node_version)
	@$(PKG_RUN) dev:ios

build: ## build app for production
	$(call check_node_version)
	@$(PKG_RUN) build

build-sync: ## build app and sync with Capacitor
	$(call check_node_version)
	@$(PKG_RUN) build:sync

preview: ## preview built app
	$(call check_node_version)
	@$(PKG_RUN) preview

type-check: ## check TypeScript types
	$(call check_node_version)
	@$(PKG_RUN) exec vue-tsc -p tsconfig.app.json --noEmit

##@ Mobile (Capacitor)
cap-add-ios: ## add iOS platform (requires Xcode and CocoaPods)
	@$(PKG_RUN) cap:add:ios

cap-add-android: ## add Android platform
	@$(PKG_RUN) cap:add:android

cap-sync: ## sync web assets with native projects
	@$(PKG_RUN) cap:sync

cap-open-ios: ## open iOS project in Xcode
	@$(PKG_RUN) cap:open:ios

cap-open-android: ## open Android project in Android Studio
	@$(PKG_RUN) cap:open:android

cap-copy: ## copy web assets to native projects
	@$(PKG_RUN) cap:copy

##@ Code quality
lint: ## check code format and style
	@$(PKG_RUN) lint && $(PKG_RUN) stylelint

lint-fix: ## fix code format and style issues
	@$(PKG_RUN) lint:fix && $(PKG_RUN) stylelint --fix

lint-quiet: ## check code format (quiet mode)
	@$(PKG_RUN) lint:quiet

##@ Test
test-unit: ## run unit tests
	@$(PKG_RUN) test:unit

test-unit-watch: ## run unit tests in watch mode
	@$(PKG_RUN) test:unit:watch

test-e2e: ## run end-to-end tests
	@$(PKG_RUN) test:e2e

##@ Docker & Deploy
login: ## login to GitLab Registry
	@docker login registry.gitlab.com

build-docker: build ## build Docker image for production
	@docker build --platform linux/amd64 -t template-front:latest .

push-docker: build-docker ## push Docker image to registry
	@docker push template-front:latest

run-docker: build-docker ## run production Docker container (port 8081)
	@docker run --platform linux/amd64 --name template-front -d -p 8081:80 template-front:latest

stop-docker: ## stop and remove Docker container
	@docker stop template-front && docker rm template-front

##@ Help
.PHONY: help node-version setup-node install install-deps clean
.PHONY: run dev dev-android dev-ios build build-sync preview type-check
.PHONY: cap-add-ios cap-add-android cap-sync cap-open-ios cap-open-android cap-copy
.PHONY: lint lint-fix lint-quiet test-unit test-unit-watch test-e2e
.PHONY: login build-docker push-docker run-docker stop-docker

help: ## show this help message
	@echo "Vue + Vite + Capacitor Project"
	@echo ""
