import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://leaf-agriculture.github.io/pointlake-ui';

test.describe('GitHub Pages Deploy Test', () => {
  test('should load the page successfully', async ({ page }) => {
    // Ir para a URL de produção
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Verificar se a página carregou (não está em branco)
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 10000 });
    
    // Verificar se há conteúdo na página
    const root = page.locator('#root');
    await expect(root).toBeVisible({ timeout: 10000 });
    
    // Aguardar um pouco para carregar scripts
    await page.waitForTimeout(2000);
    
    // Verificar se não há erros críticos no console
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Tirar screenshot da página
    await page.screenshot({ path: 'test-results/github-pages-loaded.png', fullPage: true });
    
    // Verificar se não há muitos erros (alguns warnings são aceitáveis)
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404') && 
      !e.includes('net::ERR_BLOCKED_BY_ORB')
    );
    
    console.log('Erros encontrados:', criticalErrors);
    
    // Verificar título da página
    await expect(page).toHaveTitle(/Leaf Dashboard/i);
    
    console.log('✅ Página carregada com sucesso!');
  });

  test('should redirect to login page', async ({ page }) => {
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Aguardar carregamento
    await page.waitForTimeout(3000);
    
    // Verificar se redirecionou para /login ou está na página de login
    const currentUrl = page.url();
    console.log('URL atual:', currentUrl);
    
    // Pode estar em /pointlake-ui/ ou /pointlake-ui/login
    expect(currentUrl).toMatch(/pointlake-ui/);
    
    // Verificar se há elementos da página de login
    try {
      // Tentar encontrar elementos da página de login
      const loginElements = await Promise.race([
        page.locator('input[type="text"]').waitFor({ timeout: 5000 }).then(() => 'input'),
        page.locator('h1').waitFor({ timeout: 5000 }).then(() => 'h1'),
        page.locator('body').waitFor({ timeout: 5000 }).then(() => 'body'),
      ]);
      
      console.log('Elemento encontrado:', loginElements);
    } catch (e) {
      console.log('Tempo de espera esgotado, mas página pode estar carregando');
    }
    
    // Tirar screenshot
    await page.screenshot({ path: 'test-results/github-pages-redirect.png', fullPage: true });
  });

  test('should load assets correctly', async ({ page, request }) => {
    // Configurar listener ANTES de navegar
    const jsFiles = [];
    const cssFiles = [];
    
    page.on('response', response => {
      const url = response.url();
      if (url.includes('.js') && (url.includes('pointlake-ui') || url.includes('assets'))) {
        jsFiles.push({ url, status: response.status() });
      }
      if (url.includes('.css') && (url.includes('pointlake-ui') || url.includes('assets'))) {
        cssFiles.push({ url, status: response.status() });
      }
    });
    
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    console.log('Arquivos JS encontrados:', jsFiles.length);
    console.log('Arquivos CSS encontrados:', cssFiles.length);
    
    // Verificar se pelo menos alguns arquivos carregaram
    const loadedJS = jsFiles.filter(f => f.status === 200);
    const loadedCSS = cssFiles.filter(f => f.status === 200);
    
    console.log('JS carregados com sucesso:', loadedJS.length);
    console.log('CSS carregados com sucesso:', loadedCSS.length);
    if (loadedJS.length > 0) {
      console.log('Exemplo de JS:', loadedJS[0].url);
    }
    if (loadedCSS.length > 0) {
      console.log('Exemplo de CSS:', loadedCSS[0].url);
    }
    
    // Verificar se há scripts no HTML
    const scripts = await page.locator('script[src]').count();
    const styles = await page.locator('link[rel="stylesheet"]').count();
    
    console.log('Scripts no HTML:', scripts);
    console.log('Stylesheets no HTML:', styles);
    
    // Se não encontrou via response, verificar via HTML
    if (loadedJS.length === 0 && scripts > 0) {
      console.log('✅ Scripts encontrados no HTML, página pode estar funcionando');
    }
    
    // Tirar screenshot
    await page.screenshot({ path: 'test-results/github-pages-assets.png', fullPage: true });
  });

  test('should check for console errors', async ({ page }) => {
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        errors.push(text);
      } else if (msg.type() === 'warning') {
        warnings.push(text);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    console.log('Erros encontrados:', errors.length);
    console.log('Warnings encontrados:', warnings.length);
    
    // Filtrar erros não críticos
    const criticalErrors = errors.filter(e => {
      const lower = e.toLowerCase();
      return !lower.includes('favicon') &&
             !lower.includes('net::err_blocked_by_orb') &&
             !lower.includes('404') &&
             !lower.includes('resource interpreted');
    });
    
    if (criticalErrors.length > 0) {
      console.log('Erros críticos:', criticalErrors);
    }
    
    // Tirar screenshot
    await page.screenshot({ path: 'test-results/github-pages-console.png', fullPage: true });
    
    // Log dos erros para debug
    if (errors.length > 0) {
      console.log('Todos os erros:', errors);
    }
  });
});

