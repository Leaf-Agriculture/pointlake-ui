# Points Analytics - Exemplos de API

## 🔌 Endpoint

```
GET /services/pointlake/api/v2/beta/analytics/user/{userId}/points
```

---

## 📋 Parâmetros

### Path Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `userId` | UUID | ID único do usuário Leaf |

### Query Parameters

| Parâmetro | Tipo | Obrigatório | Descrição | Exemplo |
|-----------|------|-------------|-----------|---------|
| `samplerate` | number | Não | Taxa de amostragem (1-100) | `100` |
| `startDate` | string | Sim | Data inicial (ISO 8601) | `2020-01-01T00:00:00.000Z` |
| `endDate` | string | Sim | Data final (ISO 8601) | `2025-12-01T00:00:00.000Z` |

### Headers

```http
Authorization: Bearer {JWT_TOKEN}
Accept: */*
```

---

## 🧪 Exemplos de Requisições

### 1. Exemplo Básico (Dev Environment)

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/2bb3b597-3fa3-4eda-a4b4-2e2e498c32c6/points?samplerate=100&startDate=2020-01-01T00%3A00%3A00.000Z&endDate=2025-12-01T00%3A00%3A00.000Z' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

### 2. Exemplo com Sample Rate Baixo

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/2bb3b597-3fa3-4eda-a4b4-2e2e498c32c6/points?samplerate=10&startDate=2023-01-01T00%3A00%3A00.000Z&endDate=2023-12-31T23%3A59%3A59.999Z' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

### 3. Exemplo Produção

```bash
curl -X 'GET' \
  'https://api.withleaf.io/services/pointlake/api/v2/beta/analytics/user/YOUR_USER_ID/points?samplerate=100&startDate=2024-01-01T00%3A00%3A00.000Z&endDate=2024-12-31T23%3A59%3A59.999Z' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer YOUR_PROD_TOKEN'
```

### 4. Exemplo com jq (parse JSON)

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/2bb3b597-3fa3-4eda-a4b4-2e2e498c32c6/points?samplerate=50&startDate=2023-06-01T00%3A00%3A00.000Z&endDate=2023-06-30T23%3A59%3A59.999Z' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  | jq '.[0:5]'  # Mostra apenas os primeiros 5 pontos
```

---

## 📊 Exemplos de Respostas

### Formato 1: Array de Pontos com Lat/Lng

```json
[
  {
    "id": "point-1",
    "latitude": -23.550520,
    "longitude": -46.633308,
    "timestamp": "2023-06-15T10:30:00Z",
    "operationType": "Planting",
    "appliedRate": 25.5,
    "area": 0.0015,
    "equipmentWidth": 12.0
  },
  {
    "id": "point-2",
    "latitude": -23.551234,
    "longitude": -46.634567,
    "timestamp": "2023-06-15T10:31:00Z",
    "operationType": "Planting",
    "appliedRate": 26.2,
    "area": 0.0016,
    "equipmentWidth": 12.0
  }
]
```

### Formato 2: Pontos com Geometria WKB

```json
[
  {
    "id": "point-1",
    "geometry": "AQEAAADNzMzMzMzTwM3MzMzMzDfA",
    "timestamp": "2023-06-15T10:30:00Z",
    "operationType": "Harvesting",
    "appliedRate": 150.5,
    "tankMix": false
  }
]
```

### Formato 3: Resposta Vazia

```json
[]
```

### Formato 4: Objeto com Array (alternativo)

```json
{
  "points": [
    {
      "lat": -23.550520,
      "lng": -46.633308,
      "timestamp": "2023-06-15T10:30:00Z"
    }
  ],
  "metadata": {
    "total": 1,
    "sampleRate": 100
  }
}
```

---

## 🔧 Exemplos com JavaScript/Axios

### Exemplo Básico

```javascript
import axios from 'axios'

const userId = '2bb3b597-3fa3-4eda-a4b4-2e2e498c32c6'
const token = 'YOUR_JWT_TOKEN'
const environment = 'dev' // ou 'prod'

const baseUrl = environment === 'dev' 
  ? 'https://api-dev.withleaf.team'
  : 'https://api.withleaf.io'

