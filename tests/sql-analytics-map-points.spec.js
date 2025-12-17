// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('SQL Analytics - Map Points Display', () => {
  test.setTimeout(120000); // 2 minutos para o teste completo

  test('should display points on map when query returns only geometry field', async ({ page }) => {
    // 1. Navegar para login
    await page.goto('http://localhost:3000/login');
    
    // 2. Selecionar ambiente DEV
    await page.click('button:has-text("DEV")');
    
    // 3. Fazer login
    await page.fill('input[id="username"]', 'luiz@withleaf.io');
    await page.fill('input[id="password"]', 'demo');
    await page.click('button:has-text("Entrar")');
    
    // 4. Aguardar redirecionamento para dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log('✅ Login successful, redirected to dashboard');
    
    // 5. Navegar para SQL Analytics
    await page.goto('http://localhost:3000/sql-analytics');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to SQL Analytics');
    
    // 6. Selecionar o Leaf User "luiz@luiz"
    const userSelect = page.locator('select').first();
    await userSelect.waitFor({ state: 'visible', timeout: 10000 });
    
    // Aguardar os usuários carregarem
    await page.waitForTimeout(2000);
    
    // Tentar encontrar e selecionar o usuário
    const options = await userSelect.locator('option').allTextContents();
    console.log('📋 Available users:', options);
    
    // Procurar pelo usuário que contém "luiz"
    const luizOption = options.find(opt => opt.toLowerCase().includes('luiz'));
    if (luizOption) {
      await userSelect.selectOption({ label: luizOption });
      console.log('✅ Selected user:', luizOption);
    } else {
      console.log('⚠️ User luiz not found, using first available user');
      if (options.length > 1) {
        await userSelect.selectOption({ index: 1 });
      }
    }
    
    // 7. Limpar e inserir a query SQL
    const queryTextarea = page.locator('textarea');
    await queryTextarea.click();
    await queryTextarea.fill('SELECT geometry FROM points WHERE seedRate > -46140 AND seedRate < 83224');
    console.log('✅ Query entered');
    
    // 8. Executar a query
    await page.click('button:has-text("Execute Query")');
    console.log('⏳ Executing query...');
    
    // 9. Aguardar resultados (pode demorar)
    await page.waitForSelector('text=/Showing .* of .* records/i', { timeout: 90000 });
    console.log('✅ Query results received');
    
    // 10. Verificar se o mapa tem pontos renderizados
    // O mapa Leaflet deve ter elementos de círculo ou marcadores
    await page.waitForTimeout(3000); // Aguardar renderização do mapa
    
    // Verificar se há círculos no mapa (os pontos são renderizados como circleMarkers)
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
    
    // Verificar se há camadas de overlay (onde os pontos são renderizados)
    const overlayPane = page.locator('.leaflet-overlay-pane');
    await expect(overlayPane).toBeVisible();
    
    // Verificar se há SVG ou Canvas com elementos (indicando que pontos foram renderizados)
    const hasMapContent = await page.evaluate(() => {
      const overlayPane = document.querySelector('.leaflet-overlay-pane');
      if (!overlayPane) return false;
      
      // Verificar SVG paths ou circles
      const svgElements = overlayPane.querySelectorAll('path, circle');
      if (svgElements.length > 0) return true;
      
      // Verificar canvas (usado para muitos pontos)
      const canvas = overlayPane.querySelector('canvas');
      if (canvas) return true;
      
      // Verificar marker-pane também
      const markerPane = document.querySelector('.leaflet-marker-pane');
      if (markerPane && markerPane.children.length > 0) return true;
      
      return false;
    });
    
    console.log('🗺️ Map has content:', hasMapContent);
    expect(hasMapContent).toBe(true);
    
    // 11. Verificar que os pontos não estão todos no mesmo local
    // Pegando os bounds do mapa para verificar se há spread geográfico
    const mapBounds = await page.evaluate(() => {
      // @ts-ignore
      const mapInstance = document.querySelector('.leaflet-container')?._leaflet_map;
      if (mapInstance) {
        const bounds = mapInstance.getBounds();
        return {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        };
      }
      return null;
    });
    
    if (mapBounds) {
      console.log('🗺️ Map bounds:', mapBounds);
      // Verificar se o mapa tem algum spread (não está em zoom máximo em um único ponto)
      const latSpread = Math.abs(mapBounds.north - mapBounds.south);
      const lngSpread = Math.abs(mapBounds.east - mapBounds.west);
      console.log('📏 Geographic spread - Lat:', latSpread, 'Lng:', lngSpread);
      
      // Se os pontos estivessem todos no mesmo lugar, o spread seria muito pequeno
      expect(latSpread).toBeGreaterThan(0.0001);
      expect(lngSpread).toBeGreaterThan(0.0001);
    }
    
    // 12. Tirar screenshot para verificação visual
    await page.screenshot({ path: 'test-results/sql-analytics-map-points.png', fullPage: true });
    console.log('📸 Screenshot saved to test-results/sql-analytics-map-points.png');
    
    console.log('✅ Test completed successfully!');
  });
});


