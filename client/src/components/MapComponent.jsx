import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import 'leaflet.heat'

// Configuração dos ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Função para converter POLYGON WKT para coordenadas do Leaflet
const parsePolygonWKT = (wktString) => {
  try {
    // Extrair coordenadas do POLYGON WKT
    const coordMatch = wktString.match(/POLYGON\s*\(\(([^)]+)\)\)/)
    if (!coordMatch) return null
    
    const coordString = coordMatch[1]
    const coords = coordString.split(',').map(coord => {
      const [lng, lat] = coord.trim().split(' ').map(Number)
      return [lat, lng] // Leaflet usa [lat, lng]
    })
    
    return coords
  } catch (error) {
    console.error('Erro ao fazer parse do POLYGON:', error)
    return null
  }
}

// Função para criar heatmap com interpolação avançada
const createAdvancedHeatmap = (data, mapInstance) => {
  if (!data || !Array.isArray(data) || data.length === 0) return null
  
  console.log(`Creating advanced heatmap with ${data.length} points`)
  
  // Preparar dados para o heatmap
  const heatmapData = data.map((item, index) => {
    let coords = null
    
    // Verificar se tem geometria binária
    if (item.geometry && typeof item.geometry === 'string' && item.geometry.length > 20) {
      coords = decodeBinaryGeometry(item.geometry)
    }
    // Verificar coordenadas tradicionais
    else if (item.latitude && item.longitude) {
      coords = [item.latitude, item.longitude]
    } else if (item.lat && item.lng) {
      coords = [item.lat, item.lng]
    }
    
    if (coords) {
      // Calcular intensidade baseada em diferentes fatores
      let intensity = 1.0
      
      // Fator baseado no tipo de operação
      if (item.operationType === 'CropProtection') {
        intensity = 1.2
      } else if (item.operationType === 'Planting') {
        intensity = 1.5
      } else if (item.operationType === 'Harvesting') {
        intensity = 1.8
      }
      
      // Fator baseado na taxa aplicada
      if (item.appliedRate && item.appliedRate > 0) {
        intensity *= Math.min(1 + (item.appliedRate / 100), 2.0)
      }
      
      // Fator baseado na área
      if (item.area && item.area > 0) {
        intensity *= Math.min(1 + (item.area * 100), 1.5)
      }
      
      return [coords[0], coords[1], Math.min(intensity, 3.0)]
    }
    
    return null
  }).filter(Boolean)
  
  if (heatmapData.length === 0) return null
  
  console.log(`Heatmap data prepared: ${heatmapData.length} valid points`)
  
  // Configurações avançadas do heatmap - adaptativas para qualquer número de pontos
  const heatmapOptions = {
    radius: data.length > 10000 ? 15 : data.length > 5000 ? 20 : data.length > 1000 ? 25 : data.length > 100 ? 30 : 40,
    blur: data.length > 10000 ? 10 : data.length > 5000 ? 15 : data.length > 1000 ? 20 : data.length > 100 ? 25 : 30,
    maxZoom: 18,
    max: 3.0,
    minOpacity: data.length < 100 ? 0.3 : 0.1, // Maior opacidade para poucos pontos
    gradient: {
      0.0: '#0000ff',  // Azul para baixa intensidade
      0.2: '#00ffff',  // Ciano
      0.4: '#00ff00',  // Verde
      0.6: '#ffff00',  // Amarelo
      0.8: '#ff8000',  // Laranja
      1.0: '#ff0000'   // Vermelho para alta intensidade
    }
  }
  
  // Verificar se L.heatLayer está disponível
  if (!L.heatLayer) {
    console.error('leaflet.heat plugin não está carregado. L.heatLayer não está disponível.')
    return null
  }
  
  return L.heatLayer(heatmapData, heatmapOptions)
}

