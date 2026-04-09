import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toolbar } from './Toolbar';

describe('Toolbar', () => {
  const mockOnToolChange = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    mockOnToolChange.mockClear();
  });

  it('should render all primary tools', () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    // Check for primary tool buttons by aria-label
    expect(screen.getByLabelText('Select (V)')).toBeInTheDocument();
    expect(screen.getByLabelText('Hand (H)')).toBeInTheDocument();
    expect(screen.getByLabelText('Pencil (D)')).toBeInTheDocument();
    expect(screen.getByLabelText('Eraser (E)')).toBeInTheDocument();
    expect(screen.getByLabelText('Arrow (A)')).toBeInTheDocument();
    expect(screen.getByLabelText('Text (T)')).toBeInTheDocument();
    expect(screen.getByLabelText('Rectangle (R)')).toBeInTheDocument();
    expect(screen.getByLabelText('Circle (C)')).toBeInTheDocument();
    expect(screen.getByLabelText('Line (L)')).toBeInTheDocument();
    expect(screen.getByLabelText('Image (I)')).toBeInTheDocument();
    expect(screen.getByLabelText('Show more tools')).toBeInTheDocument();
  });

  it('should highlight the current active tool', () => {
    const { rerender } = render(
      <Toolbar currentTool="select" onToolChange={mockOnToolChange} />
    );

    const selectButton = screen.getByLabelText('Select (V)');
    expect(selectButton).toHaveClass('active');

    rerender(<Toolbar currentTool="pencil" onToolChange={mockOnToolChange} />);

    expect(selectButton).not.toHaveClass('active');
    expect(screen.getByLabelText('Pencil (D)')).toHaveClass('active');
  });

  it('should call onToolChange when a tool is clicked', () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    const pencilButton = screen.getByLabelText('Pencil (D)');
    fireEvent.click(pencilButton);

    expect(mockOnToolChange).toHaveBeenCalledWith('pencil');
  });

  it('should show tooltips on hover', async () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    const selectButton = screen.getByLabelText('Select (V)');
    fireEvent.mouseEnter(selectButton);

    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Select (V)');
    });
  });

  it('should expand to show more tools when More button is clicked', () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    // Additional tools should not be visible initially
    expect(screen.queryByLabelText('Audio')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Embed (B)')).not.toBeInTheDocument();

    // Click More button
    const moreButton = screen.getByLabelText('Show more tools');
    fireEvent.click(moreButton);

    // Additional tools should now be visible
    expect(screen.getByLabelText('Audio')).toBeInTheDocument();
    expect(screen.getByLabelText('Embed (B)')).toBeInTheDocument();
  });

  it('should collapse more tools when clicking More button again', () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    // Expand
    const moreButton = screen.getByLabelText('Show more tools');
    fireEvent.click(moreButton);

    expect(screen.getByLabelText('Audio')).toBeInTheDocument();

    // Collapse
    fireEvent.click(moreButton);

    expect(screen.queryByLabelText('Audio')).not.toBeInTheDocument();
  });

  it('should update aria-expanded when toggling more menu', () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    const moreButton = screen.getByLabelText('Show more tools');
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(moreButton);
    expect(moreButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(moreButton);
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('should call onToolChange for tools in more menu', () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    // Expand menu
    const moreButton = screen.getByLabelText('Show more tools');
    fireEvent.click(moreButton);

    // Click Audio tool
    const audioButton = screen.getByLabelText('Audio');
    fireEvent.click(audioButton);

    expect(mockOnToolChange).toHaveBeenCalledWith('audio');
  });

  it('should have correct keyboard shortcuts in tooltips', async () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    const shortcuts = [
      { tool: 'Select', shortcut: 'V' },
      { tool: 'Hand', shortcut: 'H' },
      { tool: 'Pencil', shortcut: 'D' },
      { tool: 'Eraser', shortcut: 'E' },
      { tool: 'Arrow', shortcut: 'A' },
      { tool: 'Text', shortcut: 'T' },
      { tool: 'Rectangle', shortcut: 'R' },
      { tool: 'Circle', shortcut: 'C' },
      { tool: 'Line', shortcut: 'L' },
      { tool: 'Image', shortcut: 'I' },
    ];

    for (const { tool, shortcut } of shortcuts) {
      const button = screen.getByLabelText(`${tool} (${shortcut})`);
      fireEvent.mouseEnter(button);

      vi.advanceTimersByTime(300);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent(`${tool} (${shortcut})`);
      });

      fireEvent.mouseLeave(button);
    }
  });

  it('should render correct icons for all tools', () => {
    render(<Toolbar currentTool="select" onToolChange={mockOnToolChange} />);

    // All buttons should have SVG icons
    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      const svg = button.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  it('should apply correct styling classes', () => {
    const { container } = render(
      <Toolbar currentTool="select" onToolChange={mockOnToolChange} />
    );

    expect(container.querySelector('.toolbar')).toBeInTheDocument();
    expect(container.querySelector('.toolbar-content')).toBeInTheDocument();
  });
});
