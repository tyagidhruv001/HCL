import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Storage, Sanitize } from '../../utils/storage.js';
import { useProfile } from '../../context/ProfileContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const TOTAL_STEPS = 3;

const INTEREST_OPTIONS = [
  { id: 'web',    label: '🌐 Web Dev',       desc: 'Frontend & Backend' },
  { id: 'data',   label: '📊 Data Science',   desc: 'Analytics & BI' },
  { id: 'ai',     label: '🤖 AI / ML',        desc: 'Machine Learning' },
  { id: 'cloud',  label: '☁️ Cloud & DevOps', desc: 'AWS, GCP, Docker' },
  { id: 'cyber',  label: '🔒 Cybersecurity',  desc: 'Security & Hacking' },
  { id: 'design', label: '🎨 UI/UX Design',   desc: 'Figma & Prototyping' },
];

const LEVELS = [
  { id: 'beginner',     icon: '🌱', name: 'Beginner',     desc: 'Just getting started' },
  { id: 'intermediate', icon: '🚀', name: 'Intermediate', desc: 'Have some experience' },
  { id: 'advanced',     icon: '⚡', name: 'Advanced',     desc: 'Looking to specialise' },
];

const TIMELINES = ['1 month', '2 months', '3 months', '6 months', '1 year'];
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [timeline, setTimeline] = useState('3 months');
  const [level, setLevel] = useState('');
  const [interests, setInterests] = useState([]);
  const [skills, setSkills] = useState('');

  const validate = () => {
    if (step === 1) {
      if (!name.trim()) { showToast('Please enter your name', 'error'); return false; }
      if (goal.trim().length < 10) { showToast('Describe your goal (min 10 characters)', 'error'); return false; }
    }
    if (step === 2) {
      if (!level) { showToast('Please select your experience level', 'error'); return false; }
    }
    if (step === 3) {
      if (interests.length === 0) { showToast('Please select at least one interest', 'error'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    const safeName = Sanitize.text(name.trim(), 100);
    const safeGoal = Sanitize.text(goal.trim(), 500);
    const safeSkills = skills
      ? skills.split(',').map(s => Sanitize.text(s.trim(), 50)).filter(Boolean)
      : [];

    updateProfile({
      name: safeName,
      goal: safeGoal,
      timeline: TIMELINES.includes(timeline) ? timeline : '3 months',
      level: VALID_LEVELS.includes(level) ? level : 'beginner',
      interests,
      currentSkills: safeSkills,
      completedCourses: [],
      onboarded: true,
      createdAt: new Date().toISOString(),
    });

    showToast(`Welcome aboard, ${safeName}! 🎉`, 'success');
    setTimeout(() => navigate('/chat'), 400);
  };

  const toggleInterest = (id) => {
    setInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const dotClass = (i) => {
    if (i < step) return 'step-dot done';
    if (i === step) return 'step-dot active';
    return 'step-dot';
  };

  return (
    <section id="view-onboarding" className="view active">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', padding: '20px' }}>
        <div className="onboarding-card">
          <div className="onboarding-hero">
            <div className="onboarding-emoji">🎓</div>
            <h1 className="onboarding-title">Your AI Learning Advisor</h1>
            <p className="onboarding-subtitle">Let's personalise your learning journey in 3 quick steps.</p>
          </div>

          <div className="step-indicator">
            {[1, 2, 3].map(i => <div key={i} className={dotClass(i)} />)}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="ob-step">
              <div className="form-group">
                <label className="form-label" htmlFor="ob-name">👤 What's your name?</label>
                <input
                  type="text" id="ob-name" className="form-input"
                  placeholder="e.g. Alex Johnson" autoComplete="given-name"
                  maxLength={100} value={name} onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ob-goal">🎯 What's your primary learning goal?</label>
                <textarea
                  id="ob-goal" className="form-textarea" rows={3} maxLength={500}
                  placeholder="e.g. I want to become a full-stack developer and land a job in 6 months..."
                  value={goal} onChange={e => setGoal(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">⏱️ Your target timeline</label>
                <div className="tag-group">
                  {TIMELINES.map(t => (
                    <span
                      key={t}
                      className={`tag${timeline === t ? ' selected' : ''}`}
                      onClick={() => setTimeline(t)}
                    >{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="ob-step">
              <label className="form-label" style={{ marginBottom: '14px' }}>🎯 Your current experience level?</label>
              <div className="level-cards">
                {LEVELS.map(l => (
                  <div
                    key={l.id}
                    className={`level-card${level === l.id ? ' selected' : ''}`}
                    role="button" tabIndex={0}
                    aria-label={l.name}
                    onClick={() => setLevel(l.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLevel(l.id); } }}
                  >
                    <div className="level-icon">{l.icon}</div>
                    <div className="level-name">{l.name}</div>
                    <div className="level-desc">{l.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="ob-step">
              <label className="form-label" style={{ marginBottom: '14px' }}>
                💡 Which domains interest you?{' '}
                <span style={{ color: 'var(--text-muted)' }}>(pick all that apply)</span>
              </label>
              <div className="tag-group">
                {INTEREST_OPTIONS.map(i => (
                  <span
                    key={i.id}
                    className={`tag${interests.includes(i.id) ? ' selected' : ''}`}
                    title={i.desc}
                    role="checkbox"
                    aria-checked={interests.includes(i.id)}
                    tabIndex={0}
                    onClick={() => toggleInterest(i.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleInterest(i.id); } }}
                  >
                    {i.label}
                  </span>
                ))}
              </div>
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label" htmlFor="ob-skills">
                  📚 Skills you've already completed?{' '}
                  <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  type="text" id="ob-skills" className="form-input"
                  placeholder="e.g. Python basics, HTML/CSS, JavaScript..."
                  maxLength={300} value={skills} onChange={e => setSkills(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ marginTop: '28px', display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
            )}
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleNext}>
              {step === TOTAL_STEPS ? '🚀 Start Learning' : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
