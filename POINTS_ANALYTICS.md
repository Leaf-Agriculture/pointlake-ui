# Points Analytics - Documentação

## 📍 Visão Geral

A nova funcionalidade **Points Analytics** permite visualizar todos os pontos de operações agrícolas de um usuário específico em um mapa interativo.

## 🎯 Funcionalidades

### 1. Filtros Dinâmicos
- **User ID**: Seleção do usuário (integrado com LeafUserContext)
- **Sample Rate**: Taxa de amostragem de 1 a 100 (slider interativo)
- **Data Inicial**: Filtro de data inicial para o período de busca
- **Data Final**: Filtro de data final para o período de busca

### 2. Visualização no Mapa
- **Heatmap Avançado**: Para visualizar densidade de pontos
- **Cluster de Marcadores**: Para grandes volumes de dados (>5000 pontos)
- **CircleMarkers**: Para datasets médios (1000-5000 pontos)
- **Marcadores Tradicionais**: Para pequenos volumes (<1000 pontos)
- **Zoom Automático**: Ajusta automaticamente para mostrar todos os pontos

### 3. Estatísticas em Tempo Real
- Total de pontos carregados
- Número de pontos com coordenadas válidas
- Range de latitude e longitude
- Cálculos automáticos ao carregar dados

### 4. Interface Moderna
- Design responsivo com Tailwind CSS
- Modo dark com gradient moderno
- Feedback visual durante carregamento
- Tratamento de erros amigável

## 🔌 Endpoint

```
GET /services/pointlake/api/v2/beta/analytics/user/{userId}/points
```

### Parâmetros de Query

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `samplerate` | number | Não | Taxa de amostragem (1-100), padrão: 100 |
| `startDate` | string (ISO 8601) | Sim | Data inicial do período |
| `endDate` | string (ISO 8601) | Sim | Data final do período |

### Headers

```
Authorization: Bearer {token}
Accept: */*
```

## 🚀 Como Usar

### Acesso

1. Faça login na aplicação
2. No Dashboard, clique no botão **"Points Analytics"** no header
3. Ou navegue diretamente para `/points-analytics`

### Buscar Pontos

1. **Selecione o User ID**: 
   - Use o dropdown (se houver usuários carregados)
   - Ou digite manualmente o UUID do usuário

2. **Configure os Filtros**:
   - Ajuste o **Sample Rate** usando o slider (padrão: 100)
   - Defina a **Data Inicial** (padrão: 2020-01-01)
   - Defina a **Data Final** (padrão: 2025-12-01)

3. **Clique em "🔍 Buscar Pontos"**

4. **Visualize no Mapa**:
   - Os pontos serão renderizados automaticamente
   - O zoom será ajustado para mostrar todos os pontos
   - Use os controles do mapa para navegar

## 📊 Formatos de Dados Suportados

A aplicação suporta múltiplos formatos de resposta da API:

### Formato 1: Array Direto
```json
[
  {
    "latitude": -23.5505,
    "longitude": -46.6333,
    "timestamp": "2023-01-01T00:00:00Z",
    "operationType": "Planting"
  }
]
```

### Formato 2: Objeto com Array
```json
{
  "points": [
    { "lat": -23.5505, "lng": -46.6333 }
  ]
}
```

### Formato 3: GeoJSON
```json
{
  "data": [
    { "coordinates": [-46.6333, -23.5505] }
  ]
}
```

### Formato 4: Geometria Binária (WKB)
```json
[
  { "geometry": "base64EncodedWKB..." }
]
```

## 🎨 Componentes Utilizados

- **MapComponent**: Componente de mapa reutilizável com suporte a:
  - Leaflet
  - Heatmap (leaflet.heat)
  - Marker Clustering (leaflet.markercluster)
  - Multiple tile layers (OpenStreetMap, Satellite)

- **AuthContext**: Gerenciamento de autenticação e token
- **LeafUserContext**: Gerenciamento de usuários Leaf

## 🔧 Tecnologias

- **React 18**: Framework UI
- **React Router**: Navegação
- **Axios**: HTTP client
- **Leaflet**: Biblioteca de mapas
- **Tailwind CSS**: Estilização

## 📝 Exemplos de Uso

### Exemplo de curl

```bash
curl -X 'GET' \
  'https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/2bb3b597-3fa3-4eda-a4b4-2e2e498c32c6/points?samplerate=100&startDate=2020-01-01T00%3A00%3A00.000Z&endDate=2025-12-01T00%3A00%3A00.000Z' \
  -H 'accept: */*' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

### Exemplo com Axios

```javascript
const response = await axios.get(
  `${apiUrl}/v2/beta/analytics/user/${userId}/points`,
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
```

## 🐛 Tratamento de Erros

A aplicação trata os seguintes casos de erro:

1. **Sem User ID**: Exibe mensagem pedindo para selecionar um usuário
2. **Erro na API**: Mostra mensagem de erro da resposta
3. **Sem Pontos**: Exibe tela vazia com instruções
4. **Coordenadas Inválidas**: Filtra automaticamente pontos sem coordenadas válidas

## 🔄 Estados de Carregamento

- **Loading**: Spinner com overlay durante busca
- **Empty State**: Tela vazia com instruções quando não há dados
- **Error State**: Banner de erro no topo do mapa
- **Success State**: Mapa renderizado com pontos e estatísticas

## 🎯 Próximas Melhorias

Possíveis melhorias futuras:

1. ✅ Exportar pontos para CSV/GeoJSON
2. ✅ Filtros adicionais (por tipo de operação, cultura, etc)
3. ✅ Gráficos de timeline de pontos
4. ✅ Comparação entre múltiplos usuários
5. ✅ Clustering customizável
6. ✅ Pesquisa e navegação por pontos específicos

## 📱 Responsividade

A interface é totalmente responsiva:

- **Desktop**: Layout em 2 colunas (filtros + mapa)
- **Tablet**: Adaptação automática dos componentes
- **Mobile**: Layout em coluna única com filtros colapsáveis

## 🔐 Segurança

- Requer autenticação via token JWT
- Token armazenado no localStorage
- Logout limpa o token
- Redirecionamento automático para login se não autenticado

## 📖 Referências

- [Leaflet Documentation](https://leafletjs.com/)
- [React Router Documentation](https://reactrouter.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)


