export enum UserType {
  STUDENT = 'STUDENT',
  STUDENT_PREMIUM = 'STUDENT_PREMIUM',
  EDUCATOR = 'EDUCATOR',
}

export type TUserTokenPayload = {
  id: string;
  type: UserType;
};
