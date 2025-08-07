.PHONY: test test-watch test-db-setup test-db-down test-coverage test-db-check

test:
	npm run test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

test-db-setup:
	docker compose -f docker-compose.test.yaml up -d test-db
	sleep 5
	DATABASE_URL="postgresql://test_user:test_password@localhost:5433/grading_test_template" npx prisma db push --force-reset

test-db-check:
	DATABASE_URL="postgresql://test_user:test_password@localhost:5433/grading_test_template" npx tsx scripts/test-db-check.ts

test-db-down:
	docker compose -f docker-compose.test.yaml down -v

tdd: test-db-setup test-db-check test-watch

clean:
	npm run test:coverage --silent
	make test-db-down

# Build commands with version info
build-dev:
	@./scripts/build-local.sh dev

build-prod:
	@./scripts/build-local.sh prod

build-dev-simple:
	docker-compose -f docker-compose.dev.yaml build

build-prod-simple:
	docker-compose -f docker-compose.prod.yaml build 