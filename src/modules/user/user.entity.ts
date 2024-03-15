import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { UserType } from 'src/types/users';

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

  @Column({ type: 'date', nullable: true })
  lastBillingDate: Date;

  @Column({ type: 'date', nullable: true })
  nextBillingDate: Date;
}
