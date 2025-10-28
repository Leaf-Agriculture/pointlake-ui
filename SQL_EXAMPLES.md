# Exemplos de Queries SQL para API Leaf

Este documento contém exemplos de queries SQL que podem ser usadas na API Leaf (endpoint v2/sql).

## Formato de Query

As queries SQL devem ser enviadas no formato JSON:

```json
{
  "sql": "SELECT * FROM tabela LIMIT 10"
}
```

## Exemplos de Uso

### 1. Buscar campos (fields)

```json
{
  "sql": "SELECT * FROM fields LIMIT 10"
}
```

### 2. Buscar operações de campo

```json
{
  "sql": "SELECT * FROM field_operations WHERE field_id = 'xxx' ORDER BY created_at DESC LIMIT 20"
}
```

### 3. Buscar dados de máquinas

```json
{
  "sql": "SELECT machine_id, machine_name, machine_type FROM machines WHERE status = 'active'"
}
```

### 4. Buscar dados com filtros

```json
{
  "sql": "SELECT * FROM harvest_data WHERE crop = 'soybean' AND year = 2023"
}
```

### 5. Agregações

```json
{
  "sql": "SELECT crop, AVG(yield) as avg_yield, COUNT(*) as field_count FROM fields GROUP BY crop"
}
```

## Notas

- O endpoint v2/sql não está oficialmente documentado na API Leaf
- Você precisará de um token JWT válido para fazer as requisições
- As tabelas disponíveis podem variar dependendo do seu plano da Leaf
- Sempre teste suas queries com LIMIT primeiro para evitar carregar muitos dados

## Uso no Dashboard

1. Faça login no dashboard
2. No painel SQL, cole uma query JSON
3. Clique em "Executar Query"
4. Os resultados aparecerão abaixo
5. Use os dados retornados para atualizar o mapa

