import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Course } from '../course/course.entity';
import { CourseVideo } from '../video/video.entity';

@Entity()
export class UserCourseProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'boolean' })
  hasEnded: boolean;

  @Column({ type: 'smallint' })
  watchTime: number;

  @ManyToOne(() => User, (user) => user.userCourseProgress)
  user: User;

  @ManyToOne(() => Course, (course) => course.userCourseProgress)
  course: Course;

  @ManyToOne(() => CourseVideo, (courseVideo) => courseVideo.userCourseProgress)
  courseVideo: CourseVideo;
}
