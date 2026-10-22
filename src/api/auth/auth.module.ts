import { JwtModule } from '@nestjs/jwt';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

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
    PassportModule,
    CustomerModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          // jsonwebtoken expects seconds; config stores milliseconds.
          expiresIn: configService.get('token.access.lifetime') / 1000,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
})
export class AuthModule {}
