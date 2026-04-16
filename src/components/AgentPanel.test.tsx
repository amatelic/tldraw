import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AgentOrchestrator } from '../agents/agentOrchestrator';
import { OpenCodeDiagramProvider } from '../agents/providers/openCodeDiagramProvider';
import { ReviewModeProvider } from '../agents/providers/reviewModeProvider';
import type { Shape } from '../types';
import type { AgentGenerationProposal } from '../types/agents';
import { AgentPanel } from './AgentPanel';

const shapeStyle = {
  color: '#111111',
  fillColor: '#ffffff',
  strokeWidth: 2,
  strokeStyle: 'solid' as const,
  fillStyle: 'none' as const,
  opacity: 1,
  blendMode: 'source-over' as const,
  shadows: [],
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

function renderPanel(options?: {
  selectedShapeIds?: string[];
  shapes?: Shape[];
  orchestrator?: AgentOrchestrator;
  onApplyGenerationProposal?: (proposal: AgentGenerationProposal) => {
    success: boolean;
    error: string | null;
  };
  onClose?: ReturnType<typeof vi.fn>;
}) {
  const orchestrator =
    options?.orchestrator ??
    new AgentOrchestrator([new ReviewModeProvider(), new OpenCodeDiagramProvider()]);

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
      onApplyGenerationProposal={
        options?.onApplyGenerationProposal ?? vi.fn(() => ({ success: true, error: null }))
      }
      onClose={options?.onClose ?? vi.fn()}
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
        onApplyGenerationProposal={vi.fn(() => ({ success: true, error: null }))}
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
        onApplyGenerationProposal={vi.fn(() => ({ success: true, error: null }))}
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

  it('should render structured diagram workflow controls when diagram generator is selected', () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText('Workflow'), {
      target: { value: 'generate-diagram' },
    });

    expect(screen.getByText('Diagram draft + presentation brief')).toBeInTheDocument();
    expect(screen.getByLabelText('Audience')).toBeInTheDocument();
    expect(screen.getByLabelText('Presentation Goal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate draft' })).toBeInTheDocument();
    expect(
      screen.getByText(/OpenCode-backed provider/i)
    ).toBeInTheDocument();
  });

  it('should lock context to full board for diagram generation', () => {
    renderPanel({ selectedShapeIds: ['shape-1'] });

    fireEvent.change(screen.getByLabelText('Workflow'), {
      target: { value: 'generate-diagram' },
    });

    expect(screen.getByLabelText('Context')).toBeDisabled();
    expect(
      screen.getByText('Using the full workspace, even if some content is outside the current viewport.')
    ).toBeInTheDocument();
  });

  it('should apply starter examples to the diagram workflow form', () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText('Workflow'), {
      target: { value: 'generate-diagram' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Messaging App Backend/i }));

    expect(screen.getByLabelText('Workflow')).toHaveValue('generate-diagram');
    expect(screen.getByLabelText('Prompt')).toHaveValue(
      'Create a backend architecture for a messaging app.'
    );
    expect(screen.getByLabelText('Audience')).toHaveValue('Engineering and product stakeholders');
    expect(screen.getByLabelText('Presentation Goal')).toHaveValue(
      'Explain the request, storage, and delivery path in one pass.'
    );
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

  it('should render a diagram preview with sections, planned nodes, connectors, warnings, and presentation brief details', async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText('Workflow'), {
      target: { value: 'generate-diagram' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Messaging App Backend/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }));

    await waitFor(() => {
      expect(screen.getByText(/Preview ready/i)).toBeInTheDocument();
      expect(screen.getByText('Diagram plan')).toBeInTheDocument();
      expect(screen.getByText('Presentation brief')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Warnings' })).toBeInTheDocument();
      expect(screen.getByText('Messaging App Backend Architecture')).toBeInTheDocument();
      expect(screen.getByText('Core Services')).toBeInTheDocument();
      expect(screen.getByText('Web / Mobile Clients')).toBeInTheDocument();
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText(/Realtime websocket infrastructure is summarized/i)).toBeInTheDocument();
      expect(screen.getByText(/Product and engineering stakeholders/i)).toBeInTheDocument();
    });
  });

  it('should show empty-state messaging for missing presentation sections in generation preview', async () => {
    const fakeProposal: AgentGenerationProposal = {
      kind: 'generation',
      workflow: 'generate-diagram',
      summary: 'Drafted a minimal diagram.',
      confidence: 'medium',
      sections: [],
      actions: [],
      presentationBrief: {
        title: 'Minimal draft',
        objective: 'Outline the bare structure.',
        audience: 'Internal team',
        summary: 'This draft intentionally omits detail.',
        narrativeSteps: [],
        speakerNotes: [],
        assumptions: [],
        openQuestions: [],
      },
      warnings: [],
    };

    const fakeOrchestrator = {
      run: vi.fn().mockResolvedValue({
        providerId: 'fake-provider',
        request: {} as never,
        proposal: fakeProposal,
      }),
    } as unknown as AgentOrchestrator;

    renderPanel({ orchestrator: fakeOrchestrator });

    fireEvent.change(screen.getByLabelText('Workflow'), {
      target: { value: 'generate-diagram' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }));

    await waitFor(() => {
      expect(screen.getByText('No narrative order was provided.')).toBeInTheDocument();
      expect(screen.getByText('No speaker notes were provided.')).toBeInTheDocument();
      expect(screen.getByText('No assumptions were included.')).toBeInTheDocument();
      expect(screen.getByText('No open questions were included.')).toBeInTheDocument();
      expect(screen.getByText('No warnings were returned for this draft.')).toBeInTheDocument();
    });
  });

  it('should apply a generated diagram draft from preview and close the panel on success', async () => {
    const onClose = vi.fn();
    const onApplyGenerationProposal = vi.fn(() => ({ success: true, error: null }));

    renderPanel({ onApplyGenerationProposal, onClose });

    fireEvent.change(screen.getByLabelText('Workflow'), {
      target: { value: 'generate-diagram' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Messaging App Backend/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply to board' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply to board' }));

    await waitFor(() => {
      expect(onApplyGenerationProposal).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('should keep the preview open and show an apply error when the draft cannot be applied', async () => {
    const onClose = vi.fn();
    const onApplyGenerationProposal = vi.fn(() => ({
      success: false,
      error: 'Connector target is missing.',
    }));

    renderPanel({ onApplyGenerationProposal, onClose });

    fireEvent.change(screen.getByLabelText('Workflow'), {
      target: { value: 'generate-diagram' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Messaging App Backend/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate draft' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Apply to board' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply to board' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Connector target is missing.');
    });

    expect(onClose).not.toHaveBeenCalled();
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
