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
