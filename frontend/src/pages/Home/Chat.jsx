import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storage, Sanitize } from '../../utils/storage.js';
import { AI } from '../../features/recommendation/recommendation.js';
import { Profile } from '../../features/profile/profile.js';
import { useProfile } from '../../context/ProfileContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const SUGGESTED_PROMPTS = [
  "What learning path should I follow to become a data scientist?",
  "I want to learn web development. Where do I start?",
  "What are the most in-demand skills in AI right now?",
  "How long will it take to be job-ready in cybersecurity?",
  "Generate my personalized learning path",
  "What should I learn after JavaScript?",
];

function markdownToHtml(text) {
  if (!text) return '';
  let safe = Sanitize.html(text);
  safe = safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.15);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br>');
  return `<p>${safe}</p>`;
}

function ProfilePanel({ profile }) {
  const DOMAIN_LABELS = {
    web:    { label: 'Web Dev',       icon: '🌐' },
    data:   { label: 'Data Science',  icon: '📊' },
    ai:     { label: 'AI / ML',       icon: '🤖' },
    cloud:  { label: 'Cloud & DevOps',icon: '☁️' },
    cyber:  { label: 'Cybersecurity', icon: '🔒' },
    design: { label: 'UI/UX Design',  icon: '🎨' },
  };
  const progress  = Storage.getProgress();
  const completed = (progress.completedCourseIds || []).length;
  const levelIcons = { beginner: '🌱', intermediate: '🚀', advanced: '⚡' };

  return (
    <div className="profile-summary-card" id="chat-profile-panel">
      <h3>👤 Your Profile</h3>
      <div className="profile-row">
        <span className="profile-row-label">Name</span>
        <span className="profile-row-value">{profile.name || '—'}</span>
      </div>
      <div className="profile-row">
        <span className="profile-row-label">Level</span>
        <span className="profile-row-value">{levelIcons[profile.level] || ''} {profile.level || '—'}</span>
      </div>
      <div className="profile-row">
        <span className="profile-row-label">Timeline</span>
        <span className="profile-row-value">⏱️ {profile.timeline || 'Not set'}</span>
      </div>
      <div className="profile-row">
        <span className="profile-row-label">Completed</span>
        <span className="profile-row-value">✅ {completed} courses</span>
      </div>
      <div style={{ marginTop: '12px' }}>
        <div className="form-label" style={{ marginBottom: '8px' }}>Interests</div>
        <div className="tag-group">
          {(profile.interests || []).length > 0
            ? profile.interests.map(i => {
                const d = DOMAIN_LABELS[i] || { label: i, icon: '🔖' };
                return (
                  <span key={i} className="tag selected" style={{ fontSize: '11px', padding: '3px 10px' }}>
                    {d.icon} {d.label}
                  </span>
                );
              })
            : <span className="text-muted text-xs">None selected</span>
          }
        </div>
      </div>
      {profile.goal && (
        <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, borderLeft: '3px solid var(--indigo)' }}>
          🎯 {profile.goal}
        </div>
      )}
    </div>
  );
}

