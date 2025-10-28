# Guia de Upload de Arquivos ZIP

## 📤 Funcionalidade de Upload

A área de Upload permite enviar arquivos ZIP para a API Leaf para processamento e conversão de dados de máquinas agrícolas.

## 🎯 Como Usar

### 1. Acessar a Área de Upload

Após fazer login no dashboard:
1. Clique na aba **"Upload ZIP"** no painel esquerdo
2. Ou clique na aba **"SQL Query"** para voltar às queries

### 2. Selecionar Arquivo

- Clique no botão para selecionar arquivo
- Apenas arquivos `.zip` são aceitos
- Tamanho máximo: **50MB**

### 3. Fazer Upload

- Clique em **"Enviar Arquivo"**
- Aguarde o processamento
- Mensagens de sucesso ou erro serão exibidas

## 📋 Requisitos

### Formatos Aceitos

A API Leaf aceita arquivos ZIP contendo:
- Arquivos de máquinas John Deere
- Arquivos de máquinas CNHI
- Arquivos de máquinas Trimble
- Arquivos de máquinas Raven
- Arquivos de máquinas AgLeader
- E outros formatos suportados

### Validações

- ✅ Apenas arquivos `.zip`
- ✅ Tamanho máximo: 50MB
- ✅ Requer autenticação (JWT token)

## 🔧 Endpoints

### POST /api/upload

**Descrição**: Upload de arquivos ZIP para processamento na API Leaf

**Request**:
```javascript
const formData = new FormData();
formData.append('file', file);

fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <JWT_TOKEN>'
  },
  body: formData
})
```

**Response**:
```json
{
  "id": "conversion-id",
  "status": "processing",
  "file": "original-name.zip"
}
```

### GET /api/conversions/:id

**Descrição**: Verificar status de uma conversão específica

**Request**:
```javascript
fetch('/api/conversions/conversion-id', {
  headers: {
    'Authorization': 'Bearer <JWT_TOKEN>'
  }
})
```

**Response**:
```json
{
  "id": "conversion-id",
  "status": "completed",
  "createdAt": "2024-01-01T00:00:00Z",
  "file": "original-name.zip"
}
```

### GET /api/conversions

**Descrição**: Listar todas as conversões

**Request**:
```javascript
fetch('/api/conversions', {
  headers: {
    'Authorization': 'Bearer <JWT_TOKEN>'
  }
})
```

**Response**:
```json
[
  {
    "id": "conversion-1",
    "status": "completed",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  {
    "id": "conversion-2",
    "status": "processing",
    "createdAt": "2024-01-02T00:00:00Z"
  }
]
```

## 🔄 Fluxo de Processamento

```
1. Usuário seleciona arquivo ZIP
   ↓
2. Frontend valida formato e tamanho
   ↓
3. Arquivo enviado para /api/upload
   ↓
4. Backend salva temporariamente
   ↓
5. Backend envia para API Leaf (v2/conversions/file)
   ↓
6. API Leaf processa o arquivo
   ↓
7. Arquivo temporário removido
   ↓
8. Resposta retornada ao usuário
```

## 🌐 API Leaf

**Documentação**: https://learn.withleaf.io/docs/converters_overview

### Endpoint Usado

```
POST https://api.withleaf.io/api/v2/conversions/file
```

**Headers**:
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: multipart/form-data`

**Body**:
- FormData com arquivo ZIP

## 💡 Exemplos de Uso

### Enviar Arquivo ZIP

```javascript
// No componente de upload
const handleUpload = async () => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post('/api/upload', formData, {
    headers: {
      'Authorization': token,
      'Content-Type': 'multipart/form-data'
    }
  });

  console.log('Sucesso:', response.data);
};
```

### Verificar Status da Conversão

Depois do upload, você pode verificar o status:

**No Dashboard:**
1. Após o upload bem-sucedo, um botão "Verificar Status do Processamento" aparece
2. Clique no botão para verificar o status atual
3. O status será exibido com cores:
   - 🟢 Verde: `completed` - Processamento concluído
   - 🟡 Amarelo: `processing` - Ainda processando
   - 🔴 Vermelho: `failed` - Falha no processamento
   - ⚪ Cinza: Outros status

**Via API:**
```javascript
// Buscar conversão específica
const response = await axios.get(`/api/conversions/${conversionId}`, {
  headers: {
    'Authorization': token
  }
});

// Listar todas as conversões
const response = await axios.get('/api/conversions', {
  headers: {
    'Authorization': token
  }
});
```

## ⚠️ Erros Comuns

### "Apenas arquivos ZIP são permitidos"
- Verifique se o arquivo tem extensão `.zip`
- Verifique o tipo MIME do arquivo

### "O arquivo é muito grande"
- Arquivos devem ter no máximo 50MB
- Comprima arquivos maiores ou divida-os

### "Erro ao fazer upload do arquivo"
- Verifique sua conexão com a internet
- Verifique se o token JWT ainda é válido
- Verifique o log do servidor para mais detalhes

## 🔐 Segurança

- Arquivos são armazenados temporariamente no servidor
- Arquivos são removidos após o processamento
- Requer autenticação JWT válida
- CORS configurado para permitir requisições do frontend

## 📝 Notas

- A API Leaf processa arquivos de forma assíncrona
- Dependendo do tamanho, o processamento pode levar tempo
- Consulte a documentação da Leaf para mais informações sobre conversões

