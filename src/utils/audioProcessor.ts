export async function extractWaveform(audioSrc: string, numBars: number = 50): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    fetch(audioSrc)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
      .then((audioBuffer) => {
        const channelData = audioBuffer.getChannelData(0);
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
        const normalized = waveformData.map((v) => v / max);

        audioContext.close();
        resolve(normalized);
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
