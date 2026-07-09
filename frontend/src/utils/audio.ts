// Native Web Audio API Synthesizer for Hand Cricket Game Sound Effects

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambienceSource: AudioBufferSourceNode | null = null;
  private ambienceGain: GainNode | null = null;

  constructor() {
    // Load mute status from localStorage
    const savedMute = localStorage.getItem('game_muted');
    if (savedMute) {
      this.isMuted = savedMute === 'true';
    }
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('game_muted', String(muted));
    if (muted) {
      this.stopAmbience();
    } else {
      this.startAmbience();
    }
  }

  getMute(): boolean {
    return this.isMuted;
  }

  // Play button click: short blip
  playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio click failed to play', e);
    }
  }

  // Play bat hitting ball: wooden pop/thud
  playBatHit() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch starts high and goes low rapidly
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.1);

      // Volume fades rapidly
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);

      // Add a tiny noise snap
      this.playNoise(0.05, 1000, 0.2);
    } catch (e) {
      console.warn('Audio bat hit failed to play', e);
    }
  }

  // Play wicket crash: noise explosion + metallic clink
  playWicket() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();

      // 1. Crash sound (noise)
      this.playNoise(0.5, 400, 0.4);

      // 2. High-pitched flying metallic stump sound
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1000, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.4);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(600, ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn('Audio wicket failed to play', e);
    }
  }

  // Play boundary cheer: cheering crowd
  playBoundaryCheer() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      
      // Noise representing cheering crowd (fade in - fade out)
      const bufferSize = ctx.sampleRate * 1.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Filter to make it sound like crowd roar
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 1.0;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.3); // roar starts
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5); // fades away

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 1.5);

      // Play cheering melody
      this.playMelody([330, 392, 523, 659, 784], [0.1, 0.1, 0.1, 0.1, 0.3], 'sine');
    } catch (e) {
      console.warn('Audio boundary cheer failed to play', e);
    }
  }

  // Play Victory Music: Happy Triumphant arpeggio
  playVictory() {
    if (this.isMuted) return;
    const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25, 659.25]; // C E G C G C E
    const durations = [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.4];
    this.playMelody(notes, durations, 'triangle');
  }

  // Play Defeat Music: Sad descending minor chord
  playDefeat() {
    if (this.isMuted) return;
    const notes = [392.00, 370.00, 311.13, 261.63, 220.00, 196.00]; // G Gb Eb C A G
    const durations = [0.2, 0.2, 0.2, 0.2, 0.3, 0.5];
    this.playMelody(notes, durations, 'sine');
  }

  // Start continuous crowd ambience
  startAmbience() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      if (this.ambienceSource) return; // Already running

      const bufferSize = ctx.sampleRate * 2.0; // 2 seconds of noise loop
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Brown noise approximation for low frequency rumble
        let lastOut = 0.0;
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5; // amplification
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400; // low mumble

      this.ambienceGain = ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(0, ctx.currentTime);
      this.ambienceGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.0); // slow fade in

      noise.connect(filter);
      filter.connect(this.ambienceGain);
      this.ambienceGain.connect(ctx.destination);

      noise.start();
      this.ambienceSource = noise;
    } catch (e) {
      console.warn('Audio ambience failed to start', e);
    }
  }

  stopAmbience() {
    try {
      if (this.ambienceSource) {
        this.ambienceSource.stop();
        this.ambienceSource.disconnect();
        this.ambienceSource = null;
      }
      if (this.ambienceGain) {
        this.ambienceGain.disconnect();
        this.ambienceGain = null;
      }
    } catch (e) {
      console.warn('Audio ambience failed to stop', e);
    }
  }

  // Utility to generate a short noise burst
  private playNoise(duration: number, filterFreq: number, volume: number) {
    try {
      const ctx = this.initCtx();
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + duration);
    } catch (e) {
      // ignore audio failure
    }
  }

  // Utility to play note sequences
  private playMelody(notes: number[], durations: number[], type: OscillatorType) {
    try {
      const ctx = this.initCtx();
      let time = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const duration = durations[idx];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.02);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + duration);

        time += duration;
      });
    } catch (e) {
      // ignore
    }
  }
}

export const sound = new SoundManager();
export default sound;
