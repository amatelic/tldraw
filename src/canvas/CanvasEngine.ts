import type {
  Shape,
  RectangleShape,
  CircleShape,
  LineShape,
  FreehandShape,
  Point,
  Bounds,
  CameraState,
  ShapeStyle,
  TextShape,
} from '../types';

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  clear() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
  }

  applyCamera(camera: CameraState) {
    this.ctx.save();
    this.ctx.translate(camera.x, camera.y);
    this.ctx.scale(camera.zoom, camera.zoom);
  }

  restoreCamera() {
    this.ctx.restore();
  }

  screenToWorld(point: Point, camera: CameraState): Point {
    return {
      x: (point.x - camera.x) / camera.zoom,
      y: (point.y - camera.y) / camera.zoom,
    };
  }

  worldToScreen(point: Point, camera: CameraState): Point {
    return {
      x: point.x * camera.zoom + camera.x,
      y: point.y * camera.zoom + camera.y,
    };
  }

  private setStrokeStyle(style: ShapeStyle) {
    this.ctx.strokeStyle = style.color;
    this.ctx.lineWidth = style.strokeWidth;
    this.ctx.globalAlpha = style.opacity;

    switch (style.strokeStyle) {
      case 'dashed':
        this.ctx.setLineDash([5, 5]);
        break;
      case 'dotted':
        this.ctx.setLineDash([2, 4]);
        break;
      default:
        this.ctx.setLineDash([]);
    }
  }

  private setFillStyle(style: ShapeStyle) {
    if (style.fillStyle === 'none') {
      this.ctx.fillStyle = 'transparent';
      return;
    }
    this.ctx.fillStyle = style.fillColor;
    this.ctx.globalAlpha = style.opacity * 0.3;
  }

  drawShape(shape: Shape, isSelected: boolean = false) {
    this.setStrokeStyle(shape.style);

    switch (shape.type) {
      case 'rectangle':
        this.drawRectangle(shape);
        break;
      case 'circle':
        this.drawCircle(shape);
        break;
      case 'line':
        this.drawLine(shape);
        break;
      case 'freehand':
        this.drawFreehand(shape);
        break;
      case 'image':
        this.drawImage(shape);
        break;
      case 'audio':
        this.drawAudio(shape);
        break;
      case 'text':
        this.drawText(shape);
        break;
    }

    if (isSelected) {
      this.drawSelectionIndicator(shape);
    }
  }

  private drawRectangle(shape: RectangleShape) {
    const { x, y, width, height } = shape.bounds;

    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);

    if (shape.style.fillStyle !== 'none') {
      this.setFillStyle(shape.style);
      this.ctx.fill();
    }

    this.ctx.stroke();
  }

  private drawCircle(shape: CircleShape) {
    this.ctx.beginPath();
    this.ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);

    if (shape.style.fillStyle !== 'none') {
      this.setFillStyle(shape.style);
      this.ctx.fill();
    }

    this.ctx.stroke();
  }

  private drawLine(shape: LineShape) {
    const { start, end } = shape;

    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }

  private drawFreehand(shape: FreehandShape) {
    const { points } = shape;
    if (points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      this.ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }

    if (points.length > 1) {
      this.ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    }

    this.ctx.stroke();
  }

  private imageCache: Map<string, HTMLImageElement> = new Map();

  private drawImage(shape: Extract<Shape, { type: 'image' }>) {
    const { x, y, width, height } = shape.bounds;

    // Use cached image or create new one
    let img = this.imageCache.get(shape.src);
    if (!img) {
      img = new Image();
      img.src = shape.src;
      this.imageCache.set(shape.src, img);
    }

    if (img.complete) {
      this.ctx.drawImage(img, x, y, width, height);
    } else {
      // Draw placeholder while loading
      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.fillRect(x, y, width, height);
      this.ctx.strokeStyle = '#999';
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  private drawAudio(shape: Extract<Shape, { type: 'audio' }>) {
    const { x, y, width, height } = shape.bounds;
    const barCount = shape.waveformData.length;
    const barWidth = width / barCount;

    // Draw waveform bars
    this.ctx.fillStyle = shape.style.color;

    shape.waveformData.forEach((amplitude, i) => {
      const barHeight = amplitude * height * 0.8;
      const barX = x + i * barWidth;
      const barY = y + (height - barHeight) / 2;

      this.ctx.fillRect(barX, barY, barWidth - 1, barHeight);
    });

    // Draw play/pause indicator in center
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const indicatorSize = Math.min(width, height) * 0.2;

    this.ctx.fillStyle = shape.style.color;

    if (shape.isPlaying) {
      // Draw pause icon (two vertical bars)
      const barWidth2 = indicatorSize * 0.25;
      const gap = indicatorSize * 0.2;
      this.ctx.fillRect(
        centerX - gap / 2 - barWidth2,
        centerY - indicatorSize / 2,
        barWidth2,
        indicatorSize
      );
      this.ctx.fillRect(centerX + gap / 2, centerY - indicatorSize / 2, barWidth2, indicatorSize);
    } else {
      // Draw play icon (triangle)
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - indicatorSize / 3, centerY - indicatorSize / 2);
      this.ctx.lineTo(centerX - indicatorSize / 3, centerY + indicatorSize / 2);
      this.ctx.lineTo(centerX + indicatorSize / 2, centerY);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Draw duration text
    const minutes = Math.floor(shape.duration / 60);
    const seconds = Math.floor(shape.duration % 60);
    const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    this.ctx.font = `${Math.max(10, height * 0.15)}px sans-serif`;
    this.ctx.fillStyle = shape.style.color;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(timeText, x + width - 5, y + height - 5);
  }

  private drawText(shape: TextShape) {
    const { x, y, width, height } = shape.bounds;

    // Set font properties
    this.ctx.font = `${shape.fontStyle} ${shape.fontWeight} ${shape.fontSize}px ${shape.fontFamily}`;
    this.ctx.fillStyle = shape.style.color;
    this.ctx.textAlign = shape.textAlign;
    this.ctx.textBaseline = 'top';
    this.ctx.globalAlpha = shape.style.opacity;

    // Calculate line height
    const lineHeight = shape.fontSize * 1.2;

    // Word wrap function
    const wrapText = (text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = words[0];

      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const testLine = currentLine + ' ' + word;
        const metrics = this.ctx.measureText(testLine);
        const testWidth = metrics.width;

        if (testWidth > maxWidth && i > 0) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);
      return lines;
    };

    // Handle multiline text with wrapping
    const lines = shape.text.includes('\n')
      ? shape.text.split('\n').flatMap((line) => wrapText(line, width - 10))
      : wrapText(shape.text, width - 10);

    // Draw each line
    lines.forEach((line, index) => {
      // Calculate x position based on text alignment
      let lineX = x;
      if (shape.textAlign === 'center') {
        lineX = x + width / 2;
      } else if (shape.textAlign === 'right') {
        lineX = x + width;
      }

      // Only draw if within bounds
      if (index * lineHeight < height) {
        this.ctx.fillText(line, lineX, y + index * lineHeight);
      }
    });

    // Reset global alpha
    this.ctx.globalAlpha = 1;
  }

  private drawSelectionIndicator(shape: Shape) {
    const bounds = this.getShapeBounds(shape);
    const padding = 4;

    this.ctx.save();
    this.ctx.strokeStyle = '#2563eb';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.globalAlpha = 1;

    this.ctx.beginPath();
    this.ctx.rect(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );
    this.ctx.stroke();

    // Draw resize handles
    const handles = this.getResizeHandles(bounds);
    this.ctx.fillStyle = '#2563eb';
    this.ctx.setLineDash([]);

    handles.forEach((handle) => {
      this.ctx.beginPath();
      this.ctx.rect(handle.x - 4, handle.y - 4, 8, 8);
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  private getShapeBounds(shape: Shape): Bounds {
    switch (shape.type) {
      case 'rectangle':
        return shape.bounds;
      case 'circle':
        return {
          x: shape.center.x - shape.radius,
          y: shape.center.y - shape.radius,
          width: shape.radius * 2,
          height: shape.radius * 2,
        };
      case 'line': {
        return {
          x: Math.min(shape.start.x, shape.end.x),
          y: Math.min(shape.start.y, shape.end.y),
          width: Math.abs(shape.end.x - shape.start.x),
          height: Math.abs(shape.end.y - shape.start.y),
        };
      }
      case 'freehand': {
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        return {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys),
        };
      }
      case 'image':
      case 'audio':
      case 'text':
        return shape.bounds;
    }
  }

  private getResizeHandles(bounds: Bounds): Point[] {
    const { x, y, width, height } = bounds;
    return [
      { x, y }, // top-left
      { x: x + width / 2, y }, // top-center
      { x: x + width, y }, // top-right
      { x: x + width, y: y + height / 2 }, // right-center
      { x: x + width, y: y + height }, // bottom-right
      { x: x + width / 2, y: y + height }, // bottom-center
      { x, y: y + height }, // bottom-left
      { x, y: y + height / 2 }, // left-center
    ];
  }

  drawGrid(camera: CameraState, gridSize: number = 20) {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.save();
    this.ctx.strokeStyle = '#e5e5e5';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.5;

    const startX = Math.floor(-camera.x / camera.zoom / gridSize) * gridSize;
    const startY = Math.floor(-camera.y / camera.zoom / gridSize) * gridSize;
    const endX = startX + rect.width / camera.zoom + gridSize * 2;
    const endY = startY + rect.height / camera.zoom + gridSize * 2;

    for (let x = startX; x < endX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, startY);
      this.ctx.lineTo(x, endY);
      this.ctx.stroke();
    }

    for (let y = startY; y < endY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(startX, y);
      this.ctx.lineTo(endX, y);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawPreviewShape(start: Point, end: Point, type: Shape['type'], style: ShapeStyle) {
    const shape = this.createShapeFromPoints(start, end, type, style);
    this.drawShape(shape);
  }

  createShapeFromPoints(start: Point, end: Point, type: Shape['type'], style: ShapeStyle): Shape {
    const now = Date.now();
    const id = `shape-${now}`;

    switch (type) {
      case 'rectangle':
        return {
          id,
          type: 'rectangle',
          bounds: {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y),
          },
          style: { ...style },
          createdAt: now,
          updatedAt: now,
        };
      case 'circle': {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        return {
          id,
          type: 'circle',
          bounds: {
            x: start.x - radius,
            y: start.y - radius,
            width: radius * 2,
            height: radius * 2,
          },
          center: start,
          radius,
          style: { ...style },
          createdAt: now,
          updatedAt: now,
        };
      }
      case 'line':
        return {
          id,
          type: 'line',
          bounds: {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y),
          },
          start,
          end,
          style: { ...style },
          createdAt: now,
          updatedAt: now,
        };
      case 'freehand':
        return {
          id,
          type: 'freehand',
          bounds: {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(end.x - start.x),
            height: Math.abs(end.y - start.y),
          },
          points: [start, end],
          style: { ...style },
          createdAt: now,
          updatedAt: now,
        };
      case 'image':
      case 'audio':
        throw new Error(`Cannot create ${type} shape from points. Use file upload instead.`);
      case 'text':
        throw new Error('Cannot create text shape from points. Use text tool instead.');
    }
  }
}
