import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * Advanced Web Audio Ambient Synthesizer & Meditation Engine
 * 
 * Features:
 * - 'off': Instant, click-free silence
 * - 'rain': Multi-layered authentic stereo rainfall (steady pink drizzle + pitter-patter spray + gentle wind LFO modulation)
 * - 'binaural': True stereo binaural alpha beats (432Hz Left ear / 442Hz Right ear = 10Hz Alpha entrainment) with warm sub-bass drone
 * - 'ocean': Organic undulating ocean surf swells (slow wave LFO modulation)
 * - playChime: 3-tone peaceful meditation bell triad (528Hz -> 660Hz -> 792Hz) with smooth exponential decay
 * - Dynamic volume control with real-time gain ramping
 */
export function useWebAudioSynth(initialVolume = 0.3) {
  const [volume, setVolume] = useState(initialVolume);
  const audioCtxRef = useRef(null);
  const soundNodesRef = useRef([]);
  const masterGainRef = useRef(null);
  const currentModeRef = useRef('off');
  const rainIntervalRef = useRef(null);

  // Initialize or resume AudioContext
  const getAudioContext = useCallback(() => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Stop all active audio nodes immediately
  const stopAudio = useCallback(() => {
    if (rainIntervalRef.current) {
      clearInterval(rainIntervalRef.current);
      rainIntervalRef.current = null;
    }

    if (masterGainRef.current && audioCtxRef.current) {
      try {
        const ctx = audioCtxRef.current;
        // Smooth 50ms fade out to avoid speaker clicks
        masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
        masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, ctx.currentTime);
        masterGainRef.current.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      } catch (e) {
        // Safe ignore
      }
    }

    const nodesToStop = [...soundNodesRef.current];
    soundNodesRef.current = [];
    currentModeRef.current = 'off';

    setTimeout(() => {
      nodesToStop.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (err) {
          // Safe ignore
        }
      });
    }, 60);
  }, []);

  // Start synthesis mode
  const startAudio = useCallback((mode) => {
    stopAudio();
    if (mode === 'off' || !mode) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      currentModeRef.current = mode;

      // Master gain node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      const nodes = [masterGain];

      if (mode === 'binaural') {
        // ── TRUE STEREO BINAURAL ALPHA ENGINE (432Hz & 442Hz = 10Hz Alpha) ──

        // 1. Left Ear Carrier (432Hz)
        const oscL = ctx.createOscillator();
        oscL.type = 'sine';
        oscL.frequency.setValueAtTime(432, ctx.currentTime);

        const gainL = ctx.createGain();
        gainL.gain.setValueAtTime(0.2, ctx.currentTime);

        // 2. Right Ear Carrier (442Hz)
        const oscR = ctx.createOscillator();
        oscR.type = 'sine';
        oscR.frequency.setValueAtTime(442, ctx.currentTime);

        const gainR = ctx.createGain();
        gainR.gain.setValueAtTime(0.2, ctx.currentTime);

        // Stereo Panning
        if (ctx.createStereoPanner) {
          const panL = ctx.createStereoPanner();
          panL.pan.setValueAtTime(-0.85, ctx.currentTime);
          oscL.connect(gainL);
          gainL.connect(panL);
          panL.connect(masterGain);
          nodes.push(panL);

          const panR = ctx.createStereoPanner();
          panR.pan.setValueAtTime(0.85, ctx.currentTime);
          oscR.connect(gainR);
          gainR.connect(panR);
          panR.connect(masterGain);
          nodes.push(panR);
        } else {
          oscL.connect(gainL);
          gainL.connect(masterGain);
          oscR.connect(gainR);
          gainR.connect(masterGain);
        }

        // 3. Warm Sub-Harmonic Drone (108Hz / 216Hz) for soothing depth (prevents single-pitch annoyance)
        const subOsc = ctx.createOscillator();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(108, ctx.currentTime);

        const subFilter = ctx.createBiquadFilter();
        subFilter.type = 'lowpass';
        subFilter.frequency.setValueAtTime(160, ctx.currentTime);

        const subGain = ctx.createGain();
        subGain.gain.setValueAtTime(0.12, ctx.currentTime);

        subOsc.connect(subFilter);
        subFilter.connect(subGain);
        subGain.connect(masterGain);

        oscL.start();
        oscR.start();
        subOsc.start();

        nodes.push(oscL, oscR, subOsc, gainL, gainR, subFilter, subGain);

      } else if (mode === 'rain') {
        // ── MULTI-LAYERED ORGANIC STEREO RAIN SYNTHESIZER ──

        const sampleRate = ctx.sampleRate;
        const bufferSize = sampleRate * 3; // 3-second stereo noise buffer
        const noiseBuffer = ctx.createBuffer(2, bufferSize, sampleRate);
        const leftOut = noiseBuffer.getChannelData(0);
        const rightOut = noiseBuffer.getChannelData(1);

        let b0L = 0, b1L = 0, b2L = 0;
        let b0R = 0, b1R = 0, b2R = 0;

        for (let i = 0; i < bufferSize; i++) {
          // Pink noise filter (Left)
          const wL = Math.random() * 2 - 1;
          b0L = 0.99886 * b0L + wL * 0.0555179;
          b1L = 0.99332 * b1L + wL * 0.0750759;
          b2L = 0.96900 * b2L + wL * 0.1538520;
          leftOut[i] = (b0L + b1L + b2L + wL * 0.5362) * 0.07;

          // Pink noise filter (Right - uncorrelated)
          const wR = Math.random() * 2 - 1;
          b0R = 0.99886 * b0R + wR * 0.0555179;
          b1R = 0.99332 * b1R + wR * 0.0750759;
          b2R = 0.96900 * b2R + wR * 0.1538520;
          rightOut[i] = (b0R + b1R + b2R + wR * 0.5362) * 0.07;
        }

        // Layer 1: Low-frequency steady rain bed
        const rainBed = ctx.createBufferSource();
        rainBed.buffer = noiseBuffer;
        rainBed.loop = true;

        const bedFilter = ctx.createBiquadFilter();
        bedFilter.type = 'lowpass';
        bedFilter.frequency.setValueAtTime(650, ctx.currentTime);

        const bedGain = ctx.createGain();
        bedGain.gain.setValueAtTime(0.4, ctx.currentTime);

        rainBed.connect(bedFilter);
        bedFilter.connect(bedGain);
        bedGain.connect(masterGain);

        // Layer 2: High-frequency pitter-patter drizzle spray
        const sprayBed = ctx.createBufferSource();
        sprayBed.buffer = noiseBuffer;
        sprayBed.loop = true;

        const sprayFilter = ctx.createBiquadFilter();
        sprayFilter.type = 'bandpass';
        sprayFilter.frequency.setValueAtTime(2200, ctx.currentTime);
        sprayFilter.Q.setValueAtTime(0.8, ctx.currentTime);

        const sprayGain = ctx.createGain();
        sprayGain.gain.setValueAtTime(0.18, ctx.currentTime);

        sprayBed.connect(sprayFilter);
        sprayFilter.connect(sprayGain);
        sprayGain.connect(masterGain);

        // Layer 3: Slow gentle wind / atmosphere LFO modulation (0.15 Hz)
        const windLfo = ctx.createOscillator();
        windLfo.type = 'sine';
        windLfo.frequency.setValueAtTime(0.15, ctx.currentTime);

        const windGain = ctx.createGain();
        windGain.gain.setValueAtTime(140, ctx.currentTime); // Modulate cutoff by +/- 140Hz

        windLfo.connect(windGain);
        windGain.connect(bedFilter.frequency);

        rainBed.start();
        sprayBed.start();
        windLfo.start();

        nodes.push(rainBed, sprayBed, windLfo, bedFilter, sprayFilter, bedGain, sprayGain, windGain);

      } else if (mode === 'ocean') {
        // ── ORGANIC OCEAN WAVES SURF SYNTHESIZER ──

        const sampleRate = ctx.sampleRate;
        const bufferSize = sampleRate * 4;
        const noiseBuffer = ctx.createBuffer(2, bufferSize, sampleRate);
        const lData = noiseBuffer.getChannelData(0);
        const rData = noiseBuffer.getChannelData(1);

        for (let i = 0; i < bufferSize; i++) {
          lData[i] = (Math.random() * 2 - 1) * 0.08;
          rData[i] = (Math.random() * 2 - 1) * 0.08;
        }

        const oceanSource = ctx.createBufferSource();
        oceanSource.buffer = noiseBuffer;
        oceanSource.loop = true;

        const oceanFilter = ctx.createBiquadFilter();
        oceanFilter.type = 'lowpass';
        oceanFilter.frequency.setValueAtTime(450, ctx.currentTime);

        const oceanGain = ctx.createGain();
        oceanGain.gain.setValueAtTime(0.45, ctx.currentTime);

        // Slow wave tide modulation (~9 second swell cycle)
        const waveLfo = ctx.createOscillator();
        waveLfo.type = 'sine';
        waveLfo.frequency.setValueAtTime(0.11, ctx.currentTime);

        const waveFilterGain = ctx.createGain();
        waveFilterGain.gain.setValueAtTime(280, ctx.currentTime);

        waveLfo.connect(waveFilterGain);
        waveFilterGain.connect(oceanFilter.frequency);

        oceanSource.connect(oceanFilter);
        oceanFilter.connect(oceanGain);
        oceanGain.connect(masterGain);

        oceanSource.start();
        waveLfo.start();

        nodes.push(oceanSource, waveLfo, oceanFilter, oceanGain, waveFilterGain);
      }

      soundNodesRef.current = nodes;
    } catch (e) {
      console.warn('Web Audio synthesis error:', e);
    }
  }, [getAudioContext, stopAudio, volume]);

  // Adjust volume dynamically in real time
  const changeVolume = useCallback((newVol) => {
    setVolume(newVol);
    if (masterGainRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
      masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, ctx.currentTime);
      masterGainRef.current.gain.linearRampToValueAtTime(newVol, ctx.currentTime + 0.05);
    }
  }, []);

  // Completion chime synthesizer (peaceful meditation bell triad: 528Hz -> 660Hz -> 792Hz)
  const playChime = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = [528, 660, 792];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const startTime = ctx.currentTime + index * 0.18;
        const duration = 2.0;

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch (e) {
      console.warn('Chime play error:', e);
    }
  }, [getAudioContext, volume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, [stopAudio]);

  return { startAudio, stopAudio, playChime, volume, setVolume: changeVolume };
}
