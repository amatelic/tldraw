import { useState, useRef } from 'react';
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

export function AudioUploadDialog({ isOpen, onClose, onAudioAdd, style }: AudioUploadDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAudioFile = async (_file: File, src: string, isBase64: boolean) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get duration
      const audio = new Audio(src);
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error('Failed to load audio'));
      });

      const audioDuration = audio.duration;
      setDuration(audioDuration);

      // Extract waveform
      const waveformData = await extractWaveform(src);

      onAudioAdd(src, isBase64, audioDuration, waveformData, style);
      onClose();
      setIsLoading(false);
      setDuration(null);
    } catch (err) {
      setError('Failed to process audio file');
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 5MB limit');
      return;
    }

    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      processAudioFile(file, src, true);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get duration
      const audio = new Audio(url);
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error('Failed to load audio'));
      });

      const audioDuration = audio.duration;
      setDuration(audioDuration);

      // Extract waveform
      const waveformData = await extractWaveform(url);

      onAudioAdd(url, false, audioDuration, waveformData, style);
      onClose();
      setIsLoading(false);
      setDuration(null);
      setUrl('');
    } catch (err) {
      setError('Failed to load audio from URL');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Audio</h2>

        <div className="dialog-tabs">
          <button
            className={activeTab === 'upload' ? 'active' : ''}
            onClick={() => {
              setActiveTab('upload');
              setError(null);
            }}
          >
            Upload File
          </button>
          <button
            className={activeTab === 'url' ? 'active' : ''}
            onClick={() => {
              setActiveTab('url');
              setError(null);
            }}
          >
            External URL
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div className="dialog-section">
            <input
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
              {isLoading ? 'Processing...' : 'Choose Audio File'}
            </button>
            <p className="dialog-hint">Max file size: 5MB</p>
          </div>
        ) : (
          <div className="dialog-section">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/audio.mp3"
              className="dialog-input"
            />
            <button
              className="dialog-button primary"
              onClick={handleUrlSubmit}
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? 'Processing...' : 'Add Audio'}
            </button>
          </div>
        )}

        {duration && <div className="dialog-info">Duration: {formatDuration(duration)}</div>}

        {error && <div className="dialog-error">{error}</div>}

        <div className="dialog-actions">
          <button className="dialog-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
