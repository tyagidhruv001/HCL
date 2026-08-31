export default function ProjectBriefModal({ course, onLaunchFocus, onClose }) {
  if (!course) return null;

  const skills = course.skills || ['Problem Solving', 'Architecture', 'Clean Code'];
  const resourceUrl = course.url && course.url !== '#' 
    ? course.url 
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(course.title + ' tutorial implementation')}`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14, 26, 20, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--paper-card)',
        border: '1.5px solid var(--contour-active)',
        borderRadius: '4px',
        padding: '28px',
        maxWidth: '640px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow)',
        color: 'var(--ink)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.5px solid var(--contour-active)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '28px', padding: '10px', background: 'var(--paper)', borderRadius: '3px', border: '1px solid var(--border)' }}>
              {course.icon || '🛠️'}
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ochre)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                📋 Project Specification & Briefing
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, margin: '3px 0 0 0', color: 'var(--pine)', fontFamily: 'var(--font-serif)' }}>
                {course.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--slate-subtle)',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px 8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Metadata Badges */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.74rem', padding: '3px 9px', borderRadius: '2px', background: 'var(--paper)', color: 'var(--slate)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
            🏷️ {course.provider || 'Self-Guided Lab'}
          </span>
          <span style={{ fontSize: '0.74rem', padding: '3px 9px', borderRadius: '2px', background: 'rgba(24, 55, 40, 0.1)', color: 'var(--pine)', border: '1px solid var(--contour-active)', fontFamily: 'var(--font-mono)' }}>
            📊 {course.level || 'Intermediate'}
          </span>
          <span style={{ fontSize: '0.74rem', padding: '3px 9px', borderRadius: '2px', background: 'rgba(199, 110, 26, 0.1)', color: 'var(--ochre)', border: '1px solid rgba(199, 110, 26, 0.25)', fontFamily: 'var(--font-mono)' }}>
            ⏱️ Est. {course.duration || '10h'}
          </span>
        </div>

        {/* 1. Project Goal & AI Rationale */}
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--ochre)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            <span>🎯</span> Project Objective & Purpose:
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--slate)' }}>
            {course.why || `Build and deploy a complete, working implementation of "${course.title}". This project is designed to bridge theoretical concepts into real-world software architecture.`}
          </p>
        </div>

        {/* 2. Structured Implementation Milestones */}
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--border)',
          borderRadius: '3px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--pine)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            <span>📋</span> Step-by-Step Implementation Plan:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.86rem', lineHeight: 1.55, color: 'var(--slate)' }}>
              <strong style={{ color: 'var(--ochre)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>Step 1:</strong>
              <div><strong style={{ color: 'var(--pine)' }}>Architecture & Setup:</strong> Initialize repository, configure environment dependencies, and set up project scaffolding.</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.86rem', lineHeight: 1.55, color: 'var(--slate)' }}>
              <strong style={{ color: 'var(--ochre)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>Step 2:</strong>
              <div><strong style={{ color: 'var(--pine)' }}>Core Engine & Logic:</strong> Implement foundational functions, data structures, and the main algorithmic processing loop.</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.86rem', lineHeight: 1.55, color: 'var(--slate)' }}>
              <strong style={{ color: 'var(--ochre)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>Step 3:</strong>
              <div><strong style={{ color: 'var(--pine)' }}>Testing & Verification:</strong> Write unit tests, test edge cases, and ensure performance benchmarks are met.</div>
            </div>
          </div>
        </div>

        {/* 3. Tech Stack & Skills Tag */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-subtle)', marginBottom: '8px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
            🛠️ Skills & Technologies to Master:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {skills.map((skill, sIdx) => (
              <span key={sIdx} style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '2px',
                background: 'var(--paper)',
                border: '1.5px solid var(--contour-active)',
                color: 'var(--pine)',
                fontFamily: 'var(--font-mono)'
              }}>
                +{skill}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href={resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              flex: 1,
              minWidth: '180px',
              padding: '10px',
              textDecoration: 'none',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.86rem'
            }}
          >
            🌐 Open Project Resources & Docs ↗
          </a>

          {onLaunchFocus && (
            <button
              onClick={() => { onClose(); onLaunchFocus(course.title); }}
              className="btn-outline"
              style={{
                padding: '10px 16px',
                fontSize: '0.84rem'
              }}
            >
              ⏱️ Start in Focus Studio
            </button>
          )}

          <button
            onClick={onClose}
            className="btn-outline"
            style={{
              padding: '10px 18px',
              fontSize: '0.84rem'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
