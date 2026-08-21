/**
 * profile.js — Learner Profiling Engine (production-hardened ESM)
 * - currentStep reset on every renderOnboarding() call (was stale across navigations)
 * - All user inputs sanitised before storage
 * - No inline onclick handlers (event delegation instead)
 * - DOMAINS reference replaced with local map
 */

import { Storage, Sanitize } from '../../utils/storage.js';

// Step is LOCAL to each renderOnboarding() call via closure — not module-level
const TOTAL_STEPS = 3;

const DOMAIN_LABELS = {
  web:    { label: 'Web Dev',      icon: '🌐' },
  data:   { label: 'Data Science', icon: '📊' },
  ai:     { label: 'AI / ML',      icon: '🤖' },
  cloud:  { label: 'Cloud & DevOps',icon: '☁️' },
  cyber:  { label: 'Cybersecurity',icon: '🔒' },
  design: { label: 'UI/UX Design', icon: '🎨' },
};

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

/* ── Build onboarding HTML ── */
function renderOnboarding(container) {
  if (!container) return;

  // Each call gets a fresh step state via closure
  let currentStep = 1;

  container.innerHTML = `
    <div class="onboarding-hero">
      <div class="onboarding-emoji">🎓</div>
      <h1 class="onboarding-title">Your AI Learning Advisor</h1>
      <p class="onboarding-subtitle">Let's personalise your learning journey in 3 quick steps.</p>
    </div>

    <div class="step-indicator" id="ob-step-indicator">
      <div class="step-dot active" id="ob-dot-1"></div>
      <div class="step-dot"        id="ob-dot-2"></div>
      <div class="step-dot"        id="ob-dot-3"></div>
    </div>

    <!-- Step 1: Name & Goal -->
    <div id="ob-step-1" class="ob-step">
      <div class="form-group">
        <label class="form-label" for="ob-name">👤 What's your name?</label>
        <input type="text" id="ob-name" class="form-input"
          placeholder="e.g. Alex Johnson"
          autocomplete="given-name"
          maxlength="100"
          spellcheck="false">
      </div>
      <div class="form-group">
        <label class="form-label" for="ob-goal">🎯 What's your primary learning goal?</label>
        <textarea id="ob-goal" class="form-textarea"
          placeholder="e.g. I want to become a full-stack developer and land a job in 6 months..."
          rows="3" maxlength="500"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">⏱️ Your target timeline</label>
        <div class="tag-group" id="ob-timeline-tags">
          ${TIMELINES.map(t => `<span class="tag" data-val="${Sanitize.html(t)}">${Sanitize.html(t)}</span>`).join('')}
        </div>
      </div>
    </div>

    <!-- Step 2: Experience Level -->
    <div id="ob-step-2" class="ob-step hidden">
      <label class="form-label" style="margin-bottom:14px">🎯 Your current experience level?</label>
      <div class="level-cards">
        ${LEVELS.map(l => `
          <div class="level-card" data-level="${Sanitize.html(l.id)}" role="button" tabindex="0" aria-label="${Sanitize.html(l.name)}">
            <div class="level-icon">${l.icon}</div>
            <div class="level-name">${Sanitize.html(l.name)}</div>
            <div class="level-desc">${Sanitize.html(l.desc)}</div>
          </div>`).join('')}
      </div>
    </div>

    <!-- Step 3: Interests -->
    <div id="ob-step-3" class="ob-step hidden">
      <label class="form-label" style="margin-bottom:14px">
        💡 Which domains interest you?
        <span style="color:var(--text-muted)">(pick all that apply)</span>
      </label>
      <div class="tag-group" id="ob-interest-tags">
        ${INTEREST_OPTIONS.map(i => `
          <span class="tag" data-interest="${Sanitize.html(i.id)}" title="${Sanitize.html(i.desc)}" role="checkbox" aria-checked="false" tabindex="0">
            ${Sanitize.html(i.label)}
          </span>`).join('')}
      </div>
      <div class="form-group" style="margin-top:20px">
        <label class="form-label" for="ob-skills">
          📚 Skills you've already completed?
          <span style="color:var(--text-muted)">(optional)</span>
        </label>
        <input type="text" id="ob-skills" class="form-input"
          placeholder="e.g. Python basics, HTML/CSS, JavaScript..."
          maxlength="300">
      </div>
    </div>

    <!-- Navigation -->
    <div style="margin-top:28px;display:flex;gap:12px">
      <button class="btn btn-ghost" id="ob-back-btn" style="display:none">← Back</button>
      <button class="btn btn-primary" id="ob-next-btn" style="flex:1">Continue →</button>
    </div>
  `;

  // ── Bind all events using proper addEventListener (no inline handlers) ──

  // Timeline single-select
  container.querySelectorAll('#ob-timeline-tags .tag').forEach(tag => {
    tag.addEventListener('click', () => {
      container.querySelectorAll('#ob-timeline-tags .tag').forEach(t => t.classList.remove('selected'));
      tag.classList.add('selected');
    });
  });

  // Level card single-select + keyboard
  container.querySelectorAll('.level-card').forEach(card => {
    const select = () => {
      container.querySelectorAll('.level-card').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
    };
    card.addEventListener('click', select);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
  });

  // Interest tags multi-select + keyboard
  container.querySelectorAll('#ob-interest-tags .tag').forEach(tag => {
    const toggle = () => {
      const checked = tag.classList.toggle('selected');
      tag.setAttribute('aria-checked', String(checked));
    };
    tag.addEventListener('click', toggle);
    tag.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  // Navigation buttons — all logic defined inline here using the closure-local currentStep
  const goToStep = (step) => {
    container.querySelector(`#ob-step-${currentStep}`).classList.add('hidden');
    currentStep = step;
    container.querySelector(`#ob-step-${currentStep}`).classList.remove('hidden');

    // Update step indicators
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const dot = container.querySelector(`#ob-dot-${i}`);
      if (!dot) continue;
      dot.classList.remove('active', 'done');
      if (i < currentStep)      dot.classList.add('done');
      else if (i === currentStep) dot.classList.add('active');
    }

    const backBtn = container.querySelector('#ob-back-btn');
    const nextBtn = container.querySelector('#ob-next-btn');
    if (backBtn) backBtn.style.display = currentStep > 1 ? 'inline-flex' : 'none';
    if (nextBtn) nextBtn.textContent    = currentStep === TOTAL_STEPS ? '🚀 Start Learning' : 'Continue →';
  };

  const validate = (step) => {
    if (step === 1) {
      const name = container.querySelector('#ob-name').value.trim();
      const goal = container.querySelector('#ob-goal').value.trim();
      if (!name)          { showToast('Please enter your name', 'error'); return false; }
      if (goal.length < 10) { showToast('Describe your goal (min 10 characters)', 'error'); return false; }
    }
    if (step === 2) {
      if (!container.querySelector('.level-card.selected')) {
        showToast('Please select your experience level', 'error'); return false;
      }
    }
    if (step === 3) {
      if (!container.querySelector('#ob-interest-tags .tag.selected')) {
        showToast('Please select at least one interest', 'error'); return false;
      }
    }
    return true;
  };

  const finish = () => {
    const name     = Sanitize.text(container.querySelector('#ob-name').value.trim(), 100);
    const goal     = Sanitize.text(container.querySelector('#ob-goal').value.trim(), 500);
    const timeline = container.querySelector('#ob-timeline-tags .tag.selected')?.dataset?.val || '3 months';
    const level    = container.querySelector('.level-card.selected')?.dataset?.level || 'beginner';
    const interests = [...container.querySelectorAll('#ob-interest-tags .tag.selected')]
      .map(t => t.dataset.interest)
      .filter(i => ['web','data','ai','cloud','cyber','design'].includes(i));
    const skillsRaw = Sanitize.text(container.querySelector('#ob-skills').value.trim(), 300);

    const validLevels = ['beginner', 'intermediate', 'advanced'];

    Storage.saveProfile({
      name,
      goal,
      timeline: TIMELINES.includes(timeline) ? timeline : '3 months',
      level: validLevels.includes(level) ? level : 'beginner',
      interests,
      currentSkills: skillsRaw ? skillsRaw.split(',').map(s => Sanitize.text(s.trim(), 50)).filter(Boolean) : [],
      completedCourses: [],
      onboarded: true,
      createdAt: new Date().toISOString(),
    });

    showToast(`Welcome aboard, ${Sanitize.html(name)}! 🎉`, 'success');
    setTimeout(() => window.App?.navigate('chat'), 400);
  };

  container.querySelector('#ob-next-btn').addEventListener('click', () => {
    if (!validate(currentStep)) return;
    if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
    else finish();
  });

  container.querySelector('#ob-back-btn').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });

  // Focus first field
  container.querySelector('#ob-name')?.focus();
}

