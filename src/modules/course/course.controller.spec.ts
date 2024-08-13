import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { CourseController } from './course.controller';
import { CoursesService } from './course.service';
import {
  CourseMaterial,
  CourseResult,
  CourseTypesResponse,
  UserCourseWithStats,
} from './course.dto';
import { PaginatedQueryResult, TMutationResult } from 'src/types/responses';
import { AuthGuard } from 'src/guards/authGuard';
import { ConfigService } from '@nestjs/config';

import courseResultMock from './mocks/courseResult.mock';
import courseTypesMock from './mocks/courseType.mock';
import userCourseWithStatsMock from './mocks/userCourseWithStats.mock';
import courseMaterialMock from './mocks/courseMaterial.mock';

describe('CourseController', () => {
  let controller: CourseController;
  let service: CoursesService;
  let authGuard: AuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseController],
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '60s' },
        }),
      ],
      providers: [
        {
          provide: CoursesService,
          useValue: {
            getCourseTypes: jest.fn(),
            search: jest.fn(),
            getUserCourses: jest.fn(),
            createCourse: jest.fn(),
            updateCourse: jest.fn(),
            deleteCourse: jest.fn(),
            uploadCourseMaterial: jest.fn(),
            getMaterialFile: jest.fn(),
            deleteMaterialFile: jest.fn(),
            getBestCoursesByCategoryName: jest.fn(),
            // Dodaj tutaj inne metody, które są wywoływane w kontrolerze
          },
        },
        AuthGuard,
        ConfigService,
      ],
    }).compile();

    controller = module.get<CourseController>(CourseController);
    service = module.get<CoursesService>(CoursesService);
    authGuard = module.get<AuthGuard>(AuthGuard);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('courseTypes', () => {
    it('should return course types', async () => {
      const result: CourseTypesResponse = courseTypesMock;
      jest.spyOn(service, 'getCourseTypes').mockResolvedValue(result);

      expect(await controller.courseTypes({ headers: { lang: 'en' } })).toBe(
        result,
      );
    });
  });

  describe('searchCourses', () => {
    it('should return search results', async () => {
      const result: PaginatedQueryResult<CourseResult> = {
        paginatorInfo: {
          total: 100,
          count: 10,
          page: 1,
          perPage: 10,
        },
        data: [courseResultMock],
      };
      jest.spyOn(service, 'search').mockResolvedValue(result);

      expect(
        await controller.searchCourses(
          { headers: { lang: 'en' } },
          'search',
          'type',
        ),
      ).toBe(result);
    });
  });

  describe('creatorList', () => {
    it('should return user courses', async () => {
      const result: PaginatedQueryResult<UserCourseWithStats> = {
        paginatorInfo: {
          total: 50,
          count: 5,
          page: 1,
          perPage: 5,
        },
        data: [userCourseWithStatsMock],
      };
      jest.spyOn(service, 'getUserCourses').mockResolvedValue(result);

      expect(await controller.creatorList('id', 'orderBy', 'ASC')).toBe(result);
    });
  });

  describe('uploadMaterial', () => {
    it('should upload course material and return result', async () => {
      const result: TMutationResult<CourseMaterial> = {
        success: true,
        result: courseMaterialMock,
      };
      const mockFile = { originalname: 'file.pdf' } as Express.Multer.File;
      jest.spyOn(service, 'uploadCourseMaterial').mockResolvedValue(result);

      expect(
        await controller.uploadMaterial(
          { user: { id: 'user-id' } },
          'course-id',
          mockFile,
        ),
      ).toBe(result);
    });

    it('should return an error if file is not provided', async () => {
      expect(
        await controller.uploadMaterial(
          { user: { id: 'user-id' } },
          'course-id',
          null,
        ),
      ).toEqual({ success: false, result: null });
    });
  });

  describe('getMaterialFile', () => {
    it('should return file stream', async () => {
      const mockStream = { pipe: jest.fn() } as any;
      jest.spyOn(service, 'getMaterialFile').mockResolvedValue(mockStream);
      const mockResponse = { setHeader: jest.fn(), pipe: jest.fn() } as any;

      await controller.getMaterialFile('file-key', mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
      expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('deleteMaterialFile', () => {
    it('should delete material file and return true', async () => {
      const result: TMutationResult<boolean> = {
        success: true,
        result: true,
      };
      jest.spyOn(service, 'deleteMaterialFile').mockResolvedValue(result);

      expect(
        await controller.deleteMaterialFile(
          { user: { id: 'user-id' } },
          'file-id',
        ),
      ).toBe(result);
    });
  });

  describe('getBestCoursesByCategoryName', () => {
    it('should return best courses by category name', async () => {
      const result: PaginatedQueryResult<CourseResult> = {
        paginatorInfo: {
          total: 100,
          count: 10,
          page: 1,
          perPage: 10,
        },
        data: [courseResultMock],
      };
      jest
        .spyOn(service, 'getBestCoursesByCategoryName')
        .mockResolvedValue(result);

      expect(
        await controller.getBestCoursesByCategoryName('name', '1', '10'),
      ).toBe(result);
    });
  });

  // Dodaj testy dla innych metod kontrolera, takich jak getBestCoursesByCategoryName itp.
});
