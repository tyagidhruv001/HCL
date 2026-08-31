import { useState, useMemo } from 'react';

const DOMAIN_DATA = {
  all: { label: 'All Competencies', icon: '🌐' },
  web: { label: 'Web Dev', icon: '💻' },
  data: { label: 'Data Science', icon: '📊' },
  ai: { label: 'AI & ML', icon: '🤖' },
  cloud: { label: 'Cloud & DevOps', icon: '☁️' },
  cyber: { label: 'Cybersecurity', icon: '🔒' },
  design: { label: 'UI/UX Design', icon: '🎨' },
};

// Built-in fallback knowledge tree DAG
const FALLBACK_GRAPH = {
  nodes: [
    { id: 'html_css', name: 'HTML5 & Modern CSS', domain: 'web', level: 'beginner', description: 'Semantic structure, Flexbox, Grid, and responsive web foundations.', prerequisites: [], enables: ['javascript', 'ui_design'] },
    { id: 'javascript', name: 'JavaScript Deep Dive', domain: 'web', level: 'beginner', description: 'ES6+ syntax, asynchronous programming, DOM, and event loop.', prerequisites: ['html_css'], enables: ['react_basics', 'node_backend'] },
    { id: 'react_basics', name: 'React 19 & State Architecture', domain: 'web', level: 'intermediate', description: 'Components, hooks, context API, and virtual DOM reconciliation.', prerequisites: ['javascript'], enables: ['nextjs_fullstack'] },
    { id: 'python_core', name: 'Python Core Programming', domain: 'data', level: 'beginner', description: 'Object-oriented programming, data structures, and generators.', prerequisites: [], enables: ['pandas_analytics', 'ml_foundations'] },
    { id: 'pandas_analytics', name: 'Pandas & Data Wrangling', domain: 'data', level: 'intermediate', description: 'Tabular manipulation, data cleaning, and statistical aggregations.', prerequisites: ['python_core'], enables: ['ml_foundations'] },
    { id: 'ml_foundations', name: 'Machine Learning Engineering', domain: 'ai', level: 'intermediate', description: 'Supervised/unsupervised algorithms, evaluation metrics, scikit-learn.', prerequisites: ['python_core', 'pandas_analytics'], enables: ['deep_learning_llm'] },
    { id: 'deep_learning_llm', name: 'LLMs & Agentic AI', domain: 'ai', level: 'advanced', description: 'Transformer architectures, prompt engineering, fine-tuning, embeddings.', prerequisites: ['ml_foundations'], enables: [] },
    { id: 'docker_cloud', name: 'Docker & Containerization', domain: 'cloud', level: 'intermediate', description: 'Microservices architecture, Dockerfiles, compose, multi-stage builds.', prerequisites: [], enables: ['k8s_devops'] },
    { id: 'k8s_devops', name: 'Kubernetes & CI/CD Pipelines', domain: 'cloud', level: 'advanced', description: 'Cluster orchestration, ingress, GitHub Actions, Helm charts.', prerequisites: ['docker_cloud'], enables: [] }
  ]
};

