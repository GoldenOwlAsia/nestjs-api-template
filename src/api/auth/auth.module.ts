import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AdminModule } from '@/api/admin/admin.module';
import { TokenModule } from '@/api/token/token.module';
import { CustomerModule } from '@/api/customer/customer.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy, LocalStrategy } from './strategies';

@Module({
  imports: [
    AdminModule,
    TokenModule,
    ConfigModule,
    PassportModule,
    CustomerModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('token.authentication.lifetime') / 1000, // default unit of jwtOptions:expiresIn  is second, so we must divide 1000 (ms)
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
})
export class AuthModule {}
