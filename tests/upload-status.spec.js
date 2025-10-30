import { test, expect } from '@playwright/test';

test.describe('Upload Status Feature', () => {
  test('should show upload interface', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Verificar elementos de upload (que estão sempre visíveis no dashboard)
    await expect(page.locator('text=Upload File')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    console.log('Interface de upload carregada!');
  });

  test('should validate file format', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Verificar que o input aceita apenas .zip
    const fileInput = page.locator('input[type="file"]');
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toBe('.zip');
    
    console.log('Validação de formato funcionando!');
  });

  test('should have upload button', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Verificar se o botão de upload existe
    const uploadButton = page.locator('button:has-text("Upload File")');
    await expect(uploadButton).toBeVisible();
    
    console.log('Botão de upload presente!');
  });

  test('should display file list', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Verificar se há área de lista de arquivos (pode estar vazia)
    const filesList = page.locator('[class*="space-y-2"]').first();
    await expect(filesList).toBeVisible();
    
    console.log('Lista de arquivos exibida!');
  });
});

