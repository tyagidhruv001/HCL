/**
 * chat.js — Conversational Interface (production-hardened ESM)
 * FIXES:
 * - Event listeners are added only ONCE and tracked with a flag to prevent duplicates
 * - _history properly restored from storage on every init()
 * - _markdownToHtml escapes user-provided content before rendering
 * - Chat container reference is captured once, not re-queried per message
 * - 'Generate Path' button navigates correctly and reliably
 */

import { Storage, Sanitize } from '../../utils/storage.js';
import { AI } from '../../features/recommendation/recommendation.js';
import { Profile } from '../../features/profile/profile.js';
import { DOMAINS } from '../../features/courses/courses.js';

let _history  = [];
let _isTyping = false;
let _profile  = null;

// Keep a stable reference to the container and its sub-elements
let _container     = null;
let _messagesEl    = null;
let _inputEl       = null;
let _sendBtn       = null;
let _suggestEl     = null;
// Track whether DOM event listeners are already bound to avoid duplicates
let _eventsBound   = false;

const SUGGESTED_PROMPTS = [
  "What learning path should I follow to become a data scientist?",
  "I want to learn web development. Where do I start?",
  "What are the most in-demand skills in AI right now?",
  "How long will it take to be job-ready in cybersecurity?",
  "Generate my personalized learning path",
  "What should I learn after JavaScript?",
];

/* ── Public init — safe to call multiple times ── */
function init(container) {
  _container  = container;
  _messagesEl = container.querySelector('#chat-messages');
  _inputEl    = container.querySelector('#chat-input');
  _sendBtn    = container.querySelector('#send-btn');
  _suggestEl  = container.querySelector('#chat-suggestions');
  _profile    = Storage.getProfile();
  _history    = Storage.getChatHistory().map(m => ({ role: m.role, content: m.content }));

  // Render profile sidebar
  const profilePanel = container.querySelector('#chat-profile-panel');
  if (profilePanel && _profile.onboarded) {
    Profile.renderProfileSummary(profilePanel, _profile);
  }

  // Render chat messages
  if (_messagesEl) {
    _messagesEl.innerHTML = '';
    if (_history.length === 0) {
      _addWelcomeMessage();
    } else {
      _history.forEach(m => _renderMessage(m.role, m.content, false));
    }
    _messagesEl.scrollTop = _messagesEl.scrollHeight;
  }

  // Bind DOM events ONCE
  if (!_eventsBound) {
    _bindEvents();
    _eventsBound = true;
  }

  // Always refresh suggestions on init
  _renderSuggestions(null);
}

/* ── Welcome message ── */
function _addWelcomeMessage() {
  const p = Storage.getProfile();
  const greeting = p.onboarded
    ? `Hi **${p.name}**! 👋 I'm **LearnAI**, your personalized learning advisor.\n\nI see you're aiming to: *"${p.goal}"* — a fantastic goal! I'm here to help you build the perfect roadmap, answer questions, and keep you motivated.\n\nWhat would you like to explore today?`
    : `Hi there! 👋 I'm **LearnAI**, your AI-powered learning advisor.\n\nI help you discover the perfect learning path based on your goals, interests, and experience level. Before we dive in, could you tell me a bit about yourself?\n\nWhat's your primary learning goal?`;
  _renderMessage('ai', greeting, false);
}

/* ── Render a single message — XSS-safe ── */
function _renderMessage(role, content, animate = true) {
  if (!_messagesEl) return;

  const div  = document.createElement('div');
  div.className = `message ${role === 'ai' ? 'ai' : 'user'}`;
  if (animate) div.style.animation = 'fadeSlide 0.25s ease-out';

  const time        = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const avatarEmoji = role === 'ai' ? '🤖' : '👤';

  // Escape user content, then apply safe markdown rendering
  const safeContent = role === 'user' ? Sanitize.html(content) : _markdownToHtml(content);

  const avatarDiv = document.createElement('div');
  avatarDiv.className = `msg-avatar ${role}`;
  avatarDiv.textContent = avatarEmoji;

  const wrapDiv   = document.createElement('div');
  const bubble    = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = safeContent;  // AI content has been markdown-processed, user content is HTML-escaped

  const timeDiv   = document.createElement('div');
  timeDiv.className = 'msg-time';
  timeDiv.textContent = time;

  wrapDiv.appendChild(bubble);
  wrapDiv.appendChild(timeDiv);
  div.appendChild(avatarDiv);
  div.appendChild(wrapDiv);

  _messagesEl.appendChild(div);
  _messagesEl.scrollTop = _messagesEl.scrollHeight;
  return div;
}

/* ── Safe markdown → HTML (for AI responses only) ── */
function _markdownToHtml(text) {
  if (!text) return '';
  // First escape HTML (in case AI hallucinated tags)
  let safe = Sanitize.html(text);
  // Then apply markdown transformations to the escaped text
  safe = safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.15);padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px">$1</code>')
    .replace(/\n\n/g, '</p><p style="margin-top:8px">')
    .replace(/\n/g, '<br>');
  return `<p>${safe}</p>`;
}