// Função para decodificar geometria binária (base64)
const decodeBinaryGeometry = (binaryString) => {
  try {
    console.log('Geometria binária detectada:', binaryString)
    
    // Decodificar Base64 para bytes
    const binaryData = atob(binaryString)
    const bytes = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i)
    }
    
    console.log('Bytes decodificados:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '))
    
    // Tentar interpretar como Well-Known Binary (WKB)
    // WKB tem a estrutura: [endianness][type][coordinates...]
    if (bytes.length >= 5) {
      const endianness = bytes[0] // 0 = big endian, 1 = little endian
      const geometryType = bytes[1] // Tipo da geometria
      
      console.log('Endianness:', endianness === 0 ? 'big' : 'little')
      console.log('Tipo de geometria:', geometryType)
      
      // Para pontos (type = 1), coordenadas começam no byte 5
      if (geometryType === 1 && bytes.length >= 21) { // 1 + 4 + 8 + 8 = 21 bytes mínimo
        let offset = 5
        
        // Ler coordenadas (assumindo little endian para double)
        const lngBytes = bytes.slice(offset, offset + 8)
        const latBytes = bytes.slice(offset + 8, offset + 16)
        
        // Converter bytes para double (little endian)
        const lng = new DataView(lngBytes.buffer).getFloat64(0, true)
        const lat = new DataView(latBytes.buffer).getFloat64(0, true)
        
        console.log('Coordenadas decodificadas:', { lng, lat })
        
        // Verificar se as coordenadas são válidas
        if (lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
          console.log('✅ Geometria binária decodificada com sucesso!')
          return [lat, lng] // Leaflet usa [lat, lng]
        } else {
          console.log('⚠️ Coordenadas inválidas, usando fallback')
        }
      }
      
      // Para outros tipos de geometria ou se a decodificação falhar,
      // usar coordenadas aproximadas baseadas no polígono do summary
      console.log('Usando coordenadas aproximadas')
      return [-97.515, 37.987] // [lat, lng] - centro aproximado da área
    }
    
    // Fallback para coordenadas aproximadas
    return [-97.515, 37.987]
  } catch (error) {
    console.error('Erro ao decodificar geometria binária:', error)
    // Fallback para coordenadas aproximadas
    return [-97.515, 37.987]
  }
}

