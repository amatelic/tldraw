import { useRef, useState } from 'react';
import type { ShapeStyle } from '../types';
import { extractWaveform, formatDuration } from '../utils/audioProcessor';

interface AudioUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAudioAdd: (
    src: string,
    isBase64: boolean,
    duration: number,
    waveformData: number[],
    style: ShapeStyle
  ) => void;
  style: ShapeStyle;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type AudioRequest =
  | { type: 'file'; file: File }
  | { type: 'url'; url: string };

interface LoadedAudioInput {
  src: string;
  isBase64: boolean;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function loadAudioDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'metadata';

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('error', handleError);
    };

    const handleLoaded = () => {
      cleanup();
      if (Number.isFinite(audio.duration)) {
        resolve(audio.duration);
        return;
      }
      reject(new Error('Audio duration unavailable'));
    };

    const handleError = () => {
      cleanup();
      reject(new Error('Failed to load audio'));
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('error', handleError);
    audio.src = src;
    audio.load();
  });
}

export function AudioUploadDialog({ isOpen, onClose, onAudioAdd, style }: AudioUploadDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [lastRequest, setLastRequest] = useState<AudioRequest | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialogState = () => {
    setIsLoading(false);
    setLoadingMessage(null);
    setDuration(null);
  };

  const processLoadedAudio = async (input: LoadedAudioInput) => {
    setLoadingMessage('Loading audio metadata...');
    const audioDuration = await loadAudioDuration(input.src);
    setDuration(audioDuration);

    setLoadingMessage('Building waveform preview...');
    const waveformData = await extractWaveform(input.src);

    onAudioAdd(input.src, input.isBase64, audioDuration, waveformData, style);
    onClose();
    resetDialogState();
    setLastRequest(null);
    if (!input.isBase64) {
      setUrl('');
    }
  };

  const processAudioRequest = async (request: AudioRequest) => {
    setIsLoading(true);
    setLoadingMessage(request.type === 'file' ? 'Loading audio file...' : 'Loading audio URL...');
    setError(null);
    setDuration(null);

    try {
      if (request.type === 'file') {
        const src = await readFileAsDataUrl(request.file);
        await processLoadedAudio({ src, isBase64: true });
        return;
      }

      await processLoadedAudio({ src: request.url, isBase64: false });
    } catch {
      setError(
        request.type === 'file'
          ? 'Failed to process audio file'
          : 'Failed to load audio from URL'
      );
      resetDialogState();
    }
  };

  const handleRetry = () => {
    if (!lastRequest) {
      return;
    }
    void processAudioRequest(lastRequest);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setLastRequest(null);
      setError('File size exceeds 5MB limit');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      setLastRequest(null);
      setError('Please select an audio file');
      return;
    }

    const request: AudioRequest = { type: 'file', file };
    setLastRequest(request);
    await processAudioRequest(request);
  };

  const handleUrlSubmit = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setLastRequest(null);
      setError('Please enter a URL');
      return;
    }

    const request: AudioRequest = { type: 'url', url: trimmedUrl };
    setLastRequest(request);
    await processAudioRequest(request);
  };

  const handleTabChange = (tab: 'upload' | 'url') => {
    setActiveTab(tab);
    setError(null);
    setDuration(null);
    setLastRequest(null);
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={handleClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Audio</h2>

        <div className="dialog-tabs">
          <button
            className={activeTab === 'upload' ? 'active' : ''}
            onClick={() => handleTabChange('upload')}
            disabled={isLoading}
          >
            Upload File
          </button>
          <button
            className={activeTab === 'url' ? 'active' : ''}
            onClick={() => handleTabChange('url')}
            disabled={isLoading}
          >
            External URL
          </button>
        </div>

        <div className="dialog-section audio-upload-card">
          <div className="audio-upload-card-header">
            <div className="audio-upload-icon" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div>
              <h3>Audio clip</h3>
              <p>Load a file or URL to place a waveform card on the canvas.</p>
            </div>
          </div>

          {activeTab === 'upload' ? (
            <div className="audio-upload-controls">
              <input
                key="audio-file-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="audio/*"
                style={{ display: 'none' }}
              />
              <button
                className="dialog-button primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                Choose Audio File
              </button>
              <p className="dialog-hint">Max file size: 5MB</p>
            </div>
          ) : (
            <div className="audio-upload-controls">
              <input
                key="audio-url-input"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim() && !isLoading) {
                    void handleUrlSubmit();
                  }
                }}
                placeholder="https://example.com/audio.mp3"
                className="dialog-input"
                disabled={isLoading}
              />
              <button
                className="dialog-button primary"
                onClick={handleUrlSubmit}
                disabled={isLoading || !url.trim()}
              >
                Add Audio
              </button>
            </div>
          )}

          {isLoading && (
            <div className="audio-upload-status" role="status" aria-live="polite">
              <span className="audio-upload-spinner" aria-hidden="true" />
              <span>{loadingMessage ?? 'Loading audio...'}</span>
            </div>
          )}
        </div>

        {duration && <div className="dialog-info">Duration: {formatDuration(duration)}</div>}

        {error && (
          <div className="dialog-error audio-upload-error">
            <span>{error}</span>
            {lastRequest && (
              <button className="dialog-button" onClick={handleRetry} disabled={isLoading}>
                Retry
              </button>
            )}
          </div>
        )}

        <div className="dialog-actions">
          <button className="dialog-button" onClick={handleClose} disabled={isLoading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
