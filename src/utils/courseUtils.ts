export const mapRawCourseResponse = (data: any) => ({
  id: data.course_id,
  name: data.course_name,
  description: data.course_description,
  creator: {
    id: data.creator_id,
    firstName: data.creator_firstName,
    lastName: data.creator_lastName,
    email: data.creator_email,
    isVerified: data.creator_isVerified,
    avatar: data.creator_avatar,
    type: data.creator_type,
  },
  type: {
    id: data.course_sub_type_id,
    name: data.course_sub_type_name,
    valuePl: data.course_sub_type_valuePl,
    valueEn: data.course_sub_type_valueEn,
  },
  count: data.count,
});
