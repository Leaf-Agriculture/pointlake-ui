# Guia de Deploy do Backend

O backend deste projeto está na pasta `server/` e precisa ser hospedado separadamente do frontend.

## 📦 O que é o Backend?

O backend (`server/server.js`) é um proxy Node.js/Express que:
- Recebe requisições do frontend
- Faz autenticação com a API Leaf
- Executa queries SQL
- Faz upload de arquivos
- Gerencia batches de conversão

## 🚀 Opções de Hospedagem

### Opção 1: Railway (Recomendado - Mais Fácil)

1. **Criar conta em Railway**:
   - Acesse https://railway.app
   - Faça login com GitHub

2. **Criar novo projeto**:
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Escolha seu repositório `pointlake-ui`

3. **Configurar o serviço**:
   - Railway detectará automaticamente a pasta `server/`
   - Se não detectar, configure:
     - **Root Directory**: `/server`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

4. **Configurar variáveis de ambiente** (opcional):
   - No Railway, vá em **Variables**
   - Adicione `PORT` se necessário (Railway define automaticamente)
   - Adicione outras variáveis se tiver no `.env`

5. **Obter URL**:
   - Após o deploy, Railway gerará uma URL: `https://seu-projeto.up.railway.app`
   - Use essa URL no frontend como `VITE_API_URL`

### Opção 2: Render

1. **Criar conta em Render**:
   - Acesse https://render.com
   - Faça login com GitHub

2. **Criar novo Web Service**:
   - Clique em "New" > "Web Service"
   - Conecte seu repositório GitHub
   - Escolha `pointlake-ui`

3. **Configurar o serviço**:
   - **Name**: `pointlake-backend` (ou qualquer nome)
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: deixe vazio (Render detectará automaticamente)

4. **Configurar variáveis**:
   - Vá em **Environment**
   - Adicione `NODE_ENV=production`
   - Adicione outras variáveis se necessário

5. **Obter URL**:
   - Render gerará: `https://pointlake-backend.onrender.com`
   - Use essa URL no frontend

### Opção 3: Vercel

1. **Instalar Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   cd server
   vercel
   ```

3. **Configurar**:
   - Siga as instruções do CLI
   - Vercel detectará automaticamente Node.js

## 🔧 Configuração Necessária

### 1. Atualizar CORS

No arquivo `server/server.js`, configure o CORS para aceitar requisições do frontend:

```javascript
// Linha 41, substitua:
app.use(cors());

// Por:
const allowedOrigins = [
  'https://SEU-USUARIO.github.io',
  'https://SEU-USUARIO.github.io/pointlake-ui',
  'http://localhost:3000' // Para desenvolvimento local
];

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**⚠️ Substitua `SEU-USUARIO` pelo seu username do GitHub**

### 2. Verificar Porta

O backend já está configurado para usar a variável de ambiente `PORT`:

```javascript
const PORT = process.env.PORT || 5001;
```

A maioria dos serviços de hospedagem define `PORT` automaticamente.

### 3. Criar arquivo para deploy (opcional)

Para alguns serviços, você pode criar um `Procfile` ou similar:

**Para Railway/Render (não necessário, mas útil)**:
```bash
# Crie server/Procfile com:
web: node server.js
```

## 📝 Checklist de Deploy

- [ ] Backend hospedado e funcionando
- [ ] URL do backend obtida
- [ ] CORS configurado para aceitar requisições do GitHub Pages
- [ ] Variável `VITE_API_URL` configurada no GitHub Actions (ou no código)
- [ ] Testar a URL do backend:
  ```bash
  curl https://seu-backend.railway.app/api/health
  ```
  Deve retornar: `{"status":"OK"}`

## 🧪 Testar o Backend

Após o deploy, teste os endpoints:

```bash
# Health check
curl https://seu-backend.railway.app/api/health

# Deve retornar: {"status":"OK"}
```

## 🔗 Conectar Frontend ao Backend

Depois de hospedar o backend:

1. **Opção A - Variável de Ambiente no GitHub**:
   - Settings > Secrets and variables > Actions
   - Adicione: `VITE_API_URL` = `https://seu-backend.railway.app`
   - O workflow já está configurado para usar isso

2. **Opção B - Editar diretamente no código**:
   - Edite `client/src/config/api.js`
   - Substitua a linha 10:
   ```javascript
   return import.meta.env.VITE_API_URL || 'https://seu-backend.railway.app'
   ```

## 🐛 Troubleshooting

### Backend não inicia
- Verifique os logs no painel do serviço
- Certifique-se que `npm start` está correto
- Verifique se todas as dependências estão no `package.json`

### CORS errors no frontend
- Verifique que o CORS está configurado corretamente
- Confirme que a URL do frontend está na lista de origens permitidas
- Certifique-se que `credentials: true` está configurado

### Porta não definida
- Verifique que a variável `PORT` está definida
- Alguns serviços usam variáveis diferentes (Railway usa `PORT` automaticamente)

## 📚 Recursos

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)

