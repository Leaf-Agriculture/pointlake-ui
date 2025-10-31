import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MapComponent from '../components/MapComponent'
import axios from 'axios'
import { leafApiUrl } from '../config/api'

function FileQueryWindow() {
  const { fileId } = useParams()
  const navigate = useNavigate()
  const { token, isAuthenticated, loading: authLoading, getEnvironment } = useAuth()
  const [sqlQuery, setSqlQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fileInfo, setFileInfo] = useState(null)
  const [loadingFileInfo, setLoadingFileInfo] = useState(false)
  const mapRef = useRef(null)
  const [queryExecutionTime, setQueryExecutionTime] = useState(null)
  const [queryHistory, setQueryHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  // Carregar histórico de queries do localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(`sql_query_history_${fileId}`)
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        setQueryHistory(Array.isArray(parsed) ? parsed : [])
      }
    } catch (e) {
      console.error('Error loading query history:', e)
      setQueryHistory([])
    }
  }, [fileId])

  // Salvar histórico no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem(`sql_query_history_${fileId}`, JSON.stringify(queryHistory))
    } catch (e) {
      console.error('Error saving query history:', e)
    }
  }, [queryHistory, fileId])

  // Carregar informações do arquivo e inicializar query
  useEffect(() => {
    if (fileId && isAuthenticated && token) {
      loadFileInfo()
      // Inicializar query padrão
      setSqlQuery(`SELECT * FROM pointlake_file_${fileId} LIMIT 10`)
    }
  }, [fileId, isAuthenticated, token])

  // Função para carregar informações do arquivo
  const loadFileInfo = async () => {
    if (!fileId) return
    
    setLoadingFileInfo(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl(`/api/v2/files/${fileId}`, env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      setFileInfo(response.data)
    } catch (err) {
      console.error('Erro ao carregar informações do arquivo:', err)
      setError('Erro ao carregar informações do arquivo')
    } finally {
      setLoadingFileInfo(false)
    }
  }

  // Função helper para extrair mensagem de erro
  const getErrorMessage = (err, defaultMessage = 'Erro ao processar requisição') => {
    if (err.response?.data) {
      const data = err.response.data
      if (typeof data === 'string') {
        return data
      } else if (data.detail) {
        return data.detail
      } else if (data.message) {
        return data.message
      } else if (data.error) {
        return typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
      } else {
        return JSON.stringify(data)
      }
    } else if (err.message) {
      return err.message
    }
    return defaultMessage
  }

  // Função para executar query
  const handleQuery = async () => {
    if (!sqlQuery.trim()) {
      setError('Por favor, insira uma query SQL')
      return
    }

    // Salvar query no histórico
    const queryToSave = sqlQuery.trim()
    setQueryHistory(prev => {
      const filtered = prev.filter(q => q.query !== queryToSave)
      const newHistory = [
        {
          query: queryToSave,
          timestamp: new Date().toISOString(),
          executionTime: null
        },
        ...filtered
      ].slice(0, 50)
      return newHistory
    })

    setLoading(true)
    setError('')
    setResults(null)
    setQueryExecutionTime(null)

    const startTime = performance.now()

    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl('/api/v2/query', env)
      const response = await axios.get(apiUrl, {
        params: {
          sql: sqlQuery.trim(),
          fileId: fileId
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const endTime = performance.now()
      const executionTime = ((endTime - startTime) / 1000).toFixed(3)
      setQueryExecutionTime(executionTime)

      // Atualizar tempo de execução no histórico
      setQueryHistory(prev => {
        const updated = [...prev]
        if (updated.length > 0 && updated[0].query === queryToSave) {
          updated[0].executionTime = executionTime
        }
        return updated
      })

      setResults(response.data)
    } catch (err) {
      console.error('Erro na query:', err)
      setError(getErrorMessage(err, 'Erro ao executar query SQL'))
      setQueryExecutionTime(null)
    } finally {
      setLoading(false)
    }
  }

  // Função para usar uma query do histórico
  const useQueryFromHistory = (query) => {
    setSqlQuery(query)
    setShowHistory(false)
  }

  // Função para remover uma query do histórico
  const removeQueryFromHistory = (index) => {
    setQueryHistory(prev => prev.filter((_, i) => i !== index))
  }

  // Função para limpar todo o histórico
  const clearQueryHistory = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de queries?')) {
      setQueryHistory([])
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Barra de Progresso */}
      {loading && (
        <div className="w-full h-1 bg-zinc-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 animate-pulse"></div>
        </div>
      )}

      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Query SQL - Arquivo {fileId?.substring(0, 8)}...
              </h1>
              {fileInfo && (
                <div className="text-sm text-zinc-400">
                  {fileInfo.name || fileInfo.filename || fileInfo.fileName || 'Sem nome'}
                </div>
              )}
              {fileInfo?.status && (
                <span className={`text-xs px-2 py-1 rounded font-medium ${
                  fileInfo.status === 'PROCESSED'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : fileInfo.status === 'PROCESSING' || fileInfo.status === 'RECEIVED'
                    ? 'bg-orange-950 text-orange-300 border border-orange-800'
                    : fileInfo.status === 'FAILED'
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}>
                  {fileInfo.status}
                </span>
              )}
            </div>
            <button
              onClick={() => window.close()}
              className="px-3 py-2 text-sm font-medium bg-zinc-800 text-zinc-200 rounded hover:bg-zinc-700 transition duration-150 border border-zinc-700"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Fechar Janela
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Layout Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mapa */}
        <div className="flex-1 relative">
          <MapComponent data={results} mapRef={mapRef} />
        </div>

        {/* Painel Lateral - SQL Query */}
        <div className="w-96 bg-zinc-900 border-l border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              SQL Query
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Área de Input SQL */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Insira sua query SQL
                </label>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                  title="Mostrar histórico"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Histórico ({queryHistory.length})
                </button>
              </div>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="w-full h-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm text-zinc-200 placeholder-zinc-500"
                placeholder={`SELECT * FROM pointlake_file_${fileId} LIMIT 10`}
              />
              
              {/* Histórico de Queries */}
              {showHistory && queryHistory.length > 0 && (
                <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-lg max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between p-2 border-b border-zinc-700">
                    <h4 className="text-xs font-semibold text-zinc-300">Histórico de Queries</h4>
                    <button
                      onClick={clearQueryHistory}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      title="Limpar todo histórico"
                    >
                      Limpar Tudo
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-700">
                    {queryHistory.map((item, index) => (
                      <div
                        key={index}
                        className="p-2 hover:bg-zinc-700 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => useQueryFromHistory(item.query)}
                              className="text-xs text-zinc-300 hover:text-blue-400 transition-colors text-left w-full font-mono break-all"
                              title="Clique para usar esta query"
                            >
                              {item.query.length > 100 ? `${item.query.substring(0, 100)}...` : item.query}
                            </button>
                            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                              <span>
                                {new Date(item.timestamp).toLocaleString('pt-BR', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              {item.executionTime && (
                                <span className="text-green-400">
                                  ⏱️ {item.executionTime}s
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeQueryFromHistory(index)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
                            title="Remover do histórico"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showHistory && queryHistory.length === 0 && (
                <div className="mt-2 p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-center text-xs text-zinc-500">
                  Nenhum histórico ainda. Execute queries para salvá-las aqui.
                </div>
              )}
            </div>

            {/* Botão Executar */}
            <button
              onClick={handleQuery}
              disabled={loading || !fileId}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-blue-500"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {loading ? 'Executando...' : 'Executar Query'}
              </span>
            </button>

            {/* Tempo de Execução */}
            {queryExecutionTime && (
              <div className="text-xs text-zinc-500 text-right">
                ⏱️ {queryExecutionTime}s
              </div>
            )}

            {/* Mensagens de Erro */}
            {error && (
              <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded-lg max-h-48 overflow-y-auto">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <pre className="text-xs whitespace-pre-wrap break-words overflow-wrap-anywhere flex-1">{error}</pre>
                </div>
              </div>
            )}

            {/* Resultados */}
            {results && (
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Resultados
                </h4>
                <div className="bg-zinc-800 border border-zinc-700 p-3 rounded-lg max-h-64 overflow-auto">
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileQueryWindow

