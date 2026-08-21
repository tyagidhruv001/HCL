import React, { useState, useMemo } from 'react';
import { Storage, Sanitize } from '../../utils/storage.js';
import { CourseCatalog } from '../../features/courses/courses.js';
import { useToast } from '../../context/ToastContext.jsx';

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

const DOMAIN_BADGE = {
  web:    'badge-indigo',
  data:   'badge-cyan',
  ai:     'badge-violet',
  cloud:  'badge-indigo',
  cyber:  'badge-rose',
  design: 'badge-amber',
};

function CourseCard({ course, isComplete, onMarkComplete, onMarkIncomplete }) {
  const url = safeUrl(course.url);
  return (
    <div className={`course-card${isComplete ? ' completed' : ''}`}>
      <div className="course-card-top">
        <span className="course-icon">{course.icon || '📖'}</span>
        <span className={`badge ${DOMAIN_BADGE[course.domain] || 'badge-indigo'}`}>{course.domain}</span>
      </div>
      <div className="course-title">{course.title}</div>
      <div className="course-provider">by {course.provider}</div>
      <div className="course-tags">
        {(course.tags || []).slice(0, 3).map(t => (
          <span key={t} className="course-tag">{t}</span>
        ))}
      </div>
      <div className="course-meta" style={{ marginBottom: '10px' }}>
        <span>⏱️ {course.duration}</span>
        <span>⭐ {course.rating}</span>
        <span>🎯 {course.level}</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
        {course.description}
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
          {isComplete ? '✅ Done — Revisit' : '🚀 Start'}
        </a>
        {isComplete
          ? <button className="btn btn-ghost btn-sm" onClick={() => onMarkIncomplete(course.id)}>✗ Undo</button>
          : <button className="btn btn-secondary btn-sm" onClick={() => onMarkComplete(course.id)}>✓ Done</button>
        }
      </div>
    </div>
  );
}

export default function Explore() {
  const { showToast } = useToast();
  const [search,  setSearch]  = useState('');
  const [domain,  setDomain]  = useState('');
  const [level,   setLevel]   = useState('');
  const [version, setVersion] = useState(0); // bumped to force re-read of progress

  const completedIds = useMemo(() => {
    return Storage.getProgress().completedCourseIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const courses = useMemo(() => {
    const q = search.trim();
    let list = q ? CourseCatalog.search(q) : [...CourseCatalog.all];
    if (domain) list = list.filter(c => c.domain === domain);
    if (level)  list = list.filter(c => c.level  === level);
    list.sort((a, b) => {
      const aD = completedIds.includes(a.id) ? 1 : 0;
      const bD = completedIds.includes(b.id) ? 1 : 0;
      return aD - bD;
    });
    return list;
  }, [search, domain, level, completedIds]);

  const handleMarkComplete = (courseId) => {
    if (!Sanitize.courseId(courseId)) return;
    Storage.markCourseComplete(courseId);
    showToast('✅ Marked complete!', 'success');
    setVersion(v => v + 1);
  };

  const handleMarkIncomplete = (courseId) => {
    if (!Sanitize.courseId(courseId)) return;
    Storage.markCourseIncomplete(courseId);
    showToast('Course marked incomplete', 'info');
    setVersion(v => v + 1);
  };

  return (
    <section id="view-explore" className="view active">
      <div className="page-content">
        <div style={{ marginBottom: '24px' }}>
          <h1 className="section-title">Explore Courses</h1>
          <p className="section-subtitle">Browse our curated catalogue of {CourseCatalog.all.length} courses across 6 domains</p>
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            id="explore-search"
            className="form-input"
            placeholder="🔍 Search courses, skills, topics..."
            style={{ flex: 1, minWidth: '200px' }}
            maxLength={100}
            autoComplete="off"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            id="explore-domain"
            className="form-select"
            style={{ width: '180px' }}
            value={domain}
            onChange={e => setDomain(e.target.value)}
          >
            <option value="">All Domains</option>
            <option value="web">🌐 Web Development</option>
            <option value="data">📊 Data Science</option>
            <option value="ai">🤖 AI / ML</option>
            <option value="cloud">☁️ Cloud & DevOps</option>
            <option value="cyber">🔒 Cybersecurity</option>
            <option value="design">🎨 UI/UX Design</option>
          </select>
          <select
            id="explore-level"
            className="form-select"
            style={{ width: '160px' }}
            value={level}
            onChange={e => setLevel(e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="beginner">🌱 Beginner</option>
            <option value="intermediate">🚀 Intermediate</option>
            <option value="advanced">⚡ Advanced</option>
          </select>
        </div>

        {/* Course Grid */}
        {courses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', gridColumn: '1/-1' }}>
            No courses found. Try a different search.
          </div>
        ) : (
          <div className="grid-auto" id="explore-grid">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isComplete={completedIds.includes(course.id)}
                onMarkComplete={handleMarkComplete}
                onMarkIncomplete={handleMarkIncomplete}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
