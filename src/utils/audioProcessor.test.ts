import { describe, it, expect } from 'vitest';
import {
  extractWaveformFromChannelData,
  formatDuration,
} from './audioProcessor';

describe('formatDuration', () => {
  it('should format seconds less than 60 correctly', () => {
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9)).toBe('0:09');
  });

  it('should format minutes and seconds correctly', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(125)).toBe('2:05');
  });

  it('should format hours as minutes correctly', () => {
    expect(formatDuration(3600)).toBe('60:00');
    expect(formatDuration(3665)).toBe('61:05');
  });

  it('should pad single digit seconds with zero', () => {
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(301)).toBe('5:01');
  });
});

describe('extractWaveformFromChannelData', () => {
  it('should extract waveform from uniform data', () => {
    // Create uniform data (all 0.5)
    const channelData = new Float32Array(100);
    channelData.fill(0.5);

    const result = extractWaveformFromChannelData(channelData, 10);

    expect(result).toHaveLength(10);
    // All values should be 1 (normalized since they're all the same)
    expect(result.every((v) => v === 1)).toBe(true);
  });

  it('should extract waveform with varying amplitudes', () => {
    // Create data with varying amplitudes
    const channelData = new Float32Array(100);
    for (let i = 0; i < 100; i++) {
      channelData[i] = Math.sin(i * 0.1);
    }

    const result = extractWaveformFromChannelData(channelData, 10);

    expect(result).toHaveLength(10);
    // Values should be in range [0, 1]
    expect(result.every((v) => v >= 0 && v <= 1)).toBe(true);
    // Max should be 1 (normalized)
    expect(Math.max(...result)).toBe(1);
  });

  it('should handle data with zeros', () => {
    // Create data with zeros and non-zeros
    const channelData = new Float32Array(50);
    channelData.fill(0);
    // Set every 5th value to 0.5
    for (let i = 0; i < 50; i += 5) {
      channelData[i] = 0.5;
    }

    const result = extractWaveformFromChannelData(channelData, 5);

    expect(result).toHaveLength(5);
    // Should still have some variation
    expect(result.some((v) => v > 0)).toBe(true);
    // Max should be 1
    expect(Math.max(...result)).toBe(1);
  });

  it('should handle single bar request', () => {
    const channelData = new Float32Array(100);
    for (let i = 0; i < 100; i++) {
      channelData[i] = i * 0.01;
    }

    const result = extractWaveformFromChannelData(channelData, 1);

    expect(result).toHaveLength(1);
    // Single value should be 1 (normalized)
    expect(result[0]).toBe(1);
  });

  it('should handle more bars than samples gracefully', () => {
    // Edge case: request more bars than samples
    const channelData = new Float32Array(10);
    channelData.fill(0.5);

    const result = extractWaveformFromChannelData(channelData, 20);

    // Should create 20 bars, some with 0 samples (when bars > samples)
    expect(result).toHaveLength(20);
    // First 10 bars should have data (10 samples / 20 bars = 0.5 floored to 0, so some bars get 0 samples)
    // This is an edge case where the function creates empty bars
    expect(result).toBeDefined();
  });

  it('should handle all zeros data', () => {
    const channelData = new Float32Array(50);
    channelData.fill(0);

    const result = extractWaveformFromChannelData(channelData, 5);

    expect(result).toHaveLength(5);
    // All should be 0 (no division by zero error)
    expect(result.every((v) => v === 0)).toBe(true);
  });

  it('should correctly calculate average amplitude per bar', () => {
    // Create predictable data: first 50 values are 1.0, last 50 are 0.5
    const channelData = new Float32Array(100);
    for (let i = 0; i < 50; i++) {
      channelData[i] = 1.0;
    }
    for (let i = 50; i < 100; i++) {
      channelData[i] = 0.5;
    }

    const result = extractWaveformFromChannelData(channelData, 2);

    expect(result).toHaveLength(2);
    // First bar should have higher average (1.0 vs 0.5)
    expect(result[0]).toBe(1); // Normalized
    expect(result[1]).toBe(0.5); // Half of max
  });

  it('should handle negative values correctly', () => {
    // Audio data can be negative (wave oscillates around 0)
    const channelData = new Float32Array(50);
    for (let i = 0; i < 50; i++) {
      channelData[i] = Math.sin(i * 0.2); // -1 to 1
    }

    const result = extractWaveformFromChannelData(channelData, 5);

    expect(result).toHaveLength(5);
    // All values should be positive (absolute value taken)
    expect(result.every((v) => v >= 0)).toBe(true);
    // Should be normalized
    expect(Math.max(...result)).toBe(1);
  });
});
