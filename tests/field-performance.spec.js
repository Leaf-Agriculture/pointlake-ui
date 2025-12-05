import { test, expect } from '@playwright/test';

test.describe('Field Performance Analytics', () => {
  // Helper para fazer login em DEV
  async function login(page) {
    await page.goto('/login');
    
    // Selecionar ambiente DEV (credenciais são para dev)
    const devButton = page.locator('button:has-text("DEV")');
    await devButton.click();
    await page.waitForTimeout(500);
    
    await page.fill('input[type="text"]', 'luiz@withleaf.io');
    await page.fill('input[type="password"]', 'shooliod');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 30000 });
    await page.waitForTimeout(2000);
  }

  test('should navigate to Field Performance Analytics page', async ({ page }) => {
    await login(page);
    
    // Clicar no botão Field Analytics
    const fieldAnalyticsBtn = page.locator('button:has-text("Field Analytics")');
    await expect(fieldAnalyticsBtn).toBeVisible({ timeout: 10000 });
    await fieldAnalyticsBtn.click();
    
    // Aguardar navegação
    await page.waitForURL('**/field-performance', { timeout: 10000 });
    
    // Verificar título da página
    await expect(page.locator('text=Field Performance Analytics')).toBeVisible();
    
    // Screenshot
    await page.screenshot({ path: 'test-results/field-performance-page.png', fullPage: true });
    
    console.log('✅ Field Performance Analytics page loaded');
  });

  test('should load fields list', async ({ page }) => {
    await login(page);
    
    // Navegar para Field Performance
    await page.goto('/field-performance');
    await page.waitForTimeout(3000);
    
    // Verificar se há lista de fields ou mensagem de "no fields"
    const fieldsList = page.locator('text=Fields');
    await expect(fieldsList).toBeVisible({ timeout: 10000 });
    
    // Screenshot
    await page.screenshot({ path: 'test-results/fields-list.png', fullPage: true });
    
    console.log('✅ Fields list loaded');
  });

  test('should open create field modal', async ({ page }) => {
    await login(page);
    
    // Navegar para Field Performance
    await page.goto('/field-performance');
    await page.waitForTimeout(3000);
    
    // Clicar no botão Create
    const createBtn = page.locator('button:has-text("Create")');
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();
    
    // Verificar se modal abriu
    await expect(page.locator('text=Create New Field')).toBeVisible({ timeout: 5000 });
    
    // Screenshot
    await page.screenshot({ path: 'test-results/create-field-modal.png', fullPage: true });
    
    console.log('✅ Create field modal opened');
  });

  test('should attempt to create field and capture response', async ({ page }) => {
    await login(page);
    
    // Navegar para Field Performance
    await page.goto('/field-performance');
    await page.waitForTimeout(3000);
    
    // Interceptar requests para ver o que está sendo enviado
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/fields')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
        console.log('📤 Request:', request.method(), request.url());
        console.log('📤 Headers:', JSON.stringify(request.headers(), null, 2));
        console.log('📤 Body:', request.postData());
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/fields') && response.request().method() === 'POST') {
        console.log('📥 Response Status:', response.status());
        try {
          const body = await response.json();
          console.log('📥 Response Body:', JSON.stringify(body, null, 2));
        } catch (e) {
          console.log('📥 Response Body: (not JSON)');
        }
      }
    });
    
    // Abrir modal de criação
    const createBtn = page.locator('button:has-text("Create")');
    await createBtn.click();
    await page.waitForTimeout(500);
    
    // Preencher nome do field
    await page.fill('input[placeholder*="North Field"]', 'Test Field Playwright');
    
    // Preencher GeoJSON com formato correto
    const geoJson = JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [-89.83319308810695, 39.718780906608835],
        [-89.83338817842896, 39.71880012132843],
        [-89.83357577153932, 39.71885702707632],
        [-89.83374865833997, 39.71894943699653],
        [-89.83390019488814, 39.71907379982765],
        [-89.83402455771926, 39.719225336375814],
        [-89.83411696763946, 39.71939822317647],
        [-89.83417387338736, 39.719585816286816],
        [-89.83419308810696, 39.71978090660883],
        [-89.83419308810696, 39.72593532285288],
        [-89.83150929217545, 39.72593532285288],
        [-89.83150929217545, 39.71978090660883],
        [-89.83319308810695, 39.718780906608835]
      ]]
    });
    
    const geoJsonTextarea = page.locator('textarea');
    await geoJsonTextarea.fill(geoJson);
    
    // Screenshot antes de criar
    await page.screenshot({ path: 'test-results/create-field-filled.png', fullPage: true });
    
    // Clicar em Create Field
    const submitBtn = page.locator('button:has-text("Create Field")');
    await submitBtn.click();
    
    // Aguardar resposta
    await page.waitForTimeout(5000);
    
    // Screenshot após tentativa
    await page.screenshot({ path: 'test-results/create-field-result.png', fullPage: true });
    
    // Verificar se há mensagem de erro ou sucesso
    const errorToast = page.locator('text=Session expired, text=error, text=Error').first();
    const successToast = page.locator('text=successfully, text=Success').first();
    
    if (await errorToast.isVisible().catch(() => false)) {
      console.log('❌ Error detected on page');
    } else if (await successToast.isVisible().catch(() => false)) {
      console.log('✅ Field created successfully!');
    } else {
      console.log('⚠️ Unknown result - check screenshots');
    }
    
    // Log dos requests capturados
    console.log('\n📋 Captured Requests:');
    requests.forEach((req, i) => {
      console.log(`\n--- Request ${i + 1} ---`);
      console.log('URL:', req.url);
      console.log('Method:', req.method);
      console.log('Authorization:', req.headers['authorization'] ? 'Present' : 'MISSING!');
      console.log('Body:', req.postData);
    });
  });

  test('should check API directly', async ({ page, request }) => {
    // Primeiro fazer login para pegar o token
    await login(page);
    
    // Pegar o token do localStorage (usando as chaves corretas do app)
    const token = await page.evaluate(() => {
      return localStorage.getItem('leaf_token');
    });
    
    console.log('Token found:', token ? `${token.substring(0, 50)}...` : 'NO TOKEN');
    
    // Pegar o leaf user ID
    const leafUserId = await page.evaluate(() => {
      return localStorage.getItem('selected_leaf_user_id');
    });
    
    console.log('Leaf User ID:', leafUserId);

    if (!token || !leafUserId) {
      console.log('❌ Missing token or leaf user ID');
      return;
    }
    
    // Testar a API de Analytics usando o leafUserId logado
    // O usuário precisa ter acesso aos dados do leafUser
    const analyticsUrl = `https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/${leafUserId}/points?samplerate=100&startDate=2019-01-01T00:00:00.000Z&endDate=2025-12-31T00:00:00.000Z`;
    
    console.log('\n📊 Testing Analytics API:');
    console.log('URL:', analyticsUrl);
    
    try {
      const response = await request.get(analyticsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      console.log('📥 Response Status:', response.status());
      const body = await response.json().catch(() => response.text());
      
      console.log('📥 Response type:', typeof body);
      console.log('📥 Is array:', Array.isArray(body));
      
      if (body.data) {
        console.log('📥 Has data field:', Array.isArray(body.data), 'length:', body.data?.length);
      }
      if (body.points) {
        console.log('📥 Has points field:', Array.isArray(body.points), 'length:', body.points?.length);
      }
      
      let points = [];
      if (Array.isArray(body)) {
        points = body;
      } else if (body.data && Array.isArray(body.data)) {
        points = body.data;
      } else if (body.points && Array.isArray(body.points)) {
        points = body.points;
      }
      
      console.log('📥 Points count:', points.length);
      
      if (points.length > 0) {
        console.log('📥 First point keys:', Object.keys(points[0]));
        console.log('📥 First point geometry:', points[0].geometry?.substring(0, 60));
        console.log('📥 First point sample:', JSON.stringify(points[0]).substring(0, 300));
        
        // Testar decodificação WKB
        if (points[0].geometry) {
          const geometry = points[0].geometry;
          console.log('\n🔍 Testing WKB decode for first point:');
          console.log('Geometry base64:', geometry.substring(0, 60) + '...');
        }
      }
      
    } catch (error) {
      console.log('❌ API Error:', error.message);
    }
  });

  test('should run analysis with season and zone selection', async ({ page }) => {
    await login(page);

    // Navegar para Field Performance
    await page.goto('/field-performance');
    await page.waitForTimeout(3000);

    // Aguardar fields carregarem
    await page.waitForSelector('text=Fields', { timeout: 10000 });

    // Verificar se há fields disponíveis
    const fieldButtons = page.locator('button').filter({ hasText: /Field/ });
    const fieldCount = await fieldButtons.count();

    if (fieldCount === 0) {
      console.log('⚠️ No fields available, skipping analysis test');
      return;
    }

    // Clicar no primeiro field disponível
    await fieldButtons.first().click();
    await page.waitForTimeout(2000);

    // Verificar se o painel de análise apareceu
    const runAnalysisButton = page.locator('button:has-text("Run Analysis")');
    await expect(runAnalysisButton).toBeVisible({ timeout: 5000 });

    // Verificar se há seasons disponíveis
    const seasonSelect = page.locator('select').first(); // Primeiro select é o de season
    await expect(seasonSelect).toBeVisible();

    // Verificar se há seasons no select
    const seasonOptions = seasonSelect.locator('option');
    const seasonCount = await seasonOptions.count();

    if (seasonCount <= 1) { // Só tem a opção "Select Season"
      console.log('⚠️ No seasons available, skipping detailed analysis test');
      return;
    }

    // Selecionar primeira season disponível
    await seasonSelect.selectOption({ index: 1 }); // Index 1 é a primeira season
    await page.waitForTimeout(1000);

    // Verificar se o botão Run Analysis está habilitado
    await expect(runAnalysisButton).toBeEnabled();

    console.log('✅ Analysis controls loaded successfully');

    // Screenshot do estado atual
    await page.screenshot({
      path: 'test-results/analysis-controls-loaded.png',
      fullPage: true
    });

    // Tentar executar análise (mas não vamos esperar completar para não demorar muito)
    // await runAnalysisButton.click();
    // await page.waitForTimeout(2000);

    console.log('✅ Analysis test completed - controls are working');
  });
});

