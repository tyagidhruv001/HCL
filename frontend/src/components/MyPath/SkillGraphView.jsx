import React, { useState, useMemo } from 'react';

const DOMAIN_DATA = {
  all: { label: 'All Competencies', icon: '🌐', color: '#6366f1' },
  web: { label: 'Web Dev', icon: '💻', color: '#38bdf8' },
  data: { label: 'Data Science', icon: '📊', color: '#34d399' },
  ai: { label: 'AI & ML', icon: '🤖', color: '#a855f7' },
  cloud: { label: 'Cloud & DevOps', icon: '☁️', color: '#f59e0b' },
  cyber: { label: 'Cybersecurity', icon: '🔒', color: '#ef4444' },
  design: { label: 'UI/UX Design', icon: '🎨', color: '#ec4899' },
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
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '16px'
      }}
      role="dialog"
      aria-modal="true"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'rgba(10, 15, 30, 0.96)', border: '1px solid rgba(99, 102, 241, 0.35)',
        borderRadius: '20px', padding: '24px', maxWidth: '960px', width: '95vw',
        height: '85vh', display: 'flex', flexDirection: 'column', color: '#f1f5f9',
        boxSizing: 'border-box'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#c7d2fe', background: 'rgba(99,102,241,0.2)', padding: '2px 10px', borderRadius: '9999px' }}>
              🕸️ Knowledge Graph DAG
            </span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '6px', color: '#f8fafc' }}>
              Prerequisite Competency Tree
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
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
                  padding: '4px 12px', borderRadius: '9999px', fontSize: '12px',
                  fontWeight: selectedDomain === key ? 700 : 500,
                  border: `1px solid ${selectedDomain === key ? info.color : 'rgba(255,255,255,0.08)'}`,
                  background: selectedDomain === key ? `${info.color}25` : 'transparent',
                  color: selectedDomain === key ? '#ffffff' : '#94a3b8',
                  cursor: 'pointer'
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
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '6px 12px', color: '#ffffff', fontSize: '12px',
              outline: 'none', width: '180px'
            }}
          />
        </div>

        {/* Main Grid: Nodes list (Left) + Node details inspector (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          
          {/* Node Grid */}
          <div style={{
            overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '10px', paddingRight: '6px', alignContent: 'start'
          }}>
            {filteredNodes.map(node => {
              const isSelected = selectedNode?.id === node.id;
              const domainColor = DOMAIN_DATA[node.domain]?.color || '#6366f1';
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isSelected ? domainColor : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '12px', padding: '12px', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: domainColor, textTransform: 'uppercase' }}>
                      {node.domain}
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                      {node.level}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                    {node.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.description}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspector Details */}
          {selectedNode && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column',
              justifyContent: 'space-between', overflowY: 'auto'
            }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
                    background: `${DOMAIN_DATA[selectedNode.domain]?.color || '#6366f1'}33`,
                    color: DOMAIN_DATA[selectedNode.domain]?.color || '#6366f1'
                  }}>
                    {DOMAIN_DATA[selectedNode.domain]?.icon} {DOMAIN_DATA[selectedNode.domain]?.label}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Level: <strong>{selectedNode.level}</strong>
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '10px' }}>
                  {selectedNode.name}
                </h3>
                <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6, marginBottom: '16px' }}>
                  {selectedNode.description}
                </p>

                {/* Prerequisites */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    ⬅️ Required Prerequisites
                  </div>
                  {selectedNode.prerequisites?.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedNode.prerequisites.map(p => (
                        <span key={p} style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>None (Foundational Entry Point)</span>
                  )}
                </div>

                {/* Unlocks / Enables */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    ➡️ Unlocks Next
                  </div>
                  {selectedNode.enables?.length > 0 ? (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedNode.enables.map(e => (
                        <span key={e} style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: '6px' }}>
                          {e}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Terminal Capstone Topic</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  onClick={() => onStartQuiz(selectedNode.name, selectedNode.level)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '10px', background: '#6366f1',
                    color: '#ffffff', border: 'none', fontWeight: 700, cursor: 'pointer'
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
