import { test, expect } from '@playwright/test';

test.describe('SQL Analytics Debug Scroll', () => {
  test.setTimeout(120000);
  
  test('debug why horizontal scroll is not working', async ({ page }) => {
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
    await page.waitForTimeout(2000);
    
    // Selecionar primeiro usuário
    const userSelect = page.locator('select').first();
    await userSelect.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    const options = await userSelect.locator('option').all();
    for (const option of options) {
      const value = await option.getAttribute('value');
      if (value && value !== '') {
        await userSelect.selectOption(value);
        break;
      }
    }
    
    // Executar query
    const textarea = page.locator('textarea');
    await textarea.fill('SELECT * FROM points LIMIT 100');
    await page.click('button:has-text("Execute Query")');
    
    // Esperar por resultados
    await page.waitForTimeout(15000);
    
    // Screenshot da página
    await page.screenshot({ path: 'test-results/debug-scroll-page.png', fullPage: true });
    
    // Verificar se há tabela
    const tables = await page.locator('table').all();
    console.log(`\n=== Found ${tables.length} tables ===\n`);
    
    if (tables.length === 0) {
      console.log('❌ No tables found - query might have returned 0 results');
      
      // Injetar uma tabela de teste para verificar CSS
      console.log('\n=== Injecting test table to verify CSS ===\n');
      
      await page.evaluate(() => {
        // Encontrar o container de resultados (área direita)
        const rightPanel = document.querySelector('.flex-1.flex.flex-col');
        if (!rightPanel) {
          console.log('Right panel not found');
          return;
        }
        
        // Criar tabela de teste
        const testContainer = document.createElement('div');
        testContainer.id = 'test-scroll-container';
        testContainer.innerHTML = `
          <div style="padding: 16px; background: #09090b;">
            <h3 style="color: white; margin-bottom: 8px;">Test Table (injected)</h3>
            <div id="test-table-wrapper" class="flex-1 relative" style="min-height: 0; overflow: scroll; max-height: 400px; background: #18181b;">
              <table style="min-width: 100%; width: max-content; table-layout: auto; border-collapse: collapse;">
                <thead class="sticky top-0 z-10">
                  <tr style="background-color: #27272a;">
                    <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">#</th>
                    <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">ID</th>
                    <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Name Column</th>
                    <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Very Long Column Name Here</th>
                    <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Another Column</th>
                    <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Extra Wide Column Content</th>
                    <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Col 7</th>
                    <th style="padding: 8px 12px; white-space: nowrap; background-color: #27272a; border-bottom: 1px solid #3f3f46; color: #a1a1aa;">Col 8</th>
                  </tr>
                </thead>
                <tbody>
                  ${Array.from({length: 20}, (_, i) => `
                    <tr style="border-bottom: 1px solid #27272a;">
                      <td style="padding: 8px 12px; white-space: nowrap; color: #71717a;">${i + 1}</td>
                      <td style="padding: 8px 12px; white-space: nowrap; color: #22c55e;">${1000 + i}</td>
                      <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">Test Value ${i}</td>
                      <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">This is a very long content that should extend the table</td>
                      <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">Another value here</td>
                      <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">Even more content to make table wider</td>
                      <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">Data ${i}</td>
                      <td style="padding: 8px 12px; white-space: nowrap; color: #d4d4d8;">End</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div id="scroll-debug-info" style="margin-top: 8px; padding: 8px; background: #27272a; border-radius: 4px; font-size: 12px; color: #a1a1aa;"></div>
          </div>
        `;
        
        // Inserir no início do painel direito
        rightPanel.insertBefore(testContainer, rightPanel.firstChild);
      });
      
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/debug-scroll-with-test-table.png', fullPage: true });
    }
    
    // Analisar todos os elementos da tabela
    const scrollAnalysis = await page.evaluate(() => {
      const results = {
        tables: [],
        scrollContainers: []
      };
      
      // Analisar todas as tabelas
      document.querySelectorAll('table').forEach((table, i) => {
        const tableRect = table.getBoundingClientRect();
        const tableStyle = window.getComputedStyle(table);
        
        results.tables.push({
          index: i,
          width: tableRect.width,
          styleWidth: tableStyle.width,
          styleMinWidth: tableStyle.minWidth,
          tableLayout: tableStyle.tableLayout
        });
        
        // Analisar a cadeia de parents
        let parent = table.parentElement;
        let depth = 0;
        const parentChain = [];
        
        while (parent && parent !== document.body && depth < 10) {
          const style = window.getComputedStyle(parent);
          const rect = parent.getBoundingClientRect();
          
          parentChain.push({
            depth,
            tag: parent.tagName,
            id: parent.id || '',
            class: parent.className.substring(0, 100),
            width: rect.width,
            height: rect.height,
            overflow: style.overflow,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            display: style.display,
            flex: style.flex,
            flexDirection: style.flexDirection,
            scrollWidth: parent.scrollWidth,
            clientWidth: parent.clientWidth,
            hasHScroll: parent.scrollWidth > parent.clientWidth,
            scrollLeft: parent.scrollLeft
          });
          
          parent = parent.parentElement;
          depth++;
        }
        
        results.scrollContainers.push({
          tableIndex: i,
          parentChain
        });
      });
      
      // Verificar container de teste se existir
      const testWrapper = document.getElementById('test-table-wrapper');
      if (testWrapper) {
        const debugInfo = document.getElementById('scroll-debug-info');
        const info = {
          scrollWidth: testWrapper.scrollWidth,
          clientWidth: testWrapper.clientWidth,
          hasScroll: testWrapper.scrollWidth > testWrapper.clientWidth,
          overflow: window.getComputedStyle(testWrapper).overflow
        };
        if (debugInfo) {
          debugInfo.textContent = `scrollWidth: ${info.scrollWidth}, clientWidth: ${info.clientWidth}, hasScroll: ${info.hasScroll}, overflow: ${info.overflow}`;
        }
        results.testContainer = info;
      }
      
      return results;
    });
    
    console.log('\n=== SCROLL ANALYSIS ===\n');
    console.log('Tables found:', scrollAnalysis.tables.length);
    
    scrollAnalysis.tables.forEach((table, i) => {
      console.log(`\nTable ${i}:`);
      console.log(`  Width: ${table.width}px`);
      console.log(`  Style width: ${table.styleWidth}`);
      console.log(`  Style minWidth: ${table.styleMinWidth}`);
      console.log(`  Table layout: ${table.tableLayout}`);
    });
    
    console.log('\n=== PARENT CHAIN ANALYSIS ===\n');
    
    scrollAnalysis.scrollContainers.forEach((container, i) => {
      console.log(`\nTable ${i} parent chain:`);
      container.parentChain.forEach(parent => {
        const scrollStatus = parent.hasHScroll ? '✅ HAS SCROLL' : '❌ NO SCROLL';
        console.log(`  [${parent.depth}] ${parent.tag}${parent.id ? '#'+parent.id : ''}`);
        console.log(`      class: ${parent.class.substring(0, 60)}...`);
        console.log(`      size: ${parent.width.toFixed(0)}x${parent.height.toFixed(0)}`);
        console.log(`      overflow: ${parent.overflow} (x: ${parent.overflowX}, y: ${parent.overflowY})`);
        console.log(`      scrollWidth: ${parent.scrollWidth}, clientWidth: ${parent.clientWidth}`);
        console.log(`      ${scrollStatus}`);
      });
    });
    
    if (scrollAnalysis.testContainer) {
      console.log('\n=== TEST CONTAINER ===\n');
      console.log('Test container scroll info:', scrollAnalysis.testContainer);
    }
    
    // Tentar scroll no container de teste
    if (scrollAnalysis.testContainer?.hasScroll) {
      console.log('\n✅ Test container has horizontal scroll - attempting to scroll...');
      
      await page.evaluate(() => {
        const testWrapper = document.getElementById('test-table-wrapper');
        if (testWrapper) {
          testWrapper.scrollLeft = 200;
        }
      });
      
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'test-results/debug-scroll-after-scroll.png', fullPage: true });
      
      const scrollLeft = await page.evaluate(() => {
        const testWrapper = document.getElementById('test-table-wrapper');
        return testWrapper ? testWrapper.scrollLeft : 0;
      });
      
      console.log(`Scroll position after scroll: ${scrollLeft}px`);
      
      if (scrollLeft > 0) {
        console.log('✅ Horizontal scroll WORKS on test container');
      } else {
        console.log('❌ Horizontal scroll FAILED on test container');
      }
    }
    
    // Verificar o problema específico
    console.log('\n=== DIAGNOSIS ===\n');
    
    let foundScrollableContainer = false;
    scrollAnalysis.scrollContainers.forEach((container, i) => {
      const scrollableParent = container.parentChain.find(p => 
        (p.overflow === 'scroll' || p.overflow === 'auto' || p.overflowX === 'scroll' || p.overflowX === 'auto')
      );
      
      if (scrollableParent) {
        console.log(`Table ${i}: Found scrollable container at depth ${scrollableParent.depth}`);
        console.log(`  Has actual scroll: ${scrollableParent.hasHScroll}`);
        
        if (!scrollableParent.hasHScroll) {
          console.log(`  ⚠️ Container has overflow:scroll but scrollWidth (${scrollableParent.scrollWidth}) <= clientWidth (${scrollableParent.clientWidth})`);
          console.log(`  This means the content is NOT wider than the container`);
          console.log(`  Check if table has 'width: max-content' style`);
        }
        foundScrollableContainer = true;
      }
    });
    
    if (!foundScrollableContainer) {
      console.log('❌ No scrollable container found in parent chain!');
      console.log('The table container needs overflow: scroll or auto');
    }
  });
});

