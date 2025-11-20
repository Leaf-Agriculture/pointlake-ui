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
  const { selectedLeafUserId, setSelectedLeafUserId, leafUsers, loadingUsers, refreshUsers, createLeafUser } = useLeafUser()
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
  const [fileUnits, setFileUnits] = useState(null)
  const [loadingFileUnits, setLoadingFileUnits] = useState(false)
  const [fileQuery, setFileQuery] = useState('')
  const [queryResults, setQueryResults] = useState(null)
  const [loadingQuery, setLoadingQuery] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuType, setMenuType] = useState('sql') // 'sql', 'upload', 'summary', 'query', 'units'
  const [drawnZones, setDrawnZones] = useState([])
  const mapRef = useRef(null)
  const [queryExecutionTime, setQueryExecutionTime] = useState(null)
  const [hasSpatialFilter, setHasSpatialFilter] = useState(false)
  const [filesToShow, setFilesToShow] = useState(20) // Começar com 20 arquivos visíveis
  const filesListRef = useRef(null)
  const [newFileIds, setNewFileIds] = useState(new Set()) // IDs de arquivos novos (não clicados ainda)
  const previousFilesRef = useRef([]) // Referência para lista anterior de arquivos
  const [queryHistory, setQueryHistory] = useState([]) // Histórico de queries
  const [showHistory, setShowHistory] = useState(false) // Mostrar/esconder histórico
  const [fileSummaries, setFileSummaries] = useState({}) // Summaries de todos os arquivos { fileId: summary }
  const [fileCities, setFileCities] = useState({}) // Cidades dos arquivos { fileId: city }
  const [loadingSummaries, setLoadingSummaries] = useState(new Set()) // IDs de arquivos cujos summaries estão sendo carregados
  const [loadingCities, setLoadingCities] = useState(new Set()) // IDs de arquivos cujas cidades estão sendo carregadas
  const loadingSummariesRef = useRef(new Set()) // Ref para evitar múltiplas chamadas simultâneas
  const fileSummariesRef = useRef({}) // Ref para acessar fileSummaries sem causar re-renders
  const fileCitiesRef = useRef({}) // Ref para acessar fileCities sem causar re-renders
  const isLoadingFilesRef = useRef(false) // Ref para evitar múltiplas chamadas simultâneas de loadFiles
  const [showCreateUserModal, setShowCreateUserModal] = useState(false) // Modal para criar usuário
  const [creatingUser, setCreatingUser] = useState(false) // Loading ao criar usuário
  const [newUserName, setNewUserName] = useState('') // Nome do novo usuário
  const [newUserEmail, setNewUserEmail] = useState('') // Email do novo usuário

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      navigate('/login')
    }
  }, [isAuthenticated, authLoading, navigate])

  // Carregar histórico de queries do localStorage ao montar
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('sql_query_history')
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory)
        setQueryHistory(Array.isArray(parsed) ? parsed : [])
      }
    } catch (e) {
      console.error('Error loading query history:', e)
      setQueryHistory([])
    }
  }, [])

  // Salvar histórico no localStorage quando mudar
  useEffect(() => {
    try {
      localStorage.setItem('sql_query_history', JSON.stringify(queryHistory))
    } catch (e) {
      console.error('Error saving query history:', e)
    }
  }, [queryHistory])

  // Sincronizar refs com state para garantir consistência
  useEffect(() => {
    fileSummariesRef.current = fileSummaries
  }, [fileSummaries])

  useEffect(() => {
    fileCitiesRef.current = fileCities
  }, [fileCities])

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
    
    // Evitar múltiplas chamadas simultâneas
    if (isLoadingFilesRef.current) {
      console.log('⏸️ loadFiles já está em execução, ignorando chamada duplicada')
      return
    }
    
    isLoadingFilesRef.current = true
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
      
      // Detectar novos arquivos comparando com a lista anterior
      // Só marcar como novos se já tiver uma lista anterior (não é o primeiro carregamento)
      const isFirstLoad = previousFilesRef.current.length === 0
      
      if (!isFirstLoad) {
        const previousFileIds = new Set(previousFilesRef.current.map(f => f.id || f.uuid))
        const currentFileIds = new Set(sortedFiles.map(f => f.id || f.uuid))
        
        // Arquivos novos são aqueles que estão na lista atual mas não estavam na anterior
        const newlyAddedIds = sortedFiles
          .filter(f => {
            const fileId = f.id || f.uuid
            return fileId && !previousFileIds.has(fileId)
          })
          .map(f => f.id || f.uuid)
        
        // Adicionar novos IDs ao conjunto de arquivos novos (mantendo os já existentes)
        if (newlyAddedIds.length > 0) {
          setNewFileIds(prev => {
            const updated = new Set(prev)
            newlyAddedIds.forEach(id => updated.add(id))
            return updated
          })
          console.log('✨ New files detected:', newlyAddedIds)
        }
      }
      
      // Atualizar referência anterior
      previousFilesRef.current = sortedFiles
      
      setFiles(sortedFiles)
      // Reset filesToShow quando novos arquivos são carregados
      setFilesToShow(20)

      // Buscar summaries automaticamente para arquivos processados (apenas primeiros visíveis para não bloquear)
      const processedFiles = sortedFiles.filter(f => f.status === 'PROCESSED')
      if (processedFiles.length > 0) {
        // Limitar a apenas os primeiros 5 arquivos visíveis para não bloquear a UI
        const filesToLoadSummaries = processedFiles.slice(0, 5)
        
        // Usar ref para verificar summaries já carregados (evita dependency issues)
        const currentSummaries = fileSummariesRef.current
        
        // Filtrar apenas arquivos que ainda não têm summary e não estão sendo carregados
        const filesWithoutSummary = filesToLoadSummaries.filter(file => {
          const fileId = file.id || file.uuid
          if (!fileId) return false
          // Não carregar se já temos o summary ou se já está sendo carregado
          return !currentSummaries[fileId] && !loadingSummariesRef.current.has(fileId)
        })
        
        if (filesWithoutSummary.length > 0) {
          // Marcar como carregando
          const fileIdsToLoad = filesWithoutSummary.map(f => f.id || f.uuid).filter(Boolean)
          fileIdsToLoad.forEach(id => loadingSummariesRef.current.add(id))
          setLoadingSummaries(new Set(fileIdsToLoad))
          
          // Buscar summaries em paralelo (não bloquear - executar em background)
          Promise.all(filesWithoutSummary.map(async (file) => {
            const fileId = file.id || file.uuid
            if (!fileId) return null
            
            try {
              const env = getEnvironment ? getEnvironment() : 'prod'
              const apiUrl = leafApiUrl(`/api/v2/files/${fileId}/summary`, env)
              const response = await axios.get(apiUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              return { fileId, summary: response.data }
            } catch (err) {
              console.error(`Error loading summary for file ${fileId}:`, err)
              return null
            } finally {
              // Remover do ref após carregar (sucesso ou erro)
              loadingSummariesRef.current.delete(fileId)
            }
          })).then(summaryResults => {
            const summariesMap = {}
            summaryResults.forEach(result => {
              if (result && result.fileId) {
                summariesMap[result.fileId] = result.summary
              }
            })
            
            // Atualizar state e ref
            setFileSummaries(prev => {
              const updated = { ...prev, ...summariesMap }
              fileSummariesRef.current = updated
              return updated
            })
            // Remover do loading após carregar
            setLoadingSummaries(prev => {
              const updated = new Set(prev)
              fileIdsToLoad.forEach(id => updated.delete(id))
              return updated
            })

            // Buscar cidades para arquivos com polígonos (apenas os novos summaries carregados)
            const currentCities = fileCitiesRef.current
            const filesWithGeometry = Object.entries(summariesMap)
              .filter(([fileId, summary]) => {
                const hasGeometry = summary && summary.geometry
                const cityNotLoaded = !currentCities[fileId]
                return hasGeometry && cityNotLoaded
              })
            
            if (filesWithGeometry.length > 0) {
              const cityFileIds = filesWithGeometry.map(([fileId]) => fileId)
              setLoadingCities(new Set(cityFileIds))
              
              // Buscar cidades em background (não bloquear)
              Promise.all(filesWithGeometry.map(async ([fileId, summary]) => {
                try {
                  const geometry = summary.geometry
                  let centerLat = null
                  let centerLng = null
                  
                  // Se for WKT POLYGON, calcular centro
                  if (typeof geometry === 'string' && geometry.includes('POLYGON')) {
                    const coordMatch = geometry.match(/POLYGON\s*\(\(([^)]+)\)\)/)
                    if (coordMatch) {
                      const coords = coordMatch[1].split(',').map(coord => {
                        const [lng, lat] = coord.trim().split(' ').map(Number)
                        return { lat, lng }
                      })
                      
                      if (coords.length > 0) {
                        // Calcular centroide (média das coordenadas)
                        const sumLat = coords.reduce((sum, c) => sum + c.lat, 0)
                        const sumLng = coords.reduce((sum, c) => sum + c.lng, 0)
                        centerLat = sumLat / coords.length
                        centerLng = sumLng / coords.length
                      }
                    }
                  }
                  
                  if (centerLat && centerLng) {
                    // Usar Nominatim para geocoding reverso
                    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                      params: {
                        lat: centerLat,
                        lon: centerLng,
                        format: 'json',
                        addressdetails: 1
                      },
                      headers: {
                        'User-Agent': 'PointLakeGISStudio/1.0' // Nominatim requer User-Agent
                      }
                    })
                    
                    const city = response.data?.address?.city || 
                                response.data?.address?.town || 
                                response.data?.address?.village ||
                                response.data?.address?.municipality ||
                                response.data?.address?.county ||
                                null
                    
                    return { fileId, city }
                  }
                } catch (err) {
                  console.error(`Error fetching city for file ${fileId}:`, err)
                }
                return null
              })).then(cityResults => {
                const citiesMap = {}
                cityResults.forEach(result => {
                  if (result && result.fileId && result.city) {
                    citiesMap[result.fileId] = result.city
                  }
                })
                
                setFileCities(prev => {
                  const updated = { ...prev, ...citiesMap }
                  fileCitiesRef.current = updated
                  return updated
                })
                // Remover do loading após carregar
                setLoadingCities(prev => {
                  const updated = new Set(prev)
                  cityFileIds.forEach(id => updated.delete(id))
                  return updated
                })
              })
            }
          }).catch(err => {
            console.error('Error loading summaries:', err)
            // Remover do loading em caso de erro
            setLoadingSummaries(prev => {
              const updated = new Set(prev)
              fileIdsToLoad.forEach(id => updated.delete(id))
              return updated
            })
          })
        }
      }
    } catch (err) {
      console.error('Erro ao carregar arquivos:', err)
      setFiles([])
    } finally {
      setLoadingFiles(false)
      isLoadingFilesRef.current = false
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

  // Função para carregar units de um arquivo específico
  const loadFileUnits = async (fileId) => {
    setLoadingFileUnits(true)
    setFileUnits(null)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl(`/api/v2/units/${fileId}`, env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      setFileUnits(response.data)
    } catch (err) {
      console.error('Erro ao carregar units do arquivo:', err)
      setError(getErrorMessage(err, 'Error loading file units'))
    } finally {
      setLoadingFileUnits(false)
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
    setFileUnits(null)
    setQueryResults(null)
    setSelectedFileId(null)
    setFileQuery('')
    setError('')
  }

  // Converter geometria Leaflet para WKT
  const geometryToWKT = (zone) => {
    if (!zone || !zone.layer) return null;
    
    const layer = zone.layer;
    
    if (zone.type === 'polygon') {
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
      // Para polígonos, usar ST_Intersects com geometria WKB
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
    // Não executar automaticamente, apenas adicionar à lista
  };

  const handleZoneDeleted = (zoneId) => {
    console.log('Zone deleted:', zoneId);
    // Não executar automaticamente, apenas remover da lista
  };

  const handleQueryByZone = (zone) => {
    console.log('Query by zone:', zone);
    updateQueryWithSpatialFilter(zone);
  };

  // Função para gerar query UNION ALL com arquivos selecionados e zonas (mantida para compatibilidade com zonas)
  const generateUnionAllQuery = (baseQuery = '') => {
    // Esta função não é mais usada diretamente, mas mantida para suporte a zonas
    // A função addUnionAllToQuery é usada para adicionar UNION ALL à query do input
    
    if (drawnZones.length === 0) {
      return baseQuery || sqlQuery
    }

    // Extrair LIMIT e WHERE da query base
    let queryWithoutLimit = baseQuery || sqlQuery || ''
    let limitClause = ''
    let whereClause = ''
    
    // Extrair LIMIT
    const limitMatch = queryWithoutLimit.match(/LIMIT\s+(\d+)/i)
    if (limitMatch) {
      limitClause = limitMatch[0]
      queryWithoutLimit = queryWithoutLimit.replace(/LIMIT\s+\d+/i, '').trim()
    }

    // Extrair WHERE
    const whereMatch = queryWithoutLimit.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/i)
    if (whereMatch) {
      whereClause = whereMatch[1].trim()
      queryWithoutLimit = queryWithoutLimit.replace(/WHERE\s+.+?(?=ORDER\s+BY|LIMIT|$)/i, '').trim()
    }

    // Obter o SELECT base (remover FROM e tudo depois)
    let selectBase = queryWithoutLimit
    const fromMatch = queryWithoutLimit.match(/SELECT\s+(.+?)\s+FROM/i)
    if (fromMatch) {
      selectBase = `SELECT ${fromMatch[1]}`
    } else if (!selectBase.toUpperCase().startsWith('SELECT')) {
      selectBase = 'SELECT *'
    }

    // Gerar queries para cada zona
    const zoneQueries = drawnZones.map((zone, idx) => {
      const wkt = geometryToWKT(zone)
      if (!wkt) return null
      
      // Para zonas, precisamos de uma query base - usar o primeiro arquivo processado ou um padrão
      const processedFiles = files.filter(f => f.status === 'PROCESSED')
      let baseTable = processedFiles.length > 0 
        ? `pointlake_file_${processedFiles[0].id || processedFiles[0].uuid}`
        : 'fields' // fallback
      
      let spatialFilter
      if (zone.type === 'circle') {
        const center = zone.layer.getLatLng()
        const radiusInMeters = Math.round(zone.layer.getRadius())
        spatialFilter = `ST_DWithin(ST_SetSRID(ST_GeomFromWKB(geometry), 4326), ST_Point(${center.lng}, ${center.lat}), ${radiusInMeters}, true)`
      } else {
        // Para polígonos
        spatialFilter = `ST_Intersects(ST_SetSRID(ST_GeomFromWKB(geometry), 4326), ST_GeomFromText('${wkt}'))`
      }
      
      let query = `${selectBase} FROM ${baseTable}`
      if (whereClause) {
        query += ` WHERE ${whereClause} AND ${spatialFilter}`
      } else {
        query += ` WHERE ${spatialFilter}`
      }
      
      return query
    }).filter(Boolean)

    // Combinar todas as queries com UNION ALL
    const allQueries = [...zoneQueries]
    
    if (allQueries.length === 0) {
      return baseQuery || sqlQuery
    }

    let unionQuery = allQueries.join(' UNION ALL ')
    
    // Adicionar LIMIT no final se existir
    if (limitClause) {
      unionQuery += ` ${limitClause}`
    }

    return unionQuery
  };

  // Função para adicionar UNION ALL à query atual do input
  const addUnionAllToQuery = () => {
    const currentQuery = sqlQuery.trim()
    if (!currentQuery) {
      setError('Please enter a SQL query first')
      return
    }

    // Obter arquivos processados disponíveis
    const processedFiles = files.filter(f => f.status === 'PROCESSED')
    if (processedFiles.length === 0) {
      setError('No processed files available')
      return
    }

    // Extrair partes da query
    let queryWithoutLimit = currentQuery
    let limitClause = ''
    let whereClause = ''
    
    // Extrair LIMIT
    const limitMatch = queryWithoutLimit.match(/LIMIT\s+(\d+)/i)
    if (limitMatch) {
      limitClause = limitMatch[0]
      queryWithoutLimit = queryWithoutLimit.replace(/LIMIT\s+\d+/i, '').trim()
    }

    // Extrair WHERE
    const whereMatch = queryWithoutLimit.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/i)
    if (whereMatch) {
      whereClause = whereMatch[1].trim()
      queryWithoutLimit = queryWithoutLimit.replace(/WHERE\s+.+?(?=ORDER\s+BY|LIMIT|$)/i, '').trim()
    }

    // Obter o SELECT base
    let selectBase = 'SELECT *'
    const fromMatch = queryWithoutLimit.match(/SELECT\s+(.+?)\s+FROM/i)
    if (fromMatch) {
      selectBase = `SELECT ${fromMatch[1]}`
    }

    // Gerar queries para cada arquivo processado
    const fileQueries = processedFiles.map(file => {
      const fileId = file.id || file.uuid
      let query = `${selectBase} FROM pointlake_file_${fileId}`
      if (whereClause) {
        query += ` WHERE ${whereClause}`
      }
      return query
    })

    // Combinar com UNION ALL
    let unionQuery = fileQueries.join(' UNION ALL ')
    
    // Adicionar LIMIT no final se existir
    if (limitClause) {
      unionQuery += ` ${limitClause}`
    }

    // Atualizar query no input
    setSqlQuery(unionQuery)
  }

  // Função para adicionar UNION ALL de um arquivo específico à query atual
  const addFileToUnionAll = (fileId) => {
    const currentQuery = sqlQuery.trim()
    
    // Se não houver query, criar uma base
    let queryWithoutLimit = currentQuery || 'SELECT * FROM fields'
    let limitClause = ''
    let whereClause = ''
    
    // Extrair LIMIT
    const limitMatch = queryWithoutLimit.match(/LIMIT\s+(\d+)/i)
    if (limitMatch) {
      limitClause = limitMatch[0]
      queryWithoutLimit = queryWithoutLimit.replace(/LIMIT\s+\d+/i, '').trim()
    }

    // Extrair WHERE da query atual (se existir)
    const whereMatch = queryWithoutLimit.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/i)
    if (whereMatch) {
      whereClause = whereMatch[1].trim()
      queryWithoutLimit = queryWithoutLimit.replace(/WHERE\s+.+?(?=ORDER\s+BY|LIMIT|$)/i, '').trim()
    }

    // Obter o SELECT base
    let selectBase = 'SELECT *'
    const fromMatch = queryWithoutLimit.match(/SELECT\s+(.+?)\s+FROM/i)
    if (fromMatch) {
      selectBase = `SELECT ${fromMatch[1]}`
    }

    // Criar query para este arquivo específico usando formato spark_catalog
    let fileQuery = `${selectBase} FROM \`spark_catalog\`.\`default\`.\`pointlake_file_${fileId}\``
    if (whereClause) {
      fileQuery += ` WHERE ${whereClause}`
    }

    // Verificar se já existe UNION ALL na query
    if (currentQuery.toUpperCase().includes('UNION ALL')) {
      // Dividir a query em partes do UNION ALL
      const parts = queryWithoutLimit.split(/\s+UNION\s+ALL\s+/i)
      
      // Manter as partes existentes (sem WHERE, será aplicado externamente se houver zona)
      const updatedParts = parts.map(part => {
        // Remover LIMIT se existir na parte individual
        let partWithoutLimit = part.replace(/LIMIT\s+\d+/i, '').trim()
        
        // Remover WHERE também (será aplicado depois se houver zona)
        partWithoutLimit = partWithoutLimit.replace(/WHERE\s+.+?(?=ORDER\s+BY|LIMIT|$)/i, '').trim()
        
        return partWithoutLimit
      })
      
      // Adicionar a nova parte
      updatedParts.push(fileQuery)
      
      // Reconstruir a query com UNION ALL
      let unionQuery = updatedParts.join(' UNION ALL ')
      
      // Adicionar LIMIT no final se existir
      if (limitClause) {
        unionQuery += ` ${limitClause}`
      }
      
      setSqlQuery(unionQuery)
    } else {
      // Criar nova query UNION ALL com o arquivo atual e este novo
      // Primeiro, verificar se há uma query base válida
      let baseQuery = queryWithoutLimit.replace(/WHERE\s+.+?(?=ORDER\s+BY|LIMIT|$)/i, '').trim()
      
      if (!baseQuery || baseQuery === 'SELECT * FROM fields') {
        baseQuery = `${selectBase} FROM \`spark_catalog\`.\`default\`.\`pointlake_file_${fileId}\``
      } else {
        // Converter para formato spark_catalog se necessário
        const fromMatchBase = baseQuery.match(/FROM\s+(.+?)(?:\s+WHERE|\s+ORDER|\s+LIMIT|$)/i)
        if (fromMatchBase) {
          const tableName = fromMatchBase[1].trim()
          // Se não está no formato spark_catalog, converter
          if (!tableName.includes('spark_catalog')) {
            const tableMatch = tableName.match(/pointlake_file_(.+)/)
            if (tableMatch) {
              baseQuery = baseQuery.replace(tableName, `\`spark_catalog\`.\`default\`.\`pointlake_file_${tableMatch[1]}\``)
            }
          }
        }
      }
      
      const unionQuery = `${baseQuery} UNION ALL ${fileQuery}${limitClause ? ` ${limitClause}` : ''}`
      setSqlQuery(unionQuery)
    }
  }

  // Carregar batches e arquivos ao montar o componente (apenas se não houver selectedLeafUserId ainda)
  useEffect(() => {
    if (token && getEnvironment && isAuthenticated && selectedLeafUserId && !changingUser) {
      // Só carregar se não estiver mudando de usuário
      const timer = setTimeout(() => {
        loadBatches()
        loadFiles()
      }, 100)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated])

  // Auto-refresh files every 15 seconds
  useEffect(() => {
    if (!isAuthenticated || !selectedLeafUserId) return
    
    const interval = setInterval(() => {
      loadFiles()
    }, 15000) // 15 seconds
    
    return () => clearInterval(interval)
  }, [isAuthenticated, selectedLeafUserId])

  // Estado para indicar que está mudando de usuário (para feedback visual imediato)
  const [changingUser, setChangingUser] = useState(false)

  // Recarregar dados quando o Point Lake User mudar
  useEffect(() => {
    if (isAuthenticated && selectedLeafUserId) {
      // Limpar lista de arquivos IMEDIATAMENTE de forma síncrona
      setFiles([])
      setBatches([])
      setFileSummaries({})
      setFileCities({})
      
      // Cancelar qualquer loadFiles em execução
      isLoadingFilesRef.current = false
      
      // Limpar refs imediatamente
      fileSummariesRef.current = {}
      fileCitiesRef.current = {}
      loadingSummariesRef.current.clear()
      
      // Resetar contador de arquivos visíveis
      setFilesToShow(20)
      
      // Mostrar estado de mudança
      setChangingUser(true)
      
      // Usar requestAnimationFrame para garantir que a UI seja atualizada primeiro
      requestAnimationFrame(() => {
        // Carregar batches e arquivos em paralelo
        Promise.all([
          loadBatches(),
          loadFiles()
        ]).then(() => {
          setChangingUser(false)
        }).catch(err => {
          console.error('Error loading data after user change:', err)
          setChangingUser(false)
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Salvar query no histórico antes de executar
    const queryToSave = sqlQuery.trim()
    setQueryHistory(prev => {
      // Remover duplicatas (se a mesma query já existe)
      const filtered = prev.filter(q => q.query !== queryToSave)
      // Adicionar no início com timestamp
      const newHistory = [
        {
          query: queryToSave,
          timestamp: new Date().toISOString(),
          executionTime: null // Será atualizado após execução
        },
        ...filtered
      ].slice(0, 50) // Manter apenas últimas 50 queries
      return newHistory
    })

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

      // Se há zonas desenhadas, aplicar filtro espacial após UNION ALL
      if (drawnZones.length > 0) {
        sql = applySpatialFilterToQuery(sql)
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
      setError(getErrorMessage(err, 'Error executing SQL query'))
      setQueryExecutionTime(null)
    } finally {
      setLoading(false)
    }
  }

  // Função para aplicar filtro espacial após UNION ALL (padrão correto)
  const applySpatialFilterToQuery = (query) => {
    if (drawnZones.length === 0) return query

    // Usar apenas a primeira zona (se houver múltiplas, pode ser expandido depois)
    const zone = drawnZones[0]
    const wkt = geometryToWKT(zone)
    if (!wkt) return query

    // Extrair LIMIT da query original
    let queryWithoutLimit = query.trim()
    let limitClause = ''
    const limitMatch = queryWithoutLimit.match(/LIMIT\s+(\d+)/i)
    if (limitMatch) {
      limitClause = limitMatch[0]
      queryWithoutLimit = queryWithoutLimit.replace(/LIMIT\s+\d+/i, '').trim()
    }

    // Extrair WHERE original se existir (será aplicado externamente junto com filtro espacial)
    let originalWhere = ''
    const whereMatch = queryWithoutLimit.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/i)
    if (whereMatch) {
      originalWhere = whereMatch[1].trim()
      queryWithoutLimit = queryWithoutLimit.replace(/WHERE\s+.+?(?=ORDER\s+BY|LIMIT|$)/i, '').trim()
    }

    // Construir filtro espacial
    let spatialFilter
    if (zone.type === 'circle') {
      const center = zone.layer.getLatLng()
      const radiusInMeters = Math.round(zone.layer.getRadius())
      spatialFilter = `ST_DWithin(ST_SetSRID(ST_GeomFromWKB(t.geometry), 4326), ST_Point(${center.lng}, ${center.lat}), ${radiusInMeters}, true)`
    } else {
      // Para polígonos, usar ST_Intersects com ST_SetSRID corretamente
      spatialFilter = `ST_Intersects(ST_SetSRID(ST_GeomFromWKB(t.geometry), 4326), ST_SetSRID(ST_GeomFromText('${wkt}'), 4326))`
    }

    // Combinar WHERE original com filtro espacial se ambos existirem
    let finalWhere = spatialFilter
    if (originalWhere) {
      finalWhere = `${originalWhere} AND ${spatialFilter}`
    }

    // Verificar se já tem UNION ALL na query
    if (queryWithoutLimit.toUpperCase().includes('UNION ALL')) {
      // Envolver a query UNION ALL em uma subquery e aplicar o filtro externamente
      const finalQuery = `SELECT *\nFROM (\n  ${queryWithoutLimit}\n) t\nWHERE ${finalWhere}${limitClause ? ` ${limitClause}` : ''}`
      return finalQuery
    } else {
      // Se não tem UNION ALL, criar um com arquivos processados
      const processedFiles = files.filter(f => f.status === 'PROCESSED')
      if (processedFiles.length === 0) {
        // Sem arquivos processados, aplicar filtro na query atual
        const finalQuery = `${queryWithoutLimit} WHERE ${finalWhere.replace('t.geometry', 'geometry')}${limitClause ? ` ${limitClause}` : ''}`
        return finalQuery
      }

      // Extrair SELECT base
      let selectBase = 'SELECT *'
      const fromMatch = queryWithoutLimit.match(/SELECT\s+(.+?)\s+FROM/i)
      if (fromMatch) {
        selectBase = `SELECT ${fromMatch[1]}`
      }

      // Gerar queries para cada arquivo usando formato spark_catalog
      const fileQueries = processedFiles.map(file => {
        const fileId = file.id || file.uuid
        return `${selectBase} FROM \`spark_catalog\`.\`default\`.\`pointlake_file_${fileId}\``
      })

      // Combinar com UNION ALL e envolver em subquery
      const unionQuery = fileQueries.join('\n  UNION ALL\n  ')
      const finalQuery = `SELECT *\nFROM (\n  ${unionQuery}\n) t\nWHERE ${finalWhere}${limitClause ? ` ${limitClause}` : ''}`
      
      return finalQuery
    }
  }

  // Função para usar uma query do histórico
  const useQueryFromHistory = (query) => {
    setSqlQuery(query)
    setShowHistory(false) // Fechar histórico após selecionar
  }

  // Função para remover uma query do histórico
  const removeQueryFromHistory = (index) => {
    setQueryHistory(prev => prev.filter((_, i) => i !== index))
  }

  // Função para limpar todo o histórico
  const clearQueryHistory = () => {
    if (window.confirm('Are you sure you want to clear all query history?')) {
      setQueryHistory([])
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
                <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="currentColor" strokeWidth="2" fill="none"/>
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
                        if (newValue && newValue.length > 0 && newValue !== selectedLeafUserId) {
                          // Atualizar imediatamente (sem await)
                          setSelectedLeafUserId(newValue)
                        }
                      }}
                      onBlur={(e) => {
                        // Manter o foco se necessário
                        e.preventDefault()
                      }}
                      disabled={loadingUsers || changingUser}
                      className={`px-3 py-1.5 text-sm bg-zinc-800 text-zinc-100 border border-zinc-700 rounded hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px] transition-opacity duration-150 ${
                        changingUser ? 'opacity-75' : ''
                      }`}
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
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      disabled={loadingUsers}
                      className="px-2 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-blue-500 flex items-center gap-1"
                      title="Create new Point Lake User"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create</span>
                    </button>
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
                {files.slice(0, filesToShow).map((file, idx) => {
                  const fileId = file.id || file.uuid
                  const isNew = fileId && newFileIds.has(fileId)
                  const isProcessed = file.status === 'PROCESSED'
                  const summary = fileSummaries[fileId] || null
                  const city = fileCities[fileId] || null
                  const isLoadingSummary = loadingSummaries.has(fileId)
                  const isLoadingCity = loadingCities.has(fileId)
                  
                  // Extrair informações do summary
                  const startDate = summary?.start || summary?.startDate || summary?.startTime || null
                  const endDate = summary?.end || summary?.endDate || summary?.endTime || null
                  
                  // Verificar se é spray (appliedRate)
                  const hasAppliedRate = summary && (
                    // Verificar propriedades diretas (case-insensitive)
                    Object.keys(summary).some(key => {
                      const lowerKey = key.toLowerCase()
                      return (lowerKey.includes('appliedrate') || lowerKey.includes('applied_rate')) &&
                             summary[key] !== undefined && summary[key] !== null
                    }) ||
                    // Verificar valores numéricos não-zero (appliedRate geralmente é > 0)
                    (typeof summary.appliedRate === 'number' && summary.appliedRate > 0) ||
                    (typeof summary.applied_rate === 'number' && summary.applied_rate > 0) ||
                    // Verificar array de properties
                    (summary.properties && Array.isArray(summary.properties) && 
                     summary.properties.some(p => {
                       const propStr = String(p).toLowerCase()
                       return propStr.includes('appliedrate') || propStr.includes('applied_rate')
                     })) ||
                    // Verificar se tem estatísticas de appliedRate
                    (summary.stats && (
                      summary.stats.appliedRate !== undefined ||
                      summary.stats.applied_rate !== undefined
                    ))
                  )
                  
                  // Verificar se é harvest (wetMass)
                  const hasWetMass = summary && (
                    // Verificar propriedades diretas (case-insensitive)
                    Object.keys(summary).some(key => {
                      const lowerKey = key.toLowerCase()
                      return (lowerKey.includes('wetmass') || lowerKey.includes('wet_mass') || lowerKey.includes('wetmass')) &&
                             summary[key] !== undefined && summary[key] !== null
                    }) ||
                    // Verificar valores numéricos não-zero
                    (typeof summary.wetMass === 'number' && summary.wetMass > 0) ||
                    (typeof summary.wetmass === 'number' && summary.wetmass > 0) ||
                    (typeof summary.wet_mass === 'number' && summary.wet_mass > 0) ||
                    // Verificar array de properties
                    (summary.properties && Array.isArray(summary.properties) && 
                     summary.properties.some(p => {
                       const propStr = String(p).toLowerCase()
                       return propStr.includes('wetmass') || propStr.includes('wet_mass')
                     })) ||
                    // Verificar se tem estatísticas de wetMass
                    (summary.stats && (
                      summary.stats.wetMass !== undefined ||
                      summary.stats.wetmass !== undefined ||
                      summary.stats.wet_mass !== undefined
                    ))
                  )
                  
                  const operationType = hasWetMass ? 'harvest' : hasAppliedRate ? 'spray' : null
                  
                  return (
                  <div 
                    key={idx} 
                    className={`rounded border transition duration-150 ${
                      isNew 
                        ? 'bg-blue-950/50 border-blue-600 hover:border-blue-500 ring-2 ring-blue-500/50' 
                        : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-200 truncate">
                            {file.name || file.filename || file.fileName || file.id || `File ${idx + 1}`}
                          </div>
                          {/* Cidade */}
                          {isLoadingCity ? (
                            <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span className="text-zinc-500">Loading location...</span>
                            </div>
                          ) : city ? (
                            <div className="text-xs text-zinc-300 flex items-center gap-1 mt-0.5">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="font-medium">{city}</span>
                            </div>
                          ) : null}
                          <div className="text-xs text-zinc-400 font-mono mt-1">
                            ID: {file.id || file.uuid || 'N/A'}
                          </div>
                          {file.status && (
                            <div className="mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                file.status === 'PROCESSED'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : file.status === 'PROCESSING' || file.status === 'RECEIVED'
                                  ? 'bg-orange-950 text-orange-300 border border-orange-800'
                                  : file.status === 'FAILED'
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}>
                                {file.status}
                              </span>
                            </div>
                          )}
                          {/* Informações do Summary */}
                          {isLoadingSummary ? (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Loading summary...</span>
                              </div>
                            </div>
                          ) : summary ? (
                            <div className="mt-2 space-y-1">
                              {/* Start Date e End Date */}
                              {(startDate || endDate) && (
                                <div className="text-xs text-zinc-400 space-y-0.5">
                                  {startDate && (
                                    <div className="flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>Start: {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                  )}
                                  {endDate && (
                                    <div className="flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span>End: {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Operation Type Indicator - Sempre mostrar se operationType for detectado */}
                              {operationType && (
                                <div className={`flex items-center gap-1.5 mt-2 px-2 py-1 rounded text-xs border ${
                                  operationType === 'harvest'
                                    ? 'bg-orange-950/30 border-orange-800'
                                    : 'bg-blue-950/30 border-blue-800'
                                }`}>
                                  {operationType === 'harvest' ? (
                                    <>
                                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                      </svg>
                                      <span className="text-orange-300 font-medium">Operation Type: Harvest</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                      </svg>
                                      <span className="text-blue-300 font-medium">Operation Type: Spray</span>
                                    </>
                                  )}
                                </div>
                              )}
                              {/* Debug: mostrar se summary existe mas operationType não foi detectado */}
                              {summary && !operationType && process.env.NODE_ENV === 'development' && (
                                <div className="mt-1 text-xs text-zinc-500 italic">
                                  Debug: Summary loaded but operation type not detected. Keys: {Object.keys(summary).join(', ')}
                                </div>
                              )}
                            </div>
                          ) : null}
                          <div className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
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
                                // Remover highlight quando clicado
                                setNewFileIds(prev => {
                                  const updated = new Set(prev)
                                  updated.delete(fileId)
                                  return updated
                                })
                                loadFileSummary(fileId);
                                openMenu('summary');
                              }
                            }}
                            disabled={loadingFileSummary || !isProcessed}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-blue-500"
                            title={isProcessed ? "View Summary" : "File must be PROCESSED to view summary"}
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
                                // Remover highlight quando clicado
                                setNewFileIds(prev => {
                                  const updated = new Set(prev)
                                  updated.delete(fileId)
                                  return updated
                                })
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
                            disabled={loadingQuery || loading || !isProcessed}
                            className="text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-emerald-500"
                            title={isProcessed ? "Execute Query" : "File must be PROCESSED to execute query"}
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
                          <button
                            onClick={() => {
                              const fileId = file.id || file.uuid;
                              if (fileId) {
                                // Remover highlight quando clicado
                                setNewFileIds(prev => {
                                  const updated = new Set(prev)
                                  updated.delete(fileId)
                                  return updated
                                })
                                addFileToUnionAll(fileId);
                              }
                            }}
                            disabled={!isProcessed}
                            className="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-yellow-500"
                            title={isProcessed ? "Add to UNION ALL" : "File must be PROCESSED to add to UNION ALL"}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              const fileId = file.id || file.uuid;
                              if (fileId && isProcessed) {
                                // Remover highlight quando clicado
                                setNewFileIds(prev => {
                                  const updated = new Set(prev)
                                  updated.delete(fileId)
                                  return updated
                                })
                                // Calcular URL base considerando basename para produção
                                const basename = import.meta.env.PROD ? '/pointlake-ui' : ''
                                const url = `${window.location.origin}${basename}/file/${fileId}`
                                // Abrir em nova janela
                                window.open(url, `file-query-${fileId}`, 'width=1400,height=900,resizable=yes,scrollbars=yes')
                              }
                            }}
                            disabled={!isProcessed}
                            className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-purple-500"
                            title={isProcessed ? "Abrir Query SQL em Nova Janela" : "Arquivo deve estar PROCESSED para abrir query"}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              const fileId = file.id || file.uuid;
                              if (fileId) {
                                // Remover highlight quando clicado
                                setNewFileIds(prev => {
                                  const updated = new Set(prev)
                                  updated.delete(fileId)
                                  return updated
                                })
                                loadFileUnits(fileId);
                                openMenu('units');
                              }
                            }}
                            disabled={loadingFileUnits || !isProcessed}
                            className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-orange-500"
                            title={isProcessed ? "View Units" : "File must be PROCESSED to view units"}
                          >
                            {loadingFileUnits ? (
                              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  )
                })}
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
          
          {/* Painel de Units na parte inferior */}
          {(fileUnits || loadingFileUnits) && (
            <div className="bg-zinc-900 border-t border-zinc-800 flex-shrink-0" style={{ height: '200px', maxHeight: '200px' }}>
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Units
                </h3>
                <button
                  onClick={() => {
                    setFileUnits(null)
                    setMenuType('sql')
                  }}
                  className="text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Close Units"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-x-auto overflow-y-auto" style={{ height: '175px', maxHeight: '175px' }}>
                {loadingFileUnits ? (
                  <div className="flex items-center justify-center py-2">
                    <svg className="w-4 h-4 animate-spin text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="ml-2 text-xs text-zinc-400">Loading...</span>
                  </div>
                ) : fileUnits ? (
                  <div className="px-3 py-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="text-left py-1 px-2 text-zinc-300 font-semibold text-xs">Variable</th>
                          <th className="text-left py-1 px-2 text-zinc-300 font-semibold text-xs">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(fileUnits).map(([key, value], idx) => (
                          <tr 
                            key={idx} 
                            className={`border-b border-zinc-700 hover:bg-zinc-700 ${idx % 2 === 0 ? 'bg-zinc-800/50' : 'bg-zinc-700/30'}`}
                          >
                            <td className="py-1 px-2 text-zinc-300 font-mono text-xs whitespace-nowrap">{key}</td>
                            <td className="py-1 px-2 text-zinc-200 text-xs font-medium">{String(value)}</td>
                          </tr>
                        ))}
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
                    <div className="flex items-center gap-2">
                {hasSpatialFilter && (
                  <span className="text-xs text-blue-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Spatial Filter Active
                  </span>
                )}
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1"
                        title="Show query history"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        History ({queryHistory.length})
                      </button>
                    </div>
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
                  {/* Histórico de Queries */}
                  {showHistory && queryHistory.length > 0 && (
                    <div className="mt-2 bg-zinc-800 border border-zinc-700 rounded-lg max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between p-2 border-b border-zinc-700">
                        <h4 className="text-xs font-semibold text-zinc-300">Query History</h4>
                        <button
                          onClick={clearQueryHistory}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          title="Clear all history"
                        >
                          Clear All
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
                                  title="Click to use this query"
                                >
                                  {item.query.length > 100 ? `${item.query.substring(0, 100)}...` : item.query}
                                </button>
                                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                  <span>
                                    {new Date(item.timestamp).toLocaleString('en-US', {
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
                                title="Remove from history"
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
                      No query history yet. Execute queries to save them here.
                    </div>
                  )}
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
              <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded-lg max-h-48 overflow-y-auto">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.就是想M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

      {/* Modal para criar novo Point Lake User */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateUserModal(false)}>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Create New Point Lake User
              </h2>
              <button
                onClick={() => {
                  setShowCreateUserModal(false)
                  setNewUserName('')
                  setNewUserEmail('')
                  setError('')
                }}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="new-user-name" className="block text-sm font-medium text-zinc-300 mb-1">
                  Name (optional)
                </label>
                <input
                  id="new-user-name"
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter user name"
                  disabled={creatingUser}
                />
              </div>

              <div>
                <label htmlFor="new-user-email" className="block text-sm font-medium text-zinc-300 mb-1">
                  Email (optional)
                </label>
                <input
                  id="new-user-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter user email"
                  disabled={creatingUser}
                />
              </div>

              {error && (
                <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-sm">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={async () => {
                    if (!newUserName.trim() && !newUserEmail.trim()) {
                      setError('Please provide at least a name or email')
                      return
                    }

                    setCreatingUser(true)
                    setError('')

                    try {
                      const result = await createLeafUser(newUserName.trim() || undefined, newUserEmail.trim() || undefined)
                      
                      if (result.success) {
                        // Selecionar o novo usuário criado
                        if (result.user && result.user.id) {
                          setSelectedLeafUserId(result.user.id)
                        }
                        
                        // Fechar modal e limpar campos
                        setShowCreateUserModal(false)
                        setNewUserName('')
                        setNewUserEmail('')
                        setError('')
                      } else {
                        setError(result.error || 'Failed to create user')
                      }
                    } catch (err) {
                      console.error('Error creating user:', err)
                      setError('An unexpected error occurred')
                    } finally {
                      setCreatingUser(false)
                    }
                  }}
                  disabled={creatingUser || (!newUserName.trim() && !newUserEmail.trim())}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-blue-500 flex items-center justify-center gap-2"
                >
                  {creatingUser ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create User
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateUserModal(false)
                    setNewUserName('')
                    setNewUserEmail('')
                    setError('')
                  }}
                  disabled={creatingUser}
                  className="px-4 py-2 bg-zinc-700 text-zinc-100 rounded-lg font-medium hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
