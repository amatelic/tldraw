import { useState } from 'react';
import type { ShapeStyle } from '../types';

interface EmbedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEmbedAdd: (
    url: string,
    embedType: 'youtube' | 'website',
    embedSrc: string,
    style: ShapeStyle
  ) => void;
  style: ShapeStyle;
}

function parseYouTubeUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /gaming\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /studio\.youtube\.com\/video\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  return null;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function EmbedDialog({ isOpen, onClose, onEmbedAdd, style }: EmbedDialogProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const trimmedUrl = url.trim();
      const youtubeEmbed = parseYouTubeUrl(trimmedUrl);
      
      if (youtubeEmbed) {
        onEmbedAdd(trimmedUrl, 'youtube', youtubeEmbed, style);
        onClose();
        setUrl('');
      } else if (isValidUrl(trimmedUrl)) {
        onEmbedAdd(trimmedUrl, 'website', trimmedUrl, style);
        onClose();
        setUrl('');
      } else {
        setError('Please enter a valid URL (e.g., https://youtube.com/watch?v=... or https://example.com)');
      }
    } catch {
      setError('Failed to process URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Embed</h2>
        
        <div className="dialog-info">
          Paste a YouTube video URL or any website URL to embed it on your canvas
        </div>

        <div className="dialog-section">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://youtube.com/watch?v=... or https://example.com"
            className="dialog-input"
            autoFocus
          />
        </div>

        {error && <div className="dialog-error">{error}</div>}

        <div className="dialog-hint">
          Supported: YouTube videos, any website URL
        </div>

        <div className="dialog-actions">
          <button className="dialog-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dialog-button primary"
            onClick={handleSubmit}
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? 'Loading...' : 'Add Embed'}
          </button>
        </div>
      </div>
    </div>
  );
}
