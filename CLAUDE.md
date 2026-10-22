# CLAUDE.md

NestJS 12 + TypeORM 1 + Postgres REST API template. See README.md for setup and the API overview.

## Commands

```bash
nvm use                                # Node 24 required (@nestjs/schematics 12 rejects older)
docker compose up -d db && yarn migrate:up
yarn start:dev
yarn lint && yarn build                # lint does not --fix; use lint:fix
yarn test                              # unit tests (src/**/*.spec.ts), no DB needed
yarn test:e2e                          # needs a running, migrated DB
yarn migrate:generate src/database/migrations/<Name>
docker compose up --build              # full stack; api runs migrations on start
```

Before calling a change done, run `yarn lint`, `npx tsc --noEmit -p tsconfig.json`, `yarn build`, `yarn test` and `yarn test:e2e`.

## Conventions

- **Routes are data.** Declare each endpoint in `<module>.routes.ts` as an `IRouteParams` and apply it with `@InjectRoute(...)` in the controller. That sets the method, path, status code, Swagger docs, `roles` and `extraDecorators`. Don't stack raw `@Get`/`@ApiResponse` decorators.
- **Every route requires a JWT** unless it sets `jwtSecure: false`. `roles: [UserRole.ADMIN]` restricts it further. Controllers with `isCore: true` mount without a prefix, so auth routes live at `/api/v1/login`, `/api/v1/refresh` and so on, not under `/auth`.
- **`@ReqUser()` gives you `IJwtStrategy` (`{ sid, role, element }`), not the entity.** Use `user.element.id`. Typing it as the entity once leaked another user's data through `/me`. On the login route only, `LocalStrategy` puts the `User` itself there.
- **One `User` entity, with `role` = `CUSTOMER` | `ADMIN`** (string enums in Postgres). JWTs carry only `sid`, and `AuthService.authenticate` loads the session's user, so the role always comes from the database. Admins can't update or delete other admins (`UsersService.assertCanManage`).
- **Responses** are wrapped as `{ data }` by `ResponseInterceptor`; return `{ data, metadata }` to add metadata. Entities go out through `toResponse()`, which strips `password`.
- **Errors**: throw Nest `HttpException`s or `BaseException`. `AdvancedExceptionFilter` maps them to `{ code, status, message }`, with codes from `src/utils/constants/exception.ts`. Validation errors return **422**, and unknown body fields are rejected (`whitelist` + `forbidNonWhitelisted`).
- **Type-only imports**: `isolatedModules` and `emitDecoratorMetadata` are both on, so a type used in a decorated signature must be imported with `import type`.

## Gotchas

- **No dynamic `import()` in `src/`.** With `module: node20`, TypeScript emits it as native ESM `import()`, which fails at runtime in `dist/` because the paths have no extension. `src/config/index.ts` therefore imports every `envs/*.ts` statically. `envs/default.ts` exports a *function* so `process.env` is read after ConfigModule has loaded `.env`.
- **TypeORM 1 throws on `undefined`/`null` in `where`.** Build optional conditions conditionally (see `findOneByEmailOrPhoneNumber`) and use `IsNull()` for null checks.
- **The schema changes only through migrations** (`synchronize: false`). `src/database/data-source.ts` is the one DB config, shared by the app and the CLI. Keep it free of `@/` imports.
- **Passwords are hashed in `@BeforeInsert` only.** Update paths must hash explicitly, as `UsersService.update` does.
- **Login runs in `LocalAuthGuard`, before the ValidationPipe**, so the login body is never validated. passport-local reads only `email` and `password`.
- **Sessions**: each login creates a `tokens` row whose id is the JWT `sid` claim, and only sha256 digests of the tokens are stored. `JwtStrategy` rejects any token that isn't the session's current access token. Every signed token gets a `jwtid`, because otherwise two tokens issued in the same second would be identical and rotation would fail.
- **Request logging lives in middleware** (`requestContext` in `src/app/app.middleware.ts`, logging on `res.on('finish')`), not in an interceptor. Guards, the throttler and the router reject requests before any interceptor runs, so an interceptor would miss every 401, 403, 404 and 429. Pass structured fields as the second argument to `Logger.log`; they become their own fields in production JSON logs.
- **Unit tests** build services with `new` and in-memory fakes (see `auth.service.spec.ts`) rather than a Nest testing module. Keep them DB-free.
- **Jest needs `--experimental-vm-modules`** to load Nest 12's ESM packages. The `test*` scripts already set it.
- **Rate limiting** (`@nestjs/throttler`) is skipped when `NODE_ENV=test`. Credential routes allow 5 req/min through `extraDecorators`.
- **Migrations are frozen.** Never import app code (enums, helpers) into a migration. Write literal values, because the app code will change and the old migration must still run on a fresh database.
