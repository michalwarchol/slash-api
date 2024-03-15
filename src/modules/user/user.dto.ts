import { UserType } from 'src/types/users';

export class UserDataResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string;
  type: UserType;
}

export class SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  type: UserType;
}

export type SignUpResponse = {
  user: UserDataResponse;
  accessToken: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignInResponse = {
  user: UserDataResponse;
  accessToken: string;
};

type CourseProgress = {
  courseId: string;
  progress: number;
};

export class UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  permissions: string[];
  avatar?: string;
  type: UserType;
  lastBillingDate?: Date;
  nextBillingDate?: Date;
  savedCourses?: string[];
  coursesInProgress?: CourseProgress[];
  courses?: string[];
}
