import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Course } from 'src/modules/course/course.entity';
import { User } from 'src/modules/user/user.entity';
import { UserCourseProgress } from '../statistics/statistics.entity';

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

  @Column('int')
  duration: number;

  @Column('int')
  views: number;

  @OneToMany(() => VideoComments, (videoComments) => videoComments.video, {
    cascade: true,
  })
  videoComments: VideoComments[];

  @OneToMany(() => VideoRatings, (videoRatings) => videoRatings.video, {
    cascade: true,
  })
  ratings: VideoRatings[];

  @ManyToOne(() => Course, (course) => course.courseVideos)
  course: Course;

  @ManyToOne(() => UserCourseProgress, (userCourseProgress) => userCourseProgress.courseVideo)
  userCourseProgress: UserCourseProgress[];

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date;
}

@Entity()
export class VideoComments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 1000 })
  text: string;

  @ManyToOne(() => CourseVideo, (courseVideo) => courseVideo.videoComments, {
    onDelete: 'CASCADE',
  })
  video: CourseVideo;

  @ManyToOne(() => User, (user) => user.comments, {
    onDelete: 'CASCADE',
  })
  author: User;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date;
}

@Entity()
export class VideoRatings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('tinyint')
  rating: number;

  @ManyToOne(() => CourseVideo, (courseVideo) => courseVideo.ratings, {
    onDelete: 'CASCADE',
  })
  video: CourseVideo;

  @ManyToOne(() => User, (user) => user.ratings, {
    onDelete: 'CASCADE',
  })
  author: User;
}