/* ── Extract profile hints from AI conversation ── */
function extractFromMessage(message, existingProfile) {
  const updates = {};
  const lower   = (message || '').toLowerCase();

  if (/\b(complete beginner|total beginner|never coded|no experience)\b/.test(lower)) {
    updates.level = 'beginner';
  } else if (/\b(intermediate|some experience|familiar with|worked with)\b/.test(lower)) {
    updates.level = 'intermediate';
  } else if (/\b(advanced|senior|professional|experienced|expert)\b/.test(lower)) {
    updates.level = 'advanced';
  }

  const domainKeywords = {
    web:    /\b(web dev|frontend|backend|react|node|html|css|javascript)\b/,
    data:   /\b(data science|analytics|pandas|sql|visualization|bi)\b/,
    ai:     /\b(machine learning|deep learning|neural|nlp|llm|ml|generative)\b/,
    cloud:  /\b(cloud|devops|docker|kubernetes|aws|azure|gcp|ci\/cd)\b/,
    cyber:  /\b(security|hacking|pentest|ctf|cyber|owasp)\b/,
    design: /\b(design|ux|ui|figma|prototype|user experience)\b/,
  };

  const newInterests = {};
  for (const [domain, regex] of Object.entries(domainKeywords)) {
    if (regex.test(lower)) newInterests[domain] = true;
  }
  if (Object.keys(newInterests).length > 0) {
    const combined = [...new Set([...(existingProfile.interests || []), ...Object.keys(newInterests)])];
    if (combined.length !== (existingProfile.interests || []).length) {
      updates.interests = combined;
    }
  }
  return updates;
}

