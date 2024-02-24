import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { UserType } from 'src/types/users';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class CourseProgress {
  @Prop({ required: true, type: Types.ObjectId })
  course_id: string;

  @Prop()
  progress: number;
}

@Schema()
export class User {
  @Prop({ required: true, type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ required: true })
  first_name: string;

  @Prop({ required: true })
  last_name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, type: [String] })
  permissions: string[];

  @Prop()
  avatar: string;

  @Prop({ required: true })
  type: UserType;

  @Prop({ type: Date })
  last_billing_date: Date;

  @Prop({ type: Date })
  next_billing_date: Date;

  @Prop({ type: [Types.ObjectId] })
  saved_courses: string[];

  @Prop({ type: [CourseProgress] })
  courses_in_progress: CourseProgress[];

  @Prop({ type: [Types.ObjectId] })
  courses: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
