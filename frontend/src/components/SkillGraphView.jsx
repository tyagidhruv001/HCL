import React, { useState, useEffect, useMemo } from 'react';
import { KnowledgeAPI } from '../services/knowledge.api.js';
import { Storage } from '../utils/storage.js';
import { useNavigate } from 'react-router-dom';

const DOMAIN_DATA = {
  all: { label: 'All Competencies', icon: '🌐', color: '#6366f1' },
  web: { label: 'Web Dev', icon: '💻', color: '#38bdf8' },
  data: { label: 'Data Science', icon: '📊', color: '#34d399' },
  ai: { label: 'AI & ML', icon: '🤖', color: '#a855f7' },
  cloud: { label: 'Cloud & DevOps', icon: '☁️', color: '#f59e0b' },
  cyber: { label: 'Cybersecurity', icon: '🔒', color: '#ef4444' },
  design: { label: 'UI/UX Design', icon: '🎨', color: '#ec4899' },
};

export default function SkillGraphView({ onStartQuiz, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadGraph() {
      setLoading(true);
      try {
        const res = await KnowledgeAPI.getSkillGraph(selectedDomain);
        const data = res?.data || res;
        if (isMounted && data && data.nodes) {
          setGraphData(data);
          if (!selectedNode && data.nodes.length > 0) {
            setSelectedNode(data.nodes[0]);
          }
        }
      } catch (err) {
        console.warn('Skill graph fetch failed:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadGraph();
    return () => { isMounted = false; };
  }, [selectedDomain]);

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

  const levelBadges = {
    beginner: 'badge-emerald',
    intermediate: 'badge-cyan',
    advanced: 'badge-violet'
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '960px', width: '95vw', height: '85vh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#c7d2fe', background: 'rgba(99,102,241,0.15)', padding: '3px 10px', borderRadius: 'var(--radius-full)', marginBottom: '4px' }}>
              🕸️ Knowledge Graph DAG
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Prerequisite Competency Tree
            </h2>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: '16px' }}>✕</button>
        </div>

        {/* Controls: Domain Pills & Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(DOMAIN_DATA).map(([key, info]) => (
              <button
                key={key}
                onClick={() => setSelectedDomain(key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '12px',
                  fontWeight: selectedDomain === key ? 700 : 500,
                  border: `1px solid ${selectedDomain === key ? info.color : 'var(--border-subtle)'}`,
                  background: selectedDomain === key ? `${info.color}25` : 'transparent',
                  color: selectedDomain === key ? '#ffffff' : 'var(--text-secondary)',
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
            placeholder="Search skills (e.g. Docker, React, PyTorch)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              minWidth: '240px'
            }}
          />
        </div>

        {/* Main Body: Node Grid + Detail Panel */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px', animation: 'spin 1.5s linear infinite' }}>⟳</div>
              <div>Traversing Knowledge Graph prerequisites...</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)', gap: '16px', minHeight: 0 }}>
            
            {/* Left: Scrollable Skills Node Matrix */}
            <div style={{ overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredNodes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No competency nodes found matching your query.
                </div>
              ) : (
                filteredNodes.map(node => {
                  const isSelected = selectedNode?.id === node.id;
                  const domainInfo = DOMAIN_DATA[node.domain] || { label: node.domain, color: 'var(--indigo)' };

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSelected ? domainInfo.color : 'var(--border-subtle)'}`,
                        background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? `0 0 16px ${domainInfo.color}30` : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? '#ffffff' : 'var(--text-primary)' }}>
                          {node.name}
                        </div>
                        <span className={`badge ${levelBadges[node.level] || 'badge-indigo'}`}>
                          {node.level}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span>Domain: <strong style={{ color: domainInfo.color }}>{domainInfo.label}</strong></span>
                        <span>Prereqs: <strong>{(node.prerequisites || []).length}</strong></span>
                        <span>Enables: <strong>{(node.enables || []).length}</strong></span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right: Selected Node Detail & Dependency Flow */}
            {selectedNode ? (
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <span className={`badge ${levelBadges[selectedNode.level] || 'badge-indigo'}`} style={{ marginBottom: '6px' }}>
                      {selectedNode.level.toUpperCase()}
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                      {selectedNode.name}
                    </h3>
                  </div>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {selectedNode.description}
                </p>

                {/* Prerequisite Dependencies */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', marginBottom: '6px' }}>
                    ⬅️ Required Prerequisites:
                  </div>
                  {(selectedNode.prerequisites || []).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedNode.prerequisites.map(p => (
                        <span key={p} className="badge badge-amber" style={{ fontSize: '11px' }}>
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#34d399' }}>✓ Foundation skill (No prerequisites required)</div>
                  )}
                </div>

                {/* Enables Competencies */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>
                    ➡️ Unlocks Next Competencies:
                  </div>
                  {(selectedNode.enables || []).length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedNode.enables.map(e => (
                        <span key={e} className="badge badge-cyan" style={{ fontSize: '11px' }}>
                          {e.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Advanced capstone competency</div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ justifyContent: 'center', width: '100%' }}
                    onClick={() => {
                      if (onStartQuiz) {
                        onStartQuiz(selectedNode.name, selectedNode.level);
                      }
                    }}
                  >
                    🧪 Test Knowledge on {selectedNode.name}
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ justifyContent: 'center', width: '100%' }}
                    onClick={() => {
                      onClose();
                      navigate('/explore');
                    }}
                  >
                    🔍 Find Courses for this Skill
                  </button>
                </div>

              </div>
            ) : null}

          </div>
        )}

      </div>
    </div>
  );
}
