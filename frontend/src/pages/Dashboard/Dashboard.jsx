import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Storage, Sanitize } from '../../utils/storage.js';
import { CourseCatalog } from '../../features/courses/courses.js';
import { useToast } from '../../context/ToastContext.jsx';
import { ProgressAPI } from '../../services/progress.api.js';
import { StudyAPI } from '../../services/study.api.js';
import QuizModal from '../../components/QuizModal.jsx';
import SkillGraphView from '../../components/SkillGraphView.jsx';
import FocusTimerModal from '../../components/FocusTimerModal.jsx';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const ACHIEVEMENTS = [
  { id: 'first_course',  icon: '🌱', name: 'First Step',    desc: 'Complete your first course',      condition: p => p.completedCourseIds.length >= 1 },
  { id: 'three_courses', icon: '🏃', name: 'Momentum',      desc: 'Complete 3 courses',               condition: p => p.completedCourseIds.length >= 3 },
  { id: 'five_courses',  icon: '🔥', name: 'On Fire',       desc: 'Complete 5 courses',               condition: p => p.completedCourseIds.length >= 5 },
  { id: 'ten_courses',   icon: '⚡', name: 'Power Learner', desc: 'Complete 10 courses',              condition: p => p.completedCourseIds.length >= 10 },
  { id: 'streak_3',      icon: '📅', name: '3-Day Streak',  desc: 'Study 3 days in a row',            condition: p => p.streak >= 3 },
  { id: 'streak_7',      icon: '🗓️', name: 'Week Warrior', desc: 'Study 7 days in a row',            condition: p => p.streak >= 7 },
  { id: 'bookmarks',     icon: '🔖', name: 'Curator',       desc: 'Bookmark 5+ courses',              condition: p => (p.bookmarkedCourseIds || []).length >= 5 },
  { id: 'path_done',     icon: '🏆', name: 'Path Complete', desc: 'Finish your entire learning path', condition: () => false },
];

const DOMAINS = [
  { id: 'web',    label: '🌐 Web Dev',        color: '#6366f1' },
  { id: 'data',   label: '📊 Data Science',   color: '#06b6d4' },
  { id: 'ai',     label: '🤖 AI / ML',        color: '#8b5cf6' },
  { id: 'cloud',  label: '☁️ Cloud & DevOps', color: '#3b82f6' },
  { id: 'cyber',  label: '🔒 Cybersecurity',  color: '#f43f5e' },
  { id: 'design', label: '🎨 UI/UX',           color: '#f59e0b' },
];

function StatCard({ icon, label, value, sub, bgColor, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bgColor, color }}>{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-delta up">↑ {sub}</div>
    </div>
  );
}

