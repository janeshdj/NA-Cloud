import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';

import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './events/events.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeavesModule } from './modules/leaves/leaves.module';
import { PayrollModule } from './modules/payroll/payroll.module';

import { User } from './modules/users/user.entity';
import { Attendance } from './modules/attendance/attendance.entity';
import { Leave } from './modules/leaves/leave.entity';
import { Payslip } from './modules/payroll/payroll.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USER', 'neithal'),
        password: configService.get<string>('DB_PASSWORD', 'neithal_secure_hrms_pass_2026'),
        database: configService.get<string>('DB_NAME', 'neithal_hrms'),
        entities: [User, Attendance, Leave, Payslip],
        synchronize: true, // Auto-sync entities schema in dev mode
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          ttl: 60 * 60, // 1 hour default cache TTL
        }),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    EventsModule,
    AttendanceModule,
    LeavesModule,
    PayrollModule,
  ],
})
export class AppModule {}
