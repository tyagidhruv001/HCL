import React, { useState, useEffect, useRef, useCallback } from 'react';
import './AiAdvisorChat.css';
import { chatService } from '../../services/chatService.js';
import { mlService } from '../../services/mlService.js';
import { GeminiAdvisor } from './geminiAdvisor.js';

const EXPLORATION_CHIPS = [
  { icon: '⚡', query: 'Elon Musk & SpaceX' },
  { icon: '🌐', query: 'Sundar Pichai' },
  { icon: '⚛️', query: 'React 19 Server Components' },
  { icon: '💻', query: 'Dynamic Programming & Memoization' },
  { icon: '🚀', query: 'Docker vs Kubernetes Architecture' },
  { icon: '🧠', query: 'Attention Mechanism in Transformers' },
];

function sanitizeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function markdownToHtml(text) {
  if (!text) return '';
  let safe = sanitizeHtml(text);
  safe = safe
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-chat-link">$1 ↗</a>')
    .replace(/^### (.*$)/gim, '<h4 class="ai-chat-h4">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="ai-chat-h3">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="ai-chat-h2">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre class="ai-chat-code-block"><code>$1</code></pre>')
    .replace(/`(.+?)`/g, '<code class="ai-chat-inline-code">$1</code>')
    .replace(/^\s*(?:[-*•]|\d+\.)\s+(.*$)/gim, '<li class="ai-chat-li">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin-top:10px">')
    .replace(/\n/g, '<br>');
  return `<p>${safe}</p>`;
}

export default function AiAdvisorChat({
  user,
  userProfile: propProfile,
  onNavigateToPath,
  defaultGoal,
}) {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('jarvis_browser_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const name = user?.fname ? `${user.fname} ${user.lname || ''}`.trim() : 'Sir';
    return [
      {
        role: 'ai',
        content: `👋 Greetings **${name}**! I am **JARVIS**, your Autonomous AI Knowledge Browser & Research Engine.\n\nI have unrestricted thinking, live internet search access, and real-time YouTube video indexing. Ask me **anything** — world leaders, quantum physics, system architecture, rocket propulsion, coding algorithms, or learning pathways.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isSendingRef = useRef(false);

  const userProfile = {
    name: propProfile?.name || (user?.fname ? `${user.fname} ${user.lname || ''}`.trim() : 'Explorer'),
    goal: propProfile?.goal || user?.goal || defaultGoal || 'Full Stack Software Engineer',
    level: propProfile?.level || (user?.year === '1st' ? 'Beginner' : 'Intermediate'),
    branch: user?.branch || 'Computer Science',
  };

  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      try {
        const response = await chatService.getActiveSession();
        if (isMounted && response?.data) {
          setSessionId(response.data._id || response.data.id);
        }
      } catch (err) {}
    }
    initSession();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping]);

  const executeSearch = useCallback(async (text) => {
    const query = (text || '').trim();
    if (!query || isTyping || isSendingRef.current) return;
    isSendingRef.current = true;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInput('');
    setIsTyping(true);

    const newHistory = [...history, { role: 'user', content: query, time }];
    setHistory(newHistory);

    try {
      let aiText = '';
      let videos = [];
      let sources = [];
      let key_points = [];
      let related_questions = [];

      // 1. Send to Backend JARVIS / Groq Engine
      try {
        const res = await chatService.sendMessage(sessionId, query);
        if (res?.data?.content) {
          aiText = res.data.content;
          videos = res.data.videos || [];
          sources = res.data.sources || [];
          key_points = res.data.key_points || [];
          related_questions = res.data.related_questions || [];
          if (res?.sessionId && !sessionId) setSessionId(res.sessionId);
        }
      } catch (apiErr) {
        console.warn('[JARVIS] Backend API error, trying direct ML engine:', apiErr);
      }

      // 2. Direct ML microservice on port 8001 fallback
      if (!aiText) {
        try {
          const directMLRes = await fetch('http://localhost:8001/api/v1/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query,
              learner: {
                user_id: 'u1',
                goal: userProfile.goal,
                experience_level: userProfile.level?.toLowerCase() || 'intermediate',
                weekly_hours: 12,
                skills: [],
                interests: [],
                completed_courses: []
              },
            }),
          });
          if (directMLRes.ok) {
            const mlData = await directMLRes.json();
            aiText = mlData.answer || '';
            videos = mlData.videos || [];
            sources = mlData.sources || [];
            key_points = mlData.key_points || [];
            related_questions = mlData.related_questions || [];
          }
        } catch (mlErr) {
          console.warn('[JARVIS] Direct ML fallback failed:', mlErr);
        }
      }

      // 3. Client Gemini / Dynamic fallback
      if (!aiText) {
        aiText = await GeminiAdvisor.sendMessage(query, newHistory, userProfile);
      }

      const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const updated = [
        ...newHistory,
        {
          role: 'ai',
          content: aiText,
          videos,
          sources,
          key_points,
          related_questions,
          time: aiTime,
        },
      ];
      setHistory(updated);
      localStorage.setItem('jarvis_browser_history', JSON.stringify(updated));
    } catch (err) {
      const errorMsg = "JARVIS was unable to connect to the research microservice. Please ensure the backend is running.";
      setHistory(h => [...h, { role: 'ai', content: errorMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    } finally {
      setIsTyping(false);
      isSendingRef.current = false;
      inputRef.current?.focus();
    }
  }, [history, isTyping, sessionId, userProfile]);

  const handleClear = async () => {
    if (!window.confirm('Clear all JARVIS research logs?')) return;
    if (sessionId) {
      try { await chatService.deleteSession(sessionId); } catch (e) {}
    }
    const reset = [
      {
        role: 'ai',
        content: `JARVIS research logs cleared! 🧹 What shall we analyze next, Sir?`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setHistory(reset);
    localStorage.removeItem('jarvis_browser_history');
  };

  return (
    <div className="ai-browser-container">
      {/* Floating Minimal Action Bar */}
      <div className="ai-floating-top-actions">
        {onNavigateToPath && (
          <button className="ai-mini-btn" onClick={onNavigateToPath} title="Go to My Learning Path">
            🗺️ My Path
          </button>
        )}
        <button className="ai-mini-btn" onClick={handleClear} title="Clear research logs">
          🗑️ Clear
        </button>
      </div>

      {/* Main Results / Research Feed */}
      <div className="ai-results-feed">
        {history.map((m, idx) => {
          const isAi = m.role === 'ai';
          return (
            <div key={idx} className={`ai-feed-row ${isAi ? 'ai' : 'user'}`}>
              <div className={`ai-feed-avatar ${isAi ? 'ai' : 'user'}`}>
                {isAi ? '⚡' : '👤'}
              </div>

              <div className="ai-feed-content-col">
                {/* Main Text Content */}
                <div
                  className="ai-feed-bubble"
                  dangerouslySetInnerHTML={{ __html: isAi ? markdownToHtml(m.content) : sanitizeHtml(m.content) }}
                />

                {/* Key Points / Core Takeaways */}
                {isAi && m.key_points && m.key_points.length > 0 && (
                  <div className="ai-takeaways-card">
                    <div className="ai-card-title">📌 JARVIS Key Takeaways</div>
                    <ul className="ai-takeaways-list">
                      {m.key_points.map((pt, pIdx) => (
                        <li key={pIdx} className="ai-takeaway-item">{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Grounded YouTube Videos */}
                {isAi && m.videos && m.videos.length > 0 && (
                  <div className="ai-videos-card">
                    <div className="ai-card-title">📺 Masterclass Video Tutorials (YouTube)</div>
                    <div className="ai-videos-grid">
                      {m.videos.map((vid, vIdx) => (
                        <a
                          key={vIdx}
                          href={vid.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ai-video-item"
                        >
                          <div className="ai-video-thumb-wrap">
                            {vid.thumbnail ? (
                              <img src={vid.thumbnail} alt={vid.title} className="ai-video-thumb" />
                            ) : (
                              <div className="ai-video-thumb-placeholder">▶️ Video</div>
                            )}
                            {vid.duration && (
                              <span className="ai-video-badge">{vid.duration}</span>
                            )}
                          </div>
                          <div className="ai-video-info">
                            <div className="ai-video-title">{vid.title}</div>
                            <div className="ai-video-channel">👤 {vid.channel || 'YouTube'}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounded Web Sources */}
                {isAi && m.sources && m.sources.length > 0 && (
                  <div className="ai-sources-card">
                    <div className="ai-card-title">🔗 Grounded Web References</div>
                    <div className="ai-sources-list">
                      {m.sources.map((src, sIdx) => (
                        <a
                          key={sIdx}
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ai-source-item"
                        >
                          <div className="ai-source-title">{src.title} ↗</div>
                          {src.snippet && <div className="ai-source-snippet">{src.snippet}</div>}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ai-feed-time">{m.time || ''}</div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isTyping && (
          <div className="ai-feed-row ai">
            <div className="ai-feed-avatar ai">⚡</div>
            <div className="ai-researching-indicator">
              <div className="ai-radar-spin" />
              <span>JARVIS is scanning live internet sources, indexing YouTube masterclasses & synthesizing results...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Omnibar */}
      <div className="ai-omnibar-wrap">
        <div className="ai-omnibar">
          <span className="ai-omnibar-icon">⚡</span>
          <textarea
            ref={inputRef}
            className="ai-omnibar-input"
            rows={1}
            placeholder="Ask JARVIS anything in the universe (e.g. Elon Musk & SpaceX, Sundar Pichai, Quantum Computing)..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                executeSearch(input);
              }
            }}
          />
          <button
            className="ai-search-submit-btn"
            onClick={() => executeSearch(input)}
            disabled={!input.trim() || isTyping}
          >
            {isTyping ? '⚡' : 'Ask JARVIS ➔'}
          </button>
        </div>
      </div>
    </div>
  );
}
