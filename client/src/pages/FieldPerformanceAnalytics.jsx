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
  
  // Estados para análise
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [analysisSampleRate, setAnalysisSampleRate] = useState(21)
  const [analysisStartDate, setAnalysisStartDate] = useState('2020-01-01')
  const [analysisEndDate, setAnalysisEndDate] = useState('2025-12-01')
  const [showAnalysisResults, setShowAnalysisResults] = useState(false)
  
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
    setMapData(null) // Limpar mapa primeiro
    
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
      
      // Converter geometry para WKT e passar para o MapComponent
      if (response.data?.geometry) {
        const wkt = geoJsonToWkt(response.data.geometry)
        if (wkt) {
          console.log('🗺️ WKT geometry:', wkt.substring(0, 100) + '...')
          // Dar tempo para limpar o mapa antes de adicionar novo dado
          setTimeout(() => {
            setMapData({ geometry: wkt })
          }, 50)
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
        
        if (typeof field.geometry === 'string') {
          if (field.geometry.includes('POLYGON')) {
            // Já é WKT
            setMapData({ geometry: field.geometry })
          } else {
            // Tentar como GeoJSON string
            const wkt = geoJsonToWkt(field.geometry)
            if (wkt) {
              setMapData({ geometry: wkt })
            }
          }
        } else if (field.geometry.type) {
          // É um objeto GeoJSON
          const wkt = geoJsonToWkt(field.geometry)
          if (wkt) {
            setMapData({ geometry: wkt })
          }
        }
      } else {
        setError('This field has no active boundary')
      }
    } finally {
      setLoadingBoundary(false)
    }
  }

  // Função para criar análise do projeto
  const handleCreateAnalysis = async () => {
    if (!token || !selectedLeafUserId) {
      setError('Authentication required')
      return
    }

    setLoadingAnalysis(true)
    setError(null)
    setShowAnalysisModal(false)
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      // Formatar datas para ISO
      const startDateISO = `${analysisStartDate}T00:00:00.000Z`
      const endDateISO = `${analysisEndDate}T00:00:00.000Z`
      
      console.log('📊 Creating analysis with params:', {
        userId: selectedLeafUserId,
        sampleRate: analysisSampleRate,
        startDate: startDateISO,
        endDate: endDateISO
      })

      const response = await axios.get(
        `${baseUrl}/services/pointlake/api/v2/beta/analytics/user/${selectedLeafUserId}/points`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'accept': 'application/json'
          },
          params: {
            samplerate: analysisSampleRate,
            startDate: startDateISO,
            endDate: endDateISO
          }
        }
      )

      console.log('📊 Analysis data received:', response.data)
      setAnalysisData(response.data)
      setShowAnalysisResults(true)
      
      // Se tiver pontos, mostrar no mapa
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        setMapData(response.data)
        setSuccessMessage(`Analysis completed! ${response.data.length} points loaded.`)
      } else if (response.data?.points && Array.isArray(response.data.points)) {
        setMapData(response.data.points)
        setSuccessMessage(`Analysis completed! ${response.data.points.length} points loaded.`)
      } else {
        setSuccessMessage('Analysis completed!')
      }
      
      setTimeout(() => setSuccessMessage(null), 3000)
      
    } catch (err) {
      console.error('Error creating analysis:', err)
      console.error('Response:', err.response?.data)
      setError(err.response?.data?.message || err.response?.data?.error || err.message || 'Error creating analysis')
    } finally {
      setLoadingAnalysis(false)
    }
  }

  // Criar novo field com boundary
  const handleCreateField = async () => {
    if (!token || !selectedLeafUserId || !newFieldName.trim()) {
      setError('Field name is required')
      return
    }

    // Validar GeoJSON se fornecido
    let parsedGeometry = null
    if (newBoundaryGeoJson.trim()) {
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
      const fieldData = {
        name: newFieldName.trim(),
        geometry: parsedGeometry || {
          type: 'Polygon',
          coordinates: [[
            [-93.48, 41.77],
            [-93.48, 41.76],
            [-93.47, 41.76],
            [-93.47, 41.77],
            [-93.48, 41.77]
          ]]
        }
      }
      
      if (newFarmId.trim()) {
        fieldData.farmId = newFarmId.trim()
      }

      console.log('Creating field with geometry:', fieldData)

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
      setShowCreateModal(false)
      
      // Recarregar lista
      await loadFields()
      
    } catch (err) {
      console.error('Error creating field:', err)
      console.error('Response:', err.response?.data)
      
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
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      
      setError(errorMsg)
    } finally {
      setCreatingField(false)
    }
  }

  // Selecionar field
  const handleSelectField = (field) => {
    setSelectedField(field)
    setAnalysisData(null)
    setShowAnalysisResults(false)
    loadFieldBoundary(field)
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
              
              {/* Botão de Criar Análise */}
              <button
                onClick={() => setShowAnalysisModal(true)}
                disabled={loadingAnalysis}
                className="w-full mt-3 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loadingAnalysis ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Create Analysis
                  </>
                )}
              </button>
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
                  <button
                    key={field.id}
                    onClick={() => handleSelectField(field)}
                    className={`w-full text-left p-3 rounded transition-all ${
                      selectedField?.id === field.id
                        ? 'bg-blue-950 border border-blue-800'
                        : 'bg-zinc-800/50 hover:bg-zinc-800 border border-transparent'
                    }`}
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Área Central - Mapa e Resultados */}
        <div className="flex-1 flex flex-col">
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
                    onClick={() => {
                      setSelectedField(null)
                      setFieldBoundary(null)
                      setMapData(null)
                      setAnalysisData(null)
                      setShowAnalysisResults(false)
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
            {/* Mapa */}
            <div className={`${showAnalysisResults ? 'w-1/2' : 'flex-1'} relative transition-all`}>
              <MapComponent data={mapData} mapRef={mapRef} />
              
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

            {/* Painel de Resultados da Análise */}
            {showAnalysisResults && analysisData && (
              <div className="w-1/2 bg-zinc-900 border-l border-zinc-800 flex flex-col">
                <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Analysis Results
                  </h3>
                  <button
                    onClick={() => {
                      setShowAnalysisResults(false)
                      setAnalysisData(null)
                    }}
                    className="text-zinc-400 hover:text-zinc-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1 overflow-auto p-3">
                  {/* Summary */}
                  <div className="bg-zinc-800 rounded-lg p-3 mb-3">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase mb-2">Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-zinc-500">Total Points:</span>
                        <span className="text-zinc-100 ml-2">
                          {Array.isArray(analysisData) ? analysisData.length : (analysisData?.points?.length || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Sample Rate:</span>
                        <span className="text-zinc-100 ml-2">{analysisSampleRate}%</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Start Date:</span>
                        <span className="text-zinc-100 ml-2">{analysisStartDate}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500">End Date:</span>
                        <span className="text-zinc-100 ml-2">{analysisEndDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Data Table */}
                  <div className="bg-zinc-800 rounded-lg overflow-hidden">
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase p-3 border-b border-zinc-700">
                      Data Points
                    </h4>
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-zinc-900 sticky top-0">
                          <tr>
                            <th className="text-left p-2 text-zinc-400">#</th>
                            <th className="text-left p-2 text-zinc-400">Timestamp</th>
                            <th className="text-left p-2 text-zinc-400">Operation</th>
                            <th className="text-left p-2 text-zinc-400">Crop</th>
                            <th className="text-right p-2 text-zinc-400">Area</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(Array.isArray(analysisData) ? analysisData : analysisData?.points || []).slice(0, 100).map((point, idx) => (
                            <tr key={idx} className="border-t border-zinc-700 hover:bg-zinc-700/50">
                              <td className="p-2 text-zinc-500">{idx + 1}</td>
                              <td className="p-2 text-zinc-300">
                                {point.timestamp ? new Date(point.timestamp).toLocaleString() : '-'}
                              </td>
                              <td className="p-2 text-zinc-300">{point.operationType || '-'}</td>
                              <td className="p-2 text-zinc-300">{point.crop || '-'}</td>
                              <td className="p-2 text-zinc-300 text-right">
                                {point.area ? parseFloat(point.area).toFixed(4) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(Array.isArray(analysisData) ? analysisData.length : analysisData?.points?.length || 0) > 100 && (
                        <div className="p-2 text-center text-zinc-500 text-xs border-t border-zinc-700">
                          Showing first 100 of {Array.isArray(analysisData) ? analysisData.length : analysisData?.points?.length} points
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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

              {/* Boundary GeoJSON */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Boundary GeoJSON <span className="text-zinc-500">(optional)</span>
                </label>
                <textarea
                  value={newBoundaryGeoJson}
                  onChange={(e) => setNewBoundaryGeoJson(e.target.value)}
                  placeholder={geoJsonExample}
                  rows={10}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Paste a valid GeoJSON Polygon geometry. Coordinates must be in [longitude, latitude] format.
                  The polygon must be closed (first and last coordinates must be the same).
                </p>
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

      {/* Modal Create Analysis */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 w-full max-w-md mx-4">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100">Create Analysis</h3>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xs text-zinc-500 uppercase">Project</div>
                <div className="text-sm font-medium text-zinc-100">
                  {pinnedProject?.field?.name || pinnedProject?.field?.fieldName || 'Unnamed Field'}
                </div>
              </div>

              {/* Sample Rate */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Sample Rate (%)
                </label>
                <input
                  type="number"
                  value={analysisSampleRate}
                  onChange={(e) => setAnalysisSampleRate(parseInt(e.target.value) || 1)}
                  min={1}
                  max={100}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Percentage of points to sample (1-100)
                </p>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={analysisStartDate}
                  onChange={(e) => setAnalysisStartDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={analysisEndDate}
                  onChange={(e) => setAnalysisEndDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-4 py-2 text-sm font-medium bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition border border-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAnalysis}
                disabled={loadingAnalysis}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loadingAnalysis && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                Run Analysis
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
