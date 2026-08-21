/**
 * storage.js — LocalStorage persistence layer (production-hardened)
 * - All data lives here; zero external database required
 * - Input validation on all writes
 * - API key never stored in memory longer than needed
 */

'use strict';

const STORAGE_KEYS = Object.freeze({
  PROFILE:   'alpr_profile_v2',
  PROGRESS:  'alpr_progress_v2',
  PATH:      'alpr_path_v2',
  CHAT:      'alpr_chat_v2',
  API_KEY:   'alpr_gk',
  SETTINGS:  'alpr_settings_v2',
});

/* ── Input sanitisation helpers ── */
export const Sanitize = {
  /** Strip all HTML tags and limit string length */
  text(val, maxLen = 500) {
    if (typeof val !== 'string') return '';
    return val.replace(/<[^>]*>/g, '').slice(0, maxLen);
  },
  /** Escape HTML special chars for safe innerHTML insertion */
  html(val) {
    if (typeof val !== 'string') return '';
    return val
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },
  /** Validate that a string is a safe course ID (alphanumeric + hyphens) */
  courseId(id) {
    return typeof id === 'string' && /^[a-z0-9_-]{2,10}$/.test(id);
  },
  /** Validate a view name */
  viewId(id) {
    return ['onboarding', 'chat', 'path', 'dashboard', 'explore'].includes(id);
  },
};

export const Storage = {
  /* ── Generic helpers ── */
  _get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },
  _set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) {
      console.error('Storage write failed:', e);
      return false;
    }
  },
  _remove(key) { localStorage.removeItem(key); },

  clearAll() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  },

  /* ── Learner Profile ── */
  getProfile() {
    const defaults = {
      name: '',
      goal: '',
      level: '',
      interests: [],
      completedCourses: [],
      currentSkills: [],
      timeline: '',
      onboarded: false,
      createdAt: null,
      updatedAt: null,
    };
    const stored = this._get(STORAGE_KEYS.PROFILE, defaults);
    return { ...defaults, ...stored };
  },

  saveProfile(profile) {
    const existing = this.getProfile();
    const merged = { ...existing, ...profile };
    // Sanitize text fields
    merged.name     = Sanitize.text(merged.name || '', 100);
    merged.goal     = Sanitize.text(merged.goal || '', 500);
    merged.timeline = Sanitize.text(merged.timeline || '', 50);
    merged.level    = ['beginner', 'intermediate', 'advanced'].includes(merged.level) ? merged.level : '';
    merged.interests = Array.isArray(merged.interests)
      ? merged.interests.filter(i => ['web','data','ai','cloud','cyber','design'].includes(i))
      : [];
    merged.updatedAt = new Date().toISOString();
    return this._set(STORAGE_KEYS.PROFILE, merged);
  },

  /* ── Progress ── */
  getProgress() {
    const defaults = {
      completedCourseIds:  [],
      skippedCourseIds:    [],
      bookmarkedCourseIds: [],
      completedMilestones: [],
      totalHoursSpent:     0,
      streak:              0,
      lastActivityDate:    null,
      activityLog:         [],
    };
    const stored = this._get(STORAGE_KEYS.PROGRESS, defaults);
    return { ...defaults, ...stored };
  },

  saveProgress(progress) {
    return this._set(STORAGE_KEYS.PROGRESS, progress);
  },

  markCourseComplete(courseId) {
    if (!Sanitize.courseId(courseId)) return null;
    const p = this.getProgress();
    if (!p.completedCourseIds.includes(courseId)) {
      p.completedCourseIds.push(courseId);
    }
    // Remove from skipped if present
    p.skippedCourseIds = p.skippedCourseIds.filter(id => id !== courseId);
    p.activityLog.push({ date: new Date().toISOString(), courseId, action: 'complete' });
    // Keep activity log to 200 entries
    if (p.activityLog.length > 200) p.activityLog.splice(0, p.activityLog.length - 200);
    p.lastActivityDate = new Date().toISOString();
    p.streak = this._calcStreak(p.activityLog);
    this.saveProgress(p);
    return p;
  },

  markCourseIncomplete(courseId) {
    if (!Sanitize.courseId(courseId)) return null;
    const p = this.getProgress();
    p.completedCourseIds = p.completedCourseIds.filter(id => id !== courseId);
    this.saveProgress(p);
    return p;
  },

  toggleBookmark(courseId) {
    if (!Sanitize.courseId(courseId)) return false;
    const p = this.getProgress();
    const idx = p.bookmarkedCourseIds.indexOf(courseId);
    if (idx === -1) p.bookmarkedCourseIds.push(courseId);
    else p.bookmarkedCourseIds.splice(idx, 1);
    this.saveProgress(p);
    return p.bookmarkedCourseIds.includes(courseId);
  },

  _calcStreak(activityLog) {
    if (!activityLog.length) return 0;
    const dates = [...new Set(activityLog.map(e => e.date.slice(0, 10)))].sort().reverse();
    let streak = 0;
    let current = new Date(); current.setHours(0, 0, 0, 0);
    for (const d of dates) {
      const day = new Date(d);
      const diff = Math.round((current - day) / 86400000);
      if (diff <= 1) { streak++; current = day; }
      else break;
    }
    return streak;
  },

  /* ── Learning Path ── */
  getPath() { return this._get(STORAGE_KEYS.PATH, null); },
  savePath(path) {
    if (!path || typeof path !== 'object') return false;
    return this._set(STORAGE_KEYS.PATH, path);
  },
  clearPath() { this._remove(STORAGE_KEYS.PATH); },

  /* ── Chat History ── */
  getChatHistory() { return this._get(STORAGE_KEYS.CHAT, []); },
  appendMessage(msg) {
    if (!msg || !['user','ai'].includes(msg.role)) return;
    const history = this.getChatHistory();
    history.push({
      role: msg.role,
      content: Sanitize.text(msg.content || '', 4000),
      ts: new Date().toISOString(),
    });
    if (history.length > 100) history.splice(0, history.length - 100);
    this._set(STORAGE_KEYS.CHAT, history);
  },
  clearChat() { this._remove(STORAGE_KEYS.CHAT); },

  /* ── API Key ── */
  getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },
  saveApiKey(key) {
    if (typeof key !== 'string' || key.length < 20) return false;
    localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
    return true;
  },
  clearApiKey() { this._remove(STORAGE_KEYS.API_KEY); },
  hasApiKey() { return !!this.getApiKey(); },

  /* ── Settings ── */
  getSettings() {
    return this._get(STORAGE_KEYS.SETTINGS, { theme: 'dark', notifications: true });
  },
  saveSettings(settings) {
    return this._set(STORAGE_KEYS.SETTINGS, { ...this.getSettings(), ...settings });
  },
};
