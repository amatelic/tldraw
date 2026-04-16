import { expect, test } from '@playwright/test';

test.describe('Header UI chrome', () => {
  test('matches the inspector-inspired shell styling without browser errors', async ({ page }) => {
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
      const shapeId = 'shape-selected';
      const createWorkspace = (id: string, name: string) => ({
        id,
        name,
        state: {
          tool: 'select',
          selectedShapeIds: id === 'workspace-2' ? [shapeId] : [],
          camera: { x: 0, y: 0, zoom: 1 },
          isDragging: false,
          isDrawing: false,
          editingTextId: null,
          shapeStyle: {
            color: '#b73f74',
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
        },
        shapes:
          id === 'workspace-2'
            ? [
                {
                  id: shapeId,
                  type: 'rectangle',
                  bounds: {
                    x: 160,
                    y: 160,
                    width: 180,
                    height: 120,
                  },
                  style: {
                    color: '#b73f74',
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
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
              ]
            : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      window.localStorage.setItem(
        'tldraw-workspaces',
        JSON.stringify({
          state: {
            workspaces: [
              createWorkspace('workspace-1', 'Workspace 1'),
              createWorkspace('workspace-2', 'Workspace 2'),
            ],
            activeWorkspaceId: 'workspace-2',
          },
          version: 0,
        })
      );
    });

    await page.goto('/');

    const header = page.locator('.app-header');
    const workspaceRail = page.locator('.workspace-tabs-container');
    const activeTab = page.locator('.workspace-tab.active');
    const agentsButton = page.getByRole('button', { name: 'Agents' });
    const canvasContainer = page.locator('.canvas-container');
    const propertiesPanel = page.locator('.properties-panel');

    await expect(header).toBeVisible();
    await expect(page.locator('.header-body')).toBeVisible();
    await expect(workspaceRail).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Workspace 2' })).toBeVisible();
    await expect(agentsButton).toBeVisible();
    await expect(canvasContainer).toBeVisible();
    await expect(propertiesPanel).toBeVisible();

    const headerStyles = await header.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        backgroundImage: styles.backgroundImage,
        fontFamily: styles.fontFamily,
        borderBottomColor: styles.borderBottomColor,
        position: styles.position,
      };
    });

    expect(headerStyles.backgroundImage).toContain('linear-gradient');
    expect(headerStyles.fontFamily).toContain('Avenir Next');
    expect(headerStyles.borderBottomColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(headerStyles.position).toBe('fixed');

    const railStyles = await workspaceRail.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderTopLeftRadius,
        boxShadow: styles.boxShadow,
        gap: styles.gap,
        paddingLeft: styles.paddingLeft,
        paddingTop: styles.paddingTop,
      };
    });

    expect(parseFloat(railStyles.borderRadius)).toBeGreaterThanOrEqual(20);
    expect(railStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(railStyles.boxShadow).not.toBe('none');
    expect(parseFloat(railStyles.gap)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(railStyles.paddingLeft)).toBeGreaterThanOrEqual(10);
    expect(parseFloat(railStyles.paddingTop)).toBeGreaterThanOrEqual(8);

    const actionButtonStyles = await agentsButton.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        borderRadius: styles.borderTopLeftRadius,
        boxShadow: styles.boxShadow,
        minHeight: styles.minHeight,
      };
    });

    expect(parseFloat(actionButtonStyles.borderRadius)).toBeGreaterThanOrEqual(15);
    expect(actionButtonStyles.boxShadow).not.toBe('none');
    expect(parseFloat(actionButtonStyles.minHeight)).toBeGreaterThanOrEqual(38);

    const addButtonStyles = await page.locator('.workspace-add-btn').evaluate((element) => {
      const styles = window.getComputedStyle(element);
      return {
        width: styles.width,
        height: styles.height,
        transitionDuration: styles.transitionDuration,
      };
    });

    expect(parseFloat(addButtonStyles.width)).toBeGreaterThanOrEqual(42);
    expect(parseFloat(addButtonStyles.height)).toBeGreaterThanOrEqual(42);
    expect(addButtonStyles.transitionDuration).not.toBe('0s');

    const activeTabStyles = await activeTab.evaluate((element) => {
      const styles = window.getComputedStyle(element);
      const pill = element.querySelector('.workspace-tab-active-pill');
      return {
        backgroundImage: styles.backgroundImage,
        color: styles.color,
        hasActivePill: Boolean(pill),
      };
    });

    expect(activeTabStyles.hasActivePill).toBe(true);
    expect(activeTabStyles.color).toBe('rgb(255, 255, 255)');

    const sharedRowMetrics = await page.evaluate(() => {
      const rail = document.querySelector('.workspace-tabs-container');
      const button = Array.from(document.querySelectorAll('.action-button')).find(
        (element) => element.textContent?.includes('Agents')
      );

      if (!(rail instanceof HTMLElement) || !(button instanceof HTMLElement)) {
        return null;
      }

      const railRect = rail.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      return {
        railTop: railRect.top,
        railCenter: railRect.top + railRect.height / 2,
        buttonTop: buttonRect.top,
        buttonCenter: buttonRect.top + buttonRect.height / 2,
      };
    });

    expect(sharedRowMetrics).not.toBeNull();
    expect(
      Math.abs((sharedRowMetrics?.railCenter ?? 0) - (sharedRowMetrics?.buttonCenter ?? 0))
    ).toBeLessThanOrEqual(4);

    const canvasMetrics = await canvasContainer.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(canvasMetrics.left).toBe(0);
    expect(canvasMetrics.top).toBe(0);
    expect(Math.abs(canvasMetrics.width - canvasMetrics.viewportWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(canvasMetrics.height - canvasMetrics.viewportHeight)).toBeLessThanOrEqual(1);

    const propertiesPanelStyles = await propertiesPanel.evaluate((element) => {
      const styles = window.getComputedStyle(element.parentElement as HTMLElement);
      return {
        position: styles.position,
        right: styles.right,
        bottom: styles.bottom,
      };
    });

    expect(propertiesPanelStyles.position).toBe('fixed');
    expect(propertiesPanelStyles.right).not.toBe('auto');
    expect(propertiesPanelStyles.bottom).not.toBe('auto');

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
