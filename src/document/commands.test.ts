import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from '../types';
import type { EditorState, Shape } from '../types';
import type { AgentGenerationProposal, AgentMutationProposal } from '../types/agents';
import {
  alignShapesInDocument,
  applyGeneratedDiagramToDocument,
  applyMutationProposalToDocument,
  bringShapesToFrontInDocument,
  distributeShapesInDocument,
  groupShapesInDocument,
  tidyShapesInDocument,
  ungroupShapesInDocument,
  updateSelectedShapeStyleInDocument,
  updateShapeBoundsInDocument,
} from './commands';
import type { DocumentCommandState } from './commands';

const defaultEditorState: EditorState = {
  tool: 'select',
  selectedShapeIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  isDragging: false,
  isDrawing: false,
  shapeStyle: { ...DEFAULT_STYLE },
  editingTextId: null,
};

function createState(shapes: Shape[] = [], selectedShapeIds: string[] = []): DocumentCommandState {
  return {
    shapes,
    editorState: {
      ...defaultEditorState,
      selectedShapeIds,
    },
  };
}

function createRectangle(id: string, x: number, y: number, width: number = 80, height: number = 60): Shape {
  return {
    id,
    type: 'rectangle',
    bounds: { x, y, width, height },
    style: { ...DEFAULT_STYLE },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createCircle(id: string, x: number, y: number, width: number = 80, height: number = 80): Shape {
  return {
    id,
    type: 'circle',
    bounds: { x, y, width, height },
    center: {
      x: x + width / 2,
      y: y + height / 2,
    },
    radius: Math.min(width, height) / 2,
    style: { ...DEFAULT_STYLE },
    createdAt: 1,
    updatedAt: 1,
  };
}

function createText(id: string, text: string): Shape {
  return {
    id,
    type: 'text',
    bounds: { x: 0, y: 0, width: 200, height: 40 },
    text,
    fontSize: 16,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    style: { ...DEFAULT_STYLE },
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('document commands', () => {
  it('keeps circle center and radius in sync when bounds change', () => {
    const initialState = createState([createCircle('circle-1', 20, 40)]);

    const nextState = updateShapeBoundsInDocument(
      initialState,
      'circle-1',
      { x: 100, y: 120, width: 60, height: 60 },
      99
    );

    expect(nextState.shapes[0]).toMatchObject({
      bounds: { x: 100, y: 120, width: 60, height: 60 },
      center: { x: 130, y: 150 },
      radius: 30,
      updatedAt: 99,
    });
  });

  it('groups and ungroups shapes while updating parent relationships and selection', () => {
    const initialState = createState([
      createRectangle('shape-1', 0, 0),
      createRectangle('shape-2', 140, 60),
    ]);

    const groupedState = groupShapesInDocument(initialState, ['shape-1', 'shape-2'], 10);
    const group = groupedState.shapes.find((shape) => shape.type === 'group');

    expect(group).toBeDefined();
    expect(groupedState.editorState.selectedShapeIds).toEqual([group!.id]);
    expect(groupedState.shapes.find((shape) => shape.id === 'shape-1')).toMatchObject({
      parentId: group!.id,
    });

    const ungroupedState = ungroupShapesInDocument(groupedState, group!.id);

    expect(ungroupedState.shapes.find((shape) => shape.id === group!.id)).toBeUndefined();
    expect(ungroupedState.shapes.find((shape) => shape.id === 'shape-1')).toMatchObject({
      parentId: undefined,
    });
    expect(ungroupedState.editorState.selectedShapeIds).toEqual(['shape-1', 'shape-2']);
  });

  it('moves a grouped stack to the front without splitting descendants away from the group', () => {
    const groupedState = groupShapesInDocument(
      createState([
        createRectangle('shape-1', 0, 0),
        createRectangle('shape-2', 140, 0),
        createRectangle('shape-3', 280, 0),
      ]),
      ['shape-1', 'shape-2'],
      10
    );
    const group = groupedState.shapes.find((shape) => shape.type === 'group');

    const reorderedState = bringShapesToFrontInDocument(groupedState, [group!.id]);

    expect(reorderedState.shapes.map((shape) => shape.id)).toEqual([
      'shape-3',
      'shape-1',
      'shape-2',
      group!.id,
    ]);
  });

  it('aligns, distributes, and tidies shapes through pure command helpers', () => {
    const alignedState = alignShapesInDocument(
      createState([
        createRectangle('shape-1', 40, 20),
        createRectangle('shape-2', 180, 80),
        createRectangle('shape-3', 320, 140),
      ]),
      ['shape-1', 'shape-2', 'shape-3'],
      'left',
      11
    );

    expect(alignedState.shapes.map((shape) => shape.bounds.x)).toEqual([40, 40, 40]);

    const distributedState = distributeShapesInDocument(
      createState([
        createRectangle('shape-1', 0, 0, 50, 40),
        createRectangle('shape-2', 100, 0, 50, 40),
        createRectangle('shape-3', 300, 0, 50, 40),
      ]),
      ['shape-1', 'shape-2', 'shape-3'],
      'horizontal',
      12
    );

    expect(distributedState.shapes.map((shape) => shape.bounds.x)).toEqual([0, 150, 300]);

    const tidiedState = tidyShapesInDocument(
      createState([
        createRectangle('shape-1', 0, 0, 40, 40),
        createRectangle('shape-2', 200, 0, 40, 40),
        createRectangle('shape-3', 400, 0, 40, 40),
      ]),
      ['shape-1', 'shape-2', 'shape-3'],
      13
    );

    expect(tidiedState.shapes.map((shape) => shape.bounds)).toEqual([
      { x: 150, y: -50, width: 40, height: 40 },
      { x: 210, y: -50, width: 40, height: 40 },
      { x: 150, y: 10, width: 40, height: 40 },
    ]);
  });

  it('moves grouped descendants as a block when aligning a selected group', () => {
    const groupedState = groupShapesInDocument(
      createState([
        createRectangle('shape-1', 100, 20, 50, 40),
        createRectangle('shape-2', 170, 20, 50, 40),
        createRectangle('shape-3', 20, 120, 50, 40),
      ]),
      ['shape-1', 'shape-2'],
      10
    );
    const group = groupedState.shapes.find((shape) => shape.type === 'group');

    const alignedState = alignShapesInDocument(groupedState, [group!.id, 'shape-3'], 'left', 20);

    expect(alignedState.shapes.find((shape) => shape.id === group!.id)?.bounds.x).toBe(20);
    expect(alignedState.shapes.find((shape) => shape.id === 'shape-1')?.bounds.x).toBe(20);
    expect(alignedState.shapes.find((shape) => shape.id === 'shape-2')?.bounds.x).toBe(90);
    expect(alignedState.shapes.find((shape) => shape.id === 'shape-3')?.bounds.x).toBe(20);
  });

  it('moves grouped descendants as a block when distributing a selected group', () => {
    const groupedState = groupShapesInDocument(
      createState([
        createRectangle('shape-1', 100, 20, 50, 40),
        createRectangle('shape-2', 170, 20, 50, 40),
        createRectangle('shape-3', 0, 120, 50, 40),
        createRectangle('shape-4', 400, 120, 50, 40),
      ]),
      ['shape-1', 'shape-2'],
      10
    );
    const group = groupedState.shapes.find((shape) => shape.type === 'group');

    const distributedState = distributeShapesInDocument(
      groupedState,
      ['shape-3', group!.id, 'shape-4'],
      'horizontal',
      20
    );

    expect(distributedState.shapes.find((shape) => shape.id === group!.id)?.bounds.x).toBe(165);
    expect(distributedState.shapes.find((shape) => shape.id === 'shape-1')?.bounds.x).toBe(165);
    expect(distributedState.shapes.find((shape) => shape.id === 'shape-2')?.bounds.x).toBe(235);
    expect(distributedState.shapes.find((shape) => shape.id === 'shape-3')?.bounds.x).toBe(0);
    expect(distributedState.shapes.find((shape) => shape.id === 'shape-4')?.bounds.x).toBe(400);
  });

  it('moves grouped descendants as a block when tidying a selected group', () => {
    const groupedState = groupShapesInDocument(
      createState([
        createRectangle('shape-1', 100, 20, 50, 40),
        createRectangle('shape-2', 170, 20, 50, 40),
        createRectangle('shape-3', 0, 120, 50, 40),
      ]),
      ['shape-1', 'shape-2'],
      10
    );
    const group = groupedState.shapes.find((shape) => shape.type === 'group');

    const tidiedState = tidyShapesInDocument(groupedState, [group!.id, 'shape-3'], 20);

    expect(tidiedState.shapes.find((shape) => shape.id === group!.id)?.bounds.x).toBe(-80);
    expect(tidiedState.shapes.find((shape) => shape.id === group!.id)?.bounds.y).toBe(50);
    expect(tidiedState.shapes.find((shape) => shape.id === 'shape-1')?.bounds.x).toBe(-80);
    expect(tidiedState.shapes.find((shape) => shape.id === 'shape-1')?.bounds.y).toBe(50);
    expect(tidiedState.shapes.find((shape) => shape.id === 'shape-2')?.bounds.x).toBe(-10);
    expect(tidiedState.shapes.find((shape) => shape.id === 'shape-3')?.bounds.x).toBe(95);
  });

  it('keeps text typography fields in sync when selected shape style updates are applied', () => {
    const nextState = updateSelectedShapeStyleInDocument(
      createState([createText('shape-1', 'Hello')], ['shape-1']),
      {
        fontSize: 22,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      },
      14
    );

    expect(nextState.shapes[0]).toMatchObject({
      fontSize: 22,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textAlign: 'center',
      style: {
        fontSize: 22,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textAlign: 'center',
      },
      updatedAt: 14,
    });
  });

  it('applies generated diagram actions and selects created ids', () => {
    const proposal: AgentGenerationProposal = {
      kind: 'generation',
      workflow: 'generate-diagram',
      summary: 'Draft',
      confidence: 'high',
      sections: [],
      warnings: [],
      presentationBrief: null,
      actions: [
        {
          type: 'create-shape',
          description: 'Create a rectangle node',
          shape: {
            id: 'generated-node-1',
            type: 'rectangle',
            bounds: { x: 40, y: 60, width: 140, height: 80 },
            text: 'Client',
          },
        },
      ],
    };

    const result = applyGeneratedDiagramToDocument(createState(), proposal, 20);

    expect(result.appliedShapeIds).toEqual(['generated-node-1', 'generated-node-1-label']);
    expect(result.state.shapes.map((shape) => shape.id)).toEqual([
      'generated-node-1',
      'generated-node-1-label',
    ]);
    expect(result.state.editorState.selectedShapeIds).toEqual([
      'generated-node-1',
      'generated-node-1-label',
    ]);
  });

  it('applies mutation proposals as one pure document update and keeps remaining ids selected', () => {
    const proposal: AgentMutationProposal = {
      kind: 'mutation',
      workflow: 'cleanup',
      summary: 'Cleanup',
      actions: [
        {
          type: 'update-shape',
          targetId: 'shape-1',
          description: 'Move the rectangle',
          changes: {
            bounds: { x: 40, y: 24 },
          },
        },
        {
          type: 'delete-shape',
          targetId: 'shape-2',
          description: 'Delete the empty text',
        },
      ],
    };

    const result = applyMutationProposalToDocument(
      createState([
        createRectangle('shape-1', 0, 32, 120, 80),
        createText('shape-2', ''),
      ]),
      proposal,
      30
    );

    expect(result.state.shapes.find((shape) => shape.id === 'shape-1')).toMatchObject({
      bounds: { x: 40, y: 24, width: 120, height: 80 },
      updatedAt: 30,
    });
    expect(result.state.shapes.some((shape) => shape.id === 'shape-2')).toBe(false);
    expect(result.appliedShapeIds).toEqual(['shape-1']);
    expect(result.state.editorState.selectedShapeIds).toEqual(['shape-1']);
  });
});
