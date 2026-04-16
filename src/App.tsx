import { useCallback, useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useCanvas } from './hooks/useCanvas';
import { useKeyboard } from './hooks/useKeyboard';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ZoomControls } from './components/ZoomControls';
import { Canvas } from './components/Canvas';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { ImageUploadDialog } from './components/ImageUploadDialog';
import { AudioUploadDialog } from './components/AudioUploadDialog';
import { EmbedDialog } from './components/EmbedDialog';
import { AgentPanel } from './components/AgentPanel';
import { AgentOrchestrator } from './agents/agentOrchestrator';
import { ReviewModeProvider } from './agents/providers/reviewModeProvider';
import { useElementSize } from './hooks/useElementSize';
import { useWorkspaceStore } from './stores/workspaceStore';
import type { Bounds, ToolType, Shape, ShapeStyle } from './types';
import { createShapeId, getGroupBounds } from './types';
import './App.css';

const MAX_WORKSPACES = 10;

function App() {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);
  const [agentOrchestrator] = useState(() => new AgentOrchestrator([new ReviewModeProvider()]));
  const workspaceStore = useWorkspaceStore();
  const hasInitializedWorkspaceRef = useRef(false);

  // Initialize with default workspace if none exists
  useEffect(() => {
    if (hasInitializedWorkspaceRef.current) return;
    hasInitializedWorkspaceRef.current = true;

    if (workspaceStore.workspaces.length === 0) {
      workspaceStore.addWorkspace(); // Creates "Workspace 1"
    }
  }, [workspaceStore]);

  const activeWorkspace = workspaceStore.getActiveWorkspace();

  const {
    canvasRef,
    shapes,
    editorState,
    setEditorState,
    addShape,
    updateShape,
    deleteShape,
    deleteSelectedShapes,
    selectShapes,
    clearSelection,
    screenToWorld,
    worldToScreen,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomAt,
    pan,
    updateShapeStyle,
    undo,
    redo,
    canUndo,
    canRedo,
    startTextEdit,
    commitTextEdit,
    cancelTextEdit,
    groupShapes,
    ungroupShapes,
  } = useCanvas(activeWorkspace.id);
  const canvasSize = useElementSize(canvasRef);
  const agentViewport =
    canvasSize.width > 0 && canvasSize.height > 0
      ? { width: canvasSize.width, height: canvasSize.height }
      : null;

  // Check if any selected shape is text
  const hasTextSelection = shapes.some(
    (s) => editorState.selectedShapeIds.includes(s.id) && s.type === 'text'
  );

  const selectedShapes = shapes.filter((shape) => editorState.selectedShapeIds.includes(shape.id));

  const selectedLayoutBounds: Bounds | null =
    selectedShapes.length === 0
      ? null
      : selectedShapes.reduce<Bounds | null>((accumulator, shape) => {
          const shapeBounds =
            shape.type === 'group' ? getGroupBounds(shape.id, shapes) ?? shape.bounds : shape.bounds;

          if (!accumulator) {
            return { ...shapeBounds };
          }

          const minX = Math.min(accumulator.x, shapeBounds.x);
          const minY = Math.min(accumulator.y, shapeBounds.y);
          const maxX = Math.max(accumulator.x + accumulator.width, shapeBounds.x + shapeBounds.width);
          const maxY = Math.max(accumulator.y + accumulator.height, shapeBounds.y + shapeBounds.height);

          return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          };
        }, null);

  const handleToolChange = useCallback(
    (tool: ToolType) => {
      if (tool === 'image') {
        setShowImageDialog(true);
        return;
      }
      if (tool === 'audio') {
        setShowAudioDialog(true);
        return;
      }
      if (tool === 'embed') {
        setShowEmbedDialog(true);
        return;
      }

      setEditorState((prev) => ({ ...prev, tool }));
      if (tool !== 'select') {
        clearSelection();
      }
    },
    [clearSelection, setEditorState]
  );

  const handleDraggingChange = useCallback(
    (isDragging: boolean) => {
      setEditorState((prev) => ({ ...prev, isDragging }));
    },
    [setEditorState]
  );

  const handleDrawingChange = useCallback(
    (isDrawing: boolean) => {
      setEditorState((prev) => ({ ...prev, isDrawing }));
    },
    [setEditorState]
  );

  const getViewportCenter = useCallback((): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 100, y: 100 };
    const rect = canvas.getBoundingClientRect();
    return screenToWorld({ x: rect.width / 2, y: rect.height / 2 });
  }, [canvasRef, screenToWorld]);

  const handleImageAdd = useCallback(
    (src: string, isBase64: boolean, width: number, height: number, style: ShapeStyle) => {
      const maxWidth = 300;
      const scale = Math.min(1, maxWidth / width);
      const newWidth = width * scale;
      const newHeight = height * scale;
      const center = getViewportCenter();

      const shape: Shape = {
        id: createShapeId(),
        type: 'image',
        bounds: {
          x: center.x - newWidth / 2,
          y: center.y - newHeight / 2,
          width: newWidth,
          height: newHeight,
        },
        src,
        originalWidth: width,
        originalHeight: height,
        isBase64,
        style: { ...style },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      addShape(shape);
      setEditorState((prev) => ({ ...prev, tool: 'select' }));
    },
    [addShape, setEditorState, getViewportCenter]
  );

  const handleAudioAdd = useCallback(
    (
      src: string,
      isBase64: boolean,
      duration: number,
      waveformData: number[],
      style: ShapeStyle
    ) => {
      const center = getViewportCenter();
      const shape: Shape = {
        id: createShapeId(),
        type: 'audio',
        bounds: {
          x: center.x - 150,
          y: center.y - 40,
          width: 300,
          height: 80,
        },
        src,
        duration,
        isPlaying: false,
        waveformData,
        isBase64,
        loop: false,
        style: { ...style },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      addShape(shape);
      setEditorState((prev) => ({ ...prev, tool: 'select' }));
    },
    [addShape, setEditorState, getViewportCenter]
  );

  const handleEmbedAdd = useCallback(
    (
      url: string,
      embedType: 'youtube' | 'website',
      embedSrc: string,
      shapeStyle: ShapeStyle
    ) => {
      const center = getViewportCenter();
      const shape: Shape = {
        id: createShapeId(),
        type: 'embed',
        bounds: {
          x: center.x - 240,
          y: center.y - 135,
          width: 480,
          height: 270,
        },
        url,
        embedType,
        embedSrc,
        style: { ...shapeStyle },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      addShape(shape);
      setEditorState((prev) => ({ ...prev, tool: 'select' }));
    },
    [addShape, setEditorState, getViewportCenter]
  );

  const handleAddWorkspace = useCallback(() => {
    if (workspaceStore.workspaces.length < MAX_WORKSPACES) {
      workspaceStore.addWorkspace();
    }
  }, [workspaceStore]);

  const handleDeleteWorkspace = useCallback(
    (id: string) => {
      workspaceStore.deleteWorkspace(id);
    },
    [workspaceStore]
  );

  const handleRenameWorkspace = useCallback(
    (id: string, name: string) => {
      workspaceStore.renameWorkspace(id, name);
    },
    [workspaceStore]
  );

  // Grouping helper functions
  const handleGroupSelected = useCallback(() => {
    if (editorState.selectedShapeIds.length >= 2) {
      groupShapes(editorState.selectedShapeIds);
    }
  }, [groupShapes, editorState.selectedShapeIds]);

  const handleUngroupSelected = useCallback(() => {
    // Check if any selected shape is a group
    const selectedGroups = editorState.selectedShapeIds.filter((id) => {
      const shape = shapes.find((s) => s.id === id);
      return shape?.type === 'group';
    });
    
    // Ungroup the first selected group
    if (selectedGroups.length > 0) {
      ungroupShapes(selectedGroups[0]);
    }
  }, [ungroupShapes, editorState.selectedShapeIds, shapes]);

  // Alignment handler
  const handleAlign = useCallback(
    (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      const selectedShapes = shapes.filter((s) =>
        editorState.selectedShapeIds.includes(s.id)
      );

      if (selectedShapes.length < 2) return;

      const bounds = selectedShapes.map((s) => s.bounds);

      let targetValue: number;

      switch (alignment) {
        case 'left':
          targetValue = Math.min(...bounds.map((b) => b.x));
          selectedShapes.forEach((shape) => {
            updateShape(shape.id, {
              bounds: {
                ...shape.bounds,
                x: targetValue,
              },
            });
          });
          break;

        case 'center': {
          const centers = bounds.map((b) => b.x + b.width / 2);
          targetValue = centers.reduce((a, b) => a + b, 0) / centers.length;
          selectedShapes.forEach((shape) => {
            updateShape(shape.id, {
              bounds: {
                ...shape.bounds,
                x: targetValue - shape.bounds.width / 2,
              },
            });
          });
          break;
        }

        case 'right':
          targetValue = Math.max(...bounds.map((b) => b.x + b.width));
          selectedShapes.forEach((shape) => {
            updateShape(shape.id, {
              bounds: {
                ...shape.bounds,
                x: targetValue - shape.bounds.width,
              },
            });
          });
          break;

        case 'top':
          targetValue = Math.min(...bounds.map((b) => b.y));
          selectedShapes.forEach((shape) => {
            updateShape(shape.id, {
              bounds: {
                ...shape.bounds,
                y: targetValue,
              },
            });
          });
          break;

        case 'middle': {
          const centers = bounds.map((b) => b.y + b.height / 2);
          targetValue = centers.reduce((a, b) => a + b, 0) / centers.length;
          selectedShapes.forEach((shape) => {
            updateShape(shape.id, {
              bounds: {
                ...shape.bounds,
                y: targetValue - shape.bounds.height / 2,
              },
            });
          });
          break;
        }

        case 'bottom':
          targetValue = Math.max(...bounds.map((b) => b.y + b.height));
          selectedShapes.forEach((shape) => {
            updateShape(shape.id, {
              bounds: {
                ...shape.bounds,
                y: targetValue - shape.bounds.height,
              },
            });
          });
          break;
      }
    },
    [shapes, editorState.selectedShapeIds, updateShape]
  );

  // Distribute handler
  const handleDistribute = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      const selectedShapes = shapes.filter((s) =>
        editorState.selectedShapeIds.includes(s.id)
      );

      if (selectedShapes.length < 3) return;

      if (direction === 'horizontal') {
        const sorted = [...selectedShapes].sort((a, b) => a.bounds.x - b.bounds.x);
        const leftmost = sorted[0].bounds.x;
        const rightmost = sorted[sorted.length - 1].bounds.x + sorted[sorted.length - 1].bounds.width;
        const totalWidth = rightmost - leftmost;
        const totalShapesWidth = sorted.reduce((sum, s) => sum + s.bounds.width, 0);
        const gap = (totalWidth - totalShapesWidth) / (sorted.length - 1);

        let currentX = leftmost;
        sorted.forEach((shape) => {
          updateShape(shape.id, {
            bounds: {
              ...shape.bounds,
              x: currentX,
            },
          });
          currentX += shape.bounds.width + gap;
        });
      } else {
        const sorted = [...selectedShapes].sort((a, b) => a.bounds.y - b.bounds.y);
        const topmost = sorted[0].bounds.y;
        const bottommost = sorted[sorted.length - 1].bounds.y + sorted[sorted.length - 1].bounds.height;
        const totalHeight = bottommost - topmost;
        const totalShapesHeight = sorted.reduce((sum, s) => sum + s.bounds.height, 0);
        const gap = (totalHeight - totalShapesHeight) / (sorted.length - 1);

        let currentY = topmost;
        sorted.forEach((shape) => {
          updateShape(shape.id, {
            bounds: {
              ...shape.bounds,
              y: currentY,
            },
          });
          currentY += shape.bounds.height + gap;
        });
      }
    },
    [shapes, editorState.selectedShapeIds, updateShape]
  );

  // Tidy handler - arranges shapes in a grid layout
  const handleTidy = useCallback(() => {
    const selectedShapes = shapes.filter((s) =>
      editorState.selectedShapeIds.includes(s.id)
    );

    if (selectedShapes.length < 2) return;

    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(selectedShapes.length));
    const spacing = 20;

    // Find the average position to center the grid
    const avgX =
      selectedShapes.reduce((sum, s) => sum + s.bounds.x, 0) /
      selectedShapes.length;
    const avgY =
      selectedShapes.reduce((sum, s) => sum + s.bounds.y, 0) /
      selectedShapes.length;

    // Calculate total grid size
    const maxWidth = Math.max(...selectedShapes.map((s) => s.bounds.width));
    const maxHeight = Math.max(...selectedShapes.map((s) => s.bounds.height));
    const gridWidth = cols * maxWidth + (cols - 1) * spacing;
    const rows = Math.ceil(selectedShapes.length / cols);
    const gridHeight = rows * maxHeight + (rows - 1) * spacing;

    // Start position to center the grid around the average position
    const startX = avgX - gridWidth / 2;
    const startY = avgY - gridHeight / 2;

    // Sort shapes by their current position for a more predictable arrangement
    const sortedShapes = [...selectedShapes].sort((a, b) => {
      if (Math.abs(a.bounds.y - b.bounds.y) < 50) {
        return a.bounds.x - b.bounds.x;
      }
      return a.bounds.y - b.bounds.y;
    });

    // Arrange in grid
    sortedShapes.forEach((shape, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const newX = startX + col * (maxWidth + spacing) + (maxWidth - shape.bounds.width) / 2;
      const newY = startY + row * (maxHeight + spacing) + (maxHeight - shape.bounds.height) / 2;

      updateShape(shape.id, {
        bounds: {
          ...shape.bounds,
          x: newX,
          y: newY,
        },
      });
    });
  }, [shapes, editorState.selectedShapeIds, updateShape]);

  // Use centralized keyboard management
  useKeyboard({
    undo,
    redo,
    deleteSelected: deleteSelectedShapes,
    clearSelection,
    setTool: handleToolChange,
    groupSelected: handleGroupSelected,
    ungroupSelected: handleUngroupSelected,
  });

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-body">
          <WorkspaceTabs
            workspaces={workspaceStore.workspaces}
            activeId={workspaceStore.activeWorkspaceId}
            onSwitch={workspaceStore.switchWorkspace}
            onAdd={handleAddWorkspace}
            onDelete={handleDeleteWorkspace}
            onRename={handleRenameWorkspace}
            maxWorkspaces={MAX_WORKSPACES}
          />

          <div className="header-actions">
            <button
              className="action-button"
              onClick={() => setIsAgentPanelOpen(true)}
              title="Open Agent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l7 4v5c0 4.97-3.05 8.98-7 10-3.95-1.02-7-5.03-7-10V7l7-4z" />
                <path d="M9.5 11.5a2.5 2.5 0 015 0c0 1.4-1.1 1.94-1.9 2.47-.52.34-.85.64-.85 1.03" />
                <circle cx="12" cy="17.5" r=".5" fill="currentColor" stroke="none" />
              </svg>
              Agents
            </button>
            <button
              className="action-button"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6M3 13c0-4.97 4.03-9 9-9 4.97 0 9 4.03 9 9s-4.03 9-9 9c-2.39 0-4.68-.94-6.36-2.64L3 13" />
              </svg>
              Undo
            </button>
            <button
              className="action-button"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6M21 13c0-4.97-4.03-9-9-9-4.97 0-9 4.03-9 9s4.03 9 9 9c2.39 0 4.68-.94 6.36-2.64L21 13" />
              </svg>
              Redo
            </button>
            <button
              className="action-button delete"
              onClick={deleteSelectedShapes}
              disabled={editorState.selectedShapeIds.length === 0}
              title="Delete Selected (Delete)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Toolbar currentTool={editorState.tool} onToolChange={handleToolChange} />

        <div className="canvas-container">
          <Canvas
            canvasRef={canvasRef}
            shapes={shapes}
            selectedIds={editorState.selectedShapeIds}
            tool={editorState.tool}
            style={editorState.shapeStyle}
            camera={editorState.camera}
            isDragging={editorState.isDragging}
            isDrawing={editorState.isDrawing}
            editingTextId={editorState.editingTextId}
            onShapeAdd={addShape}
            onShapeUpdate={updateShape}
            onShapeDelete={deleteShape}
            onSelectionChange={selectShapes}
            onDraggingChange={handleDraggingChange}
            onDrawingChange={handleDrawingChange}
            onPan={pan}
            onZoomAt={zoomAt}
            screenToWorld={screenToWorld}
            worldToScreen={worldToScreen}
            onTextEditStart={startTextEdit}
            onTextEditCommit={commitTextEdit}
            onTextEditCancel={cancelTextEdit}
          />

          <ZoomControls
            zoom={editorState.camera.zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetZoom}
          />
        </div>

        <AnimatePresence mode="popLayout">
          {editorState.selectedShapeIds.length > 0 && (
            <motion.div
              initial={{ x: 240, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 240, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                mass: 1,
              }}
              className="properties-panel-wrapper"
            >
              <PropertiesPanel
                style={editorState.shapeStyle}
                onChange={updateShapeStyle}
                layoutBounds={selectedLayoutBounds}
                hasTextSelection={hasTextSelection}
                onAlign={handleAlign}
                onDistribute={handleDistribute}
                onTidy={handleTidy}
                selectedCount={editorState.selectedShapeIds.length}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ImageUploadDialog
        isOpen={showImageDialog}
        onClose={() => setShowImageDialog(false)}
        onImageAdd={handleImageAdd}
        style={editorState.shapeStyle}
      />

      <AudioUploadDialog
        isOpen={showAudioDialog}
        onClose={() => setShowAudioDialog(false)}
        onAudioAdd={handleAudioAdd}
        style={editorState.shapeStyle}
      />

      <EmbedDialog
        isOpen={showEmbedDialog}
        onClose={() => setShowEmbedDialog(false)}
        onEmbedAdd={handleEmbedAdd}
        style={editorState.shapeStyle}
      />

      {isAgentPanelOpen && (
        <AgentPanel
          isOpen={isAgentPanelOpen}
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          shapes={shapes}
          editorState={{
            camera: editorState.camera,
            selectedShapeIds: editorState.selectedShapeIds,
          }}
          viewport={agentViewport}
          orchestrator={agentOrchestrator}
          onClose={() => setIsAgentPanelOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
