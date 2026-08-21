import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Storage } from '../utils/storage.js';
import { AI } from '../features/recommendation/recommendation.js';

const VIEW_META = {
  '/dashboard':  { title: '📊 Dashboard',      sub: 'Track your progress and achievements' },
  '/chat':       { title: '💬 AI Advisor',      sub: 'Chat with your personalised learning assistant' },
  '/path':       { title: '🗺️ Learning Path',  sub: 'Your structured roadmap to success' },
  '/explore':    { title: '🔍 Explore',          sub: 'Browse the full course catalogue' },
  '/onboarding': { title: '🎓 Get Started',     sub: 'Set up your learning profile' },
};

export default function Topbar({ onOpenApiKey }) {
  const location = useLocation();
  const [hasKey, setHasKey] = useState(() => AI.hasKey());

  useEffect(() => {
    const refresh = () => setHasKey(AI.hasKey());
    window.addEventListener('storage', refresh);
    window.addEventListener('app:key-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('app:key-changed', refresh);
    };
  }, []);

  const meta = VIEW_META[location.pathname] || { title: 'LearnAI', sub: '' };

  return (
    <header id="topbar">
      <div>
        <span className="topbar-title">{meta.title}</span>
        <span className="topbar-subtitle">{meta.sub}</span>
      </div>
      <div className="topbar-actions">
        <button
          className={`btn btn-secondary btn-sm${hasKey ? ' active-ai' : ''}`}
          id="ai-mode-indicator"
          title={hasKey ? 'Gemini AI connected' : 'Click to add API key for full AI'}
          style={{ fontSize: '12px', padding: '6px 12px' }}
          onClick={onOpenApiKey}
        >
          {hasKey ? '🟢 AI Mode' : '🔵 Demo Mode'}
        </button>

        <button
          className="btn-icon"
          id="topbar-key-btn"
          title="API Key Settings"
          onClick={onOpenApiKey}
        >
          🔑
        </button>

        <a
          className="btn-icon"
          href="https://github.com/"
          target="_blank"
          rel="noopener noreferrer"
          title="View on GitHub"
        >
          📂
        </a>
      </div>
    </header>
  );
}
