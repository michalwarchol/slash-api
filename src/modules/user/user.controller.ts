import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserCreateInput, UserDataResponse, UserResponse } from './user.dto';
import { UsersService } from './user.service';
import { TMutationResult } from 'src/types/responses';

@Controller('users')
export class CatsController {
  constructor(private usersService: UsersService) {}
  @Get(':id')
  getUserData(@Param('id') id: string): Promise<UserDataResponse> {
    return this.usersService.getUserData(id);
  }

  @Post()
  createUser(@Body() body: UserCreateInput): Promise<TMutationResult<UserResponse>> {
    return this.usersService.createUser(body);
  }
}
