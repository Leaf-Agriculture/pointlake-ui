# Sintaxe de Queries Espaciais - Wherobots/Sedona

## 📍 Funções Espaciais Implementadas

### 1. **ST_MakePoint** (Criar Ponto)
Cria um ponto a partir de coordenadas longitude e latitude.

**Sintaxe:**
```sql
ST_MakePoint(longitude, latitude)
```

**Exemplo:**
```sql
ST_MakePoint(-97.51397788524629, 37.98618947016771)
```

### 2. **ST_Distance** (Distância)
Calcula a distância entre dois pontos em graus (não metros).

**Sintaxe:**
```sql
ST_Distance(point1, point2)
```

**Exemplo - Círculo (Raio 100m):**
```sql
SELECT * FROM pointlake_file_77eabe37-833a-4083-a88d-7017b72c8688 
WHERE ST_Distance(
  ST_MakePoint(longitude, latitude), 
  ST_MakePoint(-97.514, 37.986)
) <= 100 
LIMIT 5
```

**⚠️ IMPORTANTE**: `ST_Distance` retorna distância em **graus**, não metros!

### 3. **ST_Intersects** (Interseção)
Verifica se um ponto está dentro de uma geometria (polígono/retângulo).

**Sintaxe:**
```sql
ST_Intersects(point, geometry)
```

**Exemplo - Polígono:**
```sql
SELECT * FROM pointlake_file_77eabe37-833a-4083-a88d-7017b72c8688 
WHERE ST_Intersects(
  ST_MakePoint(longitude, latitude), 
  ST_GeomFromText('POLYGON((-97.5 37.9, -97.4 37.9, -97.4 38.0, -97.5 38.0, -97.5 37.9))')
) 
LIMIT 10
```

### 4. **ST_GeomFromText** (WKT para Geometria)
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

