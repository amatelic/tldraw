interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/**
 * Extract waveform data from audio channel data.
 * This is a pure function that can be tested without browser APIs.
 * 
 * @param channelData - Float32Array of audio samples
 * @param numBars - Number of bars to generate
 * @returns Array of normalized waveform values (0-1)
 */
export function extractWaveformFromChannelData(
  channelData: Float32Array,
  numBars: number
): number[] {
  const samplesPerBar = Math.floor(channelData.length / numBars);
  const waveformData: number[] = [];

  for (let i = 0; i < numBars; i++) {
    const start = i * samplesPerBar;
    const end = start + samplesPerBar;
    let sum = 0;

    for (let j = start; j < end; j++) {
      sum += Math.abs(channelData[j]);
    }

    waveformData.push(sum / samplesPerBar);
  }

  // Normalize to 0-1 range
  const max = Math.max(...waveformData);
  const normalized = max > 0 ? waveformData.map((v) => v / max) : waveformData;

  return normalized;
}

export async function extractWaveform(
  audioSrc: string,
  numBars: number = 50
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const AudioContextClass =
      window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext;
    if (!AudioContextClass) {
      reject(new Error('AudioContext not supported'));
      return;
    }
    const audioContext = new AudioContextClass();

    fetch(audioSrc)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        const channelData = audioBuffer.getChannelData(0);
        const waveformData = extractWaveformFromChannelData(channelData, numBars);

        audioContext.close();
        resolve(waveformData);
      })
      .catch((err) => {
        audioContext.close();
        reject(err);
      });
  });
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
