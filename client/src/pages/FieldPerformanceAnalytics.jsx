import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLeafUser } from '../context/LeafUserContext'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import axios from 'axios'
import { getLeafApiBaseUrl } from '../config/api'

// Configuração dos ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Cores para diferentes fields
const FIELD_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
]

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
  const [pinnedProject, setPinnedProject] = useState(null) // Field fixado como projeto da sessão
  const [searchTerm, setSearchTerm] = useState('')
  const [showFieldsList, setShowFieldsList] = useState(true)
  
  // Refs do mapa
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const boundaryLayerRef = useRef(null)
  const pinnedLayerRef = useRef(null)
  
  // Redirecionar se não autenticado
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      preferCanvas: true,
      zoomControl: true,
    }).setView([39.8283, -98.5795], 4) // Centro dos EUA

    // Camada de satélite (Esri)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '© Esri',
        maxZoom: 19,
      }
    )

    // Camada OSM
    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }
    )

    // Adicionar camada de satélite como padrão
    satelliteLayer.addTo(map)

    // Controle de camadas
    L.control.layers(
      { 'Satélite': satelliteLayer, 'Mapa': osmLayer },
      null,
      { position: 'topleft', collapsed: true }
    ).addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Carregar campos quando leaf user mudar
  useEffect(() => {
    if (token && selectedLeafUserId) {
      loadFields()
    }
  }, [token, selectedLeafUserId])

  // Função para carregar campos
  const loadFields = async () => {
    if (!token || !selectedLeafUserId) return

    setLoadingFields(true)
    setError(null)
    
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = getLeafApiBaseUrl(env)
      
      // Endpoint de Field Boundary Management
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
      console.log('📍 Fields loaded:', fieldsData.length, fieldsData)
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
      
      // Endpoint para obter active boundary
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
      
      // Mostrar boundary no mapa
      displayBoundaryOnMap(response.data, false)
      
    } catch (err) {
      console.error('Error loading boundary:', err)
      
      // Se não encontrou boundary, tentar usar geometry do próprio field
      if (field.geometry) {
        console.log('Using field geometry as fallback')
        displayBoundaryOnMap({ geometry: field.geometry }, false)
      } else {
        setError('This field has no active boundary')
      }
    } finally {
      setLoadingBoundary(false)
    }
  }

  // Função para exibir boundary no mapa
  const displayBoundaryOnMap = (boundaryData, isPinned = false) => {
    if (!mapInstanceRef.current) return

    const layerRef = isPinned ? pinnedLayerRef : boundaryLayerRef
    const color = isPinned ? '#f59e0b' : '#10b981' // Amber para pinned, Emerald para selecionado

    // Remover layer anterior
    if (layerRef.current) {
      mapInstanceRef.current.removeLayer(layerRef.current)
      layerRef.current = null
    }

    let geometry = boundaryData?.geometry
    if (!geometry) return

    try {
      // Se geometry for string (GeoJSON), fazer parse
      if (typeof geometry === 'string') {
        geometry = JSON.parse(geometry)
      }

      // Criar layer GeoJSON
      const geoJsonLayer = L.geoJSON(geometry, {
        style: {
          color: color,
          weight: isPinned ? 4 : 3,
          opacity: 1,
          fillColor: color,
          fillOpacity: isPinned ? 0.3 : 0.2,
          dashArray: isPinned ? '10, 5' : null,
        }
      })

      geoJsonLayer.addTo(mapInstanceRef.current)
      layerRef.current = geoJsonLayer

      // Ajustar zoom para mostrar boundary
      if (!isPinned) {
        const bounds = geoJsonLayer.getBounds()
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds.pad(0.1))
        }
      }

    } catch (err) {
      console.error('Error displaying boundary:', err)
    }
  }

  // Selecionar field
  const handleSelectField = (field) => {
    setSelectedField(field)
    loadFieldBoundary(field)
  }

  // Fixar field como projeto da sessão
  const handlePinAsProject = () => {
    if (!selectedField || !fieldBoundary) return
    
    // Salvar como projeto fixado
    setPinnedProject({
      field: selectedField,
      boundary: fieldBoundary
    })
    
    // Exibir boundary do projeto pinned
    displayBoundaryOnMap(fieldBoundary, true)
    
    // Salvar na sessão
    sessionStorage.setItem('pinnedProject', JSON.stringify({
      field: selectedField,
      boundary: fieldBoundary
    }))
  }

  // Desafixar projeto
  const handleUnpinProject = () => {
    if (pinnedLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(pinnedLayerRef.current)
      pinnedLayerRef.current = null
    }
    setPinnedProject(null)
    sessionStorage.removeItem('pinnedProject')
  }

  // Restaurar projeto da sessão
  useEffect(() => {
    const saved = sessionStorage.getItem('pinnedProject')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPinnedProject(parsed)
        if (parsed.boundary && mapInstanceRef.current) {
          setTimeout(() => {
            displayBoundaryOnMap(parsed.boundary, true)
          }, 500)
        }
      } catch (e) {
        console.error('Error restoring pinned project:', e)
      }
    }
  }, [])

  // Filtrar fields por termo de busca
  const filteredFields = fields.filter(field => {
    const name = field.name || field.fieldName || ''
    const farmName = field.farmName || ''
    const search = searchTerm.toLowerCase()
    return name.toLowerCase().includes(search) || farmName.toLowerCase().includes(search)
  })

  // Calcular área do field
  const getFieldArea = (field) => {
    if (field.area) {
      const hectares = field.area
      const acres = hectares * 2.47105
      return `${hectares.toFixed(2)} ha / ${acres.toFixed(2)} ac`
    }
    return '-'
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse text-emerald-400 text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-emerald-800/30 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Field Performance Analytics
              </h1>
              <p className="text-xs text-slate-400">Yield analysis & field insights</p>
            </div>
          </div>

          {/* Leaf User Selector */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-400">Leaf User:</label>
              <select
                value={selectedLeafUserId || ''}
                onChange={(e) => setSelectedLeafUserId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                  <option value="">No users available</option>
                )}
              </select>
            </div>
            
            <button
              onClick={logout}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-60px)]">
        {/* Sidebar - Fields List */}
        <div className={`${showFieldsList ? 'w-80' : 'w-12'} bg-slate-900/50 border-r border-emerald-800/30 flex flex-col transition-all duration-300`}>
          {/* Toggle button */}
          <button
            onClick={() => setShowFieldsList(!showFieldsList)}
            className="p-3 text-slate-400 hover:text-emerald-400 transition-colors self-end"
          >
            <svg className={`w-5 h-5 transition-transform ${showFieldsList ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {showFieldsList && (
            <>
              {/* Search */}
              <div className="p-3 border-b border-slate-700/50">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pl-9 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Pinned Project */}
              {pinnedProject && (
                <div className="p-3 bg-amber-500/10 border-b border-amber-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">📌 Active Project</span>
                    <button
                      onClick={handleUnpinProject}
                      className="text-xs text-amber-400 hover:text-amber-300"
                    >
                      Unpin
                    </button>
                  </div>
                  <div className="text-sm font-medium text-white">
                    {pinnedProject.field?.name || pinnedProject.field?.fieldName || 'Unnamed Field'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {pinnedProject.field?.farmName && `Farm: ${pinnedProject.field.farmName}`}
                  </div>
                </div>
              )}

              {/* Fields List */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 py-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Fields ({filteredFields.length})
                    </span>
                    <button
                      onClick={loadFields}
                      disabled={loadingFields}
                      className="text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                    >
                      <svg className={`w-4 h-4 ${loadingFields ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>

                  {loadingFields ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                    </div>
                  ) : filteredFields.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      {fields.length === 0 ? 'No fields found for this user' : 'No fields match your search'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredFields.map((field, index) => (
                        <button
                          key={field.id}
                          onClick={() => handleSelectField(field)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            selectedField?.id === field.id
                              ? 'bg-emerald-500/20 border border-emerald-500/50'
                              : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                              style={{ backgroundColor: FIELD_COLORS[index % FIELD_COLORS.length] }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate">
                                {field.name || field.fieldName || `Field ${field.id.substring(0, 8)}`}
                              </div>
                              {field.farmName && (
                                <div className="text-xs text-slate-400 truncate">
                                  {field.farmName}
                                </div>
                              )}
                              <div className="text-xs text-slate-500 mt-1">
                                {getFieldArea(field)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {/* Map */}
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Loading Overlay */}
          {loadingBoundary && (
            <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
              <div className="bg-slate-800 rounded-xl p-6 flex items-center gap-4 shadow-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
                <span className="text-white">Loading boundary...</span>
              </div>
            </div>
          )}

          {/* Field Info Panel */}
          {selectedField && (
            <div className="absolute top-4 right-4 bg-slate-900/95 backdrop-blur-lg rounded-xl border border-emerald-800/30 p-4 w-80 shadow-2xl z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-emerald-400">Field Details</h3>
                <button
                  onClick={() => {
                    setSelectedField(null)
                    setFieldBoundary(null)
                    if (boundaryLayerRef.current && mapInstanceRef.current) {
                      mapInstanceRef.current.removeLayer(boundaryLayerRef.current)
                      boundaryLayerRef.current = null
                    }
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Name</label>
                  <p className="text-white font-medium">
                    {selectedField.name || selectedField.fieldName || 'Unnamed Field'}
                  </p>
                </div>
                
                {selectedField.farmName && (
                  <div>
                    <label className="text-xs text-slate-500">Farm</label>
                    <p className="text-slate-300">{selectedField.farmName}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-xs text-slate-500">Area</label>
                  <p className="text-slate-300">{getFieldArea(selectedField)}</p>
                </div>
                
                {selectedField.providerName && (
                  <div>
                    <label className="text-xs text-slate-500">Provider</label>
                    <p className="text-slate-300">{selectedField.providerName}</p>
                  </div>
                )}

                {selectedField.status && (
                  <div>
                    <label className="text-xs text-slate-500">Status</label>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                      selectedField.status === 'PROCESSED' ? 'bg-emerald-500/20 text-emerald-400' :
                      selectedField.status === 'WAITING' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {selectedField.status}
                    </span>
                  </div>
                )}
              </div>

              {/* Pin as Project Button */}
              {fieldBoundary && (
                <button
                  onClick={handlePinAsProject}
                  disabled={pinnedProject?.field?.id === selectedField.id}
                  className={`w-full mt-4 py-2.5 rounded-lg font-medium transition-all ${
                    pinnedProject?.field?.id === selectedField.id
                      ? 'bg-amber-500/20 text-amber-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white'
                  }`}
                >
                  {pinnedProject?.field?.id === selectedField.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <span>📌</span> Pinned as Project
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>📍</span> Pin as Session Project
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Error Toast */}
          {error && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg z-20 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-2 hover:text-red-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-700 p-3 z-10">
            <div className="text-xs font-semibold text-slate-400 mb-2">Legend</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-emerald-500 rounded"></div>
                <span className="text-xs text-slate-300">Selected Field</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-amber-500 rounded" style={{ borderStyle: 'dashed' }}></div>
                <span className="text-xs text-slate-300">Pinned Project</span>
              </div>
            </div>
          </div>

          {/* Quick Stats (quando há projeto pinado) */}
          {pinnedProject && (
            <div className="absolute top-4 left-4 bg-slate-900/95 backdrop-blur-lg rounded-xl border border-amber-800/30 p-4 z-10">
              <div className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
                <span>📌</span> Active Project
              </div>
              <div className="text-lg font-bold text-white">
                {pinnedProject.field?.name || pinnedProject.field?.fieldName || 'Unnamed'}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {getFieldArea(pinnedProject.field)}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-500">Ready for yield analysis</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FieldPerformanceAnalytics

