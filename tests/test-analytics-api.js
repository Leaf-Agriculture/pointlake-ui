// Script para testar a API de analytics diretamente
const https = require('https');

const leafUserId = '453b3bd5-85d6-46b0-b5b7-2d4698f48307';
const sampleRate = 21;
const startDate = '2020-01-01T00:00:00.000Z';
const endDate = '2025-12-01T00:00:00.000Z';

// Token precisa ser obtido via login - usar o mesmo que o Playwright obtém
// Este é um script de debug apenas

const url = `https://api-dev.withleaf.team/services/pointlake/api/v2/beta/analytics/user/${leafUserId}/points?samplerate=${sampleRate}&startDate=${startDate}&endDate=${endDate}`;

console.log('Testing API URL:', url);
console.log('\nPara testar, execute no console do browser após login:');
console.log(`
fetch('${url}', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('leaf_token'),
    'Accept': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  console.log('Response type:', typeof data);
  console.log('Is array:', Array.isArray(data));
  if (data.data) console.log('Has data field:', Array.isArray(data.data), data.data?.length);
  if (data.points) console.log('Has points field:', Array.isArray(data.points), data.points?.length);
  if (Array.isArray(data)) {
    console.log('Array length:', data.length);
    if (data[0]) {
      console.log('First item keys:', Object.keys(data[0]));
      console.log('First item geometry:', data[0].geometry?.substring(0, 60));
    }
  }
})
.catch(console.error);
`);

