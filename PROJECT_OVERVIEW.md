# Leaf Dashboard - Visão Geral do Projeto

## 🎯 Objetivo

Dashboard com mapas interativos para visualização de dados da API Leaf com autenticação JWT e capacidade de executar queries SQL.

## 📁 Estrutura do Projeto

```
pointlake-ui/
├── server/                        # Backend Node.js/Express
│   ├── server.js                 # Servidor principal com rotas
│   ├── package.json              # Dependências do backend
│   └── .env                      # Configurações (porta)
├── client/                        # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   └── MapComponent.jsx  # Componente do mapa Leaflet
│   │   ├── pages/
│   │   │   ├── Login.jsx        # Página de autenticação
│   │   │   └── Dashboard.jsx    # Página principal com query SQL e mapa
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Gerenciamento de autenticação
│   │   ├── App.jsx              # Componente raiz com rotas
│   │   ├── main.jsx             # Entry point React
│   │   └── index.css            # Estilos globais + Tailwind
│   ├── public/                   # Arquivos públicos
│   ├── index.html               # HTML principal
│   ├── vite.config.js           # Configuração do Vite
│   ├── tailwind.config.js       # Configuração do Tailwind
│   ├── postcss.config.js        # Configuração do PostCSS
│   └── package.json             # Dependências do frontend
├── package.json                  # Scripts principais do projeto
├── .gitignore                    # Arquivos ignorados pelo git
├── README.md                     # Documentação principal
├── INSTALL.md                    # Guia de instalação
├── SQL_EXAMPLES.md              # Exemplos de queries SQL
└── PROJECT_OVERVIEW.md          # Este arquivo
```

## 🚀 Funcionalidades

### 1. Autenticação (Página de Login)
- ✅ Formulário de login com usuário e senha
- ✅ Integração com API Leaf (`/api/authenticate`)
- ✅ JWT armazenado no localStorage
- ✅ Opção "Manter conectado" (30 dias)
- ✅ Redirecionamento automático para o dashboard após login
- ✅ Design moderno com Tailwind CSS

### 2. Dashboard
- ✅ **Painel SQL**: Área para digitar e executar queries SQL
  - Aceita JSON com chave `sql`
  - Exemplo: `{"sql": "SELECT * FROM fields LIMIT 10"}`
- ✅ **Visualização de Resultados**: Exibe os dados retornados em JSON formatado
- ✅ **Mapa Interativo**: Usando Leaflet
  - OpenStreetMap como tile provider
  - Marcadores dinâmicos baseados nos dados retornados
  - Auto-zoom para mostrar todos os marcadores
  - Suporta campos `latitude/longitude` ou `lat/lng`
- ✅ **Logout**: Botão para sair e limpar o token

### 3. Backend (API Proxy)
- ✅ **POST /api/authenticate**: Proxy para autenticação Leaf
- ✅ **POST /api/v2/sql**: Proxy para queries SQL na API Leaf
- ✅ **GET /api/health**: Health check
- ✅ CORS habilitado
- ✅ Headers de autenticação passados através do proxy

## 🛠️ Tecnologias

### Backend
- **Node.js**: Runtime JavaScript
- **Express**: Framework web
- **Axios**: Cliente HTTP para chamadas à API Leaf
- **CORS**: Middleware para Cross-Origin
- **dotenv**: Gerenciamento de variáveis de ambiente

### Frontend
- **React 18**: Biblioteca UI
- **Vite**: Build tool rápido
- **React Router**: Roteamento
- **Tailwind CSS**: Framework CSS utilitário
- **Leaflet**: Biblioteca de mapas
- **Axios**: Cliente HTTP
- **Context API**: Gerenciamento de estado (auth)

## 📝 Arquivos Principais

### Backend

#### `server/server.js`
- Configuração do Express
- Rota `/api/authenticate` para login
- Rota `/api/v2/sql` para queries SQL
- Middleware CORS e JSON
- Proxy para `https://api.withleaf.io`

### Frontend

#### `client/src/pages/Login.jsx`
- Formulário de login
- Estado de loading e erro
- Validação de campos
- Integração com AuthContext

#### `client/src/pages/Dashboard.jsx`
- Dois painéis: SQL e Mapa
- State management para query e resultados
- Integração com API backend
- Formatação de JSON para exibição

#### `client/src/components/MapComponent.jsx`
- Inicialização do mapa Leaflet
- Renderização de marcadores baseada em dados
- Auto-zoom para todos os marcadores
- Suporte a diferentes formatos de coordenadas

#### `client/src/context/AuthContext.jsx`
- Context API para autenticação
- Métodos: `login()`, `logout()`
- Persistência no localStorage
- Proteção de rotas

## 🔐 Fluxo de Autenticação

1. Usuário acessa `/login`
2. Preenche usuário e senha
3. Frontend envia POST para `/api/authenticate` (backend)
4. Backend faz proxy para `https://api.withleaf.io/api/authenticate`
5. API Leaf retorna `{ id_token: "..." }`
6. Token salvo no localStorage
7. Usuário redirecionado para `/dashboard`
8. Todas as requisições SQL incluem o token no header `Authorization`

## 🗺️ Fluxo de Query SQL

1. Usuário digita query SQL no painel esquerdo
2. Clica em "Executar Query"
3. Frontend faz POST para `/api/v2/sql` com o token
4. Backend faz proxy para `https://api.withleaf.io/api/v2/sql`
5. Resultados retornados e exibidos:
   - JSON formatado no painel SQL
   - Marcadores no mapa (se houver coordenadas)

## 🎨 Design

- **Tailwind CSS**: Classes utilitárias para estilização
- **Gradientes**: Background em degradê (verde para azul)
- **Sombras**: Cards com `shadow-md` e `shadow-xl`
- **Hover effects**: Transições suaves nos botões
- **Responsivo**: Grid layout adaptável
- **Foco**: Rings de destaque nos inputs

## 📚 Documentação Adicional

- `README.md`: Documentação principal e instruções
- `INSTALL.md`: Guia de instalação passo a passo
- `SQL_EXAMPLES.md`: Exemplos de queries SQL para a API Leaf

## 🚦 Como Usar

### Instalação
```bash
npm run install-all
```

### Executar
```bash
npm run dev
```

### Acessar
- Frontend: http://localhost:3000
- Backend: http://localhost:5001

## 📌 Próximos Passos (Sugestões)

1. Adicionar mais visualizações no mapa (linhas, polígonos, etc.)
2. Histórico de queries executadas
3. Salvamento de queries favoritas
4. Exportação de resultados para CSV
5. Melhorar parsing de coordenadas dos dados da API
6. Adicionar mais exemplos de queries SQL
7. Implementar cache de token para evitar re-autenticação

