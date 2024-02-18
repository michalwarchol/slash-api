import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UsersService } from './user.service';
import { User, UserSchema } from './user.schema';
import { JwtStrategy } from 'src/strategies/jwtStrategy';

@Module({
  controllers: [UserController],
  providers: [UsersService, JwtService, JwtStrategy],
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
})
export class UsersModule {}
