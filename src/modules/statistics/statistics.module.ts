import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

import { Course } from 'src/modules/course/course.entity';
import { CourseVideo } from 'src/modules/video/video.entity';

import { UserCourseProgress } from './statistics.entity';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourseProgress, Course, CourseVideo])],
  controllers: [StatisticsController],
  providers: [StatisticsService, JwtService],
})
export class StatisticsModule {}
