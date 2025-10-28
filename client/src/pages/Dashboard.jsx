import { useState, useEffect, Fragment, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MapComponent from '../components/MapComponent'
import FileUpload from '../components/FileUpload'
import DrawZones from '../components/DrawZones'
import axios from 'axios'

function Dashboard() {
  const { token, logout, isAuthenticated, loading: authLoading, getEnvironment } = useAuth()
  const navigate = useNavigate()
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM fields LIMIT 10')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [batches, setBatches] = useState([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState(null)
  const [batchFiles, setBatchFiles] = useState({})
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [fileDetails, setFileDetails] = useState(null)
  const [loadingFileDetails, setLoadingFileDetails] = useState(false)
  const [fileSummary, setFileSummary] = useState(null)
  const [loadingFileSummary, setLoadingFileSummary] = useState(false)
  const [fileQuery, setFileQuery] = useState('')
  const [queryResults, setQueryResults] = useState(null)
  const [loadingQuery, setLoadingQuery] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuType, setMenuType] = useState('sql') // 'sql', 'upload', 'summary', 'query'
  const [drawnZones, setDrawnZones] = useState([])
  const mapRef = useRef(null)
  const [queryExecutionTime, setQueryExecutionTime] = useState(null)

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  // Função para carregar batches
  const loadBatches = async () => {
    setLoadingBatches(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get('/api/batch', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
        }
      })
      
      setBatches(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Erro ao carregar batches:', err)
      setBatches([])
    } finally {
      setLoadingBatches(false)
    }
  }

  // Função para carregar arquivos v2
  const loadFiles = async () => {
    setLoadingFiles(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get('/api/v2/files?page=0&size=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
        }
      })
      
      setFiles(Array.isArray(response.data) ? response.data : (response.data?.content || []))
    } catch (err) {
      console.error('Erro ao carregar arquivos:', err)
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  // Função para carregar arquivos de um batch
  const loadBatchFiles = async (batchId) => {
    if (batchFiles[batchId]) return // Já carregado
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get(`/api/batch/${batchId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
        }
      })
      
      console.log('Dados do batch:', response.data)
      
      setBatchFiles(prev => ({
        ...prev,
        [batchId]: response.data
      }))
    } catch (err) {
      console.error('Erro ao carregar arquivos do batch:', err)
    }
  }

  const toggleBatch = (batchId) => {
    if (expandedBatch === batchId) {
      setExpandedBatch(null)
    } else {
      setExpandedBatch(batchId)
      loadBatchFiles(batchId)
    }
  }

  // Função para carregar detalhes de um arquivo específico
  const loadFileDetails = async (fileId) => {
    setLoadingFileDetails(true)
    setFileDetails(null)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get(`/api/v2/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
        }
      })
      
      setFileDetails(response.data)
    } catch (err) {
      console.error('Erro ao carregar detalhes do arquivo:', err)
      setError(getErrorMessage(err, 'Erro ao carregar detalhes do arquivo'))
    } finally {
      setLoadingFileDetails(false)
    }
  }

  // Função para carregar summary de um arquivo específico
  const loadFileSummary = async (fileId) => {
    setLoadingFileSummary(true)
    setFileSummary(null)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get(`/api/v2/files/${fileId}/summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
        }
      })
      
      setFileSummary(response.data)
      // Atualizar o mapa com a geometria
      setResults({
        geometry: response.data.geometry,
        summary: response.data
      })
    } catch (err) {
      console.error('Erro ao carregar summary do arquivo:', err)
      setError(getErrorMessage(err, 'Erro ao carregar summary do arquivo'))
    } finally {
      setLoadingFileSummary(false)
    }
  }

  // Função para executar query em arquivo específico
  const executeFileQuery = async () => {
    if (!fileQuery.trim() || !selectedFileId) {
      setError('Por favor, selecione um arquivo e digite uma query SQL')
      return
    }

    setLoadingQuery(true)
    setError('')
    setQueryResults(null)

    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const encodedSql = encodeURIComponent(fileQuery)
      
      const response = await axios.get(`/api/v2/query?sql=${encodedSql}&fileId=${selectedFileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
        },
        responseType: 'blob' // Para permitir download de arquivos grandes
      })

      // Verificar se é um GeoJSON grande (mais de 1000 features)
      const responseText = await response.data.text()
      let data
      
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        // Se não conseguir fazer parse, pode ser que já veio como blob
        data = responseText
      }

      if (data && typeof data === 'object' && data.features && data.features.length > 1000) {
        // GeoJSON grande - iniciar download
        const blob = new Blob([responseText], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `query_result_${selectedFileId}_${Date.now()}.geojson`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        setQueryResults({
          message: `GeoJSON grande detectado (${data.features.length} features). Download iniciado automaticamente.`,
          featuresCount: data.features.length,
          isLargeFile: true
        })
      } else {
        // GeoJSON pequeno ou array de dados - mostrar na interface
        setQueryResults(data)
        
        // Sempre atualizar o mapa com os dados da query
        if (data) {
          setResults(data)
          console.log('Dados carregados no mapa:', data)
        }
      }
    } catch (err) {
      console.error('Erro na query do arquivo:', err)
      setError(getErrorMessage(err, 'Erro ao executar query do arquivo'))
    } finally {
      setLoadingQuery(false)
    }
  }

  // Função para download manual do GeoJSON
  const downloadGeoJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `geojson_${Date.now()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  // Função para testar decodificação de geometria binária
  const testBinaryGeometryDecoding = () => {
    const testGeometry = "AQEAAIBZCGEk6mBYwDAvdrEf/kJAAAAAAAAAAAA="
    console.log('Testando decodificação de geometria binária:', testGeometry)
    
    // Simular dados de teste
    const testData = [
      {
        appliedRate: 0,
        appliedRateTarget: 10,
        area: 0,
        equipmentWidth: 1080,
        geometry: testGeometry,
        operationType: "CropProtection",
        recordingStatus: "dtiRecordingStatusOff",
        tankMix: true,
        timestamp: "2017-06-22T17:49:57.211"
      }
    ]
    
    setResults(testData)
    console.log('Dados de teste carregados no mapa')
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

  // Funções para controlar o menu sanduíche
  const openMenu = (type) => {
    setMenuType(type)
    setIsMenuOpen(true)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    // Limpar dados quando fechar
    setFileSummary(null)
    setQueryResults(null)
    setSelectedFileId(null)
    setFileQuery('')
    setError('')
  }

  // Funções para gerenciar zonas desenhadas
  const handleZoneCreated = (zone) => {
    console.log('Zone created:', zone);
  };

  const handleZoneDeleted = (zoneId) => {
    console.log('Zone deleted:', zoneId);
  };

  // Carregar batches e arquivos ao montar o componente
  useEffect(() => {
    if (token && getEnvironment && isAuthenticated) {
      loadBatches()
      loadFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated])

  const handleQuery = async () => {
    if (!sqlQuery.trim()) {
      setError('Por favor, digite uma query SQL')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)
    setQueryExecutionTime(null)

    const startTime = performance.now()

    try {
      // Extrair SQL da query (pode ser JSON ou SQL direto)
      let sql;
      try {
        const parsed = JSON.parse(sqlQuery)
        sql = parsed.sql
      } catch (e) {
        // Se não for JSON válido, assume que é SQL simples
        sql = sqlQuery
      }

      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get('/api/v2/query', {
        params: {
          sql: sql
        },
        headers: {
          'Authorization': token,
          'x-environment': env
        }
      })

      const endTime = performance.now()
      const executionTime = ((endTime - startTime) / 1000).toFixed(3)
      setQueryExecutionTime(executionTime)

      setResults(response.data)
    } catch (err) {
      console.error('Erro na query:', err)
      setError(getErrorMessage(err, 'Erro ao executar query SQL'))
      setQueryExecutionTime(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Barra de Progresso Global */}
      {(loading || loadingFileSummary || loadingQuery) && (
        <div className="w-full h-1 bg-zinc-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 animate-pulse"></div>
          <div className="absolute inset-0 shimmer-effect"></div>
        </div>
      )}

      {/* Barra de Ferramentas Superior */}
      <header className="bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">L</span>
                </div>
                Leaf GIS Studio
              </h1>
              {getEnvironment && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  getEnvironment() === 'dev'
                    ? 'bg-orange-950 text-orange-300 border border-orange-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {getEnvironment().toUpperCase()}
                </span>
              )}
            </div>
            
            {/* Barra de Ferramentas */}
            <div className="flex items-center gap-1">
              <div className="w-px h-6 bg-zinc-700 mx-2"></div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm font-medium bg-red-950 text-red-200 rounded hover:bg-red-900 transition duration-150 border border-red-800 hover:border-red-700"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Exit
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Layout Principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel Lateral Esquerdo - Arquivos */}
        <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              Processed Files
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {/* Botões de Ação */}
            <div className="mb-4">
              <button
                onClick={async () => { await loadBatches(); await loadFiles(); }}
                disabled={loadingBatches || loadingFiles}
                className="w-full text-sm bg-zinc-800 text-zinc-200 px-3 py-2 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-zinc-700 hover:border-zinc-600"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {(loadingBatches || loadingFiles) ? 'Loading...' : 'Refresh Files'}
                </span>
              </button>
            </div>

            {/* Draw Zones */}
            <div className="mb-4">
              <DrawZones 
                onZoneCreated={handleZoneCreated}
                onZoneDeleted={handleZoneDeleted}
                zones={drawnZones}
                mapRef={mapRef}
              />
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload File
                </h3>
                <FileUpload />
              </div>
            </div>

            {/* Lista de Arquivos */}
            {files && files.length > 0 ? (
              <div className="space-y-2">
                {files.slice(0, 10).map((file, idx) => (
                  <div key={idx} className="bg-zinc-800 rounded border border-zinc-700 hover:border-zinc-600 transition duration-150">
                    <div className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-200 truncate">
                            {file.name || file.filename || file.fileName || file.id || `File ${idx + 1}`}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono mt-1">
                            ID: {file.id || file.uuid || 'N/A'}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {file.createdDate || file.createdAt || file.uploadDate
                              ? new Date(file.createdDate || file.createdAt || file.uploadDate).toLocaleDateString('en-US')
                              : '-'}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                          <button
                            onClick={() => {
                              const fileId = file.id || file.uuid;
                              if (fileId) {
                                loadFileSummary(fileId);
                                openMenu('summary');
                              }
                            }}
                            disabled={loadingFileSummary}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-blue-500"
                            title="View Summary"
                          >
                            {loadingFileSummary ? (
                              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={async () => {
                              const fileId = file.id || file.uuid;
                              if (fileId) {
                                setSelectedFileId(fileId);
                                const query = `SELECT * FROM pointlake_file_${fileId} LIMIT 10`;
                                setSqlQuery(query);
                                // Executar query automaticamente
                                setLoading(true);
                                setError('');
                                try {
                                  const response = await axios.get('/api/v2/query', {
                                    params: {
                                      sql: query,
                                      fileId: fileId
                                    },
                                    headers: {
                                      'Authorization': token,
                                      'x-environment': getEnvironment()
                                    }
                                  });
                                  setResults(response.data);
                                } catch (err) {
                                  console.error('Erro na query:', err);
                                  setError(getErrorMessage(err, 'Erro ao executar query'));
                                }
                                setLoading(false);
                              }
                            }}
                            disabled={loadingQuery || loading}
                            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-emerald-500"
                            title="Execute Query"
                          >
                            {(loadingQuery || loading) ? (
                              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {files.length > 10 && (
                  <div className="text-xs text-zinc-400 text-center py-2">
                    Showing 10 of {files.length} files
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                <p className="text-sm">No processed files found</p>
              </div>
            )}
          </div>
        </div>

        {/* Mapa Principal */}
        <div className="flex-1 relative">
          <MapComponent data={results} mapRef={mapRef} />
        </div>

        {/* Painel Lateral Direito - SQL */}
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
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Enter your SQL query
              </label>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                className="w-full h-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm text-zinc-200 placeholder-zinc-500"
                placeholder='Ex: SELECT * FROM fields LIMIT 10'
              />
            </div>

            {/* Botão Executar */}
            <button
              onClick={handleQuery}
              disabled={loading}
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
                {loading ? 'Executing...' : 'Execute Query'}
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
              <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
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
                  Results
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

export default Dashboard
