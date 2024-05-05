import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { UserType } from 'src/types/users';
import { Course } from '../course/course.entity';
import { VideoComments, VideoRatings } from '../video/video.entity'

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: 'enum',
    enum: UserType,
  })
  type: UserType;

  @OneToMany(() => Course, (course) => course.creator)
  courses: Course[];

  @ManyToMany(() => Course, (course) => course.students)
  likedCourses: Course[];

  @OneToMany(() => VideoComments, (videoComments) => videoComments.author)
  comments: VideoComments[];

  @OneToMany(() => VideoRatings, (videoRatings) => videoRatings.author)
  ratings: VideoRatings[];
}
