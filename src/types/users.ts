export enum UserType {
  STUDENT = 'STUDENT',
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
