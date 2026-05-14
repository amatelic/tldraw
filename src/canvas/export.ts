import type {
  ArrowShape,
  CameraState,
  CircleShape,
  Point,
  RectangleShape,
  Shape,
} from '../types';
import { getTextShapeTypography } from '../document/textStyle';
import { getGroupChildIds } from '../types/selection';
import { CanvasEngine } from './CanvasEngine';
import { getArrowHeadPoints, getCombinedShapeBounds } from './geometry';

export type CanvasExportFormat = 'png' | 'svg';
export type CanvasExportScope = 'viewport' | 'all' | 'selected';

interface CanvasExportSceneOptions {
  width: number;
  height: number;
  camera: CameraState;
  shapes: Shape[];
  allShapes?: Shape[];
  drawGrid?: boolean;
}

interface ViewportPngExportOptions {
  canvas: HTMLCanvasElement;
  camera: CameraState;
  shapes: Shape[];
  workspaceName: string;
  date?: Date;
}

interface ShapesRasterExportOptions {
  shapes: Shape[];
  allShapes?: Shape[];
  workspaceName: string;
  scope: Exclude<CanvasExportScope, 'viewport'>;
  date?: Date;
  padding?: number;
}

type ShapesSvgExportOptions = ShapesRasterExportOptions;

function sanitizeExportName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function getSvgBlendMode(blendMode: Shape['style']['blendMode']): string | null {
  if (!blendMode || blendMode === 'source-over') {
    return null;
  }

  return blendMode;
}

function getSvgDashArray(strokeStyle: Shape['style']['strokeStyle']): string | null {
  switch (strokeStyle) {
    case 'dashed':
      return '5 5';
    case 'dotted':
      return '2 4';
    default:
      return null;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createDownloadLink(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  createDownloadLink(url, filename);
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  createDownloadLink(dataUrl, filename);
}

function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement {
  const exportCanvas = document.createElement('canvas');
  const safeWidth = Math.max(1, Math.ceil(width));
  const safeHeight = Math.max(1, Math.ceil(height));

  Object.defineProperty(exportCanvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width: safeWidth,
      height: safeHeight,
    }),
  });

  exportCanvas.style.width = `${safeWidth}px`;
  exportCanvas.style.height = `${safeHeight}px`;

  return exportCanvas;
}

function renderShapesToCanvasExport({
  width,
  height,
  camera,
  shapes,
  allShapes = shapes,
  drawGrid = false,
}: CanvasExportSceneOptions): HTMLCanvasElement {
  const exportCanvas = createOffscreenCanvas(width, height);
  const engine = new CanvasEngine(exportCanvas);

  engine.clear();
  if (drawGrid) {
    engine.drawGrid(camera);
  }

  engine.applyCamera(camera);
  for (const shape of shapes) {
    engine.drawShape(shape, false, false, allShapes);
  }
  engine.restoreCamera();

  return exportCanvas;
}

function buildFittedExportScene(
  shapes: Shape[],
  padding: number
): {
  width: number;
  height: number;
  camera: CameraState;
} | null {
  const bounds = getCombinedShapeBounds(shapes);
  if (!bounds) {
    return null;
  }

  return {
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
    camera: {
      x: padding - bounds.x,
      y: padding - bounds.y,
      zoom: 1,
    },
  };
}

function getShapeSvgStyleAttributes(shape: Shape, strokeColor?: string, fillValue?: string): string {
  const attributes = [
    `stroke="${escapeXml(strokeColor ?? shape.style.color)}"`,
    `stroke-width="${shape.style.strokeWidth}"`,
    `stroke-opacity="${shape.style.opacity}"`,
    'stroke-linecap="round"',
    'stroke-linejoin="round"',
  ];

  const dashArray = getSvgDashArray(shape.style.strokeStyle);
  if (dashArray) {
    attributes.push(`stroke-dasharray="${dashArray}"`);
  }

  if (fillValue !== undefined) {
    attributes.push(`fill="${fillValue}"`);
    if (fillValue !== 'none') {
      attributes.push(`fill-opacity="${shape.style.opacity * 0.3}"`);
    }
  } else {
    attributes.push('fill="none"');
  }

  const blendMode = getSvgBlendMode(shape.style.blendMode);
  if (blendMode) {
    attributes.push(`style="mix-blend-mode:${blendMode}"`);
  }

  return attributes.join(' ');
}

