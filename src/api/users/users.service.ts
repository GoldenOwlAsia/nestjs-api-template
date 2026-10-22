import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

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

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private tokenService: TokenService,
  ) {}

  public async create(data: CreateUserDto): Promise<UserResponseDto> {
    if (await this.findOneByEmailOrPhoneNumber(data)) {
      throw new UserAlreadyException();
    }

    const user = this.userRepository.create(data);

    await this.userRepository.save(user);

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

  public async getAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find();

    return users.map((user) => user.toResponse());
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
  }
}
