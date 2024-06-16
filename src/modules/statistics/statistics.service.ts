import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserCourseProgress } from './statistics.entity';
import { EducatorStats, StudentStats } from './statistics.dto';
import { Course } from '../course/course.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(UserCourseProgress)
    private userCourseProgressRepository: Repository<UserCourseProgress>,

    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async getEducatorStats(creatorId: string): Promise<EducatorStats> {
    const mostLikedCoursesQuery = `
      SELECT course.*, count(courseId) as likes FROM course_students_user
      LEFT JOIN course ON course_students_user.courseId = course.id
      WHERE course.creatorId = ?
      GROUP BY courseId
      ORDER BY likes DESC
      LIMIT 10;`;

    const mostLikedCourses = await this.courseRepository.query(
      mostLikedCoursesQuery,
      [creatorId],
    );

    const mostPopularCoursesQuery = `
      SELECT course.*, SUM(course_video.views) as views FROM course_video
      LEFT JOIN course ON course_video.courseId = course.id
      WHERE course.creatorId = ?
      GROUP BY courseId
      ORDER BY SUM(views) DESC
      LIMIT 10;`;

    const mostPopularCourses = await this.courseRepository.query(
      mostPopularCoursesQuery,
      [creatorId],
    );

    const mostViewedVideosQuery = `
      SELECT course_video.* FROM course_video
      LEFT JOIN course ON course_video.courseId = course.id
      WHERE course.creatorId = ?
      ORDER BY course_video.views DESC
      LIMIT 10;
    `;

    const mostViewedVideos = await this.courseRepository.query(
      mostViewedVideosQuery,
      [creatorId],
    );

    return {
      mostLikedCourses,
      mostPopularCourses,
      mostViewedVideos,
    };
  }

  // TODO - implement
  async getStudentStats(): Promise<StudentStats> {
    return {
      coursesEnded: 0,
      coursesInProgress: 0,
      watchTime: 0,
    };
  }
}
