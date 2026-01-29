import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from 'src/modules/users/users.module';
import { User } from 'src/modules/users/users.entity';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AuditLogsModule } from 'src/modules/audit-logs/audit-logs.module';
import { AuditLog } from 'src/modules/audit-logs/entities/audit-log.entity';
import { MailModule } from 'src/modules/mail/mail.module';
import { StorageModule } from 'src/modules/storage/storage.module';
import { PasswordResetToken } from 'src/modules/auth/entities/password-reset-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1h';
        return {
          secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
          signOptions: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    // BullMQ configuration for mail queue
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', ''),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          type: 'postgres',
          host: config.get<string>('DB_HOST'),
          port: config.get<number>('DB_PORT'),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASSWORD'),
          database: config.get<string>('DB_NAME'),
          entities: [User, AuditLog, PasswordResetToken],
          migrations: [__dirname + 'database/migration/**/*{.js,.ts}'],
          migrationsRun: false,
          migrationsTableName: 'migrations',
          migrationsTransactionMode: 'all',
          synchronize: false,
          logging: true,
        };
      },
    }),
    // Modules
    AuditLogsModule,
    MailModule,
    UsersModule,
    AuthModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
