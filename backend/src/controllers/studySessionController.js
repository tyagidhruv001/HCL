import StudySession from '../models/studySession.js';
import User from '../models/user.js';

// Update streak on study activity
async function updateStreak(userId) {
  const user = await User.findById(userId);
  if (!user) return 0;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (user.lastStudyDate) {
    const last = new Date(user.lastStudyDate);
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    const diff = (today - lastDay) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      // Consecutive day
      user.streak = (user.streak || 0) + 1;
    } else if (diff > 1) {
      // Streak broken
      user.streak = 1;
    }
    // diff === 0 -> same day, maintain streak
  } else {
    user.streak = 1;
  }

  user.lastStudyDate = now;

  // Add 7-day streak badge if earned
  if (user.streak >= 7 && !user.badges?.some(b => b.name === '7-Day Streak')) {
    if (!user.badges) user.badges = [];
    user.badges.push({ icon: '🔥', name: '7-Day Streak', desc: 'Studied 7 days in a row' });
  }

  // Add Focus Master badge for consistent focus
  if (!user.badges?.some(b => b.name === 'Focus Master')) {
    const sessionCount = await StudySession.countDocuments({ userId });
    if (sessionCount >= 10) {
      if (!user.badges) user.badges = [];
      user.badges.push({ icon: '⏱️', name: 'Focus Master', desc: 'Completed 10+ Focus Sessions' });
    }
  }

  await user.save({ validateBeforeSave: false });
  return user.streak;
}

// ──────────────────────────────────────────────────────────────
// @desc   Get all study sessions for the logged-in user
// @route  GET /api/study-sessions
// @access Private
// ──────────────────────────────────────────────────────────────
export const getUserSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 50;

    const sessions = await StudySession.find({ userId })
      .sort({ studiedAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error('Get Sessions Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Log a completed focus session
// @route  POST /api/study-sessions
// @access Private
// ──────────────────────────────────────────────────────────────
export const logSession = async (req, res) => {
  try {
    const { duration, durationSeconds, topic } = req.body;
    const userId = req.user._id;

    let dur = Number(duration);
    let durSec = Number(durationSeconds);

    if ((!dur || isNaN(dur) || dur <= 0) && (!durSec || isNaN(durSec) || durSec <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Valid duration is required',
      });
    }

    if (!dur && durSec) {
      dur = durSec / 60;
    } else if (dur && !durSec) {
      durSec = Math.round(dur * 60);
    }

    const session = await StudySession.create({
      userId,
      duration: dur,
      durationSeconds: durSec,
      topic: topic?.trim() || 'Deep Focus Session',
      studiedAt: new Date(),
    });

    // Update streak on completing a focus session
    const streak = await updateStreak(userId);

    res.status(201).json({
      success: true,
      message: 'Study session logged successfully',
      data: session,
      streak,
    });
  } catch (error) {
    console.error('Log Session Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Get aggregated focus/study statistics
// @route  GET /api/study-sessions/stats
// @access Private
// ──────────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Start & end of today in local UTC
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalAgg, todayAgg, totalSessions] = await Promise.all([
      StudySession.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalMinutes: { $sum: '$duration' } } },
      ]),
      StudySession.aggregate([
        { $match: { userId, studiedAt: { $gte: todayStart } } },
        { $group: { _id: null, todayMinutes: { $sum: '$duration' } } },
      ]),
      StudySession.countDocuments({ userId }),
    ]);

    const totalMinutes = totalAgg.length > 0 ? totalAgg[0].totalMinutes : 0;
    const todayMinutes = todayAgg.length > 0 ? todayAgg[0].todayMinutes : 0;
    const totalHours = totalMinutes / 60;
    const todayHours = todayMinutes / 60;

    res.json({
      success: true,
      data: {
        totalMinutes,
        totalHours,
        todayMinutes,
        todayHours,
        totalSessions,
      },
    });
  } catch (error) {
    console.error('Get Study Stats Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ──────────────────────────────────────────────────────────────
// @desc   Delete a study session
// @route  DELETE /api/study-sessions/:id
// @access Private
// ──────────────────────────────────────────────────────────────
export const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await StudySession.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Delete Session Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
