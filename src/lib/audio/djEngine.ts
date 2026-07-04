export type TrackType = "song" | "beat" | "vocal" | "guitar";
export type TrackSource = "uploaded" | "ai_matched" | "ai_standalone";

export interface DjTrack {
  id: string;
  title: string;
  type: TrackType;
  source: TrackSource;
  fileUrl: string;
  bpm: number | null;
  energyLevel: number | null;
}

export type MoodProfile =
  | "chill_buildup"
  | "high_energy"
  | "emotional"
  | "party_vibe";

const MOOD_PROFILES: MoodProfile[] = [
  "chill_buildup",
  "high_energy",
  "emotional",
  "party_vibe",
];

interface MoodSettings {
  crossfadeMinSec: number;
  crossfadeMaxSec: number;
  energyPreference: number; // target energy 0-1
  energyTolerance: number;
}

const MOOD_SETTINGS: Record<MoodProfile, MoodSettings> = {
  chill_buildup: {
    crossfadeMinSec: 4,
    crossfadeMaxSec: 8,
    energyPreference: 0.35,
    energyTolerance: 0.3,
  },
  high_energy: {
    crossfadeMinSec: 2,
    crossfadeMaxSec: 4,
    energyPreference: 0.85,
    energyTolerance: 0.25,
  },
  emotional: {
    crossfadeMinSec: 5,
    crossfadeMaxSec: 9,
    energyPreference: 0.3,
    energyTolerance: 0.35,
  },
  party_vibe: {
    crossfadeMinSec: 2,
    crossfadeMaxSec: 5,
    energyPreference: 0.75,
    energyTolerance: 0.3,
  },
};

export class DjEngine {
  private audioCtx: AudioContext;
  private gainA: GainNode;
  private gainB: GainNode;
  private masterGain: GainNode;
  private sourceA: AudioBufferSourceNode | null = null;
  private sourceB: AudioBufferSourceNode | null = null;
  private activeIsA = true;
  private bufferCache = new Map<string, AudioBuffer>();

  private recentlyPlayed: string[] = [];
  private readonly noRepeatWindow = 5;

  public moodProfile: MoodProfile;
  public onTrackChange?: (track: DjTrack) => void;
  public aiBiasPercent = 30;

  constructor() {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.connect(this.audioCtx.destination);

    this.gainA = this.audioCtx.createGain();
    this.gainB = this.audioCtx.createGain();
    this.gainA.connect(this.masterGain);
    this.gainB.connect(this.masterGain);
    this.gainA.gain.value = 1;
    this.gainB.gain.value = 0;

    this.moodProfile =
      MOOD_PROFILES[Math.floor(Math.random() * MOOD_PROFILES.length)];
  }

  setMasterVolume(value: number) {
    this.masterGain.gain.setValueAtTime(
      Math.max(0, Math.min(1, value)),
      this.audioCtx.currentTime
    );
  }

  private async loadBuffer(track: DjTrack): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(track.id);
    if (cached) return cached;

