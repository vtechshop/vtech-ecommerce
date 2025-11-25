# FILE: Makefile
.PHONY: help install dev build test clean deploy

help:
	@echo "Available commands:"
	@echo "  make install  - Install all dependencies"
	@echo "  make dev      - Start development servers"
	@echo "  make build    - Build production assets"
	@echo "  make test     - Run tests"
	@echo "  make seed     - Seed database"
	@echo "  make clean    - Clean build artifacts"
	@echo "  make deploy   - Deploy to production"

install:
	@echo "Installing API dependencies..."
	cd apps/api && npm install
	@echo "Installing Web dependencies..."
	cd apps/web && npm install

dev:
	@echo "Starting development servers..."
	docker-compose up

build:
	@echo "Building production assets..."
	cd apps/web && npm run build

test:
	@echo "Running tests..."
	cd apps/api && npm test

seed:
	@echo "Seeding database..."
	cd apps/api && npm run seed

clean:
	@echo "Cleaning build artifacts..."
	rm -rf apps/web/dist
	rm -rf apps/api/uploads
	rm -rf node_modules
	rm -rf apps/*/node_modules

deploy:
	@echo "Deploying to production..."
	docker-compose -f docker-compose.prod.yml up -d --build