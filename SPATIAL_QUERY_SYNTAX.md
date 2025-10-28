# Sintaxe de Queries Espaciais - Wherobots/Sedona

## 📍 Funções Espaciais Implementadas

### 1. **ST_GeomFromWKB** (Converter WKB para Geometria)
A coluna `geometry` está em formato binário (WKB - Well-Known Binary). Precisa ser convertida antes de usar em funções espaciais.

**Sintaxe:**
```sql
ST_GeomFromWKB(geometry)
```

### 2. **ST_SetSRID** (Definir Sistema de Referência)
Define o SRID (Spatial Reference System ID) da geometria. 4326 = WGS84 (GPS).

**Sintaxe:**
```sql
ST_SetSRID(geometry, 4326)
```

### 3. **ST_DWithin** (Distância Dentro de Raio)
Verifica se uma geometria está dentro de uma distância específica de outra.

**Sintaxe:**
```sql
ST_DWithin(geometry1, geometry2, distance, useSpheroid)
```

**Parâmetros:**
- `geometry1`: Geometria do ponto (convertida de WKB)
- `geometry2`: Ponto central (ST_Point)
- `distance`: Distância em **metros**
- `useSpheroid`: `true` para usar cálculo geodésico (Terra esférica)

**Exemplo - Círculo (Raio 80m):**
```sql
SELECT * FROM pointlake_file_77eabe37-833a-4083-a88d-7017b72c8688 
WHERE ST_DWithin(
  ST_SetSRID(ST_GeomFromWKB(geometry), 4326),
  ST_Point(-97.51735210418703, 37.98648965862172),
  80,
  true
) 
LIMIT 10
```

**✅ IMPORTANTE**: Com `useSpheroid = true`, a distância é em **metros**!

### 4. **ST_Intersects** (Interseção)
Verifica se uma geometria está dentro de outra geometria (polígono/retângulo).

**Sintaxe:**
```sql
ST_Intersects(geometry1, geometry2)
```

**Exemplo - Polígono:**
```sql
SELECT * FROM pointlake_file_77eabe37-833a-4083-a88d-7017b72c8688 
WHERE ST_Intersects(
  ST_SetSRID(ST_GeomFromWKB(geometry), 4326),
  ST_GeomFromText('POLYGON((-97.5 37.9, -97.4 37.9, -97.4 38.0, -97.5 38.0, -97.5 37.9))')
) 
LIMIT 10
```

### 5. **ST_GeomFromText** (WKT para Geometria)
Converte Well-Known Text para geometria.

**Sintaxe:**
```sql
ST_GeomFromText('WKT_STRING')
```

**Formatos WKT Suportados:**
```sql
-- Ponto
ST_GeomFromText('POINT(-97.5 37.9)')

-- Polígono (primeiro e último ponto devem ser iguais)
ST_GeomFromText('POLYGON((-97.5 37.9, -97.4 37.9, -97.4 38.0, -97.5 38.0, -97.5 37.9))')

-- Linha
ST_GeomFromText('LINESTRING(-97.5 37.9, -97.4 38.0)')
```

## 🔄 Conversão de Unidades para Círculos

### **Problema: ST_Distance retorna graus, não metros**

**Conversão aproximada:**
- 1 grau de latitude ≈ 111 km = 111,000 metros
- 1 grau de longitude ≈ 111 km × cos(latitude)

**Exemplo - Círculo de 100 metros:**
```sql
-- Raio em graus (aproximado)
100 metros ÷ 111000 metros/grau ≈ 0.0009 graus

-- Query correta
WHERE ST_Distance(ST_MakePoint(longitude, latitude), ST_MakePoint(-97.514, 37.986)) <= 0.0009
```

## 🎯 Queries Geradas pela Aplicação

### **Círculo (após clicar "Query by Zone"):**

**Query gerada atualmente:**
```sql
SELECT * FROM pointlake_file_77eabe37-833a-4083-a88d-7017b72c8688 
WHERE ST_Distance(ST_MakePoint(longitude, latitude), ST_MakePoint(-97.514, 37.986)) <= 74.705 
LIMIT 10
```

**⚠️ Problema**: Raio está em metros, mas ST_Distance retorna graus!

**Solução**: Converter raio para graus antes de usar na query.

### **Polígono/Retângulo:**

**Query gerada:**
```sql
SELECT * FROM pointlake_file_77eabe37-833a-4083-a88d-7017b72c8688 
WHERE ST_Intersects(
  ST_MakePoint(longitude, latitude), 
  ST_GeomFromText('POLYGON((-97.52 37.98, -97.51 37.98, -97.51 37.99, -97.52 37.99, -97.52 37.98))')
) 
LIMIT 10
```

**✅ Correto**: Polígonos funcionam diretamente com coordenadas lat/lng!

## 🛠️ Correção Necessária

Para círculos, precisamos converter o raio de metros para graus:

```javascript
// Em updateQueryWithSpatialFilter:
if (zone.type === 'circle') {
  const center = zone.layer.getLatLng();
  const radiusInMeters = zone.layer.getRadius();
  
  // Converter raio de metros para graus
  const radiusInDegrees = radiusInMeters / 111000;
  
  spatialFilter = `ST_Distance(ST_MakePoint(longitude, latitude), ST_MakePoint(${center.lng}, ${center.lat})) <= ${radiusInDegrees}`;
}
```

## 📚 Referências

- **Apache Sedona**: Sistema de processamento espacial usado pela Wherobots
- **OGC Standards**: Funções ST_* seguem padrões Open Geospatial Consortium
- **WKT**: Well-Known Text é o formato padrão para geometrias

## 🧪 Queries para Testar

### **Teste 1 - Pontos em área específica:**
```sql
SELECT * FROM pointlake_file_xxx 
WHERE ST_Intersects(
  ST_MakePoint(longitude, latitude), 
  ST_GeomFromText('POLYGON((-97.52 37.98, -97.51 37.98, -97.51 37.99, -97.52 37.99, -97.52 37.98))')
) 
LIMIT 100
```

### **Teste 2 - Pontos próximos a um centro:**
```sql
SELECT * FROM pointlake_file_xxx 
WHERE ST_Distance(
  ST_MakePoint(longitude, latitude), 
  ST_MakePoint(-97.515, 37.986)
) <= 0.001
LIMIT 100
```

### **Teste 3 - Combinando filtros:**
```sql
SELECT * FROM pointlake_file_xxx 
WHERE equipmentWidth > 1070 
AND ST_Intersects(
  ST_MakePoint(longitude, latitude), 
  ST_GeomFromText('POLYGON((-97.52 37.98, -97.51 37.98, -97.51 37.99, -97.52 37.99, -97.52 37.98))')
) 
LIMIT 1000
```

