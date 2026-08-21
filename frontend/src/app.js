/**
 * app.js — SPA Bootstrap & Routing (production-hardened ESM)
 * FIXES:
 * - No inline onclick handlers anywhere
 * - Explore view cards use event delegation (not inline onclick)
 * - URL validation via Sanitize before rendering course links
 * - View re-init guarded: chat only re-inits events once
 * - Hash navigation sanitised via allowlist
 * - CSP-friendly (no eval, no inline scripts)
 */

import { Storage, Sanitize } from './utils/storage.js';
import { CourseCatalog } from './features/courses/courses.js';
import { AI } from './features/recommendation/recommendation.js';
import { Profile } from './features/profile/profile.js';
import { PathView } from './pages/Path/path.js';
import { Dashboard } from './pages/Dashboard/dashboard.js';
import { Chat } from './pages/Home/chat.js';

/* ── Toast notifications ── */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = document.createElement('span');
  icon.textContent = icons[type] || 'ℹ️';

  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(document.createTextNode(' '));
  toast.appendChild(text);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
window.showToast = showToast;

const VIEWS = ['onboarding', 'chat', 'path', 'dashboard', 'explore'];
let _currentView = null;

/* ── Navigate to a view ── */
function navigate(viewId) {
  if (!VIEWS.includes(viewId)) {
    console.warn('App.navigate: unknown view', viewId);
    return;
  }
  _setView(viewId);
}

function _setView(viewId) {
  // Hide all views
  VIEWS.forEach(v => {
    document.getElementById(`view-${v}`)?.classList.remove('active');
  });

  // Update sidebar nav
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewId);
  });

  // Show target view
  const target = document.getElementById(`view-${viewId}`);
  if (!target) return;
  target.classList.add('active');

  // Update topbar
  const titles = {
    onboarding: { title: '🎓 Get Started',    sub: 'Set up your learning profile' },
    chat:       { title: '💬 AI Advisor',      sub: 'Chat with your personalised learning assistant' },
    path:       { title: '🗺️ Learning Path',  sub: 'Your structured roadmap to success' },
    dashboard:  { title: '📊 Dashboard',       sub: 'Track your progress and achievements' },
    explore:    { title: '🔍 Explore',          sub: 'Browse the full course catalogue' },
  };
  const t = titles[viewId] || {};
  const titleEl = document.getElementById('topbar-title');
  const subEl   = document.getElementById('topbar-subtitle');
  if (titleEl) titleEl.textContent = t.title  || viewId;
  if (subEl)   subEl.textContent   = t.sub    || '';

  // Init view-specific logic
  _initView(viewId, target);

  _currentView = viewId;
  // Update hash (sanitised — only valid view IDs reach here)
  history.replaceState(null, '', `#${viewId}`);

  _updateSidebarUser();
}

function _initView(viewId, container) {
  const contentEl = container.querySelector('.page-content') || container;

  switch (viewId) {
    case 'onboarding':
      Profile.renderOnboarding(container.querySelector('#onboarding-card'));
      break;

    case 'chat':
      Chat.init(container);
      break;

    case 'path':
      PathView.render(contentEl);
      break;

    case 'dashboard':
      Dashboard.render(contentEl);
      break;

    case 'explore':
      _renderExplore(contentEl);
      break;
  }
}

