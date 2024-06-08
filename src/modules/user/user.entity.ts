import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  ManyToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserType } from 'src/types/users';
import { Course } from '../course/course.entity';
import { VideoComments, VideoRatings } from '../video/video.entity';

export interface IAuthCode {
  id: string;
  code: string;
  validUntil: Date;
}

export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  avatar: string;
  type: UserType;
}

@Entity()
export class AuthCode implements IAuthCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 6 })
  code: string;

  @Column('timestamp')
  validUntil: Date;

  @ManyToOne(() => User, (user) => user.authCode, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: IUser;
}

@Entity()
export class User implements IUser {
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

  @Column('boolean', { default: false })
  isVerified: boolean;

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

  @OneToMany(() => AuthCode, (authCode) => authCode.user)
  authCode: AuthCode[];
}
