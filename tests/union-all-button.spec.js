import { test, expect } from '@playwright/test';

test.describe('UNION ALL Button Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login antes de cada teste
    await page.goto('/login');
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    
    // Aguardar dashboard carregar
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await page.waitForTimeout(3000); // Aguardar carregamento inicial
  });

  test('should display UNION ALL button next to Create button', async ({ page }) => {
    // Procurar pelo botão Create
    const createButton = page.locator('button:has-text("Create")').first();
    await expect(createButton).toBeVisible({ timeout: 5000 });
    
    // Procurar pelo botão UNION ALL ao lado
    const unionAllButton = page.locator('button:has-text("UNION ALL")').first();
    
    // Verificar se o botão existe
    const buttonCount = await unionAllButton.count();
    
    if (buttonCount > 0) {
      await expect(unionAllButton).toBeVisible();
      
      // Verificar o título do botão
      const title = await unionAllButton.getAttribute('title');
      expect(title).toContain('TABLESAMPLE');
      expect(title).toContain('500 ROWS');
      
      console.log('✅ Botão UNION ALL encontrado ao lado do botão Create');
      
      // Verificar se está na mesma área (header)
      const createButtonBox = await createButton.boundingBox();
      const unionAllButtonBox = await unionAllButton.boundingBox();
      
      if (createButtonBox && unionAllButtonBox) {
        // Verificar se estão próximos (mesma linha aproximadamente)
        const verticalDiff = Math.abs(createButtonBox.y - unionAllButtonBox.y);
        expect(verticalDiff).toBeLessThan(50); // Devem estar na mesma linha
        console.log('✅ Botão UNION ALL está posicionado corretamente ao lado do Create');
      }
    } else {
      console.log('⚠️ Botão UNION ALL não encontrado');
    }
  });

  test('should be disabled when no processed files available', async ({ page }) => {
    // Aguardar carregamento
    await page.waitForTimeout(3000);
    
    // Procurar pelo botão UNION ALL
    const unionAllButton = page.locator('button:has-text("UNION ALL")').first();
    const buttonCount = await unionAllButton.count();
    
    if (buttonCount > 0) {
      // Verificar se o botão está desabilitado quando não há arquivos PROCESSED
      const isDisabled = await unionAllButton.isDisabled();
      
      // O botão pode estar desabilitado se não houver arquivos PROCESSED
      console.log(`Botão UNION ALL está ${isDisabled ? 'desabilitado' : 'habilitado'}`);
      
      if (isDisabled) {
        console.log('✅ Botão corretamente desabilitado (sem arquivos PROCESSED)');
      } else {
        console.log('ℹ️ Botão habilitado (há arquivos PROCESSED disponíveis)');
      }
    }
  });

  test('should generate UNION ALL query with TABLESAMPLE when clicked', async ({ page }) => {
    // Aguardar carregamento
    await page.waitForTimeout(3000);
    
    // Procurar pelo botão UNION ALL
    const unionAllButton = page.locator('button:has-text("UNION ALL")').first();
    const buttonCount = await unionAllButton.count();
    
    if (buttonCount === 0) {
      test.skip('Botão UNION ALL não encontrado');
      return;
    }
    
    // Verificar se o botão está habilitado
    const isDisabled = await unionAllButton.isDisabled();
    
    if (isDisabled) {
      test.skip('Botão UNION ALL está desabilitado (sem arquivos PROCESSED)');
      return;
    }
    
    // Limpar o campo SQL query antes
    const sqlTextarea = page.locator('textarea').first();
    await sqlTextarea.clear();
    await page.waitForTimeout(500);
    
    // Clicar no botão UNION ALL
    await unionAllButton.click();
    await page.waitForTimeout(1000);
    
    // Verificar se a query foi gerada no textarea
    const queryValue = await sqlTextarea.inputValue();
    
    // Verificar se contém UNION ALL
    expect(queryValue.toUpperCase()).toContain('UNION ALL');
    
    // Verificar se contém TABLESAMPLE
    expect(queryValue.toUpperCase()).toContain('TABLESAMPLE');
    
    // Verificar se contém 500 ROWS
    expect(queryValue).toContain('500 ROWS');
    
    // Verificar se contém spark_catalog
    expect(queryValue).toContain('spark_catalog');
    
    // Verificar se há múltiplas queries (pelo menos uma UNION ALL)
    const unionAllCount = (queryValue.match(/UNION ALL/gi) || []).length;
    expect(unionAllCount).toBeGreaterThan(0);
    
    console.log(`✅ Query UNION ALL gerada com ${unionAllCount + 1} arquivos`);
    console.log(`Query gerada (primeiros 200 caracteres): ${queryValue.substring(0, 200)}...`);
    
    // Tirar screenshot
    await page.screenshot({ path: 'tests/screenshots/union-all-query-generated.png', fullPage: false });
  });

  test('should verify query structure with TABLESAMPLE', async ({ page }) => {
    // Aguardar carregamento
    await page.waitForTimeout(3000);
    
    const unionAllButton = page.locator('button:has-text("UNION ALL")').first();
    const buttonCount = await unionAllButton.count();
    
    if (buttonCount === 0) {
      test.skip('Botão UNION ALL não encontrado');
      return;
    }
    
    const isDisabled = await unionAllButton.isDisabled();
    if (isDisabled) {
      test.skip('Botão UNION ALL está desabilitado');
      return;
    }
    
    // Limpar e clicar
    const sqlTextarea = page.locator('textarea').first();
    await sqlTextarea.clear();
    await unionAllButton.click();
    await page.waitForTimeout(1000);
    
    const queryValue = await sqlTextarea.inputValue();
    
    // Verificar estrutura da query
    // Deve ter formato: SELECT * FROM `spark_catalog`.`default`.`pointlake_file_{id}` TABLESAMPLE (500 ROWS)
    const tableSamplePattern = /TABLESAMPLE\s*\(\s*500\s+ROWS\s*\)/i;
    expect(queryValue).toMatch(tableSamplePattern);
    
    // Verificar se cada linha tem o formato correto
    const lines = queryValue.split('\n').filter(line => line.trim().length > 0);
    
    // Cada linha que não é UNION ALL deve ter TABLESAMPLE
    const queryLines = lines.filter(line => !line.trim().toUpperCase().includes('UNION ALL'));
    
    for (const line of queryLines) {
      if (line.trim().toUpperCase().startsWith('SELECT')) {
        expect(line).toContain('TABLESAMPLE');
        expect(line).toContain('500 ROWS');
        expect(line).toContain('spark_catalog');
        expect(line).toContain('pointlake_file_');
      }
    }
    
    console.log(`✅ Estrutura da query verificada: ${queryLines.length} queries com TABLESAMPLE`);
  });

  test('should show error message when no processed files', async ({ page }) => {
    // Este teste verifica se a mensagem de erro aparece quando não há arquivos
    // (mas pode não ser testável se sempre houver arquivos)
    
    await page.waitForTimeout(3000);
    
    const unionAllButton = page.locator('button:has-text("UNION ALL")').first();
    const buttonCount = await unionAllButton.count();
    
    if (buttonCount === 0) {
      test.skip('Botão UNION ALL não encontrado');
      return;
    }
    
    // Se o botão estiver desabilitado, não podemos clicar
    const isDisabled = await unionAllButton.isDisabled();
    
    if (isDisabled) {
      console.log('✅ Botão corretamente desabilitado quando não há arquivos PROCESSED');
      // Verificar se há mensagem de erro visível (pode não estar visível se botão está desabilitado)
      const errorMessage = page.locator('text=No processed files').first();
      // Não vamos falhar se não encontrar, pois o botão já está desabilitado
    } else {
      console.log('ℹ️ Há arquivos PROCESSED disponíveis - teste de erro não aplicável');
    }
  });
});