/* ── Explore view ── */
function _renderExplore(container) {
  const profile  = Storage.getProfile();
  const progress = Storage.getProgress();
  const all      = CourseCatalog.all;

  container.innerHTML = `
    <div style="margin-bottom:24px">
      <h1 class="section-title">Explore Courses</h1>
      <p class="section-subtitle">Browse our curated catalogue of ${all.length} courses across 6 domains</p>
    </div>

    <!-- Search & Filter -->
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <input type="text" id="explore-search" class="form-input"
        placeholder="🔍 Search courses, skills, topics..."
        style="flex:1;min-width:200px" maxlength="100" autocomplete="off">
      <select id="explore-domain" class="form-select" style="width:180px">
        <option value="">All Domains</option>
        <option value="web">🌐 Web Development</option>
        <option value="data">📊 Data Science</option>
        <option value="ai">🤖 AI / ML</option>
        <option value="cloud">☁️ Cloud &amp; DevOps</option>
        <option value="cyber">🔒 Cybersecurity</option>
        <option value="design">🎨 UI/UX Design</option>
      </select>
      <select id="explore-level" class="form-select" style="width:160px">
        <option value="">All Levels</option>
        <option value="beginner">🌱 Beginner</option>
        <option value="intermediate">🚀 Intermediate</option>
        <option value="advanced">⚡ Advanced</option>
      </select>
    </div>

    <!-- Course grid -->
    <div class="grid-auto" id="explore-grid"></div>
  `;

  const search = container.querySelector('#explore-search');
  const domain = container.querySelector('#explore-domain');
  const level  = container.querySelector('#explore-level');
  const grid   = container.querySelector('#explore-grid');

  const updateGrid = () => {
    const q = (search.value || '').trim();
    let courses = q ? CourseCatalog.search(q) : [...all];
    if (domain.value) courses = courses.filter(c => c.domain === domain.value);
    if (level.value)  courses = courses.filter(c => c.level  === level.value);
    // Sort: completed last
    const completedIds = progress.completedCourseIds;
    courses.sort((a, b) => {
      const aD = completedIds.includes(a.id) ? 1 : 0;
      const bD = completedIds.includes(b.id) ? 1 : 0;
      return aD - bD;
    });
    _renderExploreGrid(grid, courses, completedIds);
  };

  search.addEventListener('input', updateGrid);
  domain.addEventListener('change', updateGrid);
  level.addEventListener('change', updateGrid);

  // Event delegation for grid buttons
  grid.addEventListener('click', e => {
    const markBtn = e.target.closest('[data-mark-complete]');
    if (markBtn) {
      const courseId = markBtn.dataset.markComplete;
      if (!Sanitize.courseId(courseId)) return;
      Storage.markCourseComplete(courseId);
      showToast('✅ Marked complete!', 'success');
      updateGrid();
      return;
    }
    const unmarkBtn = e.target.closest('[data-mark-incomplete]');
    if (unmarkBtn) {
      const courseId = unmarkBtn.dataset.markIncomplete;
      if (!Sanitize.courseId(courseId)) return;
      Storage.markCourseIncomplete(courseId);
      showToast('Course marked incomplete', 'info');
      updateGrid();
    }
  });

  // Initial render
  updateGrid();
}

function _renderExploreGrid(grid, courses, completedIds) {
  grid.innerHTML = '';

  if (courses.length === 0) {
    const msg = document.createElement('div');
    msg.style.cssText = 'text-align:center;padding:60px;color:var(--text-muted);grid-column:1/-1';
    msg.textContent = 'No courses found. Try a different search.';
    grid.appendChild(msg);
    return;
  }

  const h = Sanitize.html;
  const domainBadge = { web: 'badge-indigo', data: 'badge-cyan', ai: 'badge-violet', cloud: 'badge-indigo', cyber: 'badge-rose', design: 'badge-amber' };

  courses.forEach(c => {
    const isComplete = completedIds.includes(c.id);
    const safeUrl    = _safeUrl(c.url);

    const card = document.createElement('div');
    card.className = `course-card${isComplete ? ' completed' : ''}`;

    card.innerHTML = `
      <div class="course-card-top">
        <span class="course-icon">${c.icon || '📖'}</span>
        <span class="badge ${domainBadge[c.domain] || 'badge-indigo'}">${h(c.domain)}</span>
      </div>
      <div class="course-title">${h(c.title)}</div>
      <div class="course-provider">by ${h(c.provider)}</div>
      <div class="course-tags">
        ${(c.tags || []).slice(0, 3).map(t => `<span class="course-tag">${h(t)}</span>`).join('')}
      </div>
      <div class="course-meta" style="margin-bottom:10px">
        <span>⏱️ ${h(c.duration)}</span>
        <span>⭐ ${h(String(c.rating))}</span>
        <span>🎯 ${h(c.level)}</span>
      </div>
      <p style="font-size:12px;color:var(--text-secondary);line-height:1.5;margin-bottom:10px">${h(c.description)}</p>
      <div style="display:flex;gap:8px">
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
          class="btn btn-primary btn-sm" style="flex:1;justify-content:center">
          ${isComplete ? '✅ Done — Revisit' : '🚀 Start'}
        </a>
        ${isComplete
          ? `<button class="btn btn-ghost btn-sm" data-mark-incomplete="${h(c.id)}">✗ Undo</button>`
          : `<button class="btn btn-secondary btn-sm" data-mark-complete="${h(c.id)}">✓ Done</button>`
        }
      </div>`;

    grid.appendChild(card);
  });
}

function _safeUrl(url) {
  if (!url || url === '#') return '#';
  try {
    const parsed = new URL(url);
    const allowed = [
      'coursera.org','udemy.com','freecodecamp.org','theodinproject.com',
      'scrimba.com','frontendmasters.com','kaggle.com','fast.ai',
      'github.com','google.com','microsoft.com','aws.amazon.com',
      'developers.google.com','youtube.com','developer.mozilla.org',
      'apollographql.com','nextjs.org','vercel.com','typescriptlang.org',
      'web.dev','security.google.com','owasp.org',
      'deeplearning.ai','huggingface.co','openai.com',
    ];
    if (parsed.protocol !== 'https:') return '#';
    if (!allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))) return '#';
    return parsed.href;
  } catch { return '#'; }
}

