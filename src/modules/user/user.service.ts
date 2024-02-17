import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import isEmpty from 'src/utils/isEmpty';
import { TMutationResult } from 'src/types/responses';
import { TValidationOptions } from 'src/types/validators';
import { validate } from 'src/validators';
import PasswordValidator from 'src/validators/PasswordValidator';

import { User } from './user.schema';
import { UserCreateInput, UserDataResponse, UserResponse } from './user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async getUserData(id: string): Promise<UserDataResponse> {
    return this.userModel.findById(new Types.ObjectId(id), {
      _id: 1,
      first_name: 1,
      last_name: 1,
      avatar: 1,
      type: 1,
    });
  }

  async createUser(
    input: UserCreateInput,
  ): Promise<TMutationResult<UserResponse>> {
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
        field: 'password',
        value: input.password,
        validators: [new PasswordValidator()],
      },
    ];

    const errors = validate(validators);
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

    return {
      success: true,
      result: user,
    };
  }
}
