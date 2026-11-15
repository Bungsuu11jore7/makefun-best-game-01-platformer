// Emberleap — all sound is synthesized with WebAudio: no audio files.
// Short blips for jumps, pickups, hurts and wins, plus a soft pad loop.
export function makeAudio() {
  return { ctx: null, master: null, muted: false, musicTimer: null, musicStep: 0 };
}

function ensure(audio) {
  if (audio.ctx) return true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.35;
    audio.master.connect(audio.ctx.destination);
    return true;
  } catch {
    return false;
  }
}

export function unlockAudio(audio) {
  if (ensure(audio) && audio.ctx.state === 'suspended') audio.ctx.resume();
}

function tone(audio, freq, dur, type, vol, slideTo = 0, delay = 0) {
  if (!ensure(audio) || audio.muted) return;
  const t0 = audio.ctx.currentTime + delay;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain); gain.connect(audio.master);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

export function playJump(audio, doubleJump) {
  tone(audio, doubleJump ? 520 : 380, 0.16, 'sine', 0.25, doubleJump ? 980 : 720);
}
export function playPickup(audio, combo) {
  const base = 660 + Math.min(combo, 8) * 55;
  tone(audio, base, 0.12, 'triangle', 0.3);
  tone(audio, base * 1.5, 0.14, 'triangle', 0.22, 0, 0.05);
}
export function playHurt(audio) {
  tone(audio, 220, 0.3, 'sawtooth', 0.25, 70);
}
export function playGate(audio) {
  [523, 659, 784, 1047].forEach((f, i) => tone(audio, f, 0.35, 'triangle', 0.28, 0, i * 0.09));
}
export function playWin(audio) {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(audio, f, 0.4, 'triangle', 0.26, 0, i * 0.11));
}
export function playLose(audio) {
  [392, 330, 262, 196].forEach((f, i) => tone(audio, f, 0.35, 'sine', 0.24, 0, i * 0.13));
}
export function playClick(audio) { tone(audio, 800, 0.06, 'square', 0.12); }

// A gentle looping pad: two detuned sines arpeggiating a pentatonic line.
const PAD_NOTES = [220, 261.6, 329.6, 392, 440, 523.3, 392, 329.6];
export function startMusic(audio) {
  if (!ensure(audio) || audio.musicTimer) return;
  audio.musicTimer = setInterval(() => {
    if (audio.muted) return;
    const note = PAD_NOTES[audio.musicStep % PAD_NOTES.length];
    audio.musicStep += 1;
    tone(audio, note, 1.1, 'sine', 0.05);
    tone(audio, note * 2, 0.9, 'sine', 0.02);
  }, 420);
}
export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
