import { Types } from 'mongoose';

export enum UserType {
  STUDENT = 'STUDENT',
  STUDENT_PREMIUM = 'STUDENT_PREMIUM',
  EDUCATOR = 'EDUCATOR',
}

export type TUserTokenPayload = {
  _id: Types.ObjectId;
  type: UserType;
};
