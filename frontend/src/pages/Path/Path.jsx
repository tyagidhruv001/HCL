import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storage, Sanitize } from '../../utils/storage.js';
import { AI } from '../../features/recommendation/recommendation.js';
import { useToast } from '../../context/ToastContext.jsx';
import { RoadmapAPI } from '../../services/roadmap.api.js';
import { ProgressAPI } from '../../services/progress.api.js';
import QuizModal from '../../components/QuizModal.jsx';
import SkillGraphView from '../../components/SkillGraphView.jsx';
import FocusTimerModal from '../../components/FocusTimerModal.jsx';

const ALLOWED_DOMAINS = [
  'coursera.org', 'udemy.com', 'freecodecamp.org', 'theodinproject.com',
  'scrimba.com', 'frontendmasters.com', 'kaggle.com', 'fast.ai',
  'github.com', 'google.com', 'microsoft.com', 'aws.amazon.com',
  'developers.google.com', 'youtube.com', 'developer.mozilla.org',
  'apollographql.com', 'nextjs.org', 'vercel.com', 'typescriptlang.org',
  'web.dev', 'security.google.com', 'owasp.org',
  'deeplearning.ai', 'huggingface.co', 'openai.com',
];

function safeUrl(url) {
  if (!url || url === '#') return '#';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return '#';
    if (!ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))) return '#';
    return parsed.href;
  } catch { return '#'; }
}

