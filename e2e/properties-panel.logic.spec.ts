import { expect, test } from '@playwright/test';

test.describe('PropertiesPanel legacy-state regression', () => {
  test('renders the inspector for a selected shape when persisted style data omits shadows', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const consoleMessages: Array<{ type: string; text: string }> = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    page.on('console', (message) => {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
      });
    });

    await page.addInitScript(() => {
      const workspaceId = 'workspace-legacy';
      const shapeId = 'shape-legacy-rect';

      window.localStorage.setItem(
        'tldraw-workspaces',
        JSON.stringify({
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
                    fontSize: 16,
                    fontWeight: 'normal',
                    fontStyle: 'normal',
                    textAlign: 'left',
                  },
                },
                shapes: [
                  {
                    id: shapeId,
                    type: 'rectangle',
                    bounds: {
                      x: 120,
                      y: 120,
                      width: 180,
                      height: 120,
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
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  },
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            ],
            activeWorkspaceId: workspaceId,
          },
          version: 0,
        })
      );
    });

    await page.goto('/');

    await expect(page.getByText('Inspector')).toBeVisible();
    await expect(page.locator('.properties-panel')).toBeVisible();
    await expect(page.getByRole('button', { name: /color #/i })).toBeVisible();
    await expect(page.locator('.layout-grid .field-input').nth(0)).toHaveValue('120');
    await expect(page.locator('.layout-grid .field-input').nth(1)).toHaveValue('120');
    await expect(page.locator('.layout-grid .field-input').nth(2)).toHaveValue('180');
    await expect(page.locator('.layout-grid .field-input').nth(3)).toHaveValue('120');

    await page.getByRole('button', { name: /effects/i }).click();
    await expect(
      page.getByText('No shadows yet. Add one to give the selection more depth.')
    ).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(
      consoleMessages.filter(
        (message) =>
          message.type === 'error' ||
          /typeerror|propertiespanel|cannot read properties of undefined/i.test(message.text)
      )
    ).toEqual([]);
  });
});
