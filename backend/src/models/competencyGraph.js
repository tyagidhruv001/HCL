import mongoose from 'mongoose';

const competencyNodeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  tier: { type: String, enum: ['Foundational', 'Core', 'Advanced', 'Mastery'], default: 'Core' },
  icon: { type: String, default: '📘' },
  desc: { type: String },
  prerequisites: [{ type: String }],
  unlocks: [{ type: String }],
  estimatedHours: { type: Number, default: 20 },
  keySubtopics: [{ type: String }],
  status: { type: String, enum: ['locked', 'ready', 'in_progress', 'mastered'], default: 'ready' },
  masteryScore: { type: Number, default: 0 },
  verifiedViaCheckpoint: { type: Boolean, default: false },
  completedAt: { type: Date }
}, { _id: false });

const competencyGraphSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  roadmapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap', index: true },
  topic: { type: String, required: true },
  domain: { type: String, default: 'Engineering' },
  overview: { type: String },
  isRoadmapLinked: { type: Boolean, default: false },
  nodes: [competencyNodeSchema],
  totalNodes: { type: Number, default: 0 },
  masteredNodesCount: { type: Number, default: 0 },
  readinessPercentage: { type: Number, default: 0 },
}, { timestamps: true });

competencyGraphSchema.index({ userId: 1, topic: 1 });

export default mongoose.model('CompetencyGraph', competencyGraphSchema);
