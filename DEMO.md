# 🚀 Demonstração do Leaf Dashboard

## ✅ Servidores Iniciados!

Os servidores estão rodando:

- **Backend**: http://localhost:5001
- **Frontend**: http://localhost:3000

## 📖 Como Usar o Dashboard

### 1️⃣ Acesse a Aplicação

Abra seu navegador em:
```
http://localhost:3000
```

### 2️⃣ Página de Login

Você verá uma página de login com:

```
┌─────────────────────────────────┐
│    Leaf Dashboard              │
│  Autenticação com API Leaf     │
├─────────────────────────────────┤
│  Usuário: [____________]        │
│  Senha:   [____________]        │
│  ☑️ Manter conectado            │
│                                 │
│  [     Entrar     ]             │
└─────────────────────────────────┘
```

**Nota**: Você precisa de credenciais válidas da API Leaf.

Para obter credenciais:
1. Registre-se em: https://api.withleaf.io
2. Confirme seu email
3. Use suas credenciais para fazer login

### 3️⃣ Dashboard

Após o login, você verá o dashboard com dois painéis:

```
┌──────────────────────┬──────────────────┐
│  Query SQL           │  Mapa            │
├──────────────────────┼──────────────────┤
│  [A área de texto    │                  │
│   com a query SQL    │     [MAPA]       │
│   pré-preenchida]    │                  │
│                      │                  │
│  [Executar Query]    │                  │
│                      │                  │
│  Resultados:         │                  │
│  {dados formatados}  │                  │
└──────────────────────┴──────────────────┘
```

### 4️⃣ Executar uma Query SQL

A query padrão é:
```json
{"sql": "SELECT * FROM fields LIMIT 10"}
```

**Exemplos de Queries:**

#### Buscar campos (fields)
```json
{"sql": "SELECT * FROM fields LIMIT 10"}
```

#### Buscar dados de máquinas
```json
{"sql": "SELECT machine_id, machine_name FROM machines WHERE status = 'active'"}
```

#### Buscar operações de campo
```json
{"sql": "SELECT * FROM field_operations ORDER BY created_at DESC LIMIT 20"}
```

#### Consultas com filtros
```json
{"sql": "SELECT * FROM harvest_data WHERE crop = 'soybean' AND year = 2023"}
```

### 5️⃣ Visualizar no Mapa

O mapa mostrará marcadores baseados nos dados retornados:

- **Latitude/Longitude**: Se os dados tiverem campos `latitude` e `longitude`
- **Lat/Lng**: Se os dados tiverem campos `lat` e `lng`
- **Auto-zoom**: O mapa ajusta automaticamente para mostrar todos os marcadores

**Exemplo de dados com coordenadas:**
```json
[
  {
    "id": "123",
    "name": "Campo Sul",
    "latitude": -23.5505,
    "longitude": -46.6333
  }
]
```

### 6️⃣ Funcionalidades

#### ✅ Autenticação
- Login com credenciais Leaf
- Token JWT armazenado no localStorage
- Validade de 30 dias (ou 24h sem "rememberMe")
- Logout a qualquer momento

#### ✅ Queries SQL
- Textarea para digitar queries
- Aceita JSON ou SQL simples
- Botão para executar
- Exibição de resultados formatados
- Tratamento de erros

#### ✅ Mapa Interativo
- OpenStreetMap como base
- Marcadores dinâmicos
- Popup com informações do item
- Zoom automático

## 🎯 Fluxo Completo

```
1. Acessar http://localhost:3000
   ↓
2. Login com credenciais Leaf
   ↓
3. Token JWT salvo automaticamente
   ↓
4. Dashboard carregado
   ↓
5. Digitar/editar query SQL
   ↓
6. Clicar em "Executar Query"
   ↓
7. Resultados exibidos em JSON
   ↓
8. Marcadores aparecem no mapa (se houver coordenadas)
```

## 🔧 Endpoints do Backend

### POST /api/authenticate
Autenticação com API Leaf

**Request:**
```json
{
  "username": "seu_usuario",
  "password": "sua_senha",
  "rememberMe": "true"
}
```

**Response:**
```json
{
  "id_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### POST /api/v2/sql
Executar query SQL na API Leaf

**Request:**
```json
{
  "sql": "SELECT * FROM fields LIMIT 10"
}
```

**Response:**
Depende da query executada e dos dados disponíveis

### GET /api/health
Health check do servidor

## 🎨 Interface

- **Design Moderno**: Tailwind CSS com gradientes
- **Responsivo**: Funciona em desktop e mobile
- **Feedback Visual**: Loading states e mensagens de erro
- **Cores**: Verde (Leaf branding) e azul (tecnologia)

## 🐛 Troubleshooting

### Porta já em uso?
- Backend: Edite `server/.env` e configure `PORT=5001`
- Frontend: Edite `client/vite.config.js` e configure `port: 3001`

### Erro de autenticação?
- Verifique suas credenciais Leaf
- Certifique-se de ter confirmado seu email

### Marcadores não aparecem no mapa?
- Verifique se os dados têm campos de coordenadas
- Tente: `latitude/longitude` ou `lat/lng`

### Erro de CORS?
- O backend já tem CORS configurado
- Certifique-se de que o backend está rodando na porta 5000

## 📝 Próximos Passos

1. **Registre-se na Leaf API** se ainda não tiver conta
2. **Faça login** no dashboard
3. **Experimente queries SQL** diferentes
4. **Explore os dados** no mapa
5. **Consulte SQL_EXAMPLES.md** para mais exemplos

## 🎉 Divirta-se!

O projeto está pronto para uso. Explore a API Leaf através do dashboard interativo!

