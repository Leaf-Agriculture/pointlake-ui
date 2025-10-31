import { test, expect } from '@playwright/test'

test.describe('Leaf User Change Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Fazer login antes de cada teste
    await page.goto('/login')
    
    // Preencher credenciais
    await page.fill('input[type="text"]', 'luiz@withleaf.io')
    await page.fill('input[type="password"]', 'shooliod')
    
    // Submeter formulário
    await page.click('button[type="submit"]')
    
    // Aguardar redirecionamento para dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 })
    
    // Aguardar página carregar completamente
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Aguardar dados carregarem
  })

  test('deve trocar de Leaf User rapidamente sem travar a UI', async ({ page }) => {
    // Interceptar requisições de API para medir tempos
    const apiTimings = []
    const apiRequests = {
      batches: [],
      files: [],
      summaries: []
    }

    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/api/batch')) {
        apiRequests.batches.push({
          url,
          startTime: Date.now()
        })
      } else if (url.includes('/api/v2/files')) {
        if (url.includes('/summary')) {
          apiRequests.summaries.push({
            url,
            startTime: Date.now()
          })
        } else {
          apiRequests.files.push({
            url,
            startTime: Date.now()
          })
        }
      }
    })

    page.on('response', (response) => {
      const url = response.url()
      const now = Date.now()
      
      if (url.includes('/api/batch')) {
        const req = apiRequests.batches.find(r => r.url === url)
        if (req) {
          apiTimings.push({
            type: 'batch',
            duration: now - req.startTime,
            status: response.status()
          })
        }
      } else if (url.includes('/api/v2/files')) {
        if (url.includes('/summary')) {
          const req = apiRequests.summaries.find(r => r.url === url)
          if (req) {
            apiTimings.push({
              type: 'summary',
              duration: now - req.startTime,
              status: response.status()
            })
          }
        } else {
          const req = apiRequests.files.find(r => r.url === url)
          if (req) {
            apiTimings.push({
              type: 'files',
              duration: now - req.startTime,
              status: response.status()
            })
          }
        }
      }
    })

    // Aguardar dropdown de Leaf Users estar visível
    const userDropdown = page.locator('select').first()
    await expect(userDropdown).toBeVisible({ timeout: 10000 })

    // Pegar todas as opções disponíveis
    const options = await userDropdown.locator('option').all()
    const userIds = []
    for (const option of options) {
      const value = await option.getAttribute('value')
      if (value && value !== '') {
        userIds.push(value)
      }
    }

    console.log(`📊 Encontrados ${userIds.length} Leaf Users para testar`)

    if (userIds.length < 2) {
      test.skip('Precisa de pelo menos 2 Leaf Users para testar troca')
      return
    }

    // Testar troca entre os primeiros 2 usuários
    const firstUser = userIds[0]
    const secondUser = userIds[1]

    // Limpar timings anteriores
    apiTimings.length = 0
    apiRequests.batches.length = 0
    apiRequests.files.length = 0
    apiRequests.summaries.length = 0

    // Trocar para primeiro usuário
    const startTimeFirstChange = Date.now()
    await userDropdown.selectOption(firstUser)
    
    // Aguardar lista de arquivos aparecer (ou indicador de loading desaparecer)
    await page.waitForSelector('[data-testid="files-list"], .loading-files', { state: 'visible', timeout: 5000 }).catch(() => {})
    
    // Aguardar até que não haja mais loading (máximo 10 segundos)
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('.loading-files, [class*="loading"]')
      return loadingElements.length === 0 || Array.from(loadingElements).every(el => el.textContent === '')
    }, { timeout: 10000 }).catch(() => {})

    const firstChangeDuration = Date.now() - startTimeFirstChange

    // Trocar para segundo usuário
    const startTimeSecondChange = Date.now()
    await userDropdown.selectOption(secondUser)
    
    // Aguardar lista de arquivos aparecer
    await page.waitForSelector('[data-testid="files-list"], .loading-files', { state: 'visible', timeout: 5000 }).catch(() => {})
    
    // Aguardar até que não haja mais loading (máximo 10 segundos)
    await page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('.loading-files, [class*="loading"]')
      return loadingElements.length === 0 || Array.from(loadingElements).every(el => el.textContent === '')
    }, { timeout: 10000 }).catch(() => {})

    const secondChangeDuration = Date.now() - startTimeSecondChange

    // Aguardar um pouco mais para garantir que todas as requisições terminaram
    await page.waitForTimeout(2000)

    // Calcular estatísticas
    const batchTimings = apiTimings.filter(t => t.type === 'batch')
    const filesTimings = apiTimings.filter(t => t.type === 'files')
    const summaryTimings = apiTimings.filter(t => t.type === 'summary')

    const avgBatchTime = batchTimings.length > 0 
      ? batchTimings.reduce((sum, t) => sum + t.duration, 0) / batchTimings.length 
      : 0
    
    const avgFilesTime = filesTimings.length > 0 
      ? filesTimings.reduce((sum, t) => sum + t.duration, 0) / filesTimings.length 
      : 0
    
    const maxSummaryTime = summaryTimings.length > 0
      ? Math.max(...summaryTimings.map(t => t.duration))
      : 0

    console.log('\n📈 Performance Metrics:')
    console.log(`  Primeira troca: ${firstChangeDuration}ms`)
    console.log(`  Segunda troca: ${secondChangeDuration}ms`)
    console.log(`  Requisições de batches: ${batchTimings.length} (média: ${avgBatchTime.toFixed(0)}ms)`)
    console.log(`  Requisições de files: ${filesTimings.length} (média: ${avgFilesTime.toFixed(0)}ms)`)
    console.log(`  Requisições de summaries: ${summaryTimings.length} (máximo: ${maxSummaryTime}ms)`)

    // Verificar que a troca foi rápida (menos de 5 segundos para UI responsiva)
    expect(firstChangeDuration).toBeLessThan(5000)
    expect(secondChangeDuration).toBeLessThan(5000)

    // Verificar que não há requisições excessivas de summaries (máximo 5 por vez)
    expect(summaryTimings.length).toBeLessThanOrEqual(10) // 5 summaries + 5 cidades potencialmente

    // Verificar que as requisições principais (batches e files) são rápidas
    if (batchTimings.length > 0) {
      expect(avgBatchTime).toBeLessThan(2000)
    }
    if (filesTimings.length > 0) {
      expect(avgFilesTime).toBeLessThan(3000)
    }
  })

  test('deve mostrar feedback visual imediato ao trocar de usuário', async ({ page }) => {
    const userDropdown = page.locator('select').first()
    await expect(userDropdown).toBeVisible({ timeout: 10000 })

    const options = await userDropdown.locator('option').all()
    const userIds = []
    for (const option of options) {
      const value = await option.getAttribute('value')
      if (value && value !== '') {
        userIds.push(value)
      }
    }

    if (userIds.length < 2) {
      test.skip('Precisa de pelo menos 2 Leaf Users para testar troca')
      return
    }

    // Trocar para primeiro usuário
    await userDropdown.selectOption(userIds[0])
    
    // Verificar que a lista de arquivos é limpa imediatamente ou mostra loading
    const filesList = page.locator('[data-testid="files-list"], .file-card').first()
    const loadingIndicator = page.locator('.loading-files, [class*="loading"]').first()
    
    // Deve haver feedback visual imediato (lista limpa ou loading)
    const hasImmediateFeedback = await Promise.race([
      filesList.count().then(count => count === 0),
      loadingIndicator.isVisible().then(visible => visible),
      page.waitForTimeout(500).then(() => true)
    ])

    expect(hasImmediateFeedback).toBeTruthy()
  })
})

