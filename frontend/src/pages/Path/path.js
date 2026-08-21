/**
 * path.js — Learning Path Generator & Renderer (production-hardened ESM)
 * FIXES:
 * - No inline onclick handlers — all events bound via addEventListener
 * - XSS: all user-generated text escaped via Sanitize.html()
 * - _generating flag always reset even after re-render
 * - Chart destruction handled to avoid canvas-already-in-use errors
 */

import { Storage, Sanitize } from '../../utils/storage.js';
import { CourseCatalog } from '../../features/courses/courses.js';
import { AI } from '../../features/recommendation/recommendation.js';

let _generating = false;
let _currentContainer = null;

/* ── Main render ── */
function render(container) {
  if (!container) return;
  _currentContainer = container;
  const path    = Storage.getPath();
  const profile = Storage.getProfile();

  if (!profile.onboarded) {
    container.innerHTML = _noProfileHTML();
    container.querySelector('#go-onboarding-btn')?.addEventListener('click', () => App.navigate('onboarding'));
    return;
  }

  if (!path) {
    container.innerHTML = _noPathHTML(profile);
    _bindGenerateBtn(container, profile);
    return;
  }

  container.innerHTML = _pathHTML(path, profile);
  _bindPathEvents(container, path, profile);
}

/* ── Empty state HTML ── */
function _noProfileHTML() {
  return `
    <div style="text-align:center;padding:80px 20px">
      <div style="font-size:64px;margin-bottom:20px">🎓</div>
      <h2 style="font-size:24px;font-weight:700;margin-bottom:8px">Complete Your Profile First</h2>
      <p style="color:var(--text-secondary);margin-bottom:24px">We need to know a bit about you to generate your personalised path.</p>
      <button class="btn btn-primary" id="go-onboarding-btn">Set Up Profile →</button>
    </div>`;
}

function _noPathHTML(profile) {
  const h = Sanitize.html;
  return `
    <div class="path-header">
      <h1 class="section-title">Your Learning Path</h1>
      <p class="section-subtitle">AI-generated roadmap tailored to your goals</p>
    </div>
    <div style="text-align:center;padding:60px 20px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-xl)">
      <div style="font-size:72px;margin-bottom:20px">🗺️</div>
      <h2 style="font-size:22px;font-weight:700;margin-bottom:10px">No Learning Path Yet</h2>
      <p style="color:var(--text-secondary);max-width:480px;margin:0 auto 28px;line-height:1.7">
        Hi <strong>${h(profile.name)}</strong>! Ready to create your personalised roadmap toward
        <em>"${h(profile.goal)}"</em>? Our AI will build a structured path with phases, milestones, and curated resources.
      </p>
      <button class="btn btn-primary btn-lg" id="generate-path-btn">✨ Generate My Learning Path</button>
      <p style="font-size:12px;color:var(--text-muted);margin-top:14px">
        ${AI.hasKey() ? '🟢 Using Gemini AI for personalised recommendations' : '🔵 Demo mode — Add your API key for full AI power'}
      </p>
    </div>`;
}

