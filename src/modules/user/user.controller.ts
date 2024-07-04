import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TMutationResult } from 'src/types/responses';
import { AuthGuard } from 'src/guards/authGuard';
import { AuthNotVerifiedGuard } from 'src/guards/authNotVerifiedGuard';

import {
  SignUpInput,
  SignUpResponse,
  SignInInput,
  SignInResponse,
  UserDataResponse,
  UpdateDataInput,
  VerifyUserResponse,
  VerifyUserInput,
  ChangePasswordInput,
  RequestPasswordRemindInput,
  RemindPasswordInput,
} from './user.dto';
import { UsersService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private usersService: UsersService) {}
  @Post('signup')
  signUp(
    @Req() req,
    @Body() body: SignUpInput,
  ): Promise<TMutationResult<SignUpResponse>> {
    return this.usersService.signUp(body, req.headers.lang || 'en');
  }

  @Post('signin')
  signIn(
    @Req() req,
    @Body() body: SignInInput,
  ): Promise<TMutationResult<SignInResponse>> {
    return this.usersService.signIn(body, req.headers.lang || 'en');
  }

  @Post('verify-user')
  @UseGuards(AuthNotVerifiedGuard)
  verifyUser(
    @Request() req,
    @Body() body: VerifyUserInput,
  ): Promise<TMutationResult<VerifyUserResponse>> {
    return this.usersService.verifyUser(req.user.id, body.code);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  changePassword(
    @Request() req,
    @Body() body: ChangePasswordInput,
  ): Promise<TMutationResult<boolean>> {
    const { newPassword, oldPassword } = body;
    return this.usersService.changePassword(
      req.user.id,
      oldPassword,
      newPassword,
    );
  }

  @Post('request-password-remind')
  requestPasswordRemind(
    @Request() req,
    @Body() body: RequestPasswordRemindInput,
  ): Promise<TMutationResult<boolean>> {
    return this.usersService.requestPasswordRemind(
      body.email,
      req.headers.lang || 'en',
    );
  }

  @Post('remind-password')
  remindPassword(
    @Body() body: RemindPasswordInput,
  ): Promise<TMutationResult<VerifyUserResponse>> {
    const { email, password, code } = body;
    return this.usersService.remindPassword(email, password, code);
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
