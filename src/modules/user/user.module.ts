import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UsersService } from './user.service';
import { AuthCode, User } from './user.entity';
import { JwtStrategy } from 'src/strategies/jwtStrategy';
import { MailService } from '../mail/mail.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, AuthCode])],
  controllers: [UserController],
  providers: [UsersService, JwtService, JwtStrategy, MailService],
})
export class UsersModule {}
