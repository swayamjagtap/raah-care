import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const connectionString =
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      'postgresql://localhost:5432/raah_care';
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    if (process.env.DIRECT_URL || process.env.DATABASE_URL) {
      try {
        await this.$connect();
      } catch (err) {
        console.warn(
          'PrismaService could not establish startup connection:',
          (err as Error).message,
        );
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
