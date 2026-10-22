import { compareSync, hashSync } from 'bcrypt';
import { NotFoundException } from '@nestjs/common';

import { UserAlreadyException } from '@/api/auth/auth.exceptions';

import { Customer } from './entities';
import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  const OLD_PASSWORD_HASH = hashSync('0ldP@ssword', 4);

  let alice: Customer;
  let repository: {
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let service: CustomerService;

  beforeEach(() => {
    alice = Object.assign(new Customer(), {
      id: 'c0ffee00-0000-4000-8000-000000000001',
      email: 'alice@example.com',
      password: OLD_PASSWORD_HASH,
      firstName: 'Alice',
      lastName: 'Nguyen',
      phoneNumber: '0912345678',
    });

    repository = {
      findOneBy: jest.fn(async (where) =>
        !Array.isArray(where) && where.id === alice.id ? alice : null,
      ),
      create: jest.fn((data) => Object.assign(new Customer(), data)),
      save: jest.fn(async (entity) => entity),
      delete: jest.fn(async () => ({ affected: 1 })),
    };

    service = new CustomerService(
      repository as any,
      {
        getAllByUser: jest.fn(async () => []),
      } as any,
    );
  });

  it('never puts an undefined email into the where clause', async () => {
    await service.findOneByEmailOrPhoneNumber({ phoneNumber: '0900000000' });

    expect(repository.findOneBy).toHaveBeenCalledWith([
      { phoneNumber: '0900000000' },
    ]);
  });

  describe('updateById', () => {
    it('hashes a new password before saving', async () => {
      await service.updateById({
        id: alice.id,
        data: { password: 'N3wP@ssw0rd' },
      });

      const saved: Customer = repository.save.mock.calls[0][0];
      expect(saved.password).not.toBe('N3wP@ssw0rd');
      expect(compareSync('N3wP@ssw0rd', saved.password)).toBe(true);
    });

    it('keeps the existing hash when the password is not changed', async () => {
      await service.updateById({ id: alice.id, data: { firstName: 'Alicia' } });

      const saved: Customer = repository.save.mock.calls[0][0];
      expect(saved.password).toBe(OLD_PASSWORD_HASH);
      expect(saved.firstName).toBe('Alicia');
    });

    it('rejects a phone number that belongs to someone else', async () => {
      repository.findOneBy.mockImplementation(async (where) =>
        Array.isArray(where) ? new Customer() : alice,
      );

      await expect(
        service.updateById({
          id: alice.id,
          data: { phoneNumber: '0999999999' },
        }),
      ).rejects.toBeInstanceOf(UserAlreadyException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('omits the password from the response', async () => {
      const response = await service.updateById({
        id: alice.id,
        data: { lastName: 'Tran' },
      });

      expect(response).not.toHaveProperty('password');
      expect(response).toMatchObject({ lastName: 'Tran', role: 'CUSTOMER' });
    });
  });

  it.each([
    ['getDetailById', (s: CustomerService, id: string) => s.getDetailById(id)],
    [
      'updateById',
      (s: CustomerService, id: string) => s.updateById({ id, data: {} }),
    ],
  ])('%s throws NotFound for an unknown id', async (_, call) => {
    await expect(
      call(service, '00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deleteById throws NotFound when nothing was deleted', async () => {
    repository.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(service.deleteById(alice.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
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
  });
});
