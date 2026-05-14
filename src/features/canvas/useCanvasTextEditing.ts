import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
} from 'react';
import { getTextShapeTypography } from '../../document/textStyle';
import type { Shape } from '../../types';
import { measureTextEditBounds } from './textMeasurement';

interface TextMeasurementRef {
  current: {
    measureTextWidth: (text: string, font: string) => number;
  } | null;
}

export interface UseCanvasTextEditingOptions {
  editingTextId: string | null;
  shapes: Shape[];
  measurementRef: TextMeasurementRef;
  onShapeDelete: (id: string) => void;
  onShapeUpdate: (id: string, updates: Partial<Shape>) => void;
  onTextEditCancel: () => void;
  onTextEditCommit: () => void;
}

export interface UseCanvasTextEditingResult {
  editingShape: Extract<Shape, { type: 'text' }> | null;
  editingTypography: ReturnType<typeof getTextShapeTypography> | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  handleTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  handleTextKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
}

export function useCanvasTextEditing({
  editingTextId,
  shapes,
  measurementRef,
  onShapeDelete,
  onShapeUpdate,
  onTextEditCancel,
  onTextEditCommit,
}: UseCanvasTextEditingOptions): UseCanvasTextEditingResult {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const originalTextRef = useRef('');
  const originalTextShapeIdRef = useRef<string | null>(null);

  const editingShape = useMemo(() => {
    if (!editingTextId) return null;
    const shape = shapes.find((candidate) => candidate.id === editingTextId);
    if (shape && shape.type === 'text') {
      return shape;
    }
    return null;
  }, [editingTextId, shapes]);

  const editingTypography = useMemo(
    () => (editingShape ? getTextShapeTypography(editingShape) : null),
    [editingShape]
  );

  useEffect(() => {
    if (!editingTextId || !editingShape) {
      originalTextRef.current = '';
      originalTextShapeIdRef.current = null;
      return;
    }

    if (originalTextShapeIdRef.current !== editingTextId) {
      originalTextRef.current = editingShape.text;
      originalTextShapeIdRef.current = editingTextId;
    }
  }, [editingShape, editingTextId]);

  const commitTextEdit = useCallback((): void => {
    if (!editingShape) return;

    const trimmedText = editingShape.text.trim();

    if (trimmedText === '') {
      onShapeDelete(editingShape.id);
    }

    onTextEditCommit();
  }, [editingShape, onShapeDelete, onTextEditCommit]);

  const cancelTextEdit = useCallback((): void => {
    if (!editingShape) return;

    onShapeUpdate(editingShape.id, {
      text: originalTextRef.current,
    });

    onTextEditCancel();
  }, [editingShape, onShapeUpdate, onTextEditCancel]);

  const handleTextKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
      event.stopPropagation();

      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        commitTextEdit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelTextEdit();
      }
    },
    [cancelTextEdit, commitTextEdit]
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      if (!editingShape || !editingTypography || !measurementRef.current) return;

      const newText = event.target.value;
      const nextBounds = measureTextEditBounds(
        newText,
        editingShape.bounds,
        editingTypography,
        (line, font) => measurementRef.current?.measureTextWidth(line, font) ?? 0
      );

      onShapeUpdate(editingShape.id, {
        text: newText,
        bounds: nextBounds,
      });
    },
    [editingShape, editingTypography, measurementRef, onShapeUpdate]
  );

  return {
    editingShape,
    editingTypography,
    textareaRef,
    handleTextChange,
    handleTextKeyDown,
  };
}
