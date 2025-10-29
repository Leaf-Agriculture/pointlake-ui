// Configuração da URL base da API
// Em desenvolvimento, usa o proxy do Vite
// Em produção, precisa apontar para o backend hospedado

const getApiBaseUrl = () => {
  // Em produção no GitHub Pages, use a URL do seu backend hospedado
  // Exemplo: 'https://seu-backend.herokuapp.com' ou 'https://seu-backend.railway.app'
  if (import.meta.env.PROD) {
    // Substitua pela URL do seu backend em produção
    return import.meta.env.VITE_API_URL || ''
  }
  
  // Em desenvolvimento, usa caminho relativo (proxy do Vite)
  return ''
}

export const API_BASE_URL = getApiBaseUrl()

// Helper para criar URLs da API
export const apiUrl = (path) => {
  // Remove barra inicial se existir para evitar dupla barra
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}

