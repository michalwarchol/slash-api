import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import isEmpty from 'src/utils/isEmpty';
import { TMutationResult } from 'src/types/responses';
import { TValidationOptions } from 'src/types/validators';
import { validate } from 'src/validators';
import PasswordValidator from 'src/validators/PasswordValidator';
import RequiredValidator from 'src/validators/RequiredValidator';
import IsEmailValidator from 'src/validators/IsEmailValidator';

import { User } from './user.schema';
import {
  SignUpInput,
  UserDataResponse,
  SignUpResponse,
  SignInInput,
  SignInResponse,
} from './user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async getUserData(id: string): Promise<UserDataResponse> {
    return this.userModel.findById(new Types.ObjectId(id), {
      _id: 1,
      email: 1,
      first_name: 1,
      last_name: 1,
      avatar: 1,
      type: 1,
    });
  }

  async signUp(input: SignUpInput): Promise<TMutationResult<SignUpResponse>> {
    const userExists = await this.userModel.findOne(
      { email: input.email },
      { _id: 1 },
    );
    if (userExists) {
      return {
        success: false,
        errors: {
          email: 'User already exists',
        },
      };
    }

    const validators: TValidationOptions = [
      {
        field: 'first_name',
        validators: [RequiredValidator],
      },
      {
        field: 'last_name',
        validators: [RequiredValidator],
      },
      {
        field: 'email',
        validators: [RequiredValidator, IsEmailValidator],
      },
      {
        field: 'password',
        validators: [RequiredValidator, PasswordValidator],
      },
      {
        field: 'type',
        validators: [RequiredValidator],
      },
    ];

    const errors = validate(input, validators);
    if (!isEmpty(errors)) {
      return {
        success: false,
        errors,
      };
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    const user = await this.userModel.create({
      _id: new Types.ObjectId(),
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      type: input.type,
      password: hashedPassword,
    });

    const accessToken = this.jwtService.sign(
      {
        _id: user._id,
        type: user.type,
      },
      { secret: this.configService.get('jwt.secret') },
    );

    return {
      success: true,
      result: {
        user,
        access_token: accessToken,
      },
    };
  }

  async signIn(input: SignInInput): Promise<TMutationResult<SignInResponse>> {
    const validators: TValidationOptions = [
      {
        field: 'email',
        validators: [RequiredValidator, IsEmailValidator],
      },
      {
        field: 'password',
        validators: [RequiredValidator],
      },
    ];

    const errors = validate(input, validators);
    if (!isEmpty(errors)) {
      return {
        success: false,
        errors,
      };
    }

    const user = await this.userModel.findOne({ email: input.email });

    if (!user) {
      return {
        success: false,
        errors: {
          credentials: 'Given credentials are invalid',
        },
      };
    }

    const match = await bcrypt.compare(input.password, user.password);
    if (!match) {
      return {
        success: false,
        errors: {
          credentials: 'Given credentials are invalid',
        },
      };
    }

    const accessToken = this.jwtService.sign(
      {
        _id: user._id,
        type: user.type,
      },
      { secret: this.configService.get('jwt.secret') },
    );

    return {
      success: true,
      result: {
        access_token: accessToken,
      },
    };
  }
}
