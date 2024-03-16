import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../user/user.entity";

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

  @Column('mediumtext')
  description: string;

  @ManyToOne(() => User, (user) => user.courses)
  creator: string;

  @ManyToOne(() => CourseSubType, (courseSubType) => courseSubType.courses)
  type: string;

  @OneToMany(() => CourseVideo, (courseVideo) => courseVideo.course)
  courseVideos: CourseVideo[];

  @OneToMany(() => CourseMaterials, (courseMaterials) => courseMaterials.course)
  courseMaterials: CourseMaterials[];

  @ManyToMany(() => User, (user) => user.likedCourses)
  @JoinTable()
  students: User[];
}

@Entity()
export class CourseStatistics {
  @PrimaryGeneratedColumn()
  id: string;

  @Column('int')
  views: number;
}


@Entity()
export class CourseVideo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 250 })
  name: string;

  @Column('mediumtext')
  description: string;

  @Column('varchar')
  link: string;

  @Column('varchar')
  thumbnailLink: string;

  @OneToOne(() => CourseStatistics)
  @JoinColumn()
  statistics: CourseStatistics;

  @ManyToOne(() => Course, (course) => course.courseVideos)
  course: Course;
};


@Entity()
export class CourseMaterials {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 250 })
  name: string;

  @Column('varchar')
  link: string;

  @ManyToOne(() => Course, (course) => course.courseMaterials)
  course: Course;
};
