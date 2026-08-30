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
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'rgba(10, 15, 30, 0.96)', border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '20px', padding: '28px', maxWidth: '540px', width: '100%',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)', color: '#f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '36px', padding: '10px', background: 'rgba(99,102,241,0.15)', borderRadius: '12px' }}>
            {course.icon || '🧠'}
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔬 ML Course Explainability
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '2px 0 0 0', color: '#ffffff' }}>
              {course.title}
            </h3>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(99,102,241,0.2)', color: '#c7d2fe' }}>
            {course.provider || 'Verified Course'}
          </span>
          <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }}>
            {course.level || 'All Levels'}
          </span>
          {course.rating && (
            <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(245,158,11,0.15)', color: '#fde68a' }}>
              ⭐ {course.rating}
            </span>
          )}
        </div>

        {/* AI & ML Reasoning Box */}
        <div style={{
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: '14px', padding: '16px', fontSize: '13.5px', lineHeight: 1.6,
          color: '#e2e8f0', marginBottom: '18px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#c7d2fe', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>💡</span> Why this was recommended:
          </div>
          {loading ? (
            <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Analyzing ML semantic ranking and skill gap...</div>
          ) : (
            displayExplanation
          )}
        </div>

        {/* Quantified Skill Gap Breakdown */}
        {skillGaps && Object.keys(skillGaps).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
              📊 Target Competency Uplift:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(skillGaps).map(([skill, gap]) => (
                <div key={skill} style={{
                  padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', color: '#cbd5e1'
                }}>
                  <strong style={{ color: '#ffffff' }}>{skill}</strong>: +{typeof gap === 'number' ? gap.toFixed(1) : gap} mastery points
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Taught */}
        {course.skills && course.skills.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
              🎯 Skills Covered:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {course.skills.map((s, idx) => (
                <span key={idx} style={{
                  fontSize: '11px', padding: '3px 8px', borderRadius: '6px',
                  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#c7d2fe'
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
              style={{
                flex: 1, padding: '11px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff', textDecoration: 'none', fontWeight: 700, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '13px'
              }}
            >
              🚀 Launch Course Material
            </a>
          ) : null}
          <button
            onClick={onClose}
            style={{
              padding: '11px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
              color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.12)', fontWeight: 600,
              cursor: 'pointer', fontSize: '13px'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