function ExplainModal({ course, explanation, onClose }) {
  const h = Sanitize.html;
  const safe = h(explanation || '').replace(/\n/g, '<br>');
  const url = safeUrl(course.url);
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Course explanation"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '520px' }}>
        <div style={{ fontSize: '42px', textAlign: 'center', marginBottom: '12px' }}>{course.icon || '📖'}</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: '6px' }}>{h(course.title)}</h3>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span className="badge badge-indigo">{h(course.provider)}</span>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '16px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: '20px' }}
          dangerouslySetInnerHTML={{ __html: safe }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {url === '#' ? '📁 Open Resource' : '🚀 Go to Course'}
          </a>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const PHASE_THEMES = [
  { color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)', name: 'Foundation' },
  { color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', name: 'Core Applications' },
  { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', name: 'Specialization' },
  { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', name: 'Capstone' },
];

export default function Path() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [path, setPath] = useState(() => Storage.getPath());
  const [profile, setProfile] = useState(() => Storage.getProfile());
  const [progress, setProgress] = useState(() => Storage.getProgress());
  const [generating, setGenerating] = useState(false);
  const [explainData, setExplainData] = useState(null);

  // Modals
  const [quizState, setQuizState] = useState(null); // { topic, courseId, difficulty }
  const [skillGraphOpen, setSkillGraphOpen] = useState(false);
  const [focusTimerState, setFocusTimerState] = useState(null); // { topic }
  
  // Interactive UI view controls
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'grid'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'completed'
  const [collapsedPhases, setCollapsedPhases] = useState({});

  const activeStepRef = useRef(null);

  const refreshProgress = () => setProgress(Storage.getProgress());

  // Load server-side roadmap if authenticated
  React.useEffect(() => {
    let isMounted = true;
    async function loadServerRoadmap() {
      try {
        const response = await RoadmapAPI.getActiveRoadmap();
        if (isMounted && response?.data) {
          const serverRoadmap = response.data;
          setPath(serverRoadmap);
          Storage.savePath(serverRoadmap);
        }
      } catch (err) {
        console.warn('Could not fetch server roadmap, using local cache:', err.message);
      }
    }
    loadServerRoadmap();
    return () => { isMounted = false; };
  }, []);

  const handleToggleComplete = useCallback(async (courseId) => {
    if (!Sanitize.courseId(courseId)) return;
    const p = Storage.getProgress();
    const isCompleted = p.completedCourseIds.includes(courseId);

    if (isCompleted) {
      Storage.markCourseIncomplete(courseId);
      showToast('Step marked as incomplete', 'info');
      try {
        await ProgressAPI.updateProgress(courseId, 0);
      } catch (e) {
        console.warn('Progress sync failed:', e);
      }
    } else {
      Storage.markCourseComplete(courseId);
      showToast('🎉 Step completed! Pathway updated!', 'success');
      try {
        await ProgressAPI.updateProgress(courseId, 100);
      } catch (e) {
        console.warn('Progress sync failed:', e);
      }
      const updated = Storage.getProgress();
      if (updated.streak > 0 && updated.streak % 7 === 0) {
        showToast(`🔥 ${updated.streak}-day streak! Keep up the momentum!`, 'info');
      }
    }
    refreshProgress();
  }, [showToast]);

  const handleToggleBookmark = useCallback((courseId) => {
    if (!Sanitize.courseId(courseId)) return;
    const bookmarked = Storage.toggleBookmark(courseId);
    showToast(bookmarked ? '🔖 Bookmarked step!' : 'Bookmark removed', 'info');
    refreshProgress();
  }, [showToast]);

  const handleExplain = useCallback(async (course) => {
    const prof = Storage.getProfile();
    if (!prof.onboarded) return;
    showToast('🤖 Consulting AI Advisor...', 'info');
    try {
      const explanation = await AI.explain(course, prof);
      setExplainData({ course, explanation });
    } catch {
      showToast('Could not fetch AI explanation. Check connection.', 'error');
    }
  }, [showToast]);

  const handleStartQuiz = (topicName, level = 'beginner', courseId = null) => {
    setQuizState({ topic: topicName, difficulty: level, courseId });
  };

  const handleStartFocus = (topicName) => {
    setFocusTimerState({ topic: topicName || 'Active Roadmap Study' });
  };

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      let generated = null;
      try {
        const res = await RoadmapAPI.generateRoadmap();
        if (res?.data) {
          generated = res.data;
        }
      } catch (backendErr) {
        console.warn('Backend roadmap generation failed, falling back to ML client:', backendErr);
      }

      if (!generated) {
        generated = await AI.generatePath(profile);
      }

      Storage.savePath(generated);
      setPath(generated);
      showToast('🎉 Your custom learning path is ready!', 'success');
    } catch (e) {
      showToast('Failed to generate path: ' + (e.message || 'Check connection.'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (!confirm('Regenerate your roadmap? This will recalculate your learning path with the latest ML recommendations.')) return;
    Storage.clearPath();
    setPath(null);
  };

  const handleExport = () => {
    if (!path) return;
    const s = v => String(v || '').replace(/[<>&"']/g, '');
    let text = `# 🗺️ ${s(path.title)}\n${s(path.description)}\n\n**Timeline:** ${s(path.totalDuration)}\n\n`;
    path.phases.forEach((phase, i) => {
      text += `## Phase ${i + 1}: ${s(phase.title)}\n*${s(phase.theme)}*\n\n`;
      phase.courses.forEach((c, idx) => {
        text += `### Step ${i + 1}.${idx + 1}: ${s(c.title)}\n`;
        text += `- **Provider:** ${s(c.provider)} (${s(c.level)})\n`;
        text += `- **Duration:** ${s(c.duration)} • **Rating:** ⭐ ${s(c.rating)}\n`;
        if (c.skills?.length) text += `- **Skills:** ${c.skills.join(', ')}\n`;
        if (c.why) text += `- **Why this step:** ${s(c.why)}\n`;
        text += `- **Resource Link:** ${s(c.url)}\n\n`;
      });
      text += `🏁 **Phase Milestone:** ${s(phase.milestone)}\n\n---\n\n`;
    });
    try {
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(profile.name || 'my').toLowerCase()}-learning-roadmap.md`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      showToast('📤 Learning path exported as Markdown!', 'success');
    } catch {
      showToast('Export failed. Try again.', 'error');
    }
  };

  const togglePhaseCollapse = (phaseId) => {
    setCollapsedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
  };

  // Flatten courses with global sequencing info
  const { allCourses, activeCourseId, totalCourses, completedCount, pct } = useMemo(() => {
    if (!path || !path.phases) {
      return { allCourses: [], activeCourseId: null, totalCourses: 0, completedCount: 0, pct: 0 };
    }
    const completedIds = progress.completedCourseIds || [];
    const list = [];
    let firstIncompleteId = null;

    path.phases.forEach((phase, phaseIdx) => {
      (phase.courses || []).forEach((course, courseIdx) => {
        const isDone = completedIds.includes(course.id);
        if (!isDone && firstIncompleteId === null) {
          firstIncompleteId = course.id;
        }
        list.push({
          ...course,
          phaseId: phase.id,
          phaseIndex: phaseIdx,
          phaseTitle: phase.title,
          stepGlobalIndex: list.length + 1,
          stepLocalNumber: `${phaseIdx + 1}.${courseIdx + 1}`,
          isDone,
          isCurrentFocus: course.id === firstIncompleteId,
        });
      });
    });

    const total = list.length;
    const done = list.filter(c => c.isDone).length;
    const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      allCourses: list,
      activeCourseId: firstIncompleteId,
      totalCourses: total,
      completedCount: done,
      pct: progressPct,
    };
  }, [path, progress.completedCourseIds]);

  const scrollToActiveStep = () => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (!profile.onboarded) {
    return (
      <section id="view-path" className="view active">
        <div className="page-content">
          <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎓</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Complete Your Profile First</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Tell us your background and goals so the AI can generate your personalized roadmap.</p>
            <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>Set Up Profile →</button>
          </div>
        </div>
      </section>
    );
  }

  if (!path || !path.phases || path.phases.length === 0) {
    return (
      <section id="view-path" className="view active">
        <div className="page-content">
          <div className="path-header">
            <h1 className="section-title">Your Learning Pathway</h1>
            <p className="section-subtitle">Adaptive AI Curriculum & Step-by-Step Milestones</p>
          </div>
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '72px', marginBottom: '20px' }}>🗺️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '10px' }}>No Learning Pathway Generated</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 28px', lineHeight: 1.7 }}>
              Ready to create your step-by-step roadmap toward <em>"{profile.goal || 'your career ambition'}"</em>?
              Our ML Knowledge Graph will map prerequisites and structure an actionable multi-phase curriculum.
            </p>
            <button
              className="btn btn-primary btn-lg"
              id="generate-path-btn"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Generating your pathway...</>
                : '✨ Generate My Adaptive Pathway'}
            </button>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        </div>
      </section>
    );
  }

  const levelColorMap = {
    beginner: 'badge-emerald',
    intermediate: 'badge-cyan',
    advanced: 'badge-violet'
  };

  return (
    <section id="view-path" className="view active">
      <div className="page-content">
        
        {/* Header Title Bar */}
        <div className="path-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#c7d2fe', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
                <span>🎯 Goal:</span> {profile.goal || 'Software Mastery'}
              </div>
              <h1 className="section-title" style={{ fontSize: '28px', letterSpacing: '-0.5px' }}>{path.title || 'Personalized Learning Pathway'}</h1>
              <p className="section-subtitle" style={{ maxWidth: '680px', marginTop: '4px' }}>{path.description || ''}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => setSkillGraphOpen(true)}
                title="View interactive Directed Acyclic Graph of skills"
              >
                🕸️ Skill Tree Graph
              </button>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={() => handleStartFocus('Curriculum Deep Work')}
                title="Launch Pomodoro Focus Room"
              >
                ⏱️ Focus Studio
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleRegenerate} title="Rebuild path with AI">
                🔄 Regenerate
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleExport} title="Download markdown roadmap">
                📤 Export
              </button>
            </div>
          </div>

          {/* Hero Roadmap Progress Card */}
          <div className="roadmap-hero-card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', alignItems: 'center' }}>
              
              {/* Stat Counters */}
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#34d399', lineHeight: 1 }}>{pct}%</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Path Completed</div>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{completedCount}/{totalCourses}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Courses Mastered</div>
                </div>
                <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>{path.phases.length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Milestone Phases</div>
                </div>
              </div>

              {/* Visual Progress Bar & Jump Button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Target Timeline: <strong style={{ color: '#ffffff' }}>{path.totalDuration || '3-4 Months'}</strong></span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>{completedCount === totalCourses ? '🏁 All Done!' : `${totalCourses - completedCount} steps to go`}</span>
                </div>
                <div className="progress-bar-wrap" style={{ height: '10px', background: 'rgba(255,255,255,0.08)' }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)' }} />
                </div>
                {activeCourseId && (
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={scrollToActiveStep} 
                    style={{ alignSelf: 'flex-start', marginTop: '4px', fontSize: '12px', padding: '6px 14px' }}
                  >
                    ⚡ Jump to Active Step
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Controls Bar: View Switcher & Filters */}
          <div className="roadmap-controls-bar">
            
            {/* View Mode Switcher */}
            <div className="roadmap-view-switcher">
              <button 
                className={`roadmap-view-btn${viewMode === 'timeline' ? ' active' : ''}`}
                onClick={() => setViewMode('timeline')}
              >
                <span>🛣️</span> Roadmap Track
              </button>
              <button 
                className={`roadmap-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <span>📋</span> Curriculum Grid
              </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Show:</span>
              {[
                ['all', 'All Steps'],
                ['active', 'In Progress ⚡'],
                ['completed', 'Completed ✅']
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterMode(key)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '12px',
                    fontWeight: filterMode === key ? 700 : 500,
                    border: '1px solid',
                    borderColor: filterMode === key ? 'var(--indigo)' : 'var(--border-subtle)',
                    background: filterMode === key ? 'rgba(99,102,241,0.2)' : 'transparent',
                    color: filterMode === key ? '#c7d2fe' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* ── ROADMAP TIMELINE PATH VIEW ── */}
        {viewMode === 'timeline' ? (
          <div className="roadmap-container">
            {path.phases.map((phase, phaseIdx) => {
              const theme = PHASE_THEMES[phaseIdx % PHASE_THEMES.length];
              const phaseTotal = (phase.courses || []).length;
              const phaseDone = (phase.courses || []).filter(c => progress.completedCourseIds.includes(c.id)).length;
              const phasePct = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0;
              const isPhaseComplete = phaseDone === phaseTotal && phaseTotal > 0;
              const isCollapsed = !!collapsedPhases[phase.id];

              // Filter courses for this phase
              const displayedCourses = (phase.courses || []).filter(c => {
                const isCmp = progress.completedCourseIds.includes(c.id);
                if (filterMode === 'completed') return isCmp;
                if (filterMode === 'active') return !isCmp;
                return true;
              });

              return (
                <div key={phase.id} className="roadmap-phase-section">
                  
                  {/* Phase Gateway Header */}
                  <div 
                    className="roadmap-phase-header-node"
                    onClick={() => togglePhaseCollapse(phase.id)}
                    style={{ borderColor: `${theme.color}40` }}
                  >
                    <div 
                      className="roadmap-phase-badge"
                      style={{ background: `linear-gradient(135deg, ${theme.color} 0%, #1e1b4b 100%)`, color: '#ffffff', border: `2px solid ${theme.color}` }}
                    >
                      {phaseIdx + 1}
                    </div>

                    <div className="roadmap-phase-info">
                      <div className="roadmap-phase-title">
                        {phase.title || `Phase ${phaseIdx + 1}`}
                        {isPhaseComplete && <span className="badge badge-emerald" style={{ fontSize: '11px' }}>Phase Mastered ✅</span>}
                      </div>
                      <div className="roadmap-phase-meta">
                        📅 {phase.duration || '4 weeks'} &bull; 💡 {phase.theme || 'Core terminology & principles'}
                      </div>
                    </div>

                    <div className="roadmap-phase-progress-box">
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        {phaseDone}/{phaseTotal} ({phasePct}%)
                      </div>
                      <div className="progress-bar-wrap" style={{ height: '6px' }}>
                        <div className="progress-bar-fill" style={{ width: `${phasePct}%`, background: theme.color }} />
                      </div>
                    </div>

                    <span style={{ fontSize: '18px', color: 'var(--text-muted)', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      ▼
                    </span>
                  </div>

                  {/* Connected Pathway Steps */}
                  {!isCollapsed && (
                    <div className="roadmap-path-track">
                      {displayedCourses.map((course, stepIndex) => {
                        const isCmp = progress.completedCourseIds.includes(course.id);
                        const isBook = (progress.bookmarkedCourseIds || []).includes(course.id);
                        const isActiveFocus = course.id === activeCourseId;
                        const url = safeUrl(course.url);
                        const stepNum = `${phaseIdx + 1}.${stepIndex + 1}`;

                        return (
                          <div 
                            key={course.id}
                            ref={isActiveFocus ? activeStepRef : null}
                            className={`roadmap-step-item${isCmp ? ' completed' : ''}${isActiveFocus ? ' active-focus' : ''}`}
                          >
                            
                            {/* Visual Node Beacon on the Spine Line */}
                            <div className="roadmap-step-connector-node" title={`Step ${stepNum}`}>
                              {isCmp ? '✓' : (isActiveFocus ? '⚡' : stepNum)}
                            </div>

                            {/* Rich Step Card */}
                            <div className="roadmap-step-content-card">
                              
                              {/* Top Bar: Status, Level, Meta */}
                              <div className="step-card-top-bar">
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <span className={`step-card-status-pill ${isCmp ? 'step-status-completed' : (isActiveFocus ? 'step-status-active' : 'step-status-queued')}`}>
                                    {isCmp ? 'Completed ✅' : (isActiveFocus ? 'Current Focus ⚡' : `Step ${stepNum}`)}
                                  </span>
                                  <span className={`badge ${levelColorMap[course.level?.toLowerCase()] || 'badge-indigo'}`}>
                                    {course.level || 'Beginner'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  <span>⏱️ {course.duration || '8h'}</span>
                                  <span>⭐ {course.rating || '4.8'}</span>
                                  {course.students && <span>👥 {course.students}</span>}
                                </div>
                              </div>

                              {/* Title & Provider */}
                              <div className="step-card-title-row">
                                <span className="step-course-icon">{course.icon || '📖'}</span>
                                <div style={{ flex: 1 }}>
                                  <div className="step-course-title">{course.title}</div>
                                  <div className="step-course-provider">
                                    by <strong style={{ color: '#cbd5e1' }}>{course.provider}</strong>
                                    {course.verified !== false && <span style={{ marginLeft: '6px', color: '#38bdf8', fontSize: '11px' }}>✓ Verified Resource</span>}
                                  </div>
                                </div>
                              </div>

                              {/* Skills Gained Tags */}
                              {(course.skills?.length > 0 || course.tags?.length > 0) && (
                                <div className="step-skills-tags">
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px', alignSelf: 'center' }}>Skills gained:</span>
                                  {[...(course.skills || []), ...(course.tags || [])].slice(0, 4).map(skill => (
                                    <span key={skill} className="step-skill-pill">
                                      +{skill}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* AI Pedagogical Rationale */}
                              {course.why && (
                                <div className="step-why-callout">
                                  💡 <strong>AI Guidance:</strong> {course.why}
                                </div>
                              )}

                              {/* Interactive Action Row */}
                              <div className="step-card-actions">
                                <a 
                                  href={url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '8px 18px', fontSize: '13px' }}
                                >
                                  {url === '#' ? '📁 Open Project Brief' : '🚀 Start Course ↗'}
                                </a>

                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ background: 'rgba(99,102,241,0.15)', color: '#c7d2fe' }}
                                  title="Test your understanding with an interactive active-recall quiz"
                                  onClick={() => handleStartQuiz(course.title, course.level, course.id)}
                                >
                                  🧪 Test Knowledge
                                </button>

                                <button
                                  className={`btn btn-sm ${isCmp ? 'btn-secondary' : 'btn-ghost'}`}
                                  onClick={() => handleToggleComplete(course.id)}
                                  style={{ color: isCmp ? '#34d399' : 'inherit' }}
                                >
                                  {isCmp ? '✅ Done' : '✓ Mark Complete'}
                                </button>

                                <button
                                  className="btn btn-ghost btn-sm"
                                  title="Ask AI about prerequisites and key concepts"
                                  onClick={() => handleExplain(course)}
                                >
                                  🤖 Tutor Help
                                </button>

                                <button
                                  className="btn-icon"
                                  style={{ marginLeft: 'auto', width: '32px', height: '32px', fontSize: '14px' }}
                                  title={isBook ? 'Remove bookmark' : 'Bookmark this step'}
                                  onClick={() => handleToggleBookmark(course.id)}
                                >
                                  {isBook ? '🔖' : '🤍'}
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}

                      {/* Milestone Gateway Boss Node at the end of the Phase */}
                      {phase.milestone && (
                        <div className={`roadmap-milestone-gate${isPhaseComplete ? ' unlocked' : ''}`}>
                          <span className="roadmap-milestone-icon">{isPhaseComplete ? '🏆' : '🏁'}</span>
                          <div className="roadmap-milestone-text" style={{ flex: 1 }}>
                            <strong>{isPhaseComplete ? 'Phase Milestone Achieved! 🎉' : `Phase ${phaseIdx + 1} Milestone Gate`}</strong>
                            <div className="roadmap-milestone-desc">{phase.milestone}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleStartQuiz(phase.title || 'Milestone', 'intermediate')}
                            >
                              🧪 Milestone Quiz
                            </button>
                            <span className={`badge ${isPhaseComplete ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '12px' }}>
                              {isPhaseComplete ? 'Unlocked ✨' : `${phaseTotal - phaseDone} tasks remaining`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visual Glowing Phase Transition Bridge to next phase */}
                  {phaseIdx < path.phases.length - 1 && (
                    <div className="roadmap-phase-bridge">
                      <div className="roadmap-bridge-line" />
                      <div className="roadmap-bridge-badge">
                        ⬇️ Unlocks Phase {phaseIdx + 2}: {path.phases[phaseIdx + 1]?.title || 'Next Phase'}
                      </div>
                      <div className="roadmap-bridge-line" />
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          
          /* ── ALTERNATIVE GRID / CURRICULUM VIEW ── */
          <div id="phases-container">
            {path.phases.map((phase, i) => {
              const theme = PHASE_THEMES[i % PHASE_THEMES.length];
              const total = phase.courses.length;
              const done = phase.courses.filter(c => progress.completedCourseIds.includes(c.id)).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isCollapsed = !!collapsedPhases[phase.id];

              return (
                <div key={phase.id} className="phase-card" style={{ marginBottom: '24px' }}>
                  <div className="phase-header" onClick={() => togglePhaseCollapse(phase.id)} style={{ cursor: 'pointer' }}>
                    <div className="phase-number" style={{ background: theme.color, color: '#ffffff' }}>{i + 1}</div>
                    <div className="phase-info">
                      <div className="phase-title">{phase.title}</div>
                      <div className="phase-meta">📅 {phase.duration} &bull; {total} courses &bull; {done}/{total} complete</div>
                    </div>
                    <div className="phase-progress-wrap">
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right', marginBottom: '4px' }}>{pct}%</div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: theme.color }} />
                      </div>
                    </div>
                    <span style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>▼</span>
                  </div>

                  {!isCollapsed && (
                    <div style={{ padding: '20px' }}>
                      <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>💡 <em>{phase.theme}</em></div>
                      {phase.milestone && (
                        <div className="milestone-banner" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <span className="milestone-icon">🏁</span>
                            <div><strong>Milestone:</strong> {phase.milestone}</div>
                          </div>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleStartQuiz(phase.title, 'intermediate')}>
                            🧪 Milestone Quiz
                          </button>
                        </div>
                      )}
                      <div className="roadmap-grid-layout">
                        {phase.courses.map(course => {
                          const isCmp = progress.completedCourseIds.includes(course.id);
                          const isBook = (progress.bookmarkedCourseIds || []).includes(course.id);
                          const url = safeUrl(course.url);

                          return (
                            <div key={course.id} className={`course-card${isCmp ? ' completed' : ''}`}>
                              <div className="course-card-top">
                                <span className="course-icon">{course.icon || '📖'}</span>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    className="btn-icon"
                                    style={{ width: '28px', height: '28px', fontSize: '13px' }}
                                    title={isBook ? 'Remove bookmark' : 'Bookmark course'}
                                    onClick={() => handleToggleBookmark(course.id)}
                                  >{isBook ? '🔖' : '🤍'}</button>
                                  <div
                                    className="course-check"
                                    title={isCmp ? 'Mark incomplete' : 'Mark complete'}
                                    onClick={() => handleToggleComplete(course.id)}
                                  >{isCmp ? '✓' : ''}</div>
                                </div>
                              </div>
                              <div className="course-title">{course.title}</div>
                              <div className="course-provider">by {course.provider}</div>
                              <div className="course-meta" style={{ marginBottom: '10px' }}>
                                <span>⏱️ {course.duration}</span>
                                <span>⭐ {course.rating}</span>
                              </div>
                              {course.why && <div className="step-why-callout" style={{ fontSize: '11px', marginBottom: '12px' }}>{course.why}</div>}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                                  {url === '#' ? '📁 Project' : '🚀 Start'}
                                </a>
                                <button className="btn btn-secondary btn-sm" onClick={() => handleStartQuiz(course.title, course.level, course.id)}>
                                  🧪 Quiz
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleExplain(course)}>🤖</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Completion Celebration Hero */}
        {pct === 100 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.15) 100%)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 'var(--radius-xl)', marginTop: '32px' }}>
            <div style={{ fontSize: '64px', marginBottom: '14px' }}>🏆</div>
            <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '8px', color: '#ffffff' }}>Curriculum Mastered!</h2>
            <p style={{ color: '#cbd5e1', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
              Outstanding accomplishment, {profile.name}! You've completed all {totalCourses} courses across all {path.phases.length} phases.
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleRegenerate}>🚀 Generate Advanced Specialization Pathway</button>
          </div>
        )}

      </div>

      {/* AI Tutor Explanation Modal */}
      {explainData && (
        <ExplainModal
          course={explainData.course}
          explanation={explainData.explanation}
          onClose={() => setExplainData(null)}
        />
      )}

      {/* Interactive Active-Recall Quiz Modal */}
      {quizState && (
        <QuizModal
          topic={quizState.topic}
          courseId={quizState.courseId}
          difficulty={quizState.difficulty}
          onClose={() => setQuizState(null)}
          onComplete={(cid) => {
            refreshProgress();
          }}
        />
      )}

      {/* Knowledge Graph DAG Visualizer Modal */}
      {skillGraphOpen && (
        <SkillGraphView
          onClose={() => setSkillGraphOpen(false)}
          onStartQuiz={(topicName, level) => {
            setSkillGraphOpen(false);
            handleStartQuiz(topicName, level);
          }}
        />
      )}

      {/* Focus Studio Pomodoro Timer Modal */}
      {focusTimerState && (
        <FocusTimerModal
          defaultTopic={focusTimerState.topic}
          onClose={() => setFocusTimerState(null)}
        />
      )}
    </section>
  );
}
