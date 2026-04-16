import { expect, test } from '@playwright/test';

function createEmbedWorkspaceState() {
  const workspaceId = 'workspace-embed-layout';
  const shapeId = 'embed-shape-1';
  const createdAt = Date.now();

  return {
    workspaceId,
    shapeId,
    persistedState: {
      state: {
        workspaces: [
          {
            id: workspaceId,
            name: 'Workspace 1',
            state: {
              tool: 'select',
              selectedShapeIds: [shapeId],
              camera: { x: 0, y: 0, zoom: 1 },
              isDragging: false,
              isDrawing: false,
              editingTextId: null,
              shapeStyle: {
                color: '#000000',
                fillColor: '#000000',
                strokeWidth: 2,
                strokeStyle: 'solid',
                fillStyle: 'none',
                opacity: 1,
                blendMode: 'source-over',
                shadows: [],
                fontSize: 16,
                fontFamily: 'sans-serif',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textAlign: 'left',
              },
            },
            shapes: [
              {
                id: shapeId,
                type: 'embed',
                url: 'https://example.com',
                embedType: 'website',
                embedSrc: 'about:blank',
                bounds: {
                  x: 120,
                  y: 140,
                  width: 480,
                  height: 270,
                },
                style: {
                  color: '#000000',
                  fillColor: '#000000',
                  strokeWidth: 2,
                  strokeStyle: 'solid',
                  fillStyle: 'none',
                  opacity: 1,
                  blendMode: 'source-over',
                  shadows: [],
                  fontSize: 16,
                  fontFamily: 'sans-serif',
                  fontWeight: 'normal',
                  fontStyle: 'normal',
                  textAlign: 'left',
                },
                createdAt,
                updatedAt: createdAt,
              },
            ],
            createdAt,
            updatedAt: createdAt,
          },
        ],
        activeWorkspaceId: workspaceId,
      },
      version: 0,
    },
  };
}

test.describe('Embed layout interactions', () => {
  test.beforeEach(async ({ page }) => {
    const { persistedState } = createEmbedWorkspaceState();

    await page.addInitScript((state) => {
      window.localStorage.setItem('tldraw-workspaces', JSON.stringify(state));
    }, persistedState);
  });

  test('resizes an embed from canvas handles and persists the new bounds', async ({ page }) => {
    await page.goto('/');

    const embedOverlay = page.locator('.embed-overlay').first();
    const widthInput = page.getByLabel('Layout Width');
    const heightInput = page.getByLabel('Layout Height');
    const resizeHandle = page.getByLabel('Resize embed se');

    await expect(embedOverlay).toBeVisible();
    await expect(resizeHandle).toBeVisible();
    await expect(widthInput).toHaveValue('480');
    await expect(heightInput).toHaveValue('270');

    const handleBox = await resizeHandle.boundingBox();
    if (!handleBox) {
      throw new Error('Resize handle bounding box was not available');
    }

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + handleBox.width / 2 + 60, handleBox.y + handleBox.height / 2 + 40, {
      steps: 10,
    });
    await page.mouse.up();

    await expect(widthInput).toHaveValue('540');
    await expect(heightInput).toHaveValue('310');

    await page.waitForTimeout(180);

    const persistedBounds = await page.evaluate(() => {
      const raw = window.localStorage.getItem('tldraw-workspaces');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.state.workspaces[0].shapes[0].bounds;
    });

    expect(persistedBounds).toEqual({
      x: 120,
      y: 140,
      width: 540,
      height: 310,
    });
  });

  test('updates embed size from the inspector layout fields and persists the change', async ({ page }) => {
    await page.goto('/');

    const widthInput = page.getByLabel('Layout Width');
    const heightInput = page.getByLabel('Layout Height');

    await expect(widthInput).toHaveValue('480');
    await expect(heightInput).toHaveValue('270');

    await widthInput.fill('620');
    await widthInput.press('Enter');
    await heightInput.fill('360');
    await heightInput.press('Enter');

    await expect(widthInput).toHaveValue('620');
    await expect(heightInput).toHaveValue('360');

    await page.waitForTimeout(180);

    const persistedBounds = await page.evaluate(() => {
      const raw = window.localStorage.getItem('tldraw-workspaces');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.state.workspaces[0].shapes[0].bounds;
    });

    expect(persistedBounds).toEqual({
      x: 120,
      y: 140,
      width: 620,
      height: 360,
    });
  });
});
