import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  duration: {
    type: Number, // Exact duration in minutes (e.g. 25, 4.5, 12.75)
    required: true,
    min: 0.01,
  },
  durationSeconds: {
    type: Number, // Exact duration in seconds (e.g. 1500, 270, 765)
  },
  topic: {
    type: String,
    trim: true,
    default: 'Deep Focus Session',
  },
  studiedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Compound index for querying a user's study sessions sorted by date
studySessionSchema.index({ userId: 1, studiedAt: -1 });

const StudySession = mongoose.model('StudySession', studySessionSchema);

export default StudySession;
