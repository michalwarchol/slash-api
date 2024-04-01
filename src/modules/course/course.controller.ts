import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';

import {
  CreateCourseInput,
  CourseResponse,
  UpdateCourseInput,
  FullCourseResponse,
  CourseTypesResponse,
  CourseUserStatistics,
  LikeCourseInput,
} from './course.dto';
import { CoursesService } from './course.service';
import { Roles } from 'src/guards/roles.decorator';
import { UserType } from 'src/types/users';
import { RolesGuard } from 'src/guards/rolesGuard';
import { AuthGuard } from 'src/guards/authGuard';
import { Course } from './course.entity';

@Controller('courses')
export class CourseController {
  constructor(private coursesService: CoursesService) {}

  @Get('types')
  courseTypes(@Request() req): Promise<CourseTypesResponse> {
    return this.coursesService.getCourseTypes(req.headers.lang || 'en');
  }

  @Get('search')
  searchCourses(
    @Request() req,
    @Query('search') searchString: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<PaginatedQueryResult<Course>> {
    return this.coursesService.search(
      searchString,
      req.headers.lang || 'en',
      parseInt(page),
      parseInt(perPage),
    );
  }

  @UseGuards(AuthGuard)
  @Get('user_statistics/:id')
  getCourseUserStatistics(
    @Request() req,
    @Param('id') id: string,
  ): Promise<CourseUserStatistics> {
    return this.coursesService.getCourseUserStatistics(id, req.user.id);
  }

  @Get('course/:id')
  getFullCourse(@Param('id') id: string): Promise<FullCourseResponse> {
    return this.coursesService.getFullCourse(id);
  }

  @UseGuards(AuthGuard)
  @Post('create')
  @UseGuards(RolesGuard)
  @Roles(UserType.EDUCATOR)
  createCourse(
    @Request() req,
    @Body() body: CreateCourseInput,
  ): Promise<TMutationResult<CourseResponse>> {
    return this.coursesService.createCourse(req.user.id, body);
  }

  @UseGuards(AuthGuard)
  @Put('edit')
  @UseGuards(RolesGuard)
  @Roles(UserType.EDUCATOR)
  updateCourse(
    @Request() req,
    @Body() body: UpdateCourseInput,
  ): Promise<TMutationResult<CourseResponse>> {
    return this.coursesService.updateCourse(req.user.id, body);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserType.EDUCATOR)
  deleteCourse(
    @Request() req,
    @Param('id') id: string,
  ): Promise<TMutationResult<boolean>> {
    return this.coursesService.deleteCourse(req.user.id, id);
  }

  @UseGuards(AuthGuard)
  @Post('like')
  like(
    @Request() req,
    @Body() body: LikeCourseInput,
  ): Promise<TMutationResult<boolean>> {
    return this.coursesService.likeOrDislikeCourse(body.id, req.user.id, body.isLike);
  }
}
