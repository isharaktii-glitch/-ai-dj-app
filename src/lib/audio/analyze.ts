/**
 * Lightweight client-side audio analysis using the Web Audio API.
 * Runs in the browser at upload time — no external service needed.
 * BPM detection here uses a simple energy-peak autocorrelation approach,
 * which is approximate but good enough to drive auto-mix decisions.
 */

export interface AudioAnalysisResult {
  durationSeconds: number;
  bpm: number;
  energyLevel: number; // 0.0 - 1.0
}

export async function analyzeAudioFile(
  file: File
): Promise<AudioAnalysisResult> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();

  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const durationSeconds = audioBuffer.duration;

  const bpm = estimateBpm(channelData, sampleRate);
  const energyLevel = estimateEnergy(channelData);

  audioCtx.close();

  return { durationSeconds, bpm, energyLevel };
}

function estimateEnergy(channelData: Float32Array): number {
  let sumSquares = 0;
  const step = Math.max(1, Math.floor(channelData.length / 100000)); // sample for speed
  let count = 0;

  for (let i = 0; i < channelData.length; i += step) {
    sumSquares += channelData[i] * channelData[i];
    count++;
  }

  const rms = Math.sqrt(sumSquares / count);
  // Normalize RMS (~0 - 0.5 typical range) into a 0-1 scale
  return Math.min(1, rms * 2.2);
}

function estimateBpm(channelData: Float32Array, sampleRate: number): number {
  // Downsample + build an energy envelope, then find peak intervals.
  const windowSize = 1024;
  const hop = 512;
  const envelope: number[] = [];

  for (let i = 0; i + windowSize < channelData.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      const v = channelData[i + j];
      sum += v * v;
    }
    envelope.push(Math.sqrt(sum / windowSize));
  }

  // Find peaks in the envelope (simple local-maxima threshold approach)
  const threshold =
    (envelope.reduce((a, b) => a + b, 0) / envelope.length) * 1.3;
  const peakIndices: number[] = [];

  for (let i = 1; i < envelope.length - 1; i++) {
    if (
      envelope[i] > threshold &&
      envelope[i] > envelope[i - 1] &&
      envelope[i] > envelope[i + 1]
    ) {
      peakIndices.push(i);
    }
  }

  if (peakIndices.length < 2) {
    return 120; // fallback default BPM
  }

  const framesPerSecond = sampleRate / hop;
  const intervals: number[] = [];
  for (let i = 1; i < peakIndices.length; i++) {
    const framesBetween = peakIndices[i] - peakIndices[i - 1];
    const seconds = framesBetween / framesPerSecond;
    if (seconds > 0.25 && seconds < 1.5) {
      // plausible beat interval (40-240 BPM range)
      intervals.push(60 / seconds);
    }
  }

  if (intervals.length === 0) return 120;

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];

  // Clamp to a sane DJ-relevant BPM range
  return Math.round(Math.min(200, Math.max(60, median)));
}
