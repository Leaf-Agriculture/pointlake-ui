# 🗺️ Leaf GIS Studio

Uma aplicação web profissional para visualização e análise de dados geoespaciais agrícolas, inspirada no design do Android Studio e AutoCAD.

## 🚀 Deploy no GitHub Pages

### ✅ **Status do Deploy**
- ✅ Build configurado e testado
- ✅ GitHub Actions workflow criado
- ✅ Configuração de produção pronta
- ✅ Dados em memória (perfeito para GitHub Pages)

### 📋 **Passos para Deploy**

#### **1. Preparar o Repositório**
```bash
# Se ainda não fez commit das mudanças
git add .
git commit -m "feat: configure GitHub Pages deploy"
git push origin main
```

#### **2. Configurar GitHub Pages**
1. Vá para **Settings** do seu repositório no GitHub
2. Role até **Pages** na sidebar
3. Em **Source**, selecione **GitHub Actions**
4. O workflow será executado automaticamente

#### **3. Configurar API Backend (Opcional)**
Como o GitHub Pages só serve arquivos estáticos, você tem algumas opções:

**Opção A: Usar API Pública**
- Configure uma API pública existente
- Atualize as URLs no código

**Opção B: Deploy do Backend Separadamente**
- Heroku, Vercel, Railway, etc.
- Configure CORS para aceitar requisições do GitHub Pages

**Opção C: Modo Demo (Recomendado)**
- A aplicação funciona perfeitamente sem backend
- Todos os dados ficam em memória/localStorage
- Ideal para demonstrações e testes

### 🎯 **URLs de Acesso**
- **GitHub Pages**: `https://seu-usuario.github.io/pointlake-ui/`
- **Desenvolvimento Local**: `http://localhost:3000`

### 🔧 **Configurações Técnicas**

#### **Build de Produção**
```bash
cd client
npm run build
# Gera arquivos em dist/
```

#### **Estrutura do Deploy**
```
dist/
├── index.html          # Página principal
├── assets/
│   ├── index-*.css     # Estilos
│   ├── index-*.js      # Código principal
│   ├── vendor-*.js     # Dependências React
│   └── leaflet-*.js    # Biblioteca de mapas
└── vite.svg           # Ícone
```

#### **GitHub Actions**
- **Trigger**: Push para `main`
- **Build**: Node.js 18 + npm ci
- **Deploy**: Automático para GitHub Pages
- **Arquivos**: Pasta `dist/`

### 📱 **Funcionalidades**

#### **✅ Funciona no GitHub Pages**
- Interface profissional estilo Android Studio/AutoCAD
- Visualização de mapas com Leaflet
- Queries SQL (modo demo)
- Upload de arquivos (localStorage)
- Download de dados
- Tema escuro profissional

#### **⚠️ Limitações**
- Sem backend próprio (dados em memória)
- Upload de arquivos fica no localStorage
- Queries SQL precisam de API externa

### 🎨 **Design Profissional**
- **Paleta**: Slate (cinza escuro) + Blue/Emerald accents
- **Ícones**: SVG profissionais (sem emojis)
- **Layout**: QGIS-like com mapa central
- **UX**: Hover effects e transições suaves

### 🔄 **Deploy Automático**
O deploy acontece automaticamente a cada push para `main`:
1. GitHub Actions executa o workflow
2. Instala dependências
3. Executa build de produção
4. Deploy para GitHub Pages
5. Site fica disponível em ~2 minutos

### 📊 **Monitoramento**
- **Status**: Verifique em Actions tab do GitHub
- **Logs**: Disponíveis no workflow
- **URL**: Atualizada automaticamente

---

## 🎉 **Resultado Final**

Sua aplicação estará disponível publicamente com:
- ✅ Interface profissional e moderna
- ✅ Funcionalidades completas (modo demo)
- ✅ Deploy automático
- ✅ URL pública e estável
- ✅ Zero custo (GitHub Pages gratuito)

**Perfeito para portfólio, demonstrações e testes!** 🚀
