import { CourseResponse } from '../course/course.dto';
import { User } from '../user/user.entity';

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

export type CourseVideoFullResponse = {
  id: string;
  name: string;
  description: string;
  link: string;
  thumbnailLink: string;
  duration: number;
  views: number;
  course: CourseResponse;
  nextVideoId: string | null;
  previousVideoId: string | null;
  rating: number;
};

export type CourseVideoCommentInput = {
  id?: string;
  text: string;
};

export type CourseVideoCommentResponse = {
  id: string;
  text: string;
  author: User;
  createdAt: Date;
  updatedAt: Date;
};

export type CourseVideoRateInput = {
  id?: string;
  rating: number;
};

export type CourseVideoRateResponse = {
  rating: {
    id: string;
    rating: number;
  };
};
