import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  SignUpInput,
  SignUpResponse,
  SignInInput,
  SignInResponse,
} from './user.dto';
import { TMutationResult } from 'src/types/responses';
import { AuthGuard } from 'src/guards/authGuard';

import { UsersService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}
  @Post('signup')
  signUp(@Body() body: SignUpInput): Promise<TMutationResult<SignUpResponse>> {
    return this.usersService.signUp(body);
  }

  @Post('signin')
  signIn(@Body() body: SignInInput): Promise<TMutationResult<SignInResponse>> {
    return this.usersService.signIn(body);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Request() req) {
    return this.usersService.getUserData(req.user.id);
  }

  @Get('roles')
  roles(@Request() req) {
    return this.usersService.userRoles(req.headers.lang || 'en');
  }
}
