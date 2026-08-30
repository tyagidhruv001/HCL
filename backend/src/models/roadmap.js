import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  provider: { type: String, default: 'LearnAI' },
  level: { type: String, default: 'Beginner' },
  duration: { type: String, default: '8h' },
  rating: { type: Number, default: 4.8 },
  icon: { type: String, default: '📖' },
  url: { type: String, default: '#' },
  skills: [{ type: String }],
  why: { type: String },
  completed: { type: Boolean, default: false },
}, { _id: false });

const phaseSchema = new mongoose.Schema({
  id: { type: Number },
  phaseNumber: { type: Number },
  title: { type: String, required: true },
  theme: { type: String },
  duration: { type: String, default: '4 weeks' },
  milestone: { type: String },
  courses: [courseSchema],
}, { _id: false });

// Legacy node and progress schemas retained for backwards compatibility
const nodeSchema = new mongoose.Schema({
  day: { type: String },
  topic: { type: String },
  status: { type: String, enum: ['done', 'current', 'pending'], default: 'pending' },
  color: { type: String, default: '#00d4aa' },
  subject: { type: String },
}, { _id: false });

const progressSchema = new mongoose.Schema({
  subject: { type: String },
  pct: { type: Number, default: 0 },
  done: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  color: { type: String, default: '#00d4aa' },
}, { _id: false });

const roadmapSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  goal: { type: String, default: 'Full Stack Engineering' },
  title: { type: String, default: 'Personalized Learning Pathway' },
  description: { type: String },
  totalDuration: { type: String, default: '3-4 Months' },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED', 'COMPLETED'], default: 'ACTIVE' },
  phases: [phaseSchema],
  completedCourseIds: [{ type: String }],
  bookmarkedCourseIds: [{ type: String }],
  subjects: [{ type: String }],
  nodes: [nodeSchema],
  progress: [progressSchema],
}, { timestamps: true });

roadmapSchema.index({ userId: 1, status: 1 });

const Roadmap = mongoose.model('Roadmap', roadmapSchema);
export default Roadmap;
