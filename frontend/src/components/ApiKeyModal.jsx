import React, { useState, useRef, useEffect } from 'react';
import { AI } from '../features/recommendation/recommendation.js';
import { Storage } from '../utils/storage.js';
import { useToast } from '../context/ToastContext.jsx';

export default function ApiKeyModal({ onClose }) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSave = async () => {
    if (!key.trim()) { showToast('Please enter your API key', 'error'); return; }
    if (key.trim().length < 20) { showToast("That doesn't look like a valid API key", 'error'); return; }
    setLoading(true);
    try {
      const valid = await AI.validateKey(key.trim());
      if (valid) {
        Storage.saveApiKey(key.trim());
        window.dispatchEvent(new CustomEvent('app:key-changed'));
        showToast('🎉 API key saved! Full AI mode activated.', 'success');
        setKey('');
        onClose();
      } else {
        showToast('❌ Invalid API key. Please check and try again.', 'error');
      }
    } catch {
      showToast('❌ Could not validate key. Check your internet connection.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="api-key-modal"
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-card">
        <div className="modal-icon">🔑</div>
        <h2 className="modal-title">Connect Gemini AI</h2>
        <p className="modal-subtitle">
          Enter your Gemini API key to unlock fully personalized, AI-powered learning path
          recommendations and intelligent tutoring.
        </p>
        <div className="form-group">
          <label className="form-label">Gemini API Key</label>
          <input
            ref={inputRef}
            type="password"
            id="api-key-input"
            className="form-input"
            placeholder="AIza..."
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>
        <button
          className="btn btn-primary w-full"
          id="save-api-key-btn"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? '🔄 Validating...' : '🔑 Save & Activate'}
        </button>
        <button
          className="btn btn-ghost w-full"
          id="skip-api-key-btn"
          style={{ marginTop: '10px' }}
          onClick={onClose}
        >
          Continue in Demo Mode
        </button>
        <p className="modal-note">
          🔒 Your key is stored only in your browser's localStorage and never sent to any server
          other than Google. Get a free key at{' '}
          <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-link)' }}>
            aistudio.google.com
          </a>
        </p>
      </div>
    </div>
  );
}