/* ── Render profile summary (XSS-safe) ── */
function renderProfileSummary(container, profile) {
  if (!container) return;
  const levelIcons = { beginner: '🌱', intermediate: '🚀', advanced: '⚡' };
  const progress   = Storage.getProgress();
  const completed  = (progress.completedCourseIds || []).length;

  const h = (s) => Sanitize.html(s || '');

  container.innerHTML = `
    <h3>👤 Your Profile</h3>
    <div class="profile-row">
      <span class="profile-row-label">Name</span>
      <span class="profile-row-value">${h(profile.name) || '—'}</span>
    </div>
    <div class="profile-row">
      <span class="profile-row-label">Level</span>
      <span class="profile-row-value">${levelIcons[profile.level] || ''} ${h(profile.level) || '—'}</span>
    </div>
    <div class="profile-row">
      <span class="profile-row-label">Timeline</span>
      <span class="profile-row-value">⏱️ ${h(profile.timeline) || 'Not set'}</span>
    </div>
    <div class="profile-row">
      <span class="profile-row-label">Completed</span>
      <span class="profile-row-value">✅ ${completed} courses</span>
    </div>
    <div style="margin-top:12px">
      <div class="form-label" style="margin-bottom:8px">Interests</div>
      <div class="tag-group">
        ${(profile.interests || []).map(i => {
          const d = DOMAIN_LABELS[i] || { label: i, icon: '🔖' };
          return `<span class="tag selected" style="font-size:11px;padding:3px 10px">${d.icon} ${Sanitize.html(d.label)}</span>`;
        }).join('') || '<span class="text-muted text-xs">None selected</span>'}
      </div>
    </div>
    ${profile.goal ? `
      <div style="margin-top:12px;padding:10px;background:rgba(99,102,241,0.08);border-radius:var(--radius-md);font-size:12px;color:var(--text-secondary);line-height:1.5;border-left:3px solid var(--indigo)">
        🎯 ${h(profile.goal)}
      </div>` : ''}
  `;
}

export const Profile = {
  renderOnboarding,
  renderProfileSummary,
  extractFromMessage,
  INTEREST_OPTIONS,
  LEVELS,
};
