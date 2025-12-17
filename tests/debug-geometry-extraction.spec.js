// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Debug Geometry Extraction', () => {
  test.setTimeout(120000);

  test('debug geometry extraction from SQL query', async ({ page }) => {
    // Capturar logs do console
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({ type: msg.type(), text });
      // Mostrar logs importantes
      if (text.includes('📍') || text.includes('📊') || text.includes('🗺️') || text.includes('❌') || text.includes('⚠️')) {
        console.log(`[${msg.type()}] ${text}`);
      }
    });

    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.click('button:has-text("DEV")');
    await page.fill('input[id="username"]', 'luiz@withleaf.io');
    await page.fill('input[id="password"]', 'demo');
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log('✅ Login OK');

    // 2. SQL Analytics
    await page.goto('http://localhost:3000/sql-analytics');
    await page.waitForLoadState('networkidle');
    
    // 3. Selecionar usuário
    const userSelect = page.locator('select').first();
    await userSelect.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const options = await userSelect.locator('option').allTextContents();
    const luizOption = options.find(opt => opt.toLowerCase().includes('luiz@luiz'));
    if (luizOption) {
      await userSelect.selectOption({ label: luizOption });
    }

    // 4. Executar query
    const queryTextarea = page.locator('textarea');
    await queryTextarea.fill('SELECT geometry FROM points WHERE seedRate > -46140 AND seedRate < 83224');
    await page.click('button:has-text("Execute Query")');
    
    // 5. Aguardar resultados
    await page.waitForSelector('text=/Showing .* of .* records/i', { timeout: 90000 });
    console.log('✅ Query executada');
    
    // 6. Aguardar processamento
    await page.waitForTimeout(5000);
    
    // 7. Mostrar logs relevantes
    console.log('\n=== CONSOLE LOGS ===');
    consoleLogs.forEach(log => {
      if (log.text.includes('geometry') || log.text.includes('Point') || 
          log.text.includes('coords') || log.text.includes('Extraction') ||
          log.text.includes('Map data') || log.text.includes('📍') ||
          log.text.includes('📊') || log.text.includes('🗺️')) {
        console.log(`[${log.type}] ${log.text}`);
      }
    });
    
    // 8. Verificar estado do mapData
    const mapDataState = await page.evaluate(() => {
      // @ts-ignore - acessar estado React via __REACT_DEVTOOLS_GLOBAL_HOOK__ ou window
      const reactRoot = document.getElementById('root');
      // Tentar encontrar o estado via DOM
      const resultsText = document.querySelector('[class*="Query Results"]')?.textContent || '';
      const mapContainer = document.querySelector('.leaflet-container');
      const hasMap = !!mapContainer;
      const markerPane = document.querySelector('.leaflet-marker-pane');
      const overlayPane = document.querySelector('.leaflet-overlay-pane');
      
      return {
        resultsText,
        hasMap,
        hasMarkerPane: !!markerPane,
        markerCount: markerPane?.children.length || 0,
        hasOverlayPane: !!overlayPane,
        overlayContent: overlayPane?.innerHTML.substring(0, 500) || 'empty'
      };
    });
    
    console.log('\n=== MAP STATE ===');
    console.log(JSON.stringify(mapDataState, null, 2));
    
    // 9. Screenshot
    await page.screenshot({ path: 'test-results/debug-geometry.png', fullPage: true });
    
    // 10. Verificar se encontrou o problema
    const extractionLogs = consoleLogs.filter(l => l.text.includes('Extraction results'));
    if (extractionLogs.length > 0) {
      console.log('\n=== EXTRACTION RESULTS ===');
      extractionLogs.forEach(l => console.log(l.text));
    }
  });
});


