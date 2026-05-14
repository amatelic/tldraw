import { useMemo } from 'react';
import type { CameraState } from '../types';
import './CanvasRulers.css';

interface CanvasRulersProps {
  camera: CameraState;
  width: number;
  height: number;
}

export function CanvasRulers({ camera, width, height }: CanvasRulersProps): React.JSX.Element {
  const { zoom, x: cameraX, y: cameraY } = camera;

  const horizontalTicks = useMemo(() => {
    const ticks: { x: number; label?: string }[] = [];
    const step = zoom >= 1 ? 100 : zoom >= 0.5 ? 200 : 500;
    const startX = Math.floor((-cameraX) / step) * step;
    const endX = startX + width / zoom + step;

    for (let x = startX; x <= endX; x += step) {
      ticks.push({ x, label: x.toString() });
    }
    return ticks;
  }, [cameraX, width, zoom]);

  const verticalTicks = useMemo(() => {
    const ticks: { y: number; label?: string }[] = [];
    const step = zoom >= 1 ? 100 : zoom >= 0.5 ? 200 : 500;
    const startY = Math.floor((-cameraY) / step) * step;
    const endY = startY + height / zoom + step;

    for (let y = startY; y <= endY; y += step) {
      ticks.push({ y, label: y.toString() });
    }
    return ticks;
  }, [cameraY, height, zoom]);

  return (
    <>
      <div className="canvas-ruler horizontal">
        <div className="canvas-ruler-track" style={{ transform: `translateX(${-cameraX * zoom}px)` }}>
          {horizontalTicks.map((tick) => (
            <div
              key={`h-${tick.x}`}
              className="canvas-ruler-tick"
              style={{ left: `${tick.x * zoom}px` }}
            >
              <span className="canvas-ruler-label">{tick.label}</span>
              <div className="canvas-ruler-mark" />
            </div>
          ))}
        </div>
      </div>

      <div className="canvas-ruler vertical">
        <div className="canvas-ruler-track" style={{ transform: `translateY(${-cameraY * zoom}px)` }}>
          {verticalTicks.map((tick) => (
            <div
              key={`v-${tick.y}`}
              className="canvas-ruler-tick"
              style={{ top: `${tick.y * zoom}px` }}
            >
              <span className="canvas-ruler-label">{tick.label}</span>
              <div className="canvas-ruler-mark" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
