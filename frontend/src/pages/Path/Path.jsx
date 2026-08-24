import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storage, Sanitize } from '../../utils/storage.js';
import { CourseCatalog } from '../../features/courses/courses.js';
import { AI } from '../../features/recommendation/recommendation.js';
import { useToast } from '../../context/ToastContext.jsx';
import { RoadmapAPI } from '../../services/roadmap.api.js';
import { ProgressAPI } from '../../services/progress.api.js';

const ALLOWED_DOMAINS = [
  'coursera.org','udemy.com','freecodecamp.org','theodinproject.com',
  'scrimba.com','frontendmasters.com','kaggle.com','fast.ai',
  'github.com','google.com','microsoft.com','aws.amazon.com',
  'developers.google.com','youtube.com','developer.mozilla.org',
  'apollographql.com','nextjs.org','vercel.com','typescriptlang.org',
  'web.dev','security.google.com','owasp.org',
  'deeplearning.ai','huggingface.co','openai.com',
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
  const url  = safeUrl(course.url);
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Course explanation"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <div style={{ fontSize: '42px', textAlign: 'center', marginBottom: '12px' }}>{course.icon || '📖'}</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', marginBottom: '6px' }}>{h(course.title)}</h3>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <span className="badge badge-indigo">{h(course.provider)}</span>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-md)', padding: '16px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', marginBottom: '20px' }}
          dangerouslySetInnerHTML={{ __html: safe }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>🚀 Go to Course</a>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const PHASE_COLORS = ['var(--indigo)', 'var(--cyan)', 'var(--emerald)', 'var(--amber)', 'var(--rose)'];

function PhaseCard({ phase, index, completedIds, onToggleComplete, onToggleBookmark, onExplain }) {
  const [collapsed, setCollapsed] = useState(false);
  const h     = Sanitize.html;
  const total = phase.courses.length;
  const done  = phase.courses.filter(c => completedIds.includes(c.id)).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = done === total && total > 0;
  const color = PHASE_COLORS[index % PHASE_COLORS.length];
  const levelColors = { beginner: 'badge-emerald', intermediate: 'badge-cyan', advanced: 'badge-violet' };

  return (
    <div className="phase-card" data-phase-id={String(phase.id)}>
      <div className="phase-header" onClick={() => setCollapsed(c => !c)} style={{ cursor: 'pointer' }}>
        <div className="phase-number" style={{ background: `${color}40`, color, border: `1px solid ${color}60` }}>{index + 1}</div>
        <div className="phase-info">
          <div className="phase-title">{phase.title || ''} {isComplete ? '✅' : ''}</div>
          <div className="phase-meta">📅 {phase.duration || ''} • {total} courses • {done}/{total} complete</div>
        </div>
        <div className="phase-progress-wrap">
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right', marginBottom: '4px' }}>{pct}%</div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
          </div>
        </div>
        <span className="phase-toggle" style={{ transform: collapsed ? 'rotate(90deg)' : 'rotate(270deg)', transition: 'transform 0.2s' }}>›</span>
      </div>

      <div style={{ padding: '10px 24px 0', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
        💡 {phase.theme || ''}
      </div>
      <div className="milestone-banner">
        <span className="milestone-icon">🏁</span>
        <div><strong>Milestone:</strong> {phase.milestone || ''}</div>
      </div>

      {!collapsed && (
        <div className="phase-courses">
          {phase.courses.map(course => {
            const isCmp  = completedIds.includes(course.id);
            const isBook = (Storage.getProgress().bookmarkedCourseIds || []).includes(course.id);
            const url    = safeUrl(course.url);
            return (
              <div key={course.id} className={`course-card${isCmp ? ' completed' : ''}`}>
                <div className="course-card-top">
                  <span className="course-icon">{course.icon || '📖'}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      className="btn-icon course-bookmark-btn"
                      style={{ width: '28px', height: '28px', fontSize: '14px' }}
                      title={isBook ? 'Remove bookmark' : 'Bookmark this course'}
                      onClick={e => { e.stopPropagation(); onToggleBookmark(course.id); }}
                    >{isBook ? '🔖' : '🤍'}</button>
                    <div
                      className="course-check course-complete-btn"
                      title={isCmp ? 'Click to mark incomplete' : 'Click to mark complete'}
                      role="checkbox" aria-checked={isCmp} tabIndex={0}
                      onClick={e => { e.stopPropagation(); onToggleComplete(course.id); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleComplete(course.id); } }}
                    >{isCmp ? '✓' : ''}</div>
                  </div>
                </div>
                <div className="course-title">{course.title}</div>
                <div className="course-provider">by {course.provider}</div>
                <div className="course-tags">
                  <span className={`badge ${levelColors[course.level] || 'badge-indigo'}`}>{course.level}</span>
                  {(course.tags || []).slice(0, 2).map(t => <span key={t} className="course-tag">{t}</span>)}
                </div>
                <div className="course-meta">
                  <span>⏱️ {course.duration}</span>
                  <span>⭐ {course.rating}</span>
                  <span>👥 {course.students}</span>
                </div>
                {course.why && <div className="course-why">💡 {course.why}</div>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <a href={url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    {course.url === '#' ? '📁 Start Project' : '🚀 Start Course'}
                  </a>
                  <button className="btn btn-secondary btn-sm" title="Ask AI about this course"
                    onClick={e => { e.stopPropagation(); onExplain(course); }}>🤖</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Path() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [path,       setPath]       = useState(() => Storage.getPath());
  const [profile,    setProfile]    = useState(() => Storage.getProfile());
  const [progress,   setProgress]   = useState(() => Storage.getProgress());
  const [generating, setGenerating] = useState(false);
  const [explainData, setExplainData] = useState(null); // { course, explanation }

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
        console.warn('Could not fetch server roadmap, using local state:', err.message);
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
      showToast('Course marked incomplete', 'info');
      try {
        await ProgressAPI.updateProgress(courseId, 0);
      } catch (e) {
        console.warn('Progress sync failed:', e);
      }
    } else {
      Storage.markCourseComplete(courseId);
      showToast('🎉 Course marked complete!', 'success');
      try {
        await ProgressAPI.updateProgress(courseId, 100);
      } catch (e) {
        console.warn('Progress sync failed:', e);
      }
      const updated = Storage.getProgress();
      if (updated.streak > 0 && updated.streak % 7 === 0) {
        showToast(`🔥 ${updated.streak}-day streak! Keep it up!`, 'info');
      }
    }
    refreshProgress();
  }, [showToast]);

  const handleToggleBookmark = useCallback((courseId) => {
    if (!Sanitize.courseId(courseId)) return;
    const bookmarked = Storage.toggleBookmark(courseId);
    showToast(bookmarked ? '🔖 Bookmarked!' : 'Bookmark removed', 'info');
    refreshProgress();
  }, [showToast]);

  const handleExplain = useCallback(async (course) => {
    const prof = Storage.getProfile();
    if (!prof.onboarded) return;
    showToast('🤖 Getting AI explanation...', 'info');
    try {
      const explanation = await AI.explain(course, prof);
      setExplainData({ course, explanation });
    } catch {
      showToast('Could not fetch AI explanation. Check your API key.', 'error');
    }
  }, [showToast]);

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      // First try Spring Boot server-side generation
      let generated = null;
      try {
        const res = await RoadmapAPI.generateRoadmap();
        if (res?.data) {
          generated = res.data;
        }
      } catch (backendErr) {
        console.warn('Backend roadmap generation failed, falling back to AI client:', backendErr);
      }

      if (!generated) {
        generated = await AI.generatePath(profile);
      }

      Storage.savePath(generated);
      setPath(generated);
      showToast('🎉 Your learning path is ready!', 'success');
    } catch (e) {
      showToast('Failed to generate path. ' + (e.message || 'Check your connection.'), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (!confirm('Regenerate your path? This will clear the current roadmap and create a fresh one.')) return;
    Storage.clearPath();
    setPath(null);
  };

  const handleExport = () => {
    const s = v => String(v || '').replace(/[<>&"']/g, '');
    let text = `# ${s(path.title)}\n${s(path.description)}\n\nTimeline: ${s(path.totalDuration)}\n\n`;
    path.phases.forEach((phase, i) => {
      text += `## Phase ${i + 1}: ${s(phase.title)}\n${s(phase.theme)}\n\n`;
      phase.courses.forEach(c => {
        text += `- **${s(c.title)}** (${s(c.provider)}) — ${s(c.duration)}\n`;
        if (c.why) text += `  > ${s(c.why)}\n`;
        text += `  🔗 ${s(c.url)}\n`;
      });
      text += `\n🏁 Milestone: ${s(phase.milestone)}\n\n`;
    });
    try {
      const blob = new Blob([text], { type: 'text/markdown' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'learning-path.md'; a.rel = 'noopener';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
      showToast('📤 Path exported as Markdown!', 'success');
    } catch { showToast('Export failed. Try again.', 'error'); }
  };

  if (!profile.onboarded) {
    return (
      <section id="view-path" className="view active">
        <div className="page-content">
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎓</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Complete Your Profile First</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>We need to know a bit about you to generate your personalised path.</p>
            <button className="btn btn-primary" onClick={() => navigate('/onboarding')}>Set Up Profile →</button>
          </div>
        </div>
      </section>
    );
  }

  if (!path) {
    return (
      <section id="view-path" className="view active">
        <div className="page-content">
          <div className="path-header">
            <h1 className="section-title">Your Learning Path</h1>
            <p className="section-subtitle">AI-generated roadmap tailored to your goals</p>
          </div>
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '72px', marginBottom: '20px' }}>🗺️</div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>No Learning Path Yet</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 28px', lineHeight: 1.7 }}>
              Hi <strong>{profile.name}</strong>! Ready to create your personalised roadmap toward <em>"{profile.goal}"</em>?
              Our AI will build a structured path with phases, milestones, and curated resources.
            </p>
            <button
              className="btn btn-primary btn-lg"
              id="generate-path-btn"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> Generating your path...</>
                : '✨ Generate My Learning Path'}
            </button>
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px' }}>
              {AI.hasKey() ? '🟢 Using Gemini AI for personalised recommendations' : '🔵 Demo mode — Add your API key for full AI power'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const totalCourses   = path.phases.reduce((s, p) => s + p.courses.length, 0);
  const completedCount = path.phases.reduce((s, p) => s + p.courses.filter(c => progress.completedCourseIds.includes(c.id)).length, 0);
  const pct            = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;

  return (
    <section id="view-path" className="view active">
      <div className="page-content">
        <div className="path-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 className="section-title">{path.title || 'Your Learning Path'}</h1>
              <p className="section-subtitle" style={{ maxWidth: '600px' }}>{path.description || ''}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={handleRegenerate}>🔄 Regenerate</button>
              <button className="btn btn-secondary btn-sm" onClick={handleExport}>📤 Export Path</button>
            </div>
          </div>

          {/* Progress overview */}
          <div className="card card-p" style={{ marginTop: '20px', background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1))', borderColor: 'rgba(99,102,241,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {[
                  [pct + '%', 'Complete'],
                  [completedCount, 'Courses done'],
                  [totalCourses - completedCount, 'Remaining'],
                  [path.phases.length, 'Phases'],
                ].map(([val, lbl], i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ width: '1px', background: 'var(--border-subtle)' }} />}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: 800, lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{lbl}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Overall Progress</span>
                  <span style={{ fontWeight: 700 }}>{pct}%</span>
                </div>
                <div className="progress-bar-wrap" style={{ height: '10px' }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  🏁 Goal: {path.totalDuration || ''}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phases */}
        <div id="phases-container">
          {path.phases.map((phase, i) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              index={i}
              completedIds={progress.completedCourseIds}
              onToggleComplete={handleToggleComplete}
              onToggleBookmark={handleToggleBookmark}
              onExplain={handleExplain}
            />
          ))}
        </div>

        {/* Completion CTA */}
        {pct === 100 && (
          <div style={{ textAlign: 'center', padding: '40px', background: 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,182,212,0.1))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏆</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>Path Complete!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Incredible work, {profile.name}! You've completed all {totalCourses} courses.
            </p>
            <button className="btn btn-primary" onClick={handleRegenerate}>🚀 Generate Advanced Path</button>
          </div>
        )}
      </div>

      {/* Explain Modal */}
      {explainData && (
        <ExplainModal
          course={explainData.course}
          explanation={explainData.explanation}
          onClose={() => setExplainData(null)}
        />
      )}
    </section>
  );
}
