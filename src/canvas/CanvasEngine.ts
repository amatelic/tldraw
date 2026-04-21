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

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private static readonly ARROW_HEAD_MIN_LENGTH = 14;
  private static readonly ARROW_HEAD_MAX_LENGTH = 24;
  private static readonly ARROW_HEAD_ANGLE = Math.PI / 5;

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

  drawShape(shape: Shape, isSelected: boolean = false, showSelectionHandles: boolean = true) {
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
        this.drawGroup(shape);
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
    const { start, end } = shape;
    const lineLength = Math.hypot(end.x - start.x, end.y - start.y);
    const arrowLength = Math.min(
      CanvasEngine.ARROW_HEAD_MAX_LENGTH,
      Math.max(CanvasEngine.ARROW_HEAD_MIN_LENGTH, shape.style.strokeWidth * 5)
    );
    const cappedArrowLength = Math.min(arrowLength, Math.max(lineLength * 0.6, 8));
    const arrowAngle = CanvasEngine.ARROW_HEAD_ANGLE;
    
    // Calculate arrowhead angle
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    // Keep the arrowhead readable even when the shaft is dashed or dotted.
    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - cappedArrowLength * Math.cos(angle - arrowAngle),
      end.y - cappedArrowLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(end.x, end.y);
    this.ctx.lineTo(
      end.x - cappedArrowLength * Math.cos(angle + arrowAngle),
      end.y - cappedArrowLength * Math.sin(angle + arrowAngle)
    );
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
    this.ctx.globalAlpha = shape.style.opacity;

    for (let i = 0; i < barCount; i++) {
      const barHeight = shape.waveformData[i] * height * 0.8;
      const barX = x + i * barWidth;
      const barY = y + (height - barHeight) / 2;

      this.ctx.fillRect(barX, barY, barWidth - 1, barHeight);
    }

    // Draw play/pause indicator
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const indicatorSize = Math.min(width, height) * 0.3;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, indicatorSize, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = shape.style.color;
    if (shape.isPlaying) {
      // Draw pause icon (two bars)
      const gap = indicatorSize * 0.2;
      const barWidth2 = (indicatorSize - gap) / 2;
      this.ctx.fillRect(centerX - indicatorSize / 2 + gap / 2, centerY - indicatorSize / 2, barWidth2, indicatorSize);
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
      if (shape.textAlign === 'center') {
        textX = x + width / 2;
      } else if (shape.textAlign === 'right') {
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

  private drawGroup(shape: GroupShape) {
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
    this.ctx.fillText(`Group (${shape.childrenIds.length})`, x + 4, y - 16);
    
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

    if (showHandles) {
      const handles = this.getResizeHandles(bounds);
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
    return CanvasEngine.getBoundsForShape(shape);
  }

  static getBoundsForShape(shape: Shape): Bounds {
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
      case 'arrow': {
        return {
          x: Math.min(shape.start.x, shape.end.x),
          y: Math.min(shape.start.y, shape.end.y),
          width: Math.abs(shape.end.x - shape.start.x),
          height: Math.abs(shape.end.y - shape.start.y),
        };
      }
      case 'pencil': {
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
      case 'embed':
      case 'group':
        return shape.bounds;
    }
  }

  static getBoundsForShapes(shapes: Shape[]): Bounds | null {
    if (shapes.length === 0) {
      return null;
    }

    const boundsList = shapes.map((shape) => CanvasEngine.getBoundsForShape(shape));
    const minX = Math.min(...boundsList.map((bounds) => bounds.x));
    const minY = Math.min(...boundsList.map((bounds) => bounds.y));
    const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width));
    const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
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

  static exportViewportToPng(canvas: HTMLCanvasElement): string {
    return canvas.toDataURL('image/png');
  }

  private static createExportEngine(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): CanvasEngine {
    const engine = Object.create(CanvasEngine.prototype) as CanvasEngine;
    engine.canvas = canvas;
    engine.ctx = ctx;
    engine.dpr = 1;
    engine.imageCache = new Map();
    return engine;
  }

  static exportShapesToPng(
    shapes: Shape[],
    options: {
      padding?: number;
      backgroundColor?: string;
      scale?: number;
    } = {}
  ): string {
    const bounds = CanvasEngine.getBoundsForShapes(shapes);
    if (!bounds) {
      throw new Error('Cannot export an empty shape collection');
    }

    const padding = options.padding ?? 24;
    const backgroundColor = options.backgroundColor ?? '#ffffff';
    const scale = options.scale ?? 2;
    const width = Math.max(1, Math.ceil(bounds.width + padding * 2));
    const height = Math.max(1, Math.ceil(bounds.height + padding * 2));
    const canvas = document.createElement('canvas');

    canvas.width = Math.max(1, Math.ceil(width * scale));
    canvas.height = Math.max(1, Math.ceil(height * scale));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create export canvas context');
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    const engine = CanvasEngine.createExportEngine(canvas, ctx);
    ctx.save();
    ctx.translate(padding - bounds.x, padding - bounds.y);
    shapes.forEach((shape) => {
      engine.drawShape(shape, false, false);
    });
    ctx.restore();

    return canvas.toDataURL('image/png');
  }

  private static getStrokeDasharray(style: ShapeStyle): string | null {
    switch (style.strokeStyle) {
      case 'dashed':
        return '5 5';
      case 'dotted':
        return '2 4';
      default:
        return null;
    }
  }

  private static getTextAnchor(textAlign: TextShape['textAlign']): 'start' | 'middle' | 'end' {
    switch (textAlign) {
      case 'center':
        return 'middle';
      case 'right':
        return 'end';
      default:
        return 'start';
    }
  }

  private static formatNumber(value: number): string {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(2).replace(/\.?0+$/, '');
  }

  private static escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/'/g, '&#39;');
  }

  private static getArrowheadPoints(shape: ArrowShape): { left: Point; right: Point } {
    const { start, end } = shape;
    const lineLength = Math.hypot(end.x - start.x, end.y - start.y);
    const arrowLength = Math.min(
      CanvasEngine.ARROW_HEAD_MAX_LENGTH,
      Math.max(CanvasEngine.ARROW_HEAD_MIN_LENGTH, shape.style.strokeWidth * 5)
    );
    const cappedArrowLength = Math.min(arrowLength, Math.max(lineLength * 0.6, 8));
    const angle = Math.atan2(end.y - start.y, end.x - start.x);

    return {
      left: {
        x: end.x - cappedArrowLength * Math.cos(angle - CanvasEngine.ARROW_HEAD_ANGLE),
        y: end.y - cappedArrowLength * Math.sin(angle - CanvasEngine.ARROW_HEAD_ANGLE),
      },
      right: {
        x: end.x - cappedArrowLength * Math.cos(angle + CanvasEngine.ARROW_HEAD_ANGLE),
        y: end.y - cappedArrowLength * Math.sin(angle + CanvasEngine.ARROW_HEAD_ANGLE),
      },
    };
  }

  static exportShapesToSvg(
    shapes: Shape[],
    options: {
      padding?: number;
      backgroundColor?: string;
    } = {}
  ): string {
    const bounds = CanvasEngine.getBoundsForShapes(shapes);
    if (!bounds) {
      throw new Error('Cannot export an empty shape collection');
    }

    const padding = options.padding ?? 24;
    const backgroundColor = options.backgroundColor ?? '#ffffff';
    const width = Math.max(1, bounds.width + padding * 2);
    const height = Math.max(1, bounds.height + padding * 2);
    const offsetX = padding - bounds.x;
    const offsetY = padding - bounds.y;
    const defs: string[] = [];

    const strokeAttributes = (style: ShapeStyle): string => {
      const dasharray = CanvasEngine.getStrokeDasharray(style);
      const dashAttribute = dasharray ? ` stroke-dasharray="${dasharray}"` : '';
      const mixBlendMode =
        style.blendMode !== 'source-over'
          ? ` style="mix-blend-mode: ${CanvasEngine.escapeXml(style.blendMode)};"`
          : '';

      return `stroke="${CanvasEngine.escapeXml(style.color)}" stroke-width="${CanvasEngine.formatNumber(
        style.strokeWidth
      )}" stroke-opacity="${CanvasEngine.formatNumber(style.opacity)}"${dashAttribute}${mixBlendMode}`;
    };

    const createFillAttributes = (style: ShapeStyle, shapeBounds: Bounds, gradientId: string): string => {
      if (style.fillStyle === 'none') {
        return 'fill="none"';
      }

      if (style.fillGradient) {
        const shiftedBounds = {
          x: shapeBounds.x + offsetX,
          y: shapeBounds.y + offsetY,
          width: shapeBounds.width,
          height: shapeBounds.height,
        };
        const centerX = shiftedBounds.x + shiftedBounds.width / 2;
        const centerY = shiftedBounds.y + shiftedBounds.height / 2;

        if (style.fillGradient.type === 'radial') {
          const radius = Math.max(shiftedBounds.width, shiftedBounds.height) / 2;
          defs.push(
            `<radialGradient id="${gradientId}" gradientUnits="userSpaceOnUse" cx="${CanvasEngine.formatNumber(
              centerX
            )}" cy="${CanvasEngine.formatNumber(centerY)}" r="${CanvasEngine.formatNumber(
              radius
            )}"><stop offset="0%" stop-color="${CanvasEngine.escapeXml(
              style.fillGradient.startColor
            )}" /><stop offset="100%" stop-color="${CanvasEngine.escapeXml(
              style.fillGradient.endColor
            )}" /></radialGradient>`
          );
        } else {
          const angleInRadians = (style.fillGradient.angle * Math.PI) / 180;
          const halfDiagonal = Math.sqrt(shiftedBounds.width ** 2 + shiftedBounds.height ** 2) / 2;
          const deltaX = Math.cos(angleInRadians) * halfDiagonal;
          const deltaY = Math.sin(angleInRadians) * halfDiagonal;
          defs.push(
            `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${CanvasEngine.formatNumber(
              centerX - deltaX
            )}" y1="${CanvasEngine.formatNumber(centerY - deltaY)}" x2="${CanvasEngine.formatNumber(
              centerX + deltaX
            )}" y2="${CanvasEngine.formatNumber(centerY + deltaY)}"><stop offset="0%" stop-color="${CanvasEngine.escapeXml(
              style.fillGradient.startColor
            )}" /><stop offset="100%" stop-color="${CanvasEngine.escapeXml(
              style.fillGradient.endColor
            )}" /></linearGradient>`
          );
        }

        return `fill="url(#${gradientId})" fill-opacity="${CanvasEngine.formatNumber(
          style.opacity * 0.3
        )}"`;
      }

      return `fill="${CanvasEngine.escapeXml(style.fillColor)}" fill-opacity="${CanvasEngine.formatNumber(
        style.opacity * 0.3
      )}"`;
    };

    const getShiftedPoint = (point: Point): Point => ({
      x: point.x + offsetX,
      y: point.y + offsetY,
    });

    const elements = shapes.map((shape, index) => {
      const shapeBounds = CanvasEngine.getBoundsForShape(shape);
      const shiftedBounds = {
        x: shapeBounds.x + offsetX,
        y: shapeBounds.y + offsetY,
        width: shapeBounds.width,
        height: shapeBounds.height,
      };
      const gradientId = `shape-gradient-${index}`;

      switch (shape.type) {
        case 'rectangle':
          return `<rect x="${CanvasEngine.formatNumber(shiftedBounds.x)}" y="${CanvasEngine.formatNumber(
            shiftedBounds.y
          )}" width="${CanvasEngine.formatNumber(shiftedBounds.width)}" height="${CanvasEngine.formatNumber(
            shiftedBounds.height
          )}" ${createFillAttributes(shape.style, shape.bounds, gradientId)} ${strokeAttributes(shape.style)} />`;
        case 'circle':
          return `<circle cx="${CanvasEngine.formatNumber(shape.center.x + offsetX)}" cy="${CanvasEngine.formatNumber(
            shape.center.y + offsetY
          )}" r="${CanvasEngine.formatNumber(shape.radius)}" ${createFillAttributes(
            shape.style,
            shape.bounds,
            gradientId
          )} ${strokeAttributes(shape.style)} />`;
        case 'line': {
          const start = getShiftedPoint(shape.start);
          const end = getShiftedPoint(shape.end);
          return `<line x1="${CanvasEngine.formatNumber(start.x)}" y1="${CanvasEngine.formatNumber(
            start.y
          )}" x2="${CanvasEngine.formatNumber(end.x)}" y2="${CanvasEngine.formatNumber(
            end.y
          )}" fill="none" stroke-linecap="round" ${strokeAttributes(shape.style)} />`;
        }
        case 'arrow': {
          const start = getShiftedPoint(shape.start);
          const end = getShiftedPoint(shape.end);
          const arrowhead = CanvasEngine.getArrowheadPoints(shape);
          const left = getShiftedPoint(arrowhead.left);
          const right = getShiftedPoint(arrowhead.right);
          return `<g><line x1="${CanvasEngine.formatNumber(start.x)}" y1="${CanvasEngine.formatNumber(
            start.y
          )}" x2="${CanvasEngine.formatNumber(end.x)}" y2="${CanvasEngine.formatNumber(
            end.y
          )}" fill="none" stroke-linecap="round" ${strokeAttributes(shape.style)} /><line x1="${CanvasEngine.formatNumber(
            end.x
          )}" y1="${CanvasEngine.formatNumber(end.y)}" x2="${CanvasEngine.formatNumber(
            left.x
          )}" y2="${CanvasEngine.formatNumber(left.y)}" fill="none" stroke-linecap="round" stroke-dasharray="none" ${strokeAttributes(
            shape.style
          )} /><line x1="${CanvasEngine.formatNumber(end.x)}" y1="${CanvasEngine.formatNumber(
            end.y
          )}" x2="${CanvasEngine.formatNumber(right.x)}" y2="${CanvasEngine.formatNumber(
            right.y
          )}" fill="none" stroke-linecap="round" stroke-dasharray="none" ${strokeAttributes(
            shape.style
          )} /></g>`;
        }
        case 'pencil': {
          const points = shape.points
            .map((point) => getShiftedPoint(point))
            .map((point) => `${CanvasEngine.formatNumber(point.x)},${CanvasEngine.formatNumber(point.y)}`)
            .join(' ');
          return `<polyline points="${points}" fill="none" stroke-linecap="round" stroke-linejoin="round" ${strokeAttributes(
            shape.style
          )} />`;
        }
        case 'image':
          return `<image href="${CanvasEngine.escapeXml(shape.src)}" x="${CanvasEngine.formatNumber(
            shiftedBounds.x
          )}" y="${CanvasEngine.formatNumber(shiftedBounds.y)}" width="${CanvasEngine.formatNumber(
            shiftedBounds.width
          )}" height="${CanvasEngine.formatNumber(shiftedBounds.height)}" preserveAspectRatio="none" opacity="${CanvasEngine.formatNumber(
            shape.style.opacity
          )}" />`;
        case 'audio': {
          const barCount = Math.max(shape.waveformData.length, 1);
          const barWidth = shiftedBounds.width / barCount;
          const bars = shape.waveformData
            .map((value, barIndex) => {
              const barHeight = value * shiftedBounds.height * 0.8;
              const barX = shiftedBounds.x + barIndex * barWidth;
              const barY = shiftedBounds.y + (shiftedBounds.height - barHeight) / 2;
              return `<rect x="${CanvasEngine.formatNumber(barX)}" y="${CanvasEngine.formatNumber(
                barY
              )}" width="${CanvasEngine.formatNumber(Math.max(barWidth - 1, 1))}" height="${CanvasEngine.formatNumber(
                barHeight
              )}" fill="${CanvasEngine.escapeXml(shape.style.color)}" fill-opacity="${CanvasEngine.formatNumber(
                shape.style.opacity
              )}" />`;
            })
            .join('');
          const indicatorSize = Math.min(shiftedBounds.width, shiftedBounds.height) * 0.3;
          const centerX = shiftedBounds.x + shiftedBounds.width / 2;
          const centerY = shiftedBounds.y + shiftedBounds.height / 2;
          const minutes = Math.floor(shape.duration / 60);
          const seconds = Math.floor(shape.duration % 60);
          const timeText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          return `<g>${bars}<circle cx="${CanvasEngine.formatNumber(centerX)}" cy="${CanvasEngine.formatNumber(
            centerY
          )}" r="${CanvasEngine.formatNumber(indicatorSize)}" fill="rgba(255,255,255,0.9)" />${
            shape.isPlaying
              ? `<rect x="${CanvasEngine.formatNumber(centerX - indicatorSize / 2 + indicatorSize * 0.1)}" y="${CanvasEngine.formatNumber(
                  centerY - indicatorSize / 2
                )}" width="${CanvasEngine.formatNumber((indicatorSize - indicatorSize * 0.2) / 2)}" height="${CanvasEngine.formatNumber(
                  indicatorSize
                )}" fill="${CanvasEngine.escapeXml(shape.style.color)}" /><rect x="${CanvasEngine.formatNumber(
                  centerX + indicatorSize * 0.1
                )}" y="${CanvasEngine.formatNumber(centerY - indicatorSize / 2)}" width="${CanvasEngine.formatNumber(
                  (indicatorSize - indicatorSize * 0.2) / 2
                )}" height="${CanvasEngine.formatNumber(indicatorSize)}" fill="${CanvasEngine.escapeXml(
                  shape.style.color
                )}" />`
              : `<polygon points="${CanvasEngine.formatNumber(centerX - indicatorSize / 3)},${CanvasEngine.formatNumber(
                  centerY - indicatorSize / 2
                )} ${CanvasEngine.formatNumber(centerX - indicatorSize / 3)},${CanvasEngine.formatNumber(
                  centerY + indicatorSize / 2
                )} ${CanvasEngine.formatNumber(centerX + indicatorSize / 2)},${CanvasEngine.formatNumber(
                  centerY
                )}" fill="${CanvasEngine.escapeXml(shape.style.color)}" />`
          }<text x="${CanvasEngine.formatNumber(
            shiftedBounds.x + shiftedBounds.width - 5
          )}" y="${CanvasEngine.formatNumber(
            shiftedBounds.y + shiftedBounds.height - 5
          )}" text-anchor="end" font-size="${CanvasEngine.formatNumber(
            Math.max(10, shiftedBounds.height * 0.15)
          )}" fill="${CanvasEngine.escapeXml(shape.style.color)}">${CanvasEngine.escapeXml(
            timeText
          )}</text></g>`;
        }
        case 'text': {
          const lineHeight = shape.fontSize * 1.2;
          const lines = shape.text.split('\n');
          const textX =
            shape.textAlign === 'center'
              ? shiftedBounds.x + shiftedBounds.width / 2
              : shape.textAlign === 'right'
                ? shiftedBounds.x + shiftedBounds.width - 5
                : shiftedBounds.x + 5;
          const startY = shiftedBounds.y + 5;
          const textAnchor = CanvasEngine.getTextAnchor(shape.textAlign);
          const spans = lines
            .map(
              (line, lineIndex) =>
                `<tspan x="${CanvasEngine.formatNumber(textX)}" y="${CanvasEngine.formatNumber(
                  startY + lineIndex * lineHeight
                )}">${CanvasEngine.escapeXml(line)}</tspan>`
            )
            .join('');
          return `<text text-anchor="${textAnchor}" font-family="${CanvasEngine.escapeXml(
            shape.fontFamily
          )}" font-size="${CanvasEngine.formatNumber(shape.fontSize)}" font-weight="${CanvasEngine.escapeXml(
            shape.fontWeight
          )}" font-style="${CanvasEngine.escapeXml(shape.fontStyle)}" fill="${CanvasEngine.escapeXml(
            shape.style.color
          )}" fill-opacity="${CanvasEngine.formatNumber(shape.style.opacity)}">${spans}</text>`;
        }
        case 'embed': {
          const centerX = shiftedBounds.x + shiftedBounds.width / 2;
          const centerY = shiftedBounds.y + shiftedBounds.height / 2;
          const iconSize = Math.min(shiftedBounds.width, shiftedBounds.height) * 0.2;
          const label = shape.embedType === 'youtube' ? 'YouTube' : 'Website';
          return `<g><rect x="${CanvasEngine.formatNumber(shiftedBounds.x)}" y="${CanvasEngine.formatNumber(
            shiftedBounds.y
          )}" width="${CanvasEngine.formatNumber(shiftedBounds.width)}" height="${CanvasEngine.formatNumber(
            shiftedBounds.height
          )}" fill="#f0f0f0" stroke="#ccc" stroke-width="1" />${
            shape.embedType === 'youtube'
              ? `<polygon points="${CanvasEngine.formatNumber(centerX - iconSize / 2)},${CanvasEngine.formatNumber(
                  centerY - iconSize / 2
                )} ${CanvasEngine.formatNumber(centerX + iconSize / 2)},${CanvasEngine.formatNumber(
                  centerY
                )} ${CanvasEngine.formatNumber(centerX - iconSize / 2)},${CanvasEngine.formatNumber(
                  centerY + iconSize / 2
                )}" fill="#666" />`
              : `<rect x="${CanvasEngine.formatNumber(centerX - iconSize / 2)}" y="${CanvasEngine.formatNumber(
                  centerY - iconSize / 3
                )}" width="${CanvasEngine.formatNumber(iconSize)}" height="${CanvasEngine.formatNumber(
                  iconSize / 3
                )}" fill="#666" /><rect x="${CanvasEngine.formatNumber(
                  centerX - iconSize / 2
                )}" y="${CanvasEngine.formatNumber(centerY + iconSize / 6)}" width="${CanvasEngine.formatNumber(
                  iconSize
                )}" height="${CanvasEngine.formatNumber(iconSize / 3)}" fill="#666" />`
          }<text x="${CanvasEngine.formatNumber(centerX)}" y="${CanvasEngine.formatNumber(
            centerY + iconSize
          )}" text-anchor="middle" font-size="${CanvasEngine.formatNumber(
            Math.max(10, Math.min(14, shiftedBounds.height * 0.1))
          )}" fill="#333">${label}</text><text x="${CanvasEngine.formatNumber(
            centerX
          )}" y="${CanvasEngine.formatNumber(
            shiftedBounds.y + shiftedBounds.height - 15
          )}" text-anchor="middle" font-size="${CanvasEngine.formatNumber(
            Math.max(8, Math.min(12, shiftedBounds.height * 0.08))
          )}" fill="#999">${CanvasEngine.escapeXml(shape.url)}</text></g>`;
        }
        case 'group':
          return `<g><rect x="${CanvasEngine.formatNumber(shiftedBounds.x)}" y="${CanvasEngine.formatNumber(
            shiftedBounds.y
          )}" width="${CanvasEngine.formatNumber(shiftedBounds.width)}" height="${CanvasEngine.formatNumber(
            shiftedBounds.height
          )}" fill="rgba(147, 51, 234, 0.2)" stroke="rgba(147, 51, 234, 0.6)" stroke-width="1" stroke-dasharray="4 4" /><text x="${CanvasEngine.formatNumber(
            shiftedBounds.x + 4
          )}" y="${CanvasEngine.formatNumber(
            shiftedBounds.y - 4
          )}" font-size="12" fill="rgba(147, 51, 234, 0.8)">Group (${shape.childrenIds.length})</text></g>`;
      }
    });

    const defsMarkup = defs.length > 0 ? `<defs>${defs.join('')}</defs>` : '';

    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${CanvasEngine.formatNumber(
      width
    )}" height="${CanvasEngine.formatNumber(
      height
    )}" viewBox="0 0 ${CanvasEngine.formatNumber(width)} ${CanvasEngine.formatNumber(
      height
    )}" fill="none">${defsMarkup}<rect width="${CanvasEngine.formatNumber(
      width
    )}" height="${CanvasEngine.formatNumber(height)}" fill="${CanvasEngine.escapeXml(
      backgroundColor
    )}" />${elements.join('')}</svg>`;
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
      case 'arrow':
        return {
          id,
          type: 'arrow',
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
      case 'pencil':
        return {
          id,
          type: 'pencil',
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
      case 'embed':
        throw new Error('Cannot create embed shape from points. Use embed dialog instead.');
      default:
        throw new Error(`Cannot create shape of type ${type} from points.`);
    }
  }
}