function createSvgGradientDefinition(
  shape: RectangleShape | CircleShape,
  gradientId: string,
  offsetX: number,
  offsetY: number
): string {
  const { fillGradient } = shape.style;
  if (!fillGradient) {
    return '';
  }

  const bounds = shape.bounds;
  const centerX = bounds.x + bounds.width / 2 + offsetX;
  const centerY = bounds.y + bounds.height / 2 + offsetY;

  if (fillGradient.type === 'radial') {
    const radius = Math.max(bounds.width, bounds.height) / 2;
    return `<radialGradient id="${gradientId}" gradientUnits="userSpaceOnUse" cx="${centerX}" cy="${centerY}" r="${radius}"><stop offset="0%" stop-color="${escapeXml(fillGradient.startColor)}" /><stop offset="100%" stop-color="${escapeXml(fillGradient.endColor)}" /></radialGradient>`;
  }

  const angleInRadians = (fillGradient.angle * Math.PI) / 180;
  const halfDiagonal = Math.sqrt(bounds.width ** 2 + bounds.height ** 2) / 2;
  const deltaX = Math.cos(angleInRadians) * halfDiagonal;
  const deltaY = Math.sin(angleInRadians) * halfDiagonal;

  return `<linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="${centerX - deltaX}" y1="${centerY - deltaY}" x2="${centerX + deltaX}" y2="${centerY + deltaY}"><stop offset="0%" stop-color="${escapeXml(fillGradient.startColor)}" /><stop offset="100%" stop-color="${escapeXml(fillGradient.endColor)}" /></linearGradient>`;
}

function createArrowSvgMarkup(
  shape: ArrowShape,
  offsetX: number,
  offsetY: number
): string {
  const points = getArrowHeadPoints(shape)
    .map((point: Point) => `${point.x + offsetX},${point.y + offsetY}`)
    .join(' ');

  return [
    `<line x1="${shape.start.x + offsetX}" y1="${shape.start.y + offsetY}" x2="${shape.end.x + offsetX}" y2="${shape.end.y + offsetY}" ${getShapeSvgStyleAttributes(shape)} />`,
    `<polyline points="${points}" ${getShapeSvgStyleAttributes(shape)} />`,
  ].join('');
}