function _pathHTML(path, profile) {
  const progress   = Storage.getProgress();
  const completed  = progress.completedCourseIds;
  const totalCourses    = path.phases.reduce((s, p) => s + p.courses.length, 0);
  const completedCount  = path.phases.reduce((s, p) =>
    s + p.courses.filter(c => completed.includes(c.id)).length, 0);
  const pct = totalCourses > 0 ? Math.round((completedCount / totalCourses) * 100) : 0;
  const h = Sanitize.html;

  return `
    <div class="path-header">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <h1 class="section-title">${h(path.title || 'Your Learning Path')}</h1>
          <p class="section-subtitle" style="max-width:600px">${h(path.description || '')}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" id="regenerate-btn">🔄 Regenerate</button>
          <button class="btn btn-secondary btn-sm" id="export-btn">📤 Export Path</button>
        </div>
      </div>

      <!-- Progress overview -->
      <div class="card card-p" style="margin-top:20px;background:linear-gradient(135deg,rgba(99,102,241,0.1),rgba(139,92,246,0.1));border-color:rgba(99,102,241,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
          <div style="display:flex;gap:24px;flex-wrap:wrap">
            ${_statChip(pct + '%', 'Complete')}
            <div style="width:1px;background:var(--border-subtle)"></div>
            ${_statChip(completedCount, 'Courses done')}
            <div style="width:1px;background:var(--border-subtle)"></div>
            ${_statChip(totalCourses - completedCount, 'Remaining')}
            <div style="width:1px;background:var(--border-subtle)"></div>
            ${_statChip(path.phases.length, 'Phases')}
          </div>
          <div style="flex:1;min-width:200px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
              <span style="color:var(--text-secondary)">Overall Progress</span>
              <span style="font-weight:700">${pct}%</span>
            </div>
            <div class="progress-bar-wrap" style="height:10px">
              <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:6px">🏁 Goal: ${h(path.totalDuration || '')}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Phases -->
    <div id="phases-container">
      ${path.phases.map((phase, i) => _phaseHTML(phase, i, completed)).join('')}
    </div>

    <!-- Completion CTA -->
    ${pct === 100 ? `
      <div style="text-align:center;padding:40px;background:linear-gradient(135deg,rgba(16,185,129,0.1),rgba(6,182,212,0.1));border:1px solid rgba(16,185,129,0.3);border-radius:var(--radius-xl)">
        <div style="font-size:56px;margin-bottom:12px">🏆</div>
        <h2 style="font-size:22px;font-weight:800;margin-bottom:8px">Path Complete!</h2>
        <p style="color:var(--text-secondary);margin-bottom:20px">Incredible work, ${h(profile.name)}! You've completed all ${totalCourses} courses.</p>
        <button class="btn btn-primary" id="regenerate-btn-2">🚀 Generate Advanced Path</button>
      </div>` : ''}
  `;
}

function _statChip(value, label) {
  return `
    <div style="text-align:center">
      <div style="font-size:28px;font-weight:800;line-height:1">${value}</div>
      <div style="font-size:11px;color:var(--text-secondary)">${label}</div>
    </div>`;
}

function _phaseHTML(phase, index, completedIds) {
  const total = phase.courses.length;
  const done  = phase.courses.filter(c => completedIds.includes(c.id)).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const isComplete = done === total && total > 0;
  const h = Sanitize.html;

  const phaseColors = ['var(--indigo)', 'var(--cyan)', 'var(--emerald)', 'var(--amber)', 'var(--rose)'];
  const color = phaseColors[index % phaseColors.length];

  return `
    <div class="phase-card" data-phase-id="${h(String(phase.id))}">
      <div class="phase-header" data-toggle-phase>
        <div class="phase-number" style="background:${color}40;color:${color};border:1px solid ${color}60">${index + 1}</div>
        <div class="phase-info">
          <div class="phase-title">${h(phase.title || '')} ${isComplete ? '✅' : ''}</div>
          <div class="phase-meta">📅 ${h(phase.duration || '')} &bull; ${total} courses &bull; ${done}/${total} complete</div>
        </div>
        <div class="phase-progress-wrap">
          <div style="font-size:11px;color:var(--text-secondary);text-align:right;margin-bottom:4px">${pct}%</div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
        </div>
        <span class="phase-toggle">›</span>
      </div>

      <div style="padding:10px 24px 0;font-size:13px;color:var(--text-secondary);font-style:italic">
        💡 ${h(phase.theme || '')}
      </div>
      <div class="milestone-banner">
        <span class="milestone-icon">🏁</span>
        <div><strong>Milestone:</strong> ${h(phase.milestone || '')}</div>
      </div>
      <div class="phase-courses">
        ${phase.courses.map(course => _courseCardHTML(course, completedIds)).join('')}
      </div>
    </div>`;
}

