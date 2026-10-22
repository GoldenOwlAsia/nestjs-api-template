import { hashSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

import type { ConfigService } from '@nestjs/config';

import { hash } from '@/utils/helpers';
import { UserRole } from '@/common/enums';
import { Customer } from '@/api/customer/entities';
import { TokenService } from '@/api/token/token.service';

import { AuthService } from './auth.service';
import { WrongCredentialsException } from './auth.exceptions';

import type { ITokenPayload } from './auth.interface';

/** In-memory stand-in for the `tokens` table, so the real TokenService logic runs. */
function fakeTokenRepository() {
  const rows = new Map<string, Record<string, unknown>>();

  return {
    rows,
    create: (data: Record<string, unknown>) => ({ ...data }),
    save: async (row: Record<string, unknown>) =>
      rows.set(row.id as string, row),
    findOneBy: async ({ id }: { id: string }) => rows.get(id) ?? null,
    update: async ({ id }: { id: string }, data: object) => {
      Object.assign(rows.get(id), data);
    },
    delete: async ({ id }: { id: string }) => rows.delete(id),
  };
}

describe('AuthService', () => {
  const PASSWORD = 'P@ssw0rd';
  const config: Record<string, unknown> = {
    'jwt.refreshSecret': 'refresh-secret',
    'token.refresh.lifetime': 60_000,
  };

  let user: Customer;
  let tokens: ReturnType<typeof fakeTokenRepository>;
  let jwtService: JwtService;
  let customerService: { findOneByEmail: jest.Mock; create: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    user = Object.assign(new Customer(), {
      id: 'c0ffee00-0000-4000-8000-000000000001',
      email: 'alice@example.com',
      password: hashSync(PASSWORD, 4),
      firstName: 'Alice',
      lastName: 'Nguyen',
    });

    tokens = fakeTokenRepository();
    jwtService = new JwtService({
      secret: 'access-secret',
      signOptions: { expiresIn: 60 },
    });
    customerService = {
      findOneByEmail: jest.fn(async (email: string) =>
        email === user.email ? user : null,
      ),
      create: jest.fn(),
    };

    service = new AuthService(
      jwtService,
      { findOneByEmail: jest.fn(async () => null) } as any,
      new TokenService(tokens as any),
      { get: (key: string) => config[key] } as unknown as ConfigService,
      customerService as any,
    );
  });

  const login = () =>
    service.login({ element: user, role: 'CUSTOMER' as unknown as UserRole });

  describe('validateUser', () => {
    it('returns the user for the right password', async () => {
      await expect(
        service.validateUser({
          email: user.email,
          password: PASSWORD,
          role: 'CUSTOMER' as any,
        }),
      ).resolves.toBe(user);
    });

    it('rejects a wrong password or unknown email', async () => {
      for (const [email, password] of [
        [user.email, 'wrong-password'],
        ['nobody@example.com', PASSWORD],
      ]) {
        await expect(
          service.validateUser({ email, password, role: 'CUSTOMER' as any }),
        ).rejects.toBeInstanceOf(WrongCredentialsException);
      }
    });

    it('rejects an unknown role without querying any service', async () => {
      for (const role of ['customer', 'ROOT', undefined]) {
        await expect(
          service.validateUser({
            email: user.email,
            password: PASSWORD,
            role: role as any,
          }),
        ).rejects.toBeInstanceOf(WrongCredentialsException);
      }

      expect(customerService.findOneByEmail).not.toHaveBeenCalled();
    });
  });

  it('validateJwtUser rejects a user that no longer exists with 401', async () => {
    await expect(
      service.validateJwtUser({
        email: 'gone@example.com',
        role: 'CUSTOMER' as any,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('login', () => {
    it('creates a session keyed by the sid claim and stores only digests', async () => {
      const { accessToken, refreshToken, userInfo } = await login();

      const { sid } = jwtService.decode<ITokenPayload>(accessToken);
      const row = tokens.rows.get(sid);

      expect(row).toMatchObject({
        userId: user.id,
        accessToken: hash.sha256(accessToken),
        refreshToken: hash.sha256(refreshToken),
      });
      expect(JSON.stringify(row)).not.toContain(accessToken);
      expect(userInfo).not.toHaveProperty('password');
    });

    it('signs the refresh token with the refresh secret only', async () => {
      const { refreshToken } = await login();

      expect(() => jwtService.verify(refreshToken)).toThrow();
      expect(() =>
        jwtService.verify(refreshToken, { secret: 'refresh-secret' }),
      ).not.toThrow();
    });
  });

  describe('validateSession', () => {
    it('accepts the current access token of an existing session', async () => {
      const { accessToken } = await login();
      const { sid } = jwtService.decode<ITokenPayload>(accessToken);

      await expect(
        service.validateSession(sid, accessToken),
      ).resolves.toBeUndefined();
    });

    it('rejects a missing sid, an unknown session or a foreign token', async () => {
      const { accessToken } = await login();
      const { sid } = jwtService.decode<ITokenPayload>(accessToken);
      const other = await login();

      for (const [s, token] of [
        [undefined, accessToken],
        ['00000000-0000-4000-8000-000000000000', accessToken],
        [sid, other.accessToken],
      ]) {
        await expect(service.validateSession(s, token)).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      }
    });
  });

  describe('refresh', () => {
    it('rotates both tokens and invalidates the previous access token', async () => {
      const first = await login();
      const { sid } = jwtService.decode<ITokenPayload>(first.accessToken);

      const next = await service.refresh(first.refreshToken);

      expect(next.accessToken).not.toBe(first.accessToken);
      expect(next.refreshToken).not.toBe(first.refreshToken);
      expect(jwtService.decode<ITokenPayload>(next.accessToken).sid).toBe(sid);
      await expect(
        service.validateSession(sid, next.accessToken),
      ).resolves.toBeUndefined();
      await expect(
        service.validateSession(sid, first.accessToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('revokes the whole session when a rotated refresh token is reused', async () => {
      const first = await login();
      const { sid } = jwtService.decode<ITokenPayload>(first.accessToken);
      const next = await service.refresh(first.refreshToken);

      await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(tokens.rows.has(sid)).toBe(false);
      await expect(service.refresh(next.refreshToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects garbage, access tokens and tokens of a deleted session', async () => {
      const { accessToken, refreshToken } = await login();
      const { sid } = jwtService.decode<ITokenPayload>(accessToken);

      await expect(service.refresh('not-a-jwt')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(accessToken)).rejects.toThrow(
        UnauthorizedException,
      );

      tokens.rows.delete(sid);
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  it('logout deletes the session so its access token stops working', async () => {
    const { accessToken } = await login();
    const { sid } = jwtService.decode<ITokenPayload>(accessToken);

    await service.logout({ sid, element: user, role: UserRole.CUSTOMER });

    expect(tokens.rows.has(sid)).toBe(false);
    await expect(service.validateSession(sid, accessToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
