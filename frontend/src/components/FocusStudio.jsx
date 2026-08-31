import React, { useState, useEffect, useRef } from 'react';
import '../styles/FocusStudio.css';
import { useWebAudioSynth } from '../utils/useWebAudioSynth';
import studySessionService from '../services/studySessionService';

/**
 * FocusStudio Component
 * 
 * A comprehensive Pomodoro Focus Room with:
 * - Configurable preset sprint intervals (15m, 25m, 45m, 60m)
 * - Real-time animated circular SVG timer progress ring
 * - Built-in Web Audio API Synthesizer (Binaural 432Hz Alpha Beat + Multi-layered Rain + Ocean Surf + Completion Chime)
 * - Session completion callback and automatic backend persistence with exact second/minute precision
 * - Instant Silence button, volume control, and quick log capabilities
 * 
 * Props:
 * @param {string} defaultTopic - Current focus task or course title
 * @param {function} onClose - Modal close handler (if used as a modal)
 * @param {function} onSessionComplete - Callback fired when timer hits 0 with { durationMinutes, durationSeconds, topic, session }
 * @param {boolean} isModal - Render as modal dialog (default: true) or embedded widget (false)
 */
export default function FocusStudio({
  defaultTopic = 'Deep Focus Session',
  onClose,
  onSessionComplete,
  isModal = true,
}) {
  // Timer State
  const [topic, setTopic] = useState(defaultTopic);
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundMode, setSoundMode] = useState('off'); // 'off' | 'rain' | 'binaural' | 'ocean'
  const [isFinished, setIsFinished] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Web Audio Synth Hook
  const { startAudio, stopAudio, playChime, volume, setVolume } = useWebAudioSynth(0.3);

  const [prevDefaultTopic, setPrevDefaultTopic] = useState(defaultTopic);
  if (defaultTopic !== prevDefaultTopic) {
    setPrevDefaultTopic(defaultTopic);
    setTopic(defaultTopic);
  }

  // Log session to backend with exact precision (no artificial rounding)
  const recordSession = async (minsToLog, secsToLog) => {
    const totalSec = secsToLog !== undefined ? secsToLog : Math.max(1, (minsToLog || durationMinutes) * 60);
    const exactMins = totalSec / 60;
    setSaveStatus('saving');
    try {
      const res = await studySessionService.logSession(exactMins, topic, totalSec);
      setSaveStatus('saved');
      if (onSessionComplete) {
        onSessionComplete({
          durationMinutes: exactMins,
          durationSeconds: totalSec,
          topic,
          completedAt: new Date().toISOString(),
          session: res?.data,
          streak: res?.streak,
        });
      }
    } catch (err) {
      console.error('Failed to log study session:', err);
      setSaveStatus('error');
      if (onSessionComplete) {
        onSessionComplete({
          durationMinutes: exactMins,
          durationSeconds: totalSec,
          topic,
          completedAt: new Date().toISOString(),
        });
      }
    }
  };

  const targetEndTimeRef = useRef(null);

  // Timer Tick Hook — 100% drift-free timestamp calculation with exact seconds tracking
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      if (!targetEndTimeRef.current) {
        targetEndTimeRef.current = Date.now() + timeLeftSeconds * 1000;
      }
      interval = setInterval(() => {
        if (!targetEndTimeRef.current) return;
        const remainingMs = targetEndTimeRef.current - Date.now();
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        setTimeLeftSeconds(remainingSec);

        const totalSec = durationMinutes * 60;
        const elapsed = Math.max(0, totalSec - remainingSec);
        setElapsedSeconds(elapsed);

        if (remainingSec === 0) {
          setIsRunning(false);
          setIsFinished(true);
          targetEndTimeRef.current = null;
          stopAudio();
          playChime();
          recordSession(durationMinutes, totalSec);
        }
      }, 250);
    } else {
      targetEndTimeRef.current = null;
    }
    return () => clearInterval(interval);
  }, [isRunning, durationMinutes, topic, stopAudio, playChime]);

  // Preset Selection
  const setPreset = (mins) => {
    if (isRunning) return;
    targetEndTimeRef.current = null;
    setDurationMinutes(mins);
    setTimeLeftSeconds(mins * 60);
    setElapsedSeconds(0);
    setIsFinished(false);
    setSaveStatus(null);
  };

  const handleSoundToggle = (mode) => {
    setSoundMode(mode);
    if (mode === 'off') {
      stopAudio();
    } else {
      startAudio(mode);
    }
  };

  const togglePlay = () => {
    if (!isRunning) {
      if (soundMode !== 'off') {
        startAudio(soundMode);
      }
    } else {
      stopAudio();
    }
    setIsRunning((r) => !r);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsFinished(false);
    setSaveStatus(null);
    setElapsedSeconds(0);
    targetEndTimeRef.current = null;
    stopAudio();
    setTimeLeftSeconds(durationMinutes * 60);
  };

  // Quick manual log for exact elapsed time or preset
  const handleQuickLog = () => {
    const totalSec = Math.max(1, Math.round(elapsedSeconds > 5 ? elapsedSeconds : durationMinutes * 60));
    recordSession(totalSec / 60, totalSec);
  };

  const mins = Math.floor(timeLeftSeconds / 60);
  const secs = timeLeftSeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const totalSeconds = durationMinutes * 60;
  const progressPct = totalSeconds > 0 ? ((totalSeconds - timeLeftSeconds) / totalSeconds) * 100 : 0;

  return (
    <div className={`focus-studio-card ${!isModal ? 'embedded' : ''}`}>
      {/* Header */}
      <div className="focus-studio-header">
        <div className="focus-studio-title-group">
          <span className="focus-studio-icon">⏱️</span>
          <h2 className="focus-studio-title">Focus Studio</h2>
        </div>
        {onClose && (
          <button className="focus-studio-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        )}
      </div>

      {/* Task Title & Quick Edit */}
      {isEditingTopic ? (
        <div className="focus-studio-task-input-wrap">
          <input
            type="text"
            className="focus-studio-task-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onBlur={() => setIsEditingTopic(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setIsEditingTopic(false);
            }}
            placeholder="Enter focus task..."
            autoFocus
          />
          <button
            className="focus-studio-sound-btn active"
            style={{ padding: '6px 12px' }}
            onClick={() => setIsEditingTopic(false)}
          >
            ✓
          </button>
        </div>
      ) : (
        <p
          className="focus-studio-task"
          onClick={() => !isRunning && setIsEditingTopic(true)}
          style={{ cursor: isRunning ? 'default' : 'pointer' }}
          title={isRunning ? '' : 'Click to edit task name'}
        >
          Current Task:{' '}
          <span className="focus-studio-task-highlight">{topic || 'General Focus'}</span>
          {!isRunning && <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 12 }}>✏️</span>}
        </p>
      )}

      {/* Preset Duration Buttons */}
      <div className="focus-studio-presets">
        {[
          [15, '15m Sprint'],
          [25, '25m Pomodoro'],
          [45, '45m Deep Work'],
          [60, '60m Mastery'],
        ].map(([minsVal, label]) => (
          <button
            key={minsVal}
            onClick={() => setPreset(minsVal)}
            disabled={isRunning}
            className={`focus-studio-preset-btn ${durationMinutes === minsVal ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Circular Animated SVG Countdown */}
      <div className="focus-studio-dial-container">
        <svg width="200" height="200" className="focus-studio-svg">
          <circle cx="100" cy="100" r="85" className="focus-studio-circle-bg" />
          <circle
            cx="100"
            cy="100"
            r="85"
            className="focus-studio-circle-progress"
            strokeDasharray={2 * Math.PI * 85}
            strokeDashoffset={2 * Math.PI * 85 * (1 - Math.min(100, Math.max(0, progressPct)) / 100)}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="focusTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
        </svg>

        {/* Centered Time & Status */}
        <div className="focus-studio-dial-center">
          <div className="focus-studio-time-text">{formattedTime}</div>
          <div className={`focus-studio-status-text ${isRunning ? 'running' : ''}`}>
            {isFinished
              ? saveStatus === 'saved'
                ? '🎉 Logged & Saved!'
                : '🎉 Session Complete!'
              : isRunning
              ? '● Focusing'
              : saveStatus === 'saved'
              ? '✅ Logged'
              : 'Paused'}
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="focus-studio-controls">
        <button
          className={`focus-studio-btn ${
            isRunning ? 'focus-studio-btn-secondary' : 'focus-studio-btn-primary'
          }`}
          onClick={togglePlay}
        >
          {isRunning ? '⏸️ Pause' : '▶️ Start Focus'}
        </button>

        <button
          className="focus-studio-btn focus-studio-btn-ghost"
          onClick={resetTimer}
          title="Reset timer"
        >
          🔄 Reset
        </button>

        {/* Quick Log Button when user wants to finish session now */}
        {(elapsedSeconds >= 5 || isFinished) && saveStatus !== 'saved' && (
          <button
            className="focus-studio-btn focus-studio-btn-ghost"
            style={{ borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
            onClick={handleQuickLog}
            title="Log exact focus time to database now"
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving...' : '💾 Log'}
          </button>
        )}
      </div>

      {/* Ambient Sound Synthesizer Controls */}
      <div className="focus-studio-audio-panel">
        <div className="focus-studio-audio-header">
          <span>🎧 Ambient Focus Audio (Synthesizer):</span>
          <span className="focus-studio-audio-badge">{soundMode.toUpperCase()}</span>
        </div>

        <div className="focus-studio-audio-buttons">
          {[
            ['off', '🔇 Silent'],
            ['rain', '🌧️ Gentle Rain'],
            ['binaural', '🧠 432Hz Alpha Beat'],
            ['ocean', '🌊 Ocean Waves'],
          ].map(([modeKey, modeLabel]) => (
            <button
              key={modeKey}
              onClick={() => handleSoundToggle(modeKey)}
              className={`focus-studio-sound-btn ${soundMode === modeKey ? 'active' : ''}`}
            >
              {modeLabel}
            </button>
          ))}
        </div>

        {/* Volume Slider when sound is active */}
        {soundMode !== 'off' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 12 }}>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>🔈</span>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                width: 140,
                accentColor: '#06b6d4',
                cursor: 'pointer',
                height: 4,
              }}
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
            <span style={{ fontSize: 11, color: '#94a3b8' }}>🔊</span>
          </div>
        )}
      </div>
    </div>
  );
}
