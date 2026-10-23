import { hashSync } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';

import type { ConfigService } from '@nestjs/config';

import { hash } from '@/utils/helpers';
import { UserRole } from '@/common/enums';
import { User } from '@/api/users/entities';
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

  let user: User;
  let tokens: ReturnType<typeof fakeTokenRepository>;
  let jwtService: JwtService;
  let usersService: {
    findOneByEmail: jest.Mock;
    findOneById: jest.Mock;
    create: jest.Mock;
  };
  let mailService: { sendWelcome: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    user = Object.assign(new User(), {
      id: 'c0ffee00-0000-4000-8000-000000000001',
      email: 'alice@example.com',
      password: hashSync(PASSWORD, 4),
      firstName: 'Alice',
      lastName: 'Nguyen',
      role: UserRole.CUSTOMER,
    });

    tokens = fakeTokenRepository();
    jwtService = new JwtService({
      secret: 'access-secret',
      signOptions: { expiresIn: 60 },
    });
    usersService = {
      findOneByEmail: jest.fn(async (email: string) =>
        email === user.email ? user : null,
      ),
      findOneById: jest.fn(async (id: string) =>
        id === user.id ? user : null,
      ),
      create: jest.fn(async (data) => data),
    };

    mailService = { sendWelcome: jest.fn(async () => undefined) };

    service = new AuthService(
      jwtService,
      usersService as any,
      new TokenService(tokens as any),
      { get: (key: string) => config[key] } as unknown as ConfigService,
      mailService as any,
    );
  });

  const sidOf = (token: string) => jwtService.decode<ITokenPayload>(token).sid;

  it('register always creates a CUSTOMER', async () => {
    await service.register({
      email: 'bob@example.com',
      password: PASSWORD,
      firstName: 'Bob',
      lastName: 'Le',
      phoneNumber: '0911111111',
      // A smuggled role must not survive (the DTO also strips it).
      ...({ role: UserRole.ADMIN } as object),
    });

    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: UserRole.CUSTOMER }),
    );
  });

  it('register queues a welcome email for the new user', async () => {
    await service.register({
      email: 'bob@example.com',
      password: PASSWORD,
      firstName: 'Bob',
      lastName: 'Le',
      phoneNumber: '0911111111',
    });

    expect(mailService.sendWelcome).toHaveBeenCalledWith({
      email: 'bob@example.com',
      firstName: 'Bob',
    });
  });

  describe('validateUser', () => {
    it('returns the user for the right password', async () => {
      await expect(service.validateUser(user.email, PASSWORD)).resolves.toBe(
        user,
      );
    });

    it('rejects a wrong password or unknown email', async () => {
      for (const [email, password] of [
        [user.email, 'wrong-password'],
        ['nobody@example.com', PASSWORD],
      ]) {
        await expect(
          service.validateUser(email, password),
        ).rejects.toBeInstanceOf(WrongCredentialsException);
      }
    });
  });

  describe('login', () => {
    it('creates a session keyed by the sid claim and stores only digests', async () => {
      const { accessToken, refreshToken, userInfo } = await service.login(user);

      const row = tokens.rows.get(sidOf(accessToken));

      expect(row).toMatchObject({
        userId: user.id,
        accessToken: hash.sha256(accessToken),
        refreshToken: hash.sha256(refreshToken),
      });
      expect(JSON.stringify(row)).not.toContain(accessToken);
      expect(userInfo).not.toHaveProperty('password');
    });

    it('puts only the session id in the token, not the email or role', async () => {
      const { accessToken } = await service.login(user);
      const payload = jwtService.decode<Record<string, unknown>>(accessToken);

      expect(payload).toHaveProperty('sid');
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('role');
    });

    it('signs the refresh token with the refresh secret only', async () => {
      const { refreshToken } = await service.login(user);

      expect(() => jwtService.verify(refreshToken)).toThrow();
      expect(() =>
        jwtService.verify(refreshToken, { secret: 'refresh-secret' }),
      ).not.toThrow();
    });
  });

  describe('authenticate', () => {
    it('resolves the current access token to its session and user', async () => {
      const { accessToken } = await service.login(user);
      const sid = sidOf(accessToken);

      await expect(service.authenticate(sid, accessToken)).resolves.toEqual({
        sid,
        role: UserRole.CUSTOMER,
        element: user,
      });
    });

    it('takes the role from the user row, so a role change applies at once', async () => {
      const { accessToken } = await service.login(user);
      user.role = UserRole.ADMIN;

      const { role } = await service.authenticate(
        sidOf(accessToken),
        accessToken,
      );

      expect(role).toBe(UserRole.ADMIN);
    });

    it('rejects a missing sid, an unknown session or a foreign token', async () => {
      const { accessToken } = await service.login(user);
      const other = await service.login(user);

      for (const [sid, token] of [
        [undefined, accessToken],
        ['00000000-0000-4000-8000-000000000000', accessToken],
        [sidOf(accessToken), other.accessToken],
      ]) {
        await expect(service.authenticate(sid, token)).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      }
    });

    it('rejects a session whose user no longer exists', async () => {
      const { accessToken } = await service.login(user);
      usersService.findOneById.mockResolvedValueOnce(null);

      await expect(
        service.authenticate(sidOf(accessToken), accessToken),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates both tokens and invalidates the previous access token', async () => {
      const first = await service.login(user);
      const sid = sidOf(first.accessToken);

      const next = await service.refresh(first.refreshToken);

      expect(next.accessToken).not.toBe(first.accessToken);
      expect(next.refreshToken).not.toBe(first.refreshToken);
      expect(sidOf(next.accessToken)).toBe(sid);
      await expect(
        service.authenticate(sid, next.accessToken),
      ).resolves.toBeDefined();
      await expect(
        service.authenticate(sid, first.accessToken),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('revokes the whole session when a rotated refresh token is reused', async () => {
      const first = await service.login(user);
      const sid = sidOf(first.accessToken);
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
      const { accessToken, refreshToken } = await service.login(user);

      await expect(service.refresh('not-a-jwt')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refresh(accessToken)).rejects.toThrow(
        UnauthorizedException,
      );

      tokens.rows.delete(sidOf(accessToken));
      await expect(service.refresh(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  it('logout deletes the session so its access token stops working', async () => {
    const { accessToken } = await service.login(user);
    const sid = sidOf(accessToken);

    await service.logout({ sid, element: user, role: user.role });

    expect(tokens.rows.has(sid)).toBe(false);
    await expect(service.authenticate(sid, accessToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
