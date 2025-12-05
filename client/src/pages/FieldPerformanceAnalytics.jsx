import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeafUser } from '../context/LeafUserContext'
import MapComponent from '../components/MapComponent'
import axios from 'axios'
import { getLeafApiBaseUrl } from '../config/api'

function FieldPerformanceAnalytics() {
  const { token, logout, isAuthenticated, loading: authLoading, getEnvironment } = useAuth()
  const { selectedLeafUserId, setSelectedLeafUserId, leafUsers, loadingUsers } = useLeafUser()
  const navigate = useNavigate()
  
  // Estados
  const [fields, setFields] = useState([])
  const [loadingFields, setLoadingFields] = useState(false)
  const [selectedField, setSelectedField] = useState(null)
  const [fieldBoundary, setFieldBoundary] = useState(null)
  const [loadingBoundary, setLoadingBoundary] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [pinnedProject, setPinnedProject] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [mapData, setMapData] = useState(null)
  const mapRef = useRef(null)
  
  // Estados para criar field
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingField, setCreatingField] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFarmId, setNewFarmId] = useState('')
  const [newBoundaryGeoJson, setNewBoundaryGeoJson] = useState('')
  const [isDrawingField, setIsDrawingField] = useState(false)
  const [drawnFieldCoords, setDrawnFieldCoords] = useState([])
  
  // Estados para análise simplificada
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [analysisSampleRate, setAnalysisSampleRate] = useState(10)
  const [analysisStartDate, setAnalysisStartDate] = useState('2020-01-01')
  const [analysisEndDate, setAnalysisEndDate] = useState('2025-12-01')
  const [showAnalysisResults, setShowAnalysisResults] = useState(false)

  // Estados para comparações salvas
  const [savedComparisons, setSavedComparisons] = useState([]) // [{id, name, season, zone, data, createdAt}, ...]
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [comparisonName, setComparisonName] = useState('')

  // Estados para seleção centralizada
  const [selectedZoneForAnalysis, setSelectedZoneForAnalysis] = useState(null) // Zona selecionada para análise

  // Estados para drill-down da timeline
  const [timelineLevel, setTimelineLevel] = useState('yearmonth') // 'yearmonth', 'week', 'day'
  const [timelineDrillPath, setTimelineDrillPath] = useState([]) // [{level: 'yearmonth', key: '2024-01'}, ...]
  
  // Estados para filtros de pontos
  const [analysisPoints, setAnalysisPoints] = useState([]) // Pontos originais
  const [filteredPoints, setFilteredPoints] = useState([]) // Pontos filtrados
  const [showFilters, setShowFilters] = useState(false)
  const [availableFilters, setAvailableFilters] = useState({
    operationType: [],
    crop: [],
    variety: [],
    recordingStatus: []
  })
  const [selectedFilters, setSelectedFilters] = useState({
    operationType: [],
    crop: [],
    variety: [],
    recordingStatus: []
  })
  const [numericFilters, setNumericFilters] = useState({
    speed: { min: null, max: null, enabled: false },
    elevation: { min: null, max: null, enabled: false },
    appliedRate: { min: null, max: null, enabled: false },
    area: { min: null, max: null, enabled: false }
  })
  const [numericRanges, setNumericRanges] = useState({
    speed: { min: 0, max: 100 },
    elevation: { min: 0, max: 10000 },
    appliedRate: { min: 0, max: 1000 },
    area: { min: 0, max: 1 }
  })
  
  // Estados para Seasons
  const [seasons, setSeasons] = useState([])
  const [loadingSeasons, setLoadingSeasons] = useState(false)
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [creatingSeason, setCreatingSeason] = useState(false)
  const [newSeasonName, setNewSeasonName] = useState('')
  const [newSeasonCrop, setNewSeasonCrop] = useState('')
  const [newSeasonStartDate, setNewSeasonStartDate] = useState('')
  const [newSeasonEndDate, setNewSeasonEndDate] = useState('')
  const [newSeasonActivityTypes, setNewSeasonActivityTypes] = useState([])
  const [selectedSeason, setSelectedSeason] = useState(null)
  
  // Estados para Layers (visualização) - cada layer pode ser ligada/desligada
  const [showBoundaryLayer, setShowBoundaryLayer] = useState(true) // Default: ON
  const [boundaryData, setBoundaryData] = useState(null)
  
  // Layers de dados - cada campo numérico é uma layer separada
  const [activeLayers, setActiveLayers] = useState({
    elevation: false,
    speed: false,
    appliedRate: false,
    area: false,
    yieldVolume: false,
    harvestMoisture: false,
    seedRate: false
  })
  
  // Campos numéricos disponíveis como layers
  const availableDataLayers = [
    { id: 'elevation', name: 'Elevation', unit: 'm' },
    { id: 'speed', name: 'Speed', unit: 'km/h' },
    { id: 'appliedRate', name: 'Applied Rate', unit: '' },
    { id: 'area', name: 'Area', unit: 'ha' },
    { id: 'yieldVolume', name: 'Yield', unit: '' },
    { id: 'harvestMoisture', name: 'Moisture', unit: '%' },
    { id: 'seedRate', name: 'Seed Rate', unit: '' }
  ]
  
  // Estados para criar zonas
  const [isDrawingZone, setIsDrawingZone] = useState(false)
  const [drawnZoneCoords, setDrawnZoneCoords] = useState([])
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [creatingZone, setCreatingZone] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneNote, setNewZoneNote] = useState('')
  const [fieldZones, setFieldZones] = useState([])
  const [loadingZones, setLoadingZones] = useState(false)
  const [selectedZone, setSelectedZone] = useState(null)
  const [visibleZones, setVisibleZones] = useState({}) // { zoneId: true/false }
  
  // Estados para dados de solo (SSURGO)
  const [soilData, setSoilData] = useState([])
  const [loadingSoil, setLoadingSoil] = useState(false)
  const [showSoilLayer, setShowSoilLayer] = useState(false)
  
  
  // Estado para painel de análise retrátil
  const [analysisPanelCollapsed, setAnalysisPanelCollapsed] = useState(false)
  
  // Redirecionar se não autenticado
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  // Carregar campos quando leaf user mudar
  useEffect(() => {
    if (token && selectedLeafUserId) {
      loadFields()
    }
  }, [token, selectedLeafUserId])

  // Restaurar projeto da sessão
  useEffect(() => {
    const saved = sessionStorage.getItem('pinnedFieldProject')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPinnedProject(parsed)
      } catch (e) {
        console.error('Error restoring pinned project:', e)
      }
    }
  }, [])

  // Aplicar filtros quando mudarem
  useEffect(() => {
    if (analysisPoints.length === 0) {
      setFilteredPoints([])
      return
    }

    let filtered = [...analysisPoints]

    // Filtros categóricos
    if (selectedFilters.operationType.length > 0) {
      filtered = filtered.filter(p => selectedFilters.operationType.includes(p.operationType))
    }
    if (selectedFilters.crop.length > 0) {
      filtered = filtered.filter(p => selectedFilters.crop.includes(p.crop))
    }
    if (selectedFilters.variety.length > 0) {
      filtered = filtered.filter(p => selectedFilters.variety.includes(p.variety))
    }
    if (selectedFilters.recordingStatus.length > 0) {
      filtered = filtered.filter(p => selectedFilters.recordingStatus.includes(p.recordingStatus))
    }

    // Filtros numéricos
    if (numericFilters.speed.enabled) {
      filtered = filtered.filter(p => {
        if (p.speed == null) return false
        return p.speed >= (numericFilters.speed.min || 0) && 
               p.speed <= (numericFilters.speed.max || Infinity)
      })
    }
    if (numericFilters.elevation.enabled) {
      filtered = filtered.filter(p => {
        if (p.elevation == null) return false
        return p.elevation >= (numericFilters.elevation.min || 0) && 
               p.elevation <= (numericFilters.elevation.max || Infinity)
      })
    }
    if (numericFilters.appliedRate.enabled) {
      filtered = filtered.filter(p => {
        if (p.appliedRate == null) return false
        return p.appliedRate >= (numericFilters.appliedRate.min || 0) && 
               p.appliedRate <= (numericFilters.appliedRate.max || Infinity)
      })
    }
    if (numericFilters.area.enabled) {
      filtered = filtered.filter(p => {
        if (p.area == null) return false
        return p.area >= (numericFilters.area.min || 0) && 
               p.area <= (numericFilters.area.max || Infinity)
      })
    }

    console.log(`🔍 Filtered ${analysisPoints.length} -> ${filtered.length} points`)
    setFilteredPoints(filtered)
    
    // Atualizar mapa com pontos filtrados usando o sistema de layers
    updateMapDisplay(boundaryData, filtered)
  }, [analysisPoints, selectedFilters, numericFilters])

  // Extrair filtros disponíveis dos pontos
  const extractAvailableFilters = (points) => {
    const filters = {
      operationType: [...new Set(points.map(p => p.operationType).filter(Boolean))],
      crop: [...new Set(points.map(p => p.crop).filter(Boolean))],
      variety: [...new Set(points.map(p => p.variety).filter(Boolean))],
      recordingStatus: [...new Set(points.map(p => p.recordingStatus).filter(Boolean))]
    }

    // Calcular ranges numéricos
    const speeds = points.map(p => p.speed).filter(v => v != null)
    const elevations = points.map(p => p.elevation).filter(v => v != null)
    const appliedRates = points.map(p => p.appliedRate).filter(v => v != null)
    const areas = points.map(p => p.area).filter(v => v != null)

    const ranges = {
      speed: speeds.length > 0 ? { min: Math.min(...speeds), max: Math.max(...speeds) } : { min: 0, max: 100 },
      elevation: elevations.length > 0 ? { min: Math.min(...elevations), max: Math.max(...elevations) } : { min: 0, max: 10000 },
      appliedRate: appliedRates.length > 0 ? { min: Math.min(...appliedRates), max: Math.max(...appliedRates) } : { min: 0, max: 1000 },
      area: areas.length > 0 ? { min: Math.min(...areas), max: Math.max(...areas) } : { min: 0, max: 1 }
    }

    console.log('📊 Available filters:', filters)
    console.log('📊 Numeric ranges:', ranges)

    setAvailableFilters(filters)
    setNumericRanges(ranges)
    
    // Inicializar filtros numéricos com os ranges
    setNumericFilters({
      speed: { min: ranges.speed.min, max: ranges.speed.max, enabled: false },
      elevation: { min: ranges.elevation.min, max: ranges.elevation.max, enabled: false },
      appliedRate: { min: ranges.appliedRate.min, max: ranges.appliedRate.max, enabled: false },
      area: { min: ranges.area.min, max: ranges.area.max, enabled: false }
    })
  }

  // Resetar filtros
  const resetFilters = () => {
    setSelectedFilters({
      operationType: [],
      crop: [],
      variety: [],
      recordingStatus: []
    })
    setNumericFilters({
      speed: { min: numericRanges.speed.min, max: numericRanges.speed.max, enabled: false },
      elevation: { min: numericRanges.elevation.min, max: numericRanges.elevation.max, enabled: false },
      appliedRate: { min: numericRanges.appliedRate.min, max: numericRanges.appliedRate.max, enabled: false },
      area: { min: numericRanges.area.min, max: numericRanges.area.max, enabled: false }
    })
  }

  // Toggle filtro categórico
  const toggleCategoryFilter = (category, value) => {
    setSelectedFilters(prev => {
      const current = prev[category] || []
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter(v => v !== value) }
      } else {
        return { ...prev, [category]: [...current, value] }
      }
    })
  }

  // Função para converter GeoJSON para WKT POLYGON
  const geoJsonToWkt = (geometry) => {
    try {
      let geoJson = geometry
      
      // Se for string, fazer parse
      if (typeof geometry === 'string') {
        geoJson = JSON.parse(geometry)
      }
      
      if (geoJson.type === 'Polygon' && geoJson.coordinates && geoJson.coordinates[0]) {
        // Converter coordenadas [lng, lat] para "lng lat" format
        const coords = geoJson.coordinates[0].map(c => `${c[0]} ${c[1]}`).join(', ')
        return `POLYGON((${coords}))`
      }
      
      if (geoJson.type === 'MultiPolygon' && geoJson.coordinates && geoJson.coordinates[0]) {
        // Usar apenas o primeiro polígono do MultiPolygon
        const coords = geoJson.coordinates[0][0].map(c => `${c[0]} ${c[1]}`).join(', ')
        return `POLYGON((${coords}))`
      }
      
      return null
    } catch (e) {
      console.error('Error converting GeoJSON to WKT:', e)
      return null
    }
  }

  // Processar dados do analytics e criar timeline
  const processAnalyticsData = (data) => {
    // Extrair pontos da resposta (pode vir em diferentes formatos)
    let pointsData = []
    if (Array.isArray(data)) {
      pointsData = data
    } else if (data?.points && Array.isArray(data.points)) {
      pointsData = data.points
    } else if (data?.data && Array.isArray(data.data)) {
      pointsData = data.data
    }

    // Criar timeline baseada nas datas dos pontos com nível atual
    const timelineData = createTimelineFromPoints(pointsData, timelineLevel, timelineDrillPath)

    return {
      raw: data,
      points: pointsData,
      timeline: timelineData
    }
  }

  // Criar dados da timeline a partir dos pontos com suporte a drill-down
  const createTimelineFromPoints = (points, level = 'month', drillPath = []) => {
    if (!points || points.length === 0) return []

    // Extrair todas as datas dos pontos
    const dates = points.map(point => {
      // Tentar diferentes formatos de data
      let date = null
      if (point.timestamp) {
        date = new Date(point.timestamp)
      } else if (point.date) {
        date = new Date(point.date)
      } else if (point.createdAt) {
        date = new Date(point.createdAt)
      } else if (point.time) {
        date = new Date(point.time)
      }

      return date && !isNaN(date.getTime()) ? date : null
    }).filter(date => date !== null)

    if (dates.length === 0) return []

    // Ordenar datas
    dates.sort((a, b) => a - b)

    let buckets = {}
    let keyFormat, displayFormat

    // Filtrar datas baseado no drill path
    let filteredDates = dates
    if (drillPath.length > 0) {
      filteredDates = dates.filter(date => {
        for (const drill of drillPath) {
          if (drill.level === 'yearmonth') {
            const yearMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            if (yearMonthKey !== drill.key) return false
          } else if (drill.level === 'week') {
            const weekKey = getWeekKey(date)
            if (weekKey !== drill.key) return false
          }
        }
        return true
      })
    }

    // Agrupar baseado no nível atual
    switch (level) {
      case 'yearmonth':
        keyFormat = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        displayFormat = (key) => {
          const [year, month] = key.split('-')
          return new Date(year, month - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
        }
        break

      case 'week':
        keyFormat = getWeekKey
        displayFormat = (key) => {
          const [year, week] = key.split('-W')
          return `Week ${week}, ${year}`
        }
        break

      case 'day':
        keyFormat = (date) => date.toISOString().split('T')[0]
        displayFormat = (key) => new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        break

      default:
        return []
    }

    // Criar buckets
    filteredDates.forEach(date => {
      const key = keyFormat(date)
      if (!buckets[key]) {
        buckets[key] = {
          key: key,
          display: displayFormat(key),
          count: 0,
          fullDate: level === 'day' ? new Date(key) : date,
          level: level
        }
      }
      buckets[key].count++
    })

    // Converter para array e ordenar
    const timelinePoints = Object.values(buckets).sort((a, b) => {
      if (level === 'yearmonth' || level === 'day') {
        return new Date(a.key) - new Date(b.key)
      } else {
        // Para semanas, ordenar por ano e semana
        const [aYear, aWeek] = a.key.split('-W').map(Number)
        const [bYear, bWeek] = b.key.split('-W').map(Number)
        return aYear !== bYear ? aYear - bYear : aWeek - bWeek
      }
    })

    return timelinePoints
  }

  // Função auxiliar para obter chave da semana (YYYY-WW)
  const getWeekKey = (date) => {
    const year = date.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
    return `${year}-W${String(weekNumber).padStart(2, '0')}`
  }

  // Funções para drill-down da timeline
  const handleTimelineDrillDown = (item) => {
    const newDrillPath = [...timelineDrillPath, { level: timelineLevel, key: item.key }]

    let nextLevel
    switch (timelineLevel) {
      case 'yearmonth':
        nextLevel = 'week'
        break
      case 'week':
        nextLevel = 'day'
        break
      case 'day':
        // Já no nível mais detalhado
        return
      default:
        return
    }

    setTimelineLevel(nextLevel)
    setTimelineDrillPath(newDrillPath)

    // Recalcular timeline com novo nível
    if (analysisData) {
      const newTimelineData = createTimelineFromPoints(analysisData.points, nextLevel, newDrillPath)
      setAnalysisData(prev => ({
        ...prev,
        timeline: newTimelineData
      }))
    }
  }

  const handleTimelineDrillUp = (targetLevel) => {
    const levelIndex = ['yearmonth', 'week', 'day'].indexOf(targetLevel)
    const newDrillPath = timelineDrillPath.slice(0, levelIndex)

    setTimelineLevel(targetLevel)
    setTimelineDrillPath(newDrillPath)

    // Recalcular timeline com novo nível
    if (analysisData) {
      const newTimelineData = createTimelineFromPoints(analysisData.points, targetLevel, newDrillPath)
      setAnalysisData(prev => ({
        ...prev,
        timeline: newTimelineData
      }))
    }
  }

  const resetTimelineDrill = () => {
    setTimelineLevel('yearmonth')
    setTimelineDrillPath([])
  }

  // Função para obter o polygon WKT para filtrar analytics
  // Prioriza zone visível, senão usa boundary do field
  // Pode receber uma zona específica como parâmetro para forçar o uso dela
  const getAnalyticsPolygon = (forcedZone = null) => {
    // Se uma zona foi forçada (como no caso de análise específica de zona)
    if (forcedZone) {
      console.log('📍 Using forced zone geometry for analytics filter:', forcedZone.name)
      console.log('📍 Zone geometry type:', typeof forcedZone.geometry)
      console.log('📍 Zone geometry preview:', forcedZone.geometry?.substring?.(0, 100) || forcedZone.geometry)

      if (typeof forcedZone.geometry === 'string' && forcedZone.geometry.includes('POLYGON')) {
        console.log('📍 Using WKT polygon directly')
        return forcedZone.geometry
      }
      // Tentar converter de GeoJSON
      console.log('📍 Converting from GeoJSON to WKT')
      const wkt = geoJsonToWkt(forcedZone.geometry)
      console.log('📍 WKT result:', wkt?.substring?.(0, 100) || wkt)
      if (wkt) return wkt
    }

    // Verificar se há alguma zone visível
    const visibleZoneIds = Object.entries(visibleZones)
      .filter(([_, isVisible]) => isVisible)
      .map(([zoneId]) => zoneId)

    if (visibleZoneIds.length > 0) {
      // Usar a primeira zone visível
      const zone = fieldZones.find(z => z.id === visibleZoneIds[0])
      if (zone?.geometry) {
        console.log('📍 Using visible zone geometry for analytics filter:', zone.name)
        // Zone geometry pode ser GeoJSON ou WKT
        if (typeof zone.geometry === 'string' && zone.geometry.includes('POLYGON')) {
          return zone.geometry
        }
        // Tentar converter de GeoJSON
        const wkt = geoJsonToWkt(zone.geometry)
        if (wkt) return wkt
      }
    }

    // Fallback: usar boundary do field
    if (boundaryData?.geometry) {
      console.log('📍 Using field boundary for analytics filter')
      return boundaryData.geometry
    }

    return null
  }

  // Função para carregar campos
  const loadFields = async () => {
    if (!token || !selectedLeafUserId) return

    setLoadingFields(true)
    setError(null)
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      const response = await axios.get(`${baseUrl}/services/fields/api/fields`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json'
        },
        params: {
          leafUserId: selectedLeafUserId,
          page: 0,
          size: 100
        }
      })

      const fieldsData = Array.isArray(response.data) ? response.data : (response.data?.content || [])
      console.log('📍 Fields loaded:', fieldsData.length)
      setFields(fieldsData)
      
    } catch (err) {
      console.error('Error loading fields:', err)
      setError(err.response?.data?.message || err.message || 'Error loading fields')
      setFields([])
    } finally {
      setLoadingFields(false)
    }
  }

  // Função para carregar boundary de um field
  const loadFieldBoundary = async (field) => {
    if (!token || !field?.id) return

    setLoadingBoundary(true)
    setError(null)
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      const response = await axios.get(
        `${baseUrl}/services/fields/api/users/${selectedLeafUserId}/fields/${field.id}/boundary`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      )

      console.log('🗺️ Boundary loaded:', response.data)
      setFieldBoundary(response.data)
      
      // Converter geometry para WKT e salvar separadamente
      if (response.data?.geometry) {
        const wkt = geoJsonToWkt(response.data.geometry)
        if (wkt) {
          console.log('🗺️ WKT geometry:', wkt.substring(0, 100) + '...')
          setBoundaryData({ geometry: wkt, originalGeometry: response.data.geometry })
          // Mostrar boundary inicialmente se layer estiver ativa
          if (showBoundaryLayer) {
            updateMapDisplay({ geometry: wkt }, null)
          }
          // Buscar dados de solo baseado na geometria do field
          loadSoilData(response.data.geometry)
        } else {
          console.error('Could not convert geometry to WKT')
          setError('Could not display boundary geometry')
        }
      }
      
    } catch (err) {
      console.error('Error loading boundary:', err)
      
      // Tentar usar geometry do próprio field como fallback
      if (field.geometry) {
        console.log('Using field geometry as fallback:', typeof field.geometry)
        let wkt = null
        
        if (typeof field.geometry === 'string') {
          if (field.geometry.includes('POLYGON')) {
            wkt = field.geometry
          } else {
            wkt = geoJsonToWkt(field.geometry)
          }
        } else if (field.geometry.type) {
          wkt = geoJsonToWkt(field.geometry)
        }
        
        if (wkt) {
          setBoundaryData({ geometry: wkt })
          if (showBoundaryLayer) {
            updateMapDisplay({ geometry: wkt }, null)
          }
        }
      } else {
        setError('This field has no active boundary')
      }
    } finally {
      setLoadingBoundary(false)
    }
  }

  // Função para buscar dados de solo (SSURGO) baseado na geometria do field
  const loadSoilData = async (fieldGeometry) => {
    if (!token || !fieldGeometry) {
      console.log('⚠️ loadSoilData: Missing token or geometry')
      return
    }

    console.log('🌱 Starting soil data load with geometry:', typeof fieldGeometry, fieldGeometry?.type || 'unknown type')
    setLoadingSoil(true)
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      // Extrair coordenadas do polígono
      let coords = null
      if (typeof fieldGeometry === 'object') {
        if (fieldGeometry.type === 'Polygon' && fieldGeometry.coordinates?.[0]) {
          coords = fieldGeometry.coordinates[0]
        } else if (fieldGeometry.type === 'MultiPolygon' && fieldGeometry.coordinates?.[0]?.[0]) {
          coords = fieldGeometry.coordinates[0][0]
        }
      }
      
      if (!coords || coords.length < 3) {
        console.log('⚠️ Invalid polygon for soil query')
        return
      }
      
      // Calcular bounding box do polígono
      const lngs = coords.map(c => c[0])
      const lats = coords.map(c => c[1])
      const minLng = Math.min(...lngs)
      const maxLng = Math.max(...lngs)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      
      // Criar grid de pontos dentro do bounding box (mais denso para melhor cobertura)
      const gridSize = 8 // 8x8 = 64 pontos para melhor cobertura
      const lngStep = (maxLng - minLng) / (gridSize + 1)
      const latStep = (maxLat - minLat) / (gridSize + 1)

      const gridPoints = []
      for (let i = 1; i <= gridSize; i++) {
        for (let j = 1; j <= gridSize; j++) {
          gridPoints.push({
            lng: minLng + (lngStep * i),
            lat: minLat + (latStep * j)
          })
        }
      }

      // Adicionar pontos extras nos cantos e centro
      gridPoints.push({ lng: minLng, lat: minLat }) // canto inferior esquerdo
      gridPoints.push({ lng: maxLng, lat: minLat }) // canto inferior direito
      gridPoints.push({ lng: minLng, lat: maxLat }) // canto superior esquerdo
      gridPoints.push({ lng: maxLng, lat: maxLat }) // canto superior direito
      gridPoints.push({ lng: (minLng + maxLng) / 2, lat: (minLat + maxLat) / 2 }) // centro

      console.log('🌱 Fetching soil data for', gridPoints.length, 'grid points (parallel queries)')

      // Fazer consultas paralelas para cada ponto (mais confiável)
      const uniqueSoilData = new Map()

      // Criar filtro WKT do field para garantir que pontos estão dentro do field
      let fieldWktFilter = ''
      if (fieldGeometry) {
        const fieldWkt = geoJsonToWkt(fieldGeometry)
        if (fieldWkt) {
          fieldWktFilter = ` AND ST_Contains(ST_GeomFromText('${fieldWkt}'), ST_Point(${point.lng}, ${point.lat}))`
        }
      }

      const queryPromises = gridPoints.map(async (point, index) => {
        try {
          // Para cada ponto, buscar o polígono de solo mais próximo (dentro do field)
          const sqlQuery = `SELECT mukey, county, muaggatt_col_16 as drainage_class, geometry FROM ssurgo_illinois WHERE ST_Contains(ST_GeomFromWKB(geometry), ST_Point(${point.lng}, ${point.lat}))${fieldWktFilter}`

          const response = await axios.get(
            `${baseUrl}/services/pointlake/api/v2/query`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'accept': 'application/json'
              },
              params: {
                sql: sqlQuery
              }
            }
          )

          return response.data || []
        } catch (err) {
          console.warn(`Point ${index + 1}/${gridPoints.length} failed:`, err.message)
          return []
        }
      })

      // Aguardar todas as consultas
      const results = await Promise.all(queryPromises)

      // Consolidar resultados únicos por mukey
      results.flat().forEach(soil => {
        if (soil.mukey && !uniqueSoilData.has(soil.mukey)) {
          uniqueSoilData.set(soil.mukey, soil)
        }
      })

      const soilArray = Array.from(uniqueSoilData.values())
      console.log('🌱 Soil data loaded:', soilArray.length, 'unique polygons from', gridPoints.length, 'grid points within boundary')

      setSoilData(soilArray)
      // Mostrar layer automaticamente se tiver dados
      if (soilArray.length > 0) {
        setShowSoilLayer(true)
      }
    } catch (err) {
      console.error('Error loading soil data:', err)
      setSoilData([])
    } finally {
      setLoadingSoil(false)
    }
  }

  // Função para atualizar o display do mapa com layers combinadas
  const updateMapDisplay = (boundary, points) => {
    const currentBoundary = boundary || boundaryData
    const currentPoints = points || filteredPoints
    
    // Encontrar qual layer de dados está ativa (apenas uma por vez)
    const activeLayerId = Object.entries(activeLayers).find(([, isActive]) => isActive)?.[0] || null
    
    // Coletar geometrias das zones visíveis
    const zoneGeometries = fieldZones
      .filter(zone => visibleZones[zone.id])
      .map(zone => ({
        id: zone.id,
        name: zone.name,
        geometry: zone.geometry,
        type: 'zone'
      }))
    
    // Dados de solo se layer estiver ativa
    const currentSoilData = showSoilLayer && soilData.length > 0 ? soilData : null
    
    console.log('🔄 updateMapDisplay:', {
      hasBoundary: !!currentBoundary?.geometry,
      pointsCount: currentPoints?.length || 0,
      showBoundaryLayer,
      activeLayerId,
      visibleZonesCount: zoneGeometries.length,
      soilPolygons: currentSoilData?.length || 0
    })
    
    // Construir objeto de dados do mapa
    const mapDataObj = {
      zones: zoneGeometries
    }
    
    // Adicionar boundary se ativo
    if (showBoundaryLayer && currentBoundary?.geometry) {
      mapDataObj.geometry = currentBoundary.geometry
      mapDataObj.boundary = currentBoundary.geometry
    }
    
    // Adicionar dados de solo se ativo
    if (currentSoilData) {
      mapDataObj.soilData = currentSoilData
    }
    
    // Adicionar pontos se layer de dados está ativa
    if (activeLayerId && currentPoints && currentPoints.length > 0) {
      const pointsWithHeatmapValue = currentPoints.map(p => ({
        ...p,
        heatmapField: activeLayerId,
        heatmapValue: p[activeLayerId]
      }))
      
      console.log('📍 Points prepared for map:', pointsWithHeatmapValue.length, 'layer:', activeLayerId)
      
      mapDataObj.points = pointsWithHeatmapValue
      mapDataObj.heatmapField = activeLayerId
    }
    
    // Se não temos nada para mostrar
    if (!mapDataObj.geometry && !mapDataObj.points && !mapDataObj.soilData && zoneGeometries.length === 0) {
      setMapData(null)
    } else {
      setMapData(mapDataObj)
    }
  }

  // Toggle de layer de dados (apenas uma ativa por vez)
  const toggleDataLayer = (layerId) => {
    setActiveLayers(prev => {
      const newState = {}
      // Desligar todas as outras e toggle a selecionada
      Object.keys(prev).forEach(key => {
        newState[key] = key === layerId ? !prev[key] : false
      })
      return newState
    })
  }

  // Atualizar mapa quando layers mudarem
  useEffect(() => {
    updateMapDisplay(boundaryData, filteredPoints)
  }, [showBoundaryLayer, activeLayers, boundaryData, visibleZones, fieldZones, showSoilLayer, soilData])



  // Função para executar análise simplificada (season + zone opcional)
  const handleRunAnalysis = async (season, selectedZone = null) => {
    if (!token || !selectedLeafUserId || !season) {
      setError('Season is required for analysis')
      return
    }

    // Verificar se temos geometria para filtrar (field boundary ou zone)
    const hasGeometry = selectedZone || boundaryData?.geometry
    if (!hasGeometry) {
      setError('Field boundary not loaded yet. Please wait for the field to load completely.')
      return
    }

    setLoadingAnalysis(true)
    setError(null)

    // Resetar drill-down da timeline para nova análise
    resetTimelineDrill()

    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)

      // Usar datas da season
      const startDate = season.startDate?.split('T')[0] || '2020-01-01'
      const endDate = season.endDate?.split('T')[0] || '2025-12-01'

      // Atualizar estados de data para display
      setAnalysisStartDate(startDate)
      setAnalysisEndDate(endDate)

      const startDateISO = `${startDate}T00:00:00.000Z`
      const endDateISO = `${endDate}T23:59:59.000Z`

      // Obter polygon (sempre usar zone específica ou boundary do field)
      const polygon = getAnalyticsPolygon(selectedZone)

      console.log('📊 Running analysis:', {
        season: season.name,
        zone: selectedZone?.name || 'Field Overview',
        startDate: startDateISO,
        endDate: endDateISO,
        polygon: polygon ? 'Geometry filter applied' : 'No geometry filter'
      })

      // Carregar dados de solo para a geometria selecionada (field ou zone)
      let geometryForSoil = null

      if (selectedZone) {
        // Zone geometry - converter WKT para GeoJSON se necessário
        if (typeof selectedZone.geometry === 'string') {
          // Tentar parse como GeoJSON primeiro
          try {
            geometryForSoil = JSON.parse(selectedZone.geometry)
          } catch {
            // Se não conseguir parsear, assumir que já é WKT válido
            geometryForSoil = selectedZone.geometry
          }
        } else {
          // Já é GeoJSON
          geometryForSoil = selectedZone.geometry
        }
      } else if (boundaryData?.originalGeometry) {
        // Field boundary - usar geometria original em GeoJSON
        geometryForSoil = boundaryData.originalGeometry
      }

      if (geometryForSoil) {
        console.log('🌱 Loading soil data for:', selectedZone ? `Zone ${selectedZone.name}` : 'Field Overview')
        loadSoilData(geometryForSoil)
      } else {
        console.log('⚠️ No geometry available for soil data loading')
      }

      const params = {
        samplerate: 10, // Sample rate fixo
        startDate: startDateISO,
        endDate: endDateISO
      }

      // Sempre adicionar polygon para filtrar dados pelo field ou zone
      if (polygon) {
        params.polygon = polygon
      }

      const response = await axios.get(
        `${baseUrl}/services/pointlake/api/v2/beta/analytics/user/${selectedLeafUserId}/points`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          },
          params
        }
      )

      console.log('📊 Analysis data received:', response.data)

      // Processar dados para criar timeline
      const processedData = processAnalyticsData(response.data)
      setAnalysisData(processedData)
      setShowAnalysisResults(true)

      // Extrair e processar pontos
      let pointsData = []
      if (Array.isArray(response.data)) {
        pointsData = response.data
      } else if (response.data?.points && Array.isArray(response.data.points)) {
        pointsData = response.data.points
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        pointsData = response.data.data
      }

      console.log(`📊 Found ${pointsData.length} points in response`)

      if (pointsData.length > 0) {
        const transformedPoints = pointsData.map((point, index) => {
          let lat = point.latitude || point.lat
          let lng = point.longitude || point.lng || point.lon

          if ((!lat || !lng) && point.geometry) {
            return {
              ...point,
              geometry: point.geometry,
              id: point.id || index
            }
          }

          if (lat && lng) {
            return {
              ...point,
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
              lat: parseFloat(lat),
              lng: parseFloat(lng),
              id: point.id || index
            }
          }

          return {
            ...point,
            id: point.id || index
          }
        }).filter(p => p.geometry || (p.latitude && p.longitude))

        console.log(`📊 ${transformedPoints.length} valid points transformed for map`)

        if (transformedPoints.length > 0) {
          setAnalysisPoints(transformedPoints)
          setFilteredPoints(transformedPoints)
          extractAvailableFilters(transformedPoints)
          setMapData(transformedPoints)
          setShowFilters(true)

          const analysisType = selectedZone ? `${season.name} - ${selectedZone.name}` : `${season.name} (Field Overview)`
          setSuccessMessage(`Analysis completed for ${analysisType}! ${transformedPoints.length} points loaded.`)
        } else {
          setAnalysisPoints([])
          setFilteredPoints([])
          setSuccessMessage(`Analysis completed! ${pointsData.length} points found but no valid coordinates.`)
        }
      } else {
        setAnalysisPoints([])
        setFilteredPoints([])
        setSuccessMessage('Analysis completed! No points found for this period.')
      }

      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (err) {
      console.error('Error running analysis:', err)
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Error running analysis')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  // Confirmar salvamento para comparação
  const handleConfirmSaveComparison = () => {
    if (!comparisonName.trim()) {
      setError('Comparison name is required')
      return
    }

    const comparison = {
      id: Date.now().toString(),
      name: comparisonName.trim(),
      season: selectedSeason,
      zone: null, // Por enquanto, assumir field overview
      data: analysisData,
      points: analysisPoints,
      createdAt: new Date().toISOString()
    }

    setSavedComparisons(prev => [...prev, comparison])
    setShowComparisonModal(false)
    setComparisonName('')
    setSuccessMessage('Analysis saved for comparison!')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Carregar comparação salva
  const handleLoadComparison = (comparison) => {
    setAnalysisData(comparison.data)
    setAnalysisPoints(comparison.points)
    setFilteredPoints(comparison.points)
    setShowAnalysisResults(true)
    setSelectedSeason(comparison.season)

    if (comparison.points.length > 0) {
      extractAvailableFilters(comparison.points)
      setMapData(comparison.points)
      setShowFilters(true)
    }

    setSuccessMessage(`Loaded comparison: ${comparison.name}`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Remover comparação salva
  const handleDeleteComparison = (comparisonId) => {
    setSavedComparisons(prev => prev.filter(c => c.id !== comparisonId))
    setSuccessMessage('Comparison deleted!')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // Criar novo field com boundary
  const handleCreateField = async () => {
    if (!token || !selectedLeafUserId || !newFieldName.trim()) {
      setError('Field name is required')
      return
    }

    // Validar GeoJSON ou usar coordenadas desenhadas
    let parsedGeometry = null
    
    // Priorizar coordenadas desenhadas
    if (drawnFieldCoords.length >= 3) {
      // Converter coordenadas desenhadas para GeoJSON MultiPolygon
      // drawnFieldCoords está em [lat, lng], precisamos converter para [lng, lat]
      const coords = drawnFieldCoords.map(c => [c[1], c[0]])
      // Fechar o polígono (primeiro ponto = último ponto)
      if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
        coords.push([...coords[0]])
      }
      parsedGeometry = {
        type: 'MultiPolygon',
        coordinates: [[coords]]
      }
      console.log('Using drawn coordinates for field boundary:', coords.length, 'points')
    }
    // Fallback para GeoJSON colado
    else if (newBoundaryGeoJson.trim()) {
      try {
        parsedGeometry = JSON.parse(newBoundaryGeoJson)
        if (!parsedGeometry.type || !['Polygon', 'MultiPolygon'].includes(parsedGeometry.type)) {
          setError('Invalid GeoJSON: must be a Polygon or MultiPolygon')
          return
        }
        if (!parsedGeometry.coordinates || !Array.isArray(parsedGeometry.coordinates)) {
          setError('Invalid GeoJSON: missing coordinates')
          return
        }
        
        // Validação mais rigorosa do formato das coordenadas
        if (parsedGeometry.type === 'Polygon') {
          // Polygon deve ter coordinates como array de rings, onde cada ring é array de [lng, lat]
          const ring = parsedGeometry.coordinates[0]
          if (!Array.isArray(ring)) {
            setError('Invalid GeoJSON Polygon: coordinates must be an array of rings. Did you forget the outer brackets [[...]]?')
            return
          }
          // Cada posição no ring deve ser um array [lng, lat]
          if (!Array.isArray(ring[0]) || ring[0].length < 2) {
            // Tentar corrigir automaticamente: adicionar o nível de array faltante
            console.log('Auto-fixing GeoJSON: wrapping coordinates in extra array')
            parsedGeometry.coordinates = [parsedGeometry.coordinates]
          }
        }
        
        // Verificar se o polígono está fechado (primeiro = último ponto)
        if (parsedGeometry.type === 'Polygon') {
          const ring = parsedGeometry.coordinates[0]
          const first = ring[0]
          const last = ring[ring.length - 1]
          if (first[0] !== last[0] || first[1] !== last[1]) {
            // Fechar o polígono automaticamente
            console.log('Auto-fixing GeoJSON: closing polygon')
            ring.push([...first])
          }
        }
        
        // IMPORTANTE: A API Leaf Fields espera MultiPolygon, não Polygon
        // Converter Polygon para MultiPolygon automaticamente
        if (parsedGeometry.type === 'Polygon') {
          console.log('Converting Polygon to MultiPolygon for API compatibility')
          parsedGeometry = {
            type: 'MultiPolygon',
            coordinates: [parsedGeometry.coordinates]
          }
        }
        
      } catch (e) {
        setError('Invalid GeoJSON format: ' + e.message)
        return
      }
    }

    setCreatingField(true)
    setError(null)
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      // Criar field com geometry incluído
      // NOTA: A API Leaf Fields requer MultiPolygon, não Polygon
      const fieldData = {
        name: newFieldName.trim(),
        geometry: parsedGeometry || {
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
      }
      
      if (newFarmId.trim()) {
        fieldData.farmId = newFarmId.trim()
      }

      console.log('Creating field with geometry:', fieldData)
      console.log('Using token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN')
      console.log('Leaf User ID:', selectedLeafUserId)

      const createResponse = await axios.post(
        `${baseUrl}/services/fields/api/users/${selectedLeafUserId}/fields`,
        fieldData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'accept': 'application/json'
          }
        }
      )

      console.log('✅ Field created:', createResponse.data)

      // Sucesso total
      setSuccessMessage('Field created successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Limpar formulário e fechar modal
      setNewFieldName('')
      setNewFarmId('')
      setNewBoundaryGeoJson('')
      setDrawnFieldCoords([])
      setShowCreateModal(false)
      
      // Recarregar lista
      await loadFields()
      
    } catch (err) {
      console.error('Error creating field:', err)
      console.error('Response:', err.response?.data)
      
      // Tratar erro 401 especificamente
      if (err.response?.status === 401) {
        setError('Session expired. Please logout and login again.')
        return
      }
      
      // Extrair mensagem de erro mais detalhada
      let errorMsg = 'Error creating field'
      if (err.response?.data) {
        const data = err.response.data
        if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
          errorMsg = data.fieldErrors.map(e => `${e.field}: ${e.message}`).join(', ')
        } else if (data.message) {
          errorMsg = data.message
        } else if (data.error) {
          errorMsg = data.error
        } else if (data.title) {
          errorMsg = data.title
        } else if (data.detail) {
          errorMsg = data.detail
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setError(errorMsg)
    } finally {
      setCreatingField(false)
    }
  }

  // Deletar field
  const handleDeleteField = async (fieldId) => {
    if (!token || !selectedLeafUserId || !fieldId) return
    
    if (!confirm('Are you sure you want to delete this field? This action cannot be undone.')) return
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      console.log('🗑️ Deleting field:', fieldId)
      await axios.delete(
        `${baseUrl}/services/fields/api/users/${selectedLeafUserId}/fields/${fieldId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      )
      
      setSuccessMessage('Field deleted successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Se o field deletado estava selecionado, limpar seleção
      if (selectedField?.id === fieldId) {
        setSelectedField(null)
        setFieldBoundary(null)
        setBoundaryData(null)
        setMapData(null)
        setAnalysisData(null)
        setShowAnalysisResults(false)
        setSeasons([])
        setSelectedSeason(null)
        setFieldZones([])
        setSoilData([])
      }
      
      // Se o field deletado estava fixado como projeto, limpar
      if (pinnedProject?.field?.id === fieldId) {
        setPinnedProject(null)
        sessionStorage.removeItem('pinnedFieldProject')
      }
      
      // Recarregar lista de fields
      await loadFields()
      
    } catch (err) {
      console.error('Error deleting field:', err)
      setError(err.response?.data?.message || err.response?.data?.detail || 'Error deleting field')
    }
  }

  // Carregar seasons do field
  const loadFieldSeasons = async (fieldId) => {
    if (!token || !selectedLeafUserId || !fieldId) return

    setLoadingSeasons(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)

      const response = await axios.get(
        `${baseUrl}/services/fields/api/users/${selectedLeafUserId}/seasons`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          },
          params: {
            fieldId: fieldId
          }
        }
      )

      console.log('📅 Seasons loaded:', response.data)
      const seasonsData = Array.isArray(response.data) ? response.data : (response.data?.content || [])

      // Filtro adicional no frontend para garantir que só seasons do field correto sejam mostradas
      const filteredSeasons = seasonsData.filter(season => season.fieldId === fieldId)
      setSeasons(filteredSeasons)

    } catch (err) {
      console.error('Error loading seasons:', err)
      setSeasons([])
    } finally {
      setLoadingSeasons(false)
    }
  }

  // Criar nova season
  const handleCreateSeason = async () => {
    if (!token || !selectedLeafUserId || !selectedField?.id) {
      setError('Please select a field first')
      return
    }

    if (!newSeasonName.trim()) {
      setError('Season name is required')
      return
    }

    if (!newSeasonStartDate || !newSeasonEndDate) {
      setError('Start and end dates are required')
      return
    }

    setCreatingSeason(true)
    setError(null)
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      const seasonData = {
        name: newSeasonName.trim(),
        fieldId: selectedField.id,
        startDate: newSeasonStartDate,
        endDate: newSeasonEndDate,
        crop: newSeasonCrop.trim() || null,
        activityTypes: newSeasonActivityTypes.length > 0 ? newSeasonActivityTypes : null
      }

      console.log('Creating season:', seasonData)

      const response = await axios.post(
        `${baseUrl}/services/fields/api/users/${selectedLeafUserId}/seasons`,
        seasonData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'accept': 'application/json'
          }
        }
      )

      console.log('✅ Season created:', response.data)

      setSuccessMessage('Season created successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Limpar formulário e fechar modal
      setNewSeasonName('')
      setNewSeasonCrop('')
      setNewSeasonStartDate('')
      setNewSeasonEndDate('')
      setNewSeasonActivityTypes([])
      setShowSeasonModal(false)
      
      // Recarregar seasons
      await loadFieldSeasons(selectedField.id)
      
    } catch (err) {
      console.error('Error creating season:', err)
      console.error('Response:', err.response?.data)
      
      if (err.response?.status === 401) {
        setError('Session expired. Please logout and login again.')
        return
      }
      
      let errorMsg = 'Error creating season'
      if (err.response?.data) {
        const data = err.response.data
        if (data.fieldErrors && Array.isArray(data.fieldErrors)) {
          errorMsg = data.fieldErrors.map(e => `${e.field}: ${e.message}`).join(', ')
        } else if (data.message) {
          errorMsg = data.message
        } else if (data.detail) {
          errorMsg = data.detail
        }
      }
      
      setError(errorMsg)
    } finally {
      setCreatingSeason(false)
    }
  }

  // Deletar season
  const handleDeleteSeason = async (seasonId) => {
    if (!token || !selectedLeafUserId || !seasonId) return
    
    if (!confirm('Are you sure you want to delete this season?')) return

    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      await axios.delete(
        `${baseUrl}/services/fields/api/users/${selectedLeafUserId}/seasons/${seasonId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      )

      setSuccessMessage('Season deleted successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Recarregar seasons
      if (selectedField?.id) {
        await loadFieldSeasons(selectedField.id)
      }
      
    } catch (err) {
      console.error('Error deleting season:', err)
      setError(err.response?.data?.message || 'Error deleting season')
    }
  }

  // Carregar zonas do field
  const loadFieldZones = async (fieldId) => {
    if (!token || !selectedLeafUserId || !fieldId) return
    
    setLoadingZones(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      const response = await axios.get(
        `${baseUrl}/services/fields/api/users/${selectedLeafUserId}/fields/${fieldId}/zones`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      )
      
      console.log('🗺️ Zones loaded:', response.data)
      setFieldZones(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Error loading zones:', err)
      setFieldZones([])
    } finally {
      setLoadingZones(false)
    }
  }

  // Criar zona
  const handleCreateZone = async () => {
    if (!token || !selectedLeafUserId || !selectedField?.id) {
      setError('Please select a field first')
      return
    }
    
    if (!newZoneName.trim()) {
      setError('Zone name is required')
      return
    }
    
    if (drawnZoneCoords.length < 3) {
      setError('Please draw a zone on the map first (at least 3 points)')
      return
    }
    
    setCreatingZone(true)
    setError(null)
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      // Converter coordenadas para GeoJSON MultiPolygon
      // Fechar o polígono se necessário
      const coords = [...drawnZoneCoords]
      if (coords.length > 0) {
        const first = coords[0]
        const last = coords[coords.length - 1]
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([...first])
        }
      }
      
      const geometry = {
        type: 'MultiPolygon',
        coordinates: [[[...coords.map(c => [c[1], c[0]])]]] // [lng, lat] format
      }
      
      const zoneData = {
        fieldId: selectedField.id,
        name: newZoneName.trim(),
        note: newZoneNote.trim() || undefined,
        geometry: geometry,
        status: 'ACTIVE',
        timespan: 'PERMANENT'
      }
      
      console.log('Creating zone:', zoneData)
      
      const response = await axios.post(
        `${baseUrl}/services/fields/api/users/${selectedLeafUserId}/fields/${selectedField.id}/zones`,
        zoneData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'accept': 'application/json'
          }
        }
      )
      
      console.log('Zone created:', response.data)
      setSuccessMessage(`Zone "${newZoneName}" created successfully!`)
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Limpar estado
      setShowZoneModal(false)
      setNewZoneName('')
      setNewZoneNote('')
      setDrawnZoneCoords([])
      setIsDrawingZone(false)
      
      // Recarregar zonas
      await loadFieldZones(selectedField.id)
      
    } catch (err) {
      console.error('Error creating zone:', err)
      setError(err.response?.data?.message || err.message || 'Error creating zone')
    } finally {
      setCreatingZone(false)
    }
  }

  // Deletar zona
  const handleDeleteZone = async (zoneId) => {
    if (!token || !selectedLeafUserId || !zoneId) return
    
    if (!confirm('Are you sure you want to delete this zone?')) return
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      // Endpoint de delete usa apenas /zones/{zoneId}
      console.log('🗑️ Deleting zone:', zoneId)
      await axios.delete(
        `${baseUrl}/services/fields/api/zones/${zoneId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          }
        }
      )
      
      setSuccessMessage('Zone deleted successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      
      // Remover a zone dos visibleZones
      setVisibleZones(prev => {
        const newState = { ...prev }
        delete newState[zoneId]
        return newState
      })
      
      // Recarregar zonas
      if (selectedField?.id) {
        await loadFieldZones(selectedField.id)
      }
    } catch (err) {
      console.error('Error deleting zone:', err)
      setError(err.response?.data?.message || 'Error deleting zone')
    }
  }



  // Selecionar field
  const handleSelectField = (field) => {
    setSelectedField(field)
    setAnalysisData(null)
    setShowAnalysisResults(false)
    setSelectedSeason(null)
    setIsDrawingZone(false)
    setDrawnZoneCoords([])
    // Limpar seasons e zones antes de carregar novas
    setSeasons([])
    setFieldZones([])
    loadFieldBoundary(field)
    loadFieldSeasons(field.id)
    loadFieldZones(field.id)
  }

  // Fixar field como projeto da sessão
  const handlePinAsProject = () => {
    if (!selectedField) return
    
    setPinnedProject({
      field: selectedField,
      boundary: fieldBoundary
    })
    
    sessionStorage.setItem('pinnedFieldProject', JSON.stringify({
      field: selectedField,
      boundary: fieldBoundary
    }))
  }

  // Desafixar projeto
  const handleUnpinProject = () => {
    setPinnedProject(null)
    setAnalysisData(null)
    setShowAnalysisResults(false)
    sessionStorage.removeItem('pinnedFieldProject')
  }

  // Filtrar fields por termo de busca
  const filteredFields = fields.filter(field => {
    const name = field.name || field.fieldName || ''
    const farmName = field.farmName || ''
    const search = searchTerm.toLowerCase()
    return name.toLowerCase().includes(search) || farmName.toLowerCase().includes(search)
  })

  // Calcular área do field
  const getFieldArea = (field) => {
    if (field && field.area != null) {
      const hectares = parseFloat(field.area)
      if (!isNaN(hectares) && hectares > 0) {
        const acres = hectares * 2.47105
        return `${hectares.toFixed(2)} ha / ${acres.toFixed(2)} ac`
      }
    }
    return '-'
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Exemplo de GeoJSON para o placeholder
  const geoJsonExample = `{
  "type": "Polygon",
  "coordinates": [[
    [-93.48, 41.77],
    [-93.48, 41.76],
    [-93.47, 41.76],
    [-93.47, 41.77],
    [-93.48, 41.77]
  ]]
}`

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

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col">
      {/* Barra de Progresso Global */}
      {(loadingFields || loadingBoundary || creatingField || loadingAnalysis) && (
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
              <button
                onClick={() => navigate('/dashboard')}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                Field Performance Analytics
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
              
              {/* Dropdown de Leaf Users */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Leaf User:</span>
                <select
                  value={selectedLeafUserId || ''}
                  onChange={(e) => setSelectedLeafUserId(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={loadingUsers}
                >
                  {loadingUsers ? (
                    <option>Loading...</option>
                  ) : leafUsers.length > 0 ? (
                    leafUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName || user.name || user.id.substring(0, 8)}
                      </option>
                    ))
                  ) : (
                    <option value="">No users</option>
                  )}
                </select>
              </div>
            </div>
            
            {/* Barra de Ferramentas */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/points-analytics')}
                className="px-3 py-2 text-sm font-medium bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition duration-150 border border-zinc-700"
              >
                Points Analytics
              </button>
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
        {/* Painel Lateral Esquerdo - Fields */}
        <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col">
          {/* Projeto Fixado */}
          {pinnedProject && (
            <div className="p-3 bg-amber-950/50 border-b border-amber-800/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                  </svg>
                  Active Project
                </span>
                <button
                  onClick={handleUnpinProject}
                  className="text-xs text-amber-400 hover:text-amber-300"
                >
                  Unpin
                </button>
              </div>
              <div className="text-sm font-medium text-zinc-100">
                {pinnedProject.field?.name || pinnedProject.field?.fieldName || 'Unnamed Field'}
              </div>
              {pinnedProject.field?.farmName && (
                <div className="text-xs text-zinc-400 mt-0.5">
                  Farm: {pinnedProject.field.farmName}
                </div>
              )}
              
            </div>
          )}

          {/* Search */}
          <div className="p-3 border-b border-zinc-800">
            <div className="relative">
              <input
                type="text"
                placeholder="Search fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 pl-8 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Header da lista com botão Create */}
          <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Fields ({filteredFields.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-xs"
                title="Create new field"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </button>
              <button
                onClick={loadFields}
                disabled={loadingFields}
                className="text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
                title="Refresh fields"
              >
                <svg className={`w-4 h-4 ${loadingFields ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Lista de Fields */}
          <div className="flex-1 overflow-y-auto">
            {loadingFields ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredFields.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm px-4">
                {fields.length === 0 ? (
                  <div>
                    <p>No fields found for this user</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-2 text-emerald-400 hover:text-emerald-300 text-sm"
                    >
                      + Create your first field
                    </button>
                  </div>
                ) : (
                  'No fields match your search'
                )}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredFields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <div
                      className={`relative group rounded transition-all ${
                        selectedField?.id === field.id
                          ? 'bg-blue-950 border border-blue-800'
                          : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                      }`}
                    >
                      <button
                        onClick={() => handleSelectField(field)}
                        className="w-full text-left p-3 pr-8"
                      >
                        <div className="text-sm font-medium text-zinc-100 truncate">
                          {field.name || field.fieldName || `Field ${field.id.substring(0, 8)}`}
                        </div>
                        {field.farmName && (
                          <div className="text-xs text-zinc-400 truncate mt-0.5">
                            {field.farmName}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500 mt-1">
                          {getFieldArea(field)}
                        </div>
                        {field.providerName && (
                          <div className="text-xs text-zinc-600 mt-0.5">
                            {field.providerName}
                          </div>
                        )}
                      </button>

                      {/* Botão de delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteField(field.id)
                        }}
                        className="absolute top-2 right-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Delete field"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Zones do Field - exibido quando o field está selecionado */}
                    {selectedField?.id === field.id && (
                      <div className="ml-3 pl-3 border-l-2 border-blue-800 space-y-1">
                        <div className="flex items-center justify-between py-1">
                          <span className="text-xs text-zinc-400 font-medium">Zones</span>
                          <button
                            onClick={() => {
                              setIsDrawingZone(true)
                              setDrawnZoneCoords([])
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Draw
                          </button>
                        </div>
                        
                        {loadingZones ? (
                          <div className="flex items-center justify-center py-2">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                          </div>
                        ) : fieldZones.length > 0 ? (
                          <div className="space-y-1">
                            {fieldZones.map(zone => {
                              const isVisible = visibleZones[zone.id] || false
                              return (
                                <div 
                                  key={zone.id} 
                                  className={`flex items-center justify-between px-2 py-1.5 rounded text-xs group cursor-pointer transition ${
                                    isVisible ? 'bg-purple-950/70 border border-purple-700' : 'bg-zinc-800/70 hover:bg-zinc-700/70'
                                  }`}
                                  onClick={() => {
                                    setVisibleZones(prev => ({
                                      ...prev,
                                      [zone.id]: !prev[zone.id]
                                    }))
                                  }}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isVisible}
                                      onChange={() => {}}
                                      className="rounded bg-zinc-700 border-zinc-600 text-purple-500 w-3 h-3"
                                    />
                                    <svg className={`w-3 h-3 flex-shrink-0 ${isVisible ? 'text-purple-400' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                                    </svg>
                                    <span className={`truncate ${isVisible ? 'text-purple-300' : 'text-zinc-300'}`}>{zone.name}</span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteZone(zone.id)
                                    }}
                                    className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="Delete zone"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-zinc-600 py-1 italic">No zones created</div>
                        )}
                        
                        {/* Seasons do Field */}
                        <div className="mt-3 pt-3 border-t border-zinc-700">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs text-zinc-400 font-medium">Analysis</span>
                            <button
                              onClick={() => setShowSeasonModal(true)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add Season
                            </button>
                          </div>
                          
                          {loadingSeasons ? (
                            <div className="flex items-center justify-center py-2">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500"></div>
                            </div>
                          ) : seasons.length > 0 ? (
                            <div className="space-y-1">
                              {seasons.map(season => {
                                const isSelected = selectedSeason?.id === season.id
                                return (
                                  <div 
                                    key={season.id} 
                                    className={`flex items-center justify-between px-2 py-1.5 rounded text-xs group cursor-pointer transition ${
                                      isSelected ? 'bg-emerald-950/70 border border-emerald-700' : 'bg-zinc-800/70 hover:bg-zinc-700/70'
                                    }`}
                                    onClick={() => {
                                      setSelectedSeason(season)
                                      setAnalysisStartDate(season.startDate?.split('T')[0] || '')
                                      setAnalysisEndDate(season.endDate?.split('T')[0] || '')
                                    }}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <svg className={`w-3 h-3 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <div className="min-w-0 flex-1">
                                        <span className={`truncate block ${isSelected ? 'text-emerald-300' : 'text-zinc-300'}`}>
                                          {season.name || 'Unnamed'}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 block truncate">
                                          {season.startDate?.split('T')[0]} → {season.endDate?.split('T')[0]}
                                        </span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteSeason(season.id)
                                      }}
                                      className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                      title="Delete season"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-600 py-1 italic">No seasons created</div>
                          )}
                        </div>

                        {/* Comparações Salvas */}
                        {savedComparisons.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-zinc-700">
                            <div className="flex items-center justify-between py-1">
                              <span className="text-xs text-zinc-400 font-medium">Saved Comparisons</span>
                            </div>
                            <div className="space-y-1">
                              {savedComparisons.map(comparison => (
                                <div key={comparison.id} className="group relative">
                                  <button
                                    onClick={() => handleLoadComparison(comparison)}
                                    className="w-full text-left px-2 py-1.5 rounded text-xs bg-orange-950/30 hover:bg-orange-900/50 transition flex items-center gap-2"
                                  >
                                    <svg className="w-3 h-3 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                    <div className="min-w-0 flex-1">
                                      <span className="text-orange-300 truncate block">{comparison.name}</span>
                                      <span className="text-[10px] text-zinc-500 block truncate">
                                        {comparison.season?.name || 'Unknown'} • {new Date(comparison.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteComparison(comparison.id)
                                    }}
                                    className="absolute top-1 right-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="Delete comparison"
                                  >
                                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Área Central - Mapa e Resultados */}
        <div className="flex-1 flex flex-col">
          {/* Controles de Análise */}
          {selectedField && seasons.length > 0 && (
            <div className="bg-zinc-900 border-b border-zinc-800 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100 mb-2">Run Analysis</h3>
                    <div className="flex items-center gap-3">
                      {/* Seleção de Season */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Season</label>
                        <select
                          value={selectedSeason?.id || ''}
                          onChange={(e) => {
                            const seasonId = e.target.value
                            const season = seasons.find(s => s.id === seasonId)
                            setSelectedSeason(season)
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[150px]"
                        >
                          <option value="">Select Season</option>
                          {seasons.map(season => (
                            <option key={season.id} value={season.id}>
                              {season.name || 'Unnamed'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Seleção de Zone (opcional) */}
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Zone (optional)</label>
                        <select
                          value={selectedZoneForAnalysis?.id || ''}
                          onChange={(e) => {
                            const zoneId = e.target.value
                            const zone = zoneId ? fieldZones.find(z => z.id === zoneId) : null
                            setSelectedZoneForAnalysis(zone)
                          }}
                          className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 min-w-[150px]"
                        >
                          <option value="">Field Overview</option>
                          {fieldZones.map(zone => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Botão Run Analysis */}
                      <div className="flex items-end">
                        <button
                          onClick={() => {
                            if (!selectedSeason) {
                              setError('Please select a season first')
                              return
                            }
                            handleRunAnalysis(selectedSeason, selectedZoneForAnalysis)
                          }}
                          disabled={loadingAnalysis || !selectedSeason}
                          className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                        >
                          {loadingAnalysis ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Running...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Run Analysis</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info do Field Selecionado */}
          {selectedField && (
            <div className="bg-zinc-900 border-b border-zinc-800 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">
                      {selectedField.name || selectedField.fieldName || 'Unnamed Field'}
                    </h2>
                    <p className="text-xs text-zinc-400">
                      {selectedField.farmName && `${selectedField.farmName} • `}
                      {getFieldArea(selectedField)}
                      {selectedField.status && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                          selectedField.status === 'PROCESSED' ? 'bg-emerald-950 text-emerald-400' :
                          selectedField.status === 'WAITING' ? 'bg-amber-950 text-amber-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {selectedField.status}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {fieldBoundary && (
                    <button
                      onClick={handlePinAsProject}
                      disabled={pinnedProject?.field?.id === selectedField.id}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                        pinnedProject?.field?.id === selectedField.id
                          ? 'bg-amber-950 text-amber-400 cursor-not-allowed border border-amber-800'
                          : 'bg-blue-950 text-blue-200 hover:bg-blue-900 border border-blue-800'
                      }`}
                    >
                      {pinnedProject?.field?.id === selectedField.id ? '📌 Pinned' : '📍 Pin as Project'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteField(selectedField.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded transition"
                    title="Delete Field"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedField(null)
                      setFieldBoundary(null)
                      setMapData(null)
                      setAnalysisData(null)
                      setShowAnalysisResults(false)
                      setSeasons([])
                      setSelectedSeason(null)
                    }}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mapa e Resultados de Análise */}
          <div className="flex-1 flex">
            {/* Mapa Normal */}
              /* Mapa Normal */
              <div className={`${showAnalysisResults ? 'w-1/2' : 'flex-1'} relative transition-all`}>
                <MapComponent 
                  data={mapData} 
                  mapRef={mapRef}
                  isDrawingMode={isDrawingZone || isDrawingField}
                  drawnCoords={isDrawingField ? drawnFieldCoords : drawnZoneCoords}
                  onCoordsChange={isDrawingField ? setDrawnFieldCoords : setDrawnZoneCoords}
                />
              
              {/* Painel de Controle de Layers */}
              {(boundaryData || analysisPoints.length > 0) && (
                <div className="absolute top-2 right-2 z-20">
                  <div className="bg-zinc-900/95 backdrop-blur rounded-lg border border-zinc-700 shadow-lg min-w-[180px]">
                    {/* Header */}
                    <div className="px-3 py-2 border-b border-zinc-700 flex items-center gap-2">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span className="text-xs font-medium text-zinc-300">Layers</span>
                      {analysisPoints.length > 0 && (
                        <span className="text-xs text-zinc-500 ml-auto">{filteredPoints.length} pts</span>
                      )}
                    </div>
                    
                    <div className="p-2 space-y-1">
                      {/* Field Boundary Layer - sempre primeiro */}
                      {boundaryData && (
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showBoundaryLayer}
                            onChange={(e) => setShowBoundaryLayer(e.target.checked)}
                            className="rounded bg-zinc-700 border-zinc-600 text-blue-500 w-4 h-4"
                          />
                          <span className="text-xs text-zinc-300">Field Boundary</span>
                        </label>
                      )}
                      
                      {/* Soil Data Layer (SSURGO) */}
                      {soilData.length > 0 && (
                        <label className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                          showSoilLayer ? 'bg-amber-950/50 border border-amber-700/50' : 'hover:bg-zinc-800'
                        }`}>
                          <input
                            type="checkbox"
                            checked={showSoilLayer}
                            onChange={(e) => setShowSoilLayer(e.target.checked)}
                            className="rounded bg-amber-700 border-amber-600 text-amber-500 w-4 h-4"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-amber-300 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                              </svg>
                              Soil Drainage
                            </div>
                            {showSoilLayer && (
                              <div className="text-[10px] text-amber-400/70 mt-0.5">
                                {soilData.length} polygons • SSURGO
                              </div>
                            )}
                          </div>
                          {loadingSoil ? (
                            <div className="flex items-center gap-1 text-xs text-amber-400">
                              <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                              <span>Loading soil data...</span>
                            </div>
                          ) : soilData.length > 0 && (
                            <div className="text-[10px] text-amber-400/70 mt-0.5">
                              {soilData.length} polygons • SSURGO
                            </div>
                          )}
                        </label>
                      )}
                      
                      {/* Visible Zones - mostrar zones que estão ativas */}
                      {fieldZones.length > 0 && Object.values(visibleZones).some(v => v) && (
                        <>
                          <div className="border-t border-zinc-700 my-1"></div>
                          <div className="text-xs text-zinc-500 px-2 py-1">Zones</div>
                          {fieldZones.filter(zone => visibleZones[zone.id]).map(zone => (
                            <label 
                              key={zone.id} 
                              className="flex items-center gap-2 px-2 py-1.5 rounded bg-purple-950/50 border border-purple-800/50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={true}
                                onChange={() => {
                                  setVisibleZones(prev => ({
                                    ...prev,
                                    [zone.id]: false
                                  }))
                                }}
                                className="rounded bg-purple-700 border-purple-600 text-purple-500 w-4 h-4"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-purple-300 truncate">{zone.name}</div>
                                {zone.note && (
                                  <div className="text-[10px] text-purple-400/60 truncate">{zone.note}</div>
                                )}
                              </div>
                              <svg className="w-3 h-3 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
                              </svg>
                            </label>
                          ))}
                        </>
                      )}
                      
                      {/* Data Layers - cada campo numérico é uma layer separada */}
                      {analysisPoints.length > 0 && (
                        <>
                          <div className="border-t border-zinc-700 my-1"></div>
                          {availableDataLayers.map(layer => {
                            const hasData = filteredPoints.some(p => p[layer.id] != null)
                            if (!hasData) return null
                            
                            const isActive = activeLayers[layer.id]
                            const values = filteredPoints.map(p => p[layer.id]).filter(v => v != null)
                            const min = values.length > 0 ? Math.min(...values) : 0
                            const max = values.length > 0 ? Math.max(...values) : 0
                            const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
                            
                            return (
                              <label 
                                key={layer.id} 
                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                                  isActive ? 'bg-blue-950 border border-blue-700' : 'hover:bg-zinc-800'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={() => toggleDataLayer(layer.id)}
                                  className="rounded bg-zinc-700 border-zinc-600 text-blue-500 w-4 h-4"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-zinc-300">{layer.name}</div>
                                  {isActive && (
                                    <div className="grid grid-cols-3 gap-1 text-xs mt-1">
                                      <div className="text-center">
                                        <div className="text-zinc-500">Min</div>
                                        <div className="text-blue-400 font-medium">{min.toFixed(1)}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-zinc-500">Avg</div>
                                        <div className="text-yellow-400 font-medium">{avg.toFixed(1)}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="text-zinc-500">Max</div>
                                        <div className="text-red-400 font-medium">{max.toFixed(1)}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </>
                      )}
                      
                      {/* Drawing Mode Info - exibido quando o modo de desenho está ativo */}
                      {isDrawingZone && (
                        <>
                          <div className="border-t border-zinc-700 my-1"></div>
                          <div className="px-2 py-1">
                            <div className="bg-emerald-950 border border-emerald-700 rounded p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-emerald-300 font-medium">Drawing Zone</span>
                                <button
                                  onClick={() => {
                                    setIsDrawingZone(false)
                                    setDrawnZoneCoords([])
                                  }}
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="text-xs text-emerald-300/80 mb-2">
                                Click on map to add points ({drawnZoneCoords.length} points)
                              </div>
                              {drawnZoneCoords.length >= 3 && (
                                <button
                                  onClick={() => setShowZoneModal(true)}
                                  className="w-full px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-500"
                                >
                                  Save Zone
                                </button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                      
                      {/* Botão Compare Mode */}
                      {analysisPoints.length > 0 && (
                        <>
                          <div className="border-t border-zinc-700 my-1"></div>
                          <button
                            onClick={() => setCompareMode(true)}
                            className="w-full px-2 py-1.5 text-xs bg-purple-950 text-purple-300 rounded hover:bg-purple-900 border border-purple-800 flex items-center justify-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Drawing Mode Overlay - Zone */}
              {isDrawingZone && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <div className="bg-emerald-900/95 backdrop-blur rounded-lg px-4 py-3 border border-emerald-600 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center animate-pulse">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-emerald-100 font-medium text-sm">Drawing Zone</div>
                        <div className="text-emerald-300/80 text-xs">Click on the map to add points ({drawnZoneCoords.length} points)</div>
                      </div>
                    </div>
                    {drawnZoneCoords.length >= 3 && (
                      <div className="mt-2 pt-2 border-t border-emerald-700 flex gap-2 pointer-events-auto">
                        <button
                          onClick={() => setShowZoneModal(true)}
                          className="flex-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-500 transition font-medium"
                        >
                          Save Zone
                        </button>
                        <button
                          onClick={() => {
                            setIsDrawingZone(false)
                            setDrawnZoneCoords([])
                          }}
                          className="px-3 py-1.5 text-xs bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {drawnZoneCoords.length > 0 && drawnZoneCoords.length < 3 && (
                      <div className="mt-2 text-xs text-emerald-400/70">
                        Need {3 - drawnZoneCoords.length} more point{3 - drawnZoneCoords.length > 1 ? 's' : ''} to create zone
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Drawing Mode Overlay - Field */}
              {isDrawingField && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                  <div className="bg-blue-900/95 backdrop-blur rounded-lg px-4 py-3 border border-blue-600 shadow-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-blue-100 font-medium text-sm">Drawing Field Boundary</div>
                        <div className="text-blue-300/80 text-xs">Click on the map to add points ({drawnFieldCoords.length} points)</div>
                      </div>
                    </div>
                    {drawnFieldCoords.length >= 3 && (
                      <div className="mt-2 pt-2 border-t border-blue-700 flex gap-2 pointer-events-auto">
                        <button
                          onClick={() => {
                            setIsDrawingField(false)
                            setShowCreateModal(true)
                          }}
                          className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition font-medium"
                        >
                          Continue to Create Field
                        </button>
                        <button
                          onClick={() => {
                            setIsDrawingField(false)
                            setDrawnFieldCoords([])
                          }}
                          className="px-3 py-1.5 text-xs bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {drawnFieldCoords.length > 0 && drawnFieldCoords.length < 3 && (
                      <div className="mt-2 text-xs text-blue-400/70">
                        Need {3 - drawnFieldCoords.length} more point{3 - drawnFieldCoords.length > 1 ? 's' : ''} to create boundary
                      </div>
                    )}
                    {drawnFieldCoords.length === 0 && (
                      <div className="mt-2 flex gap-2 pointer-events-auto">
                        <button
                          onClick={() => {
                            setIsDrawingField(false)
                            setShowCreateModal(true)
                          }}
                          className="px-3 py-1.5 text-xs bg-zinc-700 text-zinc-200 rounded hover:bg-zinc-600 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loading Overlay */}
              {(loadingBoundary || loadingAnalysis) && (
                <div className="absolute inset-0 bg-zinc-950/50 flex items-center justify-center z-10">
                  <div className="bg-zinc-900 rounded-lg p-4 flex items-center gap-3 border border-zinc-800">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    <span className="text-zinc-300 text-sm">
                      {loadingAnalysis ? 'Running analysis...' : 'Loading boundary...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Mensagem quando não há field selecionado */}
              {!selectedField && !loadingFields && !analysisData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-zinc-900/90 rounded-lg p-6 text-center border border-zinc-800 max-w-sm">
                    <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-zinc-400 text-sm">Select a field from the list to view its boundary on the map</p>
                  </div>
                </div>
              )}
            </div>

            {/* Painel de Resultados da Análise - Retrátil */}
            {showAnalysisResults && analysisData && (
              <div className={`${analysisPanelCollapsed ? 'w-10' : 'w-1/2'} bg-zinc-900 border-l border-zinc-800 flex flex-col transition-all duration-300`}>
                {/* Botão de expandir/recolher na lateral */}
                <button
                  onClick={() => setAnalysisPanelCollapsed(!analysisPanelCollapsed)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-30 bg-zinc-800 border border-zinc-700 rounded-full p-1 hover:bg-zinc-700 transition"
                  style={{ marginLeft: analysisPanelCollapsed ? '0' : '-12px' }}
                >
                  <svg 
                    className={`w-4 h-4 text-zinc-400 transition-transform ${analysisPanelCollapsed ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {analysisPanelCollapsed ? (
                  /* Painel Recolhido - apenas ícone vertical */
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="writing-mode-vertical text-xs text-zinc-500 transform rotate-180" style={{ writingMode: 'vertical-rl' }}>
                      Analysis ({filteredPoints.length} pts)
                    </div>
                  </div>
                ) : (
                  /* Painel Expandido */
                  <>
                    <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Analysis Results
                        {filteredPoints.length !== analysisPoints.length && (
                          <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">
                            {filteredPoints.length} / {analysisPoints.length}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowFilters(!showFilters)}
                          className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition ${
                            showFilters ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                          Filters
                        </button>
                        <button
                          onClick={handleSaveForComparison}
                          className="px-2 py-1 text-xs rounded flex items-center gap-1 bg-orange-600 text-white hover:bg-orange-500 transition"
                          title="Save analysis for comparison"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          Save
                        </button>
                        <button
                          onClick={() => setAnalysisPanelCollapsed(true)}
                          className="text-zinc-400 hover:text-zinc-200"
                          title="Collapse panel"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            setShowAnalysisResults(false)
                            setAnalysisData(null)
                            setAnalysisPoints([])
                            setFilteredPoints([])
                            setShowFilters(false)
                          }}
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                
                <div className="flex-1 overflow-auto p-3">
                  {/* Summary */}
                  <div className="bg-zinc-800 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-zinc-500">Total Points:</span>
                        <span className="text-zinc-100 ml-2">{analysisPoints.length}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Filtered:</span>
                        <span className="text-zinc-100 ml-2">{filteredPoints.length}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Sample Rate:</span>
                        <span className="text-zinc-100 ml-2">{analysisSampleRate}%</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Period:</span>
                        <span className="text-zinc-100 ml-2">{analysisStartDate} - {analysisEndDate}</span>
                      </div>
                      <div className="col-span-2 mt-2 pt-2 border-t border-zinc-700">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">Soil Data:</span>
                          {loadingSoil ? (
                            <div className="flex items-center gap-2 text-amber-400">
                              <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-xs">Loading...</span>
                            </div>
                          ) : (
                            <span className="text-zinc-100">{soilData.length} polygons loaded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline - Data Availability */}
                  {analysisData?.timeline && analysisData.timeline.length > 0 && (
                    <div className="bg-zinc-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase flex items-center gap-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Data Timeline
                        <span className="text-xs text-zinc-500">
                          ({analysisData.timeline.length} {timelineLevel === 'yearmonth' ? 'month-years' : timelineLevel === 'week' ? 'weeks' : 'days'})
                        </span>
                        </h4>

                        {/* Breadcrumb navigation */}
                        {timelineDrillPath.length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <button
                              onClick={resetTimelineDrill}
                              className="text-blue-400 hover:text-blue-300 underline"
                            >
                              All
                            </button>
                            {timelineDrillPath.map((drill, index) => (
                              <React.Fragment key={index}>
                                <span className="text-zinc-500">›</span>
                                {index < timelineDrillPath.length - 1 ? (
                                    <button
                                      onClick={() => handleTimelineDrillUp(drill.level)}
                                      className="text-blue-400 hover:text-blue-300 underline"
                                    >
                                    {drill.level === 'yearmonth' ?
                                      new Date(drill.key).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) :
                                      drill.level === 'week' ?
                                      `W${drill.key.split('-W')[1]}` :
                                      drill.key
                                    }
                                  </button>
                                ) : (
                                  <span className="text-zinc-300">
                                    {drill.level === 'yearmonth' ?
                                      new Date(drill.key).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) :
                                      drill.level === 'week' ?
                                      `W${drill.key.split('-W')[1]}` :
                                      drill.key
                                    }
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        {/* Timeline container with horizontal scroll */}
                        <div className="overflow-x-auto pb-2">
                          <div className="flex gap-1 min-w-max" style={{ width: 'max-content' }}>
                            {analysisData.timeline.map((item, index) => {
                              const isToday = timelineLevel === 'day' && item.key === new Date().toISOString().split('T')[0]
                              const intensity = Math.min(item.count / (timelineLevel === 'month' ? 100 : timelineLevel === 'week' ? 50 : 10), 1)
                              const canDrillDown = timelineLevel !== 'day'

                              return (
                                <div
                                  key={item.key}
                                  className="flex flex-col items-center gap-1 min-w-[40px]"
                                  title={`${item.display}: ${item.count} points${canDrillDown ? ' (click to drill down)' : ''}`}
                                >
                                  {/* Timeline bar */}
                                  <div
                                    className={`w-8 h-12 rounded-sm transition-all ${
                                      canDrillDown ? 'cursor-pointer hover:scale-110 hover:shadow-lg' : 'cursor-default'
                                    } ${
                                      isToday ? 'ring-2 ring-blue-400' : ''
                                    }`}
                                    style={{
                                      backgroundColor: `rgba(59, 130, 246, ${0.3 + intensity * 0.7})`,
                                      border: isToday ? '2px solid rgb(59 130 246)' : '1px solid rgb(75 85 99)'
                                    }}
                                    onClick={() => {
                                      if (canDrillDown) {
                                        handleTimelineDrillDown(item)
                                      }
                                    }}
                                  >
                                    {/* Point count indicator */}
                                    {item.count > 0 && (
                                      <div className="w-full h-full flex items-end justify-center pb-1">
                                        <div
                                          className="w-1 bg-white rounded-full opacity-80"
                                          style={{ height: `${Math.max(2, (item.count / Math.max(...analysisData.timeline.map(d => d.count))) * 8)}px` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Date label */}
                                  <div className="text-[10px] text-zinc-500 transform -rotate-45 origin-top whitespace-nowrap">
                                    {item.display}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Timeline axis */}
                        <div className="mt-2 pt-2 border-t border-zinc-700">
                          <div className="flex justify-between text-xs text-zinc-500">
                            <span>{analysisData.timeline.length > 0 ? analysisData.timeline[0].display : ''}</span>
                            <span>{analysisData.timeline.length > 0 ? analysisData.timeline[analysisData.timeline.length - 1].display : ''}</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-blue-500/30 border border-zinc-600 rounded-sm"></div>
                            <span>Data available</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 bg-zinc-700 border border-zinc-600 rounded-sm"></div>
                            <span>No data</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filters Panel */}
                  {showFilters && (
                    <div className="bg-zinc-800 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase">Filters</h4>
                        <button
                          onClick={resetFilters}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Reset All
                        </button>
                      </div>

                      {/* Categorical Filters */}
                      <div className="space-y-3">
                        {/* Operation Type */}
                        {availableFilters.operationType.length > 0 && (
                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Operation Type</label>
                            <div className="flex flex-wrap gap-1">
                              {availableFilters.operationType.map(type => (
                                <button
                                  key={type}
                                  onClick={() => toggleCategoryFilter('operationType', type)}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    selectedFilters.operationType.includes(type)
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                  }`}
                                >
                                  {type}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Crop */}
                        {availableFilters.crop.length > 0 && (
                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Crop</label>
                            <div className="flex flex-wrap gap-1">
                              {availableFilters.crop.map(crop => (
                                <button
                                  key={crop}
                                  onClick={() => toggleCategoryFilter('crop', crop)}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    selectedFilters.crop.includes(crop)
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                  }`}
                                >
                                  {crop}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recording Status */}
                        {availableFilters.recordingStatus.length > 0 && (
                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Recording Status</label>
                            <div className="flex flex-wrap gap-1">
                              {availableFilters.recordingStatus.map(status => (
                                <button
                                  key={status}
                                  onClick={() => toggleCategoryFilter('recordingStatus', status)}
                                  className={`px-2 py-1 text-xs rounded transition ${
                                    selectedFilters.recordingStatus.includes(status)
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                  }`}
                                >
                                  {status.replace('dtiRecordingStatus', '')}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Numeric Filters */}
                        <div className="pt-2 border-t border-zinc-700">
                          <label className="text-xs text-zinc-400 block mb-2">Numeric Filters</label>
                          
                          {/* Speed */}
                          <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={numericFilters.speed.enabled}
                                onChange={(e) => setNumericFilters(prev => ({
                                  ...prev,
                                  speed: { ...prev.speed, enabled: e.target.checked }
                                }))}
                                className="rounded bg-zinc-700 border-zinc-600"
                              />
                              <span className="text-xs text-zinc-300">Speed</span>
                              <span className="text-xs text-zinc-500">
                                ({numericRanges.speed.min?.toFixed(1)} - {numericRanges.speed.max?.toFixed(1)})
                              </span>
                            </div>
                            {numericFilters.speed.enabled && (
                              <div className="flex gap-2 ml-5">
                                <input
                                  type="number"
                                  value={numericFilters.speed.min || ''}
                                  onChange={(e) => setNumericFilters(prev => ({
                                    ...prev,
                                    speed: { ...prev.speed, min: parseFloat(e.target.value) || 0 }
                                  }))}
                                  placeholder="Min"
                                  className="w-20 px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded text-zinc-200"
                                />
                                <input
                                  type="number"
                                  value={numericFilters.speed.max || ''}
                                  onChange={(e) => setNumericFilters(prev => ({
                                    ...prev,
                                    speed: { ...prev.speed, max: parseFloat(e.target.value) || Infinity }
                                  }))}
                                  placeholder="Max"
                                  className="w-20 px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded text-zinc-200"
                                />
                              </div>
                            )}
                          </div>

                          {/* Elevation */}
                          <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={numericFilters.elevation.enabled}
                                onChange={(e) => setNumericFilters(prev => ({
                                  ...prev,
                                  elevation: { ...prev.elevation, enabled: e.target.checked }
                                }))}
                                className="rounded bg-zinc-700 border-zinc-600"
                              />
                              <span className="text-xs text-zinc-300">Elevation</span>
                              <span className="text-xs text-zinc-500">
                                ({numericRanges.elevation.min?.toFixed(0)} - {numericRanges.elevation.max?.toFixed(0)})
                              </span>
                            </div>
                            {numericFilters.elevation.enabled && (
                              <div className="flex gap-2 ml-5">
                                <input
                                  type="number"
                                  value={numericFilters.elevation.min || ''}
                                  onChange={(e) => setNumericFilters(prev => ({
                                    ...prev,
                                    elevation: { ...prev.elevation, min: parseFloat(e.target.value) || 0 }
                                  }))}
                                  placeholder="Min"
                                  className="w-20 px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded text-zinc-200"
                                />
                                <input
                                  type="number"
                                  value={numericFilters.elevation.max || ''}
                                  onChange={(e) => setNumericFilters(prev => ({
                                    ...prev,
                                    elevation: { ...prev.elevation, max: parseFloat(e.target.value) || Infinity }
                                  }))}
                                  placeholder="Max"
                                  className="w-20 px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded text-zinc-200"
                                />
                              </div>
                            )}
                          </div>

                          {/* Applied Rate */}
                          <div className="mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <input
                                type="checkbox"
                                checked={numericFilters.appliedRate.enabled}
                                onChange={(e) => setNumericFilters(prev => ({
                                  ...prev,
                                  appliedRate: { ...prev.appliedRate, enabled: e.target.checked }
                                }))}
                                className="rounded bg-zinc-700 border-zinc-600"
                              />
                              <span className="text-xs text-zinc-300">Applied Rate</span>
                              <span className="text-xs text-zinc-500">
                                ({numericRanges.appliedRate.min?.toFixed(1)} - {numericRanges.appliedRate.max?.toFixed(1)})
                              </span>
                            </div>
                            {numericFilters.appliedRate.enabled && (
                              <div className="flex gap-2 ml-5">
                                <input
                                  type="number"
                                  value={numericFilters.appliedRate.min || ''}
                                  onChange={(e) => setNumericFilters(prev => ({
                                    ...prev,
                                    appliedRate: { ...prev.appliedRate, min: parseFloat(e.target.value) || 0 }
                                  }))}
                                  placeholder="Min"
                                  className="w-20 px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded text-zinc-200"
                                />
                                <input
                                  type="number"
                                  value={numericFilters.appliedRate.max || ''}
                                  onChange={(e) => setNumericFilters(prev => ({
                                    ...prev,
                                    appliedRate: { ...prev.appliedRate, max: parseFloat(e.target.value) || Infinity }
                                  }))}
                                  placeholder="Max"
                                  className="w-20 px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded text-zinc-200"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary Stats */}
                  <div className="bg-zinc-800 rounded-lg p-3">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-3">
                      Statistics ({filteredPoints.length} points on map)
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {/* Speed Stats */}
                      {(() => {
                        const values = filteredPoints.map(p => p.speed).filter(v => v != null)
                        if (values.length === 0) return null
                        return (
                          <div className="bg-zinc-700/50 rounded p-2">
                            <div className="text-zinc-400 mb-1">Speed (km/h)</div>
                            <div className="text-zinc-200">
                              <span className="text-emerald-400">{Math.min(...values).toFixed(1)}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-amber-400">{(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-red-400">{Math.max(...values).toFixed(1)}</span>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Elevation Stats */}
                      {(() => {
                        const values = filteredPoints.map(p => p.elevation).filter(v => v != null)
                        if (values.length === 0) return null
                        return (
                          <div className="bg-zinc-700/50 rounded p-2">
                            <div className="text-zinc-400 mb-1">Elevation (m)</div>
                            <div className="text-zinc-200">
                              <span className="text-emerald-400">{Math.min(...values).toFixed(0)}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-amber-400">{(values.reduce((a, b) => a + b, 0) / values.length).toFixed(0)}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-red-400">{Math.max(...values).toFixed(0)}</span>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Applied Rate Stats */}
                      {(() => {
                        const values = filteredPoints.map(p => p.appliedRate).filter(v => v != null)
                        if (values.length === 0) return null
                        return (
                          <div className="bg-zinc-700/50 rounded p-2">
                            <div className="text-zinc-400 mb-1">Applied Rate</div>
                            <div className="text-zinc-200">
                              <span className="text-emerald-400">{Math.min(...values).toFixed(1)}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-amber-400">{(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-red-400">{Math.max(...values).toFixed(1)}</span>
                            </div>
                          </div>
                        )
                      })()}
                      
                      {/* Area Stats */}
                      {(() => {
                        const values = filteredPoints.map(p => p.area).filter(v => v != null)
                        if (values.length === 0) return null
                        return (
                          <div className="bg-zinc-700/50 rounded p-2">
                            <div className="text-zinc-400 mb-1">Area (ha)</div>
                            <div className="text-zinc-200">
                              <span className="text-emerald-400">{Math.min(...values).toFixed(4)}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-amber-400">{(values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)}</span>
                              <span className="text-zinc-500 mx-1">→</span>
                              <span className="text-red-400">{Math.max(...values).toFixed(4)}</span>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    
                    {/* Operation Type Distribution */}
                    {availableFilters.operationType.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <div className="text-zinc-400 text-xs mb-2">Operation Types</div>
                        <div className="flex flex-wrap gap-2">
                          {availableFilters.operationType.map(type => {
                            const count = filteredPoints.filter(p => p.operationType === type).length
                            const pct = ((count / filteredPoints.length) * 100).toFixed(0)
                            return (
                              <div key={type} className="bg-zinc-700/50 rounded px-2 py-1 text-xs">
                                <span className="text-zinc-300">{type}</span>
                                <span className="text-zinc-500 ml-1">{pct}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Create Field */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">Create New Field</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Field Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Field Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g., North Field"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Farm ID (optional) */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Farm ID <span className="text-zinc-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newFarmId}
                  onChange={(e) => setNewFarmId(e.target.value)}
                  placeholder="UUID of existing farm"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Boundary - Draw or Paste GeoJSON */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Field Boundary
                </label>
                
                {/* Opção para desenhar */}
                <div className="mb-3">
                  {drawnFieldCoords.length >= 3 ? (
                    <div className="bg-emerald-950/50 border border-emerald-700 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-emerald-300 font-medium">
                          ✓ Boundary drawn ({drawnFieldCoords.length} points)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDrawnFieldCoords([])
                            setNewBoundaryGeoJson('')
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Clear
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false)
                          setIsDrawingField(true)
                        }}
                        className="w-full px-3 py-1.5 text-xs bg-emerald-700 text-white rounded hover:bg-emerald-600"
                      >
                        Edit Drawing
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false)
                        setIsDrawingField(true)
                      }}
                      className="w-full px-4 py-3 bg-blue-950 border-2 border-dashed border-blue-700 rounded-lg text-blue-300 hover:bg-blue-900 hover:border-blue-600 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Draw Boundary on Map
                    </button>
                  )}
                </div>
                
                {/* Divisor */}
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 border-t border-zinc-700"></div>
                  <span className="text-xs text-zinc-500">OR</span>
                  <div className="flex-1 border-t border-zinc-700"></div>
                </div>
                
                {/* Opção para colar GeoJSON */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Paste GeoJSON
                  </label>
                  <textarea
                    value={newBoundaryGeoJson}
                    onChange={(e) => {
                      setNewBoundaryGeoJson(e.target.value)
                      setDrawnFieldCoords([]) // Limpar coords desenhadas se colar GeoJSON
                    }}
                    placeholder={geoJsonExample}
                    rows={6}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition border border-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateField}
                disabled={creatingField || !newFieldName.trim()}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingField && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Create Field
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal Create Zone */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md mx-4">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">Create Zone</h3>
              <button
                onClick={() => setShowZoneModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Zone Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g., Treatment Area A"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Note <span className="text-zinc-500">(optional)</span>
                </label>
                <textarea
                  value={newZoneNote}
                  onChange={(e) => setNewZoneNote(e.target.value)}
                  placeholder="Additional information about this zone..."
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              <div className="bg-zinc-800 rounded p-3">
                <div className="text-xs text-zinc-400 mb-1">Zone Polygon</div>
                <div className="text-sm text-zinc-300">
                  {drawnZoneCoords.length} points drawn
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowZoneModal(false)
                  setNewZoneName('')
                  setNewZoneNote('')
                }}
                className="px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateZone}
                disabled={creatingZone || !newZoneName.trim() || drawnZoneCoords.length < 3}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingZone && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Create Zone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create Season */}
      {showSeasonModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md mx-4">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">Create Season</h3>
              <button
                onClick={() => setShowSeasonModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Field</div>
                <div className="text-sm font-medium text-zinc-100">
                  {selectedField?.name || selectedField?.fieldName || 'Select a field first'}
                </div>
              </div>

              {/* Season Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Season Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder="e.g., 2024 Corn Season"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Crop */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Crop <span className="text-zinc-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newSeasonCrop}
                  onChange={(e) => setNewSeasonCrop(e.target.value)}
                  placeholder="e.g., Corn, Soybean, Wheat"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={newSeasonStartDate}
                  onChange={(e) => setNewSeasonStartDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  End Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={newSeasonEndDate}
                  onChange={(e) => setNewSeasonEndDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Activity Types */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Activity Types <span className="text-zinc-500">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Planting', 'Harvesting', 'CropProtection', 'Tillage', 'Other'].map(type => (
                    <button
                      key={type}
                      onClick={() => {
                        setNewSeasonActivityTypes(prev => 
                          prev.includes(type) 
                            ? prev.filter(t => t !== type)
                            : [...prev, type]
                        )
                      }}
                      className={`px-2 py-1 text-xs rounded transition ${
                        newSeasonActivityTypes.includes(type)
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setShowSeasonModal(false)}
                className="px-4 py-2 text-sm font-medium bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition border border-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSeason}
                disabled={creatingSeason || !newSeasonName.trim() || !newSeasonStartDate || !newSeasonEndDate}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {creatingSeason && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Create Season
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Salvar Comparação */}
      {showComparisonModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md mx-4">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">💾 Save Analysis for Comparison</h3>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Current Analysis</div>
                <div className="text-sm font-medium text-zinc-100">
                  {selectedSeason?.name || 'Unknown'} • {analysisPoints.length} points
                </div>
              </div>

              {/* Nome da comparação */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Comparison Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={comparisonName}
                  onChange={(e) => setComparisonName(e.target.value)}
                  placeholder="e.g., Corn Season 2024 vs 2023"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowComparisonModal(false)
                  setComparisonName('')
                }}
                className="px-4 py-2 text-sm font-medium bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition border border-zinc-700"
              >
                Don't Save
              </button>
              <button
                onClick={handleConfirmSaveComparison}
                disabled={!comparisonName.trim()}
                className="px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save for Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-950 text-red-200 px-4 py-2 rounded-lg border border-red-800 flex items-center gap-2 z-50 max-w-lg">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-300 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-emerald-950 text-emerald-200 px-4 py-2 rounded-lg border border-emerald-800 flex items-center gap-2 z-50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm">{successMessage}</span>
        </div>
      )}
    </div>
  )
}

export default FieldPerformanceAnalytics
