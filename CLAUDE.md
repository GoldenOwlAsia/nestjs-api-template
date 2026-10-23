# CLAUDE.md

NestJS 12 + TypeORM 1 + Postgres + Redis (BullMQ 6, cache) REST API template, with Sentry. See README.md for setup and the API overview.

## Commands

```bash
nvm use                                # Node 24.22.1+ required (engines + @nestjs/schematics 12)
corepack enable                        # pnpm, pinned via package.json#packageManager
docker compose up -d db redis && pnpm migrate:up
pnpm start:dev
pnpm lint && pnpm typecheck && pnpm build  # lint does not --fix; use lint:fix
pnpm test                              # unit tests (src/**/*.spec.ts), no DB or Redis needed
pnpm test:e2e                          # needs a running, migrated DB and Redis
pnpm migrate:generate src/database/migrations/<Name>
docker compose up --build              # full stack; api runs migrations on start
```

Before calling a change done, run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` and `pnpm test:e2e`.

A husky pre-commit hook runs lint-staged (ESLint and Prettier on staged files). Never bypass it with `--no-verify`.

## Conventions

- **Routes are data.** Declare each endpoint in `<module>.routes.ts` as an `IRouteParams` and apply it with `@InjectRoute(...)` in the controller. That sets the method, path, status code, Swagger docs, `roles` and `extraDecorators`. Don't stack raw `@Get`/`@ApiResponse` decorators.
- **Every route requires a JWT** unless it sets `jwtSecure: false`. `roles: [UserRole.ADMIN]` restricts it further. Controllers with `isCore: true` mount without a prefix, so auth routes live at `/api/v1/login`, `/api/v1/refresh` and so on, not under `/auth`.
- **`@ReqUser()` gives you `IJwtStrategy` (`{ sid, role, element }`), not the entity.** Use `user.element.id`. Typing it as the entity once leaked another user's data through `/me`. On the login route only, `LocalStrategy` puts the `User` itself there.
- **One `User` entity, with `role` = `CUSTOMER` | `ADMIN`** (string enums in Postgres). Admins can't update or delete other admins (`UsersService.assertCanManage`).
- **Responses** are wrapped as `{ data }` by `ResponseInterceptor`; return `{ data, metadata }` to add metadata. Entities go out through `toResponse()`, which strips `password`.
- **Errors**: throw Nest `HttpException`s or `BaseException`. `AdvancedExceptionFilter` maps them to `{ code, status, message }`, with codes from `src/utils/constants/exception.ts`. Validation errors return **422**, and unknown body fields are rejected (`whitelist` + `forbidNonWhitelisted`).
- **Logging**: use Nest `Logger` and pass structured fields as the second argument (`logger.log('msg', { requestId })`). They become their own fields in production JSON logs. No `console.log`.
- **Type-only imports**: `isolatedModules` and `emitDecoratorMetadata` are both on, so a type used in a decorated signature must be imported with `import type`.

## Gotchas

### Build and runtime

- **No dynamic `import()` in `src/`.** With `module: node20`, TypeScript emits it as native ESM `import()`, which fails at runtime in `dist/` because the paths have no extension. `src/config/index.ts` therefore imports every `envs/*.ts` statically. `envs/default.ts` exports a _function_ so `process.env` is read after ConfigModule has loaded `.env`.
- **`src/instrument.ts` must stay the first import in `main.ts`.** Sentry can only instrument modules loaded after it.
- **Node is pinned to the patched 24.22.1** in `.nvmrc`, the `Dockerfile` and `engines` (CVE-2026-111497, a Brotli RCE that `body-parser` exposes). Don't loosen these pins.

### Package manager (pnpm)

- **pnpm only** (`pnpm-lock.yaml`); never add a `yarn.lock` or `package-lock.json`. pnpm's `node_modules` is strict, so every package imported at runtime must be listed in `dependencies`. A package that only arrives through another one fails in production, where dev dependencies are pruned.
- **New dependency with an install script?** `pnpm install` fails until you add it to `allowBuilds` in `pnpm-workspace.yaml` (`true` only if it needs to build).
- **Packages published less than 24 hours ago are rejected** (pnpm's `minimumReleaseAge`). Don't disable the check; pin the previous release and let Dependabot bump it later.

### Data

- **TypeORM 1 throws on `undefined`/`null` in `where`.** Build optional conditions conditionally (see `findOneByEmailOrPhoneNumber`) and use `IsNull()` for null checks.
- **The schema changes only through migrations** (`synchronize: false`). `src/database/data-source.ts` is the one DB config, shared by the app and the CLI. Keep it free of `@/` imports.
- **Migrations are frozen.** Never import app code (enums, helpers) into a migration. Write literal values, because the app code will change and the old migration must still run on a fresh database. After writing one, `pnpm typeorm migration:generate <path> --dr` should report no changes.
- **Passwords are hashed in `@BeforeInsert` only.** Update paths must hash explicitly, as `UsersService.update` does.
- **Cache invalidation**: a cached read must be invalidated on every write path, as with `USERS_LIST_CACHE_KEY` in `UsersService`.

### Auth

- **Login runs in `LocalAuthGuard`, before the ValidationPipe**, so the login body is never validated. passport-local reads only `email` and `password`.
- **Sessions**: each login creates a `tokens` row whose id is the JWT `sid` claim, and only sha256 digests of the tokens are stored. JWTs carry no user data: just `sid` plus the standard `iat`, `exp` and `jti`. `AuthService.authenticate` checks the bearer token is the session's _current_ access token, then loads the user, so the role always comes from the database. Every signed token gets a `jwtid`, because otherwise two tokens issued in the same second would be identical and rotation would fail.
- **The session purge measures expiry from `tokens.updated_at`**, which moves on every refresh. Don't write to `tokens` rows for any other reason.

### Infrastructure

- **Redis is required** (`REDIS_URL`): BullMQ and the cache both use it.
- **BullMQ 6** has no `repeat` option; use `queue.upsertJobScheduler` (see `SessionCleanupProcessor`). Processors extend `WorkerHost` and must throw on unknown job names.
- **Request logging lives in middleware** (`requestContext` in `src/app/app.middleware.ts`, logging on `res.on('finish')`), not in an interceptor. Guards, the throttler and the router reject requests before any interceptor runs, so an interceptor would miss every 401, 403, 404 and 429.
- **Sentry**: report unexpected errors with `Sentry.captureException`. HTTP exceptions are expected and must not be reported. Without `SENTRY_DSN` every call is a no-op.
- **Rate limiting** (`@nestjs/throttler`) is skipped when `NODE_ENV=test`. Credential routes allow 5 req/min through `extraDecorators`, and `/health` uses `SkipThrottle`.

### Testing

- **Unit tests** build services with `new` and in-memory fakes (see `auth.service.spec.ts`) rather than a Nest testing module. Keep them free of database and Redis.
- **Mock `@sentry/nestjs` with `jest.mock`**: its exports can't be spied on.
- **Jest needs `--experimental-vm-modules`** to load Nest 12's ESM packages. The `test*` scripts already set it.
- **Test phone numbers must be valid Vietnamese numbers** (`IsPhoneNumber('VN')`). Use the `090` prefix plus 7 digits; random `09x` numbers fail about 1% of the time (for example `095`).
- **e2e tests boot the whole app**, including BullMQ workers, and must `app.close()` in `afterAll` so the Redis connections are released.
