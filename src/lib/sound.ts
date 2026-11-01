// Egne lyder laget med Web Audio (ingen lydfiler).
import { getProgress } from './store';

let ctx: AudioContext | null = null;
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15, delay = 0, slide?: number) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.2, freq = 900) {
  const a = ac(); if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start();
}

export type SoundName = 'move' | 'capture' | 'check' | 'good' | 'bad' | 'win' | 'lose' | 'star' | 'click';

export function play(name: SoundName) {
  if (!getProgress().settings.sound) return;
  switch (name) {
    case 'move': noise(0.07, 0.5, 1200); break;
    case 'capture': noise(0.12, 0.7, 500); tone(160, 0.1, 'triangle', 0.12); break;
    case 'check': tone(880, 0.12, 'square', 0.05); tone(660, 0.15, 'square', 0.05, 0.1); break;
    case 'good': tone(660, 0.12, 'triangle', 0.15); tone(990, 0.2, 'triangle', 0.15, 0.1); break;
    case 'bad': tone(220, 0.25, 'sawtooth', 0.06, 0, 140); break;
    case 'star': tone(1200, 0.1, 'sine', 0.12, 0, 1800); break;
    case 'click': tone(700, 0.04, 'sine', 0.06); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.14, i * 0.12)); break;
    case 'lose': [392, 330, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, i * 0.18)); break;
  }
}
