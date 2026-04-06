import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WorkspaceTab } from './WorkspaceTab';
import type { Workspace } from '../stores/workspaceStore';

const mockWorkspace: Workspace = {
  id: 'test-workspace',
  name: 'Test Workspace',
  state: {
    tool: 'select',
    selectedShapeIds: [],
    camera: { x: 0, y: 0, zoom: 1 },
    isDragging: false,
    isDrawing: false,
    shapeStyle: {
      color: '#000000',
      fillColor: '#000000',
      strokeWidth: 2,
      strokeStyle: 'solid',
      fillStyle: 'none',
      opacity: 1,
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
    },
    editingTextId: null,
  },
  shapes: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('WorkspaceTab', () => {
  const mockOnClick = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnRename = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    mockOnClick.mockClear();
    mockOnClose.mockClear();
    mockOnRename.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render workspace name in full when ≤15 characters', () => {
    const shortName = 'Short Name';
    render(
      <WorkspaceTab
        workspace={{ ...mockWorkspace, name: shortName }}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    expect(screen.getByText(shortName)).toBeInTheDocument();
  });

  it('should truncate workspace name when >15 characters', () => {
    const longName = 'My Project Name 123';
    const truncatedName = 'My Project Name...';
    
    render(
      <WorkspaceTab
        workspace={{ ...mockWorkspace, name: longName }}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    expect(screen.getByText(truncatedName)).toBeInTheDocument();
    expect(screen.queryByText(longName)).not.toBeInTheDocument();
  });

  it('should show tooltip after 3s hover on truncated name', async () => {
    const longName = 'My Project Name 123';
    
    render(
      <WorkspaceTab
        workspace={{ ...mockWorkspace, name: longName }}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText('My Project Name...');
    fireEvent.mouseEnter(tab.parentElement!);

    expect(screen.queryByText(longName)).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  it('should NOT show tooltip on short name', async () => {
    const shortName = 'Short Name';
    
    render(
      <WorkspaceTab
        workspace={{ ...mockWorkspace, name: shortName }}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(shortName);
    fireEvent.mouseEnter(tab.parentElement!);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    const tooltips = screen.queryAllByText(shortName);
    expect(tooltips).toHaveLength(1);
  });

  it('should start long-press progress at 0%', async () => {
    render(
      <WorkspaceTab
        workspace={mockWorkspace}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(mockWorkspace.name).parentElement!;
    fireEvent.mouseDown(tab, { button: 0 });

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    const progress = document.querySelector('.workspace-tab-progress');
    expect(progress).toBeInTheDocument();
    expect(progress?.getAttribute('style')).toContain('conic-gradient(#1976d2 0%');
  });

  it('should reach 100% progress after 3s long-press', async () => {
    render(
      <WorkspaceTab
        workspace={mockWorkspace}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(mockWorkspace.name).parentElement!;
    fireEvent.mouseDown(tab, { button: 0 });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    const progress = document.querySelector('.workspace-tab-progress');
    expect(progress?.getAttribute('style')).toContain('conic-gradient(#1976d2 100%');
  });

  it('should cancel long-press on mouse leave', async () => {
    render(
      <WorkspaceTab
        workspace={mockWorkspace}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(mockWorkspace.name).parentElement!;
    fireEvent.mouseDown(tab, { button: 0 });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    fireEvent.mouseLeave(tab);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    const progress = document.querySelector('.workspace-tab-progress');
    expect(progress).not.toBeInTheDocument();
  });

  it('should show dropdown after successful long-press', async () => {
    render(
      <WorkspaceTab
        workspace={mockWorkspace}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(mockWorkspace.name).parentElement!;
    fireEvent.mouseDown(tab, { button: 0 });

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('should show dropdown on right-click', () => {
    render(
      <WorkspaceTab
        workspace={mockWorkspace}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(mockWorkspace.name).parentElement!;
    fireEvent.contextMenu(tab);

    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('should enter edit mode when Rename is clicked', async () => {
    render(
      <WorkspaceTab
        workspace={mockWorkspace}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(mockWorkspace.name).parentElement!;
    fireEvent.contextMenu(tab);

    const renameButton = screen.getByText('Rename');
    fireEvent.click(renameButton);

    expect(screen.getByDisplayValue(mockWorkspace.name)).toBeInTheDocument();
  });

  it('should delete workspace when Close is clicked', async () => {
    render(
      <WorkspaceTab
        workspace={mockWorkspace}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(mockWorkspace.name).parentElement!;
    fireEvent.contextMenu(tab);

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable Close button when canDelete is false', () => {
    render(
      <WorkspaceTab
        workspace={mockWorkspace}
        isActive={false}
        canDelete={false}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText(mockWorkspace.name).parentElement!;
    fireEvent.contextMenu(tab);

    const closeButton = screen.getByText('Close');
    expect(closeButton).toBeDisabled();
  });

  it('should hide tooltip on mouse leave', async () => {
    const longName = 'My Project Name 123';
    
    render(
      <WorkspaceTab
        workspace={{ ...mockWorkspace, name: longName }}
        isActive={false}
        canDelete={true}
        onClick={mockOnClick}
        onClose={mockOnClose}
        onRename={mockOnRename}
      />
    );

    const tab = screen.getByText('My Project Name...').parentElement!;
    fireEvent.mouseEnter(tab);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText(longName)).toBeInTheDocument();

    fireEvent.mouseLeave(tab);

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    const tooltip = document.querySelector('.workspace-tab-tooltip');
    expect(tooltip).not.toBeInTheDocument();
  });
});
