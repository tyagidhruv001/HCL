import React, { useState, useEffect } from 'react';
import mlService from '../../services/mlService.js';

export default function ExplainModal({ course, explanation, learner, onClose }) {
  const [mlData, setMlData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchMLExplanation() {
      if (!course) return;
      setLoading(true);
      try {
        const res = await mlService.explainRecommendation(learner || {}, {
          id: course.id || 'c1',
          title: course.title || '',
          provider: course.provider || 'Coursera',
          level: course.level || 'intermediate',
          skills_taught: course.skills || [],
        });
        if (isMounted && res?.data) {
          setMlData(res.data);
        }
      } catch (err) {
        console.warn('ML Explain fallback:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchMLExplanation();
    return () => { isMounted = false; };
  }, [course]);

  if (!course) return null;

  const displayExplanation = mlData?.explanation || explanation || course.why || 'This milestone was selected to build core competency in this phase.';
  const skillGaps = mlData?.skill_gap_addressed;

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
        maxWidth: '540px',
        width: '100%',
        boxShadow: 'var(--shadow)',
        color: 'var(--ink)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.5px solid var(--contour-active)' }}>
          <div style={{ fontSize: '28px', padding: '10px', background: 'var(--paper)', borderRadius: '3px', border: '1px solid var(--border)' }}>
            {course.icon || '🧠'}
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ochre)', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
              🔬 ML Course Explainability
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 600, margin: '2px 0 0 0', color: 'var(--pine)', fontFamily: 'var(--font-serif)' }}>
              {course.title}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.74rem', padding: '3px 9px', borderRadius: '2px', background: 'var(--paper)', color: 'var(--slate)', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
            {course.provider || 'Verified Course'}
          </span>
          <span style={{ fontSize: '0.74rem', padding: '3px 9px', borderRadius: '2px', background: 'rgba(24, 55, 40, 0.1)', color: 'var(--pine)', border: '1px solid var(--contour-active)', fontFamily: 'var(--font-mono)' }}>
            {course.level || 'All Levels'}
          </span>
          {course.rating && (
            <span style={{ fontSize: '0.74rem', padding: '3px 9px', borderRadius: '2px', background: 'rgba(199, 110, 26, 0.1)', color: 'var(--ochre)', border: '1px solid rgba(199, 110, 26, 0.25)', fontFamily: 'var(--font-mono)' }}>
              ⭐ {course.rating}
            </span>
          )}
        </div>

        {/* AI & ML Reasoning Box */}
        <div style={{
          background: 'var(--paper)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid var(--ochre)',
          borderRadius: '0 3px 3px 0',
          padding: '16px',
          fontSize: '0.88rem',
          lineHeight: 1.6,
          color: 'var(--slate)',
          marginBottom: '18px'
        }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--ochre)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
            <span>💡</span> Why this was recommended:
          </div>
          {loading ? (
            <div style={{ color: 'var(--slate-subtle)', fontStyle: 'italic' }}>Analyzing ML semantic ranking and skill gap...</div>
          ) : (
            displayExplanation
          )}
        </div>

        {/* Quantified Skill Gap Breakdown */}
        {skillGaps && Object.keys(skillGaps).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-subtle)', marginBottom: '8px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              📊 Target Competency Uplift:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(skillGaps).map(([skill, gap]) => (
                <div key={skill} style={{
                  padding: '6px 12px',
                  borderRadius: '2px',
                  background: 'var(--paper)',
                  border: '1px solid var(--border)',
                  fontSize: '0.78rem',
                  color: 'var(--slate)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <strong style={{ color: 'var(--pine)' }}>{skill}</strong>: +{typeof gap === 'number' ? gap.toFixed(1) : gap} mastery points
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Taught */}
        {course.skills && course.skills.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate-subtle)', marginBottom: '8px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
              🎯 Skills Covered:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {course.skills.map((s, idx) => (
                <span key={idx} style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '2px',
                  background: 'var(--paper)',
                  border: '1.5px solid var(--contour-active)',
                  color: 'var(--pine)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          {course.url && course.url !== '#' ? (
            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                flex: 1,
                padding: '10px',
                textDecoration: 'none',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.86rem'
              }}
            >
              🚀 Launch Course Material
            </a>
          ) : null}
          <button
            onClick={onClose}
            className="btn-outline"
            style={{
              padding: '10px 20px',
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
