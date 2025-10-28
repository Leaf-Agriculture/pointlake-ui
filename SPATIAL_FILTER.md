# Filtro Espacial Automático com DrawZones

## 📍 Funcionalidade

Quando você desenha uma zona (polígono, retângulo ou círculo) no mapa, a aplicação **automaticamente atualiza a query SQL** no painel direito para incluir um filtro espacial.

## 🎯 Como Funciona

### 1. **Desenhar uma Zona**
- Clique em "Start" no painel DrawZones
- Desenhe um polígono, retângulo ou círculo no mapa
- A zona é criada

### 2. **Query é Atualizada Automaticamente**
A aplicação adiciona automaticamente um filtro espacial à sua query SQL atual.

#### **Exemplo - Query Original:**
```sql
SELECT * FROM pointlake_file_7befb06a-2726-49c7-9b4a-ce4df7014dd8 WHERE equipmentWidth>1070 LIMIT 1000
```

#### **Após Desenhar Polígono:**
```sql
SELECT * FROM pointlake_file_7befb06a-2726-49c7-9b4a-ce4df7014dd8 
WHERE equipmentWidth>1070 
AND ST_Intersects(ST_Point(longitude, latitude), ST_GeomFromText('POLYGON((lng1 lat1, lng2 lat2, ...))')) 
LIMIT 1000
```

#### **Após Desenhar Círculo:**
```sql
SELECT * FROM pointlake_file_7befb06a-2726-49c7-9b4a-ce4df7014dd8 
WHERE equipmentWidth>1070 
AND ST_DWithin(ST_Point(longitude, latitude), ST_GeomFromText('POINT(lng lat)'), radius_meters) 
LIMIT 1000
```

## 🔧 Funções Espaciais Utilizadas

### **ST_Intersects**
Verifica se um ponto intersecta (está dentro) de um polígono ou retângulo.

**Sintaxe:**
```sql
ST_Intersects(ST_Point(longitude, latitude), ST_GeomFromText('POLYGON((x1 y1, x2 y2, ...))'))
```

### **ST_DWithin**
Verifica se um ponto está dentro de uma distância específica de outro ponto (usado para círculos).

**Sintaxe:**
```sql
ST_DWithin(ST_Point(longitude, latitude), ST_GeomFromText('POINT(x y)'), radius_in_meters)
```

### **ST_GeomFromText**
Converte uma representação WKT (Well-Known Text) em geometria.

**Formatos WKT:**
- **POINT**: `POINT(longitude latitude)`
- **POLYGON**: `POLYGON((lng1 lat1, lng2 lat2, lng3 lat3, lng1 lat1))`

## 📊 Indicador Visual

Quando um filtro espacial está ativo, você verá:
- 🔵 **Badge "Spatial Filter Active"** acima do textarea SQL
- 📍 **Ícone de mapa** ao lado do badge

## ⚙️ Implementação Técnica

### **Conversão Leaflet → WKT**
```javascript
const geometryToWKT = (zone) => {
  if (zone.type === 'polygon' || zone.type === 'rectangle') {
    const coords = layer.getLatLngs()[0];
    const wktCoords = coords.map(c => `${c.lng} ${c.lat}`).join(', ');
    return `POLYGON((${wktCoords}, ${coords[0].lng} ${coords[0].lat}))`;
  } else if (zone.type === 'circle') {
    const center = layer.getLatLng();
    return `POINT(${center.lng} ${center.lat})`;
  }
};
```

### **Atualização da Query**
```javascript
const updateQueryWithSpatialFilter = (zone) => {
  // 1. Converter geometria para WKT
  // 2. Identificar WHERE existente
  // 3. Adicionar AND + filtro espacial
  // 4. Preservar LIMIT
};
```

## 🎨 Tipos de Zona

| Tipo | Cor | Função SQL | Uso |
|------|-----|------------|-----|
| **Polígono** | 🔵 Azul | ST_Intersects | Áreas irregulares |
| **Retângulo** | 🟢 Verde | ST_Intersects | Áreas retangulares |
| **Círculo** | 🟠 Laranja | ST_DWithin | Áreas circulares/raio |

## 📝 Notas Importantes

1. **Compatibilidade**: Funciona com Wherobots/Havasu/Apache Sedona
2. **Coordenadas**: Usa longitude/latitude (WGS84)
3. **Preservação**: LIMIT e WHERE existentes são preservados
4. **Múltiplas Zonas**: Cada nova zona adiciona um novo filtro com AND
5. **Edição Manual**: Você pode editar a query manualmente a qualquer momento

## 🚀 Exemplo Completo

### **Cenário:**
1. Você tem uma query: `SELECT * FROM pointlake_file_123 WHERE speed > 50 LIMIT 500`
2. Você desenha um retângulo no mapa
3. Query atualizada automaticamente:

```sql
SELECT * FROM pointlake_file_123 
WHERE speed > 50 
AND ST_Intersects(
  ST_Point(longitude, latitude), 
  ST_GeomFromText('POLYGON((-97.5 37.9, -97.4 37.9, -97.4 38.0, -97.5 38.0, -97.5 37.9))')
) 
LIMIT 500
```

4. Clique em "Execute Query" para filtrar apenas pontos dentro do retângulo

## 🎯 Benefícios

- ✅ **Filtro visual** - Desenhe áreas de interesse
- ✅ **Query automática** - SQL atualizado sem escrever código
- ✅ **Performance** - Reduz resultados para área específica
- ✅ **Intuitivo** - Interface visual em vez de WKT manual
- ✅ **Flexível** - Múltiplas zonas suportadas

## 🔗 Referências

- Apache Sedona: Biblioteca de processamento espacial
- WKT (Well-Known Text): Formato padrão de geometrias
- ST_Intersects: Função espacial padrão OGC
- ST_DWithin: Função de distância espacial

