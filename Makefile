# Project configuration
APP_NAME = micro-frontend-toolkit
BUILD_DIR = build
GO ?= go
SCSS_DIR = assets/scss
CSS_DIR = assets/css
TEMPL_DIR = ./templates

# Tools
TEMPL = templ
SASS = sass
GOLANGCI_LINT = golangci-lint
GOIMPORTS = goimports

.PHONY: all build run dev install install-go install-js docker-build docker-run docker-clean templ-generate scss lint format clean

all: build

# Install all dependencies
install: install-go install-js
	@echo "All dependencies installed"

# Install Go dependencies
install-go:
	@echo "Installing Go tools..."
	$(GO) install github.com/a-h/templ/cmd/templ@latest
	$(GO) install golang.org/x/tools/cmd/goimports@latest
	$(GO) install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	$(GO) get ./...
	$(GO) mod vendor
	$(GO) mod tidy
	$(GO) mod download
	@echo "Go tools installed: templ, goimports, golangci-lint"

# Install JavaScript/SCSS dependencies
install-js:
	@echo "Installing Node.js tools..."
	@which npm >/dev/null || (echo "Node.js/npm not installed. Please install Node.js first." && exit 1)
	@npm install -g sass stylelint stylelint-config-standard-scss
	@echo "Node.js tools installed: sass, stylelint"

# Main build: generate templates, compile SCSS, then build Go binary
build: templ-generate scss
	@echo "Building application..."
	$(GO) build -o $(BUILD_DIR)/$(APP_NAME) main.go

# Development mode: watch templates and styles while running
dev: templ-generate scss
	@echo "Starting development environment..."
	$(TEMPL) generate --watch &
	$(SASS) --watch $(SCSS_DIR):$(CSS_DIR) &
	$(GO) build -tags development -o $(BUILD_DIR)/$(APP_NAME) main.go
	$(BUILD_DIR)/$(APP_NAME)

# Run the application
run: build
	$(BUILD_DIR)/$(APP_NAME)

# Generate Go code from templ files
templ-generate:
	@echo "Generating templ files..."
	$(TEMPL) generate $(TEMPL_DIR)

# Compile SCSS to CSS
scss:
	@echo "Compiling SCSS..."
	$(SASS) $(SCSS_DIR):$(CSS_DIR) --style=compressed

# Lint Go and SCSS files
lint:
	@echo "Linting Go files..."
	$(GOLANGCI_LINT) run
	@echo "\nLinting SCSS files..."
	stylelint '$(SCSS_DIR)/**/*.scss'

# Format Go and SCSS files
format:
	@echo "Formatting Go files..."
	$(GOIMPORTS) -w .
	@echo "\nFormatting SCSS files..."
	stylelint --fix '$(SCSS_DIR)/**/*.scss'

# Docker build
docker-build:
	docker build -t $(APP_NAME) .

# Docker run
docker-run:
	docker run -p 8080:8080 --env-file .env $(APP_NAME)

# Clean Docker images
docker-clean:
	docker rmi $(APP_NAME)

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR)
	rm -rf $(CSS_DIR)