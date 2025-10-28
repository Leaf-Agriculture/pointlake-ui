# Configuração para Deploy no GitHub Pages

## Variáveis de Ambiente para Produção

# Para produção, você pode usar uma API pública ou configurar CORS
# Exemplo de configuração para diferentes ambientes:

# Desenvolvimento Local
REACT_APP_API_URL=http://localhost:5001
REACT_APP_ENVIRONMENT=dev

# Produção (GitHub Pages)
# REACT_APP_API_URL=https://sua-api-publica.com
# REACT_APP_ENVIRONMENT=prod

## Notas Importantes:

1. **API Backend**: Como o GitHub Pages só serve arquivos estáticos, você precisará:
   - Hospedar o backend separadamente (Heroku, Vercel, Railway, etc.)
   - Ou usar uma API pública existente
   - Ou configurar CORS no seu backend para aceitar requisições do GitHub Pages

2. **Dados em Memória**: ✅ Perfeito para GitHub Pages
   - Todos os dados ficam no localStorage/sessionStorage
   - Não precisa de banco de dados
   - Funciona offline após carregar

3. **URLs**: 
   - GitHub Pages: https://seu-usuario.github.io/pointlake-ui/
   - Base path configurado no vite.config.js

4. **Build**: 
   - Comando: `npm run build` na pasta client/
   - Output: pasta `dist/`
   - Deploy automático via GitHub Actions