function ChatMessage({ role, content }) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const safeContent = role === 'user' ? Sanitize.html(content) : markdownToHtml(content);
  return (
    <div className={`message ${role === 'ai' ? 'ai' : 'user'}`}>
      <div className={`msg-avatar ${role}`}>{role === 'ai' ? '🤖' : '👤'}</div>
      <div>
        <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: safeContent }} />
        <div className="msg-time">{time}</div>
      </div>
    </div>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useProfile();
  const { showToast } = useToast();

  const getWelcome = useCallback(() => {
    const p = Storage.getProfile();
    return p.onboarded
      ? `Hi **${p.name}**! 👋 I'm **LearnAI**, your personalized learning advisor.\n\nI see you're aiming to: *"${p.goal}"* — a fantastic goal! I'm here to help you build the perfect roadmap, answer questions, and keep you motivated.\n\nWhat would you like to explore today?`
      : `Hi there! 👋 I'm **LearnAI**, your AI-powered learning advisor.\n\nI help you discover the perfect learning path based on your goals, interests, and experience level. Before we dive in, could you tell me a bit about yourself?\n\nWhat's your primary learning goal?`;
  }, []);

  const [history, setHistory] = useState(() => {
    const stored = Storage.getChatHistory();
    return stored.length > 0
      ? stored.map(m => ({ role: m.role, content: m.content }))
      : [{ role: 'ai', content: getWelcome() }];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState(SUGGESTED_PROMPTS.slice(0, 4));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping]);

  const getContextualSuggestions = (userMsg, aiResp) => {
    const lower = ((userMsg || '') + ' ' + (aiResp || '')).toLowerCase();
    if (/web|react|javascript|frontend|backend/.test(lower))
      return ['Best React projects for portfolio?', 'How do I get my first dev job?', 'Node.js or Python for backend?'];
    if (/data|python|machine|ml|ai|deep learning/.test(lower))
      return ['Best ML projects for portfolio?', 'How long to learn machine learning?', 'Python vs R for data science?'];
    if (/cloud|aws|docker|devops|kubernetes/.test(lower))
      return ['AWS vs GCP vs Azure?', 'Which cloud certifications should I get?', 'How to start with Kubernetes?'];
    if (/security|cyber|hacking|pentest/.test(lower))
      return ['Best cybersecurity certifications?', 'How to start ethical hacking?', 'CEH vs OSCP — which first?'];
    return SUGGESTED_PROMPTS.slice(0, 4);
  };

  const sendMessage = useCallback(async (text) => {
    const msg = (text || '').trim();
    if (!msg || isTyping) return;

    setInput('');
    setSuggestions([]);
    setIsTyping(true);

    const currentProfile = Storage.getProfile();
    const newHistory = [...history, { role: 'user', content: msg }];
    setHistory(newHistory);
    Storage.appendMessage({ role: 'user', content: msg });

    try {
      const aiResponse = await AI.sendMessage(msg, newHistory, currentProfile);

      if (currentProfile.onboarded) {
        const updates = Profile.extractFromMessage(msg, currentProfile);
        if (Object.keys(updates).length > 0) {
          Storage.saveProfile(updates);
          refreshProfile();
        }
      }

      const isPathRequest = /\b(generate|create|make|build|show|get)\s*(me\s*)?(a\s*)?(path|roadmap|plan|course list)\b/i.test(msg)
                         || /\bgive me.*courses?\b/i.test(msg);

      const finalResponse = isPathRequest && currentProfile.onboarded
        ? aiResponse + '\n\n🗺️ **Ready to generate your path?** Go to **My Path** in the sidebar to build your personalised roadmap!'
        : aiResponse;

      const updated = [...newHistory, { role: 'ai', content: finalResponse }];
      setHistory(updated);
      Storage.appendMessage({ role: 'ai', content: finalResponse });
      setSuggestions(getContextualSuggestions(msg, aiResponse));

    } catch (err) {
      const errorMessages = {
        NO_API_KEY:   "🔑 No API key found. I'm running in demo mode — add your Gemini API key in **API Settings** for full AI responses.",
        INVALID_KEY:  '❌ Invalid API key. Please check your Gemini API key in **API Settings** and try again.',
        RATE_LIMIT:   '⏳ Rate limit reached. Please wait a moment and try again.',
        SERVER_ERROR: '🔧 AI service temporarily unavailable. Please try again shortly.',
      };
      const errMsg = errorMessages[err.message] || 'Sorry, I encountered an error. Please try again.';
      setHistory(h => [...h, { role: 'ai', content: errMsg }]);
      setSuggestions(SUGGESTED_PROMPTS.slice(0, 4));
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [history, isTyping, refreshProfile]);

  const handleClearChat = () => {
    if (!confirm('Clear your chat history? This cannot be undone.')) return;
    Storage.clearChat();
    setHistory([{ role: 'ai', content: getWelcome() }]);
    setSuggestions(SUGGESTED_PROMPTS.slice(0, 4));
    showToast('Chat history cleared', 'info');
  };

  const handleGenPath = () => {
    const p = Storage.getProfile();
    if (!p.onboarded) { showToast('Complete your profile first!', 'error'); navigate('/onboarding'); return; }
    navigate('/path');
  };

  return (
    <section id="view-chat" className="view active">
      <div className="chat-container">
        {/* Main chat panel */}
        <div className="chat-main">
          <div className="chat-header">
            <div className="chat-avatar">🤖</div>
            <div className="chat-ai-info">
              <div className="chat-ai-name">LearnAI</div>
              <div className="chat-ai-status">Online — Ready to help</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" id="quick-gen-path" onClick={handleGenPath}>
                🗺️ Generate Path
              </button>
              <button
                className="btn-icon" id="clear-chat-btn" title="Clear chat history"
                style={{ width: '32px', height: '32px', fontSize: '14px' }}
                onClick={handleClearChat}
              >🗑️</button>
            </div>
          </div>

          <div className="chat-messages" id="chat-messages">
            {history.map((m, i) => (
              <ChatMessage key={i} role={m.role} content={m.content} />
            ))}
            {isTyping && (
              <div className="message ai" id="typing-indicator">
                <div className="msg-avatar ai">🤖</div>
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <div className="chat-suggestions" id="chat-suggestions">
              {suggestions.map((s, i) => (
                <span key={i} className="suggestion-chip" onClick={() => sendMessage(s)}>{s}</span>
              ))}
            </div>
            <div className="chat-input-row">
              <textarea
                ref={inputRef}
                id="chat-input"
                placeholder="Ask me anything about learning, courses, career paths..."
                rows={1}
                aria-label="Chat message input"
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
              />
              <button id="send-btn" aria-label="Send message" title="Send (Enter)" onClick={() => sendMessage(input)}>
                ➤
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar panel */}
        <div className="chat-sidebar">
          {profile.onboarded
            ? <ProfilePanel profile={profile} />
            : (
              <div className="profile-summary-card" id="chat-profile-panel">
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>👤</div>
                  <div style={{ fontSize: '13px' }}>Complete onboarding to<br />see your profile here</div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '12px' }}
                    onClick={() => navigate('/onboarding')}
                  >Set Up Profile</button>
                </div>
              </div>
            )
          }

          <div className="profile-summary-card">
            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>⚡ Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/path')} style={{ justifyContent: 'flex-start' }}>🗺️ View Learning Path</button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')} style={{ justifyContent: 'flex-start' }}>📊 Open Dashboard</button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/explore')} style={{ justifyContent: 'flex-start' }}>🔍 Browse Courses</button>
              <button className="btn btn-ghost btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('app:show-apikey'))} style={{ justifyContent: 'flex-start' }}>🔑 API Key Settings</button>
            </div>
          </div>

          <div className="profile-summary-card" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1))', borderColor: 'rgba(99,102,241,0.3)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>💡 Pro Tip</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Describe your goal in natural language — like <em>"I want to build AI apps in 3 months"</em> — and I'll extract your profile automatically.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
