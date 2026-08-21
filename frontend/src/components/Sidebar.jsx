import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard',  view: 'dashboard',  icon: '📊', label: 'Dashboard' },
  { to: '/chat',       view: 'chat',        icon: '💬', label: 'AI Advisor', badge: 'AI' },
  { to: '/path',       view: 'path',        icon: '🗺️', label: 'My Path' },
  { to: '/explore',    view: 'explore',     icon: '🔍', label: 'Explore' },
];

export default function Sidebar({ onOpenApiKey }) {
  const { profile } = useProfile();
  const navigate = useNavigate();

  const avatarLetter = profile.name ? profile.name.charAt(0).toUpperCase() : '?';
  const levelLabel = profile.level
    ? `${profile.level.charAt(0).toUpperCase() + profile.level.slice(1)} level`
    : 'Not set up yet';

  return (
    <nav id="sidebar" aria-label="Main navigation">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎓</div>
        <div className="sidebar-logo-text">
          LearnAI
          <span>Personalized Learning</span>
        </div>
      </div>

      {/* Nav Links */}
      <div className="sidebar-nav">
        <div className="nav-section-label">Main</div>

        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.view}
            to={item.to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.badge && <span className="nav-badge">{item.badge}</span>}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: '8px' }}>Account</div>

        <NavLink
          to="/onboarding"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">👤</span>
          My Profile
        </NavLink>

        <a
          className="nav-item"
          href="#"
          onClick={(e) => { e.preventDefault(); onOpenApiKey(); }}
        >
          <span className="nav-icon">⚙️</span>
          API Settings
        </a>
      </div>

      {/* User Panel */}
      <div className="sidebar-user">
        <div className="user-avatar">{avatarLetter}</div>
        <div className="user-info">
          <div className="user-name">{profile.name || 'Learner'}</div>
          <div className="user-level">{levelLabel}</div>
        </div>
      </div>
    </nav>
  );
}
