import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { Storage } from '../utils/storage.js';

export default function FocusTimerModal({ defaultTopic = 'Deep Focus Session', onClose }) {
  const { showToast } = useToast();
  
  // Timer States
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundMode, setSoundMode] = useState('off'); // 'off' | 'rain' | 'binaural'
  const [volume, setVolume] = useState(0.2);

  // Audio synthesis references (Web Audio API)
  const audioCtxRef = useRef(null);
  const soundNodesRef = useRef([]);

  // Timer Tick
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeftSeconds > 0) {
      interval = setInterval(() => {
        setTimeLeftSeconds(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeftSeconds === 0) {
      setIsRunning(false);
      stopAudio();
      showToast('🎉 Focus Session Completed! +50 XP and streak logged!', 'success');
      
      // Update local storage progress
      const p = Storage.getProgress();
      Storage.saveProgress({
        ...p,
        streak: (p.streak || 0) + 1,
        lastStudyDate: new Date().toISOString()
      });
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeftSeconds, showToast]);

  // Handle duration preset selection
  const setPreset = (mins) => {
    if (isRunning) return;
    setDurationMinutes(mins);
    setTimeLeftSeconds(mins * 60);
  };

  // Web Audio Synthetic Sound Engine
  const startAudio = (mode) => {
    stopAudio();
    if (mode === 'off') return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (mode === 'binaural') {
        // Binaural 432Hz deep focus alpha wave
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(432, ctx.currentTime);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(442, ctx.currentTime); // 10Hz Alpha beat

        gainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();
        soundNodesRef.current = [osc1, osc2, gainNode];
      } else if (mode === 'rain') {
        // Pink / Rain noise simulation with lowpass filter
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          output[i] = (b0 + b1 + b2 + white * 0.5362) * 0.1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(volume * 0.25, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start();
        soundNodesRef.current = [whiteNoise, filter, gainNode];
      }
    } catch (e) {
      console.warn('Web Audio synthesis error:', e);
    }
  };

  const stopAudio = () => {
    soundNodesRef.current.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch {}
    });
    soundNodesRef.current = [];
  };

  const handleSoundToggle = (mode) => {
    setSoundMode(mode);
    if (isRunning || mode !== 'off') {
      startAudio(mode);
    }
  };

  const togglePlay = () => {
    if (!isRunning && soundMode !== 'off') {
      startAudio(soundMode);
    } else if (isRunning) {
      stopAudio();
    }
    setIsRunning(r => !r);
  };

  const resetTimer = () => {
    setIsRunning(false);
    stopAudio();
    setTimeLeftSeconds(durationMinutes * 60);
  };

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const mins = Math.floor(timeLeftSeconds / 60);
  const secs = timeLeftSeconds % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const totalSeconds = durationMinutes * 60;
  const progressPct = ((totalSeconds - timeLeftSeconds) / totalSeconds) * 100;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '480px', padding: '28px', textAlign: 'center' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>⏱️</span>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'left' }}>
              Focus Studio
            </h2>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: '16px' }}>✕</button>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Current Task: <strong style={{ color: '#c7d2fe' }}>{defaultTopic}</strong>
        </p>

        {/* Preset Interval Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
          {[
            [15, '15m Sprint'],
            [25, '25m Pomodoro'],
            [45, '45m Deep Work'],
            [60, '60m Mastery']
          ].map(([minsVal, label]) => (
            <button
              key={minsVal}
              onClick={() => setPreset(minsVal)}
              disabled={isRunning}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: durationMinutes === minsVal ? 700 : 500,
                border: `1px solid ${durationMinutes === minsVal ? 'var(--indigo)' : 'var(--border-subtle)'}`,
                background: durationMinutes === minsVal ? 'rgba(99,102,241,0.2)' : 'transparent',
                color: durationMinutes === minsVal ? '#c7d2fe' : 'var(--text-secondary)',
                cursor: isRunning ? 'not-allowed' : 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Big Circular Animated Progress Display */}
        <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 24px' }}>
          <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="100" cy="100" r="85"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="100" cy="100" r="85"
              stroke="url(#timerGrad)"
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 85}
              strokeDashoffset={2 * Math.PI * 85 * (1 - progressPct / 100)}
              strokeLinecap="round"
              fill="transparent"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>

          {/* Centered Time */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-1px', color: '#ffffff', fontFamily: 'monospace' }}>
              {formattedTime}
            </div>
            <div style={{ fontSize: '11px', color: isRunning ? '#34d399' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
              {isRunning ? '● Focusing' : 'Paused'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            className={`btn ${isRunning ? 'btn-secondary' : 'btn-primary'} btn-lg`}
            onClick={togglePlay}
            style={{ minWidth: '140px', justifyContent: 'center' }}
          >
            {isRunning ? '⏸️ Pause' : '▶️ Start Focus'}
          </button>

          <button
            className="btn btn-ghost"
            onClick={resetTimer}
            title="Reset timer"
          >
            🔄 Reset
          </button>
        </div>

        {/* Ambient Sound Generator (Web Audio) */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>🎧 Ambient Focus Audio (Synthesizer):</span>
            <span style={{ color: '#c7d2fe', fontWeight: 600 }}>{soundMode.toUpperCase()}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {[
              ['off', '🔇 Silent'],
              ['rain', '🌧️ Gentle Rain'],
              ['binaural', '🧠 432Hz Alpha Beat']
            ].map(([modeKey, modeLabel]) => (
              <button
                key={modeKey}
                onClick={() => handleSoundToggle(modeKey)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '11px',
                  fontWeight: soundMode === modeKey ? 700 : 500,
                  border: `1px solid ${soundMode === modeKey ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                  background: soundMode === modeKey ? 'rgba(6,182,212,0.2)' : 'transparent',
                  color: soundMode === modeKey ? '#38bdf8' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {modeLabel}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
