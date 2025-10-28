import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

const DrawZones = ({ onZoneCreated, onZoneDeleted, onQueryByZone, zones = [], mapRef }) => {
  const drawControlRef = useRef(null);
  const drawnItemsRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnZones, setDrawnZones] = useState(zones);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Verificar se o mapa está pronto
    if (!mapRef || !mapRef.current) {
      console.log('MapRef not ready, waiting...');
      return;
    }

    if (!mapRef.current.addLayer || typeof mapRef.current.addLayer !== 'function') {
      console.log('Map instance not valid, waiting...');
      return;
    }

    // Mapa está pronto, inicializar controles
    console.log('Initializing draw controls');
    initializeDrawControls();
  }, [mapRef, mapRef?.current]);

  const initializeDrawControls = () => {
    if (isInitialized.current) {
      console.log('DrawZones already initialized');
      return;
    }

    if (!mapRef || !mapRef.current) {
      console.log('MapRef not ready yet');
      return;
    }

    const map = mapRef.current;
    
    // Verificar se o mapa é uma instância válida do Leaflet
    if (!map.addLayer || typeof map.addLayer !== 'function') {
      console.error('Map is not a valid Leaflet instance', map);
      return;
    }
    
    console.log('Map is ready, initializing DrawZones');
    
    // Criar FeatureGroup para gerenciar as zonas desenhadas PRIMEIRO
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;
    console.log('FeatureGroup created and added to map');
    
    // Criar controle de desenho DEPOIS que o FeatureGroup existe
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e1e100',
            message: '<strong>Error:</strong> shape edges cannot cross!'
          },
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 2
          }
        },
        rectangle: {
          shapeOptions: {
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.2,
            weight: 2
          }
        },
        circle: {
          shapeOptions: {
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.2,
            weight: 2
          }
        },
        marker: false,
        polyline: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems, // Usar o FeatureGroup criado
        remove: true
      }
    });

    // Adicionar controle ao mapa
    map.addControl(drawControl);
    drawControlRef.current = drawControl;
    isInitialized.current = true;
    console.log('DrawZones initialized successfully');

    // Event listeners para desenho
    map.on(L.Draw.Event.CREATED, (event) => {
      const { layerType, layer } = event;
      const zoneId = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Adicionar ID único à camada
      layer.zoneId = zoneId;
      layer.zoneName = `Zone ${drawnZones.length + 1}`;
      
      // Calcular área
      let area = 0;
      if (layerType === 'polygon' || layerType === 'rectangle') {
        // Usar método toGeoJSON e calcular área aproximada
        const latlngs = layer.getLatLngs()[0];
        // Área aproximada em m² (simplificada)
        const bounds = layer.getBounds();
        const latDiff = bounds.getNorth() - bounds.getSouth();
        const lngDiff = bounds.getEast() - bounds.getWest();
        area = Math.abs(latDiff * lngDiff * 111000 * 111000); // Conversão aproximada para m²
      } else if (layerType === 'circle') {
        const radius = layer.getRadius();
        area = Math.PI * radius * radius;
      }

      // Adicionar popup com informações da zona
      const popupContent = `
        <div class="p-2">
          <h3 class="font-semibold text-zinc-200 mb-2">${layer.zoneName}</h3>
          <div class="text-xs text-zinc-400 space-y-1">
            <div><strong>Type:</strong> ${layerType}</div>
            <div><strong>ID:</strong> ${zoneId}</div>
            <div><strong>Area:</strong> ${area.toFixed(0)} m²</div>
          </div>
          <div class="mt-2 flex gap-1">
            <button onclick="window.deleteZone('${zoneId}')" class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
              Delete
            </button>
          </div>
        </div>
      `;
      
      layer.bindPopup(popupContent);
      
      // Adicionar à FeatureGroup
      drawnItems.addLayer(layer);
      
      // Atualizar estado
      const newZone = {
        id: zoneId,
        name: layer.zoneName,
        type: layerType,
        layer: layer,
        coordinates: layer.getLatLngs ? layer.getLatLngs()[0] : layer.getLatLng(),
        area: area
      };
      
      setDrawnZones(prev => [...prev, newZone]);
      onZoneCreated && onZoneCreated(newZone);
      console.log('Zone created and added to list:', newZone);
    });

    // Event listener para edição
    map.on(L.Draw.Event.EDITED, (event) => {
      const layers = event.layers;
      layers.eachLayer((layer) => {
        // Recalcular área
        let area = 0;
        const layerType = layer instanceof L.Polygon ? 'polygon' : layer instanceof L.Rectangle ? 'rectangle' : 'circle';
        
        if (layerType === 'polygon' || layerType === 'rectangle') {
          const bounds = layer.getBounds();
          const latDiff = bounds.getNorth() - bounds.getSouth();
          const lngDiff = bounds.getEast() - bounds.getWest();
          area = Math.abs(latDiff * lngDiff * 111000 * 111000);
        } else if (layerType === 'circle') {
          const radius = layer.getRadius();
          area = Math.PI * radius * radius;
        }

        const updatedZone = {
          id: layer.zoneId,
          name: layer.zoneName,
          type: layerType,
          layer: layer,
          coordinates: layer.getLatLngs ? layer.getLatLngs()[0] : layer.getLatLng(),
          area: area
        };
        
        setDrawnZones(prev => prev.map(zone => 
          zone.id === layer.zoneId ? updatedZone : zone
        ));
      });
    });

    // Event listener para remoção
    map.on(L.Draw.Event.DELETED, (event) => {
      const layers = event.layers;
      layers.eachLayer((layer) => {
        setDrawnZones(prev => prev.filter(zone => zone.id !== layer.zoneId));
        onZoneDeleted && onZoneDeleted(layer.zoneId);
      });
    });

    // Carregar zonas existentes
    drawnZones.forEach(zone => {
      if (zone.layer) {
        drawnItems.addLayer(zone.layer);
      }
    });

    // Funções globais para popup
    window.editZone = (zoneId) => {
      const zone = drawnZones.find(z => z.id === zoneId);
      if (zone && zone.layer) {
        const editControl = new L.EditToolbar.Edit(map, {
          featureGroup: drawnItems
        });
        editControl.enable();
        zone.layer.editing.enable();
      }
    };

    window.deleteZone = (zoneId) => {
      const zone = drawnZones.find(z => z.id === zoneId);
      if (zone && zone.layer) {
        drawnItems.removeLayer(zone.layer);
        setDrawnZones(prev => prev.filter(z => z.id !== zoneId));
        onZoneDeleted && onZoneDeleted(zoneId);
      }
    };

  };

  const clearAllZones = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers();
      setDrawnZones([]);
      console.log('All zones cleared');
    }
  };

  const exportZones = () => {
    const zonesData = drawnZones.map(zone => ({
      id: zone.id,
      name: zone.name,
      type: zone.type,
      coordinates: zone.coordinates,
      area: zone.area
    }));
    
    const dataStr = JSON.stringify(zonesData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `zones_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importZones = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const zonesData = JSON.parse(e.target.result);
            // Recriar as zonas no mapa
            zonesData.forEach(zoneData => {
              let layer;
              if (zoneData.type === 'polygon') {
                layer = L.polygon(zoneData.coordinates, {
                  color: '#3b82f6',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.2,
                  weight: 2
                });
              } else if (zoneData.type === 'rectangle') {
                layer = L.rectangle(zoneData.coordinates, {
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.2,
                  weight: 2
                });
              } else if (zoneData.type === 'circle') {
                layer = L.circle(zoneData.coordinates[0], {
                  radius: zoneData.coordinates[1],
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.2,
                  weight: 2
                });
              }
              
              if (layer) {
                layer.zoneId = zoneData.id;
                layer.zoneName = zoneData.name;
                
                const popupContent = `
                  <div class="p-2">
                    <h3 class="font-semibold text-zinc-200 mb-2">${layer.zoneName}</h3>
                    <div class="text-xs text-zinc-400 space-y-1">
                      <div><strong>Type:</strong> ${zoneData.type}</div>
                      <div><strong>ID:</strong> ${zoneData.id}</div>
                      <div><strong>Area:</strong> ${zoneData.area.toFixed(2)} m²</div>
                    </div>
                    <div class="mt-2 flex gap-1">
                      <button onclick="window.editZone('${zoneData.id}')" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                        Edit
                      </button>
                      <button onclick="window.deleteZone('${zoneData.id}')" class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
                        Delete
                      </button>
                    </div>
                  </div>
                `;
                
                layer.bindPopup(popupContent);
                
                // Adicionar ao mapa
                if (mapRef.current) {
                  mapRef.current.addLayer(layer);
                }
                
                // Adicionar ao estado
                setDrawnZones(prev => [...prev, zoneData]);
              }
            });
          } catch (error) {
            console.error('Erro ao importar zonas:', error);
            alert('Erro ao importar arquivo de zonas');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const saveZonesToLocalStorage = () => {
    const zonesData = drawnZones.map(zone => ({
      id: zone.id,
      name: zone.name,
      type: zone.type,
      coordinates: zone.coordinates,
      area: zone.area
    }));
    localStorage.setItem('drawnZones', JSON.stringify(zonesData));
    alert('Zonas salvas no navegador!');
  };

  const loadZonesFromLocalStorage = () => {
    const savedZones = localStorage.getItem('drawnZones');
    if (savedZones) {
      try {
        const zonesData = JSON.parse(savedZones);
        // Limpar zonas existentes
        clearAllZones();
        // Recriar zonas salvas
        zonesData.forEach(zoneData => {
          let layer;
          if (zoneData.type === 'polygon') {
            layer = L.polygon(zoneData.coordinates, {
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.2,
              weight: 2
            });
          } else if (zoneData.type === 'rectangle') {
            layer = L.rectangle(zoneData.coordinates, {
              color: '#10b981',
              fillColor: '#10b981',
              fillOpacity: 0.2,
              weight: 2
            });
          } else if (zoneData.type === 'circle') {
            layer = L.circle(zoneData.coordinates[0], {
              radius: zoneData.coordinates[1],
              color: '#f59e0b',
              fillColor: '#f59e0b',
              fillOpacity: 0.2,
              weight: 2
            });
          }
          
          if (layer) {
            layer.zoneId = zoneData.id;
            layer.zoneName = zoneData.name;
            
            const popupContent = `
              <div class="p-2">
                <h3 class="font-semibold text-zinc-200 mb-2">${layer.zoneName}</h3>
                <div class="text-xs text-zinc-400 space-y-1">
                  <div><strong>Type:</strong> ${zoneData.type}</div>
                  <div><strong>ID:</strong> ${zoneData.id}</div>
                  <div><strong>Area:</strong> ${zoneData.area.toFixed(2)} m²</div>
                </div>
                <div class="mt-2 flex gap-1">
                  <button onclick="window.editZone('${zoneData.id}')" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                    Edit
                  </button>
                  <button onclick="window.deleteZone('${zoneData.id}')" class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700">
                    Delete
                  </button>
                </div>
              </div>
            `;
            
            layer.bindPopup(popupContent);
            
            // Adicionar ao mapa
            if (mapRef.current) {
              mapRef.current.addLayer(layer);
            }
            
            // Adicionar ao estado
            setDrawnZones(prev => [...prev, zoneData]);
          }
        });
        alert('Zonas carregadas do navegador!');
      } catch (error) {
        console.error('Erro ao carregar zonas:', error);
        alert('Erro ao carregar zonas salvas');
      }
    } else {
      alert('Nenhuma zona salva encontrada');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Drawn Zones ({drawnZones.length})
        </h3>
        <button
          onClick={clearAllZones}
          className="px-2 py-1 bg-red-900 text-red-200 rounded text-xs font-medium hover:bg-red-800 transition duration-150 border border-red-700"
          title="Clear all zones"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2">
        {drawnZones.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {drawnZones.map((zone, index) => (
              <div key={zone.id} className="bg-zinc-800 border border-zinc-700 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-zinc-200 truncate">{zone.name}</div>
                    <div className="text-xs text-zinc-400">
                      {zone.type} • {zone.area.toFixed(0)} m²
                    </div>
                  </div>
                  <button
                    onClick={() => window.deleteZone(zone.id)}
                    className="ml-2 text-xs bg-red-900 text-red-200 px-2 py-1 rounded hover:bg-red-800 transition duration-150 border border-red-800"
                    title="Delete zone"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => onQueryByZone && onQueryByZone(zone)}
                  className="w-full text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded hover:bg-blue-800 transition duration-150 border border-blue-800 flex items-center justify-center gap-1"
                  title="Add spatial filter to SQL query"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Query by Zone
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-zinc-500 text-center py-4 bg-zinc-800 border border-zinc-700 rounded">
            No zones drawn yet
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawZones;