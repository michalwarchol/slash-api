import { UserType } from 'src/types/users';

import { CourseResult } from '../course.dto';

const courseResult: CourseResult = {
  course: {
    creator: {
      avatar: null,
      email: 'mock@mock.com',
      firstName: 'Foo',
      id: '1',
      isVerified: true,
      lastName: 'Bar',
      type: UserType.EDUCATOR,
    },
    description: 'mock description',
    id: '1',
    name: 'course mock',
    type: {
      id: '1',
      name: 'JAVASCRIPT',
      valueEn: 'Javascript',
      valuePl: 'Javascript',
    },
  },
  totalVideos: 20,
  firstVideo: {
    description: 'mock description',
    duration: 35,
    id: '1',
    link: 'mock video link',
    name: 'mock video',
    thumbnailLink: 'mock video thumbnail link',
    views: 4564,
  },
};

export default courseResult;
