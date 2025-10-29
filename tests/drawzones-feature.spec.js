import { test, expect } from '@playwright/test';

test.describe('DrawZones Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar requisição de login e mockar resposta bem-sucedida
    await page.route('**/api/authenticate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id_token: 'mock_token_12345'
        })
      });
    });

    // Interceptar requisições da API Leaf
    await page.route('**/api/batches**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/files**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Navegar para a aplicação
    await page.goto('http://localhost:3000');
  });

  test('should display DrawZones component', async ({ page }) => {
    const errors = [];
    
    // Capturar erros JavaScript
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Fazer login
    await page.fill('input[type="text"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);

    // Verificar se há erros
    if (errors.length > 0) {
      console.log('❌ Erros encontrados:');
      errors.forEach(error => console.log('  - ' + error));
      throw new Error(`Erros JavaScript: ${errors.join(', ')}`);
    }

    // Verificar se DrawZones está presente
    const drawZonesTitle = page.locator('text=Draw Zones');
    await expect(drawZonesTitle).toBeVisible({ timeout: 10000 });
    console.log('✅ DrawZones title is visible');

    // Verificar se há botão Start Drawing
    const startDrawingButton = page.locator('button:has-text("Start Drawing")');
    await expect(startDrawingButton).toBeVisible();
    console.log('✅ Start Drawing button is visible');

    // Verificar se o mapa está presente
    const mapElement = page.locator('.leaflet-container');
    await expect(mapElement).toBeVisible();
    console.log('✅ Map is visible');

    // Aguardar um pouco mais para garantir que o mapa está totalmente carregado
    await page.waitForTimeout(2000);

    // Verificar se há tiles do Leaflet
    const leafletTiles = page.locator('.leaflet-tile-pane');
    await expect(leafletTiles).toBeVisible();
    console.log('✅ Leaflet tiles are visible');
  });

  test('should toggle drawing mode', async ({ page }) => {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Fazer login
    await page.fill('input[type="text"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);

    // Aguardar o mapa estar pronto
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Clicar em Start Drawing
    const startDrawingButton = page.locator('button:has-text("Start Drawing")');
    await startDrawingButton.click();
    console.log('✅ Clicked Start Drawing button');

    // Aguardar um pouco
    await page.waitForTimeout(1000);

    // Verificar se há erros após clicar
    if (errors.length > 0) {
      console.log('❌ Erros após clicar Start Drawing:');
      errors.forEach(error => console.log('  - ' + error));
      throw new Error(`Erros após Start Drawing: ${errors.join(', ')}`);
    }

    // Verificar se o botão mudou para Stop Drawing
    const stopDrawingButton = page.locator('button:has-text("Stop Drawing")');
    await expect(stopDrawingButton).toBeVisible();
    console.log('✅ Button changed to Stop Drawing');

    // Verificar se os controles de desenho do Leaflet aparecem
    const drawControls = page.locator('.leaflet-draw');
    await expect(drawControls).toBeVisible({ timeout: 5000 });
    console.log('✅ Leaflet draw controls are visible');
  });

  test('should have all DrawZones buttons', async ({ page }) => {
    // Fazer login
    await page.fill('input[type="text"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);

    // Verificar todos os botões
    await expect(page.locator('button:has-text("Start Drawing")')).toBeVisible();
    console.log('✅ Start Drawing button exists');
    
    await expect(page.locator('button:has-text("Clear All")')).toBeVisible();
    console.log('✅ Clear All button exists');
    
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    console.log('✅ Export button exists');
    
    await expect(page.locator('button:has-text("Import")')).toBeVisible();
    console.log('✅ Import button exists');
    
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    console.log('✅ Save button exists');
    
    await expect(page.locator('button:has-text("Load")')).toBeVisible();
    console.log('✅ Load button exists');
  });

  test('should display instructions', async ({ page }) => {
    // Fazer login
    await page.fill('input[type="text"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);

    // Verificar instruções
    await expect(page.locator('text=Click "Start" to enable drawing tools on map')).toBeVisible();
    await expect(page.locator('text=Export/Import: save/load zones as files')).toBeVisible();
    await expect(page.locator('text=Save/Load: store zones in browser')).toBeVisible();
    console.log('✅ All instructions are visible');
  });

  test('should NOT show rectangle drawing button', async ({ page }) => {
    // Fazer login
    await page.fill('input[type="text"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Aguardar dashboard carregar
    await page.waitForTimeout(3000);

    // Aguardar o mapa estar pronto
    await page.waitForSelector('.leaflet-container', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Verificar se o controle de desenho está presente
    const drawControls = page.locator('.leaflet-draw');
    await expect(drawControls).toBeVisible({ timeout: 5000 });
    console.log('✅ Leaflet draw controls are visible');

    // Verificar se o botão de polígono está presente
    const polygonButton = page.locator('.leaflet-draw-draw-polygon');
    await expect(polygonButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Polygon button is visible');

    // Verificar se o botão de círculo está presente
    const circleButton = page.locator('.leaflet-draw-draw-circle');
    await expect(circleButton).toBeVisible({ timeout: 5000 });
    console.log('✅ Circle button is visible');

    // Verificar se o botão de RETÂNGULO NÃO está presente
    const rectangleButton = page.locator('.leaflet-draw-draw-rectangle');
    await expect(rectangleButton).not.toBeVisible({ timeout: 2000 });
    console.log('✅ Rectangle button is NOT visible');

    // Verificar também usando o seletor de título do botão
    const rectangleButtonByTitle = page.locator('a[title*="rectangle" i], a[title*="retângulo" i], a[title*="square" i]');
    const count = await rectangleButtonByTitle.count();
    expect(count).toBe(0);
    console.log('✅ No rectangle/square buttons found by title');
  });
});