function RadarChart({ profile, progress }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const domains  = ['web', 'data', 'ai', 'cloud', 'cyber', 'design'];
    const labels   = ['Web Dev', 'Data Science', 'AI/ML', 'Cloud', 'Cybersecurity', 'UI/UX'];
    const completed = CourseCatalog.all.filter(c => progress.completedCourseIds.includes(c.id));
    const coursesByDomain = {};
    domains.forEach(d => coursesByDomain[d] = CourseCatalog.getByDomain(d).length || 1);

    const currentScores = domains.map(d => {
      const done = completed.filter(c => c.domain === d).length;
      return Math.round((done / coursesByDomain[d]) * 100);
    });
    const projectedScores = domains.map((d, i) => {
      const isInterest = (profile.interests || []).includes(d);
      return isInterest ? Math.min(currentScores[i] + 35, 100) : Math.min(currentScores[i] + 10, 60);
    });

    chartRef.current = new Chart(canvasRef.current.getContext('2d'), {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Current', data: currentScores,
            backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.8)',
            pointBackgroundColor: 'rgba(99,102,241,1)', borderWidth: 2,
          },
          {
            label: 'After Path', data: projectedScores,
            backgroundColor: 'rgba(6,182,212,0.08)', borderColor: 'rgba(6,182,212,0.6)',
            pointBackgroundColor: 'rgba(6,182,212,1)', borderWidth: 2, borderDash: [5, 3],
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { stepSize: 25, color: 'rgba(148,163,184,0.5)', font: { size: 10 }, backdropColor: 'transparent' },
            grid: { color: 'rgba(255,255,255,0.07)' },
            angleLines: { color: 'rgba(255,255,255,0.07)' },
            pointLabels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } },
          },
        },
        plugins: {
          legend: { labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' }, boxWidth: 14, padding: 16 } },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [profile, progress]);

  return <canvas ref={canvasRef} style={{ maxHeight: '280px' }} />;
}

function ActivityCalendar({ progress }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count   = (progress.activityLog || []).filter(e => (e.date || '').startsWith(dateStr)).length;
    let level = 0;
    if (count >= 3) level = 4;
    else if (count === 2) level = 3;
    else if (count === 1) level = 2;
    cells.push({ dateStr, level, count });
  }
  return (
    <div style={{ marginTop: '12px' }}>
      <div className="calendar-grid">
        {cells.map((c, i) => (
          <div key={i} className={`cal-cell l${c.level}`} title={`${c.dateStr}: ${c.count} activities`} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <span>Less</span>
        {[0.05, 0.25, 0.5, 1].map((o, i) => (
          <div key={i} style={{ width: '12px', height: '12px', borderRadius: '2px', background: `rgba(99,102,241,${o})` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate  = useNavigate();
  const { showToast } = useToast();

  const [progressState, setProgressState] = React.useState(() => Storage.getProgress());
  const profile  = Storage.getProfile();
  const progress = progressState;
  const path     = Storage.getPath();
  const h        = Sanitize.html;

  useEffect(() => {
    let isMounted = true;
    async function syncBackendState() {
      try {
        const [progressRes, statsRes] = await Promise.allSettled([
          ProgressAPI.getProgress(),
          StudyAPI.getStats()
        ]);
        if (isMounted && progressRes.status === 'fulfilled' && progressRes.value?.data) {
          const completedIds = progressRes.value.data
            .filter(p => p.progressPercentage >= 100)
            .map(p => p.courseId);
          if (completedIds.length > 0) {
            Storage.saveProgress({ completedCourseIds: completedIds });
            setProgressState(Storage.getProgress());
          }
        }
      } catch (e) {
        console.warn('Dashboard backend sync error:', e);
      }
    }
    syncBackendState();
    return () => { isMounted = false; };
  }, []);

  if (!profile.onboarded) {
    return (
      <section id="view-dashboard" className="view active">
        <div style={{ textAlign: 'center', padding: '80px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
          <h2 style={{ fontWeight: 700, marginBottom: '8px' }}>Complete Your Profile</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Set up your profile to see your personalised dashboard.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>
            Get Started →
          </button>
        </div>
      </section>
    );
  }

  const completed = progress.completedCourseIds.length;
  const hours     = Math.round(
    CourseCatalog.all
      .filter(c => progress.completedCourseIds.includes(c.id))
      .reduce((s, c) => s + (parseFloat(c.duration) || 0), 0)
  );
  let pct = 0;
  if (path) {
    const total = path.phases.reduce((s, p) => s + p.courses.length, 0);
    const done  = path.phases.reduce((s, p) => s + p.courses.filter(c => progress.completedCourseIds.includes(c.id)).length, 0);
    pct = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  // Next actions
  const actions = [];
  if (!path) {
    actions.push({ icon: '🗺️', title: 'Generate Your Learning Path', sub: 'AI-personalised roadmap awaits', route: '/path' });
  } else {
    for (const phase of path.phases) {
      for (const course of phase.courses) {
        if (!progress.completedCourseIds.includes(course.id)) {
          actions.push({ icon: course.icon || '📖', title: course.title, sub: `${phase.title} • ${course.duration}`, route: '/path' });
          break;
        }
      }
      if (actions.length >= 2) break;
    }
  }
  if (!Storage.hasApiKey()) actions.push({ icon: '🔑', title: 'Add Your Gemini API Key', sub: 'Unlock full AI-powered recommendations', apikey: true });
  if ((profile.interests || []).length < 3) actions.push({ icon: '🎯', title: 'Add More Interests', sub: 'Improve recommendation accuracy', route: '/onboarding' });
  actions.push({ icon: '💬', title: 'Chat with Your AI Advisor', sub: 'Ask questions, get guidance', route: '/chat' });

  const [quizState, setQuizState] = React.useState(null);
  const [skillGraphOpen, setSkillGraphOpen] = React.useState(false);
  const [focusTimerOpen, setFocusTimerOpen] = React.useState(false);

  return (
    <section id="view-dashboard" className="view active">
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <h1 className="section-title">Dashboard</h1>
            <p className="section-subtitle">Welcome back, {profile.name}! Here's your learning progress & skills. 🚀</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSkillGraphOpen(true)}
              title="Explore the interactive competency graph"
            >
              🕸️ Skill Graph DAG
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setFocusTimerOpen(true)}
              title="Launch Pomodoro Focus Studio"
            >
              ⏱️ Focus Studio
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setQuizState({ topic: (profile.interests && profile.interests[0]) || 'python', difficulty: profile.level || 'beginner' })}
              title="Test your skills with an AI quiz"
            >
              🧪 Daily Skill Quiz
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="dashboard-stats">
          <StatCard icon="📚" label="Courses Completed" value={completed} sub="Total done"   bgColor="rgba(99,102,241,0.15)" color="var(--indigo)" />
          <StatCard icon="🔥" label="Day Streak"         value={progress.streak || 0} sub="Keep it up!"  bgColor="rgba(245,158,11,0.15)" color="var(--amber)" />
          <StatCard icon="⏱️" label="Hours Learned"     value={hours}    sub="Estimated"    bgColor="rgba(6,182,212,0.15)" color="var(--cyan)" />
          <StatCard icon="🎯" label="Path Progress"      value={`${pct}%`} sub="To goal"    bgColor="rgba(16,185,129,0.15)" color="var(--emerald)" />
        </div>

        {/* Charts Row */}
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Skill Profile</div>
              <div className="chart-card-subtitle">Estimated skill levels across domains</div>
            </div>
            <RadarChart profile={profile} progress={progress} />
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">Progress by Domain</div>
              <div className="chart-card-subtitle">Courses completed per category</div>
            </div>
            <div style={{ marginTop: '8px' }}>
              {DOMAINS.map(d => {
                const total = CourseCatalog.getByDomain(d.id).length;
                const done  = CourseCatalog.all.filter(c => progress.completedCourseIds.includes(c.id) && c.domain === d.id).length;
                const dpct  = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={d.id} className="skill-bar">
                    <div className="skill-bar-header">
                      <span className="skill-bar-name">{d.label}</span>
                      <span className="skill-bar-pct">{done}/{total}</span>
                    </div>
                    <div className="progress-bar-wrap">
                      <div className="progress-bar-fill" style={{ width: `${dpct}%`, background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Next Actions + Activity */}
        <div className="grid-2" style={{ marginBottom: '24px' }}>
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">🎯 Next Recommended Actions</div>
              <div className="chart-card-subtitle">Your personalised to-do list</div>
            </div>
            <div>
              {actions.slice(0, 4).map((a, i) => (
                <div
                  key={i} className="action-item" tabIndex={0} role="button"
                  onClick={() => {
                    if (a.route)  navigate(a.route);
                    if (a.apikey) window.dispatchEvent(new CustomEvent('app:show-apikey'));
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (a.route)  navigate(a.route);
                      if (a.apikey) window.dispatchEvent(new CustomEvent('app:show-apikey'));
                    }
                  }}
                >
                  <span className="action-icon">{a.icon}</span>
                  <div className="action-info">
                    <div className="action-title">{a.title}</div>
                    <div className="action-sub">{a.sub}</div>
                  </div>
                  <span className="action-arrow">›</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">📅 Activity Calendar</div>
              <div className="chart-card-subtitle">Your learning consistency</div>
            </div>
            <ActivityCalendar progress={progress} />
          </div>
        </div>

        {/* Achievements */}
        <div className="chart-card" style={{ marginBottom: '24px' }}>
          <div className="chart-card-header">
            <div className="chart-card-title">🏆 Achievements</div>
            <div className="chart-card-subtitle">Badges earned on your journey</div>
          </div>
          <div className="achievements-grid">
            {ACHIEVEMENTS.map(a => {
              const earned = a.condition(progress);
              return (
                <div key={a.id} className={`achievement ${earned ? 'earned' : 'locked'}`} title={a.desc}>
                  <div className="achievement-icon">{a.icon}</div>
                  <div className="achievement-name">{a.name}</div>
                  {earned && <div style={{ fontSize: '10px', color: 'var(--emerald)', marginTop: '3px' }}>✓ Earned</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Path Summary */}
        {path && (
          <div className="chart-card">
            <div className="chart-card-header">
              <div className="chart-card-title">📖 Path Summary</div>
              <div className="chart-card-subtitle">{path.title || ''}</div>
            </div>
            <div>
              {path.phases.map((phase, i) => {
                const done  = phase.courses.filter(c => progress.completedCourseIds.includes(c.id)).length;
                const total = phase.courses.length;
                const ppct  = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{phase.title || ''}</div>
                      <div className="progress-bar-wrap" style={{ height: '6px' }}>
                        <div className="progress-bar-fill" style={{ width: `${ppct}%` }} />
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '50px', textAlign: 'right' }}>{done}/{total}</div>
                    {ppct === 100 && <span style={{ color: 'var(--emerald)' }}>✅</span>}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '16px' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/path')}>View Full Path →</button>
            </div>
          </div>
        )}
      </div>

      {/* Daily Skill Quiz Modal */}
      {quizState && (
        <QuizModal
          topic={quizState.topic}
          difficulty={quizState.difficulty}
          onClose={() => setQuizState(null)}
          onComplete={() => {
            setProgressState(Storage.getProgress());
          }}
        />
      )}

      {/* Skill Graph DAG Modal */}
      {skillGraphOpen && (
        <SkillGraphView
          onClose={() => setSkillGraphOpen(false)}
          onStartQuiz={(topicName, level) => {
            setSkillGraphOpen(false);
            setQuizState({ topic: topicName, difficulty: level });
          }}
        />
      )}

      {/* Focus Studio Pomodoro Modal */}
      {focusTimerOpen && (
        <FocusTimerModal
          defaultTopic="Dashboard Study Goal"
          onClose={() => {
            setFocusTimerOpen(false);
            setProgressState(Storage.getProgress());
          }}
        />
      )}
    </section>
  );
}

