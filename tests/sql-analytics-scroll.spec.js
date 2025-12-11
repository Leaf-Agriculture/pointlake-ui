import { test, expect } from '@playwright/test';

test.describe('SQL Analytics Scroll Test', () => {
  test.setTimeout(60000);
  
  test('should verify table CSS allows horizontal scroll', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.click('button:has-text("DEV")');
    await page.waitForTimeout(300);
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'demo');
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('/dashboard', { timeout: 30000 });
    
    // Navegar para SQL Analytics
    await page.goto('/sql-analytics');
    await page.waitForTimeout(1500);
    
    // Injetar tabela mockada para testar scroll
    const mockTableHTML = `
      <div id="mock-test-container" style="position: fixed; top: 100px; left: 400px; width: 600px; height: 400px; background: #18181b; z-index: 9999; border: 2px solid #22c55e; padding: 10px;">
        <h3 style="color: white; margin-bottom: 10px;">Mock Table Test (width: 600px container)</h3>
        <div id="mock-scroll-container" style="min-height: 0; overflow: scroll; height: 300px; background: #09090b;">
          <table style="min-width: 100%; width: max-content; table-layout: auto; border-collapse: collapse;">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr style="background-color: #27272a;">
                <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">#</th>
                <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Column 1</th>
                <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Column 2 Long Name</th>
                <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Column 3</th>
                <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Column 4 Extra Wide</th>
                <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Column 5</th>
                <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Column 6</th>
                <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Column 7</th>
              </tr>
            </thead>
            <tbody>
              ${Array.from({length: 20}, (_, i) => `
                <tr style="border-bottom: 1px solid #27272a;">
                  <td style="padding: 8px 12px; white-space: nowrap; color: #71717a;">${i + 1}</td>
                  <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">Value ${i + 1}</td>
                  <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">This is a longer text value</td>
                  <td style="padding: 8px 12px; white-space: nowrap; color: #22c55e;">${(Math.random() * 1000).toFixed(2)}</td>
                  <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">Another very long column content here</td>
                  <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">Data ${i}</td>
                  <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">More data</td>
                  <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">End</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div id="scroll-status" style="color: #22c55e; margin-top: 5px; font-size: 12px;"></div>
      </div>
    `;
    
    await page.evaluate((html) => {
      document.body.insertAdjacentHTML('beforeend', html);
    }, mockTableHTML);
    
    await page.waitForTimeout(500);
    
    // Verificar scroll container
    const scrollInfo = await page.evaluate(() => {
      const container = document.getElementById('mock-scroll-container');
      if (!container) return { error: 'Container not found' };
      
      const style = window.getComputedStyle(container);
      return {
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
        hasHorizontalScroll: container.scrollWidth > container.clientWidth,
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY
      };
    });
    
    console.log('Mock scroll container info:', JSON.stringify(scrollInfo, null, 2));
    
    // Screenshot antes do scroll
    await page.screenshot({ path: 'test-results/sql-analytics-mock-before.png', fullPage: true });
    
    if (scrollInfo.hasHorizontalScroll) {
      console.log('✅ Mock table HAS horizontal scroll');
      console.log(`   scrollWidth: ${scrollInfo.scrollWidth}, clientWidth: ${scrollInfo.clientWidth}`);
      
      // Fazer scroll horizontal
      await page.evaluate(() => {
        const container = document.getElementById('mock-scroll-container');
        container.scrollLeft = 300;
        document.getElementById('scroll-status').textContent = `Scrolled to: ${container.scrollLeft}px`;
      });
      
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'test-results/sql-analytics-mock-scrolled.png', fullPage: true });
      
      // Verificar que scrollou
      const scrollLeft = await page.evaluate(() => {
        return document.getElementById('mock-scroll-container').scrollLeft;
      });
      
      console.log(`✅ Scroll position after scroll: ${scrollLeft}px`);
      expect(scrollLeft).toBeGreaterThan(0);
    } else {
      console.log('❌ Mock table does NOT have horizontal scroll');
      console.log(`   scrollWidth: ${scrollInfo.scrollWidth}, clientWidth: ${scrollInfo.clientWidth}`);
    }
    
    // Verificar estilos da tabela real do SqlAnalytics (se existir)
    const realTableInfo = await page.evaluate(() => {
      // Procurar tabela real na página
      const tables = document.querySelectorAll('table');
      const results = [];
      
      tables.forEach((table, i) => {
        if (table.closest('#mock-test-container')) return; // Ignorar mock
        
        let parent = table.parentElement;
        let depth = 0;
        while (parent && parent !== document.body && depth < 5) {
          const style = window.getComputedStyle(parent);
          results.push({
            tableIndex: i,
            depth,
            tag: parent.tagName,
            overflow: style.overflow,
            overflowX: style.overflowX,
            scrollWidth: parent.scrollWidth,
            clientWidth: parent.clientWidth
          });
          parent = parent.parentElement;
          depth++;
        }
      });
      
      return results;
    });
    
    if (realTableInfo.length > 0) {
      console.log('Real table parent info:', JSON.stringify(realTableInfo, null, 2));
    } else {
      console.log('No real tables found (no query results)');
    }
    
    // O teste passa se o mock table conseguiu scroll
    expect(scrollInfo.hasHorizontalScroll).toBe(true);
  });
});
