import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course, CourseMaterials, CourseType } from './course.entity';
import { CourseController } from './course.controller';
import { CoursesService } from './course.service';
import { CourseVideo } from '../video/video.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Course, CourseType, CourseMaterials, CourseVideo])],
  controllers: [CourseController],
  providers: [CoursesService, JwtService],
})
export class CoursesModule {}
