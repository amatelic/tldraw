# Assets Directory

This directory contains static assets for the application.

## Overview

Assets are files that don't change at runtime and are bundled with the application:
- Images (PNG, SVG)
- Fonts
- Icons
- Other static files

## Current State

**⚠️ WARNING**: This directory is mostly empty. Most assets are inline SVGs in components.

## Files

| File | Type | Purpose |
|------|------|---------|
| `react.svg` | SVG | React logo (unused?) |
| `vite.svg` | SVG | Vite logo (unused?) |
| `hero.png` | PNG | Hero image for landing page (if exists) |

## Inline vs External Assets

### Current Approach: Inline SVGs

All icons are inline SVGs in components:

```tsx
// In Toolbar.tsx
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
  <path d="M5 3l14 9-5 1-4 8-5-1 3-15z" />
</svg>
```

**Pros**:
- No HTTP requests
- Can style with CSS (color, stroke-width)
- Tree-shakeable
- Always available offline

**Cons**:
- Increases bundle size
- Can't cache separately
- Duplicated if used in multiple places

### Alternative: External Assets

Could move to separate files:

```
assets/
├── icons/
│   ├── select.svg
│   ├── pan.svg
│   ├── pencil.svg
│   └── ...
├── images/
│   └── hero.png
└── fonts/
    └── custom-font.woff2
```

**Pros**:
- Cacheable by browser
- Smaller bundle
- Can optimize separately

**Cons**:
- Additional HTTP requests
- Need to handle loading states
- CORS issues with external URLs

## When to Add Assets Here

Add to this directory when:

1. **Large Images**: Photos, illustrations (> 10KB)
2. **Custom Fonts**: WOFF/WOFF2 font files
3. **External Icons**: If switching from inline SVGs
4. **Audio Samples**: Default sounds, effects
5. **Documentation**: Diagrams, screenshots

## Using Assets

### Import in TypeScript/React

```typescript
import heroImage from '../assets/hero.png';

function Hero() {
  return <img src={heroImage} alt="Hero" />;
}
```

Vite handles the import and bundles the asset.

### Reference in CSS

```css
.hero {
  background-image: url('../assets/hero.png');
}
```

### Public Directory

For files that need to be at root URL, use `public/` directory instead:

```
public/
├── favicon.svg
└── icons.svg
```

These are served at `/favicon.svg`, not bundled.

## Optimization

Vite automatically optimizes assets:
- Images: Can use `?url`, `?raw`, or `?inline` query params
- SVGs: Can import as React components with plugins
- Fonts: Subset and compress

## Current Icons

All tool icons are currently inline SVGs in `Toolbar.tsx`:

| Tool | Icon Description |
|------|------------------|
| Select | Arrow/cursor |
| Hand | Hand/grab |
| Pencil | Pencil/pen |
| Eraser | Eraser |
| Arrow | Arrow line |
| Text | Text lines |
| Rectangle | Square outline |
| Circle | Circle outline |
| Line | Diagonal line |
| Image | Landscape |
| More | Chevron up |

## Future Assets

Potential additions:

1. **Cursor Images**: Custom cursors for different tools
   ```
   assets/cursors/
   ├── crosshair.svg
   ├── eraser.svg
   └── grab.svg
   ```

2. **Tutorial Images**: Step-by-step guide screenshots
   ```
   assets/tutorials/
   ├── step1.png
   ├── step2.png
   └── ...
   ```

3. **Audio Placeholder**: Placeholder for audio shapes
   ```
   assets/
   └── audio-placeholder.png
   ```

4. **Logo**: App logo for header
   ```
   assets/
   └── logo.svg
   ```

## Best Practices

1. **Optimize Before Adding**: Compress images, minify SVGs
2. **Use Descriptive Names**: `toolbar-select-icon.svg` not `icon1.svg`
3. **Consider Size**: Large assets impact bundle size
4. **Lazy Load**: Use dynamic imports for heavy assets
5. **Accessibility**: Add alt text, proper labels

## Success Criteria

- [ ] Assets optimized for web
- [ ] Clear naming convention
- [ ] Organized in subdirectories by type
- [ ] No unused assets
- [ ] Reasonable bundle size impact

## Constraints

- All assets bundled at build time
- Vite handles asset processing
- Public directory for root-level files
- Limited by build output size

## Known Issues

1. **Unused Assets**: `react.svg` and `vite.svg` may not be used
2. **No Organization**: All files at root level
3. **No Documentation**: No index of what each asset is for

## Cleanup Tasks

- [ ] Audit and remove unused assets
- [ ] Organize into subdirectories
- [ ] Document each asset's purpose
- [ ] Optimize file sizes
- [ ] Add README to each subdirectory
