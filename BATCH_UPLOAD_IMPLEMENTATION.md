# 📤 Implementação de Upload de Batches - Leaf API

## ✅ Funcionalidades Implementadas

### 1. **Backend - Endpoints Atualizados**

Com base na documentação oficial da Leaf API: https://learn.withleaf.io/docs/converters_endpoints

#### POST /api/upload
- ✅ Envia para o endpoint correto: `https://api.withleaf.io/services/operations/api/batch`
- ✅ Requer parâmetros: `leafUserId` e `provider`
- ✅ Provider padrão: "Other" (detecção automática)
- ✅ Upload de arquivos ZIP até 50MB

#### GET /api/batch
- ✅ Lista todos os batches do usuário
- ✅ Retorna array de uploads
- ✅ Informações: id, fileName, status, uploadTimestamp, leafFiles

#### GET /api/batch/:id
- ✅ Busca um batch específico por ID
- ✅ Retorna detalhes completos do batch

#### GET /api/batch/:id/status
- ✅ Verifica status detalhado de um batch
- ✅ Mostra arquivos converted, processing, failed

### 2. **Frontend - Componente FileUpload Atualizado**

#### Novas Funcionalidades:
1. **Upload Correto**
   - Usa endpoint correto da API Leaf
   - Envia com parâmetros leafUserId e provider
   - Retorna batch ID

2. **Lista de Batches**
   - Exibe todos os uploads do usuário
   - Mostra status visual com cores:
     - 🟢 PROCESSED - Processado com sucesso
     - 🟡 RECEIVED/PROCESSING - Em processamento
     - 🔴 FAILED - Falhou
   - Exibe informações: nome, ID, data, arquivos gerados

3. **Botão Atualizar**
   - Recarrega a lista de batches
   - Estado de loading durante atualização

4. **Auto-refresh**
   - Após upload bem-sucedido, lista é atualizada automaticamente

## 📋 Estrutura de Dados

### Resposta do Upload (POST /api/upload)
```json
{
  "id": "996aea67-52bc-4d4b-9b77-028756dc0ee9",
  "leafUserId": "ede8f781-1d55-4b2d-83a1-6785ddab6e1d",
  "fileName": "Climate.zip",
  "size": 8652951,
  "provider": "Other",
  "status": "RECEIVED",
  "uploadTimestamp": "2021-03-12T19:50:55.567755Z"
}
```

### Resposta de Listagem (GET /api/batch)
```json
[
  {
    "id": "9e47ae29-6a84-4a9c-9e5f-01802f6dceea",
    "leafUserId": "5ded9409-c99f-4379-9173-c01b1631f274",
    "provider": "Other",
    "status": "PROCESSED",
    "leafFiles": [
      "74d5aeb6-9a0e-43c6-986c-a5f17eecbddc",
      "475fcad3-b534-409d-8c8b-cec4dabd1b8b"
    ]
  }
]
```

## 🎨 Interface

```
┌─────────────────────────────────────────┐
│  Upload de Arquivos ZIP                │
├─────────────────────────────────────────┤
│  [Selecionar Arquivo .zip]             │
│                                         │
│  [Enviar Arquivo]                      │
│                                         │
│  ✅ Arquivo enviado! ID: abc123        │
│                                         │
│  [Verificar Status]                    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Últimos Uploads  [Atualizar]  │   │
│  ├─────────────────────────────────┤   │
│  │  📄 Climate.zip                │   │
│  │  ID: abc123                    │   │
│  │  01/01/2024 10:00              │   │
│  │  Status: PROCESSED 🟢          │   │
│  │  2 arquivo(s) gerado(s)        │   │
│  ├─────────────────────────────────┤   │
│  │  📄 JohnDeere.zip              │   │
│  │  ID: def456                    │   │
│  │  01/01/2024 09:00              │   │
│  │  Status: PROCESSING 🟡         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ℹ️ Informações sobre upload:          │
│  • Apenas arquivos ZIP                 │
│  • Tamanho máximo: 50MB                │
│  • API Leaf                            │
└─────────────────────────────────────────┘
```

## 🔄 Fluxo Completo

```
1. Usuário seleciona arquivo ZIP
   ↓
2. Clica em "Enviar Arquivo"
   ↓
3. Frontend → POST /api/upload
   Headers: Authorization: Bearer <JWT>
   Body: FormData com arquivo zip
   ↓
4. Backend → POST https://api.withleaf.io/services/operations/api/batch
   Headers: Authorization, leafUserId, provider
   Query: ?leafUserId={id}&provider=Other
   ↓
5. API Leaf processa batch
   ↓
6. Retorna batch ID
   ↓
7. Frontend busca lista de batches
   ↓
8. Exibe lista com todos os uploads
```

## 📍 Status dos Batches

| Status | Cor | Descrição |
|--------|-----|-----------|
| RECEIVED | 🟡 Amarelo | Batch recebido, aguardando processamento |
| PROCESSING | 🟡 Amarelo | Em processamento |
| PROCESSED | 🟢 Verde | Processado com sucesso |
| FAILED | 🔴 Vermelho | Falha no processamento |

## 🧪 Como Testar

1. **Login** no dashboard
2. **Vá para aba "Upload ZIP"**
3. **Selecione** um arquivo ZIP
4. **Clique em "Enviar Arquivo"**
5. **Veja** a mensagem de sucesso
6. **Lista aparece** automaticamente abaixo
7. **Clique em "Atualizar"** para ver últimos uploads
8. **Clique em "Verificar Status"** para detalhes

## 📝 Endpoints Implementados

### POST /api/upload
Upload de arquivo ZIP para processamento

### GET /api/batch
Lista todos os batches do usuário

### GET /api/batch/:id
Detalhes de um batch específico

### GET /api/batch/:id/status
Status detalhado de arquivos do batch

## ✅ Benefícios

1. **Usa API correta** da Leaf
2. **Lista automática** após upload
3. **Status visual** com cores
4. **Histórico completo** de uploads
5. **Informações detalhadas** de cada batch
6. **Botão de atualização** manual

## 📚 Documentação de Referência

- Leaf API: https://learn.withleaf.io/docs/converters_endpoints
- Upload: POST /batch
- Listar: GET /batch
- Detalhes: GET /batch/{id}
- Status: GET /batch/{id}/status

