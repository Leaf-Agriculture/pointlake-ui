# 📍 Guia Rápido - Points Analytics

## 🚀 Como Acessar

### Opção 1: Pelo Dashboard
1. Faça login na aplicação
2. No header do Dashboard, clique no botão azul **"Points Analytics"**

### Opção 2: URL Direta
- Navegue para: `http://localhost:3000/points-analytics`

---

## 🎨 Interface da Página

### Layout Geral

```
┌─────────────────────────────────────────────────────────────┐
│  ← Dashboard  │  📍 Análise de Pontos  │  🔧 Dev  │  Sair  │
├──────────────────┬──────────────────────────────────────────┤
│                  │                                           │
│   🎛️ Filtros     │                                           │
│                  │                                           │
│   User ID        │                                           │
│   [Select ▼]     │                                           │
│                  │                                           │
│   Sample Rate    │          🗺️ Mapa Interativo              │
│   ━━━●━━━ 100    │                                           │
│                  │                                           │
│   Data Inicial   │         (Leaflet Map com pontos)         │
│   [Input]        │                                           │
│                  │                                           │
│   Data Final     │                                           │
│   [Input]        │                                           │
│                  │                                           │
│   🔍 Buscar      │                                           │
│      Pontos      │                                           │
│                  │                                           │
│  ─────────────   │                                           │
│                  │                                           │
│  📊 Estatísticas │                                           │
│                  │                                           │
│  Total: 1,234    │                                           │
│  Com Coords: 987 │                                           │
│  Lat: -23.5→-22  │                                           │
│  Lng: -46.6→-45  │                                           │
│                  │                                           │
│  ─────────────   │                                           │
│                  │                                           │
│  ℹ️ Informações   │                                           │
│                  │                                           │
└──────────────────┴──────────────────────────────────────────┘
```

---

## 🎯 Passo a Passo de Uso

### 1️⃣ Configurar User ID

**Se você tem usuários carregados:**
```
┌─────────────────────────┐
│ User ID                 │
│ ┌─────────────────────┐ │
│ │ User Name (UUID)  ▼ │ │
│ └─────────────────────┘ │
│ ID do usuário para      │
│ buscar os pontos        │
└─────────────────────────┘
```

**Se não tem usuários:**
```
┌─────────────────────────┐
│ User ID                 │
│ ┌─────────────────────┐ │
│ │ 2bb3b597-3fa3-...   │ │
│ └─────────────────────┘ │
│ Digite o User ID        │
└─────────────────────────┘
```

### 2️⃣ Ajustar Sample Rate

```
Sample Rate: 100
━━━━━━━━━━━━━━━●
1             100

Taxa de amostragem (1-100)
```

- **1**: Menor amostragem (menos pontos)
- **100**: Amostragem máxima (todos os pontos)

### 3️⃣ Definir Período

```
Data Inicial
┌─────────────────────────┐
│ 2020-01-01T00:00      ▼│
└─────────────────────────┘

Data Final
┌─────────────────────────┐
│ 2025-12-01T00:00      ▼│
└─────────────────────────┘
```

### 4️⃣ Buscar Pontos

```
┌─────────────────────────┐
│   🔍 Buscar Pontos      │
└─────────────────────────┘
```

Após clicar, você verá:

**Durante o carregamento:**
```
┌─────────────────────────────┐
│                             │
│      ⟳ Carregando...       │
│   Carregando pontos...      │
│                             │
└─────────────────────────────┘
```

**Após carregar:**
- Pontos aparecem no mapa
- Estatísticas são atualizadas
- Zoom ajustado automaticamente

---

## 🗺️ Visualizações no Mapa

### Tipos de Visualização

#### 1. Heatmap Avançado 🔥
- **Quando**: Sempre ativado para todos os volumes
- **Visual**: Gradiente de cores (azul → verde → amarelo → vermelho)
- **Benefício**: Mostra densidade de operações

#### 2. Cluster de Marcadores (>5000 pontos)
```
    ⚪ 150        Grande cluster
   ⚪ 75          Cluster médio
  ⚪ 10           Cluster pequeno
 📍              Ponto individual
```

#### 3. CircleMarkers (1000-5000 pontos)
```
● ● ●    Círculos coloridos
 ● ●     Mais leve que markers
● ● ●    Popup ao clicar
```

#### 4. Markers Tradicionais (<1000 pontos)
```
📍 📍 📍   Marcadores padrão
 📍 📍    Com popup detalhado
📍 📍 📍   Todas as informações
```

---

## 📊 Interpretando Estatísticas

```
┌────────────────────────────┐
│  📊 Estatísticas           │
├────────────────────────────┤
│  Total de Pontos:   1,234  │ ← Total retornado pela API
│  Com Coordenadas:     987  │ ← Pontos válidos no mapa
│  ────────────────────────  │
│  Latitude:  -23.5 → -22.0  │ ← Range geográfico
│  Longitude: -46.6 → -45.0  │
└────────────────────────────┘
```

