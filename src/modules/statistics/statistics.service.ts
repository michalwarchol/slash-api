import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';

import { Course } from 'src/modules/course/course.entity';
import { CourseVideo } from 'src/modules/video/video.entity';
import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';
import { TValidationOptions } from 'src/types/validators';
import RequiredValidator from 'src/validators/RequiredValidator';
import { validate } from 'src/validators';
import isEmpty from 'src/utils/isEmpty';

import {
  EducatorStats,
  ProgressAddEditInput,
  ProgressResponse,
  StudentStats,
} from './statistics.dto';
import { UserCourseProgress } from './statistics.entity';

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(UserCourseProgress)
    private userCourseProgressRepository: Repository<UserCourseProgress>,

    @InjectRepository(Course)
    private courseRepository: Repository<Course>,

    @InjectRepository(CourseVideo)
    private courseVideoRepository: Repository<CourseVideo>,
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

  async getStudentStats(userId: string): Promise<StudentStats> {
    // coursesEnded
    const coursesEnded = await this.userCourseProgressRepository.count({
      where: {
        user: {
          id: userId,
        },
        hasEnded: true,
      },
    });

    // coursesInProgress
    const coursesInProgress = await this.userCourseProgressRepository.count({
      where: {
        user: {
          id: userId,
        },
        hasEnded: false,
      },
    });

    // watchTime
    const watchTimeQuery = `
      SELECT
        SUM(
	        CASE
		        WHEN user_course_progress.hasEnded = False AND course_video.id = video.id THEN user_course_progress.watchTime
    	      ELSE video.duration
    	      END
        ) AS watchTime
      FROM user_course_progress
      LEFT JOIN course ON courseId = course.id
      LEFT JOIN course_video ON course.id = course_video.courseId
      LEFT JOIN course_video as video ON user_course_progress.courseVideoId = video.id
      WHERE user_course_progress.userId = ? AND video.createdAt >= course_video.createdAt;`;

    const watchTimeResult = await this.userCourseProgressRepository.query(
      watchTimeQuery,
      [userId],
    );

    const watchTime = watchTimeResult[0].watchTime
      ? parseInt(watchTimeResult[0].watchTime)
      : 0;

    // favEducator
    const favEducatorQuery = `
      SELECT user.*, count(user.id) AS user_count, user_course_progress.userId
      FROM user_course_progress
      LEFT JOIN course ON courseId = course.id
      LEFT JOIN user ON course.creatorId = user.id
      GROUP BY user_course_progress.id
      HAVING user_course_progress.userId = ?
      ORDER BY user_count DESC
      LIMIT 1;
    `;
    const favEducator = await this.userCourseProgressRepository.query(
      favEducatorQuery,
      [userId],
    );
    favEducator[0].user_count = undefined;
    favEducator[0].userId = undefined;
    favEducator[0].password = undefined;
    favEducator[0].isVerified = undefined;

    // favCategory
    const favCategoryQuery = `
      SELECT course_sub_type.*, count(course_sub_type.id) AS type_count
      FROM user_course_progress
      LEFT JOIN course ON courseId = course.id
      LEFT JOIN course_sub_type ON course.typeId = course_sub_type.id
      WHERE user_course_progress.userId = ?
      GROUP BY course_sub_type.id
      ORDER BY type_count DESC
      LIMIT 1;
    `;
    const favCategory = await this.userCourseProgressRepository.query(
      favCategoryQuery,
      [userId],
    );
    favCategory[0].type_count = undefined;

    return {
      coursesEnded,
      coursesInProgress,
      watchTime,
      favEducator: favEducator[0],
      favCategory: favCategory[0],
    };
  }

  async addEditProgress(
    userId: string,
    body: ProgressAddEditInput,
    isEdit: boolean,
  ): Promise<TMutationResult<ProgressResponse>> {
    const validators: TValidationOptions = [
      {
        field: 'watchTime',
        validators: [RequiredValidator],
      },
      {
        field: 'hasEnded',
        validators: [RequiredValidator],
      },
      {
        field: 'videoId',
        validators: [RequiredValidator],
      },
    ];

    if (isEdit) {
      validators.push({
        field: 'id',
        validators: [RequiredValidator],
      });
    }

    const errors = validate(body, validators);
    if (!isEmpty(errors)) {
      return {
        success: false,
        errors,
      };
    }

    const video = await this.courseVideoRepository.findOne({
      where: { id: body.videoId },
      relations: { course: true },
    });

    if (!video) {
      return {
        success: false,
        errors: {
          videoId: 'notFound',
        },
      };
    }

    if (!isEdit) {
      const isDuplicated = await this.userCourseProgressRepository
        .createQueryBuilder()
        .where('userId = :userId', { userId })
        .andWhere((sq) =>
          sq
            .where('courseVideoId = :videoId', { videoId: body.videoId })
            .orWhere('courseId = :courseId', { courseId: video.course.id }),
        )
        .getOne();

      if (isDuplicated) {
        return {
          success: false,
          errors: {
            videoId: 'duplicated',
          },
        };
      }
    }

    const userCourseProgress = this.userCourseProgressRepository.create({
      ...body,
      user: {
        id: userId,
      },
      course: {
        id: video.course.id,
      },
      courseVideo: {
        id: body.videoId,
      },
    });

    const result =
      await this.userCourseProgressRepository.save(userCourseProgress);

    return {
      success: true,
      result,
    };
  }

  async getUserCourseProgress(
    userId: string,
    page: number,
    perPage: number,
    withEnded?: boolean,
  ): Promise<PaginatedQueryResult<ProgressResponse>> {
    const whereConstraints: FindOptionsWhere<UserCourseProgress> = {
      user: {
        id: userId,
      },
    }

    if (!withEnded) {
      whereConstraints.hasEnded = false;
    }

    const data = await this.userCourseProgressRepository.find({
      where: whereConstraints,
      order: {
        createdAt: 'DESC',
      },
      relations: {
        course: true,
        courseVideo: true,
      },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    const total = await this.userCourseProgressRepository.count({
      where: {
        user: {
          id: userId,
        },
      },
    });

    return {
      data,
      paginatorInfo: {
        page,
        perPage,
        count: data.length,
        total,
      },
    };
  }
}
