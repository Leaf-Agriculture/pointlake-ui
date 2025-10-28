# Leaf Dashboard

Dashboard com mapas para visualização de dados da API Leaf.

## Características

- ✅ Autenticação com API Leaf
- ✅ Login com JWT (validade de 30 dias)
- ✅ Dashboard com mapa interativo
- ✅ Query SQL para buscar dados da API
- ✅ Upload de arquivos ZIP para processamento
- ✅ Interface moderna com Tailwind CSS e abas

## Tecnologias

### Backend
- Node.js
- Express
- Axios
- CORS

### Frontend
- React
- Vite
- React Router
- Leaflet (mapas)
- Tailwind CSS
- Axios

## Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd leaf-dashboard
```

2. Instale as dependências do projeto raiz:
```bash
npm install
```

3. Instale as dependências do backend:
```bash
cd server
npm install
cd ..
```

4. Instale as dependências do frontend:
```bash
cd client
npm install
cd ..
```

## Executar o Projeto

### Opção 1: Executar tudo junto
```bash
npm run dev
```

### Opção 2: Executar separadamente

Terminal 1 (Backend):
```bash
cd server
npm start
```

Terminal 2 (Frontend):
```bash
cd client
npm run dev
```

## Como Usar

1. Acesse `http://localhost:3000`
2. Faça login com suas credenciais da API Leaf
3. No dashboard, você pode:
   - Executar queries SQL ou fazer upload de arquivos ZIP (painel esquerdo com abas)
   - Visualizar resultados no mapa no painel direito

## Endpoints da API

### Backend (/api)

- `POST /api/authenticate` - Autenticação com Leaf
- `POST /api/v2/sql` - Execução de queries SQL
- `POST /api/upload` - Upload de arquivos ZIP
- `GET /api/health` - Health check

## Configuração

O arquivo `.env` do servidor está configurado para usar a porta 5000 por padrão.

## Autenticação

O JWT é armazenado no localStorage do navegador e enviado automaticamente em todas as requisições para a API Leaf.

## Documentação Leaf

Para mais informações sobre a API Leaf, consulte:
https://learn.withleaf.io/docs/authentication

## Documentação Adicional

- `SQL_EXAMPLES.md` - Exemplos de queries SQL
- `UPLOAD_GUIDE.md` - Guia de upload de arquivos ZIP

## Estrutura do Projeto

```
leaf-dashboard/
├── server/                 # Backend Node.js
│   ├── server.js          # Servidor Express
│   └── package.json       # Dependências do backend
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas (Login, Dashboard)
│   │   ├── context/       # Context API (Auth)
│   │   ├── App.jsx        # Componente principal
│   │   └── main.jsx       # Entry point
│   ├── public/            # Arquivos públicos
│   └── package.json       # Dependências do frontend
└── package.json           # Scripts principais
```

## Desenvolvimento

- Backend: http://localhost:5001
- Frontend: http://localhost:3000
- O CORS está configurado para permitir requisições do frontend para o backend