### O que significa cada valor:

- **Total de Pontos**: Quantidade total retornada pela API
- **Com Coordenadas**: Pontos que têm coordenadas válidas (latitude/longitude)
- **Latitude/Longitude**: Extensão geográfica da área coberta

---

## 🎨 Temas de Cores

### Gradiente do Heatmap
```
🔵 Azul    → Baixa densidade/intensidade
🟢 Verde   → Densidade média
🟡 Amarelo → Alta densidade
🟠 Laranja → Muito alta densidade
🔴 Vermelho → Densidade máxima
```

### Cores da Interface
```
🔵 Azul    → Ações primárias (buscar, navegar)
🟢 Verde   → Sucessos, dados positivos
🟡 Amarelo → Avisos
🔴 Vermelho → Erros, logout
⚪ Cinza   → Background, texto secundário
```

---

## ⚠️ Tratamento de Erros

### Sem User ID
```
┌───────────────────────────────────┐
│ ❌ Por favor, selecione um usuário│
└───────────────────────────────────┘
```
**Solução**: Selecione ou digite um User ID válido

### Erro na API
```
┌───────────────────────────────────┐
│ ❌ Erro ao carregar pontos:       │
│    [mensagem do servidor]         │
└───────────────────────────────────┘
```
**Soluções**:
- Verifique o token de autenticação
- Confirme se o User ID existe
- Verifique as datas fornecidas
- Tente com um sample rate menor

### Sem Pontos
```
┌────────────────────────────────┐
│          🗺️                    │
│    Nenhum ponto carregado      │
│                                │
│  Configure os filtros e clique │
│     em "Buscar Pontos"         │
└────────────────────────────────┘
```
**Causa**: Nenhum ponto foi carregado ainda ou não há dados no período

---

## 💡 Dicas de Uso

### 1. Otimização de Performance
- Para volumes grandes (>10k pontos), comece com sample rate baixo (10-50)
- Aumente gradualmente se necessário
- O heatmap é mais eficiente que markers individuais

### 2. Navegação no Mapa
- **Zoom**: Scroll do mouse ou botões +/-
- **Pan**: Clique e arraste
- **Popup**: Clique em um ponto
- **Alternar vista**: Use o controle no canto superior esquerdo

### 3. Filtragem Eficiente
- Use períodos menores para análises específicas
- Períodos grandes podem retornar muitos dados
- Sample rate de 100 = todos os pontos disponíveis

### 4. Análise Visual
- Heatmap mostra concentração de atividades
- Clusters indicam áreas de operação intensa
- Zoom in para ver detalhes individuais

---

## 🔧 Troubleshooting

### Mapa não carrega
1. Verifique conexão com internet
2. Abra o Console do navegador (F12)
3. Procure por erros relacionados ao Leaflet
4. Recarregue a página

### Pontos não aparecem
1. Verifique se "Com Coordenadas" > 0 nas estatísticas
2. Confirme que o User ID está correto
3. Tente um período de datas diferente
4. Verifique o Console para erros da API

### Performance lenta
1. Reduza o sample rate
2. Use um período de datas menor
3. Feche outras abas do navegador
4. O heatmap já é otimizado, mas clusters ajudam com muitos pontos

---

## 🎓 Casos de Uso

### 1. Análise de Operações de um Produtor
```
User ID: [ID do produtor]
Sample Rate: 100
Período: Última safra
→ Ver todas operações da safra
```

### 2. Visualização de Cobertura Geográfica
```
Sample Rate: 50
Período: Ano completo
→ Heatmap mostra áreas mais trabalhadas
```

### 3. Detecção de Padrões
```
Sample Rate: 100
Período: Mês específico
→ Clusters mostram áreas de operação intensa
```

### 4. Validação de Dados
```
Estatísticas:
- Total vs Com Coordenadas
- Identificar pontos sem coordenadas
- Verificar range geográfico esperado
```

---

## 📱 Atalhos de Teclado (no mapa)

| Tecla | Ação |
|-------|------|
| `+` | Zoom In |
| `-` | Zoom Out |
| `←↑↓→` | Mover mapa |
| `Esc` | Fechar popup |

---

## 🌐 Ambientes

### Development
```
🔧 Dev
URL: https://api-dev.withleaf.team
```

### Production
```
🌐 Prod
URL: https://api.withleaf.io
```

O ambiente é selecionado no login e exibido no header.

---

## 📞 Suporte

Para questões sobre:
- **Dados**: Verifique a API Leaf
- **Interface**: Abra issue no repositório
- **Performance**: Documente na issue com volume de dados

---

## 🎉 Pronto!

Agora você está pronto para usar o Points Analytics! 

**Próximos passos sugeridos:**
1. Faça login
2. Selecione um usuário
3. Busque pontos de um período recente
4. Explore o mapa e estatísticas
5. Experimente diferentes sample rates

**Boa análise!** 📊🗺️


