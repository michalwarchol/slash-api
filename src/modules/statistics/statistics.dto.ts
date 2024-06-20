import { Course, CourseSubType } from 'src/modules/course/course.entity';
import { CourseVideo } from 'src/modules/video/video.entity';
import { User } from 'src/modules/user/user.entity';

export type EducatorStats = {
  mostPopularCourses: Course[];
  mostLikedCourses: Course[];
  mostViewedVideos: CourseVideo[];
};

export type StudentStats = {
  coursesInProgress: number;
  coursesEnded: number;
  watchTime: number;
  favCategory: CourseSubType;
  favEducator: User;
};

export type ProgressAddInput = {
  hasEnded: boolean;
  videoId: string;
  watchTime: number;
};

export type ProgressEditInput = ProgressAddInput & {
  id: string;
}

export type ProgressAddEditInput = ProgressAddInput & {
  id?: string;
}

export type ProgressResponse = {
  id: string;
  hasEnded: boolean;
  watchTime: number;
  user: User;
  course: Course;
  courseVideo: CourseVideo;
};
