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
  const [error, setError] = useState('')
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
      setError('Please select a user')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const environment = getEnvironment()
      const baseUrl = getPointlakeApiUrl(environment)
      const url = `${baseUrl}/v2/beta/analytics/user/${userId}/points`
      
      const params = {
        samplerate: sampleRate,
        startDate: formatDateForApi(startDate),
        endDate: formatDateForApi(endDate)
      }

      console.log('Loading points:', { url, params })

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*'
        },
        params,
        timeout: 1200000 // 20 minutos = 1200000 ms
      })

      console.log('API Response:', response.data)

      // Verificar formato da resposta
      let pointsData = []
      
      if (Array.isArray(response.data)) {
        pointsData = response.data
      } else if (response.data.points && Array.isArray(response.data.points)) {
        pointsData = response.data.points
      } else if (response.data.data && Array.isArray(response.data.data)) {
        pointsData = response.data.data
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
        setError('Request timeout (20 minutes). Please try with a smaller date range or lower sample rate.')
      } else {
        setError(
          err.response?.data?.message || 
          err.response?.data?.error ||
          err.message || 
          'Error loading points'
        )
      }
      
      setPoints([])
      setStats(null)
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
              <div className="space-y-2 mb-6">
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

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
              {error && (
                <div className="p-4 bg-red-900/50 border-b border-red-700 text-red-200">
                  <p className="text-sm">❌ {error}</p>
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default PointsAnalytics

