import { CourseResponse } from "../course/course.dto";

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
