# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A NestJS backend (package name `fitness-backend-app`) for a gym/fitness management application. It exposes a REST API with JWT auth, TypeORM/Postgres persistence, BullMQ-backed email delivery, MinIO object storage, and audit logging. Currently only the `auth`, `users`, `audit-logs`, `mail`, and `storage` modules are implemented; enums for gyms, members, and subscriptions already exist under `src/shared/enums` in anticipation of modules that haven't been built yet.

## Commands

```bash
npm run start:dev          # run with watch mode (reads .env)
npm run start:debug        # watch mode + --inspect

npm run build               # nest build -> dist/
npm run start:prod          # node dist/main (requires build first)

npm run lint                 # eslint --fix over src/apps/libs/test
npm run format                # prettier --write over src/test

npm test                       # jest unit tests (*.spec.ts, rootDir: src)
npm run test:watch
npm run test:cov
npx jest path/to/file.spec.ts   # run a single test file
npm run test:e2e                 # jest -c test/jest-e2e.json (test/*.e2e-spec.ts)

npm run migration:generate src/database/migrations/<Name>   # diff entities vs DB, requires a running DB
npm run migration:run
npm run migration:revert
npm run migration:show
npm run seed [seedName]       # ts-node src/database/seeder.ts, dispatches to src/database/seeds
```

Migration commands and `seed` use `src/database/data-source.ts` directly (via `typeorm-ts-node-commonjs` / `ts-node`), which is separate from the `TypeOrmModule.forRootAsync` config in `src/app/app.module.ts` used at runtime. Both must stay in sync manually when entities change.

Setup from scratch: `npm install`, copy `.env.example` to `.env` and fill in DB/JWT/etc, then `npm run migration:run` and optionally `npm run seed`.

## Architecture

### Module wiring

`src/app/app.module.ts` is the composition root. It configures, in order:
- `ConfigModule` (global, reads `.env` via `dotenv`)
- `JwtModule` (global) — signs access tokens with `JWT_SECRET`/`JWT_ACCESS_TOKEN_EXPIRATION`; refresh tokens are signed separately in `AuthService` with `JWT_REFRESH_SECRET`/`JWT_REFRESH_TOKEN_EXPIRATION` (refresh is not wired through the global `JwtModule`)
- `BullModule` (Redis connection) — backs the mail queue
- `TypeOrmModule.forRootAsync` (Postgres) — entities are listed explicitly (`User`, `AuditLog`, `PasswordResetToken`); `synchronize` and `migrationsRun` are both `false`, so schema changes only ever happen through the `migration:*` scripts or the Docker entrypoint
- Feature modules: `AuditLogsModule`, `MailModule`, `UsersModule`, `AuthModule`, `StorageModule`

New entities must be added to the `entities` array in `app.module.ts` by hand — they are not auto-discovered.

### Path aliases

`tsconfig.json` defines `@shared/*` → `src/shared/*` and `@modules/*` → `src/modules/*`. Usage in the codebase is inconsistent (some files use the aliases, others use relative `../../` imports) — prefer the aliases in new code, but don't be surprised by relative imports in existing files.

### Shared base classes

- `BaseEntity` (`src/shared/entities/base.entity.ts`): UUID PK, `createdAt`/`updatedAt`/`deletedAt` (soft-delete via `@DeleteDateColumn`), plus `createdBy`/`updatedBy`/`deletedBy` audit-user columns. All entities should extend this.
- `BaseService<T>` (`src/shared/services/base.service.ts`): generic `save`/`update`/`softDelete`/`restore`/`findOne` over a TypeORM `Repository<T>`. Feature services extend this instead of reimplementing CRUD.

### Auth

- Passport JWT strategy (`src/modules/auth/strategies/jwt.strategy.ts`) backs `JwtAuthGuard`.
- Authorization is layered: `JwtAuthGuard` (authenticates) + either `AdminGuard` (checks `user.isAdmin`) or `RolesGuard` (checks `user.role` against `@Roles(...USER_ROLES)` metadata; `isAdmin` users bypass role checks entirely).
- Roles live in `USER_ROLES` (`src/shared/enums/user-roles.ts`): `super_admin`, `admin`, `staff`, `owner`, `member`, `user` (default). `AuthService.getUserRole()` maps `isAdmin: true` to `SUPER_ADMIN` regardless of the stored `role` column.
- Password reset is token-based, not link-only-in-email: a random token is hashed (SHA-256) and stored in `PasswordResetToken` with a 15-minute expiry; the plaintext token is only ever emailed. Requesting a new reset invalidates the user's previous unused tokens.

### Audit logging

`AuditLogsModule` is `@Global()` and registers `AuditInterceptor` as an `APP_INTERCEPTOR`, so it runs on every request but only acts on handlers decorated with `@Audit({ action, entity, captureBody? })` (see `src/modules/audit-logs/decorators/audit.decorator.ts`). Logging happens after the response resolves (fire-and-forget, does not block or fail the request); failures are logged for a fixed list of security-sensitive actions (`LOGIN`, `RESET_PASSWORD`, etc.) via `catchError`. Health/docs paths are excluded.

### Mail

Producer/consumer pattern over BullMQ (`src/modules/mail/`): `MailService` enqueues jobs (`sendWelcomeEmail`, `sendPasswordResetEmail`, `sendUserCreatedEmail`, or generic `enqueueMail`) and returns immediately; `MailProcessor` consumes the queue and sends via an external HTTP mail provider (Brevo) through `HttpModule`. HTML templates live in `src/modules/mail/templates/*.html` and are declared as Nest assets in `nest-cli.json` so they get copied into `dist/` on build (the `Dockerfile` also copies them explicitly for the production image).

### Storage

`StorageModule` wraps MinIO (`MinioService`) for object storage and imports `AuthModule` to guard its endpoints.

### API conventions

Controllers wrap successful payloads in `{ success: true, data }` matching `ApiResponse<T>` from `src/shared/types/api.types.ts`. Swagger is mounted at `/api` (see `DocumentBuilder` config in `src/main.ts`); add new tags there when adding modules. `GET /health` (in `AppController`) is a plain liveness check used by the Docker `HEALTHCHECK`.

### Config / env

Loaded via `dotenv` + `@nestjs/config` (`ConfigModule.forRoot({ isGlobal: true })`). See `.env.example` for the full set: `APP_PORT`, `APP_DOMAIN`, `NODE_ENV` (`dev`/`production`, gates Helmet's CSP/COEP — see `HELMET_SECURITY.md`), `CORS_ORIGINS` (comma-separated, see `CORS_SETUP.md`), `DB_*`, `JWT_*`, plus Redis (`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`, defaulted in code) and mail/storage provider credentials that aren't in `.env.example` but are read via `ConfigService` in `MailService`/`MinioService`.

### Docker

Multi-stage `Dockerfile` (build in `node:20-alpine`, then a slim production image running as a non-root `nestjs` user). `docker-entrypoint.sh` waits for Postgres (`nc -z`), runs `typeorm migration:run` against the compiled `dist/database/data-source.js`, runs `dist/database/seeder.js`, then `exec node dist/main.js` — migration/seeder failures are logged but do not stop the container from starting.

### Known rough edges

- `src/shared/enums/index.ts` only re-exports `user-roles` and `member-status.enum`; `gym-status.ts`, `member-status.ts` (an older duplicate with fewer values than `member-status.enum.ts`), and `subscription-status.enum.ts` exist but aren't exported or referenced by any entity yet.
- `src/modules/users/users.spec.ts` imports a `Users` class from `./users.entity`, but the entity exports `User` — this spec does not currently compile/pass.
