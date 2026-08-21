/**
 * dashboard.js — Progress Dashboard (production-hardened ESM)
 * FIXES:
 * - Chart instances properly destroyed before re-render (no canvas-already-in-use error)
 * - No inline onclick handlers — action items use addEventListener via event delegation
 * - All dynamic text content XSS-escaped via Sanitize.html
 * - Dashboard not-onboarded CTA uses button with event listener
 */

import { Storage, Sanitize } from '../../utils/storage.js';
import { CourseCatalog } from '../../features/courses/courses.js';

// Keep chart instances to destroy them on re-render
let _radarChart = null;

const ACHIEVEMENTS = [
  { id: 'first_course',  icon: '🌱', name: 'First Step',      desc: 'Complete your first course',      condition: p => p.completedCourseIds.length >= 1 },
  { id: 'three_courses', icon: '🏃', name: 'Momentum',        desc: 'Complete 3 courses',               condition: p => p.completedCourseIds.length >= 3 },
  { id: 'five_courses',  icon: '🔥', name: 'On Fire',         desc: 'Complete 5 courses',               condition: p => p.completedCourseIds.length >= 5 },
  { id: 'ten_courses',   icon: '⚡', name: 'Power Learner',   desc: 'Complete 10 courses',              condition: p => p.completedCourseIds.length >= 10 },
  { id: 'streak_3',      icon: '📅', name: '3-Day Streak',    desc: 'Study 3 days in a row',            condition: p => p.streak >= 3 },
  { id: 'streak_7',      icon: '🗓️', name: 'Week Warrior',   desc: 'Study 7 days in a row',            condition: p => p.streak >= 7 },
  { id: 'bookmarks',     icon: '🔖', name: 'Curator',         desc: 'Bookmark 5+ courses',              condition: p => (p.bookmarkedCourseIds || []).length >= 5 },
  { id: 'path_done',     icon: '🏆', name: 'Path Complete',   desc: 'Finish your entire learning path', condition: () => false },
];

