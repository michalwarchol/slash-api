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
import Dictionary from 'src/types/dictionary';
import { PartialUserUpdateProps } from 'src/types/users';
import { MailService } from 'src/modules/mail/mail.service';
import accountActivationTemplatePl, {
  title as titleActivationPl,
} from 'src/templates/accountActivationTemplatePl';
import accountActivationTemplateEn, {
  title as titleActivationEn,
} from 'src/templates/accountActivationTemplateEn';
import passwordChangeTemplatePl, {
  title as passwordChangePl,
} from 'src/templates/passwordChangeTemplatePl';
import passwordChangeTemplateEn, {
  title as passwordChangeEn,
} from 'src/templates/passwordChangeTemplateEn';

import {
  SignUpInput,
  UserDataResponse,
  SignUpResponse,
  SignInInput,
  SignInResponse,
  UpdateDataInput,
  VerifyUserResponse,
} from './user.dto';
import { AuthCode, User } from './user.entity';
import generateAuthCode from 'src/utils/generateAuthCode';
import IsDateBeforeValidator from 'src/validators/IsDateBeforeValidator';
import formatDateToString from 'src/utils/formatDateToString';
import passwordChangeTemplate from 'src/templates/passwordChangeTemplatePl';

@Injectable()
export class UsersService {
  private readonly s3Client = new S3();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuthCode)
    private authCodeRepository: Repository<AuthCode>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.s3Client.config.update({
      region: this.configService.get('aws.region'),
    });
  }

  async getUserData(id: string): Promise<UserDataResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    user.avatar = user.avatar
      ? this.s3Client.getSignedUrl('getObject', {
          Key: user.avatar,
          Bucket: this.configService.get('aws.utilityBucketName'),
        })
      : null;

    return user;
  }

  async signUp(
    input: SignUpInput,
    lang: string,
  ): Promise<TMutationResult<SignUpResponse>> {
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
        isVerified: user.isVerified,
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
    );

    const code = generateAuthCode();

    const authCode = this.authCodeRepository.create({
      code,
      validUntil: formatDateToString(
        new Date(new Date().getTime() + 1000 * 60 * 5),
      ),
      user: {
        id: newUser.id,
      },
    });

    await this.authCodeRepository.save(authCode);

    const emailHtmlFunc =
      lang === 'pl' ? accountActivationTemplatePl : accountActivationTemplateEn;
    try {
      await this.mailService.sendEmail(
        input.email,
        lang === 'pl' ? titleActivationPl : titleActivationEn,
        emailHtmlFunc(input.firstName, code),
      );
    } catch (error) {}

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
          isVerified: newUser.isVerified,
        },
        accessToken: accessToken,
      },
    };
  }

  async signIn(
    input: SignInInput,
    lang: string,
  ): Promise<TMutationResult<SignInResponse>> {
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
        isVerified: true,
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
        isVerified: user.isVerified,
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
    );

    const code = generateAuthCode();

    const authCode = this.authCodeRepository.create({
      code,
      validUntil: formatDateToString(
        new Date(new Date().getTime() + 1000 * 60 * 5),
      ),
      user: {
        id: user.id,
      },
    });

    await this.authCodeRepository.delete({
      user: {
        id: user.id,
      },
    });
    await this.authCodeRepository.save(authCode);

    const emailHtmlFunc =
      lang === 'pl' ? accountActivationTemplatePl : accountActivationTemplateEn;
    try {
      await this.mailService.sendEmail(
        input.email,
        lang === 'pl' ? titleActivationPl : titleActivationEn,
        emailHtmlFunc(user.firstName, code),
      );
    } catch (error) {
      return {
        success: false,
        result: null,
      };
    }

    return {
      success: true,
      result: {
        user: {
          id: user.id,
          avatar: user.avatar
            ? this.s3Client.getSignedUrl('getObject', {
                Key: user.avatar,
                Bucket: this.configService.get('aws.utilityBucketName'),
              })
            : null,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          type: user.type,
          isVerified: user.isVerified,
        },
        accessToken: accessToken,
      },
    };
  }

  async verifyUser(
    userId: string,
    code: string,
  ): Promise<TMutationResult<VerifyUserResponse>> {
    const authCode = await this.authCodeRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
    });

    if (!authCode) {
      return {
        success: false,
        result: null,
        errors: {
          code: 'invalid',
        },
      };
    }

    const validators: TValidationOptions = [
      {
        field: 'code',
        validators: [RequiredValidator],
      },
      {
        field: 'validUntil',
        validators: [IsDateBeforeValidator],
        additionalProps: {
          comparedDate: authCode.validUntil,
        },
      },
    ];

    const errors = validate(
      {
        code,
        validUntil: new Date(),
      },
      validators,
    );
    if (!isEmpty(errors)) {
      return {
        success: false,
        errors,
      };
    }

    if (code !== authCode.code) {
      return {
        success: false,
        errors: {
          code: 'invalid',
        },
      };
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    await this.userRepository.update({ id: userId }, { isVerified: true });
    user.isVerified = true;

    await this.authCodeRepository.delete({ id: authCode.id });
    const accessToken = this.jwtService.sign(
      {
        id: user.id,
        type: user.type,
        isVerified: user.isVerified,
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
    );

    return {
      success: true,
      result: {
        user,
        accessToken,
      },
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<TMutationResult<boolean>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { password: true },
    });
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        errors: {
          credentials: 'credentialsInvalid',
        },
      };
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);
    await this.userRepository.update(
      { id: userId },
      { password: newPasswordHash },
    );

    return {
      success: true,
      result: true,
    };
  }

  async requestPasswordRemind(
    email: string,
    lang: string,
  ): Promise<TMutationResult<boolean>> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return {
        success: true,
        result: false,
      };
    }

    const code = generateAuthCode();
    const authCode = this.authCodeRepository.create({
      code,
      validUntil: formatDateToString(
        new Date(new Date().getTime() + 1000 * 60 * 5),
      ),
      user: {
        id: user.id,
      },
    });

    await this.authCodeRepository.delete({
      user: {
        id: user.id,
      },
    });
    await this.authCodeRepository.save(authCode);

    const emailHtmlFunc =
      lang === 'pl' ? passwordChangeTemplatePl : passwordChangeTemplateEn;
    try {
      await this.mailService.sendEmail(
        user.email,
        lang === 'pl' ? passwordChangePl : passwordChangeEn,
        emailHtmlFunc(user.firstName, code),
      );
    } catch (error) {
      return {
        success: false,
        result: false,
      };
    }

    return {
      success: true,
      result: true,
    };
  }

  async remindPassword(
    email: string,
    password: string,
    code: string,
  ): Promise<TMutationResult<VerifyUserResponse>> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isVerified: true,
        type: true,
        password: true,
      },
    });

    if (!user) {
      return {
        success: true,
        errors: {
          credentials: 'credentialsInvalid',
        },
      };
    }

    const authCode = await this.authCodeRepository.findOne({
      where: { user: { id: user.id } },
    });
    if (!authCode || authCode.code !== code) {
      return {
        success: false,
        result: null,
        errors: {
          code: 'invalid',
        },
      };
    }

    const validators: TValidationOptions = [
      {
        field: 'validUntil',
        validators: [IsDateBeforeValidator],
        additionalProps: {
          comparedDate: authCode.validUntil,
        },
      },
    ];

    const errors = validate(
      {
        code,
        validUntil: new Date(),
      },
      validators,
    );
    if (!isEmpty(errors)) {
      return {
        success: false,
        errors,
      };
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(password, salt);

    await this.userRepository.update(
      { id: user.id },
      { password: newPasswordHash },
    );
    await this.authCodeRepository.delete({ user: { id: user.id } });

    const accessToken = this.jwtService.sign(
      {
        id: user.id,
        type: user.type,
        isVerified: user.isVerified,
      },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: this.configService.get('jwt.expiresIn'),
      },
    );

    return {
      success: true,
      result: {
        user,
        accessToken,
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

    if (payload.avatar || updatedUser.avatar) {
      updatedUser.avatar = this.s3Client.getSignedUrl('getObject', {
        Key: payload.avatar || updatedUser.avatar,
        Bucket: this.configService.get('aws.utilityBucketName'),
      });
    }

    return {
      success: result.affected === 1,
      result: updatedUser,
    };
  }
}
