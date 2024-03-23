import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import isEmpty from 'src/utils/isEmpty';
import { TMutationResult } from 'src/types/responses';
import { TValidationOptions } from 'src/types/validators';
import { validate } from 'src/validators';
import PasswordValidator from 'src/validators/PasswordValidator';
import RequiredValidator from 'src/validators/RequiredValidator';
import IsEmailValidator from 'src/validators/IsEmailValidator';

import { User } from './user.entity';
import {
  SignUpInput,
  UserDataResponse,
  SignUpResponse,
  SignInInput,
  SignInResponse,
} from './user.dto';
import Dictionary from 'src/types/dictionary';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async getUserData(id: string): Promise<UserDataResponse> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  async signUp(input: SignUpInput): Promise<TMutationResult<SignUpResponse>> {
    const userExists = await this.userRepository.findOne({
      where: { email: input.email },
      select: ['id'],
    });
    if (userExists) {
      return {
        success: false,
        errors: {
          email: 'emailExists',
        },
      };
    }

    const validators: TValidationOptions = [
      {
        field: 'firstName',
        validators: [RequiredValidator],
      },
      {
        field: 'lastName',
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

    const user = this.userRepository.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      type: input.type,
      password: hashedPassword,
    });

    const newUser = await this.userRepository.save(user);

    const accessToken = this.jwtService.sign(
      {
        id: newUser.id,
        type: newUser.type,
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
    );

    return {
      success: true,
      result: {
        user: {
          id: newUser.id,
          avatar: newUser.avatar,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          type: newUser.type,
        },
        accessToken: accessToken,
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

    const user = await this.userRepository.findOne({
      where: { email: input.email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        type: true,
        password: true,
      },
    });

    if (!user) {
      return {
        success: false,
        errors: {
          credentials: 'credentialsInvalid',
        },
      };
    }

    const match = await bcrypt.compare(input.password, user.password);
    if (!match) {
      return {
        success: false,
        errors: {
          credentials: 'credentialsInvalid',
        },
      };
    }

    const accessToken = this.jwtService.sign(
      {
        id: user.id,
        type: user.type,
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
    );

    return {
      success: true,
      result: {
        user: {
          id: user.id,
          avatar: user.avatar,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          type: user.type,
        },
        accessToken: accessToken,
      },
    };
  }

  userRoles(locale: string): Dictionary {
    const values = {
      pl: {
        STUDENT: 'Student',
        EDUCATOR: 'Edukator',
      },
      en: {
        STUDENT: 'Student',
        EDUCATOR: 'Educator',
      },
    };

    const localeValues = values[locale] || values.en;

    return Object.keys(localeValues).map((key) => ({
      name: key,
      value: localeValues[key],
    }));
  }
}
