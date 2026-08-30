import React from 'react';

export default function ProjectBriefModal({ course, phaseTitle, onLaunchFocus, onClose }) {
  if (!course) return null;

  const isProject = /project|capstone|simulator|build|hands-on|lab|implementation/i.test(course.title || '') ||
                    /project|capstone|simulator|build|hands-on|lab/i.test(course.provider || '');

  const skills = course.skills || ['Problem Solving', 'Architecture', 'Clean Code'];
  const resourceUrl = course.url && course.url !== '#' 
    ? course.url 
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(course.title + ' tutorial implementation')}`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 60%), #0d1117',
        border: '1.5px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '20px', padding: '28px', maxWidth: '640px', width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 25px 70px rgba(0, 0, 0, 0.8)', color: '#f0f6fc',
        fontFamily: 'inherit'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '32px', padding: '10px', background: 'rgba(99,102,241,0.15)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.3)' }}>
              {course.icon || '🛠️'}
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                📋 Project Specification & Briefing
              </div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: '3px 0 0 0', color: '#ffffff' }}>
                {course.title}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px', width: '30px', height: '30px', color: '#94a3b8',
              cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Metadata Badges */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(99,102,241,0.2)', color: '#c7d2fe', border: '1px solid rgba(99,102,241,0.3)' }}>
            🏷️ {course.provider || 'Self-Guided Lab'}
          </span>
          <span style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>
            📊 {course.level || 'Intermediate'}
          </span>
          <span style={{ fontSize: '11.5px', padding: '4px 10px', borderRadius: '9999px', background: 'rgba(56,189,248,0.15)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.3)' }}>
            ⏱️ Est. {course.duration || '10h'}
          </span>
        </div>

        {/* 1. Project Goal & AI Rationale */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)', border: '1px solid #30363d',
          borderRadius: '12px', padding: '16px', marginBottom: '16px'
        }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#79c0ff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🎯</span> Project Objective & Purpose:
          </div>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: '#e6edf3' }}>
            {course.why || `Build and deploy a complete, working implementation of "${course.title}". This project is designed to bridge theoretical concepts into real-world software architecture.`}
          </p>
        </div>

        {/* 2. Structured Implementation Milestones */}
        <div style={{
          background: 'rgba(22, 27, 34, 0.8)', border: '1px solid #30363d',
          borderRadius: '12px', padding: '16px', marginBottom: '16px'
        }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#a5b4fc', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📋</span> Step-by-Step Implementation Plan:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5, color: '#cbd5e1' }}>
              <strong style={{ color: '#818cf8', flexShrink: 0 }}>Step 1:</strong>
              <div><strong>Architecture & Setup:</strong> Initialize repository, configure environment dependencies, and set up project scaffolding.</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5, color: '#cbd5e1' }}>
              <strong style={{ color: '#818cf8', flexShrink: 0 }}>Step 2:</strong>
              <div><strong>Core Engine & Logic:</strong> Implement foundational functions, data structures, and the main algorithmic processing loop.</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', lineHeight: 1.5, color: '#cbd5e1' }}>
              <strong style={{ color: '#818cf8', flexShrink: 0 }}>Step 3:</strong>
              <div><strong>Testing & Verification:</strong> Write unit tests, test edge cases, and ensure performance benchmarks are met.</div>
            </div>
          </div>
        </div>

        {/* 3. Tech Stack & Skills Tag */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#8b949e', marginBottom: '8px', textTransform: 'uppercase' }}>
            🛠️ Skills & Technologies to Master:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {skills.map((skill, sIdx) => (
              <span key={sIdx} style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '6px',
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#c7d2fe'
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
            style={{
              flex: 1, minWidth: '180px', padding: '12px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#ffffff', textDecoration: 'none', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', fontSize: '13.5px', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
            }}
          >
            🌐 Open Project Resources & Docs ↗
          </a>

          {onLaunchFocus && (
            <button
              onClick={() => { onClose(); onLaunchFocus(course.title); }}
              style={{
                padding: '12px 18px', borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#6ee7b7', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
              }}
            >
              ⏱️ Start in Focus Studio
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: '12px 20px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#cbd5e1', fontWeight: 600, cursor: 'pointer', fontSize: '13px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
