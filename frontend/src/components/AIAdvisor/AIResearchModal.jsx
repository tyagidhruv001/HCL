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
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'rgba(10, 15, 30, 0.98)', border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '24px', maxWidth: '820px', width: '100%', maxHeight: '88vh',
        boxShadow: '0 24px 70px rgba(0, 0, 0, 0.8)', color: '#f1f5f9', display: 'flex',
        flexDirection: 'column', overflow: 'hidden'
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '20px'
            }}>
              🔬
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                AI Deep Research & Video Masterclasses
              </h2>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Powered by ML Semantic Engine, Web Search & Grounded YouTube Tutorials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%', width: '32px', height: '32px', color: '#cbd5e1',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Search Bar & Suggestions */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Ask any technical concept (e.g. Master Microservices, Explain Graph BFS vs DFS)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              style={{
                flex: 1, padding: '12px 18px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(99, 102, 241, 0.35)', color: '#ffffff', fontSize: '14px', outline: 'none'
              }}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={{
                padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '14px',
                display: 'flex', alignItems: 'center', gap: '8px'
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
                  fontSize: '11px', padding: '4px 10px', borderRadius: '9999px',
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                  color: '#c7d2fe', cursor: 'pointer'
                }}
              >
                💡 {q}
              </button>
            ))}
          </div>
        </div>

        {/* Results Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {loading && (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div style={{ fontSize: '42px', marginBottom: '14px', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>⟳</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#a5b4fc', margin: 0 }}>
                Synthesizing research & indexing video masterclasses...
              </h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>Querying ML Embeddings and YouTube grounded resources</p>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px', padding: '16px', color: '#fca5a5', fontSize: '13px', textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          {!loading && !result && !error && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔬</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Deep Technical Concept Research
              </h3>
              <p style={{ fontSize: '13px', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
                Type any algorithm, framework, or architectural pattern to receive a structured explanation, core takeaways, and top video tutorials.
              </p>
            </div>
          )}

          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

              {/* Key Points Takeaway Box */}
              {result.key_points && result.key_points.length > 0 && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '16px', padding: '18px 20px'
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#c7d2fe', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📌 Key Concept Takeaways:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#e2e8f0', fontSize: '13.5px', lineHeight: 1.6 }}>
                    {result.key_points.map((pt, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Main Structured Answer */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '20px', fontSize: '14px', lineHeight: 1.7, color: '#e2e8f0',
                whiteSpace: 'pre-line'
              }}>
                {result.answer}
              </div>

              {/* YouTube Video Tutorials Carousel */}
              {result.videos && result.videos.length > 0 && (
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px', overflow: 'hidden', textDecoration: 'none', color: '#f1f5f9',
                          transition: 'transform 0.2s', display: 'flex', flexDirection: 'column'
                        }}
                      >
                        {v.thumbnail ? (
                          <img src={v.thumbnail} alt={v.title} style={{ width: '100%', height: '110px', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '110px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                            ▶️
                          </div>
                        )}
                        <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ffffff', lineHeight: 1.4, marginBottom: '6px' }}>
                            {v.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
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
          padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            🟢 ML Service Connected (Port 8001)
          </span>
          {onNavigateToPath && (
            <button
              onClick={() => { onClose(); onNavigateToPath(); }}
              style={{
                padding: '8px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', color: '#ffffff', fontWeight: 700, cursor: 'pointer', fontSize: '12px'
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
