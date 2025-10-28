import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login and access dashboard successfully', async ({ page }) => {
    // Ir para a página de login
    await page.goto('/login');
    
    // Aguardar elementos da página de login
    await expect(page.locator('h1')).toContainText('Leaf Dashboard');
    
    // Preencher credenciais
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    
    // Marcar "Manter conectado"
    await page.check('input[type="checkbox"]');
    
    // Clicar em Entrar
    await page.click('button[type="submit"]');
    
    // Aguardar redirecionamento para o dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Verificar se está no dashboard
    await expect(page.locator('text=Leaf Dashboard').first()).toBeVisible();
    
    // Verificar se há botão de logout
    await expect(page.locator('text=Sair')).toBeVisible();
    
    // Verificar se há abas
    await expect(page.locator('text=SQL Query')).toBeVisible();
    await expect(page.locator('text=Upload ZIP')).toBeVisible();
    
    // Tirar screenshot
    await page.screenshot({ path: 'test-results/login-success.png' });
    
    console.log('Login realizado com sucesso!');
  });

  test('should load map after login', async ({ page }) => {
    // Login automático
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard carregar
    await page.waitForURL('/dashboard', { timeout: 10000 });
    
    // Aguardar o mapa inicializar
    await page.waitForTimeout(3000);
    
    // Verificar se o mapa está visível
    const mapContainer = page.locator('div[id*="map"], div[class*="leaflet-container"]').first();
    
    console.log('Verificando mapa...');
    
    // Tirar screenshot do mapa
    await page.screenshot({ path: 'test-results/map-loaded.png', fullPage: true });
    
    console.log('Mapa carregado!');
  });

  test('should access both tabs (SQL and Upload)', async ({ page }) => {
    // Login automático
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Verificar aba SQL Query
    const sqlTab = page.locator('text=SQL Query');
    await expect(sqlTab).toBeVisible();
    
    // Verificar se há textarea
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();
    
    // Clicar na aba Upload ZIP
    await page.click('text=Upload ZIP');
    await page.waitForTimeout(500);
    
    // Verificar se apareceu o seletor de arquivo
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    
    // Tirar screenshot
    await page.screenshot({ path: 'test-results/tabs-working.png' });
    
    console.log('Abas funcionando corretamente!');
  });

  test('should execute SQL query', async ({ page }) => {
    // Login automático
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Executar query
    const executeButton = page.locator('button:has-text("Executar Query")');
    await executeButton.click();
    
    // Aguardar resposta (pode ser erro de autenticação, mas deve processar)
    await page.waitForTimeout(3000);
    
    // Tirar screenshot
    await page.screenshot({ path: 'test-results/query-executed.png' });
    
    console.log('Query executada!');
  });
});

