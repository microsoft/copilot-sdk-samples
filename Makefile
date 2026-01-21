.PHONY: install build test lint format typecheck dev clean docker-build docker-test docker-dev scaffold help

install:
	pnpm install

build:
	pnpm build

test:
	pnpm test

test-watch:
	pnpm test:watch

test-coverage:
	pnpm test:coverage

lint:
	pnpm lint

format:
	pnpm format

typecheck:
	pnpm typecheck

dev:
	pnpm test:watch

clean:
	rm -rf dist coverage node_modules/.cache

docker-build:
	docker compose build

docker-test:
	docker compose --profile test up --build --abort-on-container-exit

docker-dev:
	docker compose --profile dev up --build

docker-samples:
	docker compose --profile samples up --build

scaffold:
	@echo "Usage: make scaffold ID=my-sample NAME='My Sample' DESC='Description' CONNECTORS=github GHAW=true"
	@if [ -n "$(ID)" ]; then \
		pnpm scaffold $(ID) \
			$(if $(NAME),--name "$(NAME)") \
			$(if $(DESC),--description "$(DESC)") \
			$(if $(CONNECTORS),--connectors $(CONNECTORS)) \
			$(if $(GHAW),--ghaw); \
	fi

azd-init:
	azd init

azd-up:
	azd up

azd-down:
	azd down

azd-deploy:
	azd deploy

hello-world:
	pnpm hello-world

help:
	@echo "Available targets:"
	@echo ""
	@echo "  Development:"
	@echo "    install        - Install dependencies"
	@echo "    build          - Build TypeScript"
	@echo "    dev            - Run tests in watch mode"
	@echo "    clean          - Remove build artifacts"
	@echo ""
	@echo "  Testing:"
	@echo "    test           - Run tests once"
	@echo "    test-watch     - Run tests in watch mode"
	@echo "    test-coverage  - Run tests with coverage"
	@echo ""
	@echo "  Code Quality:"
	@echo "    lint           - Run ESLint"
	@echo "    format         - Format code with Prettier"
	@echo "    typecheck      - Type check with TypeScript"
	@echo ""
	@echo "  Docker:"
	@echo "    docker-build   - Build all Docker images"
	@echo "    docker-test    - Run tests in Docker"
	@echo "    docker-dev     - Start dev environment in Docker"
	@echo "    docker-samples - Run all samples in Docker"
	@echo ""
	@echo "  Samples:"
	@echo "    hello-world    - Run hello-world sample"
	@echo "    scaffold       - Scaffold a new sample"
	@echo "                     Example: make scaffold ID=my-sample NAME='My Sample'"
	@echo ""
	@echo "  Azure (azd):"
	@echo "    azd-init       - Initialize Azure Developer CLI"
	@echo "    azd-up         - Provision and deploy to Azure"
	@echo "    azd-down       - Delete Azure resources"
	@echo "    azd-deploy     - Deploy without provisioning"
