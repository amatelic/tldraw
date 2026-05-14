import type {
  Shape,
  RectangleShape,
  CircleShape,
  LineShape,
  ArrowShape,
  PencilShape,
  EmbedShape,
  GroupShape,
  Point,
  Bounds,
  CameraState,
  ShapeStyle,
  TextShape,
  FillGradient,
} from '../types';
import { getTextShapeTypography } from '../document/textStyle';
import { getGroupChildIds } from '../types/selection';
import { getArrowHeadPoints, getResizeHandles, getShapeBounds } from './geometry';
import { createShapeFromPoints as createShapeFromPointsFromDrag } from './shapeFactory';

export interface CanvasEngineOptions {
  onImageLoad?: () => void;
}

interface CachedCanvasImage {
  image: HTMLImageElement;
  isLoaded: boolean;
  hasError: boolean;
  listeners: Set<() => void>;
}

const canvasImageCache = new Map<string, CachedCanvasImage>();

function notifyCanvasImageListeners(entry: CachedCanvasImage): void {
  for (const listener of entry.listeners) {
    listener();
  }
  entry.listeners.clear();
}

function getCachedCanvasImage(src: string): CachedCanvasImage {
  const cachedImage = canvasImageCache.get(src);
  if (cachedImage) {
    return cachedImage;
  }

  const image = new Image();
  const entry: CachedCanvasImage = {
    image,
    isLoaded: false,
    hasError: false,
    listeners: new Set(),
  };

  image.onload = () => {
    entry.isLoaded = true;
    entry.hasError = false;
    notifyCanvasImageListeners(entry);
  };
  image.onerror = () => {
    entry.hasError = true;
    entry.listeners.clear();
  };
  image.src = src;

  if (image.complete && image.naturalWidth > 0) {
    entry.isLoaded = true;
  }

  canvasImageCache.set(src, entry);
  return entry;
}

function isCachedCanvasImageReady(entry: CachedCanvasImage): boolean {
  if (entry.isLoaded) {
    return true;
  }

  if (entry.image.complete && entry.image.naturalWidth > 0) {
    entry.isLoaded = true;
    return true;
  }

  return false;
}

export function screenToWorldPoint(point: Point, camera: CameraState): Point {
  return {
    x: (point.x - camera.x) / camera.zoom,
    y: (point.y - camera.y) / camera.zoom,
  };
}

