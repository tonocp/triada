SHELL = /bin/bash
.DEFAULT_GOAL := help

# Node.js version requirements — .nvmrc is the single source of truth
NVMRC_FILE := .nvmrc
REQUIRED_NODE_VERSION := $(shell sed 's/^v//' $(NVMRC_FILE) 2>/dev/null)
REQUIRED_NODE_MAJOR := $(firstword $(subst ., ,$(REQUIRED_NODE_VERSION)))

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
dev: ## start app in development mode
	$(call check_node_version)
	@$(PKG_RUN) dev

build: ## build app for production
	$(call check_node_version)
	@$(PKG_RUN) build

preview: ## preview built app
	$(call check_node_version)
	@$(PKG_RUN) preview

type-check: ## check TypeScript types
	$(call check_node_version)
	@$(PKG_RUN) exec vue-tsc -p tsconfig.app.json --noEmit

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

##@ Help
.PHONY: help node-version setup-node install install-deps clean
.PHONY: run dev build preview type-check
.PHONY: lint lint-fix lint-quiet test-unit test-unit-watch test-e2e

help: ## show this help message
	@echo "Triada — Vue + Vite PWA"
	@echo ""