function _courseCardHTML(course, completedIds) {
  const isComplete   = completedIds.includes(course.id);
  const isBookmarked = (Storage.getProgress().bookmarkedCourseIds || []).includes(course.id);
  const h = Sanitize.html;
  const levelColors  = { beginner: 'badge-emerald', intermediate: 'badge-cyan', advanced: 'badge-violet' };

  const safeUrl = _safeUrl(course.url);

  return `
    <div class="course-card ${isComplete ? 'completed' : ''}" data-course-id="${h(course.id)}">
      <div class="course-card-top">
        <span class="course-icon">${course.icon || '📖'}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <button class="btn-icon course-bookmark-btn" data-course-id="${h(course.id)}"
            style="width:28px;height:28px;font-size:14px"
            title="${isBookmarked ? 'Remove bookmark' : 'Bookmark this course'}"
            aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark'}">
            ${isBookmarked ? '🔖' : '🤍'}
          </button>
          <div class="course-check course-complete-btn" data-course-id="${h(course.id)}"
            title="${isComplete ? 'Click to mark incomplete' : 'Click to mark complete'}"
            role="checkbox" aria-checked="${isComplete}" tabindex="0">
            ${isComplete ? '✓' : ''}
          </div>
        </div>
      </div>
      <div class="course-title">${h(course.title)}</div>
      <div class="course-provider">by ${h(course.provider)}</div>
      <div class="course-tags">
        <span class="badge ${levelColors[course.level] || 'badge-indigo'}">${h(course.level)}</span>
        ${(course.tags || []).slice(0, 2).map(t => `<span class="course-tag">${h(t)}</span>`).join('')}
      </div>
      <div class="course-meta">
        <span>⏱️ ${h(course.duration)}</span>
        <span>⭐ ${h(String(course.rating))}</span>
        <span>👥 ${h(course.students)}</span>
      </div>
      ${course.why ? `<div class="course-why">💡 ${h(course.why)}</div>` : ''}
      <div style="display:flex;gap:8px;margin-top:12px">
        <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
          class="btn btn-primary btn-sm" style="flex:1;justify-content:center">
          ${course.url === '#' ? '📁 Start Project' : '🚀 Start Course'}
        </a>
        <button class="btn btn-secondary btn-sm course-explain-btn" data-course-id="${h(course.id)}" title="Ask AI about this course">🤖</button>
      </div>
    </div>`;
}

function _safeUrl(url) {
  if (!url || url === '#') return '#';
  try {
    const parsed = new URL(url);
    const allowed = [
      'coursera.org', 'udemy.com', 'freecodecamp.org', 'theodinproject.com',
      'scrimba.com', 'frontendmasters.com', 'kaggle.com', 'fast.ai',
      'github.com', 'google.com', 'microsoft.com', 'aws.amazon.com',
      'developers.google.com', 'youtube.com', 'developer.mozilla.org',
      'apollographql.com', 'nextjs.org', 'vercel.com', 'typescriptlang.org',
      'web.dev', 'security.google.com', 'owasp.org',
      'deeplearning.ai', 'huggingface.co', 'openai.com',
    ];
    if (parsed.protocol !== 'https:') return '#';
    if (!allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))) return '#';
    return parsed.href;
  } catch { return '#'; }
}

function _bindPathEvents(container, path, profile) {
  container.querySelectorAll('[data-toggle-phase]').forEach(header => {
    header.addEventListener('click', () => header.closest('.phase-card').classList.toggle('collapsed'));
  });

  container.querySelectorAll('.course-complete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const courseId = btn.dataset.courseId;
      if (!Sanitize.courseId(courseId)) return;
      const p = Storage.getProgress();
      if (p.completedCourseIds.includes(courseId)) {
        Storage.markCourseIncomplete(courseId);
        showToast('Course marked incomplete', 'info');
      } else {
        Storage.markCourseComplete(courseId);
        showToast('🎉 Course marked complete!', 'success');
        const prog = Storage.getProgress();
        if (prog.streak > 0 && prog.streak % 7 === 0) {
          showToast(`🔥 ${prog.streak}-day streak! Keep it up!`, 'info');
        }
      }
      render(container);
      const dash = document.querySelector('#view-dashboard.active .page-content');
      if (dash) window.Dashboard?.render(dash);
    });
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); } });
  });

  container.querySelectorAll('.course-bookmark-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const courseId = btn.dataset.courseId;
      if (!Sanitize.courseId(courseId)) return;
      const bookmarked = Storage.toggleBookmark(courseId);
      showToast(bookmarked ? '🔖 Bookmarked!' : 'Bookmark removed', 'info');
      render(container);
    });
  });

  container.querySelectorAll('.course-explain-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const courseId = btn.dataset.courseId;
      const course   = CourseCatalog.getById(courseId);
      const prof     = Storage.getProfile();
      if (!course || !prof.onboarded) return;

      btn.disabled = true;
      btn.textContent = '⟳';
      showToast('🤖 Getting AI explanation...', 'info');

      try {
        const explanation = await AI.explain(course, prof);
        _showExplainModal(course, explanation);
      } catch {
        showToast('Could not fetch AI explanation. Check your API key.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = '🤖';
      }
    });
  });

  const regenHandler = () => {
    if (!confirm('Regenerate your path? This will clear the current roadmap and create a fresh one.')) return;
    Storage.clearPath();
    render(container);
  };
  container.querySelector('#regenerate-btn')?.addEventListener('click', regenHandler);
  container.querySelector('#regenerate-btn-2')?.addEventListener('click', () => {
    Storage.clearPath(); render(container);
  });

  container.querySelector('#export-btn')?.addEventListener('click', () => _exportPath(path));
  container.querySelector('#go-onboarding-btn')?.addEventListener('click', () => App.navigate('onboarding'));
}

