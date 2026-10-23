import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

import type { Cache } from 'cache-manager';

import type { FindOptionsWhere, Repository } from 'typeorm';

import { hash } from '@/utils/helpers';
import { UserRole } from '@/common/enums';
import { TokenService } from '@/api/token/token.service';
import { UserAlreadyException } from '@/api/auth/auth.exceptions';

import { User } from './entities';

import type {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserDetailResponseDto,
} from './dto';

/** Cache key for the admin user list; every write below invalidates it. */
export const USERS_LIST_CACHE_KEY = 'users:list';
const USERS_LIST_TTL = 30_000;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tokenService: TokenService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  public async create(data: CreateUserDto): Promise<UserResponseDto> {
    if (await this.findOneByEmailOrPhoneNumber(data)) {
      throw new UserAlreadyException();
    }

    const user = this.userRepository.create(data);

    await this.userRepository.save(user);
    await this.cache.del(USERS_LIST_CACHE_KEY);

    return user.toResponse();
  }

  public async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  public async findOneById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  public async findOneByEmailOrPhoneNumber({
    email,
    phoneNumber,
  }: {
    email?: string;
    phoneNumber: string;
  }): Promise<User | null> {
    // Never put `undefined` in a where clause: TypeORM 1 throws on it.
    const where: FindOptionsWhere<User>[] = [{ phoneNumber }];

    if (email) {
      where.push({ email });
    }

    return this.userRepository.findOneBy(where);
  }

  private async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findOneById(id);

    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  /** Admins may manage customers and themselves, but not other admins. */
  private assertCanManage(actor: User, target: User): void {
    if (target.role === UserRole.ADMIN && target.id !== actor.id) {
      throw new ForbiddenException();
    }
  }

  /** Cache-aside example: served from Redis for 30s, dropped on any user write. */
  public async getAll(): Promise<UserResponseDto[]> {
    const cached =
      await this.cache.get<UserResponseDto[]>(USERS_LIST_CACHE_KEY);

    if (cached) {
      return cached;
    }

    const users = (await this.userRepository.find()).map((user) =>
      user.toResponse(),
    );

    await this.cache.set(USERS_LIST_CACHE_KEY, users, USERS_LIST_TTL);

    return users;
  }

  public async getDetailById(id: string): Promise<UserDetailResponseDto> {
    const user = await this.findByIdOrFail(id);

    const sessions = await this.tokenService.getAllByUser(id);

    return user.toResponseHavingSessions(sessions);
  }

  public async update(
    user: User,
    data: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const { phoneNumber } = data;

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      if (await this.findOneByEmailOrPhoneNumber({ phoneNumber })) {
        throw new UserAlreadyException();
      }
    }

    // @BeforeInsert hashes on create only; updates must hash here.
    const password = data.password
      ? await hash.generateWithBcrypt({ source: data.password, salt: 10 })
      : user.password;

    const updatedUser = this.userRepository.create({
      ...user,
      ...data,
      password,
    });

    await this.userRepository.save(updatedUser);
    await this.cache.del(USERS_LIST_CACHE_KEY);

    return updatedUser.toResponse();
  }

  public async updateById({
    id,
    data,
    actor,
  }: {
    id: string;
    data: UpdateUserDto;
    actor: User;
  }): Promise<UserResponseDto> {
    const user = await this.findByIdOrFail(id);

    this.assertCanManage(actor, user);

    return this.update(user, data);
  }

  /** Sessions go with the user (tokens.user_id has ON DELETE CASCADE). */
  public async deleteById(id: string, actor: User): Promise<void> {
    this.assertCanManage(actor, await this.findByIdOrFail(id));

    await this.userRepository.delete({ id });
    await this.cache.del(USERS_LIST_CACHE_KEY);
  }
}
