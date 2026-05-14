import { useState } from 'react';
import type { Shape } from '../types';
import './LeftSidebar.css';

interface DocumentItem {
  id: string;
  name: string;
  icon?: string;
}

interface PageItem {
  id: string;
  name: string;
}

export interface LeftSidebarProps {
  documents?: DocumentItem[];
  pages?: PageItem[];
  selectedDocumentId?: string;
  selectedPageId?: string;
  onDocumentSelect?: (id: string) => void;
  onPageSelect?: (id: string) => void;
  shapes?: Shape[];
  selectedIds?: string[];
  onShapeSelect?: (id: string) => void;
}

const SHAPE_TYPE_ICONS: Record<string, string> = {
  rectangle: '⬜',
  circle: '⭕',
  line: '📏',
  arrow: '➡️',
  pencil: '✏️',
  image: '🖼️',
  audio: '🔊',
  text: '📝',
  embed: '🔗',
  group: '📦',
};

function getShapeDisplayName(shape: Shape): string {
  if (shape.type === 'text') return shape.text || 'Text';
  if (shape.type === 'group') return 'Group';
  if (shape.type === 'image') return 'Image';
  if (shape.type === 'audio') return 'Audio';
  if (shape.type === 'embed') return 'Embed';
  return shape.type.charAt(0).toUpperCase() + shape.type.slice(1);
}

interface LayerNode {
  shape: Shape;
  children: LayerNode[];
}

function buildLayerTree(shapes: Shape[]): LayerNode[] {
  const shapeMap = new Map<string, LayerNode>();
  const roots: LayerNode[] = [];

  shapes.forEach((shape) => {
    shapeMap.set(shape.id, { shape, children: [] });
  });

  shapes.forEach((shape) => {
    const node = shapeMap.get(shape.id)!;
    if (shape.parentId && shapeMap.has(shape.parentId)) {
      const parent = shapeMap.get(shape.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots.reverse();
}

export function LeftSidebar({
  documents = [
    { id: '1', name: 'Design system', icon: '📁' },
    { id: '2', name: 'Untitled', icon: '📄' },
  ],
  pages = [
    { id: '1', name: 'Page 1' },
  ],
  selectedDocumentId = '2',
  selectedPageId = '1',
  onDocumentSelect,
  onPageSelect,
  shapes = [],
  selectedIds = [],
  onShapeSelect,
}: LeftSidebarProps): React.JSX.Element {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    documents: true,
    pages: true,
    layers: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="left-sidebar">
      <div className="left-sidebar-header">
        <span className="left-sidebar-title">Project</span>
      </div>

      <div className="left-sidebar-content">
        {/* Documents Section */}
        <div className="left-sidebar-section">
          <button
            className="left-sidebar-section-header"
            onClick={() => toggleSection('documents')}
            aria-expanded={expandedSections.documents}
          >
            <span className="left-sidebar-section-title">Documents</span>
            <svg
              className={`left-sidebar-chevron ${expandedSections.documents ? 'expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          {expandedSections.documents && (
            <div className="left-sidebar-section-content">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  className={`left-sidebar-item ${selectedDocumentId === doc.id ? 'selected' : ''}`}
                  onClick={() => onDocumentSelect?.(doc.id)}
                >
                  <span className="left-sidebar-item-icon">{doc.icon || '📄'}</span>
                  <span className="left-sidebar-item-label">{doc.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pages Section */}
        <div className="left-sidebar-section">
          <button
            className="left-sidebar-section-header"
            onClick={() => toggleSection('pages')}
            aria-expanded={expandedSections.pages}
          >
            <span className="left-sidebar-section-title">Pages</span>
            <svg
              className={`left-sidebar-chevron ${expandedSections.pages ? 'expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          {expandedSections.pages && (
            <div className="left-sidebar-section-content">
              {pages.map((page) => (
                <button
                  key={page.id}
                  className={`left-sidebar-item ${selectedPageId === page.id ? 'selected' : ''}`}
                  onClick={() => onPageSelect?.(page.id)}
                >
                  <span className="left-sidebar-item-label">{page.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layers Section */}
        <div className="left-sidebar-section">
          <button
            className="left-sidebar-section-header"
            onClick={() => toggleSection('layers')}
            aria-expanded={expandedSections.layers}
          >
            <span className="left-sidebar-section-title">Layers</span>
            <svg
              className={`left-sidebar-chevron ${expandedSections.layers ? 'expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          {expandedSections.layers && (
            <div className="left-sidebar-section-content">
              {shapes.length === 0 ? (
                <div className="left-sidebar-empty">No layers</div>
              ) : (
                <LayerTree
                  nodes={buildLayerTree(shapes)}
                  selectedIds={selectedIds}
                  onShapeSelect={onShapeSelect}
                  depth={0}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface LayerTreeProps {
  nodes: LayerNode[];
  selectedIds: string[];
  onShapeSelect?: (id: string) => void;
  depth: number;
}

function LayerTree({ nodes, selectedIds, onShapeSelect, depth }: LayerTreeProps): React.JSX.Element {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.shape.id} className="left-sidebar-layer-node">
          <button
            className={`left-sidebar-item ${selectedIds.includes(node.shape.id) ? 'selected' : ''}`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => onShapeSelect?.(node.shape.id)}
          >
            <span className="left-sidebar-item-icon">
              {SHAPE_TYPE_ICONS[node.shape.type] || '⬜'}
            </span>
            <span className="left-sidebar-item-label">{getShapeDisplayName(node.shape)}</span>
          </button>
          {node.children.length > 0 && (
            <div className="left-sidebar-layer-children">
              <LayerTree
                nodes={node.children}
                selectedIds={selectedIds}
                onShapeSelect={onShapeSelect}
                depth={depth + 1}
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
}
