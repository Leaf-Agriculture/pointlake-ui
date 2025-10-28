const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Configuração do multer para armazenamento temporário
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos ZIP são permitidos'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Função para obter URL da API baseado no ambiente
const getLeafApiUrl = (environment) => {
  return environment === 'dev' 
    ? 'https://api-dev.withleaf.team/api'
    : 'https://api.withleaf.io/api'
}

// Configuração da API Leaf (padrão produção)
let LEAF_API_URL = 'https://api.withleaf.io/api';

// Endpoint de autenticação
app.post('/api/authenticate', async (req, res) => {
  try {
    const { username, password, rememberMe, environment } = req.body;
    
    // Usar URL do ambiente selecionado
    const apiUrl = getLeafApiUrl(environment || 'prod')
    
    const response = await axios.post(`${apiUrl}/authenticate`, {
      username,
      password,
      rememberMe: rememberMe || 'true'
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Erro na autenticação:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro na autenticação'
    });
  }
});

// Endpoint proxy para SQL
app.post('/api/v2/sql', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const environment = req.headers['x-environment'] || 'prod';
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    const apiUrl = getLeafApiUrl(environment)
    const query = req.body;
    
    const response = await axios.post(`${apiUrl}/v2/sql`, query, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Erro na query SQL:', error.response?.data || error.message);
    
    let errorMessage = 'Erro ao executar query SQL';
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.title) {
        errorMessage = data.title;
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(error.response?.status || 500).json({
      error: errorMessage
    });
  }
});

// Endpoint para query de arquivo específico com formato correto
app.get('/api/v2/query', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const environment = req.headers['x-environment'] || 'prod';
    const { sql, fileId } = req.query;
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    if (!sql) {
      return res.status(400).json({ error: 'Parâmetro SQL é obrigatório' });
    }
    
    // Construir URL no formato correto
    const pointlakeUrl = environment === 'dev'
      ? 'https://api-dev.withleaf.team/services/pointlake/api/v2/query'
      : 'https://api.withleaf.io/services/pointlake/api/v2/query'
    
    const queryParams = new URLSearchParams({
      sql: sql
    });
    
    if (fileId) {
      queryParams.append('fileId', fileId);
    }
    
    const response = await axios.get(`${pointlakeUrl}?${queryParams.toString()}`, {
      headers: {
        'Authorization': token,
        'Accept': 'application/json'
      }
    });
    
    // Se for um GeoJSON grande, permitir download
    const isLargeGeoJSON = response.data && 
      typeof response.data === 'object' && 
      response.data.features && 
      Array.isArray(response.data.features) && 
      response.data.features.length > 1000;
    
    if (isLargeGeoJSON) {
      // Definir headers para download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="query_result_${Date.now()}.geojson"`);
      res.setHeader('Content-Length', JSON.stringify(response.data).length);
      
      console.log(`GeoJSON grande detectado (${response.data.features.length} features). Iniciando download...`);
    }
    
    res.json(response.data);
  } catch (error) {
    console.error('Erro na query de arquivo:', error.response?.data || error.message);
    
    let errorMessage = 'Erro ao executar query de arquivo';
    if (error.response?.data) {
      const data = error.response.data;
      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data.detail) {
        errorMessage = data.detail;
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.title) {
        errorMessage = data.title;
      } else {
        errorMessage = JSON.stringify(data);
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(error.response?.status || 500).json({
      error: errorMessage
    });
  }
});

// Função para extrair UUID do token JWT
const extractUserIdFromToken = (token) => {
  try {
    // Remove "Bearer " se presente
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Decodificar JWT (payload é base64)
    const payload = JSON.parse(Buffer.from(cleanToken.split('.')[1], 'base64').toString());
    
    console.log('Campos disponíveis no token:', Object.keys(payload));
    console.log('Payload completo:', JSON.stringify(payload, null, 2));
    
    // Tentar encontrar o userId em diferentes campos possíveis
    // Preferir campos que pareçam UUIDs
    const possibleFields = [
      'leaf_user_id', 
      'user_id', 
      'userId',
      'sub',
      'id'
    ];
    
    for (const field of possibleFields) {
      if (payload[field]) {
        const value = payload[field];
        // Verificar se parece um UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(value)) {
          console.log(`UUID encontrado no campo '${field}':`, value);
          return value;
        }
      }
    }
    
    console.log('Nenhum UUID válido encontrado no token');
    return null;
  } catch (error) {
    console.error('Erro ao extrair userId do token:', error);
    return null;
  }
};