/* ── Main render ── */
function render(container) {
  if (!container) return;

  _destroyCharts();

  const profile  = Storage.getProfile();
  const progress = Storage.getProgress();
  const path     = Storage.getPath();
  const h        = Sanitize.html;

  if (!profile.onboarded) {
    container.innerHTML = `
      <div style="text-align:center;padding:80px">
        <div style="font-size:64px;margin-bottom:20px">📊</div>
        <h2 style="font-weight:700;margin-bottom:8px">Complete Your Profile</h2>
        <p style="color:var(--text-secondary);margin-bottom:20px">Set up your profile to see your personalised dashboard.</p>
        <button class="btn btn-primary" id="dash-go-onboarding">Get Started →</button>
      </div>`;
    container.querySelector('#dash-go-onboarding')?.addEventListener('click', () => {
      window.location.hash = '#onboarding';
    });
    return;
  }

  const stats = _computeStats(progress, path);

  container.innerHTML = `
    <!-- Header -->
    <div style="margin-bottom:24px">
      <h1 class="section-title">Dashboard</h1>
      <p class="section-subtitle">Welcome back, ${h(profile.name)}! Here's your learning progress. 🚀</p>
    </div>

    <!-- Stat Cards -->
    <div class="dashboard-stats">
      ${_statCardHTML('📚', 'Courses Completed', stats.completed, 'Total done',       'rgba(99,102,241,0.15)', 'var(--indigo)')}
      ${_statCardHTML('🔥', 'Day Streak',         stats.streak,    'Keep it up!',     'rgba(245,158,11,0.15)', 'var(--amber)')}
      ${_statCardHTML('⏱️', 'Hours Learned',     stats.hours,     'Estimated',        'rgba(6,182,212,0.15)',  'var(--cyan)')}
      ${_statCardHTML('🎯', 'Path Progress',      stats.pct + '%', 'To goal',          'rgba(16,185,129,0.15)', 'var(--emerald)')}
    </div>

    <!-- Charts Row -->
    <div class="grid-2" style="margin-bottom:24px">
      <!-- Skill Radar -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">Skill Profile</div>
          <div class="chart-card-subtitle">Estimated skill levels across domains</div>
        </div>
        <canvas id="radar-chart" style="max-height:280px"></canvas>
      </div>

      <!-- Progress by Domain -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">Progress by Domain</div>
          <div class="chart-card-subtitle">Courses completed per category</div>
        </div>
        <div id="domain-progress" style="margin-top:8px"></div>
      </div>
    </div>

    <!-- Next Actions + Activity -->
    <div class="grid-2" style="margin-bottom:24px">
      <!-- Next Actions -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">🎯 Next Recommended Actions</div>
          <div class="chart-card-subtitle">Your personalised to-do list</div>
        </div>
        <div id="next-actions"></div>
      </div>

      <!-- Activity Calendar -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">📅 Activity Calendar</div>
          <div class="chart-card-subtitle">Your learning consistency</div>
        </div>
        <div id="activity-calendar" style="margin-top:12px"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:12px;font-size:11px;color:var(--text-secondary)">
          <span>Less</span>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(255,255,255,0.05)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(99,102,241,0.25)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:rgba(99,102,241,0.5)"></div>
          <div style="width:12px;height:12px;border-radius:2px;background:var(--indigo)"></div>
          <span>More</span>
        </div>
      </div>
    </div>

    <!-- Achievements -->
    <div class="chart-card" style="margin-bottom:24px">
      <div class="chart-card-header">
        <div class="chart-card-title">🏆 Achievements</div>
        <div class="chart-card-subtitle">Badges earned on your journey</div>
      </div>
      <div class="achievements-grid" id="achievements-grid"></div>
    </div>

    <!-- Learning Path Summary -->
    ${path ? `
      <div class="chart-card">
        <div class="chart-card-header">
          <div class="chart-card-title">📖 Path Summary</div>
          <div class="chart-card-subtitle">${h(path.title || '')}</div>
        </div>
        <div id="path-summary"></div>
        <div style="margin-top:16px">
          <button class="btn btn-primary btn-sm" id="dash-view-path">View Full Path →</button>
        </div>
      </div>` : ''}
  `;

  // Bind action buttons
  container.querySelector('#dash-view-path')?.addEventListener('click', () => {
    window.location.hash = '#path';
  });

  // Render sub-components
  _renderRadarChart(profile, progress);
  _renderDomainProgress(container, progress);
  _renderNextActions(container, profile, path, progress);
  _renderCalendar(container, progress);
  _renderAchievements(container, progress);
  if (path) _renderPathSummary(container, path, progress);
}

function _destroyCharts() {
  if (_radarChart) { try { _radarChart.destroy(); } catch {} _radarChart = null; }
}

function _statCardHTML(icon, label, value, sub, bgColor, color) {
  return `
    <div class="stat-card">
      <div class="stat-icon" style="background:${bgColor};color:${color}">${icon}</div>
      <div class="stat-value" style="color:${color}">${value}</div>
      <div class="stat-label">${label}</div>
      <div class="stat-delta up">↑ ${sub}</div>
    </div>`;
}

function _computeStats(progress, path) {
  const completed = progress.completedCourseIds.length;
  const hours = CourseCatalog.all
    .filter(c => progress.completedCourseIds.includes(c.id))
    .reduce((s, c) => s + (parseFloat(c.duration) || 0), 0);

  let pct = 0;
  if (path) {
    const total = path.phases.reduce((s, p) => s + p.courses.length, 0);
    const done  = path.phases.reduce((s, p) =>
      s + p.courses.filter(c => progress.completedCourseIds.includes(c.id)).length, 0);
    pct = total > 0 ? Math.round((done / total) * 100) : 0;
  }
  return { completed, streak: progress.streak || 0, hours: Math.round(hours), pct };
}