export default function SkillGraphView({ onStartQuiz, onClose }) {
  const [graphData] = useState(FALLBACK_GRAPH);
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(FALLBACK_GRAPH.nodes[0]);

  const filteredNodes = useMemo(() => {
    let list = graphData.nodes || [];
    if (selectedDomain !== 'all') {
      list = list.filter(n => (n.domain || '').toLowerCase() === selectedDomain.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q));
    }
    return list;
  }, [graphData.nodes, selectedDomain, searchQuery]);

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
        padding: '26px 30px',
        maxWidth: '960px',
        width: '95vw',
        height: '85vh',
        display: 'flex',
        flexDirection: 'column',
        color: 'var(--ink)',
        boxShadow: 'var(--shadow)',
        boxSizing: 'border-box'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1.5px solid var(--contour-active)', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ochre)', background: 'rgba(199, 110, 26, 0.1)', border: '1px solid rgba(199, 110, 26, 0.25)', padding: '2px 9px', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>
              🕸️ Knowledge Graph DAG
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 600, marginTop: '6px', color: 'var(--pine)', fontFamily: 'var(--font-serif)', margin: '6px 0 0 0' }}>
              Prerequisite Competency Tree
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--slate-subtle)', fontSize: '20px', cursor: 'pointer', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(DOMAIN_DATA).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setSelectedDomain(key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '2px',
                  fontSize: '0.76rem',
                  fontWeight: selectedDomain === key ? 700 : 500,
                  fontFamily: 'var(--font-mono)',
                  border: `1px solid ${selectedDomain === key ? 'var(--pine)' : 'var(--border)'}`,
                  background: selectedDomain === key ? 'var(--pine)' : 'var(--paper)',
                  color: selectedDomain === key ? 'var(--paper)' : 'var(--slate)',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <span>{info.icon}</span> {info.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search competencies..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--border)',
              borderRadius: '2px',
              padding: '6px 12px',
              color: 'var(--ink)',
              fontSize: '0.82rem',
              outline: 'none',
              width: '180px'
            }}
          />
        </div>

        {/* Main Grid: Nodes list (Left) + Node details inspector (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          
          {/* Node Grid */}
          <div style={{
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '10px',
            paddingRight: '6px',
            alignContent: 'start'
          }}>
            {filteredNodes.map(node => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    background: isSelected ? 'rgba(24, 55, 40, 0.08)' : 'var(--paper)',
                    border: `1.5px solid ${isSelected ? 'var(--pine)' : 'var(--border)'}`,
                    borderRadius: '3px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(24, 55, 40, 0.08)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--ochre)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                      {node.domain}
                    </span>
                    <span style={{ fontSize: '0.66rem', color: 'var(--slate-subtle)', background: 'var(--paper-card)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>
                      {node.level}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--pine)', marginBottom: '4px', fontFamily: 'var(--font-serif)', lineHeight: 1.3 }}>
                    {node.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspector Details */}
          {selectedNode && (
            <div style={{
              background: 'var(--paper)',
              border: '1.5px solid var(--contour-active)',
              borderRadius: '3px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              overflowY: 'auto'
            }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '2px',
                    background: 'rgba(24, 55, 40, 0.1)',
                    color: 'var(--pine)',
                    border: '1px solid var(--contour-active)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {DOMAIN_DATA[selectedNode.domain]?.icon} {DOMAIN_DATA[selectedNode.domain]?.label}
                  </span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--slate-subtle)', fontFamily: 'var(--font-mono)' }}>
                    Level: <strong style={{ color: 'var(--pine)' }}>{selectedNode.level}</strong>
                  </span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--pine)', marginBottom: '8px', fontFamily: 'var(--font-serif)', margin: '8px 0' }}>
                  {selectedNode.name}
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--slate)', lineHeight: 1.55, marginBottom: '16px' }}>
                  {selectedNode.description}
                </p>

                {/* Prerequisites */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ochre)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                    ⬅️ Required Prerequisites
                  </div>
                  {selectedNode.prerequisites?.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedNode.prerequisites.map(p => (
                        <span key={p} style={{ fontSize: '0.74rem', background: 'rgba(199, 110, 26, 0.1)', color: 'var(--ochre)', border: '1px solid var(--ochre)', padding: '2px 8px', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--slate-subtle)', fontFamily: 'var(--font-mono)' }}>None (Foundational Entry Point)</span>
                  )}
                </div>

                {/* Unlocks / Enables */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--pine)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                    ➡️ Unlocks Next
                  </div>
                  {selectedNode.enables?.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedNode.enables.map(e => (
                        <span key={e} style={{ fontSize: '0.74rem', background: 'rgba(24, 55, 40, 0.1)', color: 'var(--pine)', border: '1px solid var(--pine)', padding: '2px 8px', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>
                          {e}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--slate-subtle)', fontFamily: 'var(--font-mono)' }}>Terminal Capstone Topic</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  className="btn-primary"
                  onClick={() => onStartQuiz(selectedNode.name, selectedNode.level)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  🧪 Test This Skill
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

