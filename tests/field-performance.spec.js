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
    
    // Testar a API diretamente
    const apiUrl = `https://api-dev.withleaf.team/services/fields/api/users/${leafUserId}/fields`;
    
    // NOTA: A API Leaf Fields requer MultiPolygon, não Polygon!
    // MultiPolygon format: [ [ [ring_coords] ] ] where ring_coords is [[lng,lat], ...]
    const fieldData = {
      name: 'API Test Field ' + Date.now(),
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[
          [
            [-93.48, 41.77],
            [-93.48, 41.76],
            [-93.47, 41.76],
            [-93.47, 41.77],
            [-93.48, 41.77]
          ]
        ]]
      }
    };
    
    console.log('\n📤 Testing API directly:');
    console.log('URL:', apiUrl);
    console.log('Body:', JSON.stringify(fieldData, null, 2));
    
    try {
      const response = await request.post(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data: fieldData
      });
      
      console.log('📥 Response Status:', response.status());
      const body = await response.json().catch(() => response.text());
      console.log('📥 Response Body:', JSON.stringify(body, null, 2));
      
      if (response.status() === 201 || response.status() === 200) {
        console.log('✅ Field created successfully via API!');
      } else {
        console.log('❌ Field creation failed');
      }
    } catch (error) {
      console.log('❌ API Error:', error.message);
    }
  });
});

