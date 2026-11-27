import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { SupabaseJwtAuthGuard } from './guards/supabase-jwt-auth.guard.js';
import { UserProvisioningService } from './services/user-provisioning.service.js';
import { SupabaseJwksService } from './services/supabase-jwks.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.SUPABASE_JWT_SECRET || 'dev-fallback-supabase-jwt-secret-do-not-use-in-production',
      signOptions: { algorithm: 'HS256' },
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    SupabaseJwtAuthGuard,
    UserProvisioningService,
    SupabaseJwksService,
  ],
  exports: [
    PassportModule,
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
    SupabaseJwtAuthGuard,
    UserProvisioningService,
    SupabaseJwksService,
  ],
})
export class AuthModule {}
