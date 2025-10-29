import { useState, useEffect, Fragment, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeafUser } from '../context/LeafUserContext'
import MapComponent from '../components/MapComponent'
import FileUpload from '../components/FileUpload'
import DrawZones from '../components/DrawZones'
import axios from 'axios'
import { leafApiUrl, getPointlakeApiUrl } from '../config/api'

function Dashboard() {
  const { token, logout, isAuthenticated, loading: authLoading, getEnvironment } = useAuth()
  const { selectedLeafUserId, setSelectedLeafUserId, leafUsers, loadingUsers } = useLeafUser()
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
  const [hasSpatialFilter, setHasSpatialFilter] = useState(false)
  const [filesToShow, setFilesToShow] = useState(20) // Começar com 20 arquivos visíveis
  const filesListRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  // Função para validar UUID ou ID válido
  const isValidUserId = (str) => {
    if (!str || String(str).trim().length === 0) return false
    const strVal = String(str).trim()
    // Aceitar UUIDs ou IDs numéricos/alfanuméricos
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(strVal) || strVal.length > 0 // Aceitar qualquer ID válido da API
  }

  // Função para carregar batches
  const loadBatches = async () => {
    if (!selectedLeafUserId || !isValidUserId(selectedLeafUserId)) return
    setLoadingBatches(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl('/api/batch', env)
      
      // Garantir que o leafUserId seja uma string completa
      const leafUserIdStr = String(selectedLeafUserId).trim()
      console.log('🔍 Carregando batches com leafUserId:', leafUserIdStr)
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          leafUserId: leafUserIdStr
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
    if (!selectedLeafUserId || !isValidUserId(selectedLeafUserId)) return
    setLoadingFiles(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl('/api/v2/files', env)
      
      // Garantir que o leafUserId seja uma string completa
      const leafUserIdStr = String(selectedLeafUserId).trim()
      console.log('🔍 Carregando arquivos com leafUserId:', leafUserIdStr, 'tipo:', typeof selectedLeafUserId)
      
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          leafUserId: leafUserIdStr,
          page: 0,
          size: 100
        }
      })
      
      const filesData = Array.isArray(response.data) ? response.data : (response.data?.content || [])
      
      // Debug: log primeiro arquivo para ver estrutura
      if (filesData.length > 0) {
        console.log('📁 First file structure:', filesData[0])
        console.log('📅 Date fields available:', {
          createdTime: filesData[0].createdTime,
          createdDate: filesData[0].createdDate,
          createdAt: filesData[0].createdAt,
          uploadDate: filesData[0].uploadDate
        })
      }
      
      // Ordenar por data mais recente primeiro (createdTime, createdDate, createdAt, ou uploadDate)
      const sortedFiles = filesData.sort((a, b) => {
        const getDate = (file) => {
          return file.createdTime || file.createdDate || file.createdAt || file.uploadDate || 0
        }
        const dateA = new Date(getDate(a)).getTime()
        const dateB = new Date(getDate(b)).getTime()
        return dateB - dateA // Ordenar descendente (mais recente primeiro)
      })
      
      setFiles(sortedFiles)
      // Reset filesToShow quando novos arquivos são carregados
      setFilesToShow(20)
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
      const apiUrl = leafApiUrl(`/api/batch/${batchId}`, env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
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
      const apiUrl = leafApiUrl(`/api/v2/files/${fileId}`, env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      setFileDetails(response.data)
    } catch (err) {
      console.error('Erro ao carregar detalhes do arquivo:', err)
      setError(getErrorMessage(err, 'Error loading file details'))
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
      const apiUrl = leafApiUrl(`/api/v2/files/${fileId}/summary`, env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
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
      setError(getErrorMessage(err, 'Error loading file summary'))
    } finally {
      setLoadingFileSummary(false)
    }
  }

  // Função para executar query em arquivo específico
  const executeFileQuery = async () => {
    if (!fileQuery.trim() || !selectedFileId) {
      setError('Please select a file and enter a SQL query')
      return
    }

    setLoadingQuery(true)
    setError('')
    setQueryResults(null)

    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl('/api/v2/query', env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          sql: fileQuery,
          fileId: selectedFileId
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
      setError(getErrorMessage(err, 'Error executing file query'))
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
  const getErrorMessage = (err, defaultMessage = 'Error processing request') => {
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

  // Converter geometria Leaflet para WKT
  const geometryToWKT = (zone) => {
    if (!zone || !zone.layer) return null;
    
    const layer = zone.layer;
    
    if (zone.type === 'polygon' || zone.type === 'rectangle') {
      const coords = layer.getLatLngs()[0];
      const wktCoords = coords.map(c => `${c.lng} ${c.lat}`).join(', ');
      return `POLYGON((${wktCoords}, ${coords[0].lng} ${coords[0].lat}))`;
    } else if (zone.type === 'circle') {
      const center = layer.getLatLng();
      const radius = layer.getRadius();
      // Para círculo, usar ST_Buffer em vez de WKT direto
      return `POINT(${center.lng} ${center.lat})`;
    }
    
    return null;
  };

  // Atualizar query SQL com filtro espacial
  const updateQueryWithSpatialFilter = (zone) => {
    const wkt = geometryToWKT(zone);
    if (!wkt) return;
    
    // Pegar a query atual
    let currentQuery = sqlQuery.trim();
    
    // Se a query está vazia ou é a query padrão, não fazer nada
    if (!currentQuery || currentQuery === 'SELECT * FROM fields LIMIT 10') {
      return;
    }
    
    // Remover LIMIT se existir para adicionar depois
    const limitMatch = currentQuery.match(/LIMIT\s+\d+/i);
    const limitClause = limitMatch ? limitMatch[0] : '';
    if (limitClause) {
      currentQuery = currentQuery.replace(/LIMIT\s+\d+/i, '').trim();
    }
    
    // Adicionar filtro espacial baseado no tipo de zona
    let spatialFilter;
    if (zone.type === 'circle') {
      const center = zone.layer.getLatLng();
      const radiusInMeters = Math.round(zone.layer.getRadius());
      // Para círculo, usar ST_DWithin com geometria WKB e raio em metros
      // Último parâmetro true = usar esferóide (cálculo geodésico em metros)
      spatialFilter = `ST_DWithin(ST_SetSRID(ST_GeomFromWKB(geometry), 4326), ST_Point(${center.lng}, ${center.lat}), ${radiusInMeters}, true)`;
    } else {
      // Para polígonos e retângulos, usar ST_Intersects com geometria WKB
      spatialFilter = `ST_Intersects(ST_SetSRID(ST_GeomFromWKB(geometry), 4326), ST_GeomFromText('${wkt}'))`;
    }
    
    // Adicionar WHERE ou AND conforme necessário
    let newQuery;
    if (currentQuery.toUpperCase().includes('WHERE')) {
      newQuery = `${currentQuery} AND ${spatialFilter}`;
    } else {
      newQuery = `${currentQuery} WHERE ${spatialFilter}`;
    }
    
    // Adicionar LIMIT de volta
    if (limitClause) {
      newQuery = `${newQuery} ${limitClause}`;
    }
    
    setSqlQuery(newQuery);
    setHasSpatialFilter(true);
    console.log('Query atualizada com filtro espacial:', newQuery);
    
    // Mostrar feedback visual
    setError('');
  };

  // Funções para gerenciar zonas desenhadas
  const handleZoneCreated = (zone) => {
    console.log('Zone created:', zone);
    // Não atualizar automaticamente - usuário decide quando usar
  };

  const handleZoneDeleted = (zoneId) => {
    console.log('Zone deleted:', zoneId);
  };

  const handleQueryByZone = (zone) => {
    console.log('Query by zone:', zone);
    updateQueryWithSpatialFilter(zone);
  };

  // Carregar batches e arquivos ao montar o componente
  useEffect(() => {
    if (token && getEnvironment && isAuthenticated) {
      loadBatches()
      loadFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated])

  // Auto-refresh files every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return
    
    const interval = setInterval(() => {
      loadFiles()
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [isAuthenticated, selectedLeafUserId])

  // Recarregar dados quando o Point Lake User mudar
  useEffect(() => {
    if (isAuthenticated && selectedLeafUserId) {
      loadBatches()
      loadFiles()
    }
  }, [selectedLeafUserId])

  // Infinite scroll - detectar quando o usuário está próximo do final da lista
  useEffect(() => {
    const filesListElement = filesListRef.current
    if (!filesListElement || files.length === 0) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = filesListElement
      // Quando estiver a 100px do final, carregar mais arquivos
      if (scrollHeight - scrollTop - clientHeight < 100) {
        if (filesToShow < files.length) {
          setFilesToShow(prev => Math.min(prev + 20, files.length))
        }
      }
    }

    filesListElement.addEventListener('scroll', handleScroll)
    return () => {
      filesListElement.removeEventListener('scroll', handleScroll)
    }
  }, [files, filesToShow])

  const handleQuery = async () => {
    if (!sqlQuery.trim()) {
      setError('Please enter a SQL query')
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
      const apiUrl = leafApiUrl('/api/v2/query', env)
      const response = await axios.get(apiUrl, {
        params: {
          sql: sql
        },
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const endTime = performance.now()
      const executionTime = ((endTime - startTime) / 1000).toFixed(3)
      setQueryExecutionTime(executionTime)

      setResults(response.data)
    } catch (err) {
      console.error('Erro na query:', err)
      setError(getErrorMessage(err, 'Error executing SQL query'))
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Loading...</p>
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
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2h2.945M15 16.5V18a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5M17 13h1a2 2 0 002-2V9a2 2 0 00-2-2h-1M17 9l-1-1M9 5l1 1m8-1V7a2 2 0 00-2 2H7a2 2 0 00-2-2V6m0 0L6 5m6 0l-1-1M17 16.5V18a2 2 0 002 2h1a2 2 0 002-2v-1.5m-5-3a2 2 0 00-2-2h-2m6 4l-2 2m2-2l-1-1" />
                </svg>
                Point Lake GIS Studio
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
              
                  {/* Dropdown de Point Lake Users */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="leaf-user-select" className="text-sm text-zinc-400">
                      Point Lake User:
                    </label>
                    <select
                      id="leaf-user-select"
                      value={selectedLeafUserId || ''}
                      onChange={(e) => {
                        const newValue = String(e.target.value).trim()
                        
                        // Garantir que não está vazio e preservar valor completo
                        if (newValue && newValue.length > 0) {
                          setSelectedLeafUserId(newValue)
                        }
                      }}
                      onBlur={(e) => {
                        // Manter o foco se necessário
                        e.preventDefault()
                      }}
                      disabled={loadingUsers}
                      className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-100 border border-zinc-700 rounded hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
                      autoFocus={false}
                      tabIndex={0}
                    >
                  {loadingUsers ? (
                    <option>Loading users...</option>
                  ) : leafUsers.length === 0 ? (
                    <option value={selectedLeafUserId}>{selectedLeafUserId ? String(selectedLeafUserId).substring(0, 20) + '...' : 'No user'}</option>
                  ) : (
                    leafUsers.map((user, idx) => {
                      // Garantir que pegamos o ID completo, nunca truncado
                      const userId = String(user.id || '').trim()
                      
                      if (!userId || userId.length === 0) {
                        console.warn(`⚠️ Ignorando item ${idx} - userId vazio`)
                        return null
                      }
                      
                      // Usar o displayName ou name que vem da API (já formatado)
                      const displayText = user.displayName || user.name || `User ${userId.substring(0, 8)}`
                      
                      return (
                        <option key={`${userId}-${idx}`} value={userId}>
                          {displayText}
                        </option>
                      )
                    }).filter(Boolean)
                  )}
                </select>
              </div>
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
          <div className="flex-1 overflow-y-auto p-4" ref={filesListRef}>
            {/* Draw Zones */}
            <div className="mb-4">
              <DrawZones 
                onZoneCreated={handleZoneCreated}
                onZoneDeleted={handleZoneDeleted}
                onQueryByZone={handleQueryByZone}
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
                {files.slice(0, filesToShow).map((file, idx) => (
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
                          <div className="text-xs text-zinc-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {(() => {
                              const dateValue = file.createdTime || file.createdDate || file.createdAt || file.uploadDate
                              if (dateValue) {
                                try {
                                  const date = new Date(dateValue)
                                  if (!isNaN(date.getTime())) {
                                    return date.toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  }
                                } catch (e) {
                                  console.error('Error parsing date:', dateValue, e)
                                }
                              }
                              return 'N/A'
                            })()}
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
                                  const env = getEnvironment()
                                  const apiUrl = leafApiUrl('/api/v2/query', env)
                                  const response = await axios.get(apiUrl, {
                                    params: {
                                      sql: query,
                                      fileId: fileId
                                    },
                                    headers: {
                                      'Authorization': `Bearer ${token}`
                                    }
                                  });
                                  setResults(response.data);
                                } catch (err) {
                                  console.error('Erro na query:', err);
                                  setError(getErrorMessage(err, 'Error executing query'));
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
                {filesToShow < files.length && (
                  <div className="text-xs text-zinc-400 text-center py-2 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Loading more files... ({filesToShow} of {files.length})</span>
                  </div>
                )}
                {filesToShow >= files.length && files.length > 20 && (
                  <div className="text-xs text-zinc-400 text-center py-2">
                    Showing all {files.length} files
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
        <div className="flex-1 relative flex flex-col">
          <div className="flex-1 relative">
            <MapComponent data={results} mapRef={mapRef} />
          </div>
          
          {/* Painel de Summary na parte inferior */}
          {(fileSummary || loadingFileSummary) && (
            <div className="bg-zinc-900 border-t border-zinc-800 flex-shrink-0" style={{ height: '200px', maxHeight: '200px' }}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Summary
                </h3>
                <button
                  onClick={() => {
                    setFileSummary(null)
                    setMenuType('sql')
                  }}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Close Summary"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-x-auto overflow-y-auto" style={{ height: '175px', maxHeight: '175px' }}>
                {loadingFileSummary ? (
                  <div className="flex items-center justify-center py-2">
                    <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="ml-2 text-xs text-zinc-400">Loading...</span>
                  </div>
                ) : fileSummary ? (
                  <div className="px-3 py-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="text-left py-1 px-2 text-zinc-300 font-semibold text-xs">Key</th>
                          <th className="text-left py-1 px-2 text-zinc-300 font-semibold text-xs">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(fileSummary)
                          .filter(([key]) => {
                            const lowerKey = key.toLowerCase()
                            return lowerKey !== 'geometry' && 
                                   !lowerKey.includes('polygon') &&
                                   !lowerKey.includes('geom')
                          })
                          .map(([key, value], idx) => {
                            let formattedValue = value
                            
                            if (value === null || value === undefined) {
                              formattedValue = <span className="text-zinc-500 italic">null</span>
                            } else if (typeof value === 'boolean') {
                              formattedValue = value ? 'true' : 'false'
                            } else if (typeof value === 'number') {
                              formattedValue = typeof value === 'number' && value % 1 !== 0 
                                ? value.toFixed(6) 
                                : value.toString()
                            } else if (typeof value === 'string' && (key.toLowerCase().includes('date') || key.toLowerCase().includes('time'))) {
                              try {
                                const date = new Date(value)
                                if (!isNaN(date.getTime())) {
                                  formattedValue = date.toLocaleString('en-US')
                                }
                              } catch (e) {
                                // Manter como está
                              }
                            } else if (typeof value === 'object' && !Array.isArray(value)) {
                              formattedValue = JSON.stringify(value, null, 2)
                            } else if (Array.isArray(value)) {
                              formattedValue = value.length > 0 ? `${value.length} items` : '[]'
                            } else {
                              formattedValue = String(value)
                            }
                            
                            return (
                              <tr 
                                key={idx} 
                                className={`border-b border-zinc-700 hover:bg-zinc-700 ${idx % 2 === 0 ? 'bg-zinc-800/50' : 'bg-zinc-700/30'}`}
                              >
                                <td className="py-1 px-2 text-zinc-300 font-mono text-xs whitespace-nowrap">{key}</td>
                                <td className="py-1 px-2 text-zinc-200 text-xs">
                                  {typeof formattedValue === 'string' && formattedValue.length > 80 ? (
                                    <span className="truncate block max-w-md" title={formattedValue}>
                                      {formattedValue.substring(0, 80)}...
                                    </span>
                                  ) : (
                                    formattedValue
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          )}
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
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-zinc-300">
                  Enter your SQL query
                </label>
                {hasSpatialFilter && (
                  <span className="text-xs text-blue-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Spatial Filter Active
                  </span>
                )}
              </div>
              <textarea
                value={sqlQuery}
                onChange={(e) => {
                  setSqlQuery(e.target.value);
                  // Se o usuário editar manualmente, verificar se ainda tem filtro espacial
                  const hasFilter = e.target.value.includes('ST_Intersects') || e.target.value.includes('ST_DWithin');
                  setHasSpatialFilter(hasFilter);
                }}
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
