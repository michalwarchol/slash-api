import { UserCourseWithStats } from '../course.dto';

const userCourseWithStats: UserCourseWithStats = {
  id: '3',
  name: 'course mock name',
  description: 'course mock description',
  numberOfLikes: 3,
  numberOfVideos: 12,
  type: {
    id: '6',
    name: 'FRONTEND',
    valueEn: 'Frontend',
    valuePl: 'Frontend',
    mainType: {
      id: '1',
      name: 'IT',
      valueEn: 'IT',
      valuePl: 'IT',
      subTypes: null,
    },
    courses: null,
  },
};

export default userCourseWithStats;
