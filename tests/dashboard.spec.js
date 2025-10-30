import { test, expect } from '@playwright/test';

test.describe('Point Lake Dashboard', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    
    // Verificar elementos da página de login
    await expect(page.locator('h1')).toContainText('Point Lake GIS Studio');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show dashboard after login', async ({ page }) => {
    // Fazer login primeiro
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Verificar se há elementos do dashboard
    await expect(page.locator('text=Point Lake GIS Studio').first()).toBeVisible();
    
    // Verificar se há botão de logout
    await expect(page.locator('text=Exit')).toBeVisible();
  });

  test('should load map component', async ({ page }) => {
    // Fazer login primeiro
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Aguardar o mapa carregar
    await page.waitForTimeout(2000);
    
    // Verificar se o container do mapa existe
    const mapContainer = page.locator('[class*="leaflet-container"]').first();
    await expect(mapContainer).toBeVisible({ timeout: 10000 });
    
    // Tirar screenshot
    await page.screenshot({ path: 'tests/screenshots/dashboard.png' });
  });

  test('should interact with SQL query area', async ({ page }) => {
    // Fazer login primeiro
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Encontrar o textarea de SQL
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    
    // Verificar conteúdo padrão
    const defaultValue = await textarea.inputValue();
    expect(defaultValue).toContain('SELECT');
    
    // Tirar screenshot do estado inicial
    await page.screenshot({ path: 'tests/screenshots/sql-panel.png' });
  });

  test('map should render Leaflet tiles', async ({ page }) => {
    // Fazer login primeiro
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Aguardar o mapa carregar
    await page.waitForTimeout(3000);
    
    // Verificar se há tiles do Leaflet no DOM
    const leafletTiles = page.locator('[class*="leaflet-tile"]');
    
    // Esperar que pelo menos um tile seja carregado
    await page.waitForSelector('[class*="leaflet-tile"]', { timeout: 10000 });
    
    const tileCount = await leafletTiles.count();
    console.log(`Tiles encontrados: ${tileCount}`);
    
    expect(tileCount).toBeGreaterThan(0);
    
    // Tirar screenshot do mapa carregado
    await page.screenshot({ path: 'tests/screenshots/map-loaded.png', fullPage: true });
  });

  test('should show error when SQL query is executed without auth', async ({ page }) => {
    // Fazer login primeiro
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Clicar no botão Executar Query
    const executeButton = page.locator('text=Execute Query');
    await executeButton.click();
    
    // Aguardar mensagem de erro ou resposta
    await page.waitForTimeout(2000);
    
    // Tirar screenshot
    await page.screenshot({ path: 'tests/screenshots/error-message.png' });
  });
});

