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
  UploadedFile,
  UseInterceptors,
  Res,
  UploadedFiles,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { Response } from 'express';

import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';

import {
  CreateCourseInput,
  CourseResponse,
  UpdateCourseInput,
  FullCourseResponse,
  CourseTypesResponse,
  CourseUserStatistics,
  LikeCourseInput,
  UserCourseWithStats,
  CourseMaterial,
  CourseResult,
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
    @Query('typeName') typeName: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<PaginatedQueryResult<CourseResult>> {
    return this.coursesService.search(
      searchString,
      typeName,
      req.headers.lang || 'en',
      parseInt(page),
      parseInt(perPage),
    );
  }

  @Get('creator_list')
  creatorList(
    @Query('id') id: string,
    @Query('orderBy') orderBy: string,
    @Query('order') order: 'ASC' | 'DESC',
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<PaginatedQueryResult<UserCourseWithStats>> {
    return this.coursesService.getUserCourses(
      id,
      parseInt(page),
      parseInt(perPage),
      orderBy,
      order,
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
    return this.coursesService.likeOrDislikeCourse(
      body.id,
      req.user.id,
      body.isLike,
    );
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.EDUCATOR)
  @Post('materials/:id')
  @UseInterceptors(FileInterceptor('file'))
  uploadMaterial(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<TMutationResult<CourseMaterial>> {
    if (!file) {
      return Promise.resolve({ success: false, result: null });
    }

    return this.coursesService.uploadCourseMaterial(req.user.id, id, file);
  }

  @Get('materials/file/:key')
  async getMaterialFile(@Param('key') key: string, @Res() res: Response) {
    const fileStream = await this.coursesService.getMaterialFile(key);
    res.setHeader('Content-Type', 'application/octet-stream');
    fileStream.pipe(res);
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.EDUCATOR)
  @Delete('materials/file/:id')
  deleteMaterialFile(
    @Request() req,
    @Param('id') id: string,
  ): Promise<TMutationResult<boolean>> {
    return this.coursesService.deleteMaterialFile(req.user.id, id);
  }

  @Get('by-category-name')
  getBestCoursesByCategoryName(
    @Query('name') name: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<PaginatedQueryResult<CourseResult>> {
    return this.coursesService.getBestCoursesByCategoryName(
      name,
      parseInt(page),
      parseInt(perPage),
    );
  }
}
