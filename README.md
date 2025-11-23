# Leaf Dashboard

Dashboard com mapas para visualização de dados da API Leaf.

## Características

- ✅ Autenticação com API Leaf
- ✅ Login com JWT (validade de 30 dias)
- ✅ Dashboard com mapa interativo
- ✅ Query SQL para buscar dados da API
- ✅ Upload de arquivos ZIP para processamento
- ✅ **Points Analytics** - Visualização de pontos de operações agrícolas por usuário
- ✅ Interface moderna com Tailwind CSS e abas

## Tecnologias

### Frontend
- React
- Vite
- React Router
- Leaflet (mapas)
- Tailwind CSS
- Axios

O frontend faz chamadas **diretas** à API Leaf, sem backend intermediário.

## Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd pointlake-ui
```

2. Instale as dependências do frontend:
```bash
cd client
npm install
```

## Executar o Projeto

```bash
cd client
npm run dev
```

O frontend estará disponível em `http://localhost:3000`

## Como Usar

1. Acesse `http://localhost:3000`
2. Faça login com suas credenciais da API Leaf
3. No dashboard, você pode:
   - Executar queries SQL ou fazer upload de arquivos ZIP (painel esquerdo com abas)
   - Visualizar resultados no mapa no painel direito
   - Acessar o **Points Analytics** clicando no botão no header
4. No Points Analytics:
   - Selecione um usuário e configure os filtros (sample rate, datas)
   - Clique em "Buscar Pontos" para visualizar no mapa
   - Veja estatísticas em tempo real dos pontos carregados

## Endpoints da API Leaf

O frontend faz chamadas diretas à API Leaf:

- `POST /api/authenticate` - Autenticação com Leaf
- `POST /api/v2/sql` - Execução de queries SQL
- `POST /services/operations/api/batch` - Upload de arquivos ZIP
- `GET /services/operations/api/batch` - Listar batches
- `GET /services/pointlake/api/v2/files` - Listar arquivos
- `GET /services/pointlake/api/v2/query` - Executar queries SQL
- `GET /services/pointlake/api/v2/beta/analytics/user/{userId}/points` - Buscar pontos de um usuário

## Autenticação

O JWT é armazenado no localStorage do navegador e enviado automaticamente em todas as requisições para a API Leaf.

## Documentação Leaf

Para mais informações sobre a API Leaf, consulte:
https://learn.withleaf.io/docs/authentication

## Documentação Adicional

- `SQL_EXAMPLES.md` - Exemplos de queries SQL
- `UPLOAD_GUIDE.md` - Guia de upload de arquivos ZIP
- `POINTS_ANALYTICS.md` - **Documentação completa do Points Analytics** 📍

## Estrutura do Projeto

```
pointlake-ui/
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas (Login, Dashboard)
│   │   ├── context/       # Context API (Auth)
│   │   ├── config/        # Configuração da API
│   │   ├── App.jsx        # Componente principal
│   │   └── main.jsx       # Entry point
│   ├── public/            # Arquivos públicos
│   └── package.json       # Dependências do frontend
└── .github/
    └── workflows/         # GitHub Actions para deploy
```

## Desenvolvimento

- Frontend: http://localhost:3000
- O frontend faz chamadas diretas à API Leaf (https://api.withleaf.io)

