# Guia de Instalação Rápida

## Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn

## Passos de Instalação

### 1. Instalar dependências do projeto raiz

```bash
npm install
```

### 2. Instalar dependências do backend

```bash
cd server
npm install
cd ..
```

### 3. Instalar dependências do frontend

```bash
cd client
npm install
cd ..
```

## Iniciar o Projeto

### Opção 1: Iniciar tudo junto (recomendado)

```bash
npm run dev
```

Isso iniciará:
- Backend na porta 5000
- Frontend na porta 3000

### Opção 2: Iniciar manualmente

**Terminal 1 - Backend:**
```bash
cd server
npm start
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

## Acessar a Aplicação

Abra seu navegador em: http://localhost:3000

## Primeiros Passos

1. Você precisará de uma conta na Leaf API. Registre-se em: https://api.withleaf.io
2. Faça login com suas credenciais
3. No dashboard, você pode executar queries SQL no endpoint v2/sql
4. Consulte `SQL_EXAMPLES.md` para exemplos de queries

## Troubleshooting

### Erro de porta em uso

Se a porta 5000 ou 3000 estiver em uso, você pode alterar:

**Backend:** Edite `server/.env` e configure `PORT=5001`
**Frontend:** Edite `client/vite.config.js` e configure `port: 3001`

### Erro no Leaflet

Se os marcadores não aparecerem no mapa, o Leaflet usa CDN para os ícones automaticamente.

## Comandos Disponíveis

```bash
# Desenvolvimento (inicia tudo)
npm run dev

# Apenas backend
npm run server

# Apenas frontend
npm run client

# Instalar todas as dependências
npm run install-all
```

