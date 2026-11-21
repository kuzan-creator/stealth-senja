// Tiny WebAudio sound effects, synthesised in code: no audio files, no
// network. The context is created on the first user gesture, so the game
// stays silent until the player actually plays.
let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

function tone(freq, dur, type, gain, when, slideTo) {
  if (muted) return;
  const ac = ensureContext();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const t0 = ac.currentTime + (when || 0);
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.12, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playPickup() {
  tone(660, 0.12, 'sine', 0.14);
  tone(990, 0.18, 'sine', 0.12, 0.09);
}

export function playCoin() {
  tone(1250, 0.07, 'triangle', 0.1);
  tone(1560, 0.09, 'triangle', 0.09, 0.07);
}

export function playSuspicious() {
  tone(220, 0.22, 'square', 0.06, 0, 330);
}

export function playAlarm() {
  tone(440, 0.16, 'sawtooth', 0.09, 0, 620);
  tone(440, 0.16, 'sawtooth', 0.09, 0.2, 620);
}

export function playCaught() {
  tone(330, 0.5, 'sawtooth', 0.12, 0, 110);
}

export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.12, i * 0.11));
}

export function playStep() {
  tone(90, 0.05, 'sine', 0.03);
}
