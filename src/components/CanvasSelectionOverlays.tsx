interface ScreenFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface CanvasSelectionOverlaysProps {
  multiSelectionFrame: ScreenFrame | null;
  marqueeScreenFrame: ScreenFrame | null;
  showMultiSelectionFrame: boolean;
}

export function CanvasSelectionOverlays({
  multiSelectionFrame,
  marqueeScreenFrame,
  showMultiSelectionFrame,
}: CanvasSelectionOverlaysProps) {
  return (
    <>
      {multiSelectionFrame && showMultiSelectionFrame && (
        <div
          aria-hidden="true"
          data-testid="multi-selection-frame"
          style={{
            position: 'absolute',
            left: `${multiSelectionFrame.left}px`,
            top: `${multiSelectionFrame.top}px`,
            width: `${multiSelectionFrame.width}px`,
            height: `${multiSelectionFrame.height}px`,
            border: '1px dashed rgba(37, 99, 235, 0.92)',
            borderRadius: '6px',
            background: 'rgba(37, 99, 235, 0.04)',
            boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.78) inset',
            pointerEvents: 'none',
            zIndex: 15,
          }}
        />
      )}

      {marqueeScreenFrame && (
        <div
          aria-hidden="true"
          data-testid="marquee-selection"
          style={{
            position: 'absolute',
            left: `${marqueeScreenFrame.left}px`,
            top: `${marqueeScreenFrame.top}px`,
            width: `${marqueeScreenFrame.width}px`,
            height: `${marqueeScreenFrame.height}px`,
            border: '1px dashed rgba(37, 99, 235, 0.88)',
            borderRadius: '6px',
            background: 'rgba(37, 99, 235, 0.12)',
            pointerEvents: 'none',
            zIndex: 16,
          }}
        />
      )}
    </>
  );
}
