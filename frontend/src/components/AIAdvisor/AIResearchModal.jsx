import React, { useState } from 'react';
import mlService from '../../services/mlService.js';

export default function AIResearchModal({ initialQuery = '', userProfile = {}, onClose, onNavigateToPath }) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const POPULAR_QUERIES = [
    'How do React 19 Server Actions work?',
    'What is Dynamic Programming and how do I identify subproblems?',
    'Prerequisites to master Large Language Models and Transformers',
    'Explain Docker containerization vs Virtual Machines',
    'How to design a scalable URL shortener system?',
  ];

  const handleSearch = async (targetQuery = null) => {
    const q = (targetQuery || query || '').trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await mlService.ask(q, {
        goal: userProfile.goal || 'Software Engineering',
        experience_level: userProfile.level?.toLowerCase() || 'intermediate',
      });
      if (res?.data) {
        setResult(res.data);
      } else {
        throw new Error('No answer received from research engine');
      }
    } catch (err) {
      console.error('AI Research error:', err);
      setError('Could not connect to the ML research engine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: '820px',
        width: '100%',
        maxHeight: '88vh',
        boxShadow: 'var(--shadow)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1.5px solid var(--contour-active)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--paper-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '3px',
              background: 'rgba(24, 55, 40, 0.1)',
              border: '1px solid var(--contour-active)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              🔬
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 600, margin: 0, color: 'var(--pine)', fontFamily: 'var(--font-serif)' }}>
                AI Deep Research & Video Masterclasses
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--slate-subtle)', margin: '2px 0 0 0', fontFamily: 'var(--font-mono)' }}>
                Powered by ML Semantic Engine, Web Search & Grounded YouTube Tutorials
              </p>
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

        {/* Search Bar & Suggestions */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--contour-faint)', background: 'var(--paper)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Ask any technical concept (e.g. Master Microservices, Explain Graph BFS vs DFS)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '3px',
                background: 'var(--paper-card)',
                border: '1.5px solid var(--border)',
                color: 'var(--ink)',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="btn-primary"
              style={{
                padding: '10px 22px',
                borderRadius: '3px',
                fontWeight: 700,
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? '⏳ Researching...' : '🔍 Research'}
            </button>
          </div>

          {/* Prompt Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {POPULAR_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => { setQuery(q); handleSearch(q); }}
                style={{
                  fontSize: '0.74rem',
                  padding: '3px 10px',
                  borderRadius: '2px',
                  background: 'var(--paper-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--slate)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                💡 {q}
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--paper-card)' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ fontSize: '38px', marginBottom: '14px', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--pine)', margin: 0, fontFamily: 'var(--font-serif)' }}>
                Synthesizing research & indexing video masterclasses...
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--slate-subtle)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>Querying ML Embeddings and YouTube grounded resources</p>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '3px',
              padding: '16px',
              color: '#b91c1c',
              fontSize: '0.86rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {!loading && !result && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate-subtle)' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔬</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--pine)', marginBottom: '6px', fontFamily: 'var(--font-serif)' }}>
                Deep Technical Concept Research
              </h3>
              <p style={{ fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6, color: 'var(--slate)' }}>
                Type any algorithm, framework, or architectural pattern to receive a structured explanation, core takeaways, and top video tutorials.
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

              {/* Key Points Takeaway Box */}
              {result.key_points && result.key_points.length > 0 && (
                <div style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--border)',
                  borderLeft: '3px solid var(--ochre)',
                  borderRadius: '0 3px 3px 0',
                  padding: '18px 20px'
                }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--ochre)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                    📌 Key Concept Takeaways:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--slate)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                    {result.key_points.map((pt, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Main Structured Answer */}
              <div style={{
                background: 'var(--paper)',
                border: '1px solid var(--border)',
                borderRadius: '3px',
                padding: '20px',
                fontSize: '0.92rem',
                lineHeight: 1.7,
                color: 'var(--ink)',
                whiteSpace: 'pre-line'
              }}>
                {result.answer}
              </div>

              {/* YouTube Video Tutorials Carousel */}
              {result.videos && result.videos.length > 0 && (
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--pine)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-serif)' }}>
                    <span>📺</span> Recommended Video Masterclasses:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                    {result.videos.map((v, idx) => (
                      <a
                        key={idx}
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'var(--paper)',
                          border: '1.5px solid var(--contour-active)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          textDecoration: 'none',
                          color: 'var(--ink)',
                          transition: 'transform 0.2s',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {v.thumbnail ? (
                          <img src={v.thumbnail} alt={v.title} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '110px', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                            ▶️
                          </div>
                        )}
                        <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--pine)', lineHeight: 1.4, marginBottom: '6px', fontFamily: 'var(--font-serif)' }}>
                            {v.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--slate-subtle)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
                            <span>{v.channel || 'YouTube'}</span>
                            {v.duration && <span>⏱️ {v.duration}</span>}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1.5px solid var(--contour-active)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--paper)'
        }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--slate-subtle)', fontFamily: 'var(--font-mono)' }}>
            🟢 ML Service Connected (Port 8001)
          </span>
          {onNavigateToPath && (
            <button
              onClick={() => { onClose(); onNavigateToPath(); }}
              className="btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.8rem'
              }}
            >
              🗺️ Open My Path
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