function _bindGenerateBtn(container, profile) {
  const btn = container.querySelector('#generate-path-btn');
  if (!btn || _generating) return;

  btn.addEventListener('click', async () => {
    if (_generating) return;
    _generating = true;
    btn.disabled = true;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span style="display:inline-block;animation:spin 1s linear infinite">⟳</span> Generating your path...';
    if (!document.querySelector('#spin-keyframes')) {
      const s = document.createElement('style');
      s.id = 'spin-keyframes';
      s.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }

    try {
      const path = await AI.generatePath(profile);
      Storage.savePath(path);
      showToast('🎉 Your learning path is ready!', 'success');
      render(container);
    } catch (e) {
      console.error('Path generation error:', e);
      showToast('Failed to generate path. ' + (e.message || 'Check your connection.'), 'error');
      btn.disabled  = false;
      btn.innerHTML = originalText;
    } finally {
      _generating = false;
    }
  });
}

function _showExplainModal(course, explanation) {
  document.querySelector('#explain-modal')?.remove();
  const h = Sanitize.html;

  const modal = document.createElement('div');
  modal.id = 'explain-modal';
  modal.className = 'modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Course explanation');

  const safeExplanation = h(explanation || '').replace(/\n/g, '<br>');
  const safeUrl = _safeUrl(course.url);

  const card = document.createElement('div');
  card.className = 'modal-card';
  card.style.maxWidth = '500px';
  card.innerHTML = `
    <div style="font-size:42px;text-align:center;margin-bottom:12px">${course.icon || '📖'}</div>
    <h3 style="font-size:18px;font-weight:700;text-align:center;margin-bottom:6px">${h(course.title)}</h3>
    <div style="text-align:center;margin-bottom:16px"><span class="badge badge-indigo">${h(course.provider)}</span></div>
    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:var(--radius-md);padding:16px;font-size:14px;line-height:1.7;color:var(--text-primary);margin-bottom:20px">
      ${safeExplanation}
    </div>
    <div style="display:flex;gap:10px">
      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="flex:1;justify-content:center">🚀 Go to Course</a>
      <button class="btn btn-secondary" id="explain-close-btn">Close</button>
    </div>`;

  modal.appendChild(card);
  document.body.appendChild(modal);

  modal.querySelector('#explain-close-btn').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escClose); }
  });
}

function _exportPath(path) {
  const h = s => String(s || '').replace(/[<>&"']/g, '');
  let text = `# ${h(path.title)}\n${h(path.description)}\n\nTimeline: ${h(path.totalDuration)}\n\n`;
  path.phases.forEach((phase, i) => {
    text += `## Phase ${i + 1}: ${h(phase.title)}\n${h(phase.theme)}\n\n`;
    phase.courses.forEach(c => {
      text += `- **${h(c.title)}** (${h(c.provider)}) — ${h(c.duration)}\n`;
      if (c.why) text += `  > ${h(c.why)}\n`;
      text += `  🔗 ${h(c.url)}\n`;
    });
    text += `\n🏁 Milestone: ${h(phase.milestone)}\n\n`;
  });

  try {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'learning-path.md';
    a.rel      = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    showToast('📤 Path exported as Markdown!', 'success');
  } catch {
    showToast('Export failed. Try again.', 'error');
  }
}

export const PathView = { render };
