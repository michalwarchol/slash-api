import { User } from '../user/user.entity';
import { CourseMaterials, CourseSubType, CourseVideo } from './course.entity';

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
  likesCount: number;
};

export type CourseUserStatistics = {
  isLiked: boolean;
};

export type LikeCourseInput = {
  id: string;
  isLike: boolean;
}

export type UserCourseWithStats = {
  id: string;
  name: string;
  description: string;
  type: CourseSubType;
  numberOfVideos: number;
  numberOfLikes: number;
}

export type CourseMaterial = {
  id: string;
  name: string;
  link: string;
  type: string;
  size: number;
}

export type CourseVideoResponse = {
  id: string;
  name: string;
  description: string;
  link: string;
  thumbnailLink: string;
  duration: number;
  views: number;
};

export type CourseVideoInput = {
  name: string;
  description: string;
};