function _renderRadarChart(profile, progress) {
  const canvas = document.getElementById('radar-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const domains = ['web', 'data', 'ai', 'cloud', 'cyber', 'design'];
  const labels  = ['Web Dev', 'Data Science', 'AI/ML', 'Cloud', 'Cybersecurity', 'UI/UX'];

  const completedCourses = CourseCatalog.all.filter(c => progress.completedCourseIds.includes(c.id));
  const coursesByDomain  = {};
  domains.forEach(d => coursesByDomain[d] = CourseCatalog.getByDomain(d).length || 1);

  const currentScores = domains.map(d => {
    const done  = completedCourses.filter(c => c.domain === d).length;
    return Math.round((done / coursesByDomain[d]) * 100);
  });

  const projectedScores = domains.map((d, i) => {
    const isInterest = (profile.interests || []).includes(d);
    return isInterest ? Math.min(currentScores[i] + 35, 100) : Math.min(currentScores[i] + 10, 60);
  });

  const ctx = canvas.getContext('2d');
  _radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: 'Current',
          data: currentScores,
          backgroundColor: 'rgba(99,102,241,0.15)',
          borderColor: 'rgba(99,102,241,0.8)',
          pointBackgroundColor: 'rgba(99,102,241,1)',
          borderWidth: 2,
        },
        {
          label: 'After Path',
          data: projectedScores,
          backgroundColor: 'rgba(6,182,212,0.08)',
          borderColor: 'rgba(6,182,212,0.6)',
          pointBackgroundColor: 'rgba(6,182,212,1)',
          borderWidth: 2,
          borderDash: [5, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { stepSize: 25, color: 'rgba(148,163,184,0.5)', font: { size: 10 }, backdropColor: 'transparent' },
          grid:         { color: 'rgba(255,255,255,0.07)' },
          angleLines:   { color: 'rgba(255,255,255,0.07)' },
          pointLabels:  { color: '#94a3b8', font: { size: 11, family: 'Inter' } },
        },
      },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' }, boxWidth: 14, padding: 16 } },
      },
    },
  });
}

function _renderDomainProgress(container, progress) {
  const el = container.querySelector('#domain-progress');
  if (!el) return;

  const domains = [
    { id: 'web',    label: '🌐 Web Dev',        color: '#6366f1' },
    { id: 'data',   label: '📊 Data Science',   color: '#06b6d4' },
    { id: 'ai',     label: '🤖 AI / ML',        color: '#8b5cf6' },
    { id: 'cloud',  label: '☁️ Cloud & DevOps', color: '#3b82f6' },
    { id: 'cyber',  label: '🔒 Cybersecurity',  color: '#f43f5e' },
    { id: 'design', label: '🎨 UI/UX',           color: '#f59e0b' },
  ];

  const completed = CourseCatalog.all.filter(c => progress.completedCourseIds.includes(c.id));
  el.innerHTML = domains.map(d => {
    const total = CourseCatalog.getByDomain(d.id).length;
    const done  = completed.filter(c => c.domain === d.id).length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    return `
      <div class="skill-bar">
        <div class="skill-bar-header">
          <span class="skill-bar-name">${d.label}</span>
          <span class="skill-bar-pct">${done}/${total}</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%;background:${d.color}"></div>
        </div>
      </div>`;
  }).join('');
}

