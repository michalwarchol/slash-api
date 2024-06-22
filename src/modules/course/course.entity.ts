import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { CourseVideo } from '../video/video.entity';
import { UserCourseProgress } from '../statistics/statistics.entity';

@Entity()
export class CourseType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 20, unique: true })
  name: string;

  @Column('varchar', { length: 20 })
  valuePl: string;

  @Column('varchar', { length: 20 })
  valueEn: string;

  @OneToMany(() => CourseSubType, (courseSubType) => courseSubType.mainType)
  subTypes: CourseSubType[];
}

@Entity()
export class CourseSubType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 20, unique: true })
  name: string;

  @Column('varchar', { length: 20 })
  valuePl: string;

  @Column('varchar', { length: 20 })
  valueEn: string;

  @ManyToOne(() => CourseType, (courseType) => courseType.subTypes)
  mainType: CourseType;

  @OneToMany(() => Course, (courseType) => courseType.type)
  courses: Course[];
}

@Entity()
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 250 })
  name: string;

  @Column('mediumtext')
  description: string;

  @ManyToOne(() => User, (user) => user.courses)
  creator: User;

  @ManyToOne(() => CourseSubType, (courseSubType) => courseSubType.courses)
  type: CourseSubType;

  @OneToMany(() => CourseVideo, (courseVideo) => courseVideo.course)
  courseVideos: CourseVideo[];

  @OneToMany(() => CourseMaterials, (courseMaterials) => courseMaterials.course)
  courseMaterials: CourseMaterials[];

  @ManyToMany(() => User, (user) => user.likedCourses)
  @JoinTable()
  students: User[];

  @OneToMany(() => UserCourseProgress, (userCourseProgress) => userCourseProgress.course)
  userCourseProgress: UserCourseProgress[];
}

@Entity()
export class CourseMaterials {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 250 })
  name: string;

  @Column('varchar')
  link: string;

  @Column('varchar', { length: 50 })
  type: string;

  @Column('int')
  size: number;

  @ManyToOne(() => Course, (course) => course.courseMaterials, {
    onDelete: 'CASCADE',
  })
  course: Course;
}
