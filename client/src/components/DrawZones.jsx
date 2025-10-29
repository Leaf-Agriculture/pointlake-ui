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

    // Cleanup function para remover controles quando o componente desmontar
    return () => {
      if (drawControlRef.current && mapRef?.current) {
        try {
          mapRef.current.removeControl(drawControlRef.current);
          console.log('Draw control removed on cleanup');
        } catch (e) {
          console.warn('Error removing draw control on cleanup:', e);
        }
      }
      // Remover qualquer botão de rectangle que possa ter ficado
      const rectangleButtons = document.querySelectorAll('.leaflet-draw-draw-rectangle');
      rectangleButtons.forEach(btn => btn.remove());
    };
  }, [mapRef, mapRef?.current]);

  const initializeDrawControls = () => {
    // Sempre remover controle existente antes de criar um novo
    if (drawControlRef.current && mapRef?.current) {
      try {
        mapRef.current.removeControl(drawControlRef.current);
        console.log('Removed existing draw control');
        isInitialized.current = false; // Reset flag para permitir reinicialização
      } catch (e) {
        console.warn('Could not remove existing draw control:', e);
      }
    }

    // Remover qualquer botão de rectangle que possa ter ficado do controle anterior
    const rectangleButtons = document.querySelectorAll('.leaflet-draw-draw-rectangle');
    rectangleButtons.forEach(btn => {
      console.log('Removing leftover rectangle button');
      btn.remove();
    });

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
    // NÃO incluir rectangle na configuração - apenas polygon e circle
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: true, // Permitir polígonos mais complexos
          showArea: true,
          drawError: {
            color: '#e1e100',
            message: '<strong>Error:</strong> shape edges cannot cross!'
          },
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.3,
            weight: 3
          },
          showLength: true,
          metric: true,
          feet: false,
          minPoints: 3 // Mínimo de pontos, mas permitir quantos quiser acima disso
        },
        circle: {
          shapeOptions: {
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.3,
            weight: 3
          },
          showRadius: true,
          metric: true
        },
        marker: false,
        polyline: false,
        circlemarker: false
        // rectangle não está na lista - não será criado
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

    // Remover qualquer botão de rectangle que possa ter sido criado
    setTimeout(() => {
      const rectangleButtons = document.querySelectorAll('.leaflet-draw-draw-rectangle');
      rectangleButtons.forEach(btn => {
        console.log('Removing rectangle button:', btn);
        btn.remove();
      });
      
      // Também remover usando outros seletores possíveis
      const allDrawButtons = document.querySelectorAll('.leaflet-draw-toolbar a');
      allDrawButtons.forEach(btn => {
        const title = btn.getAttribute('title') || '';
        if (title.toLowerCase().includes('rectangle') || 
            title.toLowerCase().includes('retângulo') ||
            title.toLowerCase().includes('square') ||
            title.toLowerCase().includes('quadrado')) {
          console.log('Removing rectangle/square button by title:', title);
          btn.remove();
        }
      });
    }, 100);

    // Event listeners para desenho
    map.on(L.Draw.Event.CREATED, (event) => {
      const { layerType, layer: originalLayer } = event;
      
      // Ignorar rectangles completamente - não devem ser criados
      if (layerType === 'rectangle') {
        console.warn('Rectangle creation blocked - rectangle drawing is disabled');
        map.removeLayer(originalLayer);
        return;
      }
      
      const zoneId = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('🎨 Zona criada:', { layerType, zoneId });
      
      let layer = originalLayer;
      
      // Adicionar ID único à camada
      layer.zoneId = zoneId;
      layer.zoneName = `Zone ${drawnZones.length + 1}`;
      
      // Calcular área
      let area = 0;
      let coordinates = null;
      
      if (layerType === 'polygon') {
        const latlngs = layer.getLatLngs();
        console.log('📐 Polygon getLatLngs():', latlngs);
        
        if (latlngs && latlngs[0] && Array.isArray(latlngs[0])) {
          coordinates = latlngs[0];
          
          // Calcular área usando fórmula de área de polígono esférico
          const coords = [...coordinates, coordinates[0]]; // Fechar o polígono
          area = 0;
          for (let i = 0; i < coords.length - 1; i++) {
            const p1 = coords[i];
            const p2 = coords[i + 1];
            area += (p2.lng * Math.PI / 180 - p1.lng * Math.PI / 180) * 
                    (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
          }
          area = Math.abs(area) * 6378137 * 6378137 / 2; // Raio da Terra em metros
          console.log('📊 Área do polígono calculada:', area.toFixed(0), 'm²');
        }
        
      } else if (layerType === 'circle') {
        const radius = layer.getRadius();
        area = Math.PI * radius * radius;
        coordinates = layer.getLatLng();
        console.log('⭕ Círculo - raio:', radius, 'área:', area.toFixed(0), 'm²');
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
      console.log('✅ Layer adicionada ao FeatureGroup');
      
      // Atualizar estado
      const newZone = {
        id: zoneId,
        name: layer.zoneName,
        type: layerType,
        layer: layer,
        coordinates: coordinates || (layer.getLatLngs ? layer.getLatLngs()[0] : layer.getLatLng()),
        area: area
      };
      
      console.log('📦 NewZone object:', newZone);
      
      setDrawnZones(prev => {
        const updated = [...prev, newZone];
        console.log('📋 Total de zonas:', updated.length);
        return updated;
      });
      onZoneCreated && onZoneCreated(newZone);
      console.log('✅ Zone created and added to list:', newZone);
    });

    // Event listener para edição
    map.on(L.Draw.Event.EDITED, (event) => {
      const layers = event.layers;
      layers.eachLayer((layer) => {
        // Recalcular área
        let area = 0;
        const layerType = layer instanceof L.Polygon ? 'polygon' : 'circle';
        
        if (layerType === 'polygon') {
          const latlngs = layer.getLatLngs();
          if (latlngs && latlngs[0] && Array.isArray(latlngs[0])) {
            const coordinates = latlngs[0];
            const coords = [...coordinates, coordinates[0]];
            area = 0;
            for (let i = 0; i < coords.length - 1; i++) {
              const p1 = coords[i];
              const p2 = coords[i + 1];
              area += (p2.lng * Math.PI / 180 - p1.lng * Math.PI / 180) * 
                      (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
            }
            area = Math.abs(area) * 6378137 * 6378137 / 2;
          }
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
      if (zone && zone.layer && drawnItemsRef.current) {
        const editControl = new L.EditToolbar.Edit(map, {
          featureGroup: drawnItemsRef.current
        });
        editControl.enable();
        zone.layer.editing.enable();
      }
    };

    window.deleteZone = (zoneId) => {
      console.log('🗑️ Deletando zona:', zoneId);
      if (!drawnItemsRef.current) {
        console.error('drawnItemsRef não está definido');
        return;
      }
      
      // Encontrar e remover a camada do mapa
      let layerToRemove = null;
      drawnItemsRef.current.eachLayer((layer) => {
        if (layer.zoneId === zoneId) {
          layerToRemove = layer;
        }
      });
      
      if (layerToRemove) {
        drawnItemsRef.current.removeLayer(layerToRemove);
        setDrawnZones(prev => {
          const newZones = prev.filter(z => z.id !== zoneId);
          console.log('Zonas restantes:', newZones.length);
          return newZones;
        });
        onZoneDeleted && onZoneDeleted(zoneId);
        console.log('✅ Zona deletada com sucesso');
      } else {
        console.error('Zona não encontrada:', zoneId);
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
            console.error('Error importing zones:', error);
            alert('Error importing zone file');
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
        alert('Zones loaded from browser!');
      } catch (error) {
        console.error('Error loading zones:', error);
        alert('Error loading saved zones');
      }
    } else {
      alert('No saved zones found');
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