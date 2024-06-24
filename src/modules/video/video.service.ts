import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';

import { CourseVideo, VideoComments, VideoRatings } from './video.entity';
import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';
import {
  CourseVideoCommentResponse,
  CourseVideoFullResponse,
  CourseVideoInput,
  CourseVideoRateInput,
  CourseVideoRateResponse,
  CourseVideoResponse,
} from './video.dto';
import bufferToReadable from 'src/utils/bufferToReadable';
import getVideoDurationInSeconds from 'get-video-duration';
import { Course } from '../course/course.entity';

@Injectable()
export class VideoService {
  private readonly s3Client = new S3();

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,

    @InjectRepository(CourseVideo)
    private courseVideoRepository: Repository<CourseVideo>,

    @InjectRepository(VideoRatings)
    private videoRatingsRepository: Repository<VideoRatings>,

    @InjectRepository(VideoComments)
    private videoCommentsRepository: Repository<VideoComments>,

    private readonly configService: ConfigService,
  ) {
    this.s3Client.config.update({
      region: this.configService.get('aws.region'),
    });
  }

  async uploadCourseVideo(
    userId: string,
    courseId: string,
    files: Array<Express.Multer.File>,
    body: CourseVideoInput,
  ): Promise<TMutationResult<CourseVideoResponse>> {
    const courseData = await this.courseRepository.query(
      'SELECT id, creatorId FROM course WHERE id = ? LIMIT 1',
      [courseId],
    );

    if (courseData.length === 0 || userId !== courseData[0].creatorId) {
      throw new ForbiddenException();
    }

    const thumbnailKey = uuid();
    const thumbnail = files[0];

    await this.s3Client
      .upload({
        Key: thumbnailKey,
        Bucket: this.configService.get('aws.utilityBucketName'),
        Body: thumbnail.buffer,
      })
      .promise();

    const videoKey = uuid();
    const video = files[1];

    await this.s3Client
      .upload({
        Key: videoKey,
        Bucket: this.configService.get('aws.videoBucketName'),
        Body: video.buffer,
      })
      .promise();

    const videoDuration = await getVideoDurationInSeconds(
      bufferToReadable(video.buffer),
    );

    const newVideo = this.courseVideoRepository.create({
      ...body,
      course: { id: courseData[0].id } as Course,
      duration: videoDuration,
      link: videoKey,
      thumbnailLink: thumbnailKey,
      views: 0,
    });

    await this.courseVideoRepository.save(newVideo);

    return {
      success: true,
      result: newVideo,
    };
  }

  async editCourseVideo(
    userId: string,
    videoId: string,
    body: CourseVideoInput,
  ): Promise<TMutationResult<CourseVideoResponse>> {
    const video = await this.courseVideoRepository.findOne({
      where: { id: videoId },
      relations: {
        course: {
          creator: true,
        },
      },
    });

    if (!video) {
      throw new NotFoundException();
    }

    if (video.course.creator.id !== userId) {
      throw new ForbiddenException();
    }

    const result = await this.courseVideoRepository.update(
      { id: videoId },
      body,
    );
    if (result.affected === 1) {
      video.name = body.name;
      video.description = body.description;
    }

    return {
      success: result.affected === 1,
      result: video,
    };
  }

  async deleteVideo(
    userId: string,
    videoId: string,
  ): Promise<TMutationResult<boolean>> {
    const video = await this.courseVideoRepository.findOne({
      where: { id: videoId },
      relations: {
        course: {
          creator: true,
        },
      },
    });

    if (!video) {
      throw new NotFoundException();
    }

    if (video.course.creator.id !== userId) {
      throw new ForbiddenException();
    }

    await this.s3Client
      .deleteObject({
        Key: video.link,
        Bucket: this.configService.get('aws.videoBucketName'),
      })
      .promise();

    await this.s3Client
      .deleteObject({
        Key: video.thumbnailLink,
        Bucket: this.configService.get('aws.utilityBucketName'),
      })
      .promise();

    const result = await this.courseVideoRepository.delete({ id: videoId });

    return {
      success: true,
      result: result.affected === 1,
    };
  }

  async getFullVideo(id: string): Promise<CourseVideoFullResponse> {
    const video = await this.courseVideoRepository.findOne({
      where: { id },
      relations: {
        course: {
          creator: true,
          type: {
            mainType: true,
          },
        },
      },
    });

    video.link = this.s3Client.getSignedUrl('getObject', {
      Key: video.link,
      Bucket: this.configService.get('aws.videoBucketName'),
    });

    video.thumbnailLink = this.s3Client.getSignedUrl('getObject', {
      Key: video.thumbnailLink,
      Bucket: this.configService.get('aws.utilityBucketName'),
    });

    if (video.course.creator.avatar) {
      video.course.creator.avatar = this.s3Client.getSignedUrl('getObject', {
        Key: video.course.creator.avatar,
        Bucket: this.configService.get('aws.utilityBucketName'),
      });
    }

    const previousVideo = await this.courseVideoRepository.query(
      'SELECT id FROM course_video WHERE createdAt < ? ORDER BY createdAt DESC LIMIT 1;',
      [video.createdAt],
    );
    const nextVideo = await this.courseVideoRepository.query(
      'SELECT id FROM course_video WHERE createdAt > ? ORDER BY createdAt ASC LIMIT 1 OFFSET 1;',
      [video.createdAt],
    );

    const rating = await this.videoRatingsRepository.query(
      'SELECT AVG(rating) as rating FROM video_ratings WHERE videoId = ?;',
      [video.id],
    );

    return {
      ...video,
      previousVideoId: previousVideo[0] ? previousVideo[0].id : null,
      nextVideoId: nextVideo[0] ? nextVideo[0].id : null,
      rating: parseFloat(rating[0].rating) || 1,
    };
  }

  async getVideoRating(
    id: string,
    authorId: string,
  ): Promise<CourseVideoRateResponse> {
    const rating = await this.videoRatingsRepository.findOne({
      where: {
        video: {
          id,
        },
        author: {
          id: authorId,
        },
      },
    });

    if (!rating) {
      return {
        rating: null,
      };
    }
    return { rating };
  }

  async addEditComment(
    videoId: string,
    userId: string,
    text: string,
    commentId?: string,
  ): Promise<CourseVideoCommentResponse> {
    const comment = this.videoCommentsRepository.create({
      id: commentId,
      text,
      author: { id: userId },
      video: { id: videoId },
    });
    const { id } = await this.videoCommentsRepository.save(comment);

    return this.videoCommentsRepository.findOne({
      where: { id },
      relations: { author: true },
    });
  }

  async getVideoComments(
    id: string,
    page: number = 1,
    perPage: number,
    orderBy?: string,
    order?: 'ASC' | 'DESC',
  ): Promise<PaginatedQueryResult<CourseVideoCommentResponse>> {
    const realPage = page || 1;
    const realPerPage = perPage || 10;

    let comments = await this.videoCommentsRepository.find({
      where: {
        video: { id },
      },
      relations: {
        author: true,
      },
      order: {
        [orderBy]: order,
      },
      take: realPerPage,
      skip: (realPage - 1) * realPerPage,
    });

    const total = await this.videoCommentsRepository
      .createQueryBuilder('comments')
      .where('comments.videoId = :id', { id })
      .getCount();

    comments = comments.map((comment) => {
      const avatarLink =
        comment.author.avatar &&
        this.s3Client.getSignedUrl('getObject', {
          Key: comment.author.avatar,
          Bucket: this.configService.get('aws.utilityBucketName'),
        });

      return {
        ...comment,
        author: {
          ...comment.author,
          avatar: avatarLink,
        },
      };
    });

    return {
      data: comments,
      paginatorInfo: {
        count: comments.length,
        page: realPage,
        perPage: realPerPage,
        total,
      },
    };
  }

  async increaseViews(id: string): Promise<TMutationResult<boolean>> {
    await this.courseVideoRepository.manager.transaction(async () => {
      try {
        const { views } = await this.courseVideoRepository
          .createQueryBuilder('videos')
          .where('videos.id = :id', { id })
          .getOneOrFail();
        await this.courseVideoRepository.save({ id, views: views + 1 });
      } catch (e) {
        throw new NotFoundException(e);
      }
    });

    return {
      success: true,
      result: true,
    };
  }

  async addEditRate(
    authorId: string,
    videoId: string,
    input: CourseVideoRateInput,
  ): Promise<TMutationResult<CourseVideoRateResponse>> {
    const rate = this.videoRatingsRepository.create({
      ...input,
      video: {
        id: videoId,
      },
      author: {
        id: authorId,
      },
    });

    await this.videoRatingsRepository.save(rate);

    return {
      success: true,
      result: { rating: rate },
    };
  }
}
