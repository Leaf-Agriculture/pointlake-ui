# 🔄 Seletor de Ambiente DEV/PROD

## 📋 Funcionalidade

Adicionado seletor visual na página de login para alternar entre ambientes de **Desenvolvimento** (DEV) e **Produção** (PROD).

## 🎯 Como Funciona

### Página de Login

Na página de login, você verá:

```
┌─────────────────────────────────────────┐
│     Leaf Dashboard                     │
│  Autenticação com API Leaf             │
├─────────────────────────────────────────┤
│  Ambiente                               │
│  ┌─────────┬─────────┐                 │
│  │   DEV   │  PROD   │  ← Seletor      │
│  └─────────┴─────────┘                 │
│  (Desenvolvimento)                     │
│                                         │
│  Usuário: [____________]              │
│  Senha:   [____________]              │
│  ☑️ Manter conectado                   │
│  [     Entrar     ]                    │
└─────────────────────────────────────────┘
```

### Dashboard

No header do dashboard, você verá um badge indicando o ambiente:

```
┌─────────────────────────────────────────┐
│  Leaf Dashboard  [DEV] ← Badge         │
│                [PROD]                    │
│                            [Sair]       │
└─────────────────────────────────────────┘
```

- **DEV** → Badge azul
- **PROD** → Badge verde

## 🔧 Implementação

### Backend (server/server.js)

#### Função de Seleção de URL
```javascript
const getLeafApiUrl = (environment) => {
  return environment === 'dev' 
    ? 'https://api-dev.withleaf.io/api'
    : 'https://api.withleaf.io/api'
}
```

#### Endpoints Atualizados
- `POST /api/authenticate` - Aceita `environment` no body
- `POST /api/v2/sql` - Usa header `x-environment`
- `POST /api/upload` - Usa header `x-environment`
- `GET /api/batch` - Usa header `x-environment`
- `GET /api/batch/:id` - Usa header `x-environment`
- `GET /api/batch/:id/status` - Usa header `x-environment`

### Frontend

#### AuthContext
- Função `getEnvironment()` para obter ambiente atual
- Ambiente salvo no localStorage
- Header `x-environment` incluído em todas as requisições

#### Login.jsx
- Seletor visual com botões DEV/PROD
- Estado persistido no localStorage
- Ambiente enviado no login

#### Dashboard.jsx
- Badge visual mostrando ambiente ativo
- Header `x-environment` em todas as requisições

#### FileUpload.jsx
- Header `x-environment` em todas as requisições de batches

## 📍 URLs dos Ambientes

### Desenvolvimento (DEV)
- API: `https://api-dev.withleaf.io/api`
- Operations: `https://api-dev.withleaf.io/services/operations/api`

### Produção (PROD)
- API: `https://api.withleaf.io/api`
- Operations: `https://api.withleaf.io/services/operations/api`

## 🔄 Fluxo de Uso

```
1. Acesse a página de login
   ↓
2. Selecione ambiente (DEV ou PROD)
   ↓
3. Digite credenciais
   ↓
4. Clique em "Entrar"
   ↓
5. Ambiente salvo no localStorage
   ↓
6. Todas as requisições usam ambiente selecionado
   ↓
7. Badge no header mostra ambiente ativo
```

## 💾 Persistência

- Ambiente salvo em: `localStorage.getItem('leaf_environment')`
- Valor padrão: `'prod'`
- Mantido mesmo após logout
- Restaurado ao reiniciar aplicação

## 🎨 Interface

### Cores dos Badges
- **DEV**: Azul (`bg-blue-100 text-blue-800`)
- **PROD**: Verde (`bg-green-100 text-green-800`)

### Botões no Login
- Ativo: Cor sólida (azul para DEV, verde para PROD)
- Inativo: Cinza com hover

## ✅ Benefícios

1. **Testes facilitados**: Altere facilmente entre dev e prod
2. **Segurança**: Evita operações acidentais em produção
3. **Visual**: Badge sempre visível mostra ambiente atual
4. **Persistência**: Ambiente mantido entre sessões
5. **Código limpo**: Uma única fonte de verdade

## 🧪 Como Testar

1. Abra http://localhost:3000
2. Na página de login, selecione **DEV**
3. Faça login
4. Veja badge **DEV** no header
5. Faça logout
6. Selecione **PROD**
7. Faça login novamente
8. Veja badge **PROD** no header

## 📝 Documentação Técnica

### Headers Enviados

Todas as requisições incluem:
```
Authorization: Bearer <JWT_TOKEN>
x-environment: dev | prod
```

### LocalStorage

```javascript
leaf_token: "<JWT_TOKEN>"
leaf_environment: "dev" | "prod"
```