const response = await axios.get(
  `${baseUrl}/services/pointlake/api/v2/beta/analytics/user/${userId}/points`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': '*/*'
    },
    params: {
      samplerate: 100,
      startDate: '2020-01-01T00:00:00.000Z',
      endDate: '2025-12-01T00:00:00.000Z'
    }
  }
)

console.log('Total de pontos:', response.data.length)
console.log('Primeiro ponto:', response.data[0])
```

### Exemplo com Error Handling

```javascript
async function fetchUserPoints(userId, sampleRate = 100) {
  try {
    const response = await axios.get(
      `${baseUrl}/services/pointlake/api/v2/beta/analytics/user/${userId}/points`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': '*/*'
        },
        params: {
          samplerate: sampleRate,
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: '2023-12-31T23:59:59.999Z'
        }
      }
    )
    
    // Processar dados
    const points = Array.isArray(response.data) 
      ? response.data 
      : response.data.points || []
    
    console.log(`✅ ${points.length} pontos carregados`)
    return points
    
  } catch (error) {
    console.error('❌ Erro ao buscar pontos:', error.message)
    
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
    }
    
    throw error
  }
}
```

### Exemplo com React Hook

```javascript
import { useState, useEffect } from 'react'
import axios from 'axios'

function useUserPoints(userId, sampleRate, startDate, endDate) {
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (!userId) return
    
    const fetchPoints = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await axios.get(
          `${baseUrl}/services/pointlake/api/v2/beta/analytics/user/${userId}/points`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': '*/*'
            },
            params: {
              samplerate: sampleRate,
              startDate,
              endDate
            }
          }
        )
        
        setPoints(response.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPoints()
  }, [userId, sampleRate, startDate, endDate])
  
  return { points, loading, error }
}

// Uso:
function MyComponent() {
  const { points, loading, error } = useUserPoints(
    '2bb3b597-3fa3-4eda-a4b4-2e2e498c32c6',
    100,
    '2023-01-01T00:00:00.000Z',
    '2023-12-31T23:59:59.999Z'
  )
  
  if (loading) return <div>Carregando...</div>
  if (error) return <div>Erro: {error}</div>
  
  return <div>Total: {points.length} pontos</div>
}
```

---

## 🧪 Testando com diferentes Sample Rates

### Sample Rate 10 (10% dos pontos)

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/USER_ID/points?samplerate=10&startDate=2023-01-01T00:00:00.000Z&endDate=2023-12-31T23:59:59.999Z' \
  -H 'Authorization: Bearer TOKEN' \
  | jq 'length'
```

### Sample Rate 50 (50% dos pontos)

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/USER_ID/points?samplerate=50&startDate=2023-01-01T00:00:00.000Z&endDate=2023-12-31T23:59:59.999Z' \
  -H 'Authorization: Bearer TOKEN' \
  | jq 'length'
```

### Sample Rate 100 (100% dos pontos)

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/USER_ID/points?samplerate=100&startDate=2023-01-01T00:00:00.000Z&endDate=2023-12-31T23:59:59.999Z' \
  -H 'Authorization: Bearer TOKEN' \
  | jq 'length'
```

---

## 📅 Testando com diferentes Períodos

### Último Mês

```javascript
const now = new Date()
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

const params = {
  samplerate: 100,
  startDate: lastMonth.toISOString(),
  endDate: endOfLastMonth.toISOString()
}
```

### Último Ano

```javascript
const now = new Date()
const lastYear = new Date(now.getFullYear() - 1, 0, 1)
const endOfLastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)

const params = {
  samplerate: 50,  // Sample menor para volume grande
  startDate: lastYear.toISOString(),
  endDate: endOfLastYear.toISOString()
}
```

### Período Específico (Safra)

```bash
# Exemplo: Safra de soja (outubro a março)
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/USER_ID/points?samplerate=100&startDate=2023-10-01T00:00:00.000Z&endDate=2024-03-31T23:59:59.999Z' \
  -H 'Authorization: Bearer TOKEN'
```

---

## 🔍 Analisando a Resposta

### Contar pontos por tipo de operação

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/USER_ID/points?samplerate=100&startDate=2023-01-01T00:00:00.000Z&endDate=2023-12-31T23:59:59.999Z' \
  -H 'Authorization: Bearer TOKEN' \
  | jq 'group_by(.operationType) | map({operation: .[0].operationType, count: length})'
```

### Calcular bounding box

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/USER_ID/points?samplerate=100&startDate=2023-01-01T00:00:00.000Z&endDate=2023-12-31T23:59:59.999Z' \
  -H 'Authorization: Bearer TOKEN' \
  | jq '{
      minLat: (map(.latitude) | min),
      maxLat: (map(.latitude) | max),
      minLng: (map(.longitude) | min),
      maxLng: (map(.longitude) | max)
    }'
```

### Extrair timestamps únicos

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/USER_ID/points?samplerate=100&startDate=2023-01-01T00:00:00.000Z&endDate=2023-12-31T23:59:59.999Z' \
  -H 'Authorization: Bearer TOKEN' \
  | jq '[.[] | .timestamp] | unique | sort'
```

---

## ⚠️ Tratamento de Erros

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

**Solução:** Fazer login novamente para obter novo token

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "User not found"
}
```

**Solução:** Verificar se o User ID está correto

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid date format"
}
```

**Solução:** Verificar formato das datas (deve ser ISO 8601)

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An error occurred while processing your request"
}
```

**Solução:** Tentar novamente ou contatar suporte

---

## 📊 Métricas de Performance

### Tempo de Resposta Esperado

| Sample Rate | Volume de Pontos | Tempo Esperado |
|-------------|------------------|----------------|
| 10 | ~1,000 | 1-3 segundos |
| 50 | ~5,000 | 3-7 segundos |
| 100 | ~10,000+ | 5-15 segundos |

### Tamanho da Resposta

| Volume de Pontos | Tamanho (JSON) |
|------------------|----------------|
| 1,000 | ~150 KB |
| 5,000 | ~750 KB |
| 10,000 | ~1.5 MB |
| 50,000 | ~7.5 MB |

---

## 💡 Dicas de Uso

### 1. Otimizar para Grandes Volumes

```javascript
// Para períodos longos, use sample rate menor
const longPeriod = sampleRate <= 50

// Para análises detalhadas, use períodos curtos com sample 100
const detailedAnalysis = sampleRate === 100 && periodInDays <= 30
```

### 2. Cache de Resultados

```javascript
// Implementar cache local para evitar requisições repetidas
const cacheKey = `points_${userId}_${sampleRate}_${startDate}_${endDate}`
const cached = localStorage.getItem(cacheKey)

if (cached && Date.now() - cached.timestamp < 300000) { // 5 min
  return JSON.parse(cached.data)
}
```

### 3. Paginação Manual

```javascript
// Dividir período em chunks menores
function* dateRangeChunks(start, end, chunkDays = 30) {
  let current = new Date(start)
  const endDate = new Date(end)
  
  while (current < endDate) {
    const chunkEnd = new Date(current)
    chunkEnd.setDate(chunkEnd.getDate() + chunkDays)
    
    yield {
      start: current.toISOString(),
      end: Math.min(chunkEnd, endDate).toISOString()
    }
    
    current = chunkEnd
  }
}

// Uso:
for (const chunk of dateRangeChunks('2023-01-01', '2023-12-31', 30)) {
  const points = await fetchPoints(userId, 100, chunk.start, chunk.end)
  // Processar chunk
}
```

---

## 🎓 Casos de Uso Avançados

### 1. Detecção de Áreas Trabalhadas

```javascript
// Agrupar pontos por proximidade geográfica
function clusterPoints(points, threshold = 0.001) {
  const clusters = []
  
  points.forEach(point => {
    const cluster = clusters.find(c => 
      Math.abs(c.center.lat - point.latitude) < threshold &&
      Math.abs(c.center.lng - point.longitude) < threshold
    )
    
    if (cluster) {
      cluster.points.push(point)
    } else {
      clusters.push({
        center: { lat: point.latitude, lng: point.longitude },
        points: [point]
      })
    }
  })
  
  return clusters
}
```

### 2. Análise Temporal

```javascript
// Agrupar pontos por período
function groupByTimeRange(points, rangeHours = 1) {
  const groups = {}
  
  points.forEach(point => {
    const date = new Date(point.timestamp)
    const key = Math.floor(date.getTime() / (rangeHours * 3600000))
    
    if (!groups[key]) groups[key] = []
    groups[key].push(point)
  })
  
  return Object.entries(groups).map(([key, points]) => ({
    timestamp: new Date(parseInt(key) * rangeHours * 3600000),
    count: points.length,
    points
  }))
}
```

### 3. Cálculo de Cobertura

```javascript
// Calcular área coberta (aproximado)
function calculateCoverage(points) {
  if (points.length < 3) return 0
  
  const lats = points.map(p => p.latitude)
  const lngs = points.map(p => p.longitude)
  
  const latRange = Math.max(...lats) - Math.min(...lats)
  const lngRange = Math.max(...lngs) - Math.min(...lngs)
  
  // Aproximação simples (área retangular)
  // 1 grau ≈ 111 km
  const areaKm2 = (latRange * 111) * (lngRange * 111)
  const areaHectares = areaKm2 * 100
  
  return areaHectares
}
```

---

## 📞 Suporte e Referências

### Documentação Oficial
- [Leaf API Docs](https://learn.withleaf.io)
- [Authentication](https://learn.withleaf.io/docs/authentication)
- [PointLake API](https://learn.withleaf.io/docs/pointlake)

### Ferramentas Úteis
- [jq](https://stedolan.github.io/jq/) - JSON processor
- [Postman](https://www.postman.com/) - API testing
- [HTTPie](https://httpie.io/) - HTTP client

### Status da API
- Dev: https://api-dev.withleaf.team/health
- Prod: https://api.withleaf.io/health

---

**Última atualização:** Novembro 2025  
**Versão da API:** v2/beta

