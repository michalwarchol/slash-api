import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import { Readable } from 'stream';

import { TValidationOptions } from 'src/types/validators';
import RequiredValidator from 'src/validators/RequiredValidator';
import { validate } from 'src/validators';
import isEmpty from 'src/utils/isEmpty';
import { User } from 'src/modules/user/user.entity';
import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';
import withPercentage from 'src/utils/withPercentage';

import {
  CourseResponse,
  CreateCourseInput,
  FullCourseResponse,
  UpdateCourseInput,
  CourseTypesResponse,
  CourseUserStatistics,
  UserCourseWithStats,
  CourseMaterial,
} from './course.dto';
import {
  Course,
  CourseMaterials,
  CourseSubType,
  CourseType,
} from './course.entity';

@Injectable()
export class CoursesService {
  private readonly s3Client = new S3();

  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,

    @InjectRepository(CourseType)
    private courseTypeRepository: Repository<CourseType>,

    @InjectRepository(CourseMaterials)
    private courseMaterialsRepository: Repository<CourseMaterials>,

    private readonly configService: ConfigService,
  ) {
    this.s3Client.config.update({
      region: this.configService.get('aws.region'),
    });
  }

  async getCourseTypes(lang: string): Promise<CourseTypesResponse> {
    const langMap = {
      en: 'valueEn',
      pl: 'valuePl',
    };

    const types = await this.courseTypeRepository.find({
      relations: {
        subTypes: true,
      },
    });

    return types.map((type) => ({
      id: type.id,
      name: type.name,
      value: type[langMap[lang]],
      subTypes: type.subTypes.map((subType) => ({
        id: subType.id,
        name: subType.name,
        value: subType[langMap[lang]],
      })),
    }));
  }

  async createCourse(
    creatorId: string,
    input: CreateCourseInput,
  ): Promise<TMutationResult<CourseResponse>> {
    const validators: TValidationOptions = [
      {
        field: 'name',
        validators: [RequiredValidator],
      },
      {
        field: 'subTypeId',
        validators: [RequiredValidator],
      },
    ];

    const errors = validate(input, validators);
    if (!isEmpty(errors)) {
      return {
        success: false,
        errors,
      };
    }

    const newCourse = this.courseRepository.create({
      name: input.name,
      description: input.description,
      type: { id: input.subTypeId } as CourseSubType,
      creator: { id: creatorId } as User,
    });

    await this.courseRepository.save(newCourse);

    return {
      success: true,
      result: newCourse,
    };
  }

  async updateCourse(
    userId: string,
    input: UpdateCourseInput,
  ): Promise<TMutationResult<CourseResponse>> {
    const course = await this.courseRepository.findOne({
      where: { id: input.id },
      relations: {
        creator: true,
      },
      select: { creator: { id: true } },
    });

    if (!course) {
      return {
        success: false,
        result: null,
      };
    }

    if (course.creator.id !== userId) {
      throw new ForbiddenException();
    }

    const partialEntity = {
      name: input.name,
      description: input.description,
      type: { id: input.subTypeId },
    };

    await this.courseRepository.update({ id: input.id }, { ...partialEntity });

    const result = await this.courseRepository.findOne({
      where: { id: input.id },
      relations: { creator: true, type: true },
    });

    return {
      success: true,
      result,
    };
  }

  async getFullCourse(id: string): Promise<FullCourseResponse> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: {
        courseMaterials: true,
        courseVideos: true,
        creator: true,
        type: {
          mainType: true,
        },
      },
    });

    if (!course) {
      throw new NotFoundException();
    }

    const likesCountQuery =
      'SELECT count(*) AS count FROM course_students_user WHERE courseId = ?';
    const likesCount = await this.courseRepository.query(likesCountQuery, [id]);

    return {
      ...course,
      likesCount: parseInt(likesCount[0].count),
    };
  }

  async search(
    searchString: string,
    lang: string,
    page?: number,
    perPage?: number,
  ): Promise<PaginatedQueryResult<Course>> {
    const langValue = lang === 'pl' ? 'valuePl' : 'valueEn';
    const realPage = page || 1;
    const realPerPage = perPage || 10;
    const realSearchString = withPercentage(searchString);

    const courses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect(CourseSubType, 'type', 'course.typeId = type.id')
      .where('course.name LIKE :search', { search: realSearchString })
      .orWhere(`type.${langValue} LIKE :search`, { search: realSearchString })
      .skip((realPage - 1) * realPerPage)
      .take(realPerPage)
      .getMany();

    const total = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect(CourseSubType, 'type', 'course.typeId = type.id')
      .where('course.name LIKE :search', { search: realSearchString })
      .orWhere(`type.${langValue} LIKE :search`, { search: realSearchString })
      .getCount();

    return {
      data: courses,
      paginatorInfo: {
        count: courses.length,
        page: realPage,
        perPage: realPerPage,
        total,
      },
    };
  }

  async getUserCourses(
    id: string,
    page: number = 1,
    perPage: number,
    orderBy?: string,
    order?: 'ASC' | 'DESC',
  ): Promise<PaginatedQueryResult<UserCourseWithStats>> {
    const realPage = page || 1;
    const realPerPage = perPage || 10;

    const query = `
      SELECT 
        subType.id as subType_id,
        subType.name as subType_name,
        subType.valuePl as subType_valuePl,
        subType.valueEn as subType_valueEn,
        type.id as type_id,
        type.name as name,
        type.valuePl as type_valuePl,
        type.valueEn as type_valueEn,
        course.id as id,
        course.name as name,
        COUNT(courseVideo.id) as numberOfVideos,
        COUNT(courseStudentsUser.userId) as numberOfLikes
      FROM course
      LEFT JOIN course_sub_type subType ON typeId = subType.id
      LEFT JOIN course_type type ON subType.mainTypeId = type.id
      LEFT JOIN course_video courseVideo ON course.id = courseVideo.courseId
      LEFT JOIN course_students_user courseStudentsUser ON course.id = courseStudentsUser.courseId
      WHERE course.creatorId = '${id}'
      GROUP BY 
        subType.id,
        subType.name,
        subType.valuePl,
        subType.valueEn,
        type.id,
        type.name,
        type.valuePl,
        type.valueEn,
        course.id,
        course.name
      ORDER BY ${orderBy} ${order} LIMIT ${realPerPage} OFFSET ${(realPage - 1) * realPerPage};
    `;

    const courses = await this.courseRepository.query(query);
    const couresParsed = courses.map((course) => ({
      id: course.id,
      name: course.name,
      type: {
        id: course.subType_id,
        name: course.subType_name,
        valuePl: course.subType_valuePl,
        valueEn: course.subType_valueEn,
        mainType: {
          id: course.type_id,
          name: course.type_name,
          valuePl: course.type_valuePl,
          valueEn: course.type_valueEn,
        },
      },
      numberOfVideos: course.numberOfVideos,
      numberOfLikes: course.numberOfLikes,
    }));

    const total = await this.courseRepository
      .createQueryBuilder('course')
      .where('course.creatorId = :id', { id })
      .getCount();

    return {
      data: couresParsed,
      paginatorInfo: {
        count: courses.length,
        page: realPage,
        perPage: realPerPage,
        total,
      },
    };
  }

  async deleteCourse(
    userId: string,
    id: string,
  ): Promise<TMutationResult<boolean>> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: {
        creator: true,
        courseMaterials: true,
      },
      select: { creator: { id: true } },
    });

    if (!course) {
      return {
        success: false,
        result: null,
      };
    }

    if (course.creator.id !== userId) {
      throw new ForbiddenException();
    }

    await Promise.all(
      course.courseMaterials.map((material) =>
        this.s3Client
          .deleteObject({
            Bucket: this.configService.get('aws.utilityBucketName'),
            Key: material.link,
          })
          .promise(),
      ),
    );

    const result = await this.courseRepository.delete({ id });

    return {
      success: true,
      result: result.affected === 1,
    };
  }

  async getCourseUserStatistics(
    courseId: string,
    userId: string,
  ): Promise<CourseUserStatistics> {
    const query = `SELECT * FROM course_students_user WHERE courseId = ? AND userId = ? LIMIT 1`;
    const result = await this.courseRepository.query(query, [courseId, userId]);

    return {
      isLiked: result.length > 0,
    };
  }

  async likeOrDislikeCourse(
    courseId: string,
    userId: string,
    isLike: boolean,
  ): Promise<TMutationResult<boolean>> {
    let query = '';
    if (isLike) {
      query =
        'INSERT INTO course_students_user (courseId, userId) VALUES (?, ?)';
    } else {
      query =
        'DELETE FROM course_students_user WHERE courseId = ? AND userId = ?';
    }

    try {
      const result = await this.courseRepository.query(query, [
        courseId,
        userId,
      ]);

      return {
        success: true,
        result: result.affectedRows === 1,
      };
    } catch (error) {
      return {
        success: false,
        result: false,
      };
    }
  }

  async uploadCourseMaterial(
    userId: string,
    courseId: string,
    file: Express.Multer.File,
  ): Promise<TMutationResult<CourseMaterial>> {
    const courseData = await this.courseRepository.query(
      'SELECT creatorId FROM course WHERE id = ? LIMIT 1',
      [courseId],
    );

    if (courseData.length === 0 || userId !== courseData[0].creatorId) {
      throw new ForbiddenException();
    }

    const fileKey = uuid();

    const courseMaterial = this.courseMaterialsRepository.create({
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
      link: fileKey,
      course: { id: courseId },
    });

    await this.courseMaterialsRepository.save(courseMaterial);

    await this.s3Client
      .upload({
        Key: fileKey,
        Bucket: this.configService.get('aws.utilityBucketName'),
        Body: file.buffer,
      })
      .promise();

    return {
      success: true,
      result: courseMaterial,
    };
  }

  async getMaterialFile(key: string): Promise<Readable> {
    try {
      await this.s3Client
        .headObject({
          Bucket: this.configService.get('aws.utilityBucketName'),
          Key: key,
        })
        .promise();
    } catch (error) {
      if (error.name === 'NotFound') {
        throw new NotFoundException();
      }
      throw new BadRequestException();
    }

    return this.s3Client
      .getObject(
        {
          Bucket: this.configService.get('aws.utilityBucketName'),
          Key: key,
        },
      )
      .createReadStream();
  }

  async deleteMaterialFile(
    userId: string,
    id: string,
  ): Promise<TMutationResult<boolean>> {
    const materialData = await this.courseMaterialsRepository.query(
      'SELECT link, courseId FROM course_materials WHERE id = ? LIMIT 1',
      [id],
    );
    if (materialData.length === 0) {
      throw new NotFoundException();
    }
    const courseId = materialData[0].courseId;
    const courseData = await this.courseRepository.query(
      'SELECT creatorId from course WHERE id = ? LIMIT 1',
      [courseId],
    );

    if (courseData.length === 0) {
      throw new NotFoundException();
    }

    if (courseData[0].creatorId !== userId) {
      throw new ForbiddenException();
    }

    const key = materialData[0].link;
    try {
      await this.s3Client
        .deleteObject({
          Bucket: this.configService.get('aws.utilityBucketName'),
          Key: key,
        })
        .promise();
    } catch (error) {
      if (error.name === 'NotFound') {
        throw new NotFoundException();
      }
      throw new BadRequestException();
    }

    const result = await this.courseMaterialsRepository.delete({ id });

    return {
      success: true,
      result: result.affected > 0,
    };
  }
}
