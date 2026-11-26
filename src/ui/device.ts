// Browser capabilities the rest timer uses. Each one is optional on iOS.
import { useEffect } from 'react';

let audio: AudioContext | null = null;

/** iOS only lets audio play after a user gesture, so call this from a tap. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
    const silent = audio.createBufferSource();
    silent.buffer = audio.createBuffer(1, 1, 22_050);
    silent.connect(audio.destination);
    silent.start();
  } catch {
    audio = null;
  }
}

/** A short alert sound: each note starts `at` seconds in and lasts `length` seconds. */
export interface Tune {
  wave: OscillatorType;
  volume: number;
  notes: { hz: number; at: number; length: number }[];
}

/** Plays `tune` plus a vibration where supported. */
export function alertRestOver(tune: Tune) {
  navigator.vibrate?.([200, 100, 200]);
  if (!audio || audio.state !== 'running') return;
  const t0 = audio.currentTime + 0.05;
  for (const note of tune.notes) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = tune.wave;
    osc.frequency.value = note.hz;
    const t = t0 + note.at;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(tune.volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + note.length);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + note.length + 0.01);
  }
}

/** Keeps the screen on while `active`. The browser drops the lock when the page hides, so re-take it on return. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
        else sentinel = lock;
      } catch {
        // Denied (low battery mode, unsupported context): the timer still works.
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void sentinel?.release();
    };
  }, [active]);
}
