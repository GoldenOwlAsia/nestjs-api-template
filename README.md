# NestJS API Template

A NestJS starter for REST APIs. It comes with Postgres, JWT auth with rotating refresh tokens, roles, Redis-backed queues and cache, Sentry, API docs, Docker and CI.

**Stack:** NestJS 12 · TypeORM 1 · PostgreSQL 17 · Redis 8 · BullMQ 6 · Passport (local + JWT) · class-validator · Swagger + Scalar · Sentry · Jest 30 · ESLint 10 · Node 24

## Quick start

```bash
nvm use                       # Node 24.22.1+ (.nvmrc); `engines` refuses unpatched versions
cp .env.example .env
yarn install                  # also installs the husky pre-commit hook
docker compose up -d db redis # Postgres + Redis
yarn migrate:up
yarn start:dev
```

- **API:** http://localhost:3000/api/v1. All paths below are relative to `/api/v1`.
- **API docs** (non-production only): Swagger UI at http://localhost:3000/api/documentation and Scalar at http://localhost:3000/api/reference.
- **First admin:** sign-up only creates customers, so add an admin by hand. See [Users](#users).

### Everything in Docker

```bash
cp .env.example .env
docker compose up --build
```

This starts `db`, `redis` and `api`. The `api` container runs pending migrations, then starts the server, and is marked healthy once `/health` passes.

## Environment

| Variable                                                  | Required | Notes                                                                         |
| --------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `NODE_ENV`                                                |          | `development` (default), `staging`, `production`, `test`                      |
| `PORT`                                                    |          | Default `3000`                                                                |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USERNAME` `DB_PASSWORD` | ✓        | Also used by `docker compose` to create the database                          |
| `DB_LOGGING`                                              |          | `true` to log SQL                                                             |
| `REDIS_URL`                                               | ✓        | `redis://` or `rediss://` URL, used by the cache and the BullMQ queues        |
| `JWT_SECRET` `JWT_REFRESH_SECRET`                         | ✓        | Use long random values (`openssl rand -base64 48`)                            |
| `CORS_ORIGIN`                                             |          | Comma-separated allow-list; unset allows all origins                          |
| `SENTRY_DSN`                                              |          | Sentry project DSN; unset disables Sentry                                     |
| `SENTRY_TRACES_SAMPLE_RATE`                               |          | `0` (default) sends errors only; `0.1` also samples 10% of requests as traces |

Env vars are validated at boot (`src/app/app.module.ts`), so a missing required one stops the app with a clear error.

App settings such as token lifetimes and Swagger titles live in `src/config/envs/default.ts`. Per-`NODE_ENV` overrides are deep-merged from `src/config/envs/<env>.ts`.

## Scripts

| Script                                                 |                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `yarn start:dev`                                       | Watch mode                                                             |
| `yarn build` / `yarn start:prod`                       | Compile to `dist/` and run it                                          |
| `yarn typecheck`                                       | TypeScript type check (no emit)                                        |
| `yarn lint` / `yarn lint:fix`                          | ESLint + Prettier (check / fix)                                        |
| `yarn test`                                            | Unit tests (`src/**/*.spec.ts`); no database or Redis needed           |
| `yarn test:e2e`                                        | E2E tests (`test/`) against a real, migrated database and Redis        |
| `yarn migrate:generate src/database/migrations/<Name>` | Generate a migration from entity changes                               |
| `yarn migrate:create src/database/migrations/<Name>`   | Create an empty migration                                              |
| `yarn migrate:up` / `yarn migrate:down`                | Run / revert migrations (from TS sources)                              |
| `yarn migrate:prod`                                    | Run migrations from the compiled `dist/`, as the Docker container does |

**Pre-commit hook:** husky + lint-staged run ESLint and Prettier on staged files only. A lint error that can't be fixed automatically blocks the commit.

**Migrations:** `synchronize` is always off, so schema changes go through migrations. `src/database/data-source.ts` is the one DB config, shared by the app and the TypeORM CLI.

## Auth

| Endpoint         | Auth   |                                                                         |
| ---------------- | ------ | ----------------------------------------------------------------------- |
| `POST /register` | public | Creates a `CUSTOMER` and queues a welcome email                         |
| `POST /login`    | public | `{ email, password }` returns `{ accessToken, refreshToken, userInfo }` |
| `POST /refresh`  | public | `{ refreshToken }` returns a new token pair                             |
| `POST /logout`   | bearer | Revokes the current session                                             |

- **Sessions:** each login creates a session row in `tokens`. JWTs carry only its id (`sid`), and only sha256 digests of the tokens are stored.
- **Every request:** the session must exist and the bearer token must be its _current_ access token. The user and role are then loaded from the database, so logout, refresh and role changes take effect immediately.
- **Refresh:** it rotates both tokens. Presenting an already-rotated refresh token revokes the whole session (reuse detection).
- **Lifetimes:** access 15 min (1 day in development), refresh 30 days. Sessions unused for longer are purged nightly (see [Background jobs](#background-jobs-bullmq)).
- **Rate limits** (`@nestjs/throttler`): credential endpoints allow 5 req/min per IP, everything else 100 req/min, and `/health` is exempt.

## Users

There is one `users` table, and each row has a `role` of `CUSTOMER` or `ADMIN`.

| Endpoint                                                 | Who                |                                                                           |
| -------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| `GET /users/me`, `PUT /users/me`, `PUT /users/me/avatar` | any signed-in user | Own profile. Email and role can't be changed.                             |
| `GET /users`, `POST /users`                              | admin              | List users (cached, see [Cache](#cache-redis)); create a user of any role |
| `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`  | admin              | Admins can manage customers and themselves, but not other admins (403).   |

Registration always creates a `CUSTOMER`, and no endpoint can create the first admin. Either insert a row with `role = 'ADMIN'` and a bcrypt password hash, or call `UsersService.create({ ..., role: UserRole.ADMIN })` from a script.

Phone numbers are validated as Vietnamese numbers (`IsPhoneNumber('VN')` in `src/api/users/dto/user.dto.ts`). Change the region there for other markets.

## Response shape

Success: `{ "data": ..., "metadata"?: ... }`. Return `{ data, metadata }` from a handler to include metadata, for example for pagination.

Error: `{ "code": 10004, "status": 400, "message": "..." }`. Codes are in `src/utils/constants/exception.ts`. Validation errors return `422`, and outside production they also include a `detail` map of field to messages.

## Health and logs

- **Health:** `GET /health` runs `SELECT 1`. It returns `200 { "data": { "status": "ok", "db": "up" } }`, or `503` when the database is unreachable. The compose `api` service uses it as its Docker healthcheck.
- **Request ids:** every response carries an `x-request-id` header. A valid incoming one (up to 128 characters: letters, digits, `_`, `-`) is reused, for example from a proxy; anything else is replaced with a new UUID.
- **Logs:** each request is logged once its response is sent, including ones rejected by auth, the router or the rate limiter. The fields are `requestId`, `method`, `url`, `status` and `durationMs`. With `NODE_ENV=production`, logs are one JSON object per line; otherwise they're readable text.

## Background jobs (BullMQ)

Queues run on Redis. Workers run in the API process by default.

| Queue      | Job                      | When                                                                                                                                                                  |
| ---------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mail`     | `welcome`                | Queued on `POST /register` (`MailService.sendWelcome`) and processed by `MailProcessor`. It only logs today; replace the body of `process()` with your mail provider. |
| `sessions` | `purge-expired-sessions` | Daily at 03:00 UTC through a BullMQ job scheduler. It deletes sessions whose last refresh is older than the refresh-token lifetime.                                   |

- **Defaults** (`app.module.ts`): 3 attempts with exponential backoff, and the last 1,000 completed and 5,000 failed jobs are kept.
- **Failures:** a job that fails all its attempts is logged and reported to Sentry. A Redis outage does not fail sign-up; the welcome email is best-effort.
- **Adding a queue:** register it in the feature module with `BullModule.registerQueue({ name })`. Produce with `@InjectQueue(name)` and consume with a `@Processor(name)` class that extends `WorkerHost`. Use `queue.upsertJobScheduler(...)` for recurring jobs.

## Cache (Redis)

`CacheModule` is global and Redis-backed (default TTL 60 s). Inject `CACHE_MANAGER` wherever you need it.

The example is `UsersService.getAll`, behind `GET /users`. It is cache-aside: reads come from Redis for 30 s, and every user create, update or delete invalidates the cached list (`USERS_LIST_CACHE_KEY`).

## Error tracking (Sentry)

- **Setup:** `src/instrument.ts` initialises Sentry and must stay the first import in `main.ts`. Without `SENTRY_DSN` it does nothing.
- **What gets reported:** only unexpected errors (500s, not 4xx), tagged with the request id, plus BullMQ jobs that fail all their attempts.
- **Testing your DSN:** as an admin, call `GET /debug/sentry`. It always throws a test error, which should appear in Sentry.

## CI and dependencies

- **GitHub Actions** (`.github/workflows/ci.yml`): on every PR and on pushes to `main`, it runs lint, build, unit tests, migrations and e2e tests against Postgres and Redis service containers.
- **Dependabot** (`.github/dependabot.yml`): opens weekly PRs for npm packages, the Docker base image and GitHub Actions.
- **Node:** pinned to the patched 24.22.1 in `.nvmrc`, the `Dockerfile` and `engines` (October 2026 security release, CVE-2026-111497).

## Project layout

```
src/
  main.ts / instrument.ts  entry point; Sentry init (must be the first import)
  api/<module>/            feature modules: controller, service, routes, dto, entities
    auth/                  register, login, refresh, logout; JWT + local strategies, guards
    users/                 the User entity and /users endpoints
    token/                 sessions (tokens table) and the nightly purge job
  app/                     bootstrap: middleware, guards, interceptors, filters, API docs, health
  mail/                    BullMQ example: mail queue, producer and worker
  config/envs/             typed app config, per NODE_ENV
  database/                data source + migrations
  decorators/              InjectController / InjectRoute / ReqUser / validators
  filters/ exceptions/     error formatting and Sentry reporting
  interceptors/ pipes/     response wrapping, file validation
  utils/                   constants and helpers
test/                      e2e tests (API, health, queues + cache)
```

## Adding an endpoint

Routes are declared as data in `<module>.routes.ts` and applied with `@InjectRoute`. Every route requires a JWT unless it sets `jwtSecure: false`.

```ts
// users.routes.ts
getById: <IRouteParams>{
  path: '/:id',
  method: RequestMethod.GET,
  roles: [UserRole.ADMIN],               // optional role check
  extraDecorators: [],                   // any extra decorators (guards, interceptors, @Throttle)
  swaggerInfo: { responses: [{ status: HttpStatus.OK, type: UserDetailResponseDto }] },
},

// users.controller.ts
@InjectRoute(usersRoutes.getById)
getById(@Param('id', ParseUUIDPipe) id: string) { ... }
```

Use `@ReqUser()` to get the authenticated `{ sid, role, element }`. `element` is the `User` entity, and `role` is read from the database on every request.

## Adding a module

1. Create `src/api/<name>/` with `<name>.module.ts`, `.controller.ts`, `.service.ts`, `.routes.ts`, `dto/` and `entities/`, following `users/`.
2. Import the module in `src/app/app.module.ts`. Entities named `*.entity.ts` are picked up automatically.
3. Generate a migration: `yarn migrate:generate src/database/migrations/<Name>`. Review it, then run `yarn migrate:up`.
4. Add unit tests next to the service, and e2e tests in `test/`.

## License

UNLICENSED. Internal template.
