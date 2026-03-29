import { useState, useRef } from 'react';
import type { ShapeStyle } from '../types';

interface ImageUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImageAdd: (
    src: string,
    isBase64: boolean,
    width: number,
    height: number,
    style: ShapeStyle
  ) => void;
  style: ShapeStyle;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUploadDialog({ isOpen, onClose, onImageAdd, style }: ImageUploadDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 5MB limit');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          onImageAdd(src, true, img.width, img.height, style);
          onClose();
          setIsLoading(false);
        };
        img.onerror = () => {
          setError('Failed to load image');
          setIsLoading(false);
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to read file');
      setIsLoading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        onImageAdd(url, false, img.width, img.height, style);
        onClose();
        setIsLoading(false);
        setUrl('');
      };
      img.onerror = () => {
        setError('Failed to load image from URL');
        setIsLoading(false);
      };
      img.src = url;
    } catch {
      setError('Failed to load image');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <h2>Add Image</h2>

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
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              className="dialog-button primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Choose Image File'}
            </button>
            <p className="dialog-hint">Max file size: 5MB</p>
          </div>
        ) : (
          <div className="dialog-section">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="dialog-input"
            />
            <button
              className="dialog-button primary"
              onClick={handleUrlSubmit}
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? 'Loading...' : 'Add Image'}
            </button>
          </div>
        )}

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