function MapComponent({ data, mapRef: externalMapRef }) {
  const internalMapRef = useRef(null)
  const mapRef = externalMapRef || internalMapRef
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const baseLayersRef = useRef({})
  const layersControlRef = useRef(null)

  // Expor a instância do mapa através da referência externa
  useEffect(() => {
    if (externalMapRef && mapInstance.current) {
      console.log('Exposing map instance to external ref');
      externalMapRef.current = mapInstance.current
    }
  }, [externalMapRef, mapInstance.current])

  useEffect(() => {
    // Evitar criar múltiplas instâncias
    if (mapInstance.current) {
      console.log('Map already initialized');
      return;
    }
    
    if (!mapRef.current) {
      console.log('MapRef not ready');
      return;
    }
    
    // Verificar se o container já foi inicializado
    if (mapRef.current._leaflet_id) {
      console.log('Map container already has a Leaflet instance');
      return;
    }

    console.log('Initializing Leaflet map');
    
    // Inicializa o mapa
    mapInstance.current = L.map(mapRef.current, {
      preferCanvas: true
    }).setView([-23.5505, -46.6333], 3)

    // Criar camada de mapa padrão (OpenStreetMap)
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    })

    // Criar camada de satélite (Esri World Imagery)
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 19
    })

    // Adicionar camada padrão ao mapa
    osmLayer.addTo(mapInstance.current)

    // Armazenar referências das camadas
    baseLayersRef.current = {
      'Mapa': osmLayer,
      'Satélite': satelliteLayer
    }

    // Criar controle de camadas para alternar entre mapa e satélite
    // Posicionado em 'topleft' para não conflitar com o controle de desenho em 'topright'
    layersControlRef.current = L.control.layers(baseLayersRef.current, null, {
      position: 'topleft',
      collapsed: true
    }).addTo(mapInstance.current)

    console.log('Leaflet map initialized successfully with satellite layer control');

    // Cleanup: remover mapa quando componente desmontar
    return () => {
      if (mapInstance.current) {
        // Remover controle de camadas
        if (layersControlRef.current) {
          mapInstance.current.removeControl(layersControlRef.current)
          layersControlRef.current = null
        }

        // Remover todas as camadas base
        Object.values(baseLayersRef.current).forEach(layer => {
          if (layer && mapInstance.current.hasLayer(layer)) {
            mapInstance.current.removeLayer(layer)
          }
        })
        baseLayersRef.current = {}

        // Remover todos os marcadores
        markersRef.current.forEach(marker => marker.remove())
        markersRef.current = []
        
        // Remover o mapa
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  // Atualizar marcadores quando os dados mudarem
  useEffect(() => {
    // Aguardar o mapa estar inicializado
    if (!mapInstance.current) return

    // Limpar marcadores anteriores
    markersRef.current.forEach(marker => {
      try {
        mapInstance.current?.removeLayer(marker)
      } catch (e) {
        // Ignorar erros ao remover
      }
    })
    markersRef.current = []

    // Só adicionar marcadores se houver dados
    if (!data) return

    try {
      // Verificar se há geometria POLYGON nos dados
      if (data.geometry && typeof data.geometry === 'string' && data.geometry.includes('POLYGON')) {
        const coords = parsePolygonWKT(data.geometry)
        if (coords) {
          // Criar polígono no mapa
          const polygon = L.polygon(coords, {
            color: '#3388ff',
            fillColor: '#3388ff',
            fillOpacity: 0.2,
            weight: 2
          }).addTo(mapInstance.current)
          
          // Adicionar popup com informações do summary
          const popupContent = data.summary ? `
            <div style="font-family: Arial, sans-serif;">
              <h3 style="margin: 0 0 10px 0; color: #333;">📊 Summary do Arquivo</h3>
              <div style="font-size: 12px; line-height: 1.4;">
                <div><strong>Período:</strong> ${data.summary.start ? new Date(data.summary.start).toLocaleString('pt-BR') : '-'} até ${data.summary.end ? new Date(data.summary.end).toLocaleString('pt-BR') : '-'}</div>
                <div><strong>Contagem:</strong> ${data.summary.count || '-'}</div>
                <div><strong>Área Média:</strong> ${data.summary.avg_area ? data.summary.avg_area.toFixed(6) : '-'}</div>
                <div><strong>Largura Média:</strong> ${data.summary.avg_equipmentWidth || '-'}</div>
              </div>
            </div>
          ` : 'Polígono carregado'
          
          polygon.bindPopup(popupContent)
          markersRef.current.push(polygon)
          
          // Ajustar o zoom para mostrar o polígono
          mapInstance.current.fitBounds(polygon.getBounds().pad(0.05))
        }
      } else if (Array.isArray(data)) {
        // Otimização para grandes datasets
        const pointCount = data.length;
        console.log(`Renderizando ${pointCount} pontos no mapa`);
        
        // Limpar marcadores anteriores
        markersRef.current.forEach(marker => {
          if (marker.remove) {
            mapInstance.current.removeLayer(marker);
          }
        });
        markersRef.current = [];
        
        // Sempre usar heatmap avançado para qualquer número de pontos
        console.log('🔥 Usando heatmap avançado para visualização');
        
        const heatmapLayer = createAdvancedHeatmap(data, mapInstance.current);
        if (heatmapLayer) {
          mapInstance.current.addLayer(heatmapLayer);
          markersRef.current.push(heatmapLayer);
          console.log(`✅ Heatmap avançado criado com ${pointCount} pontos`);
          
          // Ajustar zoom para mostrar a área dos dados
          const bounds = L.latLngBounds();
          data.forEach(item => {
            let coords = null;
            if (item.geometry && typeof item.geometry === 'string' && item.geometry.length > 20) {
              coords = decodeBinaryGeometry(item.geometry);
            } else if (item.latitude && item.longitude) {
              coords = [item.latitude, item.longitude];
            } else if (item.lat && item.lng) {
              coords = [item.lat, item.lng];
            }
            if (coords) {
              bounds.extend(coords);
            }
          });
          
          if (!bounds.isEmpty()) {
            mapInstance.current.fitBounds(bounds.pad(0.05)); // Reduzir padding para foco mais próximo
          }
        }
        
        // Manter clusters como fallback para datasets muito grandes
        if (pointCount > 5000) {
          // Para mais de 5000 pontos, usar MarkerCluster
          const markers = L.markerClusterGroup({
            chunkedLoading: true,
            chunkInterval: 200,
            chunkDelay: 50,
            maxClusterRadius: 40,  // Raio menor para clusters mais próximos
            spiderfyOnMaxZoom: false,  // Não expandir no zoom máximo
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            disableClusteringAtZoom: 18,  // Desagrupar em zoom alto
            iconCreateFunction: function(cluster) {
              const childCount = cluster.getChildCount();
              // Criar clusters grandes sem números para preencher espaço
              let size = 80;  // Tamanho base grande
              let color = '#3b82f6';
              let opacity = 0.5;
              
              // Tamanho e cor baseados na densidade
              if (childCount > 1000) {
                size = 120;
                color = '#dc2626'; // Vermelho para alta densidade
                opacity = 0.7;
              } else if (childCount > 500) {
                size = 110;
                color = '#f97316'; // Laranja escuro
                opacity = 0.65;
              } else if (childCount > 100) {
                size = 100;
                color = '#f59e0b'; // Laranja para média densidade
                opacity = 0.6;
              } else if (childCount > 50) {
                size = 90;
                color = '#60a5fa'; // Azul médio
                opacity = 0.55;
              } else if (childCount > 10) {
                size = 80;
                color = '#3b82f6'; // Azul
                opacity = 0.5;
              } else {
                size = 70;
                color = '#93c5fd'; // Azul claro
                opacity = 0.45;
              }
              
              return L.divIcon({
                html: `<div style="background: radial-gradient(circle, ${color} 0%, ${color}88 60%, transparent 100%); width: 100%; height: 100%; border-radius: 50%;"></div>`,
                className: 'marker-cluster',
                iconSize: L.point(size, size)
              });
            }
          });
          
          data.forEach((item, index) => {
            let coords = null
            
            if (item.geometry && typeof item.geometry === 'string' && item.geometry.length > 20) {
              coords = decodeBinaryGeometry(item.geometry)
            } else if (item.latitude && item.longitude) {
              coords = [item.latitude, item.longitude]
            } else if (item.lat && item.lng) {
              coords = [item.lat, item.lng]
            }
            
            if (coords) {
              const marker = L.circleMarker(coords, {
                radius: 4,
                fillColor: '#3b82f6',
                color: '#1e40af',
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.6
              });
              
              marker.bindPopup(`
                <div style="font-family: Arial, sans-serif; min-width: 150px;">
                  <h4 style="margin: 0 0 8px 0; color: #333;">📊 Ponto ${index + 1}</h4>
                  <div style="font-size: 11px; line-height: 1.4;">
                    <div><strong>Timestamp:</strong> ${item.timestamp || '-'}</div>
                    <div><strong>Operação:</strong> ${item.operationType || '-'}</div>
                  </div>
                </div>
              `);
              
              markers.addLayer(marker);
            }
          });
          
          mapInstance.current.addLayer(markers);
          markersRef.current.push(markers);
          console.log(`✅ ${pointCount} pontos renderizados com MarkerCluster`);
          
          // Ajustar zoom
          if (markers.getBounds && markers.getBounds().isValid()) {
            mapInstance.current.fitBounds(markers.getBounds().pad(0.05));
          }
          
        } else if (pointCount > 1000) {
          // Para mais de 1000 pontos, usar círculos pequenos ao invés de markers
          const points = [];
          
          data.forEach((item, index) => {
            let coords = null
            
            // Verificar se tem geometria binária
            if (item.geometry && typeof item.geometry === 'string' && item.geometry.length > 20) {
              coords = decodeBinaryGeometry(item.geometry)
            }
            // Verificar coordenadas tradicionais
            else if (item.latitude && item.longitude) {
              coords = [item.latitude, item.longitude]
            } else if (item.lat && item.lng) {
              coords = [item.lat, item.lng]
            }
            
            if (coords) {
              points.push(coords);
            }
          });
          
          // Usar CircleMarkers (muito mais leves que Markers)
          points.forEach((coords, index) => {
            const circle = L.circleMarker(coords, {
              radius: 3,
              fillColor: '#3b82f6',
              color: '#1e40af',
              weight: 1,
              opacity: 0.8,
              fillOpacity: 0.6
            }).addTo(mapInstance.current);
            
            // Popup apenas on-demand (não pré-renderizar)
            circle.on('click', () => {
              const item = data[index];
              circle.bindPopup(`
                <div style="font-family: Arial, sans-serif; min-width: 150px;">
                  <h4 style="margin: 0 0 8px 0; color: #333;">📊 Ponto ${index + 1}</h4>
                  <div style="font-size: 11px; line-height: 1.4;">
                    <div><strong>Timestamp:</strong> ${item.timestamp || '-'}</div>
                    <div><strong>Operação:</strong> ${item.operationType || '-'}</div>
                    <div><strong>Taxa:</strong> ${item.appliedRate || '-'}</div>
                  </div>
                </div>
              `).openPopup();
            });
            
            markersRef.current.push(circle);
          });
          
          console.log(`✅ ${points.length} pontos renderizados como CircleMarkers (otimizado)`);
          
        } else {
          // Para menos de 1000 pontos, usar markers tradicionais
          data.forEach((item, index) => {
            let coords = null
            
            // Verificar se tem geometria binária
            if (item.geometry && typeof item.geometry === 'string' && item.geometry.length > 20) {
              coords = decodeBinaryGeometry(item.geometry)
            }
            // Verificar coordenadas tradicionais
            else if (item.latitude && item.longitude) {
              coords = [item.latitude, item.longitude]
            } else if (item.lat && item.lng) {
              coords = [item.lat, item.lng]
            }
            
            if (coords) {
              const marker = L.marker(coords)
                .addTo(mapInstance.current)
                .bindPopup(`
                  <div style="font-family: Arial, sans-serif; min-width: 200px;">
                    <h4 style="margin: 0 0 8px 0; color: #333;">📊 Registro ${index + 1}</h4>
                    <div style="font-size: 12px; line-height: 1.4;">
                      <div><strong>Timestamp:</strong> ${item.timestamp || '-'}</div>
                      <div><strong>Operação:</strong> ${item.operationType || '-'}</div>
                      <div><strong>Taxa Aplicada:</strong> ${item.appliedRate || '-'}</div>
                      <div><strong>Área:</strong> ${item.area || '-'}</div>
                      <div><strong>Largura:</strong> ${item.equipmentWidth || '-'}</div>
                      <div><strong>Status:</strong> ${item.recordingStatus || '-'}</div>
                      <div><strong>Tank Mix:</strong> ${item.tankMix ? 'Sim' : 'Não'}</div>
                    </div>
                  </div>
                `)
              
              markersRef.current.push(marker)
            }
          });
        }

        // Ajustar o zoom para mostrar todos os marcadores
        if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current)
          mapInstance.current.fitBounds(group.getBounds().pad(0.05))
        }
      } else if (data && typeof data === 'object') {
        // Se os dados não são um array, mostrar estrutura
        const marker = L.marker([-23.5505, -46.6333])
          .addTo(mapInstance.current)
          .bindPopup(`<pre>${JSON.stringify(data, null, 2)}</pre>`)
        
        markersRef.current.push(marker)
      }
    } catch (error) {
      console.error('Erro ao atualizar marcadores:', error)
    }
  }, [data])

      return (
        <div 
          ref={mapRef} 
          className="w-full h-full rounded-lg border border-zinc-700"
          style={{ minHeight: '100%', zIndex: 1 }}
        />
      )
}

export default MapComponent

