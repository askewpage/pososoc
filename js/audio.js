// Tiny procedural sound effects via WebAudio — no binary assets required.

let ctx = null;
let enabled = true;

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setSoundEnabled(v) { enabled = v; }
export function isSoundEnabled() { return enabled; }

function tone(freq, start, duration, type = 'sine', gainPeak = 0.15) {
  const c = getCtx();
  if (!c || !enabled) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  gain.gain.setValueAtTime(0, c.currentTime + start);
  gain.gain.linearRampToValueAtTime(gainPeak, c.currentTime + start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.02);
}

export function sfxCatch() {
  tone(880, 0, 0.09, 'square', 0.1);
  tone(1320, 0.05, 0.1, 'square', 0.08);
}

export function sfxFalsePositive() {
  tone(180, 0, 0.18, 'sawtooth', 0.12);
}

export function sfxMissed() {
  tone(220, 0, 0.15, 'sawtooth', 0.15);
  tone(160, 0.12, 0.25, 'sawtooth', 0.15);
}

export function sfxLevelUp() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.14, 'triangle', 0.1));
}

export function sfxClassifyCorrect() {
  tone(1046, 0, 0.1, 'sine', 0.1);
}

export function sfxGameOver() {
  [400, 340, 280, 200].forEach((f, i) => tone(f, i * 0.14, 0.2, 'sawtooth', 0.14));
}

export function sfxAchievement() {
  [660, 880, 1108].forEach((f, i) => tone(f, i * 0.09, 0.16, 'sine', 0.1));
}