/* ── Typing indicator ── */
function _showTyping() {
  if (!_messagesEl || _messagesEl.querySelector('#typing-indicator')) return;
  const div = document.createElement('div');
  div.className = 'message ai';
  div.id = 'typing-indicator';
  div.innerHTML = `
    <div class="msg-avatar ai">🤖</div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  _messagesEl.appendChild(div);
  _messagesEl.scrollTop = _messagesEl.scrollHeight;
}

function _hideTyping() {
  _messagesEl?.querySelector('#typing-indicator')?.remove();
}

/* ── Send a message ── */
async function sendMessage(text) {
  const msg = (text || '').trim();
  if (!msg || _isTyping) return;
  _isTyping = true;

  // Clear input immediately
  if (_inputEl) {
    _inputEl.value = '';
    _inputEl.style.height = 'auto';
  }
  if (_sendBtn) _sendBtn.disabled = true;
  if (_suggestEl) _suggestEl.innerHTML = '';

  // Update profile reference each time (may have changed)
  _profile = Storage.getProfile();

  _renderMessage('user', msg);
  _history.push({ role: 'user', content: msg });
  Storage.appendMessage({ role: 'user', content: msg });
  _showTyping();

  try {
    const aiResponse = await AI.sendMessage(msg, _history, _profile);
    _hideTyping();

    // Extract profile hints from user message
    if (_profile.onboarded) {
      const updates = Profile.extractFromMessage(msg, _profile);
      if (Object.keys(updates).length > 0) {
        Storage.saveProfile(updates);
        _profile = Storage.getProfile();
        const profilePanel = _container?.querySelector('#chat-profile-panel');
        if (profilePanel) Profile.renderProfileSummary(profilePanel, _profile);
      }
    }

    // Check for path generation intent and append a CTA
    const isPathRequest = /\b(generate|create|make|build|show|get)\s*(me\s*)?(a\s*)?(path|roadmap|plan|course list)\b/i.test(msg)
                       || /\bgive me.*courses?\b/i.test(msg);

    let finalResponse = aiResponse;
    if (isPathRequest && _profile.onboarded) {
      finalResponse += '\n\n🗺️ **Ready to generate your path?** Go to **My Path** in the sidebar to build your personalised roadmap!';
    }

    _renderMessage('ai', finalResponse);
    _history.push({ role: 'ai', content: finalResponse });
    Storage.appendMessage({ role: 'ai', content: finalResponse });
    _renderSuggestions(_getContextualSuggestions(msg, aiResponse));

  } catch (err) {
    _hideTyping();
    console.warn('Chat error:', err.message);

    const errorMessages = {
      NO_API_KEY:   '🔑 No API key found. I\'m running in demo mode — add your Gemini API key in **API Settings** for full AI responses. Try the suggestion chips below!',
      INVALID_KEY:  '❌ Invalid API key. Please check your Gemini API key in **API Settings** and try again.',
      RATE_LIMIT:   '⏳ Rate limit reached. Please wait a moment and try again.',
      SERVER_ERROR: '🔧 AI service temporarily unavailable. Please try again shortly.',
    };
    const errMsg = errorMessages[err.message] || 'Sorry, I encountered an error. Please try again.';

    _renderMessage('ai', errMsg);
    _renderSuggestions(null);
  } finally {
    _isTyping = false;
    if (_sendBtn) _sendBtn.disabled = false;
    _inputEl?.focus();
  }
}

/* ── Contextual suggestion chips ── */
function _getContextualSuggestions(userMsg, aiResponse) {
  const lower = ((userMsg || '') + ' ' + (aiResponse || '')).toLowerCase();
  if (/web|react|javascript|frontend|backend/.test(lower)) {
    return ['Best React projects for portfolio?', 'How do I get my first dev job?', 'Node.js or Python for backend?'];
  }
  if (/data|python|machine|ml|ai|deep learning/.test(lower)) {
    return ['Best ML projects for portfolio?', 'How long to learn machine learning?', 'Python vs R for data science?'];
  }
  if (/cloud|aws|docker|devops|kubernetes/.test(lower)) {
    return ['AWS vs GCP vs Azure?', 'Which cloud certifications should I get?', 'How to start with Kubernetes?'];
  }
  if (/security|cyber|hacking|pentest/.test(lower)) {
    return ['Best cybersecurity certifications?', 'How to start ethical hacking?', 'CEH vs OSCP — which first?'];
  }
  return SUGGESTED_PROMPTS.slice(0, 4);
}

function _renderSuggestions(suggestions) {
  if (!_suggestEl) return;
  const chips = suggestions || SUGGESTED_PROMPTS.slice(0, 4);
  _suggestEl.innerHTML = '';
  chips.forEach(s => {
    const chip = document.createElement('span');
    chip.className = 'suggestion-chip';
    chip.textContent = s;
    chip.addEventListener('click', () => sendMessage(s));
    _suggestEl.appendChild(chip);
  });
}

/* ── Bind all events (called ONCE) ── */
function _bindEvents() {
  _sendBtn?.addEventListener('click', () => sendMessage(_inputEl?.value || ''));

  _inputEl?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(_inputEl.value);
    }
  });

  _inputEl?.addEventListener('input', () => {
    _inputEl.style.height = 'auto';
    _inputEl.style.height = Math.min(_inputEl.scrollHeight, 140) + 'px';
  });

  _container?.querySelector('#clear-chat-btn')?.addEventListener('click', () => {
    if (!confirm('Clear your chat history? This cannot be undone.')) return;
    Storage.clearChat();
    _history = [];
    if (_messagesEl) _messagesEl.innerHTML = '';
    _addWelcomeMessage();
    _renderSuggestions(null);
    showToast('Chat history cleared', 'info');
  });

  _container?.querySelector('#quick-gen-path')?.addEventListener('click', () => {
    const p = Storage.getProfile();
    if (!p.onboarded) {
      showToast('Complete your profile first!', 'error');
      window.location.hash = '#onboarding';
      return;
    }
    window.location.hash = '#path';
  });
}

export const Chat = { init, sendMessage };
