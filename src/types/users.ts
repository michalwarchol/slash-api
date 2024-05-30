import { User } from "src/modules/user/user.entity";

export enum UserType {
  STUDENT = 'STUDENT',
  STUDENT_PREMIUM = 'STUDENT_PREMIUM',
  EDUCATOR = 'EDUCATOR',
}

export type TUserTokenPayload = {
  id: string;
  type: UserType;
};

type TUserUpdateProps = {
  firstName: string;
  lastName: string;
  avatar: string;
};

export type PartialUserUpdateProps = Partial<TUserUpdateProps>;
