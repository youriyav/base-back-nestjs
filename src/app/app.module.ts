import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from 'src/modules/users/users.module';
import { User } from 'src/modules/users/users.entity';
import { AuthModule } from 'src/modules/auth/auth.module';

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
          entities: [User],
          migrations: [__dirname + 'database/migration/**/*{.js,.ts}'],
          migrationsRun: false,
          migrationsTableName: 'migrations',
          migrationsTransactionMode: 'all',
          synchronize: false,
          logging: true,
        };
      },
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
