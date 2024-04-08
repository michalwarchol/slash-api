import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { TValidationOptions } from 'src/types/validators';
import RequiredValidator from 'src/validators/RequiredValidator';
import { validate } from 'src/validators';
import isEmpty from 'src/utils/isEmpty';
import { User } from 'src/modules/user/user.entity';

import {
  CourseResponse,
  CreateCourseInput,
  FullCourseResponse,
  UpdateCourseInput,
  CourseTypesResponse,
  CourseUserStatistics,
  UserCourseWithStats,
} from './course.dto';
import { Course, CourseSubType, CourseType } from './course.entity';
import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';
import withPercentage from 'src/utils/withPercentage';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,

    @InjectRepository(CourseType)
    private courseTypeRepository: Repository<CourseType>,
  ) {}

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
}
