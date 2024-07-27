import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from 'src/guards/authGuard';
import { Roles } from 'src/guards/roles.decorator';
import { RolesGuard } from 'src/guards/rolesGuard';
import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';
import { UserType } from 'src/types/users';

import { StatisticsService } from './statistics.service';
import {
  EducatorStats,
  ProgressAddInput,
  ProgressEditInput,
  ProgressResponse,
  StudentStats,
} from './statistics.dto';
import { CourseResult } from '../course/course.dto';

@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @UseGuards(AuthGuard)
  @Get('/')
  getStats(@Request() req): Promise<EducatorStats | StudentStats> {
    const userId = req.user.id;

    if (req.user.type === UserType.EDUCATOR) {
      return this.statisticsService.getEducatorStats(userId);
    } else {
      return this.statisticsService.getStudentStats(userId);
    }
  }

  @UseGuards(AuthGuard)
  @Post('/progress')
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  createProgress(
    @Request() req,
    @Body() body: ProgressAddInput,
  ): Promise<TMutationResult<ProgressResponse>> {
    return this.statisticsService.addEditProgress(req.user.id, body, false);
  }

  @UseGuards(AuthGuard)
  @Put('/progress')
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  editProgress(
    @Request() req,
    @Body() body: ProgressEditInput,
  ): Promise<TMutationResult<ProgressResponse>> {
    return this.statisticsService.addEditProgress(req.user.id, body, true);
  }

  @UseGuards(AuthGuard)
  @Get('/progress')
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  getUserCourseProgress(
    @Request() req,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('hasEnded') hasEnded?: boolean,
  ): Promise<PaginatedQueryResult<ProgressResponse>> {
    return this.statisticsService.getUserCourseProgress(
      req.user.id,
      parseInt(page),
      parseInt(perPage),
      hasEnded,
    );
  }

  @UseGuards(AuthGuard)
  @Get('/progress/:id')
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  getOneUserCourseProgress(
    @Request() req,
    @Param('id') id: string,
  ): Promise<ProgressResponse> {
    return this.statisticsService.getOneUserCourseProgress(req.user.id, id);
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  @Get('recommended')
  getRecommended(
    @Request() req,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<PaginatedQueryResult<CourseResult>> {
    return this.statisticsService.getRecommended(
      req.user.id,
      parseInt(page),
      parseInt(perPage),
    );
  }
}
