import { User } from '../user/user.entity';
import { CourseMaterials, CourseSubType, CourseVideo } from './course.entity';

export type CreateCourseInput = {
  name: string;
  description: string;
  subTypeId: string;
};

export type UpdateCourseInput = {
  id: string;
  name?: string;
  description?: string;
  subTypeId?: string;
};

export type CourseResponse = {
  id: string;
  name: string;
  description: string;
  creator: User;
  type: CourseSubType;
};

export type FullCourseResponse = {
  id: string;
  name: string;
  description: string;
  creator: User;
  type: CourseSubType;
  courseMaterials: CourseMaterials[];
  courseVideos: CourseVideo[];
};
