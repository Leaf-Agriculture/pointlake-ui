import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeafUser } from '../context/LeafUserContext'
import MapComponent from '../components/MapComponent'
import axios from 'axios'
import { getPointlakeApiUrl } from '../config/api'

function PointsAnalytics() {
  const { token, logout, isAuthenticated, loading: authLoading, getEnvironment } = useAuth()
  const { selectedLeafUserId, leafUsers, loadingUsers } = useLeafUser()
  const navigate = useNavigate()
  
  // Estados
  const [userId, setUserId] = useState(selectedLeafUserId || '2bb3b597-3fa3-4eda-a4b4-2e2e498c32c6')
  const [sampleRate, setSampleRate] = useState(100)
  const [startDate, setStartDate] = useState('2020-01-01T00:00:00.000Z')
  const [endDate, setEndDate] = useState('2025-12-01T00:00:00.000Z')
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [metadata, setMetadata] = useState(null)
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [timelineData, setTimelineData] = useState(null)
  const [timelineGrouping, setTimelineGrouping] = useState('day') // 'hour', 'day', 'week', 'month'
  const [filters, setFilters] = useState({
    operationType: [],
    crop: [],
    variety: [],
    recordingStatus: [],
    speedRange: [0, 100],
    elevationRange: [0, 10000],
    dateRange: null
  })
  const [availableFilters, setAvailableFilters] = useState({
    operationType: [],
    crop: [],
    variety: [],
    recordingStatus: []
  })
  const [numericRanges, setNumericRanges] = useState({
    speed: { min: 0, max: 100 },
    elevation: { min: 0, max: 10000 },
    area: { min: 0, max: 1 }
  })
  const [filteredPoints, setFilteredPoints] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  const [operationsByDay, setOperationsByDay] = useState([])
  const [useAIAnalysis, setUseAIAnalysis] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [stats, setStats] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  // Atualizar userId quando selectedLeafUserId mudar (sem carregar automaticamente)
  useEffect(() => {
    if (selectedLeafUserId) {
      setUserId(selectedLeafUserId)
    }
  }, [selectedLeafUserId])

  // Converter formato de data para o formato esperado pela API
  const formatDateForApi = (dateStr) => {
    try {
      const date = new Date(dateStr)
      return date.toISOString()
    } catch (e) {
      return dateStr
    }
  }

  // Extrair mensagem de erro legível de stack traces complexos
  const extractErrorMessage = (fullMessage) => {
    if (!fullMessage) return 'Unknown error'
    
    // Tentar extrair a causa raiz
    const causeMatch = fullMessage.match(/Cause: (.+?)(?:\n|$)/)
    if (causeMatch) {
      return causeMatch[1]
    }
    
    // Tentar extrair mensagem de erro Spark
    const sparkMatch = fullMessage.match(/\[([A-Z_]+)\] (.+?)(?:;|\n)/)
    if (sparkMatch) {
      return `${sparkMatch[1]}: ${sparkMatch[2]}`
    }
    
    // Extrair primeira linha significativa
    const lines = fullMessage.split('\n')
    for (const line of lines) {
      if (line.trim() && !line.startsWith('at ') && !line.includes('Stack trace')) {
        return line.trim()
      }
    }
    
    return fullMessage.substring(0, 200) + '...'
  }

  // Obter título amigável para tipo de erro
  const getErrorTitle = (errorType) => {
    const titles = {
      'QUERY_EXECUTION_ERROR': 'Query Execution Error',
      'NUM_COLUMNS_MISMATCH': 'Schema Mismatch Error',
      'TIMEOUT': 'Request Timeout',
      'INVALID_QUERY': 'Invalid Query',
      'api_error': 'API Error',
      'validation': 'Validation Error',
      'network': 'Network Error'
    }
    return titles[errorType] || 'Error'
  }

  // Gerar dados de timeline agrupados por período
  const generateTimelineData = (points, grouping) => {
    if (!points || points.length === 0) return null

    const grouped = {}
    const timestamps = []

    points.forEach(point => {
      if (!point.timestamp && !point.timestampFormatted) return

      try {
        const date = new Date(point.timestamp)
        if (isNaN(date.getTime())) return

        timestamps.push(date.getTime())

        let key
        switch (grouping) {
          case 'hour':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
            break
          case 'day':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            break
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = `Week of ${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
            break
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            break
          default:
            key = date.toISOString().split('T')[0]
        }

        if (!grouped[key]) {
          grouped[key] = {
            count: 0,
            operationTypes: {},
            crops: {},
            date: date
          }
        }

        grouped[key].count++

        if (point.operationType) {
          grouped[key].operationTypes[point.operationType] = 
            (grouped[key].operationTypes[point.operationType] || 0) + 1
        }

        if (point.crop) {
          grouped[key].crops[point.crop] = 
            (grouped[key].crops[point.crop] || 0) + 1
        }
      } catch (e) {
        console.error('Error processing timestamp:', e)
      }
    })

    const sortedKeys = Object.keys(grouped).sort()
    const maxCount = Math.max(...Object.values(grouped).map(g => g.count))

    return {
      groups: sortedKeys.map(key => ({
        label: key,
        count: grouped[key].count,
        percentage: (grouped[key].count / maxCount) * 100,
        operationTypes: grouped[key].operationTypes,
        crops: grouped[key].crops,
        date: grouped[key].date
      })),
      total: points.length,
      maxCount,
      dateRange: timestamps.length > 0 ? {
        start: new Date(Math.min(...timestamps)),
        end: new Date(Math.max(...timestamps))
      } : null
    }
  }

  // Extrair valores únicos para filtros e calcular ranges numéricos
  const extractUniqueValues = (points) => {
    const unique = {
      operationType: new Set(),
      crop: new Set(),
      variety: new Set(),
      recordingStatus: new Set()
    }

    let speeds = []
    let elevations = []
    let areas = []

    points.forEach(point => {
      if (point.operationType) unique.operationType.add(point.operationType)
      if (point.crop) unique.crop.add(point.crop)
      if (point.variety) unique.variety.add(point.variety)
      if (point.recordingStatus) unique.recordingStatus.add(point.recordingStatus)
      
      if (point.speed != null) speeds.push(point.speed)
      if (point.elevation != null) elevations.push(point.elevation)
      if (point.area != null) areas.push(point.area)
    })

    // Calcular ranges numéricos
    const ranges = {
      speed: {
        min: speeds.length > 0 ? Math.floor(Math.min(...speeds)) : 0,
        max: speeds.length > 0 ? Math.ceil(Math.max(...speeds)) : 100
      },
      elevation: {
        min: elevations.length > 0 ? Math.floor(Math.min(...elevations)) : 0,
        max: elevations.length > 0 ? Math.ceil(Math.max(...elevations)) : 10000
      },
      area: {
        min: areas.length > 0 ? Math.min(...areas) : 0,
        max: areas.length > 0 ? Math.max(...areas) : 1
      }
    }

    setNumericRanges(ranges)

    // Inicializar filtros de range
    setFilters(prev => ({
      ...prev,
      speedRange: [ranges.speed.min, ranges.speed.max],
      elevationRange: [ranges.elevation.min, ranges.elevation.max]
    }))

    return {
      operationType: Array.from(unique.operationType).sort(),
      crop: Array.from(unique.crop).sort(),
      variety: Array.from(unique.variety).sort(),
      recordingStatus: Array.from(unique.recordingStatus).sort()
    }
  }

  // Agrupar operações por dia
  const groupOperationsByDay = (points) => {
    const grouped = {}

    points.forEach(point => {
      if (!point.timestamp) return

      try {
        const date = new Date(point.timestamp)
        const dayKey = date.toISOString().split('T')[0]

        if (!grouped[dayKey]) {
          grouped[dayKey] = {
            date: date,
            operations: [],
            byType: {},
            byCrop: {},
            totalPoints: 0,
            timeRange: { start: date, end: date }
          }
        }

        grouped[dayKey].operations.push(point)
        grouped[dayKey].totalPoints++

        // Agrupar por tipo
        const type = point.operationType || 'Unknown'
        if (!grouped[dayKey].byType[type]) {
          grouped[dayKey].byType[type] = {
            count: 0,
            avgSpeed: 0,
            avgElevation: 0,
            totalArea: 0,
            speeds: [],
            elevations: [],
            areas: []
          }
        }

        const typeData = grouped[dayKey].byType[type]
        typeData.count++
        if (point.speed != null) typeData.speeds.push(point.speed)
        if (point.elevation != null) typeData.elevations.push(point.elevation)
        if (point.area != null) typeData.areas.push(point.area)

        // Agrupar por crop
        const crop = point.crop || 'Unknown'
        if (!grouped[dayKey].byCrop[crop]) {
          grouped[dayKey].byCrop[crop] = 0
        }
        grouped[dayKey].byCrop[crop]++

        // Atualizar time range
        if (date < grouped[dayKey].timeRange.start) {
          grouped[dayKey].timeRange.start = date
        }
        if (date > grouped[dayKey].timeRange.end) {
          grouped[dayKey].timeRange.end = date
        }
      } catch (e) {
        console.error('Error grouping by day:', e)
      }
    })

    // Calcular médias
    Object.values(grouped).forEach(day => {
      Object.values(day.byType).forEach(typeData => {
        if (typeData.speeds.length > 0) {
          typeData.avgSpeed = typeData.speeds.reduce((a, b) => a + b, 0) / typeData.speeds.length
        }
        if (typeData.elevations.length > 0) {
          typeData.avgElevation = typeData.elevations.reduce((a, b) => a + b, 0) / typeData.elevations.length
        }
        if (typeData.areas.length > 0) {
          typeData.totalArea = typeData.areas.reduce((a, b) => a + b, 0)
        }
      })
    })

    return Object.keys(grouped)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(key => ({ key, ...grouped[key] }))
  }

  // Aplicar filtros aos pontos
  const applyFilters = (points, filters) => {
    return points.filter(point => {
      // Filtros categóricos
      if (filters.operationType.length > 0 && !filters.operationType.includes(point.operationType)) {
        return false
      }
      if (filters.crop.length > 0 && !filters.crop.includes(point.crop)) {
        return false
      }
      if (filters.variety.length > 0 && !filters.variety.includes(point.variety)) {
        return false
      }
      if (filters.recordingStatus.length > 0 && !filters.recordingStatus.includes(point.recordingStatus)) {
        return false
      }

      // Filtros numéricos
      if (point.speed != null && filters.speedRange) {
        if (point.speed < filters.speedRange[0] || point.speed > filters.speedRange[1]) {
          return false
        }
      }
      if (point.elevation != null && filters.elevationRange) {
        if (point.elevation < filters.elevationRange[0] || point.elevation > filters.elevationRange[1]) {
          return false
        }
      }

      return true
    })
  }

  // Contar pontos por valor de filtro
  const getFilterCounts = (points, category) => {
    const counts = {}
    points.forEach(point => {
      const value = point[category]
      if (value) {
        counts[value] = (counts[value] || 0) + 1
      }
    })
    return counts
  }

  // Toggle filter value
  const toggleFilter = (category, value) => {
    setFilters(prev => {
      const current = prev[category]
      const isSelected = current.includes(value)
      
      return {
        ...prev,
        [category]: isSelected 
          ? current.filter(v => v !== value)
          : [...current, value]
      }
    })
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      operationType: [],
      crop: [],
      variety: [],
      recordingStatus: [],
      speedRange: [numericRanges.speed.min, numericRanges.speed.max],
      elevationRange: [numericRanges.elevation.min, numericRanges.elevation.max],
      dateRange: null
    })
  }

  // Contar filtros ativos
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.operationType.length > 0) count++
    if (filters.crop.length > 0) count++
    if (filters.variety.length > 0) count++
    if (filters.recordingStatus.length > 0) count++
    if (filters.speedRange && (filters.speedRange[0] !== numericRanges.speed.min || filters.speedRange[1] !== numericRanges.speed.max)) count++
    if (filters.elevationRange && (filters.elevationRange[0] !== numericRanges.elevation.min || filters.elevationRange[1] !== numericRanges.elevation.max)) count++
    return count
  }

  // Atualizar pontos filtrados e valores disponíveis
  useEffect(() => {
    if (points && points.length > 0) {
      const available = extractUniqueValues(points)
      setAvailableFilters(available)
      
      const filtered = applyFilters(points, filters)
      setFilteredPoints(filtered)

      // Agrupar operações por dia
      const byDay = groupOperationsByDay(filtered)
      setOperationsByDay(byDay)
    } else {
      setFilteredPoints([])
      setOperationsByDay([])
      setAvailableFilters({
        operationType: [],
        crop: [],
        variety: [],
        recordingStatus: []
      })
    }
  }, [points, filters])

  // Atualizar timeline quando pontos filtrados ou grouping mudarem
  useEffect(() => {
    if (filteredPoints && filteredPoints.length > 0) {
      const timeline = generateTimelineData(filteredPoints, timelineGrouping)
      setTimelineData(timeline)
    } else {
      setTimelineData(null)
    }
  }, [filteredPoints, timelineGrouping])

  // Decodificar geometria WKB (Well-Known Binary) de base64
  const decodeWKBGeometry = (base64String) => {
    try {
      // Decodificar Base64 para bytes
      const binaryData = atob(base64String)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }

      // Ler endianness (byte 0)
      const littleEndian = bytes[0] === 1
      
      // Ler tipo de geometria (bytes 1-4)
      const view = new DataView(bytes.buffer)
      const geometryTypeRaw = view.getUint32(1, littleEndian)
      
      // Extrair o tipo base (removendo flags de Z/M)
      // 0x80000000 = Has Z (elevação), 0x40000000 = Has M (medida)
      const hasZ = (geometryTypeRaw & 0x80000000) !== 0
      const hasM = (geometryTypeRaw & 0x40000000) !== 0
      const geometryType = geometryTypeRaw & 0x0FFFFFFF
      
      // Tipo 1 = Point
      if (geometryType === 1) {
        const minBytes = 5 + 8 + 8 + (hasZ ? 8 : 0) + (hasM ? 8 : 0)
        
        if (bytes.length >= minBytes) {
          // Ler coordenadas (bytes 5+)
          const lng = view.getFloat64(5, littleEndian)
          const lat = view.getFloat64(13, littleEndian)
          
          // Se tem Z, ler elevação
          let elevation = null
          if (hasZ && bytes.length >= 29) {
            elevation = view.getFloat64(21, littleEndian)
          }
          
          // Verificar se as coordenadas são válidas
          if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
            return { lat, lng, elevation, valid: true }
          }
        }
      }
      
      return { lat: null, lng: null, valid: false }
    } catch (error) {
      console.error('Error decoding WKB:', error)
      return { lat: null, lng: null, valid: false }
    }
  }

  // Carregar pontos
  const loadPoints = async () => {
    if (!userId) {
      setError({ message: 'Please select a user', type: 'validation' })
      return
    }

    setLoading(true)
    setError(null)
    setMetadata(null)
    setAiAnalysis(null)
    
    try {
      const environment = getEnvironment()
      const baseUrl = getPointlakeApiUrl(environment)
      
      // Usar endpoint com AI se solicitado
      const endpoint = useAIAnalysis ? 'points/prompt' : 'points'
      const url = `${baseUrl}/v2/beta/analytics/user/${userId}/${endpoint}`
      
      const params = {
        samplerate: sampleRate,
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate)
      }

      // Adicionar prompt se estiver usando AI
      if (useAIAnalysis && aiPrompt.trim()) {
        params.prompt = aiPrompt.trim()
      }

      console.log('Loading points:', { url, params, useAI: useAIAnalysis })

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*'
        },
        params,
        timeout: 1200000 // 20 minutos = 1200000 ms
      })

      console.log('API Response:', response.data)

      // Verificar se há metadata na resposta
      if (response.data.metadata) {
        setMetadata(response.data.metadata)
        console.log('Metadata:', response.data.metadata)
      }

      // Verificar se há análise de IA
      if (response.data.aiAnalysis) {
        setAiAnalysis(response.data.aiAnalysis)
        setShowAIAnalysis(true)
        console.log('AI Analysis received:', response.data.aiAnalysis.length, 'characters')
      }

      // Verificar se há erros na resposta (mesmo com status 200)
      if (response.data.metadata?.errors && response.data.metadata.errors.length > 0) {
        const apiErrors = response.data.metadata.errors
        console.error('API returned errors:', apiErrors)
        
        // Processar erros
        const errorDetails = apiErrors.map(err => ({
          fileId: err.fileId,
          error: err.error,
          message: err.message,
          shortMessage: extractErrorMessage(err.message)
        }))
        
        setError({
          type: 'api_error',
          message: 'Query execution failed',
          details: errorDetails,
          metadata: response.data.metadata
        })
        
        setPoints([])
        setStats(null)
        setLoading(false)
        return
      }

      // Verificar formato da resposta
      let pointsData = []
      
      if (Array.isArray(response.data)) {
        pointsData = response.data
      } else if (response.data.points && Array.isArray(response.data.points)) {
        pointsData = response.data.points
      } else if (response.data.data && Array.isArray(response.data.data)) {
        pointsData = response.data.data
      }
      
      // Se não há pontos mas também não há erro, pode ser resultado vazio válido
      if (pointsData.length === 0 && response.data.metadata) {
        console.log('No points returned, but query executed successfully')
      }

      // Transformar pontos para o formato esperado pelo MapComponent
      const transformedPoints = pointsData.map((point, index) => {
        // Tentar extrair coordenadas de diferentes formatos possíveis
        let lat = null
        let lng = null

        // Formato 1: latitude, longitude
        if (point.latitude && point.longitude) {
          lat = point.latitude
          lng = point.longitude
        }
        // Formato 2: lat, lng
        else if (point.lat && point.lng) {
          lat = point.lat
          lng = point.lng
        }
        // Formato 3: location.lat, location.lng
        else if (point.location) {
          lat = point.location.lat || point.location.latitude
          lng = point.location.lng || point.location.longitude
        }
        // Formato 4: coordinates [lng, lat] (GeoJSON)
        else if (point.coordinates && Array.isArray(point.coordinates)) {
          lng = point.coordinates[0]
          lat = point.coordinates[1]
        }
        // Formato 5: geometry (WKT ou binário) - formato mais comum da API
        else if (point.geometry && typeof point.geometry === 'string') {
          // O MapComponent já lida com geometria binária
          // Apenas garantir que o ponto tem o campo geometry
          return {
            ...point,
            id: point.id || `point-${index}`,
            // Adicionar timestamp formatado se existir
            timestampFormatted: point.timestamp ? new Date(point.timestamp).toLocaleString('pt-BR') : null
          }
        }

        return {
          ...point,
          latitude: lat,
          longitude: lng,
          id: point.id || `point-${index}`,
          timestampFormatted: point.timestamp ? new Date(point.timestamp).toLocaleString('pt-BR') : null
        }
      }).filter(point => {
        // Filtrar pontos sem coordenadas válidas
        return (point.latitude && point.longitude) || point.geometry
      })

      console.log(`${transformedPoints.length} valid points out of ${pointsData.length} total`)

      setPoints(transformedPoints)

      // Calcular estatísticas
      if (transformedPoints.length > 0) {
        // Extrair coordenadas de todos os pontos (incluindo geometria WKB)
        const allCoords = transformedPoints.map(p => {
          if (p.latitude && p.longitude) {
            return { lat: p.latitude, lng: p.longitude }
          } else if (p.geometry && typeof p.geometry === 'string') {
            const decoded = decodeWKBGeometry(p.geometry)
            return decoded.valid ? { lat: decoded.lat, lng: decoded.lng } : null
          }
          return null
        }).filter(Boolean)

        if (allCoords.length > 0) {
          // Contar tipos de operação
          const operationTypes = {}
          const crops = {}
          transformedPoints.forEach(p => {
            if (p.operationType) {
              operationTypes[p.operationType] = (operationTypes[p.operationType] || 0) + 1
            }
            if (p.crop) {
              crops[p.crop] = (crops[p.crop] || 0) + 1
            }
          })

          const stats = {
            total: transformedPoints.length,
            withCoordinates: allCoords.length,
            minLat: Math.min(...allCoords.map(c => c.lat)),
            maxLat: Math.max(...allCoords.map(c => c.lat)),
            minLng: Math.min(...allCoords.map(c => c.lng)),
            maxLng: Math.max(...allCoords.map(c => c.lng)),
            operationTypes,
            crops
          }
          setStats(stats)
          console.log('📊 Statistics calculated:', stats)
        } else {
          setStats({ total: transformedPoints.length, withCoordinates: 0 })
        }
      } else {
        setStats(null)
      }

    } catch (err) {
      console.error('Error loading points:', err)
      
      // Tratamento específico para timeout
      if (err.code === 'ECONNABORTED') {
        setError({
          type: 'timeout',
          message: 'Request timeout (20 minutes)',
          suggestion: 'Please try with a smaller date range or lower sample rate'
        })
      } 
      // Erro de rede
      else if (!err.response) {
        setError({
          type: 'network',
          message: 'Network error',
          details: err.message,
          suggestion: 'Check your internet connection and try again'
        })
      }
      // Erro da API com resposta
      else if (err.response) {
        const data = err.response.data
        
        // Verificar se há metadata com erros
        if (data?.metadata?.errors && data.metadata.errors.length > 0) {
          const apiErrors = data.metadata.errors
          const errorDetails = apiErrors.map(e => ({
            fileId: e.fileId,
            error: e.error,
            message: e.message,
            shortMessage: extractErrorMessage(e.message)
          }))
          
          setError({
            type: 'api_error',
            message: 'Query execution failed',
            details: errorDetails,
            metadata: data.metadata,
            status: err.response.status
          })
        } else {
          setError({
            type: 'api_error',
            message: data?.message || data?.error || 'Error loading points',
            status: err.response.status,
            details: data
          })
        }
      }
      // Erro genérico
      else {
        setError({
          type: 'unknown',
          message: err.message || 'Error loading points'
        })
      }
      
      setPoints([])
      setStats(null)
      setMetadata(null)
    } finally {
      setLoading(false)
    }
  }

  // Não carregar automaticamente - apenas quando o usuário clicar no botão
  // useEffect removido para evitar carregamento automático

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
      {/* Header */}
      <div className="bg-zinc-800/50 backdrop-blur-sm border-b border-zinc-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToDashboard}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors text-sm font-medium"
              >
                ← Dashboard
              </button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                📍 Points Analytics
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">
                {getEnvironment() === 'dev' ? '🔧 Dev' : '🌐 Prod'}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar com filtros */}
          <div className="lg:col-span-1 space-y-6">
            {/* Filters Card */}
            <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                🎛️ Filters
              </h2>

              {/* User ID */}
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-zinc-300">
                  User ID
                </label>
                {!loadingUsers && leafUsers.length > 0 ? (
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  >
                    {leafUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email || user.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter User ID"
                    className="w-full px-3 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-zinc-500"
                  />
                )}
                <p className="text-xs text-zinc-500 mt-1">
                  User ID to fetch points
                </p>
              </div>

              {/* Sample Rate */}
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-zinc-300">
                  Sample Rate: {sampleRate}
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={sampleRate}
                  onChange={(e) => setSampleRate(parseInt(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-xs text-zinc-500">
                  Sample rate (1-100)
                </p>
              </div>

              {/* Start Date */}
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-zinc-300">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={startDate.slice(0, 16)}
                  onChange={(e) => setStartDate(e.target.value + ':00.000Z')}
                  className="w-full px-3 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>

              {/* End Date */}
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-zinc-300">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={endDate.slice(0, 16)}
                  onChange={(e) => setEndDate(e.target.value + ':00.000Z')}
                  className="w-full px-3 py-2 bg-zinc-700/50 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                />
              </div>

              {/* AI Analysis Toggle */}
              <div className="space-y-2 mb-4 p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAIAnalysis}
                    onChange={(e) => setUseAIAnalysis(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-purple-300">
                    🤖 Enable AI Analysis
                  </span>
                </label>
                
                {useAIAnalysis && (
                  <div className="mt-2">
                    <label className="block text-xs text-purple-300 mb-1">
                      AI Prompt (optional):
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., Analyze crop protection efficiency and recommend improvements..."
                      className="w-full px-2 py-2 bg-zinc-800/50 border border-purple-600 rounded text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                    />
                    <p className="text-xs text-purple-400 mt-1">
                      Leave empty for general analysis
                    </p>
                  </div>
                )}
              </div>

              {/* Load Button */}
              <button
                onClick={loadPoints}
                disabled={loading || !userId}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-lg font-medium transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </span>
                ) : (
                  '🔍 Load Points'
                )}
              </button>
              
              <p className="text-xs text-zinc-500 mt-2 text-center">
                ⏱️ Large requests may take up to 20 minutes
              </p>
            </div>

            {/* Metadata Card */}
            {metadata && !error && (
              <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  ⚙️ Query Info
                </h2>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs">Processing Time:</span>
                    <span className="text-zinc-200 font-medium text-sm">
                      {metadata.processingTimeMs ? `${(metadata.processingTimeMs / 1000).toFixed(2)}s` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs">Total Files:</span>
                    <span className="text-zinc-200 font-medium text-sm">{metadata.totalFiles || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs">Processed:</span>
                    <span className="text-green-400 font-medium text-sm">{metadata.processedFiles || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs">Failed:</span>
                    <span className={`font-medium text-sm ${metadata.failedFiles > 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                      {metadata.failedFiles || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-xs">Sample Rate:</span>
                    <span className="text-blue-400 font-medium text-sm">{metadata.sampleRate || 100}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Statistics Card */}
            {stats && (
              <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📊 Statistics
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Total Points:</span>
                    <span className="text-white font-semibold">{stats.total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">With Coordinates:</span>
                    <span className="text-green-400 font-semibold">{stats.withCoordinates.toLocaleString()}</span>
                  </div>
                  
                  {stats.minLat && (
                    <div className="border-t border-zinc-700 pt-3 mt-3">
                      <div className="text-xs text-zinc-500 space-y-1">
                        <div>Latitude: {stats.minLat.toFixed(4)} → {stats.maxLat.toFixed(4)}</div>
                        <div>Longitude: {stats.minLng.toFixed(4)} → {stats.maxLng.toFixed(4)}</div>
                      </div>
                    </div>
                  )}

                  {stats.operationTypes && Object.keys(stats.operationTypes).length > 0 && (
                    <div className="border-t border-zinc-700 pt-3 mt-3">
                      <div className="text-xs font-medium text-zinc-400 mb-2">Operation Types:</div>
                      <div className="space-y-1">
                        {Object.entries(stats.operationTypes).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-xs">
                            <span className="text-zinc-500">{type}:</span>
                            <span className="text-blue-400">{count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.crops && Object.keys(stats.crops).length > 0 && (
                    <div className="border-t border-zinc-700 pt-3 mt-3">
                      <div className="text-xs font-medium text-zinc-400 mb-2">Crops:</div>
                      <div className="space-y-1">
                        {Object.entries(stats.crops).map(([crop, count]) => (
                          <div key={crop} className="flex justify-between text-xs">
                            <span className="text-zinc-500">{crop}:</span>
                            <span className="text-green-400">{count.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filters Card */}
            {points.length > 0 && (
              <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    🔍 Filters
                    {getActiveFilterCount() > 0 && (
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                        {getActiveFilterCount()}
                      </span>
                    )}
                  </h2>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    {showFilters ? '▼ Hide' : '▶ Show'}
                  </button>
                </div>

                {showFilters && (
                  <div className="space-y-4">
                    {/* Operation Type Filter */}
                    {availableFilters.operationType.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-zinc-300 mb-2">Operation Type</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {availableFilters.operationType.map(type => {
                            const count = getFilterCounts(points, 'operationType')[type] || 0
                            const isSelected = filters.operationType.includes(type)
                            return (
                              <label
                                key={type}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                  isSelected ? 'bg-blue-600/20 border border-blue-500' : 'bg-zinc-700/30 hover:bg-zinc-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleFilter('operationType', type)}
                                    className="rounded"
                                  />
                                  <span className="text-xs text-zinc-200">{type}</span>
                                </div>
                                <span className="text-xs text-zinc-400">{count}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Crop Filter */}
                    {availableFilters.crop.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-zinc-300 mb-2">Crop</div>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {availableFilters.crop.map(crop => {
                            const count = getFilterCounts(points, 'crop')[crop] || 0
                            const isSelected = filters.crop.includes(crop)
                            return (
                              <label
                                key={crop}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                  isSelected ? 'bg-green-600/20 border border-green-500' : 'bg-zinc-700/30 hover:bg-zinc-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleFilter('crop', crop)}
                                    className="rounded"
                                  />
                                  <span className="text-xs text-zinc-200">{crop}</span>
                                </div>
                                <span className="text-xs text-zinc-400">{count}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Variety Filter */}
                    {availableFilters.variety.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-zinc-300 mb-2">Variety</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {availableFilters.variety.map(variety => {
                            const count = getFilterCounts(points, 'variety')[variety] || 0
                            const isSelected = filters.variety.includes(variety)
                            return (
                              <label
                                key={variety}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                  isSelected ? 'bg-purple-600/20 border border-purple-500' : 'bg-zinc-700/30 hover:bg-zinc-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleFilter('variety', variety)}
                                    className="rounded"
                                  />
                                  <span className="text-xs text-zinc-200">{variety}</span>
                                </div>
                                <span className="text-xs text-zinc-400">{count}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recording Status Filter */}
                    {availableFilters.recordingStatus.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-zinc-300 mb-2">Recording Status</div>
                        <div className="space-y-1">
                          {availableFilters.recordingStatus.map(status => {
                            const count = getFilterCounts(points, 'recordingStatus')[status] || 0
                            const isSelected = filters.recordingStatus.includes(status)
                            return (
                              <label
                                key={status}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                  isSelected ? 'bg-yellow-600/20 border border-yellow-500' : 'bg-zinc-700/30 hover:bg-zinc-700/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleFilter('recordingStatus', status)}
                                    className="rounded"
                                  />
                                  <span className="text-xs text-zinc-200 truncate">{status.replace('dtiRecordingStatus', '')}</span>
                                </div>
                                <span className="text-xs text-zinc-400">{count}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Speed Range Filter */}
                    <div>
                      <div className="text-sm font-medium text-zinc-300 mb-2">
                        Speed: {filters.speedRange[0].toFixed(1)} - {filters.speedRange[1].toFixed(1)} km/h
                      </div>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min={numericRanges.speed.min}
                          max={numericRanges.speed.max}
                          value={filters.speedRange[0]}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            speedRange: [parseFloat(e.target.value), prev.speedRange[1]]
                          }))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <input
                          type="range"
                          min={numericRanges.speed.min}
                          max={numericRanges.speed.max}
                          value={filters.speedRange[1]}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            speedRange: [prev.speedRange[0], parseFloat(e.target.value)]
                          }))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    </div>

                    {/* Elevation Range Filter */}
                    <div>
                      <div className="text-sm font-medium text-zinc-300 mb-2">
                        Elevation: {filters.elevationRange[0].toFixed(0)} - {filters.elevationRange[1].toFixed(0)} m
                      </div>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min={numericRanges.elevation.min}
                          max={numericRanges.elevation.max}
                          value={filters.elevationRange[0]}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            elevationRange: [parseFloat(e.target.value), prev.elevationRange[1]]
                          }))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                        <input
                          type="range"
                          min={numericRanges.elevation.min}
                          max={numericRanges.elevation.max}
                          value={filters.elevationRange[1]}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            elevationRange: [prev.elevationRange[0], parseFloat(e.target.value)]
                          }))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {getActiveFilterCount() > 0 && (
                      <button
                        onClick={clearFilters}
                        className="w-full px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500 text-red-200 rounded text-sm font-medium transition-colors"
                      >
                        Clear All Filters
                      </button>
                    )}

                    {/* Filtered Results Info */}
                    <div className="pt-3 border-t border-zinc-700 text-xs text-zinc-400">
                      Showing {filteredPoints.length} of {points.length} points
                      {filteredPoints.length < points.length && (
                        <span className="text-yellow-400"> ({Math.round((filteredPoints.length / points.length) * 100)}% filtered)</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Operations by Day Card */}
            {operationsByDay.length > 0 && (
              <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  📋 Operations by Day
                  <span className="text-xs text-zinc-400 font-normal">({operationsByDay.length} days)</span>
                </h2>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {operationsByDay.slice(0, 10).map((day, index) => {
                    const isExpanded = selectedDay === day.key
                    const duration = (day.timeRange.end - day.timeRange.start) / (1000 * 60) // minutes

                    return (
                      <div
                        key={day.key}
                        className="bg-zinc-900/50 rounded-lg border border-zinc-700 overflow-hidden"
                      >
                        {/* Day Header */}
                        <button
                          onClick={() => setSelectedDay(isExpanded ? null : day.key)}
                          className="w-full p-3 text-left hover:bg-zinc-700/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-200">
                                {day.date.toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {isExpanded ? '▼' : '▶'}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-400">
                              {day.totalPoints} points
                            </span>
                          </div>

                          {/* Operations Summary */}
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(day.byType).map(([type, data]) => (
                              <span
                                key={type}
                                className="px-2 py-0.5 bg-blue-600/20 text-blue-300 rounded text-xs"
                              >
                                {type}: {data.count}
                              </span>
                            ))}
                          </div>

                          {/* Time Info */}
                          <div className="mt-2 text-xs text-zinc-500">
                            {day.timeRange.start.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {day.timeRange.end.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} ({duration.toFixed(0)} min)
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="p-3 border-t border-zinc-700 bg-zinc-900/70">
                            <div className="space-y-3">
                              {Object.entries(day.byType).map(([type, data]) => (
                                <div key={type} className="p-2 bg-zinc-800/50 rounded">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-zinc-200">{type}</span>
                                    <span className="text-xs text-zinc-400">{data.count} ops</span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {data.avgSpeed > 0 && (
                                      <div>
                                        <span className="text-zinc-500">Avg Speed:</span>
                                        <span className="ml-1 text-zinc-300">{data.avgSpeed.toFixed(1)} km/h</span>
                                      </div>
                                    )}
                                    {data.avgElevation > 0 && (
                                      <div>
                                        <span className="text-zinc-500">Avg Elev:</span>
                                        <span className="ml-1 text-zinc-300">{data.avgElevation.toFixed(0)} m</span>
                                      </div>
                                    )}
                                    {data.totalArea > 0 && (
                                      <div className="col-span-2">
                                        <span className="text-zinc-500">Total Area:</span>
                                        <span className="ml-1 text-zinc-300">{data.totalArea.toFixed(4)} ha</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {operationsByDay.length > 10 && (
                    <div className="text-center text-xs text-zinc-500 pt-2">
                      Showing first 10 of {operationsByDay.length} days
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Endpoint Information */}
            <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                ℹ️ Information
              </h2>
              <div className="space-y-2 text-xs text-zinc-400">
                <p>
                  <strong className="text-zinc-300">Endpoint:</strong>
                  <br />
                  <code className="text-blue-400">/v2/beta/analytics/user/&#123;userId&#125;/points</code>
                </p>
                <p className="mt-2">
                  This endpoint returns all agricultural operation points for a specific user in the selected period.
                </p>
              </div>
            </div>
          </div>

          {/* Map and Timeline Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* AI Analysis Card */}
            {aiAnalysis && showAIAnalysis && (
              <div className="bg-purple-900/20 backdrop-blur-sm border border-purple-700/50 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
                    🤖 AI Analysis
                  </h3>
                  <button
                    onClick={() => setShowAIAnalysis(false)}
                    className="text-purple-400 hover:text-purple-300 text-sm"
                  >
                    ✕
                  </button>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-zinc-200 text-sm whitespace-pre-wrap leading-relaxed">
                    {aiAnalysis}
                  </div>
                </div>
              </div>
            )}

            {/* Map */}
            <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl overflow-hidden" style={{ height: timelineData ? 'calc(60vh - 100px)' : 'calc(100vh - 180px)' }}>
              {error && (
                <div className="bg-red-900/50 border-b border-red-700">
                  <div className="p-4">
                    {/* Error Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-red-400 text-xl">❌</span>
                          <h3 className="text-red-200 font-semibold">
                            {getErrorTitle(error.type)}
                          </h3>
                          {error.status && (
                            <span className="px-2 py-0.5 bg-red-800 text-red-200 rounded text-xs font-mono">
                              {error.status}
                            </span>
                          )}
                        </div>
                        <p className="text-red-200 text-sm mb-2">
                          {typeof error === 'string' ? error : error.message}
                        </p>
                        {error.suggestion && (
                          <p className="text-red-300 text-xs italic">
                            💡 {error.suggestion}
                          </p>
                        )}
                      </div>
                      
                      {/* Toggle Details Button */}
                      {error.details && (
                        <button
                          onClick={() => setShowErrorDetails(!showErrorDetails)}
                          className="ml-4 px-3 py-1 bg-red-800 hover:bg-red-700 text-red-200 rounded text-xs font-medium transition-colors"
                        >
                          {showErrorDetails ? '▼ Hide Details' : '▶ Show Details'}
                        </button>
                      )}
                    </div>

                    {/* Error Details (Collapsible) */}
                    {error.details && showErrorDetails && (
                      <div className="mt-4 p-3 bg-red-950/50 rounded border border-red-800 max-h-96 overflow-y-auto">
                        {Array.isArray(error.details) ? (
                          // Multiple errors
                          error.details.map((detail, index) => (
                            <div key={index} className={`${index > 0 ? 'mt-4 pt-4 border-t border-red-800' : ''}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-0.5 bg-red-800 text-red-200 rounded text-xs font-mono">
                                  {detail.error || 'ERROR'}
                                </span>
                                {detail.fileId && detail.fileId !== 'SPARK_QUERY' && (
                                  <span className="text-red-300 text-xs">
                                    File: {detail.fileId}
                                  </span>
                                )}
                              </div>
                              <p className="text-red-200 text-xs mb-2 font-medium">
                                {detail.shortMessage}
                              </p>
                              {detail.message && detail.message !== detail.shortMessage && (
                                <details className="mt-2">
                                  <summary className="text-red-300 text-xs cursor-pointer hover:text-red-200">
                                    Full stack trace
                                  </summary>
                                  <pre className="mt-2 p-2 bg-black/30 rounded text-red-300 text-xs overflow-x-auto whitespace-pre-wrap">
                                    {detail.message}
                                  </pre>
                                </details>
                              )}
                            </div>
                          ))
                        ) : (
                          // Single error object
                          <pre className="text-red-300 text-xs overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(error.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Metadata Summary */}
                    {error.metadata && (
                      <div className="mt-3 pt-3 border-t border-red-800">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-red-400">Total Files:</span>
                            <span className="ml-2 text-red-200 font-medium">{error.metadata.totalFiles || 0}</span>
                          </div>
                          <div>
                            <span className="text-red-400">Processed:</span>
                            <span className="ml-2 text-red-200 font-medium">{error.metadata.processedFiles || 0}</span>
                          </div>
                          <div>
                            <span className="text-red-400">Failed:</span>
                            <span className="ml-2 text-red-200 font-medium">{error.metadata.failedFiles || 0}</span>
                          </div>
                          <div>
                            <span className="text-red-400">Time:</span>
                            <span className="ml-2 text-red-200 font-medium">{error.metadata.processingTimeMs ? `${(error.metadata.processingTimeMs / 1000).toFixed(1)}s` : '-'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {!loading && points.length === 0 && !error && (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-zinc-500">
                    <svg className="w-24 h-24 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-lg font-medium mb-2">No points loaded</p>
                    <p className="text-sm">Configure the filters and click "Load Points"</p>
                  </div>
                </div>
              )}

              {(loading || points.length > 0) && (
                <div className="h-full relative">
                  {loading && (
                    <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center z-50">
                      <div className="text-center">
                        <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-500" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <p className="text-white font-medium">Loading points...</p>
                      </div>
                    </div>
                  )}
                  <MapComponent data={points} mapRef={mapRef} />
                </div>
              )}
            </div>

            {/* Timeline Histogram - Below Map */}
            {timelineData && (
              <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                      📊 Timeline Histogram
                    </h3>
                    {timelineData.dateRange && (
                      <div className="text-xs text-zinc-500">
                        {timelineData.dateRange.start.toLocaleDateString()} - {timelineData.dateRange.end.toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <select
                    value={timelineGrouping}
                    onChange={(e) => setTimelineGrouping(e.target.value)}
                    className="px-2 py-1 bg-zinc-700/50 border border-zinc-600 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hour">Hour</option>
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                </div>

                {/* Histogram Chart */}
                <div className="relative" style={{ height: '200px' }}>
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-zinc-500 pr-2 text-right">
                    <span>{timelineData.maxCount}</span>
                    <span>{Math.round(timelineData.maxCount * 0.75)}</span>
                    <span>{Math.round(timelineData.maxCount * 0.5)}</span>
                    <span>{Math.round(timelineData.maxCount * 0.25)}</span>
                    <span>0</span>
                  </div>

                  {/* Chart area */}
                  <div className="absolute left-12 right-0 top-0 bottom-8 border-l border-b border-zinc-700">
                    <div className="relative h-full flex items-end justify-start gap-0.5 px-1">
                      {timelineData.groups.map((group, index) => {
                        const height = (group.count / timelineData.maxCount) * 100
                        const colors = [
                          'from-blue-600 to-blue-400',
                          'from-purple-600 to-purple-400',
                          'from-green-600 to-green-400',
                          'from-yellow-600 to-yellow-400',
                          'from-red-600 to-red-400'
                        ]
                        const colorIndex = index % colors.length
                        
                        // Get main operation and crop info
                        const operations = Object.entries(group.operationTypes).sort((a, b) => b[1] - a[1])
                        const mainOperation = operations[0]?.[0] || ''
                        const mainOpCount = operations[0]?.[1] || 0
                        
                        return (
                          <div
                            key={index}
                            className="group relative flex-1 min-w-[12px] max-w-[60px]"
                            style={{ height: '100%' }}
                          >
                            {/* Bar */}
                            <div 
                              className={`absolute bottom-0 w-full bg-gradient-to-t ${colors[colorIndex]} rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer`}
                              style={{ height: `${height}%` }}
                              title={`${group.label}: ${group.count} points`}
                            >
                              {/* Operation label inside bar if tall enough */}
                              {height > 30 && mainOperation && (
                                <div className="absolute inset-x-0 bottom-2 flex flex-col items-center justify-center">
                                  <div className="text-xs font-bold text-white/90 bg-black/40 px-1 rounded whitespace-nowrap" style={{ fontSize: '10px' }}>
                                    {mainOperation.slice(0, 4)}
                                  </div>
                                  <div className="text-xs font-medium text-white/80" style={{ fontSize: '9px' }}>
                                    {mainOpCount}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 shadow-xl min-w-[200px]">
                                <div className="text-xs font-medium text-zinc-200 mb-1">
                                  {timelineGrouping === 'hour' ? group.label :
                                   timelineGrouping === 'day' ? new Date(group.label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) :
                                   timelineGrouping === 'week' ? group.label :
                                   new Date(group.label + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                </div>
                                
                                {/* Copyable ISO date */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const isoDate = timelineGrouping === 'hour' 
                                      ? new Date(group.label).toISOString()
                                      : timelineGrouping === 'day'
                                      ? new Date(group.label + 'T00:00:00.000Z').toISOString()
                                      : timelineGrouping === 'week'
                                      ? new Date(group.label.replace('Week of ', '') + 'T00:00:00.000Z').toISOString()
                                      : new Date(group.label + '-01T00:00:00.000Z').toISOString()
                                    navigator.clipboard.writeText(isoDate)
                                    
                                    // Show feedback
                                    const btn = e.currentTarget
                                    const originalText = btn.textContent
                                    btn.textContent = '✓ Copied!'
                                    setTimeout(() => {
                                      btn.textContent = originalText
                                    }, 1000)
                                  }}
                                  className="w-full px-2 py-1 mb-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded text-xs text-blue-300 font-mono transition-colors"
                                  title="Click to copy ISO date"
                                >
                                  {timelineGrouping === 'hour' 
                                    ? new Date(group.label).toISOString().slice(0, 19) + 'Z'
                                    : timelineGrouping === 'day'
                                    ? group.label + 'T00:00:00Z'
                                    : timelineGrouping === 'week'
                                    ? group.label.replace('Week of ', '') + 'T00:00:00Z'
                                    : group.label + '-01T00:00:00Z'
                                  }
                                </button>

                                <div className="text-xs text-zinc-400 mb-1">
                                  <strong className="text-zinc-300">{group.count}</strong> points total
                                </div>
                                
                                {/* Operations */}
                                {Object.keys(group.operationTypes).length > 0 && (
                                  <div className="border-t border-zinc-700 mt-1 pt-1">
                                    <div className="text-xs font-medium text-zinc-400 mb-1">Operations:</div>
                                    {Object.entries(group.operationTypes).map(([type, count]) => (
                                      <div key={type} className="flex justify-between text-xs text-zinc-400">
                                        <span>{type}:</span>
                                        <span className="text-zinc-300">{count}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Crops */}
                                {Object.keys(group.crops || {}).length > 0 && (
                                  <div className="border-t border-zinc-700 mt-1 pt-1">
                                    <div className="text-xs font-medium text-zinc-400 mb-1">Crops:</div>
                                    {Object.entries(group.crops).map(([crop, count]) => (
                                      <div key={crop} className="flex justify-between text-xs text-zinc-400">
                                        <span>{crop}:</span>
                                        <span className="text-green-300">{count}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* X-axis labels with year */}
                  <div className="absolute left-12 right-0 bottom-0 h-8 flex items-start justify-between text-xs text-zinc-500 pt-1">
                    {timelineData.groups.length <= 15 ? (
                      // Show all labels for small datasets with year
                      timelineData.groups.map((group, index) => (
                        <span key={index} className="transform -rotate-45 origin-top-left text-xs truncate" style={{ maxWidth: '80px' }}>
                          {timelineGrouping === 'hour' 
                            ? new Date(group.label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit' })
                            : timelineGrouping === 'day' 
                            ? new Date(group.label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : timelineGrouping === 'week' 
                            ? new Date(group.label.replace('Week of ', '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : new Date(group.label + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          }
                        </span>
                      ))
                    ) : (
                      // Show sample labels for large datasets
                      <>
                        <span className="text-xs">
                          {new Date(timelineData.groups[0]?.label).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-zinc-600">...</span>
                        <span className="text-xs">
                          {new Date(timelineData.groups[Math.floor(timelineData.groups.length / 2)]?.label).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-zinc-600">...</span>
                        <span className="text-xs">
                          {new Date(timelineData.groups[timelineData.groups.length - 1]?.label).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-4 pt-3 border-t border-zinc-700">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex gap-4 text-zinc-400">
                      <span>Periods: <span className="text-zinc-300">{timelineData.groups.length}</span></span>
                      <span>Max: <span className="text-zinc-300">{timelineData.maxCount}</span></span>
                      <span>Total: <span className="text-zinc-300">{timelineData.total}</span></span>
                    </div>
                    <div className="text-zinc-500 text-xs">
                      💡 Hover bars to copy ISO dates
                    </div>
                  </div>
                  
                  {/* Quick copy date range */}
                  {timelineData.dateRange && (
                    <div className="mt-2 flex gap-2 text-xs">
                      <button
                        onClick={() => {
                          const isoDate = timelineData.dateRange.start.toISOString()
                          navigator.clipboard.writeText(isoDate)
                        }}
                        className="px-2 py-1 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 rounded text-zinc-300 font-mono transition-colors"
                        title="Copy start date"
                      >
                        📅 Start: {timelineData.dateRange.start.toISOString().slice(0, 10)}
                      </button>
                      <button
                        onClick={() => {
                          const isoDate = timelineData.dateRange.end.toISOString()
                          navigator.clipboard.writeText(isoDate)
                        }}
                        className="px-2 py-1 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 rounded text-zinc-300 font-mono transition-colors"
                        title="Copy end date"
                      >
                        📅 End: {timelineData.dateRange.end.toISOString().slice(0, 10)}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PointsAnalytics

