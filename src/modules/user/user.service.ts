import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';

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
  UpdateDataInput,
} from './user.dto';
import Dictionary from 'src/types/dictionary';
import { PartialUserUpdateProps } from 'src/types/users';

@Injectable()
export class UsersService {
  private readonly s3Client = new S3();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.s3Client.config.update({
      region: this.configService.get('aws.region'),
    });
  }

  async getUserData(id: string): Promise<UserDataResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    user.avatar = this.s3Client.getSignedUrl('getObject', {
      Key: user.avatar,
      Bucket: this.configService.get('aws.utilityBucketName'),
    });

    return user;
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

  async updateData(
    id: string,
    body: UpdateDataInput,
    avatar?: Express.Multer.File,
  ): Promise<TMutationResult<UserDataResponse>> {
    const payload: PartialUserUpdateProps = { ...body };
    const updatedUser = await this.userRepository.findOneBy({ id });

    if (avatar) {
      payload.avatar = updatedUser.avatar || uuid();

      await this.s3Client
        .putObject({
          Key: payload.avatar,
          Bucket: this.configService.get('aws.utilityBucketName'),
          Body: avatar.buffer,
        })
        .promise();
    }

    const result = await this.userRepository.update({ id }, payload);
    updatedUser.firstName = payload.firstName;
    updatedUser.lastName = payload.lastName;
    updatedUser.avatar = this.s3Client.getSignedUrl('getObject', {
      Key: payload.avatar,
      Bucket: this.configService.get('aws.utilityBucketName'),
    });

    return {
      success: result.affected === 1,
      result: updatedUser,
    };
  }
}
