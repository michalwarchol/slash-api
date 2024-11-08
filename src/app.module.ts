import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';

import { UsersModule } from 'src/modules/user/user.module';
import { CoursesModule } from 'src/modules/course/course.module';
import { VideoModule } from 'src/modules/video/video.module';
import { StatisticsModule } from 'src/modules/statistics/statistics.module';

import { MailService } from 'src/modules/mail/mail.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<string>('database.name') === 'development',
        logging: configService.get<string>('database.name') === 'development',
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    CoursesModule,
    VideoModule,
    StatisticsModule,
    PassportModule,
    JwtModule.register({
      secret: configuration().jwt.secret,
      signOptions: {
        expiresIn: configuration().jwt.expiresIn,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
  exports: [MailService],
})
export class AppModule {}