/* ── API Key Modal ── */
function showApiKeyModal() {
  const modal = document.getElementById('api-key-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  document.getElementById('api-key-input')?.focus();
}

function hideApiKeyModal() {
  document.getElementById('api-key-modal')?.classList.add('hidden');
}

function _bindApiKeyModal() {
  const saveBtn = document.getElementById('save-api-key-btn');
  const skipBtn = document.getElementById('skip-api-key-btn');
  const input   = document.getElementById('api-key-input');
  const modal   = document.getElementById('api-key-modal');
  if (!modal) return;

  modal.addEventListener('click', e => { if (e.target === modal) hideApiKeyModal(); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) hideApiKeyModal();
  });

  saveBtn?.addEventListener('click', async () => {
    const key = (input?.value || '').trim();
    if (!key) { showToast('Please enter your API key', 'error'); return; }
    if (key.length < 20) { showToast('That doesn\'t look like a valid API key', 'error'); return; }

    const origText = saveBtn.textContent;
    saveBtn.textContent = '🔄 Validating...';
    saveBtn.disabled = true;

    try {
      const valid = await AI.validateKey(key);
      if (valid) {
        Storage.saveApiKey(key);
        hideApiKeyModal();
        showToast('🎉 API key saved! Full AI mode activated.', 'success');
        _updateKeyIndicator();
        if (input) input.value = '';
      } else {
        showToast('❌ Invalid API key. Please check and try again.', 'error');
      }
    } catch {
      showToast('❌ Could not validate key. Check your internet connection.', 'error');
    } finally {
      saveBtn.textContent = origText;
      saveBtn.disabled = false;
    }
  });

  skipBtn?.addEventListener('click', hideApiKeyModal);

  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveBtn?.click();
  });
}

/* ── Sidebar user info ── */
function _updateSidebarUser() {
  const profile  = Storage.getProfile();
  const nameEl   = document.getElementById('sidebar-user-name');
  const levelEl  = document.getElementById('sidebar-user-level');
  const avatarEl = document.getElementById('sidebar-user-avatar');

  if (nameEl)   nameEl.textContent  = profile.name || 'Learner';
  if (levelEl)  levelEl.textContent = profile.level
    ? `${profile.level.charAt(0).toUpperCase() + profile.level.slice(1)} level`
    : 'Not set up yet';
  if (avatarEl && profile.name) {
    avatarEl.textContent = profile.name.charAt(0).toUpperCase();
  }
}

function _updateKeyIndicator() {
  const indicator = document.getElementById('ai-mode-indicator');
  if (!indicator) return;
  if (AI.hasKey()) {
    indicator.textContent = '🟢 AI Mode';
    indicator.title = 'Gemini AI connected';
    indicator.classList.add('active-ai');
  } else {
    indicator.textContent = '🔵 Demo Mode';
    indicator.title = 'Click to add API key for full AI';
    indicator.classList.remove('active-ai');
  }
}

/* ── Route from URL hash ── */
function _routeFromHash() {
  const rawHash = window.location.hash.replace('#', '').toLowerCase();
  const profile = Storage.getProfile();

  // Default first-time non-onboarded visitors to onboarding
  if (!profile.onboarded && !rawHash) {
    _setView('onboarding');
    return;
  }

  // Whitelist-validate hash
  if (VIEWS.includes(rawHash)) {
    _setView(rawHash);
  } else {
    _setView(profile.onboarded ? 'dashboard' : 'onboarding');
  }
}

/* ── Bootstrap ── */
function init() {
  // Bind sidebar nav items
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.dataset.view);
    });
  });

  // API Settings nav item
  document.getElementById('nav-settings')?.addEventListener('click', e => {
    e.preventDefault();
    showApiKeyModal();
  });

  document.getElementById('topbar-key-btn')?.addEventListener('click', showApiKeyModal);
  document.getElementById('ai-mode-indicator')?.addEventListener('click', showApiKeyModal);

  // Listen to cross-module custom show-apikey event (decoupled modal triggers)
  window.addEventListener('app:show-apikey', () => {
    showApiKeyModal();
  });

  _bindApiKeyModal();

  const profile = Storage.getProfile();
  if (profile.onboarded && !AI.hasKey()) {
    setTimeout(() => showToast('💡 Add your Gemini API key for full AI power. Click 🔵 Demo Mode.', 'info'), 2000);
  }

  _routeFromHash();
  _updateSidebarUser();
  _updateKeyIndicator();

  window.addEventListener('popstate', _routeFromHash);
}

export const App = { init, navigate, showApiKeyModal, hideApiKeyModal };
window.App = App;
