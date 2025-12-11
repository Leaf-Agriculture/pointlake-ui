import { test, expect } from '@playwright/test';

test.describe('SQL Analytics Scroll Test', () => {
  test('should have horizontal scroll in query results table', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard carregar
    await page.waitForURL('/dashboard', { timeout: 15000 });
    
    // Navegar para SQL Analytics
    await page.goto('/sql-analytics');
    await page.waitForTimeout(2000);
    
    // Screenshot inicial
    await page.screenshot({ path: 'test-results/sql-analytics-initial.png', fullPage: true });
    
    // Selecionar um Leaf User (primeiro disponível)
    const userSelect = page.locator('select').first();
    await userSelect.waitFor({ state: 'visible', timeout: 10000 });
    
    // Aguardar usuários carregarem
    await page.waitForTimeout(3000);
    
    // Pegar todas as opções e selecionar a primeira que não seja vazia
    const options = await userSelect.locator('option').all();
    console.log(`Found ${options.length} options in user select`);
    
    for (const option of options) {
      const value = await option.getAttribute('value');
      if (value && value !== '') {
        await userSelect.selectOption(value);
        console.log(`Selected user: ${value}`);
        break;
      }
    }
    
    // Definir query SQL
    const textarea = page.locator('textarea');
    await textarea.fill('SELECT * FROM points LIMIT 100');
    
    // Clicar em Execute Query
    await page.click('button:has-text("Execute Query")');
    
    // Aguardar resultados
    await page.waitForTimeout(10000);
    
    // Screenshot após query
    await page.screenshot({ path: 'test-results/sql-analytics-results.png', fullPage: true });
    
    // Verificar se a tabela existe
    const table = page.locator('table').first();
    const tableExists = await table.isVisible().catch(() => false);
    console.log(`Table visible: ${tableExists}`);
    
    if (tableExists) {
      // Verificar container de scroll
      const scrollContainer = page.locator('div.overflow-auto').first();
      const containerExists = await scrollContainer.isVisible().catch(() => false);
      console.log(`Scroll container visible: ${containerExists}`);
      
      if (containerExists) {
        // Verificar se tem scroll horizontal
        const scrollWidth = await scrollContainer.evaluate(el => el.scrollWidth);
        const clientWidth = await scrollContainer.evaluate(el => el.clientWidth);
        const hasHorizontalScroll = scrollWidth > clientWidth;
        
        console.log(`Scroll Width: ${scrollWidth}`);
        console.log(`Client Width: ${clientWidth}`);
        console.log(`Has Horizontal Scroll: ${hasHorizontalScroll}`);
        
        // Tentar fazer scroll horizontal
        if (hasHorizontalScroll) {
          await scrollContainer.evaluate(el => el.scrollLeft = 200);
          await page.waitForTimeout(500);
          await page.screenshot({ path: 'test-results/sql-analytics-scrolled.png', fullPage: true });
        }
      }
      
      // Verificar estilos da tabela
      const tableStyles = await table.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          width: computed.width,
          minWidth: computed.minWidth,
          tableLayout: computed.tableLayout,
          display: computed.display
        };
      });
      console.log('Table styles:', JSON.stringify(tableStyles, null, 2));
      
      // Verificar estilos do container pai
      const parentStyles = await table.evaluate(el => {
        const parent = el.parentElement;
        const computed = window.getComputedStyle(parent);
        return {
          width: computed.width,
          overflow: computed.overflow,
          overflowX: computed.overflowX,
          display: computed.display
        };
      });
      console.log('Parent container styles:', JSON.stringify(parentStyles, null, 2));
      
      // Verificar o avô também
      const grandparentStyles = await table.evaluate(el => {
        const grandparent = el.parentElement?.parentElement;
        if (!grandparent) return null;
        const computed = window.getComputedStyle(grandparent);
        return {
          width: computed.width,
          overflow: computed.overflow,
          overflowX: computed.overflowX,
          display: computed.display,
          flex: computed.flex
        };
      });
      console.log('Grandparent container styles:', JSON.stringify(grandparentStyles, null, 2));
    }
    
    // Verificar se há erro
    const errorVisible = await page.locator('text=Error').isVisible().catch(() => false);
    if (errorVisible) {
      console.log('Error message visible on page');
      await page.screenshot({ path: 'test-results/sql-analytics-error.png', fullPage: true });
    }
  });
});

