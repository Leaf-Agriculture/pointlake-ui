# ✅ Status do Projeto - Leaf Dashboard

## 🚀 Servidores Rodando

| Serviço | Status | Porta | URL |
|---------|--------|-------|-----|
| Backend | ✅ Rodando | 5001 | http://localhost:5001 |
| Frontend | ✅ Rodando | 3000 | http://localhost:3000 |

## 📍 Acesso Rápido

Abra seu navegador em:
```
http://localhost:3000
```

## 🎯 Como Funciona

### 1. **Arquitetura**

```
┌─────────────────────────────────────────────────────────┐
│                    Navegador (User)                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ HTTP Request
                      ↓
         ┌────────────────────────────┐
         │   Frontend React (3000)    │
         │  - Página de Login         │
         │  - Dashboard               │
         │  - Mapa Interativo         │
         └────────────┬───────────────┘
                      │
                      │ /api/* requests
                      ↓
         ┌────────────────────────────┐
         │   Backend Express (5001)   │
         │  - Proxy Authentication    │
         │  - Proxy SQL Queries       │
         │  - CORS Enabled            │
         └────────────┬───────────────┘
                      │
                      │ HTTPS
                      ↓
         ┌────────────────────────────┐
         │   Leaf API                 │
         │  https://api.withleaf.io   │
         └────────────────────────────┘
```

### 2. **Fluxo de Autenticação**

```
1. User acessa /login
   ↓
2. Preenche username e password
   ↓
3. Frontend → POST /api/authenticate
   ↓
4. Backend → POST https://api.withleaf.io/api/authenticate
   ↓
5. Leaf API retorna JWT token
   ↓
6. Token salvo no localStorage
   ↓
7. Redirect para /dashboard
```

### 3. **Fluxo de Query SQL**

```
1. User digita query SQL no dashboard
   ↓
2. Clica em "Executar Query"
   ↓
3. Frontend → POST /api/v2/sql
   Headers: Authorization: Bearer <JWT>
   Body: { "sql": "SELECT ..." }
   ↓
4. Backend → POST https://api.withleaf.io/api/v2/sql
   Headers: Authorization: Bearer <JWT>
   Body: { "sql": "SELECT ..." }
   ↓
5. Leaf API retorna dados
   ↓
6. Dados exibidos:
   - JSON formatado (painel esquerdo)
   - Marcadores no mapa (painel direito)
```

### 4. **Mapa Interativo**

O mapa (Leaflet) mostra marcadores quando:
- Dados têm `latitude` e `longitude`
- OU dados têm `lat` e `lng`
- Auto-zoom para mostrar todos os marcadores
- Popup com informações do item

## 🧪 Testar Agora

### Health Check
```bash
curl http://localhost:5001/api/health
```
Resposta esperada: `{"status":"OK"}`

### Acessar Frontend
Abra: http://localhost:3000

Você verá:
1. Página de login (se não estiver autenticado)
2. Dashboard com mapa e painel SQL (após login)

## 📝 Endpoints Disponíveis

### Backend (Porta 5001)

#### POST /api/authenticate
**Descrição**: Autenticar com API Leaf

**Request**:
```bash
curl -X POST http://localhost:5001/api/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username":"seu_usuario","password":"sua_senha","rememberMe":"true"}'
```

**Response**:
```json
{
  "id_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST /api/v2/sql
**Descrição**: Executar query SQL

**Request**:
```bash
curl -X POST http://localhost:5001/api/v2/sql \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM fields LIMIT 10"}'
```

**Response**: Depende da query

#### GET /api/health
**Descrição**: Status do servidor

**Request**:
```bash
curl http://localhost:5001/api/health
```

**Response**:
```json
{"status":"OK"}
```

### Frontend (Porta 3000)

#### GET /
**Descrição**: Aplicação React
Redireciona para /login se não autenticado

#### GET /login
**Descrição**: Página de login

#### GET /dashboard
**Descrição**: Dashboard principal (requer autenticação)

## 🔐 Credenciais Necessárias

Para usar o dashboard, você precisa:

1. **Registrar-se na Leaf API**
   - Acesse: https://api.withleaf.io
   - Crie uma conta
   - Confirme seu email

2. **Fazer Login no Dashboard**
   - Use suas credenciais da Leaf
   - Token será salvo automaticamente

## 📊 Interface do Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Leaf Dashboard                    [Sair]               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────┬─────────────────────────┐ │
│  │ Query SQL              │ Mapa                    │ │
│  ├─────────────────────────┼─────────────────────────┤ │
│  │                        │                         │ │
│  │ [A área de texto]      │                         │ │
│  │ {"sql": "SELECT..."}   │     [MAPA]              │ │
│  │                        │     (Leaflet)           │ │
│  │                        │                         │ │
│  │ [Executar Query]       │                         │ │
│  │                        │                         │ │
│  │ Resultados:            │                         │ │
│  │ { dados formatados }   │                         │ │
│  └─────────────────────────┴─────────────────────────┘ │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🎨 Tecnologias Utilizadas

- **Frontend**: React + Vite + Tailwind CSS + Leaflet
- **Backend**: Node.js + Express + Axios
- **Autenticação**: JWT
- **Mapas**: OpenStreetMap

## ✅ Checklist

- ✅ Servidores rodando
- ✅ Backend na porta 5001
- ✅ Frontend na porta 3000
- ✅ CORS configurado
- ✅ Health check funcionando
- ✅ Pronto para uso!

## 🚀 Próximos Passos

1. Abra http://localhost:3000 no navegador
2. Registre-se na Leaf API se ainda não tiver
3. Faça login no dashboard
4. Experimente queries SQL
5. Explore os dados no mapa

## 📚 Documentação

- `README.md` - Visão geral e instruções
- `INSTALL.md` - Guia de instalação
- `DEMO.md` - Demonstração detalhada
- `SQL_EXAMPLES.md` - Exemplos de queries
- `PROJECT_OVERVIEW.md` - Arquitetura do projeto

