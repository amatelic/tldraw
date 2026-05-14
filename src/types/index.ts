export * from './document';
export * from './editor';
export * from './export';
export * from './geometry';
export * from './hitTesting';
export * from './selection';

export function createShapeId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