// Função para buscar o UUID do usuário atual
const getCurrentUserUuid = async (token, environment) => {
  try {
    const apiUrl = getLeafApiUrl(environment);
    
    // Tentar obter o profile do usuário atual
    console.log('Buscando profile do usuário...');
    try {
      const profileResponse = await axios.get(
        `${apiUrl}/account`,
        {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Profile do usuário:', JSON.stringify(profileResponse.data, null, 2));
      
      // Tentar encontrar UUID no profile
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const possibleFields = ['uuid', 'leafUserId', 'id', 'userId', 'userUuid'];
      
      for (const field of possibleFields) {
        if (profileResponse.data[field] && uuidRegex.test(profileResponse.data[field])) {
          console.log(`UUID encontrado no campo '${field}':`, profileResponse.data[field]);
          return profileResponse.data[field];
        }
      }
      
      // Tentar buscar usuários e pegar o primeiro UUID válido
      console.log('Listando usuários para buscar UUID...');
      const usersResponse = await axios.get(
        `${apiUrl}/users?page=0&size=10`,
        {
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Lista de usuários:', JSON.stringify(usersResponse.data, null, 2));
      
      // Se retornar uma lista, pegar o primeiro ID (que pode ser usado para buscar UUID)
      if (Array.isArray(usersResponse.data) && usersResponse.data.length > 0) {
        const firstUser = usersResponse.data[0];
        console.log('Usando primeiro usuário da lista:', firstUser);
        
        // Tentar buscar detalhes em endpoint alternativo
        try {
          const detailResponse = await axios.get(
            `${apiUrl}/admin/users/${firstUser.id}`,
            {
              headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('Detalhes do usuário (admin):', JSON.stringify(detailResponse.data, null, 2));
          
          // Procurar UUID nos detalhes
          for (const field of ['uuid', 'id']) {
            if (detailResponse.data[field] && uuidRegex.test(detailResponse.data[field])) {
              console.log(`UUID encontrado:`, detailResponse.data[field]);
              return detailResponse.data[field];
            }
          }
        } catch (adminError) {
          console.error('Erro ao buscar detalhes admin:', adminError.response?.data || adminError.message);
        }
      }
      
    } catch (profileError) {
      console.error('Erro ao buscar profile:', profileError.response?.data || profileError.message);
    }
    
    return null;
  } catch (error) {
    console.error('Erro geral ao buscar UUID:', error.response?.data || error.message);
    return null;
  }
};

// Endpoint de upload de arquivos ZIP
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    let token = req.headers.authorization;
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Criar FormData para enviar à API Leaf
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    // Parâmetros necessários - extrair do body, query, headers ou do token
    let leafUserId = req.body.leafUserId || req.query.leafUserId || req.headers['leaf-user-id'] || extractUserIdFromToken(token);
    const provider = req.body.provider || req.query.provider || req.headers['provider'] || 'Other';
    const environment = req.headers['x-environment'] || 'prod';
    
    // Se não houver leafUserId, usar UUID fixo
    if (!leafUserId) {
      console.log('Nenhum leafUserId encontrado, usando UUID padrão...');
      leafUserId = '453b3bd5-85d6-46b0-b5b7-2d4698f48307';
      console.log(`Usando UUID padrão: ${leafUserId}`);
    }
    
    const opsApiUrl = environment === 'dev'
      ? 'https://api-dev.withleaf.team/services/operations/api/batch'
      : 'https://api.withleaf.io/services/operations/api/batch'

    console.log(`Enviando upload para: ${opsApiUrl} com leafUserId: ${leafUserId}, provider: ${provider}`);

    // Enviar arquivo para API Leaf - Endpoint correto
    const uploadUrl = `${opsApiUrl}?leafUserId=${encodeURIComponent(leafUserId)}&provider=${encodeURIComponent(provider)}`;
    
    const response = await axios.post(
      uploadUrl,
      formData,
      {
        headers: {
          'Authorization': token,
          ...formData.getHeaders()
        }
      }
    );

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json(response.data);
  } catch (error) {
    // Limpar arquivo temporário em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('Erro no upload:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro ao fazer upload do arquivo'
    });
  }
});

// Endpoint para verificar status de batch
app.get('/api/batch/:id', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const { id } = req.params;
    const environment = req.headers['x-environment'] || 'prod';
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    const opsApiUrl = environment === 'dev'
      ? 'https://api-dev.withleaf.team/services/operations/api/batch'
      : 'https://api.withleaf.io/services/operations/api/batch'
    
    const response = await axios.get(`${opsApiUrl}/${id}`, {
      headers: {
        'Authorization': token
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar batch:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro ao buscar batch'
    });
  }
});

