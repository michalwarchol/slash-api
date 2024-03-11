import { Types } from 'mongoose';
import { UserType } from 'src/types/users';

export class UserDataResponse {
  _id: Types.ObjectId;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
  type: UserType;
}

export class SignUpInput {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  type: string;
}

export type SignUpResponse = {
  user: UserDataResponse;
  access_token: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignInResponse = {
  user: UserDataResponse;
  access_token: string;
};

type CourseProgress = {
  course_id: string;
  progress: number;
};

export class UserResponse {
  _id: Types.ObjectId;
  first_name: string;
  last_name: string;
  email: string;
  permissions: string[];
  avatar?: string;
  type: UserType;
  last_billing_date?: Date;
  next_billing_date?: Date;
  saved_courses?: string[];
  courses_in_progress?: CourseProgress[];
  courses?: string[];
}
