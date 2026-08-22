import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navigation Header */}
      <header className="landing-header">
        <div className="landing-logo">
          <span className="logo-emoji">🎓</span> LearnAI
        </div>
        <div className="landing-nav-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-glow-1"></div>
        <div className="hero-glow-2"></div>
        <div className="hero-content">
          <div className="hero-badge">✨ Decoupled AI Learning Assistant</div>
          <h1 className="hero-title">
            Personalised Learning Paths <br />
            <span className="gradient-text">Guided by AI</span>
          </h1>
          <p className="hero-subtitle">
            Skip the guesswork. Generate structured roadmaps tailored to your experience level, 
            skills, and timeline. Learn with the help of an interactive AI tutor advisor.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              Create Your Path Now →
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="landing-features">
        <div className="section-header-centered">
          <h2 className="section-title-large">Engineered for Lifelong Learners</h2>
          <p className="section-subtitle-large">Everything you need to accelerate your educational goals in one modular platform.</p>
        </div>

        <div className="features-grid">
          <div className="feature-glow-card">
            <div className="feature-icon">🗺️</div>
            <h3>Customised Roadmaps</h3>
            <p>Generate 3-4 phase learning paths with specific milestones, estimated durations, and direct course links mapped to your personal interests.</p>
          </div>

          <div className="feature-glow-card">
            <div className="feature-icon">💬</div>
            <h3>AI Tutor Advisor</h3>
            <p>Ask clarifying questions, request summaries, or get simplified explanations for challenging topics from a context-aware AI mentor.</p>
          </div>

          <div className="feature-glow-card">
            <div className="feature-icon">📊</div>
            <h3>Skill Profile & Heatmaps</h3>
            <p>Visualize your progress across domains (Web, Data, AI/ML, Cloud, Security) with Chart.js radar plots and track learning consistency via activity calendars.</p>
          </div>

          <div className="feature-glow-card">
            <div className="feature-icon">🏆</div>
            <h3>Curated Catalog</h3>
            <p>No fake courses. Access direct links to top-tier verified materials from providers like freeCodeCamp, Udemy, Coursera, and Kaggle.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 LearnAI. DEC-Modular Learning Path Recommender. All rights reserved.</p>
      </footer>
    </div>
  );
}
