import { request } from './api.js';

export const CourseAPI = {
  async getCourses() {
    return request('/courses');
  },
  async getCourse(id) {
    return request(`/courses/${id}`);
  }
};
