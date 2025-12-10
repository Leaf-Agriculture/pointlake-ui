#!/bin/bash

# Script para testar a API Create Zones
# Substitua YOUR_USERNAME e YOUR_PASSWORD por credenciais reais

echo "🔐 Fazendo login na API Leaf..."
TOKEN=$(curl -s -X POST "https://api-dev.withleaf.team/api/authenticate" \
  -H "Content-Type: application/json" \
  -d '{"username":"YOUR_USERNAME","password":"YOUR_PASSWORD"}' \
  | jq -r '.id_token' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Falha na autenticação. Verifique suas credenciais."
  exit 1
fi

echo "✅ Token obtido: ${TOKEN:0:20}..."

echo ""
echo "🏗️ Testando Create Zones API..."

RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "https://api-dev.withleaf.team/api/v2/beta/analytics/user/YOUR_USER_ID/zones?h3resolution=12&numzones=4&polygon=POLYGON((-89.83481604512383%2039.72646507772971%2C%20-89.83481372059585%2039.71959940866267%2C%20-89.82992199487315%2039.71966542796622%2C%20-89.83001013915062%2039.72757078263136%2C%20-89.83481604512383%2039.72646507772971))&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "📊 Status HTTP: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
  echo "✅ Sucesso! Resposta da API:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_STATUS" = "401" ]; then
  echo "❌ 401 Unauthorized - Token inválido ou expirado"
elif [ "$HTTP_STATUS" = "404" ]; then
  echo "❌ 404 Not Found - Endpoint não encontrado"
elif [ "$HTTP_STATUS" = "500" ]; then
  echo "❌ 500 Internal Server Error - Erro no servidor"
else
  echo "❌ Erro HTTP $HTTP_STATUS"
  echo "Resposta: $BODY"
fi
