import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { VideoService } from './video.service';
import { AuthGuard } from 'src/guards/authGuard';
import { RolesGuard } from 'src/guards/rolesGuard';
import { UserType } from 'src/types/users';
import { Roles } from 'src/guards/roles.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';
import {
  CourseVideoCommentInput,
  CourseVideoCommentResponse,
  CourseVideoFullResponse,
  CourseVideoInput,
  CourseVideoRateInput,
  CourseVideoRateResponse,
  CourseVideoResponse,
} from './video.dto';

@Controller('video')
export class VideoController {
  constructor(private videoService: VideoService) {}

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.EDUCATOR)
  @Post(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      {
        name: 'thumbnail',
        maxCount: 1,
      },
      {
        name: 'video',
        maxCount: 1,
      },
    ]),
  )
  uploadVideo(
    @Request() req,
    @Param('id') id: string,
    @UploadedFiles()
    files: { thumbnail: Express.Multer.File[]; video: Express.Multer.File[] },
    @Body() body: CourseVideoInput,
  ): Promise<TMutationResult<CourseVideoResponse>> {
    if (!files) {
      return Promise.resolve({
        success: false,
        result: null,
        errors: {
          thumbnail: 'required',
          video: 'required',
        },
      });
    }

    if (!files.thumbnail[0].mimetype.startsWith('image/')) {
      return Promise.resolve({
        success: false,
        result: null,
        errors: {
          thumbnail: 'required',
        },
      });
    }

    if (!files.video[0].mimetype.startsWith('video/')) {
      return Promise.resolve({
        success: false,
        result: null,
        errors: {
          video: 'required',
        },
      });
    }

    return this.videoService.uploadCourseVideo(
      req.user.id,
      id,
      [files.thumbnail[0], files.video[0]],
      body,
    );
  }

  @Get(':id')
  getVideo(@Param('id') id: string): Promise<CourseVideoFullResponse> {
    return this.videoService.getFullVideo(id);
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  @Get(':id/rating')
  getMyVideoRating(
    @Request() req,
    @Param('id') id: string,
  ): Promise<CourseVideoRateResponse> {
    return this.videoService.getVideoRating(id, req.user.id);
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  @Post(':id/comments')
  addComment(
    @Request() req,
    @Param('id') id: string,
    @Body() body: CourseVideoCommentInput,
  ): Promise<CourseVideoCommentResponse> {
    return this.videoService.addEditComment(id, req.user.id, body.text);
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  @Put(':id/comments')
  editComment(
    @Request() req,
    @Param('id') id: string,
    @Body() body: CourseVideoCommentInput,
  ): Promise<CourseVideoCommentResponse> {
    return this.videoService.addEditComment(
      id,
      req.user.id,
      body.text,
      body.id,
    );
  }

  @Get(':id/comments')
  getComments(
    @Param('id') id: string,
    @Query('orderBy') orderBy: string,
    @Query('order') order: 'ASC' | 'DESC',
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ): Promise<PaginatedQueryResult<CourseVideoCommentResponse>> {
    return this.videoService.getVideoComments(
      id,
      parseInt(page),
      parseInt(perPage),
      orderBy,
      order,
    );
  }

  @Put(':id/views')
  incrementViews(@Param('id') id: string): Promise<TMutationResult<boolean>> {
    return this.videoService.increaseViews(id);
  }

  @UseGuards(AuthGuard)
  @UseGuards(RolesGuard)
  @Roles(UserType.STUDENT)
  @Post(':id/rate')
  addRate(
    @Request() req,
    @Param('id') id: string,
    @Body() body: CourseVideoRateInput,
  ): Promise<TMutationResult<CourseVideoRateResponse>> {
    return this.videoService.addEditRate(req.user.id, id, body);
  }
}
