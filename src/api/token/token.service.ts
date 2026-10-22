import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { hash } from '@/utils/helpers';

import { Token } from './entities';
import { TokenRepository } from './token.repository';

import type { UserRole } from '@/common/enums';

import type { CreateTokenDto } from './dto/create-token.dto';

type TTokenPair = Pick<CreateTokenDto, 'accessToken' | 'refreshToken'>;

/** Tokens are stored as sha256 digests, never in plain text. */
const digest = ({ accessToken, refreshToken }: TTokenPair): TTokenPair => ({
  accessToken: hash.sha256(accessToken),
  refreshToken: hash.sha256(refreshToken),
});

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: TokenRepository,
  ) {}

  public async create(tokenInfo: CreateTokenDto): Promise<Token> {
    const createdToken = this.tokenRepository.create({
      ...tokenInfo,
      ...digest(tokenInfo),
    });

    await this.tokenRepository.save(createdToken);

    return createdToken;
  }

  public async findById(id: string): Promise<Token | null> {
    return this.tokenRepository.findOneBy({ id });
  }

  public async rotate(id: string, tokens: TTokenPair): Promise<void> {
    await this.tokenRepository.update({ id }, digest(tokens));
  }

  public async deleteById(id: string): Promise<void> {
    await this.tokenRepository.delete({ id });
  }

  public async getAllByUser({
    id,
    role,
  }: {
    id: string;
    role: UserRole;
  }): Promise<Token[]> {
    const sessions = await this.tokenRepository.findBy({
      userId: id,
      userRole: role,
    });

    return sessions;
  }
}
