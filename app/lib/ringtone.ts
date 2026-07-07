"use client";

/**
 * Lightweight WebAudio ringtone so the calling system does not depend on any
 * bundled audio asset. Produces a gentle repeating two-tone ring.
 */
export class Ringtone {
  private context: AudioContext | null = null;
  private intervalId: number | null = null;
  private playing = false;

  start() {
    if (this.playing) return;
    if (typeof window === "undefined") return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    this.playing = true;
    this.context = new AudioCtx();

    const playRing = () => {
      const ctx = this.context;
      if (!ctx) return;
      const now = ctx.currentTime;
      [880, 660].forEach((frequency, index) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        const start = now + index * 0.4;
        const stop = start + 0.35;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, stop);

        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(stop);
      });
    };

    playRing();
    this.intervalId = window.setInterval(playRing, 2500);
  }

  stop() {
    this.playing = false;
    if (this.intervalId != null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.context) {
      void this.context.close().catch(() => undefined);
      this.context = null;
    }
  }
}