function createSvgMarkupForShape(
  shape: Shape,
  allShapes: Shape[],
  offsetX: number,
  offsetY: number,
  shapeIndex: number,
  defs: string[]
): string {
  const gradientId = `${shape.id}-gradient-${shapeIndex}`;
  const supportsGradient =
    (shape.type === 'rectangle' || shape.type === 'circle') &&
    shape.style.fillStyle !== 'none' &&
    shape.style.fillGradient;

  const fillValue =
    shape.style.fillStyle === 'none'
      ? 'none'
      : supportsGradient
        ? `url(#${gradientId})`
        : escapeXml(shape.style.fillColor);

  if (supportsGradient) {
    defs.push(
      createSvgGradientDefinition(
        shape as RectangleShape | CircleShape,
        gradientId,
        offsetX,
        offsetY
      )
    );
  }

  switch (shape.type) {
    case 'rectangle':
      return `<rect x="${shape.bounds.x + offsetX}" y="${shape.bounds.y + offsetY}" width="${shape.bounds.width}" height="${shape.bounds.height}" ${getShapeSvgStyleAttributes(shape, undefined, fillValue)} />`;
    case 'circle':
      return `<circle cx="${shape.center.x + offsetX}" cy="${shape.center.y + offsetY}" r="${shape.radius}" ${getShapeSvgStyleAttributes(shape, undefined, fillValue)} />`;
    case 'line':
      return `<line x1="${shape.start.x + offsetX}" y1="${shape.start.y + offsetY}" x2="${shape.end.x + offsetX}" y2="${shape.end.y + offsetY}" ${getShapeSvgStyleAttributes(shape)} />`;
    case 'arrow':
      return createArrowSvgMarkup(shape, offsetX, offsetY);
    case 'pencil': {
      if (shape.points.length === 0) {
        return '';
      }

      const points = shape.points;
      let path = `M ${points[0].x + offsetX} ${points[0].y + offsetY}`;

      for (let index = 1; index < points.length - 1; index++) {
        const midpointX = (points[index].x + points[index + 1].x) / 2 + offsetX;
        const midpointY = (points[index].y + points[index + 1].y) / 2 + offsetY;
        path += ` Q ${points[index].x + offsetX} ${points[index].y + offsetY} ${midpointX} ${midpointY}`;
      }

      if (points.length > 1) {
        const lastPoint = points[points.length - 1];
        path += ` L ${lastPoint.x + offsetX} ${lastPoint.y + offsetY}`;
      }

      return `<path d="${path}" ${getShapeSvgStyleAttributes(shape)} />`;
    }
    case 'image':
      return `<image href="${escapeXml(shape.src)}" x="${shape.bounds.x + offsetX}" y="${shape.bounds.y + offsetY}" width="${shape.bounds.width}" height="${shape.bounds.height}" preserveAspectRatio="none" opacity="${shape.style.opacity}" />`;
    case 'audio': {
      const barCount = shape.waveformData.length || 1;
      const barWidth = shape.bounds.width / barCount;
      const bars = shape.waveformData
        .map((value, index) => {
          const barHeight = value * shape.bounds.height * 0.8;
          const barX = shape.bounds.x + offsetX + index * barWidth;
          const barY = shape.bounds.y + offsetY + (shape.bounds.height - barHeight) / 2;
          return `<rect x="${barX}" y="${barY}" width="${Math.max(1, barWidth - 1)}" height="${barHeight}" fill="${escapeXml(shape.style.color)}" fill-opacity="${shape.style.opacity}" />`;
        })
        .join('');
      return `<g>${bars}<rect x="${shape.bounds.x + offsetX}" y="${shape.bounds.y + offsetY}" width="${shape.bounds.width}" height="${shape.bounds.height}" fill="none" stroke="${escapeXml(shape.style.color)}" stroke-opacity="${shape.style.opacity}" stroke-width="1" /></g>`;
    }
    case 'text': {
      const typography = getTextShapeTypography(shape);
      const textAnchor =
        typography.textAlign === 'center'
          ? 'middle'
          : typography.textAlign === 'right'
            ? 'end'
            : 'start';
      const lines = shape.text.split('\n');
      const lineHeight = typography.fontSize * 1.2;
      const x =
        typography.textAlign === 'center'
          ? shape.bounds.x + shape.bounds.width / 2 + offsetX
          : typography.textAlign === 'right'
            ? shape.bounds.x + shape.bounds.width - 5 + offsetX
            : shape.bounds.x + 5 + offsetX;
      const startY = shape.bounds.y + 5 + offsetY;
      const tspans = lines
        .map(
          (line, index) =>
            `<tspan x="${x}" y="${startY + index * lineHeight}">${escapeXml(line)}</tspan>`
        )
        .join('');

      return `<text font-size="${typography.fontSize}" font-family="${escapeXml(typography.fontFamily)}" font-weight="${escapeXml(typography.fontWeight)}" font-style="${escapeXml(typography.fontStyle)}" text-anchor="${textAnchor}" fill="${escapeXml(shape.style.color)}" fill-opacity="${shape.style.opacity}">${tspans}</text>`;
    }
    case 'embed':
      return `<g><rect x="${shape.bounds.x + offsetX}" y="${shape.bounds.y + offsetY}" width="${shape.bounds.width}" height="${shape.bounds.height}" fill="#f0f0f0" stroke="#ccc" stroke-width="1" /><text x="${shape.bounds.x + shape.bounds.width / 2 + offsetX}" y="${shape.bounds.y + shape.bounds.height / 2 + offsetY}" text-anchor="middle" font-size="14" fill="#333">${escapeXml(shape.embedType === 'youtube' ? 'YouTube' : 'Website')}</text><text x="${shape.bounds.x + shape.bounds.width / 2 + offsetX}" y="${shape.bounds.y + shape.bounds.height - 15 + offsetY}" text-anchor="middle" font-size="10" fill="#999">${escapeXml(shape.url)}</text></g>`;
    case 'group':
      return `<g><rect x="${shape.bounds.x + offsetX}" y="${shape.bounds.y + offsetY}" width="${shape.bounds.width}" height="${shape.bounds.height}" fill="rgba(147, 51, 234, 0.2)" stroke="rgba(147, 51, 234, 0.6)" stroke-width="1" stroke-dasharray="4 4" /><text x="${shape.bounds.x + 4 + offsetX}" y="${shape.bounds.y - 4 + offsetY}" font-size="12" fill="rgba(147, 51, 234, 0.8)">Group (${getGroupChildIds(shape.id, allShapes).length})</text></g>`;
  }
}

