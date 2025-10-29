# Guia de Deploy no GitHub Pages

Este projeto está configurado para ser publicado no GitHub Pages.

## ✅ Checklist de Preparação

- [x] Base path configurado no `vite.config.js` (`/pointlake-ui/`)
- [x] Workflow do GitHub Actions criado (`.github/workflows/deploy.yml`)
- [x] Build funciona corretamente
- [x] Arquivos desnecessários no `.gitignore`

## 📋 Passo a Passo para Publicar

### Passo 1: Preparar o Repositório no GitHub

1. **Criar o repositório no GitHub** (se ainda não criou):
   - Acesse https://github.com/new
   - Nome do repositório: `pointlake-ui`
   - Escolha se será público ou privado
   - Não inicialize com README (já temos um)

2. **Conectar o repositório local ao GitHub**:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/pointlake-ui.git
   git branch -M main
   git push -u origin main
   ```
   
   ⚠️ **Substitua `SEU-USUARIO` pelo seu username do GitHub**

### Passo 2: Habilitar GitHub Pages

1. No GitHub, vá em **Settings** > **Pages**
2. Em **Source**, selecione:
   - Branch: `gh-pages` (será criado automaticamente pelo workflow)
   - Folder: `/ (root)`
3. Clique em **Save**

### Passo 3: Habilitar GitHub Actions

1. No GitHub, vá em **Settings** > **Actions** > **General**
2. Em **Workflow permissions**, selecione:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
3. Clique em **Save**

### Passo 4: Fazer Push do Código

```bash
git push origin main
```

O workflow irá:
- Fazer build do projeto automaticamente
- Publicar na branch `gh-pages`
- A aplicação ficará disponível em: `https://SEU-USUARIO.github.io/pointlake-ui/`

### Passo 5: Verificar o Deploy

1. Vá em **Actions** no GitHub para ver o status do workflow
2. Aguarde alguns minutos para o deploy completar
3. Acesse `https://SEU-USUARIO.github.io/pointlake-ui/`

## ⚠️ Importante: Hospedar o Backend Primeiro!

Este projeto tem **dois componentes separados**:

1. **Frontend** (pasta `client/`) → Vai para GitHub Pages (só arquivos estáticos)
2. **Backend** (pasta `server/`) → Precisa ser hospedado separadamente (Railway, Render, etc.)

### Por que o backend precisa ser hospedado separadamente?

O GitHub Pages **só serve arquivos estáticos** (HTML, CSS, JS). O backend na pasta `server/` é uma aplicação Node.js/Express que precisa rodar em um servidor.

### Passo 6: Hospedar o Backend (OBRIGATÓRIO)

**⚠️ IMPORTANTE**: Você PRECISA hospedar o backend ANTES do frontend funcionar.

📖 **Veja o guia completo em**: `BACKEND_DEPLOY.md`

**Resumo rápido:**

1. **Escolha uma plataforma** (recomendado: Railway ou Render)
2. **Faça deploy do backend** (pasta `server/`)
3. **Anote a URL** do backend (ex: `https://seu-backend.railway.app`)
4. **Configure o CORS** no `server/server.js` para aceitar requisições do GitHub Pages

### Passo 7: Configurar URL do Backend no Frontend

Após hospedar o backend, configure a URL no frontend:

1. No GitHub, vá em **Settings** > **Secrets and variables** > **Actions**
2. Clique em **New repository secret**
3. Nome: `VITE_API_URL`
4. Valor: URL do seu backend (ex: `https://seu-backend.railway.app`)
5. Clique em **Add secret**

**O workflow já está configurado** para usar essa variável automaticamente!

**OU** configure diretamente no código editando `client/src/config/api.js`:
```javascript
return import.meta.env.VITE_API_URL || 'https://seu-backend.railway.app'
```

### Configurar CORS no Backend

No arquivo `server/server.js`, atualize o CORS (linha 41):

```javascript
// Substitua:
app.use(cors());

// Por:
:
const allowedOrigins = [
  'https://SEU-USUARIO.github.io',
  'https://SEU-USUARIO.github.io/pointlake-ui',
  'http://localhost:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

**⚠️ Substitua `SEU-USUARIO` pelo seu username do GitHub**

## 🔧 Configuração do Workflow (Opcional)

O workflow já está configurado, mas você pode editá-lo em `.github/workflows/deploy.yml` se necessário.

## 📝 Estrutura de URLs

- **Desenvolvimento local**: `http://localhost:3000`
- **GitHub Pages**: `https://SEU-USUARIO.github.io/pointlake-ui/`

## 🐛 Troubleshooting

### Build falha
- Verifique os logs em **Actions** no GitHub
- Certifique-se que todas as dependências estão no `package.json`

### Página não carrega
- Verifique que o base path está correto (`/pointlake-ui/`)
- Limpe o cache do navegador
- Verifique a console do navegador para erros

### API não funciona
- Verifique que o CORS está configurado no backend
- Confirme que a URL da API está correta
- Verifique a console do navegador para erros de rede

## 📚 Recursos Adicionais

- [Documentação do GitHub Pages](https://docs.github.com/en/pages)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html#github-pages)

