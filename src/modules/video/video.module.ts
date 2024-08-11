import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Course } from 'src/modules/course/course.entity';

import { CourseVideo, VideoRatings, VideoComments } from './video.entity';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseVideo, VideoRatings, VideoComments])],
  controllers: [VideoController],
  providers: [VideoService, JwtService],
})
export class VideoModule {}