    const res = await fetch(track.fileUrl);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = await this.audioCtx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(track.id, buffer);
    return buffer;
  }

  /**
   * Weighted-random track selection: prefers tracks matching the current
   * mood's target energy, respects no-repeat memory, and applies the
   * package-driven AI bias (probability AI-sourced tracks are favored).
   */
  pickNextTrack(pool: DjTrack[]): DjTrack | null {
    const eligible = pool.filter(
      (t) => !this.recentlyPlayed.includes(t.id)
    );
    const candidates = eligible.length > 0 ? eligible : pool;
    if (candidates.length === 0) return null;

    const settings = MOOD_SETTINGS[this.moodProfile];
    const useAiPool = Math.random() * 100 < this.aiBiasPercent;

    const aiCandidates = candidates.filter((t) => t.source !== "uploaded");
    const humanCandidates = candidates.filter((t) => t.source === "uploaded");

    let workingSet = candidates;
    if (useAiPool && aiCandidates.length > 0) {
      workingSet = aiCandidates;
    } else if (!useAiPool && humanCandidates.length > 0) {
      workingSet = humanCandidates;
    }

    const weighted = workingSet.map((t) => {
      const energy = t.energyLevel ?? 0.5;
      const diff = Math.abs(energy - settings.energyPreference);
      const weight = Math.max(0.05, 1 - diff / (settings.energyTolerance + 0.01));
      return { track: t, weight };
    });

    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const w of weighted) {
      rand -= w.weight;
      if (rand <= 0) return w.track;
    }

    return weighted[weighted.length - 1]?.track ?? candidates[0];
  }

  private rememberPlayed(trackId: string) {
    this.recentlyPlayed.push(trackId);
    if (this.recentlyPlayed.length > this.noRepeatWindow) {
      this.recentlyPlayed.shift();
    }
  }

  private randomCrossfadeDuration(): number {
    const settings = MOOD_SETTINGS[this.moodProfile];
    return (
      settings.crossfadeMinSec +
      Math.random() * (settings.crossfadeMaxSec - settings.crossfadeMinSec)
    );
  }

  /**
   * Starts playback of the first track immediately (no crossfade needed).
   */
  async playFirst(track: DjTrack) {
    const buffer = await this.loadBuffer(track);
    const now = this.audioCtx.currentTime;

    this.sourceA = this.audioCtx.createBufferSource();
    this.sourceA.buffer = buffer;
    this.sourceA.connect(this.gainA);
    this.gainA.gain.setValueAtTime(1, now);
    this.gainB.gain.setValueAtTime(0, now);
    this.sourceA.start(now);
    this.activeIsA = true;

    this.rememberPlayed(track.id);
    this.onTrackChange?.(track);

    return buffer.duration;
  }

  /**
   * Crossfades from the currently active source into the next track.
   * Returns the duration (seconds) of the newly started track, so the
   * caller can schedule the *next* transition.
   */
  async crossfadeTo(track: DjTrack): Promise<number> {
    const buffer = await this.loadBuffer(track);
    const now = this.audioCtx.currentTime;
    const fadeDuration = this.randomCrossfadeDuration();

    const incomingSource = this.audioCtx.createBufferSource();
    incomingSource.buffer = buffer;

    const incomingGain = this.activeIsA ? this.gainB : this.gainA;
    const outgoingGain = this.activeIsA ? this.gainA : this.gainB;

    incomingSource.connect(incomingGain);

    incomingGain.gain.cancelScheduledValues(now);
    outgoingGain.gain.cancelScheduledValues(now);

    incomingGain.gain.setValueAtTime(0, now);
    incomingGain.gain.linearRampToValueAtTime(1, now + fadeDuration);

    outgoingGain.gain.setValueAtTime(outgoingGain.gain.value, now);
    outgoingGain.gain.linearRampToValueAtTime(0, now + fadeDuration);

    incomingSource.start(now);

    const oldSource = this.activeIsA ? this.sourceA : this.sourceB;
    oldSource?.stop(now + fadeDuration + 0.1);

    if (this.activeIsA) {
      this.sourceB = incomingSource;
    } else {
      this.sourceA = incomingSource;
    }
    this.activeIsA = !this.activeIsA;

    this.rememberPlayed(track.id);
    this.onTrackChange?.(track);

    // Occasionally re-roll the session mood for variety on long sessions
    if (Math.random() < 0.15) {
      this.moodProfile =
        MOOD_PROFILES[Math.floor(Math.random() * MOOD_PROFILES.length)];
    }

    return buffer.duration;
  }

  stop() {
    const now = this.audioCtx.currentTime;
    this.sourceA?.stop(now);
    this.sourceB?.stop(now);
  }

  getCurrentTime() {
    return this.audioCtx.currentTime;
  }
}
