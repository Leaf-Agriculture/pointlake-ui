// Configuração das URLs da API Leaf
// Faz chamadas diretas à API Leaf, sem backend intermediário

/**
 * Obtém a URL base da API Leaf baseado no ambiente
 */
export const getLeafApiBaseUrl = (environment) => {
  return environment === 'dev' 
    ? 'https://api-dev.withleaf.team'
    : 'https://api.withleaf.io'
}

/**
 * Obtém a URL da API de operações (batches, uploads)
 */
export const getOperationsApiUrl = (environment) => {
  const base = getLeafApiBaseUrl(environment)
  return `${base}/services/operations/api`
}

/**
 * Obtém a URL da API PointLake (files, queries)
 */
export const getPointlakeApiUrl = (environment) => {
  const base = getLeafApiBaseUrl(environment)
  return `${base}/services/pointlake/api`
}

/**
 * Helper para construir URLs da API Leaf
 */
export const leafApiUrl = (path, environment = 'prod') => {
  // Remover barra inicial se existir
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  
  // Mapeamento de endpoints do backend antigo para endpoints Leaf reais
  if (path.startsWith('/api/authenticate')) {
    return `${getLeafApiBaseUrl(environment)}/api/authenticate`
  }
  
  if (path.startsWith('/api/v2/sql')) {
    return `${getLeafApiBaseUrl(environment)}/api/v2/sql`
  }
  
  if (path.startsWith('/api/batch')) {
    const batchPath = path.replace('/api/batch', '')
    return `${getOperationsApiUrl(environment)}/batch${batchPath}`
  }
  
  if (path.startsWith('/api/upload')) {
    // Upload usa query params na URL
    const baseUrl = `${getOperationsApiUrl(environment)}/batch`
    return baseUrl
  }
  
  if (path.startsWith('/api/v2/files')) {
    const filesPath = path.replace('/api/v2/files', '')
    return `${getPointlakeApiUrl(environment)}/v2/files${filesPath}`
  }
  
  if (path.startsWith('/api/v2/query')) {
    const queryPath = path.replace('/api/v2/query', '')
    return `${getPointlakeApiUrl(environment)}/v2/query${queryPath}`
  }
  
  // Fallback: assume que é um endpoint da API base
  return `${getLeafApiBaseUrl(environment)}/${cleanPath}`
}
