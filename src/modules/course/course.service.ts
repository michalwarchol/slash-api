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
} from './course.dto';
import { Course, CourseSubType } from './course.entity';
import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';
import withPercentage from 'src/utils/withPercentage';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

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

    this.courseRepository.save(newCourse);

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
        type: true,
      },
    });

    if (!course) {
      throw new NotFoundException();
    }

    return course;
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
}
