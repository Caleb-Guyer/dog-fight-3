/* Projection and sound for the four 320 × 180 chapter films. */
(() => {
  'use strict';
  const partSeconds = 8;
  const fps = 24;
  const posters = { opening: [0.85, 6.7], rescue: [5.8, 3.4], boss: [2.3, 4.5], ending: [6.25, 6.25] };
  // Cues use movie time. Nothing plays ahead of a cut, a seek or a pause.
  const tracks = {
    opening: [
      [0.12, 'reed', 196],
      [0.26, 'rail'],
      [0.66, 'rail'],
      [0.9, 'whistle'],
      [1.12, 'rail'],
      [1.52, 'rail'],
      [1.94, 'rail'],
      [2.36, 'rail'],
      [2.79, 'rail'],
      [3.18, 'reed', 293.66],
      [3.55, 'creak'],
      [4.7, 'wind'],
      [6.55, 'slide'],
      [8.2, 'step'],
      [8.24, 'pluck', 293.66],
      [8.48, 'step'],
      [8.76, 'step'],
      [9.4, 'slide'],
      [9.93, 'paper'],
      [11.42, 'pluck', 349.23],
      [13.52, 'paper'],
      [14.14, 'pluck', 392],
      [15.04, 'reed', 440],
    ],
    rescue: [
      [0.16, 'pluck', 220],
      [1.23, 'creak'],
      [2.24, 'latch'],
      [2.36, 'creak'],
      [2.7, 'pluck', 329.63],
      [3.47, 'thump'],
      [4.58, 'paper'],
      [5.78, 'thump'],
      [6.1, 'pluck', 440],
      [6.31, 'paper'],
      [6.55, 'paper'],
      [7.08, 'pluck', 523.25],
      [8.18, 'reed', 261.63],
      [9.8, 'paper'],
      [10.54, 'stamp'],
      [10.69, 'chime', 392],
      [11.54, 'pluck', 392],
      [12.43, 'step'],
      [12.87, 'step'],
      [13.72, 'step'],
      [14.35, 'pluck', 440],
      [14.67, 'step'],
      [15.26, 'pluck', 523.25],
    ],
    boss: [
      [0.1, 'reed', 98],
      [0.42, 'latch'],
      [0.56, 'creak'],
      [1.84, 'rail'],
      [2.53, 'reed', 146.83],
      [3.84, 'stamp'],
      [4.04, 'chime', 466.16],
      [5.18, 'slide'],
      [6.12, 'chime', 392],
      [7.2, 'reed', 103.83],
      [8.16, 'reed', 110],
      [9.1, 'pluck', 220],
      [10.78, 'slide'],
      [11.78, 'stamp'],
      [11.94, 'creak'],
      [12.16, 'lamp'],
      [13.34, 'chime', 293.66],
      [15.05, 'reed', 146.83],
    ],
    ending: [
      [0.18, 'metal'],
      [0.62, 'metal'],
      [1.14, 'metal'],
      [1.8, 'pluck', 293.66],
      [3.52, 'latch'],
      [4.2, 'reed', 392],
      [5.04, 'creak'],
      [5.64, 'bell', 392],
      [6.73, 'chime', 587.33],
      [7.52, 'pluck', 783.99],
      [8.16, 'reed', 329.63],
      [8.89, 'paper'],
      [10.19, 'paper'],
      [10.69, 'pluck', 493.88],
      [12.55, 'wind'],
      [13.35, 'rail'],
      [13.83, 'rail'],
      [14.38, 'rail'],
      [15.12, 'reed', 164.81],
    ],
  };
  function draw(canvas, key, part, time) {
    const pen = new window.DispatchFilmArt.PixelPen(canvas);
    const g = pen.g;
    g.save();
    g.setTransform(canvas.width / 320, 0, 0, canvas.height / 180, 0, 0);
    window.DispatchFilms[key](pen, part, time);
    g.restore();
  }

  let noise;
  function noiseBuffer(ctx) {
    if (noise && noise.sampleRate === ctx.sampleRate) return noise;
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 1.5), ctx.sampleRate);
    const samples = noise.getChannelData(0);
    let seed = 257;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = seed / 2147483648 - 1;
    }
    return noise;
  }
  class Soundtrack {
    constructor(mixer) {
      this.mixer = mixer;
      this.voices = new Set();
    }
    silence() {
      if (this.bus) this.bus.disconnect();
      this.bus = null;
      for (const source of this.voices) source.stop();
      this.voices.clear();
    }
    mix() {
      const { context, volume } = this.mixer();
      if (this.bus && context) this.bus.gain.value = volume;
      return context && volume > 0 && context.state === 'running' ? context : null;
    }
    cue(kind, pitch = 392) {
      const ctx = this.mix();
      if (!ctx) return;
      if (!this.bus) {
        this.bus = ctx.createGain();
        this.bus.gain.value = this.mixer().volume;
        this.bus.connect(ctx.destination);
      }
      const now = ctx.currentTime;
      const voice = (wave, from, to, length, level, attack = 0.008, offset = 0) => {
        const at = now + offset;
        const source = wave === 'noise' ? ctx.createBufferSource() : ctx.createOscillator();
        let instrument = source,
          filter;
        if (wave === 'noise') {
          source.buffer = noiseBuffer(ctx);
          filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.Q.value = 0.8;
          source.connect(filter);
          instrument = filter;
        } else source.type = wave;
        instrument.frequency.setValueAtTime(from, at);
        instrument.frequency.exponentialRampToValueAtTime(to, at + length);
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0.0001, at);
        envelope.gain.exponentialRampToValueAtTime(level, at + attack);
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
        instrument.connect(envelope);
        envelope.connect(this.bus);
        this.voices.add(source);
        source.onended = () => {
          this.voices.delete(source);
          source.disconnect();
          filter?.disconnect();
          envelope.disconnect();
        };
        source.start(at);
        source.stop(at + length + 0.02);
      };
      switch (kind) {
        case 'reed':
          voice('triangle', pitch * 0.991, pitch, 1.9, 0.095, 0.26);
          voice('sine', pitch * 1.497, pitch * 1.502, 1.75, 0.053, 0.31);
          break;
        case 'pluck':
          voice('triangle', pitch, pitch, 0.78, 0.13);
          voice('sine', pitch * 2.01, pitch * 2, 0.28, 0.048);
          break;
        case 'chime':
        case 'bell':
          for (const [ratio, level, length] of [
            [1, 0.21, 1.85],
            [2.02, 0.09, 1.35],
            [2.72, 0.047, 0.71],
            [4.15, 0.034, 0.4],
          ]) {
            voice('sine', pitch * ratio, pitch * ratio * 0.998, length, level * (kind === 'bell' ? 1 : 0.5));
          }
          break;
        case 'rail':
          voice('noise', 440, 210, 0.15, 0.21);
          voice('triangle', 130, 72, 0.12, 0.12, 0.008, 0.08);
          break;
        case 'whistle':
          voice('sine', 675, 587, 1.1, 0.09, 0.14);
          voice('sine', 865, 739, 1.2, 0.062, 0.21);
          voice('noise', 1600, 980, 0.7, 0.12, 0.16);
          break;
        case 'wind':
          voice('noise', 390, 1100, 1.3, 0.18, 0.42);
          break;
        case 'stamp':
          voice('sine', 130, 36, 0.35, 0.39);
          voice('noise', 1500, 160, 0.27, 0.47);
          voice('triangle', 240, 75, 0.21, 0.14);
          break;
        case 'slide':
          voice('noise', 470, 1430, 0.46, 0.26, 0.12);
          break;
        case 'paper':
          voice('noise', 2800, 4100, 0.17, 0.22, 0.036);
          voice('noise', 3900, 1800, 0.14, 0.15, 0.014, 0.12);
          break;
        case 'metal':
        case 'latch':
          voice('triangle', kind === 'latch' ? 710 : 980, 440, 0.12, 0.1);
          voice('noise', 1800, 550, 0.09, 0.27);
          break;
        case 'creak':
          voice('triangle', 154, 85, 0.46, 0.078, 0.08);
          voice('noise', 625, 220, 0.56, 0.21, 0.1);
          break;
        case 'thump':
        case 'step':
          voice('noise', 510, 100, 0.16, kind === 'thump' ? 0.41 : 0.17);
          break;
        case 'lamp':
          voice('sine', 694, 930, 0.17, 0.083);
          break;
      }
    }
  }
  class Film {
    constructor(canvas, key, pages, mixer, onPart, onTime, onEnd) {
      this.canvas = canvas;
      this.key = key;
      this.duration = pages * partSeconds;
      this.score = new Soundtrack(mixer);
      this.onPart = onPart;
      this.onTime = onTime;
      this.onEnd = onEnd;
      this.frame = -1;
      this.part = -1;
      this.time = 0;
      this.cue = 0;
      this.paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.poster = this.paused;
      this.paint();
    }
    paint() {
      const frame = Math.floor(this.time * fps);
      if (frame === this.frame) return;
      this.frame = frame;
      const part = Math.min(Math.ceil(this.duration / partSeconds) - 1, Math.floor(this.time / partSeconds));
      if (part !== this.part) {
        this.part = part;
        this.onPart(part);
      }
      draw(
        this.canvas,
        this.key,
        part,
        this.poster ? posters[this.key][part] : frame / fps - part * partSeconds,
      );
      this.onTime(this.time, this.duration);
    }
    tick(dt) {
      if (this.paused) return;
      this.time = Math.min(this.duration, this.time + dt);
      const track = tracks[this.key];
      while (this.cue < track.length && track[this.cue][0] <= this.time) {
        const [, kind, pitch] = track[this.cue++];
        this.score.cue(kind, pitch);
      }
      if (this.time >= this.duration) return this.onEnd();
      this.paint();
    }
    setPaused(value) {
      this.paused = value;
      if (value) this.score.silence();
      else if (this.poster) {
        this.poster = false;
        this.frame = -1;
        this.paint();
      }
    }
    next() {
      const to = (this.part + 1) * partSeconds;
      if (to >= this.duration) return this.onEnd();
      this.time = to;
      this.score.silence();
      this.cue = tracks[this.key].findIndex(([at]) => at >= to);
      if (this.cue < 0) this.cue = tracks[this.key].length;
      this.paint();
    }
    static poster(canvas, key) {
      draw(canvas, key, 0, posters[key][0]);
    }
  }
  window.DispatchFilm = Film;
})();
