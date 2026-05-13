import { expect, test } from '@playwright/test';

function createWorkspaceState() {
  const createdAt = Date.now();
  const baseState = {
    tool: 'select',
    selectedShapeIds: [],
    camera: { x: 0, y: 0, zoom: 1 },
    isDragging: false,
    isDrawing: false,
    editingTextId: null,
    shapeStyle: {
      color: '#000000',
      fillColor: '#ffffff',
      strokeWidth: 2,
      strokeStyle: 'solid',
      fillStyle: 'solid',
      opacity: 1,
      blendMode: 'source-over',
      shadows: [],
      fontSize: 16,
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
    },
  };

  const workspaces = [
    {
      id: 'workspace-1',
      name: 'Workspace 1',
      state: baseState,
      shapes: [],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'workspace-2',
      name: 'Web harnesting',
      state: baseState,
      shapes: [],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'workspace-3',
      name: 'Workspace 3',
      state: baseState,
      shapes: [],
      createdAt,
      updatedAt: createdAt,
    },
  ];

  return {
    state: {
      workspaces,
      activeWorkspaceId: 'workspace-1',
    },
    version: 0,
  };
}

test.describe('Workspace tab context menu regression', () => {
  test.beforeEach(async ({ page }) => {
    const persistedState = createWorkspaceState();

    await page.addInitScript((state) => {
      window.localStorage.setItem('tldraw-workspaces', JSON.stringify(state));
    }, persistedState);
  });

  test('opens tab context menu after switching workspaces via right-click on close area', async ({ page }) => {
    const pageErrors: string[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    await page.goto('/');

    await expect(page.getByRole('tab', { name: 'Workspace 1' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Web harnesting' })).toBeVisible();

    await page.getByRole('tab', { name: 'Web harnesting' }).click();

    const activeTab = page.locator('.workspace-tab.active');
    await expect(activeTab).toBeVisible();
    await expect(activeTab.getByRole('tab', { name: 'Web harnesting' })).toHaveAttribute('aria-selected', 'true');

    const closeButton = activeTab.getByRole('button', { name: 'Close workspace' });
    await expect(closeButton).toBeVisible();
    await closeButton.click({ button: 'right' });

    const menu = page.locator('.workspace-context-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Rename' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Close' })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
