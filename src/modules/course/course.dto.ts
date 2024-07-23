import { User } from 'src/modules/user/user.entity';
import { UserDataResponse } from 'src/modules/user/user.dto';
import { CourseVideoResponse } from 'src/modules/video/video.dto';
import { CourseVideo } from 'src/modules/video/video.entity';

import { CourseMaterials, CourseSubType } from './course.entity';

export type CourseTypesResponse = {
  id: string;
  name: string;
  value: string;
  subTypes: {
    id: string;
    name: string;
    value: string;
  }[];
}[];

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
  creator: UserDataResponse;
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
  likesCount: number;
};

export type CourseUserStatistics = {
  isLiked: boolean;
};

export type LikeCourseInput = {
  id: string;
  isLike: boolean;
};

export type UserCourseWithStats = {
  id: string;
  name: string;
  description: string;
  type: CourseSubType;
  numberOfVideos: number;
  numberOfLikes: number;
};

export type CourseMaterial = {
  id: string;
  name: string;
  link: string;
  type: string;
  size: number;
};

export type CourseResult = {
  course: {
    id: string;
    name: string;
    description: string;
    creator: UserDataResponse;
    type: {
      id: string;
      name: string;
      valuePl: string;
      valueEn: string;
    };
  };
  firstVideo: CourseVideoResponse;
  totalVideos: number;
};
