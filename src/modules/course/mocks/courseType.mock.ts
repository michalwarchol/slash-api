import { CourseTypesResponse } from '../course.dto';

const courseTypes: CourseTypesResponse = [
  {
    id: 'type-id',
    name: 'Programming',
    value: 'programming',
    subTypes: [{ id: 'subtype-id', name: 'JavaScript', value: 'javascript' }],
  },
];

export default courseTypes;
