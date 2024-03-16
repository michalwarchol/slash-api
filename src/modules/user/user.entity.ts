import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany } from 'typeorm';
import { UserType } from 'src/types/users';
import { Course } from '../course/course.entity';

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

  @Column()
  password: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({
    type: "enum",
    enum: UserType,
  })
  type: UserType;

  @OneToMany(() => Course, (course) => course.creator)
  courses: Course[];

  @ManyToMany(() => Course, (course) => course.students)
  likedCourses: Course[];
}
