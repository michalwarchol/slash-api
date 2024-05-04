import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { TMutationResult } from 'src/types/responses';
import {
  CourseVideoFullResponse,
  CourseVideoInput,
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
}
