import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

const DrawZones = ({ onZoneCreated, onZoneDeleted, zones = [], mapRef }) => {
  const drawControlRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnZones, setDrawnZones] = useState(zones);

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

    // Event listeners para desenho
    map.on(L.Draw.Event.CREATED, (event) => {
      const { layerType, layer } = event;
      const zoneId = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Adicionar ID único à camada
      layer.zoneId = zoneId;
      layer.zoneName = `Zone ${drawnZones.length + 1}`;
      
      // Adicionar popup com informações da zona
      const popupContent = `
        <div class="p-2">
          <h3 class="font-semibold text-zinc-200 mb-2">${layer.zoneName}</h3>
          <div class="text-xs text-zinc-400 space-y-1">
            <div><strong>Type:</strong> ${layerType}</div>
            <div><strong>ID:</strong> ${zoneId}</div>
            ${layer.getLatLngs ? `<div><strong>Area:</strong> ${L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]).toFixed(2)} m²</div>` : ''}
          </div>
          <div class="mt-2 flex gap-1">
            <button onclick="window.editZone('${zoneId}')" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
              Edit
            </button>
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
        area: layer.getLatLngs ? L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) : 0
      };
      
      setDrawnZones(prev => [...prev, newZone]);
      onZoneCreated && onZoneCreated(newZone);
    });

    // Event listener para edição
    map.on(L.Draw.Event.EDITED, (event) => {
      const layers = event.layers;
      layers.eachLayer((layer) => {
        const updatedZone = {
          id: layer.zoneId,
          name: layer.zoneName,
          type: layer instanceof L.Polygon ? 'polygon' : layer instanceof L.Rectangle ? 'rectangle' : 'circle',
          layer: layer,
          coordinates: layer.getLatLngs ? layer.getLatLngs()[0] : layer.getLatLng(),
          area: layer.getLatLngs ? L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) : 0
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

  const toggleDrawing = () => {
    setIsDrawing(!isDrawing);
    if (drawControlRef.current) {
      if (isDrawing) {
        drawControlRef.current.remove();
      } else {
        // Re-adicionar controle se necessário
        const map = mapRef.current;
        if (map) {
          map.addControl(drawControlRef.current);
        }
      }
    }
  };

  const clearAllZones = () => {
    if (drawControlRef.current && mapRef.current) {
      const map = mapRef.current;
      map.eachLayer((layer) => {
        if (layer instanceof L.FeatureGroup) {
          layer.clearLayers();
        }
      });
      setDrawnZones([]);
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
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Draw Zones
        </h3>
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={toggleDrawing}
            className={`px-2 py-1 rounded text-xs font-medium transition duration-150 ${
              isDrawing 
                ? 'bg-red-600 text-white hover:bg-red-700 border border-red-500' 
                : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500'
            }`}
          >
            {isDrawing ? 'Stop' : 'Start'}
          </button>
          <button
            onClick={clearAllZones}
            className="px-2 py-1 bg-zinc-700 text-zinc-200 rounded text-xs font-medium hover:bg-zinc-600 transition duration-150 border border-zinc-600"
          >
            Clear
          </button>
          <button
            onClick={exportZones}
            className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-medium hover:bg-emerald-700 transition duration-150 border border-emerald-500"
          >
            Export
          </button>
          <button
            onClick={importZones}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition duration-150 border border-blue-500"
          >
            Import
          </button>
          <button
            onClick={saveZonesToLocalStorage}
            className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 transition duration-150 border border-purple-500"
          >
            Save
          </button>
          <button
            onClick={loadZonesFromLocalStorage}
            className="px-2 py-1 bg-orange-600 text-white rounded text-xs font-medium hover:bg-orange-700 transition duration-150 border border-orange-500"
          >
            Load
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-zinc-400">
          <p>• Click "Start" to enable drawing tools on map</p>
          <p>• Export/Import: save/load zones as files</p>
          <p>• Save/Load: store zones in browser</p>
        </div>

        {drawnZones.length > 0 && (
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-zinc-200 mb-2">
              Drawn Zones ({drawnZones.length})
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {drawnZones.map((zone, index) => (
                <div key={zone.id} className="flex items-center justify-between bg-zinc-700 border border-zinc-600 rounded p-2">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-zinc-200">{zone.name}</div>
                    <div className="text-xs text-zinc-400">
                      {zone.type} • {zone.area.toFixed(2)} m²
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => window.editZone(zone.id)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => window.deleteZone(zone.id)}
                      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawZones;