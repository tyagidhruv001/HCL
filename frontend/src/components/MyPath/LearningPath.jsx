import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './LearningPath.css';
import QuizModal from './QuizModal.jsx';
import SkillGraphView from './SkillGraphView.jsx';
import ExplainModal from './ExplainModal.jsx';
import ProjectBriefModal from './ProjectBriefModal.jsx';
import VideoLectureModal from './VideoLectureModal.jsx';
import roadmapService from '../../services/roadmapService.js';
import { generateLearningPathAlgorithm } from './pathRecommendation.js';

function getResourceUrl(course) {
  if (course?.url && course.url !== '#' && /^https?:\/\//i.test(course.url)) {
    return course.url;
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent((course?.title || 'Tutorial') + ' tutorial')}`;
}

function isProjectStep(course) {
  const text = `${course?.title || ''} ${course?.provider || ''} ${course?.why || ''}`.toLowerCase();
  return /project|capstone|simulator|build|hands-on|lab|implementation/i.test(text);
}

const PHASE_THEMES = [
  { color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)', name: 'Foundation' },
  { color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)', name: 'Core Applications' },
  { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', name: 'Specialization' },
  { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', name: 'Capstone' },
];

export default function LearningPath({
  userProfile = { name: 'Learner', goal: 'Full Stack Engineer', level: 'Beginner', interests: ['Web Development'] },
  onLaunchFocusStudio,
  onProgressUpdate
}) {
  // Roadmap State (Initialize synchronously from cache so there is 0ms delay)
  const [path, setPath] = useState(() => {
    try {
      const cached = localStorage.getItem('user_learning_path');
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('user_progress') || '{}');
      return saved.completedCourseIds || [];
    } catch { return []; }
  });
  const [bookmarkedIds, setBookmarkedIds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('user_progress') || '{}');
      return saved.bookmarkedCourseIds || [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Active Modals
  const [quizState, setQuizState] = useState(null); // { topic, level, courseId }
  const [skillGraphOpen, setSkillGraphOpen] = useState(false);
  const [explainData, setExplainData] = useState(null); // { course, explanation }
  const [projectModalData, setProjectModalData] = useState(null); // { course, phaseTitle }
  const [videoModalCourse, setVideoModalCourse] = useState(null); // { course }

  // View & Filter Controls
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'grid'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'completed'
  const [collapsedPhases, setCollapsedPhases] = useState({});

  const activeStepRef = useRef(null);

  // Load Roadmap on mount with safety timeout
  useEffect(() => {
    let isMounted = true;
    async function loadRoadmap() {
      if (!path) setLoading(true);
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
        const resPromise = roadmapService.getActiveRoadmap();
        const response = await Promise.race([resPromise, timeoutPromise]);

        const data = response?.data || response;
        if (isMounted && data?.phases?.length > 0) {
          setPath(data);
          if (data.completedCourseIds) setCompletedIds(data.completedCourseIds);
          if (data.bookmarkedCourseIds) setBookmarkedIds(data.bookmarkedCourseIds);
          localStorage.setItem('user_learning_path', JSON.stringify(data));
        } else if (isMounted && !path) {
          const generated = await generateLearningPathAlgorithm(userProfile);
          setPath(generated);
          localStorage.setItem('user_learning_path', JSON.stringify(generated));
        }
      } catch (err) {
        // Fallback: Generate local algorithmic path if empty
        if (isMounted && !path) {
          const generated = await generateLearningPathAlgorithm(userProfile);
          setPath(generated);
          localStorage.setItem('user_learning_path', JSON.stringify(generated));
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadRoadmap();
    return () => { isMounted = false; };
  }, []);

  // Save progress helper
  const saveProgressLocal = (newCompleted, newBookmarked) => {
    setCompletedIds(newCompleted);
    setBookmarkedIds(newBookmarked);
    const existing = JSON.parse(localStorage.getItem('user_progress') || '{}');
    const updated = {
      ...existing,
      completedCourseIds: newCompleted,
      bookmarkedCourseIds: newBookmarked,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('user_progress', JSON.stringify(updated));
    if (onProgressUpdate) onProgressUpdate(updated);
  };

  // Toggle Complete
  const handleToggleComplete = useCallback(async (courseId) => {
    const isDone = completedIds.includes(courseId);
    let newCompleted;
    if (isDone) {
      newCompleted = completedIds.filter(id => id !== courseId);
      try { await roadmapService.updateProgress(courseId, 0, false); } catch (e) { }
    } else {
      newCompleted = [...completedIds, courseId];
      try { await roadmapService.updateProgress(courseId, 100, true); } catch (e) { }
    }
    saveProgressLocal(newCompleted, bookmarkedIds);
  }, [completedIds, bookmarkedIds]);

  // Toggle Bookmark
  const handleToggleBookmark = useCallback(async (courseId) => {
    let newBookmarked;
    if (bookmarkedIds.includes(courseId)) {
      newBookmarked = bookmarkedIds.filter(id => id !== courseId);
    } else {
      newBookmarked = [...bookmarkedIds, courseId];
    }
    saveProgressLocal(completedIds, newBookmarked);
    try { await roadmapService.toggleBookmark(courseId); } catch (e) { }
  }, [completedIds, bookmarkedIds]);

  // Custom generator controls with detailed user requirements
  const [customGoal, setCustomGoal] = useState(userProfile.goal || 'Full Stack Engineer');
  const [customLevel, setCustomLevel] = useState(userProfile.level || 'Intermediate');
  const [customRequirements, setCustomRequirements] = useState('');
  const [customBackground, setCustomBackground] = useState('');
  const [customTimeline, setCustomTimeline] = useState('3-4 Months');
  const [customLearningStyle, setCustomLearningStyle] = useState('Project-Based & Practical');
  const [customWeeklyHours, setCustomWeeklyHours] = useState('10-15 hrs/week');
  const [customPhaseCount, setCustomPhaseCount] = useState('auto');
  const [showGeneratorPanel, setShowGeneratorPanel] = useState(false);

  const SUBJECT_PRESETS = [
    { label: '💻 Web Dev', value: 'Full Stack Web Development' },
    { label: '🧠 DSA & LeetCode', value: 'Data Structures & Algorithms Mastery' },
    { label: '🤖 AI & GenAI', value: 'Machine Learning & GenAI Engineering' },
    { label: '☁️ Cloud & DevOps', value: 'Cloud Architecture, Docker & Kubernetes' },
    { label: '☕ Java Backend', value: 'Java Spring Boot & Microservices' },
    { label: '🐍 Python Data', value: 'Advanced Python & Data Science' },
    { label: '⚛️ Quantum Computing', value: 'Quantum Computing & Qiskit Algorithms' },
    { label: '🔒 Cybersecurity', value: 'Ethical Hacking & Network Security' },
    { label: '🚀 Rust Systems', value: 'Rust High-Performance Systems Programming' },
    { label: '🎮 Game Dev (UE5)', value: 'Unreal Engine 5 & C++ Game Development' },
  ];

  const REQUIREMENT_INSPIRATIONS = [
    '🛠️ Focus heavily on hands-on code & real-world projects',
    '💼 Target Senior / L4+ interview preparation & system design',
    '⚡ Skip basic syntax (Fast-track to advanced architecture)',
    '🧠 Include deep mathematical derivations & theory',
    '📜 Industry certification & exam syllabus aligned',
    '⏱️ 4-Week intensive accelerated bootcamp',
    '🏢 Enterprise production-ready patterns (CI/CD, Monitoring, Security)',
  ];

  const handleAppendRequirement = (tag) => {
    const cleanTag = tag.replace(/^[^\w\s]+/, '').trim();
    setCustomRequirements(prev => {
      if (!prev) return cleanTag;
      if (prev.includes(cleanTag)) return prev;
      return `${prev}. ${cleanTag}`;
    });
  };

  // Generate or Regenerate Path
  const handleGenerate = async (overrideGoal = null, overrideLevel = null) => {
    if (generating) return;
    setGenerating(true);
    const targetGoal = overrideGoal || customGoal || userProfile.goal || 'Full Stack Engineer';
    const targetLevel = overrideLevel || customLevel || userProfile.level || 'Intermediate';

    try {
      let generated = null;
      try {
        const res = await roadmapService.generateRoadmap({
          goal: targetGoal,
          level: targetLevel,
          timeline: customTimeline || '3-4 Months',
          requirements: customRequirements || '',
          background: customBackground || '',
          learningStyle: customLearningStyle || 'Project-Based & Practical',
          weeklyHours: customWeeklyHours || '10-15 hrs/week',
          phaseCount: customPhaseCount || 'auto',
        });
        if (res?.data) generated = res.data;
      } catch (backendErr) {
        console.warn('Backend generation fallback:', backendErr);
      }

      if (!generated) {
        generated = await generateLearningPathAlgorithm({
          ...userProfile,
          goal: targetGoal,
          level: targetLevel,
          timeline: customTimeline || '3-4 Months',
          requirements: customRequirements || '',
          learningStyle: customLearningStyle || 'Project-Based & Practical',
          phaseCount: customPhaseCount || 'auto',
        });
      }

      setPath(generated);
      setCompletedIds([]);
      setBookmarkedIds([]);
      setShowGeneratorPanel(false);
      localStorage.setItem('user_learning_path', JSON.stringify(generated));
      localStorage.removeItem('user_progress');
    } catch (e) {
      alert('Failed to generate pathway: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (!path) return;
    const s = v => String(v || '').replace(/[<>&"']/g, '');
    let text = `# 🗺️ ${s(path.title || 'Learning Roadmap')}\n${s(path.description || '')}\n\n**Target Timeline:** ${s(path.totalDuration || '3-4 Months')}\n\n`;
    (path.phases || []).forEach((phase, i) => {
      text += `## Phase ${i + 1}: ${s(phase.title)}\n*${s(phase.theme || '')}*\n\n`;
      (phase.courses || []).forEach((c, idx) => {
        text += `### Step ${i + 1}.${idx + 1}: ${s(c.title)}\n`;
        text += `- **Provider:** ${s(c.provider)} (${s(c.level)})\n`;
        text += `- **Duration:** ${s(c.duration)} • **Rating:** ⭐ ${s(c.rating)}\n`;
        if (c.skills?.length) text += `- **Skills:** ${c.skills.join(', ')}\n`;
        if (c.why) text += `- **AI Guidance:** ${s(c.why)}\n`;
        text += `- **Resource:** ${s(c.url)}\n\n`;
      });
      if (phase.milestone) text += `🏁 **Phase Milestone:** ${s(phase.milestone)}\n\n---\n\n`;
    });

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(userProfile.name || 'my').toLowerCase()}-learning-roadmap.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  };

  // Metrics & Active Step Tracking
  const { allCourses, activeCourseId, totalCourses, completedCount, pct } = useMemo(() => {
    if (!path || !path.phases) {
      return { allCourses: [], activeCourseId: null, totalCourses: 0, completedCount: 0, pct: 0 };
    }
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
          phaseId: phase.id || phaseIdx + 1,
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
  }, [path, completedIds]);

  const scrollToActiveStep = () => {
    if (activeStepRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const levelColorMap = {
    beginner: 'lp-badge-emerald',
    intermediate: 'lp-badge-cyan',
    advanced: 'lp-badge-violet'
  };

  if (loading) {
    return (
      <div className="lp-loading-wrap">
        <div className="lp-spinner">⟳</div>
        <p>JARVIS AI is loading your personalized learning pathway...</p>
      </div>
    );
  }

  if (!path || !path.phases || path.phases.length === 0) {
    return (
      <div className="lp-empty-state lp-architect-studio-wrap">
        <div className="lp-empty-icon">⚡</div>
        <h2>JARVIS AI Pathway Architect</h2>
        <p>
          Describe your study requirements, target goals, and background. JARVIS ML Engine will generate an end-to-end, multi-phase curriculum for <strong>ANY study subject in the universe</strong>.
        </p>

        {/* Requirements Form */}
        <div className="lp-req-form-grid">
          <div className="lp-form-field">
            <label>🎯 Target Study Goal / Domain:</label>
            <input
              type="text"
              placeholder="e.g. Java Spring Boot & Microservices, Quantum Computing, Unreal Engine 5, UPSC Polity..."
              value={customGoal}
              onChange={e => setCustomGoal(e.target.value)}
              className="lp-req-input"
            />
          </div>

          <div className="lp-form-field">
            <label>📝 Describe Your Specific Requirements & Syllabus Goals:</label>
            <textarea
              rows={3}
              placeholder="Describe specific topics to cover, project ideas, focus areas, constraints (e.g. 'Focus heavily on Kafka, Docker, and Kubernetes with zero beginner filler. I want to build a real-world microservices e-commerce system in 6 weeks')..."
              value={customRequirements}
              onChange={e => setCustomRequirements(e.target.value)}
              className="lp-req-textarea"
            />
            <div className="lp-tag-suggestions">
              {REQUIREMENT_INSPIRATIONS.map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="lp-req-tag-pill"
                  onClick={() => handleAppendRequirement(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="lp-form-row-2">
            <div className="lp-form-field">
              <label>🧠 Background / Prior Knowledge:</label>
              <input
                type="text"
                placeholder="e.g. Basic Java, Linear Algebra, No prior experience..."
                value={customBackground}
                onChange={e => setCustomBackground(e.target.value)}
                className="lp-req-input"
              />
            </div>
            <div className="lp-form-field">
              <label>📊 Starting Level:</label>
              <select
                value={customLevel}
                onChange={e => setCustomLevel(e.target.value)}
                className="lp-req-select"
              >
                <option value="Beginner">🌱 Beginner (Zero to Hero)</option>
                <option value="Intermediate">🚀 Intermediate (Filling Core Gaps)</option>
                <option value="Advanced">⚡ Advanced (Production & Specialization)</option>
              </select>
            </div>
          </div>

          <div className="lp-form-row-3">
            <div className="lp-form-field">
              <label>🎨 Learning Style:</label>
              <select
                value={customLearningStyle}
                onChange={e => setCustomLearningStyle(e.target.value)}
                className="lp-req-select"
              >
                <option value="Project-Based & Practical">🛠️ Project-Based & Code-First</option>
                <option value="Academic & Theory-First">🎓 Academic & Mathematical Rigor</option>
                <option value="Fast-Track & Interview Prep">⚡ Fast-Track & Interview Ready</option>
                <option value="Exam & Certification Centric">📜 Exam & Certification Centric</option>
              </select>
            </div>
            <div className="lp-form-field">
              <label>⏳ Target Timeline:</label>
              <select
                value={customTimeline}
                onChange={e => setCustomTimeline(e.target.value)}
                className="lp-req-select"
              >
                <option value="2 Weeks">⚡ 2 Weeks (Crash Course)</option>
                <option value="4 Weeks">⚡ 4 Weeks (Intensive)</option>
                <option value="8 Weeks">🚀 8 Weeks (Accelerated)</option>
                <option value="3-4 Months">📅 3-4 Months (Mastery)</option>
                <option value="6 Months">📚 6 Months (Deep Dive)</option>
              </select>
            </div>
            <div className="lp-form-field">
              <label>🔢 Phases Count:</label>
              <select
                value={customPhaseCount}
                onChange={e => setCustomPhaseCount(e.target.value)}
                className="lp-req-select"
              >
                <option value="auto">🤖 AI Adaptive (Auto 2–6)</option>
                <option value="2">⚡ 2 Phases (Compact / Crash)</option>
                <option value="3">📚 3 Phases (Standard)</option>
                <option value="4">🚀 4 Phases (Comprehensive)</option>
                <option value="5">🏛️ 5 Phases (In-Depth)</option>
                <option value="6">🏆 6 Phases (Mastery Bootcamp)</option>
              </select>
            </div>
          </div>
        </div>

        <button
          className="lp-btn lp-btn-primary lp-btn-lg lp-generate-action-btn"
          onClick={() => handleGenerate()}
          disabled={generating || !customGoal.trim()}
        >
          {generating ? '⚡ JARVIS ML Engine is Architecting Your Curriculum...' : '✨ Architect Master Learning Path'}
        </button>
      </div>
    );
  }

  return (
    <div className="lp-root-container">

      {/* Top Header */}
      <div className="lp-header">
        <div className="lp-header-main">
          <div className="lp-goal-pill">
            <span>🎯 Goal:</span> {path.goal || customGoal || userProfile.goal || 'Software Mastery'}
          </div>
          <h1 className="lp-title">{path.title || 'Personalized Learning Pathway'}</h1>
          <p className="lp-subtitle">{path.description || 'Step-by-step roadmap with adaptive milestones'}</p>
        </div>

        <div className="lp-header-actions">
          <button
            className={`lp-btn ${showGeneratorPanel ? 'lp-btn-secondary' : 'lp-btn-primary'} lp-btn-sm`}
            onClick={() => setShowGeneratorPanel(p => !p)}
            title="Generate a new custom path"
          >
            {showGeneratorPanel ? '✖ Close Studio' : '✨ Custom Path Studio'}
          </button>
          <button className="lp-btn lp-btn-secondary lp-btn-sm" onClick={() => setSkillGraphOpen(true)}>
            🕸️ Skill Tree Graph
          </button>
          {onLaunchFocusStudio && (
            <button className="lp-btn lp-btn-secondary lp-btn-sm" onClick={() => onLaunchFocusStudio('My Path Focus')}>
              ⏱️ Focus Studio
            </button>
          )}
          <button className="lp-btn lp-btn-ghost lp-btn-sm" onClick={handleExport} title="Export markdown">
            📤 Export
          </button>
        </div>
      </div>

      {/* Embedded Rich Path Requirements Studio Drawer */}
      {showGeneratorPanel && (
        <div className="lp-generator-drawer">
          <div className="lp-drawer-header">
            <div>
              <div className="lp-drawer-title">
                <span>⚡</span> JARVIS AI Pathway Architect & Requirements Studio
              </div>
              <p className="lp-drawer-sub">
                Enter ANY study subject in the universe and describe your custom syllabus requirements, background, and timeline.
              </p>
            </div>
            <button className="lp-drawer-close-btn" onClick={() => setShowGeneratorPanel(false)}>✕</button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="lp-presets-row">
            <span className="lp-presets-label">Popular Focus:</span>
            {SUBJECT_PRESETS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setCustomGoal(p.value)}
                className={`lp-preset-chip ${customGoal === p.value ? 'active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Form Fields */}
          <div className="lp-req-form-grid">
            <div className="lp-form-field">
              <label>🎯 Target Study Goal / Domain:</label>
              <input
                type="text"
                placeholder="e.g. Java Spring Boot & Microservices, Quantum Computing, Neuroscience, UPSC Polity..."
                value={customGoal}
                onChange={e => setCustomGoal(e.target.value)}
                className="lp-req-input"
              />
            </div>

            {/* User Requirements Textarea */}
            <div className="lp-form-field">
              <label>📝 Describe Your Specific Requirements & Syllabus Goals:</label>
              <textarea
                rows={3}
                placeholder="Describe specific topics to cover, project ideas, focus areas, constraints (e.g. 'Focus heavily on Kafka, Docker, and Kubernetes with zero beginner filler. I want to build a real-world microservices e-commerce system in 6 weeks')..."
                value={customRequirements}
                onChange={e => setCustomRequirements(e.target.value)}
                className="lp-req-textarea"
              />
              <div className="lp-tag-suggestions">
                {REQUIREMENT_INSPIRATIONS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="lp-req-tag-pill"
                    onClick={() => handleAppendRequirement(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="lp-form-row-2">
              <div className="lp-form-field">
                <label>🧠 Background / Prior Knowledge:</label>
                <input
                  type="text"
                  placeholder="e.g. Basic Java, Linear Algebra, No prior experience..."
                  value={customBackground}
                  onChange={e => setCustomBackground(e.target.value)}
                  className="lp-req-input"
                />
              </div>
              <div className="lp-form-field">
                <label>📊 Starting Level:</label>
                <select
                  value={customLevel}
                  onChange={e => setCustomLevel(e.target.value)}
                  className="lp-req-select"
                >
                  <option value="Beginner">🌱 Beginner (Zero to Hero)</option>
                  <option value="Intermediate">🚀 Intermediate (Filling Core Gaps)</option>
                  <option value="Advanced">⚡ Advanced (Production & Specialization)</option>
                </select>
              </div>
            </div>

            <div className="lp-form-row-3">
              <div className="lp-form-field">
                <label>🎨 Learning Style:</label>
                <select
                  value={customLearningStyle}
                  onChange={e => setCustomLearningStyle(e.target.value)}
                  className="lp-req-select"
                >
                  <option value="Project-Based & Practical">🛠️ Project-Based & Code-First</option>
                  <option value="Academic & Theory-First">🎓 Academic & Mathematical Rigor</option>
                  <option value="Fast-Track & Interview Prep">⚡ Fast-Track & Interview Ready</option>
                  <option value="Exam & Certification Centric">📜 Exam & Certification Centric</option>
                </select>
              </div>
              <div className="lp-form-field">
                <label>⏳ Target Timeline:</label>
                <select
                  value={customTimeline}
                  onChange={e => setCustomTimeline(e.target.value)}
                  className="lp-req-select"
                >
                  <option value="2 Weeks">⚡ 2 Weeks (Crash Course)</option>
                  <option value="4 Weeks">⚡ 4 Weeks (Intensive)</option>
                  <option value="8 Weeks">🚀 8 Weeks (Accelerated)</option>
                  <option value="3-4 Months">📅 3-4 Months (Mastery)</option>
                  <option value="6 Months">📚 6 Months (Deep Dive)</option>
                </select>
              </div>
              <div className="lp-form-field">
                <label>🔢 Phases Count:</label>
                <select
                  value={customPhaseCount}
                  onChange={e => setCustomPhaseCount(e.target.value)}
                  className="lp-req-select"
                >
                  <option value="auto">🤖 AI Adaptive (Auto 2–6)</option>
                  <option value="2">⚡ 2 Phases (Compact / Crash)</option>
                  <option value="3">📚 3 Phases (Standard)</option>
                  <option value="4">🚀 4 Phases (Comprehensive)</option>
                  <option value="5">🏛️ 5 Phases (In-Depth)</option>
                  <option value="6">🏆 6 Phases (Mastery Bootcamp)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="lp-drawer-actions">
            <button
              className="lp-btn lp-btn-primary lp-generate-action-btn"
              onClick={() => handleGenerate()}
              disabled={generating || !customGoal.trim()}
            >
              {generating ? '⚡ JARVIS ML Engine is Architecting Your Curriculum...' : '✨ Architect Master Learning Path'}
            </button>
            <button
              className="lp-btn lp-btn-ghost"
              onClick={() => setShowGeneratorPanel(false)}
              disabled={generating}
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* Hero Progress Overview Card */}
      <div className="lp-hero-card">
        <div className="lp-hero-grid">

          <div className="lp-stats-group">
            <div className="lp-stat-item">
              <div className="lp-stat-val lp-text-emerald">{pct}%</div>
              <div className="lp-stat-label">Pathway Mastery</div>
            </div>

            <div className="lp-stat-divider" />

            <div className="lp-stat-item">
              <div className="lp-stat-val lp-text-purple">
                {completedCount}<span style={{ fontSize: '18px', color: '#94a3b8' }}>/{totalCourses}</span>
              </div>
              <div className="lp-stat-label">Steps Completed</div>
            </div>

            <div className="lp-stat-divider" />

            <div className="lp-stat-item">
              <div className="lp-stat-val" style={{ fontSize: '20px', color: '#38bdf8' }}>
                {path.totalDuration || '3-4 Months'}
              </div>
              <div className="lp-stat-label">Target Duration</div>
            </div>
          </div>

          <div className="lp-progress-section">
            <div className="lp-progress-labels">
              <span>Overall Progress</span>
              <span>{completedCount} of {totalCourses} milestones reached</span>
            </div>
            <div className="lp-progress-bar-wrap">
              <div className="lp-progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>

        </div>
      </div>

      {/* Controls: View Switcher & Filter Pills */}
      <div className="lp-controls-bar">
        <div className="lp-view-switcher">
          <button
            className={`lp-view-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            🛣️ Timeline Spine
          </button>
          <button
            className={`lp-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            📋 Curriculum Grid
          </button>
        </div>

        <div className="lp-filter-group">
          <span className="lp-filter-label">Filter:</span>
          {['all', 'active', 'completed'].map(m => (
            <button
              key={m}
              className={`lp-filter-pill ${filterMode === m ? 'active' : ''}`}
              onClick={() => setFilterMode(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
          {activeCourseId && (
            <button className="lp-btn lp-btn-secondary lp-btn-xs" onClick={scrollToActiveStep} title="Jump to in-progress course">
              ⚡ Jump to Active
            </button>
          )}
        </div>
      </div>

      {/* ── TIMELINE TRACK VIEW ── */}
      {viewMode === 'timeline' ? (
        <div className="lp-roadmap-timeline">
          {path.phases.map((phase, phaseIdx) => {
            const isCollapsed = !!collapsedPhases[phase.id || phaseIdx];
            const phaseTheme = PHASE_THEMES[phaseIdx % PHASE_THEMES.length];
            const phaseCourses = phase.courses || [];
            const phaseDoneCount = phaseCourses.filter(c => completedIds.includes(c.id)).length;
            const phaseTotal = phaseCourses.length;
            const isPhaseComplete = phaseTotal > 0 && phaseDoneCount === phaseTotal;

            return (
              <div key={phase.id || phaseIdx} className="lp-phase-block">

                {/* Phase Header */}
                <div
                  className="lp-phase-header"
                  onClick={() => setCollapsedPhases(p => ({ ...p, [phase.id || phaseIdx]: !p[phase.id || phaseIdx] }))}
                  style={{ borderLeft: `4px solid ${phaseTheme.color}` }}
                >
                  <div
                    className="lp-phase-number-badge"
                    style={{
                      borderColor: phaseTheme.color,
                      color: isPhaseComplete ? '#10b981' : phaseTheme.color,
                      background: isPhaseComplete ? 'rgba(16, 185, 129, 0.15)' : `${phaseTheme.color}22`
                    }}
                  >
                    {isPhaseComplete ? '✓' : phaseIdx + 1}
                  </div>

                  <div className="lp-phase-meta-col">
                    <div className="lp-phase-title">
                      <span>{phase.title}</span>
                      <span className="lp-badge" style={{ background: `${phaseTheme.color}22`, color: phaseTheme.color, border: `1px solid ${phaseTheme.color}44` }}>
                        {phase.duration || '4 weeks'}
                      </span>
                    </div>
                    {phase.theme && <div className="lp-phase-subtitle">{phase.theme}</div>}
                  </div>

                  <div className="lp-phase-progress-box">
                    <div className="lp-phase-progress-text">
                      {phaseDoneCount}/{phaseTotal} Done
                    </div>
                    <div className="lp-progress-bar-wrap" style={{ height: '5px' }}>
                      <div
                        className="lp-progress-bar-fill"
                        style={{
                          width: `${phaseTotal > 0 ? (phaseDoneCount / phaseTotal) * 100 : 0}%`,
                          background: phaseTheme.color
                        }}
                      />
                    </div>
                  </div>

                  <div className="lp-collapse-arrow" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    ▼
                  </div>
                </div>

                {/* Phase Steps Spine Track */}
                {!isCollapsed && (
                  <div className="lp-spine-track">
                    {phaseCourses.map((course, courseIdx) => {
                      const isCmp = completedIds.includes(course.id);
                      const isBook = bookmarkedIds.includes(course.id);
                      const isActiveFocus = course.id === activeCourseId;
                      const stepNum = `${phaseIdx + 1}.${courseIdx + 1}`;

                      if (filterMode === 'completed' && !isCmp) return null;
                      if (filterMode === 'active' && isCmp) return null;
                      const url = getResourceUrl(course);

                      return (
                        <div
                          key={course.id}
                          ref={isActiveFocus ? activeStepRef : null}
                          className={`lp-step-row ${isCmp ? 'completed' : ''} ${isActiveFocus ? 'active-focus' : ''}`}
                        >
                          {/* Glowing Beacon Node on Spine */}
                          <div
                            className="lp-spine-beacon"
                            title={isCmp ? 'Completed Step' : isActiveFocus ? 'Current Active Step' : `Step ${stepNum}`}
                          >
                            {isCmp ? '✓' : stepNum}
                          </div>

                          {/* Step Content Card */}
                          <div className="lp-step-card">

                            <div className="lp-step-card-header">
                              <div className="lp-step-badges">
                                <span className={`lp-status-tag ${isCmp ? 'done' : (isActiveFocus ? 'active' : 'queued')}`}>
                                  {isCmp ? 'Completed ✅' : (isActiveFocus ? 'Current Focus ⚡' : `Step ${stepNum}`)}
                                </span>
                                <span className={`lp-badge ${levelColorMap[course.level?.toLowerCase()] || 'lp-badge-indigo'}`}>
                                  {course.level || 'Beginner'}
                                </span>
                              </div>

                              <div className="lp-step-meta-stats">
                                <span>⏱️ {course.duration || '6h'}</span>
                                <span>⭐ {course.rating || '4.8'}</span>
                              </div>
                            </div>

                            <div className="lp-step-title-row">
                              <span className="lp-course-icon">{course.icon || '📖'}</span>
                              <div>
                                <div className="lp-course-name">{course.title}</div>
                                <div className="lp-course-provider">
                                  by <strong>{course.provider || 'LearnAI'}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Skills Gained Tags */}
                            {(course.skills?.length > 0 || course.tags?.length > 0) && (
                              <div className="lp-skills-wrap">
                                <span className="lp-skills-label">Skills:</span>
                                {[...(course.skills || []), ...(course.tags || [])].slice(0, 4).map((skill, skIdx) => (
                                  <span key={skIdx} className="lp-skill-pill">+{skill}</span>
                                ))}
                              </div>
                            )}

                            {/* AI Guidance Rationale */}
                            {course.why && (
                              <div className="lp-why-box">
                                💡 <strong>AI Guidance:</strong> {course.why}
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="lp-step-actions">
                              {/* 1. Direct Video Lecture Studio */}
                              <button
                                className="lp-btn lp-btn-primary lp-btn-sm"
                                onClick={() => setVideoModalCourse(course)}
                                title="Watch embedded YouTube video masterclasses & playlist"
                              >
                                📺 Video Lecture
                              </button>

                              {/* 2. Project Brief Specification or Official Documentation */}
                              {isProjectStep(course) ? (
                                <button
                                  className="lp-btn lp-btn-secondary lp-btn-sm"
                                  onClick={() => setProjectModalData({ course, phaseTitle: phase.title })}
                                  title="Open detailed project briefing, tasks & starter guidance"
                                >
                                  📋 Project Brief
                                </button>
                              ) : (
                                <a
                                  href={getResourceUrl(course)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="lp-btn lp-btn-secondary lp-btn-sm"
                                  title="Open official course documentation & online reference"
                                >
                                  📖 Official Docs ↗
                                </a>
                              )}

                              <button
                                className="lp-btn lp-btn-secondary lp-btn-sm"
                                onClick={() => setQuizState({ topic: course.title, level: course.level, courseId: course.id })}
                              >
                                🧪 Test Knowledge
                              </button>

                              <button
                                className={`lp-btn lp-btn-sm ${isCmp ? 'lp-btn-secondary' : 'lp-btn-ghost'}`}
                                onClick={() => handleToggleComplete(course.id)}
                              >
                                {isCmp ? '✅ Completed' : '✓ Mark Complete'}
                              </button>

                              <button
                                className="lp-btn lp-btn-ghost lp-btn-sm"
                                onClick={() => setExplainData({
                                  course,
                                  explanation: course.why || `${course.title} builds core foundational mastery for your pathway.`
                                })}
                              >
                                🤖 Tutor Help
                              </button>

                              {onLaunchFocusStudio && (
                                <button
                                  className="lp-btn lp-btn-secondary lp-btn-sm"
                                  onClick={() => onLaunchFocusStudio(course.title)}
                                  title="Open Focus Room for this topic"
                                >
                                  ⏱️ Focus
                                </button>
                              )}

                              <button
                                className="lp-bookmark-btn"
                                onClick={() => handleToggleBookmark(course.id)}
                                title={isBook ? 'Remove bookmark' : 'Bookmark step'}
                              >
                                {isBook ? '🔖' : '🤍'}
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })}

                    {/* Phase Milestone Boss Node */}
                    {phase.milestone && (
                      <div className={`lp-milestone-gate ${isPhaseComplete ? 'unlocked' : ''}`}>
                        <span className="lp-milestone-icon">🏁</span>
                        <div className="lp-milestone-body">
                          <div className="lp-milestone-title">
                            {isPhaseComplete ? `PHASE ${phaseIdx + 1} MILESTONE COMPLETE` : `PHASE ${phaseIdx + 1} MILESTONE GATE`}
                          </div>
                          <div className="lp-milestone-desc">{phase.milestone}</div>
                        </div>
                        <div className="lp-milestone-actions">
                          <button
                            className="lp-btn lp-btn-secondary lp-btn-sm"
                            onClick={() => setQuizState({ topic: phase.title || 'Phase Mastery', level: 'intermediate' })}
                          >
                            🧪 Milestone Quiz
                          </button>
                          <div className={`lp-milestone-tag ${isPhaseComplete ? 'unlocked' : ''}`}>
                            {isPhaseComplete ? '🏆 UNLOCKED' : `${Math.max(0, phaseTotal - phaseDoneCount)} TASKS REMAINING`}
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Transition Bridge to next phase */}
                {phaseIdx < path.phases.length - 1 && (
                  <div className="lp-phase-bridge">
                    <div className="lp-bridge-badge">
                      ⬇️ Unlocks Phase {phaseIdx + 2}: {path.phases[phaseIdx + 1]?.title || 'Next Phase'}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      ) : (

        /* ── GRID CURRICULUM VIEW ── */
        <div className="lp-grid-view">
          {path.phases.map((phase, i) => (
            <div key={i} className="lp-grid-phase-card">
              <h3>Phase {i + 1}: {phase.title}</h3>
              <p className="lp-grid-phase-theme">{phase.theme}</p>
              <div className="lp-grid-courses">
                {(phase.courses || []).map(c => {
                  const isDone = completedIds.includes(c.id);
                  return (
                    <div key={c.id} className={`lp-grid-course-item ${isDone ? 'done' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{c.title}</strong>
                        <button
                          onClick={() => handleToggleComplete(c.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                        >
                          {isDone ? '✅' : '⏳'}
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        {c.provider} &bull; {c.duration} &bull; ⭐ {c.rating}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Modal */}
      {quizState && (
        <QuizModal
          topic={quizState.topic}
          difficulty={quizState.level || 'beginner'}
          courseId={quizState.courseId}
          onClose={() => setQuizState(null)}
          onComplete={(cid) => {
            if (cid && !completedIds.includes(cid)) {
              handleToggleComplete(cid);
            }
          }}
        />
      )}

      {/* Skill Graph DAG Modal */}
      {skillGraphOpen && (
        <SkillGraphView
          onStartQuiz={(topic, level) => {
            setSkillGraphOpen(false);
            setQuizState({ topic, level });
          }}
          onClose={() => setSkillGraphOpen(false)}
        />
      )}

      {/* Explain Tutor Modal */}
      {explainData && (
        <ExplainModal
          course={explainData.course}
          explanation={explainData.explanation}
          onClose={() => setExplainData(null)}
        />
      )}

      {/* Project Briefing Specification Modal */}
      {projectModalData && (
        <ProjectBriefModal
          course={projectModalData.course}
          phaseTitle={projectModalData.phaseTitle}
          onLaunchFocus={(topic) => {
            if (onLaunchFocusStudio) onLaunchFocusStudio(topic);
          }}
          onClose={() => setProjectModalData(null)}
        />
      )}

      {/* Video Lecture Studio & In-App Player Modal */}
      {videoModalCourse && (
        <VideoLectureModal
          course={videoModalCourse}
          onLaunchFocus={(topic) => {
            if (onLaunchFocusStudio) onLaunchFocusStudio(topic);
          }}
          onClose={() => setVideoModalCourse(null)}
        />
      )}

    </div>
  );
}