export function createCanvasImageExportFilename(
  workspaceName: string,
  format: CanvasExportFormat,
  scope: CanvasExportScope,
  date: Date = new Date()
): string {
  const safeName = sanitizeExportName(workspaceName) || 'workspace';
  const timestamp = date.toISOString().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
  return `${safeName}-${scope}-${timestamp}.${format}`;
}

export function downloadViewportAsPng({
  canvas,
  camera,
  shapes,
  workspaceName,
  date = new Date(),
}: ViewportPngExportOptions): void {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const exportCanvas = renderShapesToCanvasExport({
    width: rect.width,
    height: rect.height,
    camera,
    shapes,
    drawGrid: true,
  });

  downloadDataUrl(
    exportCanvas.toDataURL('image/png'),
    createCanvasImageExportFilename(workspaceName, 'png', 'viewport', date)
  );
}

export function downloadShapesAsPng({
  shapes,
  allShapes = shapes,
  workspaceName,
  scope,
  date = new Date(),
  padding = 24,
}: ShapesRasterExportOptions): void {
  const exportScene = buildFittedExportScene(shapes, padding);
  if (!exportScene) {
    return;
  }

  const exportCanvas = renderShapesToCanvasExport({
    width: exportScene.width,
    height: exportScene.height,
    camera: exportScene.camera,
    shapes,
    allShapes,
  });

  downloadDataUrl(
    exportCanvas.toDataURL('image/png'),
    createCanvasImageExportFilename(workspaceName, 'png', scope, date)
  );
}

export function createSvgExport({
  shapes,
  allShapes = shapes,
  padding = 24,
}: Pick<ShapesSvgExportOptions, 'shapes' | 'allShapes' | 'padding'>): string | null {
  const exportScene = buildFittedExportScene(shapes, padding);
  if (!exportScene) {
    return null;
  }

  const offsetX = exportScene.camera.x;
  const offsetY = exportScene.camera.y;
  const defs: string[] = [];
  const shapeMarkup = shapes
    .map((shape, index) => createSvgMarkupForShape(shape, allShapes, offsetX, offsetY, index, defs))
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(exportScene.width)}" height="${Math.ceil(exportScene.height)}" viewBox="0 0 ${Math.ceil(exportScene.width)} ${Math.ceil(exportScene.height)}" fill="none">`,
    defs.length > 0 ? `<defs>${defs.join('')}</defs>` : '',
    shapeMarkup,
    '</svg>',
  ].join('');
}

export function downloadShapesAsSvg({
  shapes,
  allShapes = shapes,
  workspaceName,
  scope,
  date = new Date(),
  padding = 24,
}: ShapesSvgExportOptions): void {
  const svg = createSvgExport({
    shapes,
    allShapes,
    padding,
  });

  if (!svg) {
    return;
  }

  downloadBlob(
    new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }),
    createCanvasImageExportFilename(workspaceName, 'svg', scope, date)
  );
}
