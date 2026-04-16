import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceTabs } from './WorkspaceTabs';
import type { Workspace } from '../stores/workspaceStore';

function createWorkspace(index: number): Workspace {
  return {
    id: `workspace-${index}`,
    name: `Workspace ${index}`,
    state: {
      tool: 'select',
      selectedShapeIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      isDragging: false,
      isDrawing: false,
      shapeStyle: {
        color: '#000000',
        fillColor: '#ffffff',
        strokeWidth: 2,
        strokeStyle: 'solid',
        fillStyle: 'solid',
        opacity: 1,
        blendMode: 'source-over',
        shadows: [],
        fontSize: 16,
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left',
      },
      editingTextId: null,
    },
    shapes: [],
    createdAt: index,
    updatedAt: index,
  };
}

function renderWorkspaceTabs({
  workspaces,
  activeId = workspaces[0]?.id ?? '',
}: {
  workspaces: Workspace[];
  activeId?: string;
}) {
  const onSwitch = vi.fn();
  const onAdd = vi.fn();
  const onDelete = vi.fn();
  const onRename = vi.fn();

  render(
    <WorkspaceTabs
      workspaces={workspaces}
      activeId={activeId}
      onSwitch={onSwitch}
      onAdd={onAdd}
      onDelete={onDelete}
      onRename={onRename}
      maxWorkspaces={10}
    />
  );

  return { onSwitch, onAdd, onDelete, onRename };
}

describe('WorkspaceTabs', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the full tab rail when there are six or fewer workspaces', () => {
    const workspaces = Array.from({ length: 6 }, (_, index) => createWorkspace(index + 1));

    renderWorkspaceTabs({ workspaces, activeId: workspaces[5].id });

    expect(screen.getByRole('tab', { name: 'Workspace 6' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /show \d+ more workspaces/i })).not.toBeInTheDocument();
  });

  it('switches to the overflow UI once the workspace count exceeds six', () => {
    const workspaces = Array.from({ length: 7 }, (_, index) => createWorkspace(index + 1));

    renderWorkspaceTabs({ workspaces });

    expect(screen.getByRole('tab', { name: 'Workspace 5' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Workspace 6' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 2 more workspaces' })).toBeInTheDocument();
  });

  it('surfaces the active hidden workspace in the overflow trigger label', () => {
    const workspaces = Array.from({ length: 7 }, (_, index) => createWorkspace(index + 1));

    renderWorkspaceTabs({ workspaces, activeId: workspaces[6].id });

    expect(
      screen.getByRole('button', {
        name: 'Active workspace Workspace 7. Show hidden workspaces',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Workspace 7')).toBeInTheDocument();
  });

  it('opens hidden workspaces from the overflow menu', () => {
    const workspaces = Array.from({ length: 7 }, (_, index) => createWorkspace(index + 1));
    const { onSwitch } = renderWorkspaceTabs({ workspaces });

    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more workspaces' }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Workspace 7' }));

    expect(onSwitch).toHaveBeenCalledWith('workspace-7');
  });

  it('allows renaming and closing hidden workspaces from the overflow menu', () => {
    const workspaces = Array.from({ length: 7 }, (_, index) => createWorkspace(index + 1));
    const { onDelete, onRename } = renderWorkspaceTabs({ workspaces });

    fireEvent.click(screen.getByRole('button', { name: 'Show 2 more workspaces' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rename Workspace 6' }));

    const renameInput = screen.getByLabelText('Rename Workspace 6');
    fireEvent.change(renameInput, { target: { value: 'Client Review' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });

    expect(onRename).toHaveBeenCalledWith('workspace-6', 'Client Review');

    fireEvent.click(screen.getByRole('button', { name: 'Close Workspace 7' }));

    expect(onDelete).toHaveBeenCalledWith('workspace-7');
  });
});
