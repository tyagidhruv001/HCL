import { CourseCatalog } from './courses.js';

export const CoursesService = {
  async getAllCourses() {
    return CourseCatalog.all;
  },
  async getCourseDetail(courseId) {
    return CourseCatalog.getById(courseId);
  }
};
