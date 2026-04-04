import { useCallback, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCanvas } from './hooks/useCanvas';
import { useKeyboard } from './hooks/useKeyboard';
import { Toolbar } from './components/Toolbar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ZoomControls } from './components/ZoomControls';
import { Canvas } from './components/Canvas';
import { WorkspaceTabs } from './components/WorkspaceTabs';
import { ImageUploadDialog } from './components/ImageUploadDialog';
import { AudioUploadDialog } from './components/AudioUploadDialog';
import { useWorkspaceStore } from './stores/workspaceStore';
import type { ToolType, Shape, ShapeStyle } from './types';
import { createShapeId } from './types';
import './App.css';

const MAX_WORKSPACES = 10;

function App() {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const workspaceStore = useWorkspaceStore();

  // Initialize with default workspace if none exists
  useEffect(() => {
    if (workspaceStore.workspaces.length === 0) {
      workspaceStore.addWorkspace(); // Creates "Workspace 1"
    }
  }, []);

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
  } = useCanvas(activeWorkspace.id);

  // Check if any selected shape is text
  const hasTextSelection = shapes.some(
    (s) => editorState.selectedShapeIds.includes(s.id) && s.type === 'text'
  );

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

  const handleImageAdd = useCallback(
    (src: string, isBase64: boolean, width: number, height: number, style: ShapeStyle) => {
      // Calculate size maintaining aspect ratio, max 300px width
      const maxWidth = 300;
      const scale = Math.min(1, maxWidth / width);
      const newWidth = width * scale;
      const newHeight = height * scale;

      const shape: Shape = {
        id: createShapeId(),
        type: 'image',
        bounds: {
          x: 100,
          y: 100,
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
    [addShape, setEditorState]
  );

  const handleAudioAdd = useCallback(
    (
      src: string,
      isBase64: boolean,
      duration: number,
      waveformData: number[],
      style: ShapeStyle
    ) => {
      const shape: Shape = {
        id: createShapeId(),
        type: 'audio',
        bounds: {
          x: 100,
          y: 100,
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
    [addShape, setEditorState]
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

  // Use centralized keyboard management
  useKeyboard({
    undo,
    redo,
    deleteSelected: deleteSelectedShapes,
    clearSelection,
    setTool: handleToolChange,
  });

  return (
    <div className="app">
      <header className="app-header">
        <h1>TLDraw Clone</h1>
        <div className="header-actions">
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

          <WorkspaceTabs
            workspaces={workspaceStore.workspaces}
            activeId={workspaceStore.activeWorkspaceId}
            onSwitch={workspaceStore.switchWorkspace}
            onAdd={handleAddWorkspace}
            onDelete={handleDeleteWorkspace}
            onRename={handleRenameWorkspace}
            maxWorkspaces={MAX_WORKSPACES}
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
                hasTextSelection={hasTextSelection}
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
    </div>
  );
}

export default App;
