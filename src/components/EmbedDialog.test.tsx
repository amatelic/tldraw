import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmbedDialog } from './EmbedDialog';

const mockStyle = {
  color: '#000000',
  fillColor: '#000000',
  strokeWidth: 2,
  strokeStyle: 'solid' as const,
  fillStyle: 'none' as const,
  opacity: 1,
  fontSize: 16,
  fontFamily: 'sans-serif',
  fontWeight: 'normal' as const,
  fontStyle: 'normal' as const,
  textAlign: 'left' as const,
};

describe('EmbedDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnEmbedAdd = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnEmbedAdd.mockClear();
  });

  function getSubmitButton() {
    return screen.getByRole('button', { name: 'Add Embed' });
  }

  it('should not render when closed', () => {
    render(
      <EmbedDialog
        isOpen={false}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );
    expect(screen.queryByRole('heading', { name: 'Add Embed' })).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );
    expect(screen.getByRole('heading', { name: 'Add Embed' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/youtube/)).toBeInTheDocument();
  });

  it('should show error for empty URL submit attempt', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    const submitBtn = getSubmitButton();
    expect(submitBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/youtube/);
    fireEvent.change(input, { target: { value: ' ' } });
    expect(submitBtn).toBeDisabled();
    expect(mockOnEmbedAdd).not.toHaveBeenCalled();
  });

  it('should show error for invalid URL', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    const input = screen.getByPlaceholderText(/youtube/);
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.click(getSubmitButton());

    expect(screen.getByText(/valid URL/)).toBeInTheDocument();
    expect(mockOnEmbedAdd).not.toHaveBeenCalled();
  });

  it('should call onEmbedAdd with youtube type for YouTube URL', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    const input = screen.getByPlaceholderText(/youtube/);
    fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
    fireEvent.click(getSubmitButton());

    expect(mockOnEmbedAdd).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'youtube',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      mockStyle
    );
  });

  it('should call onEmbedAdd with website type for non-YouTube URL', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    const input = screen.getByPlaceholderText(/youtube/);
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.click(getSubmitButton());

    expect(mockOnEmbedAdd).toHaveBeenCalledWith(
      'https://example.com',
      'website',
      'https://example.com',
      mockStyle
    );
  });

  it('should parse youtu.be short URLs', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    const input = screen.getByPlaceholderText(/youtube/);
    fireEvent.change(input, { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    fireEvent.click(getSubmitButton());

    expect(mockOnEmbedAdd).toHaveBeenCalledWith(
      'https://youtu.be/dQw4w9WgXcQ',
      'youtube',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      mockStyle
    );
  });

  it('should close on Cancel click', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close on overlay click', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    const overlay = document.querySelector('.dialog-overlay');
    fireEvent.click(overlay!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should submit on Enter key', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    const input = screen.getByPlaceholderText(/youtube/);
    fireEvent.change(input, { target: { value: 'https://example.com' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnEmbedAdd).toHaveBeenCalled();
  });

  it('should disable submit when input is empty', () => {
    render(
      <EmbedDialog
        isOpen={true}
        onClose={mockOnClose}
        onEmbedAdd={mockOnEmbedAdd}
        style={mockStyle}
      />
    );

    expect(getSubmitButton()).toBeDisabled();
  });
});
