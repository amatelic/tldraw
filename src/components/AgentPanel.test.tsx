import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentOrchestrator } from '../agents/agentOrchestrator';
import { ReviewModeProvider } from '../agents/providers/reviewModeProvider';
import type { Shape } from '../types';
import { AgentPanel } from './AgentPanel';

const shapeStyle = {
  color: '#111111',
  fillColor: '#ffffff',
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

const baseShapes: Shape[] = [
  {
    id: 'shape-1',
    type: 'text',
    bounds: { x: 0, y: 0, width: 120, height: 24 },
    text: 'Review this flow',
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    style: shapeStyle,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'shape-2',
    type: 'rectangle',
    bounds: { x: 20, y: 40, width: 100, height: 80 },
    style: {
      ...shapeStyle,
      color: '#ff0000',
      strokeWidth: 4,
    },
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'shape-3',
    type: 'circle',
    bounds: { x: 160, y: 40, width: 80, height: 80 },
    center: { x: 200, y: 80 },
    radius: 40,
    style: {
      ...shapeStyle,
      color: '#00aa00',
      strokeWidth: 8,
    },
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'shape-4',
    type: 'rectangle',
    bounds: { x: 280, y: 40, width: 100, height: 80 },
    style: {
      ...shapeStyle,
      color: '#0000ff',
      strokeWidth: 1,
    },
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'shape-5',
    type: 'rectangle',
    bounds: { x: 400, y: 40, width: 100, height: 80 },
    style: {
      ...shapeStyle,
      color: '#ff00ff',
      strokeWidth: 2,
    },
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: 'shape-6',
    type: 'rectangle',
    bounds: { x: 520, y: 40, width: 100, height: 80 },
    style: shapeStyle,
    createdAt: 1,
    updatedAt: 1,
  },
];

function renderPanel(options?: { selectedShapeIds?: string[]; shapes?: Shape[] }) {
  const orchestrator = new AgentOrchestrator([new ReviewModeProvider()]);

  return render(
    <AgentPanel
      isOpen={true}
      workspaceId="workspace-1"
      workspaceName="Workspace 1"
      shapes={options?.shapes ?? baseShapes}
      editorState={{
        camera: { x: 0, y: 0, zoom: 1 },
        selectedShapeIds: options?.selectedShapeIds ?? ['shape-1'],
      }}
      viewport={{ width: 600, height: 400 }}
      orchestrator={orchestrator}
      onClose={vi.fn()}
    />
  );
}

describe('AgentPanel', () => {
  it('should not render when closed', () => {
    const orchestrator = new AgentOrchestrator([new ReviewModeProvider()]);

    const { container } = render(
      <AgentPanel
        isOpen={false}
        workspaceId="workspace-1"
        workspaceName="Workspace 1"
        shapes={baseShapes}
        editorState={{
          camera: { x: 0, y: 0, zoom: 1 },
          selectedShapeIds: ['shape-1'],
        }}
        viewport={{ width: 600, height: 400 }}
        orchestrator={orchestrator}
        onClose={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should call onClose when the close button is pressed', () => {
    const onClose = vi.fn();
    const orchestrator = new AgentOrchestrator([new ReviewModeProvider()]);

    render(
      <AgentPanel
        isOpen={true}
        workspaceId="workspace-1"
        workspaceName="Workspace 1"
        shapes={baseShapes}
        editorState={{
          camera: { x: 0, y: 0, zoom: 1 },
          selectedShapeIds: ['shape-1'],
        }}
        viewport={{ width: 600, height: 400 }}
        orchestrator={orchestrator}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Close agent panel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should default context messaging to selection when a selection exists', () => {
    renderPanel({ selectedShapeIds: ['shape-1'] });
    expect(screen.getByText('Using your current selection (1 shape).')).toBeInTheDocument();
  });

  it('should default context messaging to visible board when nothing is selected', () => {
    renderPanel({ selectedShapeIds: [] });
    expect(
      screen.getByText('Using the part of the board that is currently visible on screen.')
    ).toBeInTheDocument();
  });

  it('should show workflow-specific guidance when switching away from review mode', () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText('Workflow'), {
      target: { value: 'cleanup' },
    });

    expect(
      screen.getByText(/only Review Mode is wired in this first implementation slice/i)
    ).toBeInTheDocument();
  });

  it('should render grouped findings after running review mode', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText('Context'), {
      target: { value: 'full-board' },
    });

    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Focus on what is inconsistent' },
    });

    fireEvent.click(screen.getByText('Run'));

    await waitFor(() => {
      expect(screen.getByText(/Preview ready/i)).toBeInTheDocument();
      expect(screen.getByText('Consistency Issues')).toBeInTheDocument();
      expect(screen.getByText('Suggested Next Edits')).toBeInTheDocument();
    });
  });

  it('should not mutate the input shapes when running review mode', async () => {
    const originalShapes = structuredClone(baseShapes);
    renderPanel({ shapes: originalShapes });

    fireEvent.click(screen.getByText('Run'));

    await waitFor(() => {
      expect(screen.getByText(/Preview ready/i)).toBeInTheDocument();
    });

    expect(originalShapes).toEqual(baseShapes);
  });
});
