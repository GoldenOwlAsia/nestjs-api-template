import { compareSync, hashSync } from 'bcrypt';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { UserRole } from '@/common/enums';
import { UserAlreadyException } from '@/api/auth/auth.exceptions';

import { User } from './entities';
import { USERS_LIST_CACHE_KEY, UsersService } from './users.service';

describe('UsersService', () => {
  const OLD_PASSWORD_HASH = hashSync('0ldP@ssword', 4);

  const makeUser = (fields: Partial<User>) =>
    Object.assign(new User(), {
      password: OLD_PASSWORD_HASH,
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.CUSTOMER,
      ...fields,
    });

  let alice: User;
  let root: User;
  let otherAdmin: User;
  let repository: {
    findOneBy: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let cache: Map<string, unknown>;
  let service: UsersService;

  beforeEach(() => {
    alice = makeUser({
      id: 'c0ffee00-0000-4000-8000-000000000001',
      email: 'alice@example.com',
      phoneNumber: '0912345678',
    });
    root = makeUser({
      id: 'c0ffee00-0000-4000-8000-0000000000a1',
      email: 'root@example.com',
      phoneNumber: '0900000001',
      role: UserRole.ADMIN,
    });
    otherAdmin = makeUser({
      id: 'c0ffee00-0000-4000-8000-0000000000a2',
      email: 'bob@example.com',
      phoneNumber: '0900000002',
      role: UserRole.ADMIN,
    });
    const byId = new Map([alice, root, otherAdmin].map((u) => [u.id, u]));

    repository = {
      findOneBy: jest.fn(async (where) =>
        Array.isArray(where) ? null : (byId.get(where.id) ?? null),
      ),
      find: jest.fn(async () => [...byId.values()]),
      create: jest.fn((data) => Object.assign(new User(), data)),
      save: jest.fn(async (entity) => entity),
      delete: jest.fn(async () => ({ affected: 1 })),
    };

    cache = new Map();

    service = new UsersService(
      repository as any,
      { getAllByUser: jest.fn(async () => []) } as any,
      {
        get: async (key: string) => cache.get(key),
        set: async (key: string, value: unknown) => cache.set(key, value),
        del: async (key: string) => cache.delete(key),
      } as any,
    );
  });

  const savedUser = (): User => repository.save.mock.calls[0][0];

  it('never puts an undefined email into the where clause', async () => {
    await service.findOneByEmailOrPhoneNumber({ phoneNumber: '0900000000' });

    expect(repository.findOneBy).toHaveBeenCalledWith([
      { phoneNumber: '0900000000' },
    ]);
  });

  it('create rejects a duplicate email or phone number', async () => {
    repository.findOneBy.mockResolvedValueOnce(alice);

    await expect(
      service.create({
        email: alice.email,
        password: 'P@ssw0rd',
        firstName: 'A',
        lastName: 'B',
        phoneNumber: '0911111111',
      }),
    ).rejects.toBeInstanceOf(UserAlreadyException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('responses never include the password', async () => {
    const [list, detail, updated] = await Promise.all([
      service.getAll(),
      service.getDetailById(alice.id),
      service.update(alice, { lastName: 'Tran' }),
    ]);

    for (const response of [...list, detail, updated]) {
      expect(response).not.toHaveProperty('password');
    }
    expect(updated).toMatchObject({ lastName: 'Tran', role: 'CUSTOMER' });
  });

  describe('update', () => {
    it('hashes a new password before saving', async () => {
      await service.update(alice, { password: 'N3wP@ssw0rd' });

      expect(savedUser().password).not.toBe('N3wP@ssw0rd');
      expect(compareSync('N3wP@ssw0rd', savedUser().password)).toBe(true);
    });

    it('keeps the existing hash when the password is not changed', async () => {
      await service.update(alice, { firstName: 'Alicia' });

      expect(savedUser().password).toBe(OLD_PASSWORD_HASH);
      expect(savedUser().firstName).toBe('Alicia');
    });

    it('rejects a phone number that belongs to someone else', async () => {
      repository.findOneBy.mockImplementation(async (where) =>
        Array.isArray(where) ? otherAdmin : alice,
      );

      await expect(
        service.update(alice, { phoneNumber: '0999999999' }),
      ).rejects.toBeInstanceOf(UserAlreadyException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('admin management rules', () => {
    it('an admin can update and delete a customer', async () => {
      await service.updateById({
        id: alice.id,
        data: { lastName: 'Tran' },
        actor: root,
      });
      await service.deleteById(alice.id, root);

      expect(repository.save).toHaveBeenCalled();
      expect(repository.delete).toHaveBeenCalledWith({ id: alice.id });
    });

    it('an admin can update themselves', async () => {
      await service.updateById({
        id: root.id,
        data: { lastName: 'Root' },
        actor: root,
      });

      expect(savedUser().lastName).toBe('Root');
    });

    it('an admin cannot update or delete another admin', async () => {
      await expect(
        service.updateById({ id: otherAdmin.id, data: {}, actor: root }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.deleteById(otherAdmin.id, root),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  it.each([
    ['getDetailById', (s: UsersService, id: string) => s.getDetailById(id)],
    [
      'updateById',
      (s: UsersService, id: string) =>
        s.updateById({ id, data: {}, actor: root }),
    ],
    ['deleteById', (s: UsersService, id: string) => s.deleteById(id, root)],
  ])('%s throws NotFound for an unknown id', async (_, call) => {
    await expect(
      call(service, '00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('user list cache', () => {
    it('serves the second getAll from the cache', async () => {
      const first = await service.getAll();
      const second = await service.getAll();

      expect(second).toEqual(first);
      expect(repository.find).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        'create',
        (s: UsersService) =>
          s.create({
            email: 'new@example.com',
            password: 'P@ssw0rd',
            firstName: 'N',
            lastName: 'U',
            phoneNumber: '0933333333',
          }),
      ],
      ['update', (s: UsersService) => s.update(alice, { lastName: 'Tran' })],
      ['deleteById', (s: UsersService) => s.deleteById(alice.id, root)],
    ])('%s invalidates the cached list', async (_, write) => {
      await service.getAll();
      expect(cache.has(USERS_LIST_CACHE_KEY)).toBe(true);

      await write(service);

      expect(cache.has(USERS_LIST_CACHE_KEY)).toBe(false);
    });
  });
});
