import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';

import { CourseVideo, VideoRatings } from './video.entity';
import { TMutationResult } from 'src/types/responses';
import {
  CourseVideoFullResponse,
  CourseVideoInput,
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
      [video.course.id],
    );

    return {
      ...video,
      previousVideoId: previousVideo[0] ? previousVideo[0].id : null,
      nextVideoId: nextVideo[0] ? nextVideo[0].id : null,
      rating: rating[0].rating || 1,
    };
  }
}
