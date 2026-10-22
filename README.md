# NestJS API Template

A NestJS starter for REST APIs with Postgres, JWT auth (rotating refresh tokens), role guards, Swagger and Docker.

**Stack:** NestJS 12 · TypeORM 1 · PostgreSQL 17 · Passport (local + JWT) · class-validator · Swagger · Jest 30 · ESLint 10 · Node 24

## Quick start

```bash
nvm use                 # Node 24 (see .nvmrc)
cp .env.example .env
yarn install
docker compose up -d db # Postgres only
yarn migrate:up
yarn start:dev
```

- API: http://localhost:3000/api/v1
- Swagger (non-production only): http://localhost:3000/api/documentation

### Everything in Docker

```bash
cp .env.example .env
docker compose up --build
```

The `api` container runs pending migrations, then starts the server.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | | `development` (default), `staging`, `production`, `test` |
| `PORT` | | Default `3000` |
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USERNAME` `DB_PASSWORD` | ✓ | Also used by `docker compose` to create the database |
| `DB_LOGGING` | | `true` to log SQL |
| `JWT_SECRET` `JWT_REFRESH_SECRET` | ✓ | Use long random values (`openssl rand -base64 48`) |
| `CORS_ORIGIN` | | Comma-separated allow-list; unset allows all origins |

Env vars are validated at boot (`src/app/app.module.ts`). App settings such as token lifetimes and Swagger titles live in `src/config/envs/default.ts`, with per-`NODE_ENV` overrides deep-merged from `src/config/envs/<env>.ts`.

## Scripts

| Script | |
| --- | --- |
| `yarn start:dev` | Watch mode |
| `yarn build` / `yarn start:prod` | Compile to `dist/` and run it |
| `yarn lint` / `yarn lint:fix` | ESLint + Prettier |
| `yarn test` | Unit tests (`src/**/*.spec.ts`) |
| `yarn test:e2e` | E2E tests against a real, migrated database |
| `yarn migrate:generate src/database/migrations/<Name>` | Generate a migration from entity changes |
| `yarn migrate:create src/database/migrations/<Name>` | Create an empty migration |
| `yarn migrate:up` / `yarn migrate:down` | Run / revert migrations (from TS sources) |
| `yarn migrate:prod` | Run migrations from the compiled `dist/` |

`synchronize` is always off. Schema changes go through migrations. `src/database/data-source.ts` is the one DB config, shared by the app and the TypeORM CLI.

## Auth

| Endpoint | Auth | |
| --- | --- | --- |
| `POST /register` | public | Creates a `CUSTOMER` |
| `POST /login` | public | `{ email, password }` returns `{ accessToken, refreshToken, userInfo }` |
| `POST /refresh` | public | `{ refreshToken }` returns a new token pair |
| `POST /logout` | bearer | Revokes the current session |

- Each login creates a **session** row in `tokens`, and its id is the `sid` claim in both JWTs. Only **sha256 digests** of the tokens are stored.
- Every authenticated request checks that the session exists and that the bearer token is its *current* access token. Logout and refresh therefore take effect immediately.
- Refresh **rotates** both tokens. If someone presents an already-rotated refresh token, the whole session is revoked (reuse detection).
- Default lifetimes: access 15 min (1 day in development), refresh 30 days.
- Credential endpoints are rate-limited to 5 req/min per IP, everything else to 100 req/min (`@nestjs/throttler`).

## Users

There is one `users` table, and each row has a `role` of `CUSTOMER` or `ADMIN`.

| Endpoint | Who | |
| --- | --- | --- |
| `GET /users/me`, `PUT /users/me`, `PUT /users/me/avatar` | any signed-in user | Own profile. Email and role can't be changed. |
| `GET /users`, `POST /users` | admin | List users; create a user of any role |
| `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id` | admin | Admins can manage customers and themselves, but not other admins (403). |

Registration always creates a `CUSTOMER`. There is no public way to create the first admin. Insert one into the database, or call `UsersService.create({ ..., role: UserRole.ADMIN })` from a script.

## Response shape

Success: `{ "data": ..., "metadata"?: ... }`. Return `{ data, metadata }` from a handler to include metadata, for example for pagination.

Error: `{ "code": 10004, "status": 400, "message": "..." }`. Codes are in `src/utils/constants/exception.ts`. Validation errors return `422`, and outside production they also include a `detail` map of field to messages.

## Health and logs

- `GET /api/v1/health` runs `SELECT 1`. It returns `200 { "data": { "status": "ok", "db": "up" } }`, or `503` when the database is unreachable. It is not rate-limited, and the compose `api` service uses it as its Docker healthcheck.
- Every response carries an `x-request-id` header. A valid incoming one (up to 128 characters: letters, digits, `_`, `-`) is reused, for example from a proxy; anything else is replaced with a new UUID.
- Each request is logged once its response is sent, with `requestId`, `method`, `url`, `status` and `durationMs`. When `NODE_ENV=production`, logs are one JSON object per line; otherwise they're readable text.

## Project layout

```
src/
  api/<module>/          feature modules: controller, service, routes, dto, entities
  app/                   bootstrap: middleware, guards, interceptors, filters, swagger
  config/envs/           typed app config, per NODE_ENV
  database/              data source + migrations
  decorators/            InjectController / InjectRoute / ReqUser / validators
  filters/ exceptions/   error formatting
  interceptors/ pipes/   response wrapping, file validation
  utils/                 constants and helpers
test/                    e2e tests
```

## Adding an endpoint

Routes are declared as data in `<module>.routes.ts` and applied with `@InjectRoute`. Every route requires a JWT unless it sets `jwtSecure: false`.

```ts
// users.routes.ts
getById: <IRouteParams>{
  path: '/:id',
  method: RequestMethod.GET,
  roles: [UserRole.ADMIN],               // optional role check
  extraDecorators: [],                   // any extra decorators (guards, interceptors)
  swaggerInfo: { responses: [{ status: HttpStatus.OK, type: UserDetailResponseDto }] },
},

// users.controller.ts
@InjectRoute(usersRoutes.getById)
getById(@Param('id', ParseUUIDPipe) id: string) { ... }
```

Use `@ReqUser()` to get the authenticated `{ sid, role, element }`, where `element` is the `User` entity and `role` is read from the database on every request.

## License

UNLICENSED. Internal template.
