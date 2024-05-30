import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  SignUpInput,
  SignUpResponse,
  SignInInput,
  SignInResponse,
  UserDataResponse,
  UpdateDataInput,
} from './user.dto';
import { TMutationResult } from 'src/types/responses';
import { AuthGuard } from 'src/guards/authGuard';

import { UsersService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';

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
  me(@Request() req): Promise<UserDataResponse> {
    return this.usersService.getUserData(req.user.id);
  }

  @Get('roles')
  roles(@Request() req) {
    return this.usersService.userRoles(req.headers.lang || 'en');
  }

  @Get('user/:id')
  user(@Param('id') id: string) {
    return this.usersService.getUserData(id);
  }

  @Put('update')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        files: 1,
        fileSize: 2 * 1000 * 1000,
      },
    }),
  )
  updateData(
    @Request() req,
    @Body() body: UpdateDataInput,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<TMutationResult<UserDataResponse>> {
    return this.usersService.updateData(req.user.id, body, file);
  }
}