function _renderNextActions(container, profile, path, progress) {
  const el = container.querySelector('#next-actions');
  if (!el) return;

  const actions = [];

  if (!path) {
    actions.push({ icon: '🗺️', title: 'Generate Your Learning Path', sub: 'AI-personalised roadmap awaits', view: 'path' });
  } else {
    for (const phase of path.phases) {
      for (const course of phase.courses) {
        if (!progress.completedCourseIds.includes(course.id)) {
          actions.push({
            icon: course.icon || '📖',
            title: course.title,
            sub: `${phase.title} • ${course.duration}`,
            view: 'path',
          });
          break;
        }
      }
      if (actions.length >= 2) break;
    }
  }

  if (!Storage.hasApiKey()) {
    actions.push({ icon: '🔑', title: 'Add Your Gemini API Key', sub: 'Unlock full AI-powered recommendations', modal: 'apikey' });
  }

  if ((profile.interests || []).length < 3) {
    actions.push({ icon: '🎯', title: 'Add More Interests', sub: 'Improve recommendation accuracy', view: 'onboarding' });
  }

  actions.push({ icon: '💬', title: 'Chat with Your AI Advisor', sub: 'Ask questions, get guidance', view: 'chat' });

  el.innerHTML = '';
  actions.slice(0, 4).forEach(a => {
    const div = document.createElement('div');
    div.className = 'action-item';
    div.setAttribute('tabindex', '0');
    div.setAttribute('role', 'button');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'action-icon';
    iconSpan.textContent = a.icon;

    const infoDiv = document.createElement('div');
    infoDiv.className = 'action-info';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'action-title';
    titleDiv.textContent = a.title;
    const subDiv = document.createElement('div');
    subDiv.className = 'action-sub';
    subDiv.textContent = a.sub;
    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(subDiv);

    const arrow = document.createElement('span');
    arrow.className = 'action-arrow';
    arrow.textContent = '›';

    div.appendChild(iconSpan);
    div.appendChild(infoDiv);
    div.appendChild(arrow);

    const handleClick = () => {
      if (a.view)  window.location.hash = '#' + a.view;
      if (a.modal === 'apikey') {
        window.dispatchEvent(new CustomEvent('app:show-apikey'));
      }
    };
    div.addEventListener('click', handleClick);
    div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } });

    el.appendChild(div);
  });
}

function _renderCalendar(container, progress) {
  const el = container.querySelector('#activity-calendar');
  if (!el) return;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = [];

  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = (progress.activityLog || []).filter(e => (e.date || '').startsWith(dateStr)).length;
    let level = 0;
    if      (count >= 3) level = 4;
    else if (count === 2) level = 3;
    else if (count === 1) level = 2;

    const cell = document.createElement('div');
    cell.className = `cal-cell l${level}`;
    cell.title = `${dateStr}: ${count} activities`;
    cells.push(cell);
  }

  el.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';
  cells.forEach(c => grid.appendChild(c));
  el.appendChild(grid);
}

function _renderAchievements(container, progress) {
  const el = container.querySelector('#achievements-grid');
  if (!el) return;
  const h = Sanitize.html;

  el.innerHTML = ACHIEVEMENTS.map(a => {
    const earned = a.condition(progress);
    return `
      <div class="achievement ${earned ? 'earned' : 'locked'}" title="${h(a.desc)}">
        <div class="achievement-icon">${a.icon}</div>
        <div class="achievement-name">${h(a.name)}</div>
        ${earned ? '<div style="font-size:10px;color:var(--emerald);margin-top:3px">✓ Earned</div>' : ''}
      </div>`;
  }).join('');
}

function _renderPathSummary(container, path, progress) {
  const el = container.querySelector('#path-summary');
  if (!el) return;
  const h = Sanitize.html;
  const completedIds = progress.completedCourseIds;

  el.innerHTML = path.phases.map((phase, i) => {
    const done  = phase.courses.filter(c => completedIds.includes(c.id)).length;
    const total = phase.courses.length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
    return `
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
        <div style="width:28px;height:28px;border-radius:50%;background:rgba(99,102,241,0.2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${i + 1}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;margin-bottom:4px">${h(phase.title || '')}</div>
          <div class="progress-bar-wrap" style="height:6px">
            <div class="progress-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);min-width:50px;text-align:right">${done}/${total}</div>
        ${pct === 100 ? '<span style="color:var(--emerald)">✅</span>' : ''}
      </div>`;
  }).join('');
}

export const Dashboard = { render };
