import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeafUser } from '../context/LeafUserContext'
import MapComponent from '../components/MapComponent'
import axios from 'axios'
import { getLeafApiBaseUrl, getPointlakeApiUrl } from '../config/api'

function SqlAnalytics() {
  const { token, logout, isAuthenticated, loading: authLoading, getEnvironment } = useAuth()
  const { selectedLeafUserId, setSelectedLeafUserId, leafUsers, loadingUsers, refreshUsers } = useLeafUser()
  const navigate = useNavigate()

  // Estados para SQL Analytics
  const [userId, setUserId] = useState(selectedLeafUserId || '')
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM points LIMIT 10')
  const [startDate, setStartDate] = useState('2000-01-01T00:00:00.000Z')
  const [endDate, setEndDate] = useState('2025-12-31T23:59:59.999Z')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mapData, setMapData] = useState(null)
  const [queryHistory, setQueryHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [queryExecutionTime, setQueryExecutionTime] = useState(null)
  
  // Estados para infinite scroll e view tabular
  const [displayedRows, setDisplayedRows] = useState(50) // Número inicial de linhas
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [viewMode, setViewMode] = useState('split') // 'split', 'map', 'table'
  const [tableHeight, setTableHeight] = useState(300) // Altura inicial da tabela em px
  const [isResizing, setIsResizing] = useState(false)

  const mapRef = useRef(null)
  const tableContainerRef = useRef(null)
  const resizeRef = useRef(null)

  // Redirecionar se não autenticado
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  // Carregar usuários se necessário
  useEffect(() => {
    if (token && leafUsers.length === 0 && !loadingUsers) {
      refreshUsers()
    }
  }, [token, leafUsers.length, loadingUsers, refreshUsers])

  // Atualizar userId quando selectedLeafUserId mudar
  useEffect(() => {
    if (selectedLeafUserId && selectedLeafUserId !== userId) {
      setUserId(selectedLeafUserId)
    }
  }, [selectedLeafUserId, userId])

  const executeSqlQuery = async () => {
    if (!token || !userId) {
      setError('Please select a Leaf User first')
      return
    }

    if (!sqlQuery.trim()) {
      setError('Please enter a SQL query')
      return
    }

    setLoading(true)
    setError('')
    setResults(null)
    setMapData(null)
    const startTime = Date.now()

    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const analyticsBaseUrl = getPointlakeApiUrl(env)

      const requestBody = {
        query: sqlQuery.trim(),
        startDate: startDate,
        endDate: endDate
      }

      console.log('🔍 Executing SQL Analytics query:', {
        userId,
        query: sqlQuery,
        startDate,
        endDate,
        analyticsBaseUrl
      })

      const response = await axios.post(`${analyticsBaseUrl}/v2/beta/analytics/user/${userId}/sql`, requestBody, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': '*/*'
        }
      })

      const executionTime = Date.now() - startTime
      setQueryExecutionTime(executionTime)

      const responseData = response.data
      console.log('✅ SQL Analytics response:', responseData)

      // Adicionar à história
      const historyItem = {
        id: Date.now(),
        query: sqlQuery,
        timestamp: new Date().toISOString(),
        executionTime,
        resultsCount: responseData.data?.length || 0,
        hasGeometry: hasGeometryData(responseData.data)
      }
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 9)]) // Manter apenas 10 últimas

      setResults(responseData)

      // Verificar se há dados geométricos para mostrar no mapa
      if (responseData.data && responseData.data.length > 0 && hasGeometryData(responseData.data)) {
        console.log('🗺️ Detected geometry data, preparing map visualization')

        // Transformar dados para formato do mapa
        const mapPoints = responseData.data.map((item, index) => {
          // Tentar extrair coordenadas de diferentes formatos
          let coords = null
          if (item.geometry && typeof item.geometry === 'string' && item.geometry.length > 20) {
            // Geometria binária (WKB)
            coords = extractCoordinatesFromWKB(item.geometry)
          } else if (item.latitude && item.longitude) {
            coords = [parseFloat(item.latitude), parseFloat(item.longitude)]
          } else if (item.lat && item.lng) {
            coords = [parseFloat(item.lat), parseFloat(item.lng)]
          }

          if (coords) {
            return {
              ...item,
              latitude: coords[0],
              longitude: coords[1],
              geometry: item.geometry,
              // Adicionar ID único se não existir
              id: item.id || `point_${index}`,
              // Campo para heatmap (usar primeiro campo numérico disponível)
              heatmapField: getHeatmapField(item)
            }
          }
          return null
        }).filter(Boolean)

        if (mapPoints.length > 0) {
          setMapData({
            points: mapPoints,
            heatmapField: mapPoints[0].heatmapField || 'default'
          })
          console.log(`🗺️ Map data prepared with ${mapPoints.length} points`)
        } else {
          console.log('⚠️ No valid coordinates found for map display')
        }
      } else {
        console.log('📊 Tabular data only, no geometry detected')
        setMapData(null)
      }

    } catch (err) {
      console.error('❌ SQL Analytics error:', err)
      let errorMessage = 'Error executing SQL query'

      if (err.response) {
        const status = err.response.status
        const data = err.response.data

        if (status === 401) {
          errorMessage = 'Authentication failed. Please check your login.'
        } else if (status === 403) {
          errorMessage = 'Access forbidden. You may not have permission to execute this query.'
        } else if (status === 400) {
          errorMessage = data?.message || 'Invalid query or parameters.'
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.'
        } else if (data?.message) {
          errorMessage = data.message
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your internet connection.'
      }

      setError(errorMessage)
      setQueryExecutionTime(Date.now() - startTime)
    } finally {
      setLoading(false)
    }
  }

  // Função auxiliar para detectar se há dados geométricos
  const hasGeometryData = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) return false

    return data.some(item => {
      return (
        (item.geometry && typeof item.geometry === 'string' && item.geometry.length > 20) ||
        (item.latitude && item.longitude) ||
        (item.lat && item.lng)
      )
    })
  }

  // Função auxiliar para extrair coordenadas de WKB
  const extractCoordinatesFromWKB = (wkbString) => {
    try {
      // Decodificar Base64 para bytes
      const binaryData = atob(wkbString)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }

      if (bytes.length >= 5) {
        const littleEndian = bytes[0] === 1
        const view = new DataView(bytes.buffer)
        const geometryTypeRaw = view.getUint32(1, littleEndian)
        const geometryType = geometryTypeRaw & 0x0FFFFFFF

        // Tipo 1 = Point
        if (geometryType === 1) {
          const minBytes = 5 + 8 + 8
          if (bytes.length >= minBytes) {
            const lng = view.getFloat64(5, littleEndian)
            const lat = view.getFloat64(13, littleEndian)
            if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
              return [lat, lng] // Leaflet usa [lat, lng]
            }
          }
        }
      }
      return null
    } catch (error) {
      console.error('Error extracting coordinates from WKB:', error)
      return null
    }
  }

  // Função auxiliar para determinar campo de heatmap
  const getHeatmapField = (item) => {
    const numericFields = ['appliedRate', 'elevation', 'speed', 'area', 'yieldVolume', 'harvestMoisture', 'seedRate']
    for (const field of numericFields) {
      if (item[field] != null && !isNaN(parseFloat(item[field]))) {
        return field
      }
    }
    return 'default'
  }

  // Função para executar query da história
  const executeHistoryQuery = (historyItem) => {
    setSqlQuery(historyItem.query)
    setShowHistory(false)
    // A query será executada quando o usuário clicar em "Execute Query"
  }

  // Função para limpar resultados
  const clearResults = () => {
    setResults(null)
    setMapData(null)
    setError('')
    setQueryExecutionTime(null)
    setDisplayedRows(50)
  }

  // Reset displayed rows quando novos resultados chegarem
  useEffect(() => {
    if (results?.data) {
      setDisplayedRows(50)
    }
  }, [results])

  // Infinite scroll handler
  const handleTableScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target
    // Quando estiver a 100px do final, carregar mais linhas
    if (scrollHeight - scrollTop - clientHeight < 100 && !isLoadingMore) {
      if (results?.data && displayedRows < results.data.length) {
        setIsLoadingMore(true)
        // Simular um pequeno delay para UX melhor
        setTimeout(() => {
          setDisplayedRows(prev => Math.min(prev + 50, results.data.length))
          setIsLoadingMore(false)
        }, 100)
      }
    }
  }

  // Handler para resize do painel da tabela
  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsResizing(true)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !resizeRef.current) return
      
      const containerRect = resizeRef.current.parentElement.getBoundingClientRect()
      const newHeight = containerRect.bottom - e.clientY
      
      // Limitar altura entre 150px e 600px
      setTableHeight(Math.min(Math.max(newHeight, 150), 600))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="bg-zinc-800/50 backdrop-blur-sm border-b border-zinc-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              🔍 SQL Analytics
            </h1>

            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors text-sm font-medium"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Query Interface */}
        <div className="w-96 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          {/* Query Form */}
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">SQL Query</h3>

            {/* User Selection */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Leaf User
              </label>
              <select
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value)
                  setSelectedLeafUserId(e.target.value)
                }}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a user...</option>
                {leafUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.username || user.email || user.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={startDate.slice(0, 16)}
                  onChange={(e) => setStartDate(e.target.value + ':00.000Z')}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={endDate.slice(0, 16)}
                  onChange={(e) => setEndDate(e.target.value + ':59.999Z')}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* SQL Query */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-400">
                  SQL Query
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
                    title="Query History"
                  >
                    📚
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT * FROM points LIMIT 10')}
                    className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
                    title="Reset to default query"
                  >
                    🔄
                  </button>
                </div>
              </div>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="Enter your SQL query here..."
                rows={6}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {/* Execute Button */}
            <button
              onClick={executeSqlQuery}
              disabled={loading || !userId || !sqlQuery.trim()}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Execute Query</span>
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="mt-3 p-3 bg-red-950 border border-red-800 text-red-200 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>{error}</div>
                </div>
              </div>
            )}
          </div>

          {/* Query History */}
          {showHistory && (
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-sm font-semibold text-zinc-100 mb-3">Query History</h4>
              {queryHistory.length === 0 ? (
                <p className="text-zinc-500 text-sm">No queries executed yet</p>
              ) : (
                <div className="space-y-2">
                  {queryHistory.map(item => (
                    <div
                      key={item.id}
                      className="bg-zinc-800 rounded-lg p-3 cursor-pointer hover:bg-zinc-700 transition-colors"
                      onClick={() => executeHistoryQuery(item)}
                    >
                      <div className="text-xs text-zinc-400 mb-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      <div className="text-sm text-zinc-200 font-mono mb-2 truncate">
                        {item.query}
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{item.resultsCount} results</span>
                        <span>{item.executionTime}ms</span>
                        {item.hasGeometry && <span className="text-green-400">🗺️ GIS</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results Summary */}
          {results && !showHistory && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-zinc-100">Results Summary</h4>
                <button
                  onClick={clearResults}
                  className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300"
                  title="Clear results"
                >
                  🗑️
                </button>
              </div>

              <div className="space-y-3">
                {/* Performance Metrics */}
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-xs text-zinc-400 mb-2">Performance</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-zinc-500">Execution:</span>
                      <span className="text-zinc-200 ml-2">{queryExecutionTime}ms</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Records:</span>
                      <span className="text-zinc-200 ml-2">{results.data?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {results.metadata && (
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <div className="text-xs text-zinc-400 mb-2">Metadata</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Total Files:</span>
                        <span className="text-zinc-200">{results.metadata.totalFiles || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Processed:</span>
                        <span className="text-zinc-200">{results.metadata.processedFiles || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Total Points:</span>
                        <span className="text-zinc-200">{results.metadata.totalPoints || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Processing Time:</span>
                        <span className="text-zinc-200">{results.metadata.processingTimeMs || 0}ms</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Type Indicator */}
                <div className="bg-zinc-800 rounded-lg p-3">
                  <div className="text-xs text-zinc-400 mb-2">Data Type</div>
                  <div className="flex flex-col gap-2">
                    {mapData ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">🗺️ GIS Data</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-400">Map + Table</span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          Use toggle buttons to switch between Split/Map/Table view
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400">📊 Tabular Data</span>
                          <span className="text-zinc-500">•</span>
                          <span className="text-zinc-400">Table view</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 flex flex-col min-w-0" ref={resizeRef}>
          {mapData && results?.data && results.data.length > 0 ? (
            /* Combined View: Map + Table for GIS Data */
            <div className="flex-1 flex flex-col relative min-w-0">
              {/* View Mode Toggle */}
              <div className="absolute top-3 right-3 z-[1000] flex gap-1 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-1 border border-zinc-700">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    viewMode === 'split' 
                      ? 'bg-green-600 text-white' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                  title="Show map and table"
                >
                  Split
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    viewMode === 'map' 
                      ? 'bg-green-600 text-white' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                  title="Show only map"
                >
                  🗺️ Map
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    viewMode === 'table' 
                      ? 'bg-green-600 text-white' 
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                  title="Show only table"
                >
                  📊 Table
                </button>
              </div>

              {/* Map View */}
              {(viewMode === 'split' || viewMode === 'map') && (
                <div className={`relative ${viewMode === 'split' ? 'flex-1' : 'h-full'}`}>
                  <MapComponent
                    data={mapData}
                    mapRef={mapRef}
                  />
                </div>
              )}

              {/* Table View with Infinite Scroll */}
              {(viewMode === 'split' || viewMode === 'table') && (
                <div 
                  className={`bg-zinc-950 border-t border-zinc-700 flex flex-col ${
                    viewMode === 'table' ? 'flex-1' : ''
                  }`}
                  style={viewMode === 'split' ? { height: `${tableHeight}px` } : {}}
                >
                  {/* Resize Handle (only in split mode) */}
                  {viewMode === 'split' && (
                    <div
                      onMouseDown={handleMouseDown}
                      className="h-2 bg-zinc-800 hover:bg-zinc-600 cursor-ns-resize flex items-center justify-center border-b border-zinc-700 transition-colors"
                    >
                      <div className="w-8 h-0.5 bg-zinc-600 rounded-full"></div>
                    </div>
                  )}

                  {/* Table Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-zinc-100">
                        📊 Query Results
                      </h3>
                      <span className="text-xs text-zinc-500">
                        Showing {Math.min(displayedRows, results.data.length)} of {results.data.length} records
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {displayedRows < results.data.length && (
                        <span className="text-xs text-green-400 animate-pulse">
                          ↓ Scroll for more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Table Container */}
                  <div 
                    ref={tableContainerRef}
                    onScroll={handleTableScroll}
                    className="flex-1 relative min-w-0"
                    style={{ minHeight: 0, overflow: 'scroll', maxWidth: '100%' }}
                  >
                    <table style={{ minWidth: '100%', width: 'max-content', tableLayout: 'auto', borderCollapse: 'collapse' }}>
                      <thead className="sticky top-0 z-10">
                        <tr style={{ backgroundColor: '#27272a' }}>
                          <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-700" style={{ backgroundColor: '#27272a' }}>
                            #
                          </th>
                          {Object.keys(results.data[0]).filter(key => key !== 'geometry').map(key => (
                            <th key={key} className="px-3 py-2 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider border-b border-zinc-700" style={{ whiteSpace: 'nowrap', backgroundColor: '#27272a' }}>
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.data.slice(0, displayedRows).map((row, index) => (
                          <tr 
                            key={index} 
                            className="hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50"
                          >
                            <td className="px-3 py-2 text-xs text-zinc-500 font-mono" style={{ backgroundColor: '#18181b' }}>
                              {index + 1}
                            </td>
                            {Object.entries(row).filter(([key]) => key !== 'geometry').map(([key, value], cellIndex) => (
                              <td key={cellIndex} className="px-3 py-2 text-sm text-zinc-300" style={{ whiteSpace: 'nowrap' }}>
                                {value === null || value === undefined ? (
                                  <span className="text-zinc-600 italic">null</span>
                                ) : typeof value === 'object' ? (
                                  <span className="text-zinc-500 font-mono text-xs">{JSON.stringify(value)}</span>
                                ) : typeof value === 'number' ? (
                                  <span className="font-mono text-green-400">{value.toLocaleString()}</span>
                                ) : (
                                  String(value).length > 100 ? (
                                    <span title={String(value)}>{String(value).substring(0, 100)}...</span>
                                  ) : String(value)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Loading more indicator */}
                    {isLoadingMore && (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mr-2"></div>
                        <span className="text-sm text-zinc-400">Loading more...</span>
                      </div>
                    )}

                    {/* End of results indicator */}
                    {displayedRows >= results.data.length && results.data.length > 50 && (
                      <div className="text-center py-4 text-xs text-zinc-500">
                        ✓ All {results.data.length} records loaded
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : results?.data && results.data.length > 0 ? (
            /* Table View Only for Non-GIS Data with Infinite Scroll */
            <div className="flex-1 flex flex-col bg-zinc-950 min-w-0">
              {/* Table Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-zinc-100">
                    📊 Query Results
                  </h3>
                  <span className="text-sm text-zinc-500">
                    Showing {Math.min(displayedRows, results.data.length)} of {results.data.length} records
                  </span>
                </div>
                {displayedRows < results.data.length && (
                  <span className="text-xs text-green-400 animate-pulse">
                    ↓ Scroll for more
                  </span>
                )}
              </div>

              {/* Scrollable Table Container */}
              <div 
                ref={tableContainerRef}
                onScroll={handleTableScroll}
                className="flex-1 relative min-w-0"
                style={{ minHeight: 0, overflow: 'scroll', maxWidth: '100%' }}
              >
                <table style={{ minWidth: '100%', width: 'max-content', tableLayout: 'auto', borderCollapse: 'collapse' }}>
                  <thead className="sticky top-0 z-10">
                    <tr style={{ backgroundColor: '#27272a' }}>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider border-b border-zinc-700" style={{ backgroundColor: '#27272a' }}>
                        #
                      </th>
                      {Object.keys(results.data[0]).map(key => (
                        <th key={key} className="px-4 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider border-b border-zinc-700" style={{ whiteSpace: 'nowrap', backgroundColor: '#27272a' }}>
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.data.slice(0, displayedRows).map((row, index) => (
                      <tr key={index} className="hover:bg-zinc-800/50 transition-colors border-b border-zinc-800">
                        <td className="px-4 py-3 text-sm text-zinc-500 font-mono" style={{ backgroundColor: '#18181b' }}>
                          {index + 1}
                        </td>
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3 text-sm text-zinc-200" style={{ whiteSpace: 'nowrap' }}>
                            {value === null || value === undefined ? (
                              <span className="text-zinc-500 italic">null</span>
                            ) : typeof value === 'object' ? (
                              <span className="text-zinc-400 font-mono text-xs">{JSON.stringify(value)}</span>
                            ) : typeof value === 'number' ? (
                              <span className="font-mono text-green-400">{value.toLocaleString()}</span>
                            ) : (
                              String(value).length > 100 ? (
                                <span title={String(value)}>{String(value).substring(0, 100)}...</span>
                              ) : String(value)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Loading more indicator */}
                {isLoadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500 mr-2"></div>
                    <span className="text-sm text-zinc-400">Loading more...</span>
                  </div>
                )}

                {/* End of results indicator */}
                {displayedRows >= results.data.length && results.data.length > 50 && (
                  <div className="text-center py-4 text-sm text-zinc-500">
                    ✓ All {results.data.length} records loaded
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center bg-zinc-950">
              <div className="text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">SQL Analytics</h3>
                <p className="text-zinc-400 mb-6 max-w-md">
                  Execute SQL queries against your agricultural data. Results with GIS data will show both map and tabular views.
                </p>
                <div className="text-sm text-zinc-500">
                  Select a Leaf User, enter your SQL query, and click "Execute Query" to get started.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SqlAnalytics