export function worldToScreenPoint(point: Point, camera: CameraState): Point {
  return {
    x: point.x * camera.zoom + camera.x,
    y: point.y * camera.zoom + camera.y,
  };
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private readonly onImageLoad?: () => void;

  constructor(canvas: HTMLCanvasElement, options: CanvasEngineOptions = {}) {
    this.canvas = canvas;
    this.onImageLoad = options.onImageLoad;
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
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    return screenToWorldPoint(point, camera);
  }

  worldToScreen(point: Point, camera: CameraState): Point {
    return worldToScreenPoint(point, camera);
  }

  measureTextWidth(text: string, font: string): number {
    const previousFont = this.ctx.font;
    this.ctx.font = font;
    const width = this.ctx.measureText(text).width;
    this.ctx.font = previousFont;
    return width;
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

  private createFillGradient(bounds: Bounds, fillGradient: FillGradient): CanvasGradient {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    if (fillGradient.type === 'radial') {
      const radius = Math.max(bounds.width, bounds.height) / 2;
      const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, fillGradient.startColor);
      gradient.addColorStop(1, fillGradient.endColor);
      return gradient;
    }

    const angleInRadians = (fillGradient.angle * Math.PI) / 180;
    const halfDiagonal = Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 2;
    const deltaX = Math.cos(angleInRadians) * halfDiagonal;
    const deltaY = Math.sin(angleInRadians) * halfDiagonal;
    const gradient = this.ctx.createLinearGradient(
      centerX - deltaX,
      centerY - deltaY,
      centerX + deltaX,
      centerY + deltaY
    );

    gradient.addColorStop(0, fillGradient.startColor);
    gradient.addColorStop(1, fillGradient.endColor);
    return gradient;
  }

  private setFillStyle(style: ShapeStyle, bounds: Bounds) {
    if (style.fillStyle === 'none') {
      this.ctx.fillStyle = 'transparent';
      return;
    }

    if (style.fillGradient) {
      this.ctx.fillStyle = this.createFillGradient(bounds, style.fillGradient);
    } else {
      this.ctx.fillStyle = style.fillColor;
    }

    this.ctx.globalAlpha = style.opacity * 0.3;
  }

  private hexToRgba(hex: string, opacity: number): string {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex
    let r: number, g: number, b: number;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Creates the path for a shape without filling or stroking.
   * This is used for both shadow rendering and actual shape drawing.
   */
  private createShapePath(shape: Shape): void {
    switch (shape.type) {
      case 'rectangle':
        this.createRectanglePath(shape);
        break;
      case 'circle':
        this.createCirclePath(shape);
        break;
      case 'line':
        this.createLinePath(shape);
        break;
      case 'arrow':
        this.createArrowPath(shape);
        break;
      case 'pencil':
        this.createPencilPath(shape);
        break;
      case 'image':
      case 'audio':
      case 'text':
      case 'embed':
      case 'group':
        // These shapes have custom drawing logic, handled separately
        break;
    }
  }

  private createRectanglePath(shape: RectangleShape): void {
    const { x, y, width, height } = shape.bounds;
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
  }

  private createCirclePath(shape: CircleShape): void {
    this.ctx.beginPath();
    this.ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
  }

  private createLinePath(shape: LineShape): void {
    const { start, end } = shape;
    this.createLinePathFromPoints(start, end);
  }

  private createLinePathFromPoints(start: Point, end: Point): void {
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
  }

  private createArrowPath(shape: ArrowShape): void {
    const { start, end } = shape;
    this.createLinePathFromPoints(start, end);
  }

  private createPencilPath(shape: PencilShape): void {
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
  }

  /**
   * Draws a shape's path with shadow properties applied.
   * Used to render multiple shadows by calling this method for each shadow.
   */
  private drawShapeWithShadow(shape: Shape, shadowIndex: number): void {
    const shadows = shape.style.shadows;
    if (!shadows || shadows.length === 0 || shadowIndex >= shadows.length) return;

    const shadow = shadows[shadowIndex];
    
    // Set shadow properties
    this.ctx.shadowColor = this.hexToRgba(shadow.color, shadow.opacity);
    this.ctx.shadowBlur = shadow.blur;
    this.ctx.shadowOffsetX = shadow.x;
    this.ctx.shadowOffsetY = shadow.y;

    // Create the path (without fill/stroke colors - just for shadow)
    if (shape.type === 'rectangle' || shape.type === 'circle' || 
        shape.type === 'line' || shape.type === 'arrow' || shape.type === 'pencil') {
      this.createShapePath(shape);
      
      // For shapes with fills, we need to fill to create the shadow
      // For strokes, we stroke
      if (shape.type === 'rectangle' || shape.type === 'circle') {
        if (shape.style.fillStyle !== 'none') {
          this.ctx.fillStyle = shape.style.fillColor;
          this.ctx.globalAlpha = shape.style.opacity;
          this.ctx.fill();
        }
        this.ctx.strokeStyle = shape.style.color;
        this.ctx.globalAlpha = shape.style.opacity;
        this.ctx.stroke();
      } else if (shape.type === 'arrow') {
        // For arrows, we need to stroke the line and draw the arrowhead
        this.ctx.strokeStyle = shape.style.color;
        this.ctx.globalAlpha = shape.style.opacity;
        this.ctx.stroke();
        this.drawArrowhead(shape);
      } else {
        // Line, pencil - just stroke
        this.ctx.strokeStyle = shape.style.color;
        this.ctx.globalAlpha = shape.style.opacity;
        this.ctx.stroke();
      }
    }
    // For image, audio, text, embed, group - shadows are handled differently or not supported
  }

  drawShape(
    shape: Shape,
    isSelected: boolean = false,
    showSelectionHandles: boolean = true,
    allShapes: Shape[] = [shape]
  ) {
    // Save current composite operation
    const prevComposite = this.ctx.globalCompositeOperation;
    
    // Apply shape's blend mode (default to 'source-over' for backward compatibility)
    this.ctx.globalCompositeOperation = shape.style.blendMode || 'source-over';

    // Draw shadows first (if any)
    if (shape.style.shadows && shape.style.shadows.length > 0) {
      // Save current context state
      this.ctx.save();
      
      // Draw each shadow
      for (let i = 0; i < shape.style.shadows.length; i++) {
        this.drawShapeWithShadow(shape, i);
      }
      
      // Reset shadow properties
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
      
      // Restore context state
      this.ctx.restore();
    }
    
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
      case 'arrow':
        this.drawArrow(shape);
        break;
      case 'pencil':
        this.drawPencil(shape);
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
      case 'embed':
        this.drawEmbed(shape);
        break;
      case 'group':
        this.drawGroup(shape, getGroupChildIds(shape.id, allShapes).length);
        break;
    }

    if (isSelected) {
      this.drawSelectionIndicator(shape, showSelectionHandles);
    }
    
    // Restore composite operation
    this.ctx.globalCompositeOperation = prevComposite;
  }

  private drawRectangle(shape: RectangleShape) {
    const { x, y, width, height } = shape.bounds;

    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);

    if (shape.style.fillStyle !== 'none') {
      this.setFillStyle(shape.style, shape.bounds);
      this.ctx.fill();
    }

    this.ctx.stroke();
  }

  private drawCircle(shape: CircleShape) {
    this.ctx.beginPath();
    this.ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);

    if (shape.style.fillStyle !== 'none') {
      this.setFillStyle(shape.style, shape.bounds);
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

  private drawArrow(shape: ArrowShape) {
    // Draw the main line
    this.createLinePathFromPoints(shape.start, shape.end);
    this.ctx.stroke();
    
    // Draw arrowhead
    this.drawArrowhead(shape);
  }

  private drawArrowhead(shape: ArrowShape): void {
    const [leftPoint, endPoint, rightPoint] = getArrowHeadPoints(shape);
    
    // Keep the arrowhead readable even when the shaft is dashed or dotted.
    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.moveTo(endPoint.x, endPoint.y);
    this.ctx.lineTo(leftPoint.x, leftPoint.y);
    this.ctx.moveTo(endPoint.x, endPoint.y);
    this.ctx.lineTo(rightPoint.x, rightPoint.y);
    this.ctx.stroke();
  }

  private drawPencil(shape: PencilShape) {
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

  private drawImage(shape: Extract<Shape, { type: 'image' }>) {
    const { x, y, width, height } = shape.bounds;
    const entry = getCachedCanvasImage(shape.src);

    if (isCachedCanvasImageReady(entry)) {
      this.ctx.drawImage(entry.image, x, y, width, height);
    } else {
      if (!entry.hasError && this.onImageLoad) {
        entry.listeners.add(this.onImageLoad);
      }
      // Draw placeholder while loading
      this.ctx.fillStyle = '#e0e0e0';
      this.ctx.fillRect(x, y, width, height);
      this.ctx.strokeStyle = '#999';
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number) {
    const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

    this.ctx.beginPath();
    this.ctx.moveTo(x + safeRadius, y);
    this.ctx.lineTo(x + width - safeRadius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
    this.ctx.lineTo(x + width, y + height - safeRadius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
    this.ctx.lineTo(x + safeRadius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
    this.ctx.lineTo(x, y + safeRadius);
    this.ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    this.ctx.closePath();
  }

  private drawAudio(shape: Extract<Shape, { type: 'audio' }>) {
    const { x, y, width, height } = shape.bounds;
    const radius = Math.min(18, Math.max(8, Math.min(width, height) * 0.16));
    const padding = Math.min(20, Math.max(10, Math.min(width, height) * 0.14));
    const contentHeight = Math.max(1, height - padding * 2);
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const buttonRadius = Math.min(32, Math.max(18, Math.min(width, height) * 0.28));
    const durationText = this.formatTime(shape.duration);

    this.ctx.save();
    this.ctx.globalAlpha = shape.style.opacity;

    this.ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
    this.ctx.shadowBlur = 18;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 8;
    this.drawRoundedRect(x, y, width, height, radius);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    this.drawRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, radius);
    this.ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    const textSize = Math.max(12, Math.min(18, height * 0.18));
    this.ctx.font = `${textSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    const durationWidth = Math.min(width * 0.28, this.ctx.measureText(durationText).width + 8);
    const waveformX = x + padding;
    const waveformRight = Math.max(
      waveformX,
      Math.min(centerX - buttonRadius - padding, x + width - padding - durationWidth)
    );
    const trackRight = Math.max(
      waveformX,
      x + width - padding - durationWidth - 8
    );

    this.ctx.strokeStyle = 'rgba(100, 116, 139, 0.24)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(waveformX, centerY);
    this.ctx.lineTo(trackRight, centerY);
    this.ctx.stroke();

    const barCount = shape.waveformData.length;
    const waveformWidth = waveformRight - waveformX;

    if (barCount > 0 && waveformWidth > 0) {
      const barSlotWidth = waveformWidth / barCount;
      const barWidth = Math.max(2, Math.min(6, barSlotWidth * 0.64));

      this.ctx.fillStyle = shape.style.color;

      for (let i = 0; i < barCount; i++) {
        const amplitude = Math.max(0, Math.min(1, shape.waveformData[i]));
        const barHeight = Math.max(3, amplitude * contentHeight * 0.92);
        const barX = waveformX + i * barSlotWidth + (barSlotWidth - barWidth) / 2;
        const barY = centerY - barHeight / 2;

        this.ctx.fillRect(barX, barY, barWidth, barHeight);
      }
    }

    this.ctx.shadowColor = 'rgba(15, 23, 42, 0.1)';
    this.ctx.shadowBlur = 12;
    this.ctx.shadowOffsetY = 5;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, buttonRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetY = 0;
    this.ctx.fillStyle = shape.style.color;
    if (shape.isPlaying) {
      const pauseHeight = buttonRadius * 0.9;
      const gap = buttonRadius * 0.22;
      const pauseBarWidth = buttonRadius * 0.24;
      this.ctx.fillRect(
        centerX - gap - pauseBarWidth / 2,
        centerY - pauseHeight / 2,
        pauseBarWidth,
        pauseHeight
      );
      this.ctx.fillRect(
        centerX + gap - pauseBarWidth / 2,
        centerY - pauseHeight / 2,
        pauseBarWidth,
        pauseHeight
      );
    } else {
      const iconSize = buttonRadius * 0.95;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - iconSize * 0.28, centerY - iconSize * 0.42);
      this.ctx.lineTo(centerX - iconSize * 0.28, centerY + iconSize * 0.42);
      this.ctx.lineTo(centerX + iconSize * 0.46, centerY);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#111827';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'alphabetic';
    this.ctx.fillText(durationText, x + width - padding, y + height - padding * 0.72);
    this.ctx.restore();
  }

  private formatTime(seconds: number): string {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = Math.floor(safeSeconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private drawText(shape: TextShape) {
    const { x, y, width, height } = shape.bounds;
    const typography = getTextShapeTypography(shape);

    // Set font properties
    this.ctx.font = `${typography.fontStyle} ${typography.fontWeight} ${typography.fontSize}px ${typography.fontFamily}`;
    this.ctx.fillStyle = shape.style.color;
    this.ctx.textAlign = typography.textAlign;
    this.ctx.textBaseline = 'top';
    this.ctx.globalAlpha = shape.style.opacity;

    // Calculate line height
    const lineHeight = typography.fontSize * 1.2;

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

    // Calculate starting Y position based on text align
    const totalTextHeight = lines.length * lineHeight;
    let startY = y + 5;

    if (totalTextHeight < height) {
      // Vertically center if text fits
      startY = y + (height - totalTextHeight) / 2;
    }

    // Draw each line
    lines.forEach((line, index) => {
      let textX = x + 5;
      if (typography.textAlign === 'center') {
        textX = x + width / 2;
      } else if (typography.textAlign === 'right') {
        textX = x + width - 5;
      }

      this.ctx.fillText(line, textX, startY + index * lineHeight);
    });
  }

  private drawEmbed(shape: EmbedShape) {
    const { x, y, width, height } = shape.bounds;

    // Draw placeholder background
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(x, y, width, height);

    // Draw border
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);

    // Draw icon based on embed type
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const iconSize = Math.min(width, height) * 0.2;

    this.ctx.fillStyle = '#666';
    if (shape.embedType === 'youtube') {
      // Draw play icon
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - iconSize / 2, centerY - iconSize / 2);
      this.ctx.lineTo(centerX + iconSize / 2, centerY);
      this.ctx.lineTo(centerX - iconSize / 2, centerY + iconSize / 2);
      this.ctx.closePath();
      this.ctx.fill();
    } else {
      this.ctx.fillRect(centerX - iconSize / 2, centerY - iconSize / 3, iconSize, iconSize / 3);
      this.ctx.fillRect(centerX - iconSize / 2, centerY + iconSize / 6, iconSize, iconSize / 3);
    }

    const label = shape.embedType === 'youtube' ? 'YouTube' : 'Website';
    const maxTextWidth = width - 20;
    const fontSize = Math.max(10, Math.min(14, height * 0.1));
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.fillStyle = '#333';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x + width / 2, y + height / 2 + iconSize, maxTextWidth);

    const urlFontSize = Math.max(8, fontSize - 2);
    this.ctx.font = `${urlFontSize}px sans-serif`;
    this.ctx.fillStyle = '#999';
    this.ctx.fillText(shape.url, x + width / 2, y + height - 15, maxTextWidth);
  }

  private drawGroup(shape: GroupShape, childCount: number) {
    // Groups are visual containers - we draw their bounds with a purple tint when selected
    const { x, y, width, height } = shape.bounds;
    
    // Draw semi-transparent purple background
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(147, 51, 234, 0.2)'; // Purple with 20% opacity
    this.ctx.fillRect(x, y, width, height);
    
    // Draw purple border
    this.ctx.strokeStyle = 'rgba(147, 51, 234, 0.6)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([4, 4]);
    this.ctx.strokeRect(x, y, width, height);
    
    // Draw group label
    this.ctx.font = '12px sans-serif';
    this.ctx.fillStyle = 'rgba(147, 51, 234, 0.8)';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`Group (${childCount})`, x + 4, y - 16);
    
    this.ctx.restore();
  }

  drawEmbedBounds(shape: EmbedShape, isSelected: boolean) {
    const { x, y, width, height } = shape.bounds;

    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeStyle = '#bbb';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([]);
    this.ctx.strokeRect(x, y, width, height);

    if (isSelected) {
      this.drawSelectionIndicator(shape);
    }
  }

  private drawSelectionIndicator(shape: Shape, showHandles: boolean = true) {
    const bounds = getShapeBounds(shape);
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

    if (showHandles) {
      const handles = getResizeHandles(bounds);
      this.ctx.fillStyle = '#fff';
      this.ctx.strokeStyle = '#2563eb';
      this.ctx.setLineDash([]);

      handles.forEach((handle) => {
        this.ctx.beginPath();
        this.ctx.rect(handle.x - 4, handle.y - 4, 8, 8);
        this.ctx.fill();
        this.ctx.stroke();
      });
    }

    this.ctx.restore();
  }

  getShapeBounds(shape: Shape): Bounds {
    return getShapeBounds(shape);
  }

  drawGrid(camera: CameraState, gridSize: number = 20) {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.save();
    this.ctx.strokeStyle = '#e5e5e5';
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.5;

    const visibleWorldLeft = (0 - camera.x) / camera.zoom;
    const visibleWorldTop = (0 - camera.y) / camera.zoom;
    const visibleWorldRight = (rect.width - camera.x) / camera.zoom;
    const visibleWorldBottom = (rect.height - camera.y) / camera.zoom;

    const startX = Math.floor(visibleWorldLeft / gridSize) * gridSize;
    const startY = Math.floor(visibleWorldTop / gridSize) * gridSize;
    const endX = Math.ceil(visibleWorldRight / gridSize) * gridSize;
    const endY = Math.ceil(visibleWorldBottom / gridSize) * gridSize;

    for (let x = startX; x < endX; x += gridSize) {
      const screenX = x * camera.zoom + camera.x;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, rect.height);
      this.ctx.stroke();
    }

    for (let y = startY; y < endY; y += gridSize) {
      const screenY = y * camera.zoom + camera.y;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(rect.width, screenY);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawPreviewShape(start: Point, end: Point, type: Shape['type'], style: ShapeStyle) {
    const shape = this.createShapeFromPoints(start, end, type, style);
    this.drawShape(shape);
  }

  createShapeFromPoints(start: Point, end: Point, type: Shape['type'], style: ShapeStyle): Shape {
    return createShapeFromPointsFromDrag(start, end, type, style);
  }
}
