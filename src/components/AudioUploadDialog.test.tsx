import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioUploadDialog } from './AudioUploadDialog';
import { extractWaveform } from '../utils/audioProcessor';
import type { ShapeStyle } from '../types';

vi.mock('../utils/audioProcessor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/audioProcessor')>();
  return {
    ...actual,
    extractWaveform: vi.fn(),
  };
});

const mockStyle: ShapeStyle = {
  color: '#111111',
  fillColor: '#111111',
  fillGradient: null,
  strokeWidth: 2,
  strokeStyle: 'solid',
  fillStyle: 'none',
  opacity: 1,
  blendMode: 'source-over',
  shadows: [],
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
};

const audioInstances: MockAudio[] = [];

class MockAudio {
  duration = 42;
  preload = '';
  src = '';
  load = vi.fn();
  private listeners = new Map<string, Set<EventListener>>();

  constructor() {
    audioInstances.push(this);
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  resolveMetadata(duration = 42): void {
    this.duration = duration;
    this.dispatch('loadedmetadata');
  }

  rejectMetadata(): void {
    this.dispatch('error');
  }

  private dispatch(type: string): void {
    const event = new Event(type);
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }
}

describe('AudioUploadDialog', () => {
  const mockExtractWaveform = vi.mocked(extractWaveform);
  const mockOnClose = vi.fn();
  const mockOnAudioAdd = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnAudioAdd.mockClear();
    mockExtractWaveform.mockReset();
    mockExtractWaveform.mockResolvedValue([0.2, 0.8, 0.4]);
    audioInstances.length = 0;
    vi.stubGlobal('Audio', MockAudio);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function renderDialog() {
    return render(
      <AudioUploadDialog
        isOpen={true}
        onClose={mockOnClose}
        onAudioAdd={mockOnAudioAdd}
        style={mockStyle}
      />
    );
  }

  function openUrlTab() {
    fireEvent.click(screen.getByRole('button', { name: 'External URL' }));
  }

  it('does not render when closed', () => {
    render(
      <AudioUploadDialog
        isOpen={false}
        onClose={mockOnClose}
        onAudioAdd={mockOnAudioAdd}
        style={mockStyle}
      />
    );

    expect(screen.queryByRole('heading', { name: 'Add Audio' })).not.toBeInTheDocument();
  });

  it('shows validation errors for invalid file choices', () => {
    renderDialog();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['plain text'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('Please select an audio file')).toBeInTheDocument();
    expect(mockOnAudioAdd).not.toHaveBeenCalled();
  });

  it('shows a loader while URL audio metadata and waveform data load', async () => {
    renderDialog();
    openUrlTab();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/audio.mp3'), {
      target: { value: 'https://example.com/song.mp3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Audio' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Loading audio metadata...');

    await act(async () => {
      audioInstances[0].resolveMetadata(125);
    });

    await waitFor(() => {
      expect(mockExtractWaveform).toHaveBeenCalledWith('https://example.com/song.mp3');
      expect(mockOnAudioAdd).toHaveBeenCalledWith(
        'https://example.com/song.mp3',
        false,
        125,
        [0.2, 0.8, 0.4],
        mockStyle
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows retry after a URL load error and reuses the previous input', async () => {
    renderDialog();
    openUrlTab();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/audio.mp3'), {
      target: { value: 'https://example.com/broken.mp3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Audio' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Loading audio metadata...');

    await act(async () => {
      audioInstances[0].rejectMetadata();
    });

    expect(await screen.findByText('Failed to load audio from URL')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Loading audio metadata...');

    await act(async () => {
      audioInstances[1].resolveMetadata(9);
    });

    await waitFor(() => {
      expect(mockOnAudioAdd).toHaveBeenCalledWith(
        'https://example.com/broken.mp3',
        false,
        9,
        [0.2, 0.8, 0.4],
        mockStyle
      );
    });
  });
});
