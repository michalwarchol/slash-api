import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Brackets, FindOptionsWhere, Repository } from 'typeorm';
import { S3 } from 'aws-sdk';

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
import { CourseResult } from '../course/course.dto';

@Injectable()
export class StatisticsService {
  private readonly s3Client = new S3();

  constructor(
    @InjectRepository(UserCourseProgress)
    private userCourseProgressRepository: Repository<UserCourseProgress>,

    @InjectRepository(Course)
    private courseRepository: Repository<Course>,

    @InjectRepository(CourseVideo)
    private courseVideoRepository: Repository<CourseVideo>,

    private readonly configService: ConfigService,
  ) {
    this.s3Client.config.update({
      region: this.configService.get('aws.region'),
    });
  }

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
    favEducator[0].avatar = this.s3Client.getSignedUrl('getObject', {
      Key: favEducator[0].avatar,
      Bucket: this.configService.get('aws.utilityBucketName'),
    });

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

    const previousProgress = await this.userCourseProgressRepository
      .createQueryBuilder('userCourseProgress')
      .leftJoinAndMapOne(
        'userCourseProgress.courseVideo',
        CourseVideo,
        'courseVideo',
        'userCourseProgress.courseVideoId = courseVideo.id',
      )
      .where('userId = :userId', { userId })
      .andWhere((sq) =>
        sq
          .where('userCourseProgress.courseVideoId = :videoId', {
            videoId: body.videoId,
          })
          .orWhere('userCourseProgress.courseId = :courseId', {
            courseId: video.course.id,
          }),
      )
      .getOne();

    if (!isEdit && previousProgress) {
      return {
        success: false,
        errors: {
          videoId: 'duplicated',
        },
      };
    }

    // check if user wants to rewind his progress. If so, omit updating
    if (isEdit) {
      if (
        previousProgress.courseVideo.id === video.id &&
        previousProgress.watchTime >= body.watchTime
      ) {
        return {
          success: true,
          result: {
            ...previousProgress,
            courseVideo: undefined,
          },
        };
      }

      if (
        previousProgress.courseVideo.id !== video.id &&
        previousProgress.courseVideo.createdAt.getTime() >=
          video.createdAt.getTime()
      ) {
        return {
          success: true,
          result: {
            ...previousProgress,
            courseVideo: undefined,
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
    };

    if (!withEnded) {
      whereConstraints.hasEnded = false;
    }

    const data = await this.userCourseProgressRepository.find({
      where: whereConstraints,
      order: {
        createdAt: 'DESC',
      },
      relations: {
        course: {
          creator: true,
          type: {
            mainType: true,
          },
        },
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

    data.forEach((item) => {
      item.courseVideo.thumbnailLink = this.s3Client.getSignedUrl('getObject', {
        Key: item.courseVideo.thumbnailLink,
        Bucket: this.configService.get('aws.utilityBucketName'),
      });

      item.course.creator.avatar = this.s3Client.getSignedUrl('getObject', {
        Key: item.course.creator.avatar,
        Bucket: this.configService.get('aws.utilityBucketName'),
      });
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

  async getOneUserCourseProgress(
    userId: string,
    courseId: string,
  ): Promise<UserCourseProgress> {
    const progress = await this.userCourseProgressRepository.findOne({
      where: {
        user: {
          id: userId,
        },
        course: {
          id: courseId,
        },
      },
      relations: {
        course: true,
        courseVideo: true,
      },
    });

    progress.courseVideo.thumbnailLink = this.s3Client.getSignedUrl(
      'getObject',
      {
        Key: progress.courseVideo.thumbnailLink,
        Bucket: this.configService.get('aws.utilityBucketName'),
      },
    );

    return progress;
  }

  private async getCourseAdditionalData(courseId: string) {
    const firstVideo = await this.courseVideoRepository.findOne({
      where: { course: { id: courseId } },
      order: {
        createdAt: 'ASC',
      },
    });

    if (firstVideo) {
      firstVideo.thumbnailLink = this.s3Client.getSignedUrl('getObject', {
        Key: firstVideo.thumbnailLink,
        Bucket: this.configService.get('aws.utilityBucketName'),
      });
    }

    const totalVideos = await this.courseVideoRepository
      .createQueryBuilder('courseVideo')
      .select('courseVideo.courseId')
      .where('courseVideo.courseId = :id', { id: courseId })
      .groupBy('courseVideo.courseId')
      .getCount();

    return {
      firstVideo,
      totalVideos,
    };
  }

  async getRecommended(
    userId: string,
    page: number,
    perPage: number,
  ): Promise<PaginatedQueryResult<CourseResult>> {
    const userCourses = await this.userCourseProgressRepository.find({
      where: { user: { id: userId } },
      relations: ['course', 'course.type', 'course.creator'],
    });

    const categories = userCourses.map((uc) => uc.course.type.id);
    const creators = userCourses.map((uc) => uc.course.creator.id);

    const subQuery = this.userCourseProgressRepository
      .createQueryBuilder('user_course')
      .select('user_course.courseId')
      .where('user_course.userId = :userId', { userId });

    const recommendedCourses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.type', 'type')
      .leftJoinAndSelect('course.creator', 'creator')
      .addSelect((qb) => {
        return qb
          .select('COUNT(course_students_user.courseId)', 'popularity')
          .from('course_students_user', 'course_students_user')
          .where('course_students_user.courseId = course.id');
      }, 'popularity')
      .where(`course.id NOT IN (${subQuery.getQuery()})`)
      .andWhere(
        new Brackets((qb) => {
          qb.where('course.typeId IN (:...categories)', {
            categories,
          }).orWhere('course.creatorId IN (:...creators)', { creators });
        }),
      )
      .setParameters(subQuery.getParameters())
      .orderBy('popularity', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage)
      .getRawAndEntities();

    const scoredCourses = recommendedCourses.entities.map((course, index) => {
      let score = 0;

      if (categories.includes(course.type.id)) {
        score += 0.5;
      }

      if (creators.includes(course.creator.id)) {
        score += 0.3;
      }

      const popularityCount =
        parseInt(recommendedCourses.raw[index].popularity, 10) || 0;
      score += (popularityCount / 100) * 0.2;

      return { course, score };
    });

    scoredCourses.sort((a, b) => b.score - a.score);
    const data = scoredCourses.map((sc) => sc.course);

    const additionalData = await Promise.all(
      data.map(async (course) => {
        const additionalCourseData = await this.getCourseAdditionalData(
          course.id,
        );
        if (course.creator.avatar) {
          course.creator.avatar = this.s3Client.getSignedUrl('getObject', {
            Key: course.creator.avatar,
            Bucket: this.configService.get('aws.utilityBucketName'),
          });
        }

        return {
          course,
          ...additionalCourseData,
        };
      }),
    );

    const total = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.type', 'type')
      .leftJoinAndSelect('course.creator', 'creator')
      .where(`course.id NOT IN (${subQuery.getQuery()})`)
      .andWhere(
        new Brackets((qb) => {
          qb.where('course.typeId IN (:...categories)', {
            categories,
          }).orWhere('course.creatorId IN (:...creators)', { creators });
        }),
      )
      .setParameters(subQuery.getParameters())
      .getCount();

    return {
      data: additionalData,
      paginatorInfo: {
        count: additionalData.length,
        page,
        perPage,
        total,
      },
    };
  }
}