// Endpoint para listar todos os batches
app.get('/api/batch', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const environment = req.headers['x-environment'] || 'prod';
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    const opsApiUrl = environment === 'dev'
      ? 'https://api-dev.withleaf.team/services/operations/api/batch'
      : 'https://api.withleaf.io/services/operations/api/batch'
    
    const response = await axios.get(opsApiUrl, {
      headers: {
        'Authorization': token
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao listar batches:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro ao listar batches'
    });
  }
});

// Endpoint para verificar status de um batch específico
app.get('/api/batch/:id/status', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const { id } = req.params;
    const environment = req.headers['x-environment'] || 'prod';
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    const opsApiUrl = environment === 'dev'
      ? 'https://api-dev.withleaf.team/services/operations/api/batch'
      : 'https://api.withleaf.io/services/operations/api/batch'
    
    const response = await axios.get(`${opsApiUrl}/${id}/status`, {
      headers: {
        'Authorization': token
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao verificar status:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro ao verificar status'
    });
  }
});

// Endpoint para obter UUID do usuário (utilidade)
app.get('/api/user-uuid', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const environment = req.headers['x-environment'] || 'prod';
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    const userId = await getCurrentUserUuid(token, environment);
    
    if (userId) {
      res.json({ 
        success: true,
        userId: userId,
        message: 'UUID obtido com sucesso'
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Não foi possível obter o UUID do usuário'
      });
    }
  } catch (error) {
    console.error('Erro ao obter UUID:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro ao obter UUID'
    });
  }
});

// Endpoint para buscar arquivos da API v2
app.get('/api/v2/files', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const environment = req.headers['x-environment'] || 'prod';
    const { leafUserId, page = 0, size = 100, sort } = req.query;
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    // Usar UUID padrão se não fornecido
    const userId = leafUserId || '453b3bd5-85d6-46b0-b5b7-2d4698f48307';
    
    const pointlakeUrl = environment === 'dev'
      ? 'https://api-dev.withleaf.team/services/pointlake/api/v2/files'
      : 'https://api.withleaf.io/services/pointlake/api/v2/files'
    
    const queryParams = new URLSearchParams({
      leafUserId: userId,
      page: page.toString(),
      size: size.toString()
    });
    
    if (sort) {
      queryParams.append('sort', sort);
    }
    
    const response = await axios.get(
      `${pointlakeUrl}?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': token
        }
      }
    );

    console.log('Resposta da API v2/files:', JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar arquivos:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro ao buscar arquivos'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Endpoint para buscar detalhes de um arquivo específico
app.get('/api/v2/files/:fileId', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const environment = req.headers['x-environment'] || 'prod';
    const { fileId } = req.params;
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    const pointlakeUrl = environment === 'dev'
      ? `https://api-dev.withleaf.team/services/pointlake/api/v2/files/${fileId}`
      : `https://api.withleaf.io/services/pointlake/api/v2/files/${fileId}`;
    
    const response = await axios.get(pointlakeUrl, {
      headers: {
        'Authorization': token
      }
    });

    console.log(`Detalhes do arquivo ${fileId}:`, JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar detalhes do arquivo:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro ao buscar detalhes do arquivo'
    });
  }
});

// Endpoint para buscar summary de um arquivo específico
app.get('/api/v2/files/:fileId/summary', async (req, res) => {
  try {
    let token = req.headers.authorization;
    const environment = req.headers['x-environment'] || 'prod';
    const { fileId } = req.params;
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }
    
    // Garantir que o token está no formato correto
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    
    const pointlakeUrl = environment === 'dev'
      ? `https://api-dev.withleaf.team/services/pointlake/api/v2/files/${fileId}/summary`
      : `https://api.withleaf.io/services/pointlake/api/v2/files/${fileId}/summary`;
    
    const response = await axios.get(pointlakeUrl, {
      headers: {
        'Authorization': token
      }
    });

    console.log(`Summary do arquivo ${fileId}:`, JSON.stringify(response.data, null, 2));
    res.json(response.data);
  } catch (error) {
    console.error('Erro ao buscar summary do arquivo:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Erro ao buscar summary do arquivo'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

