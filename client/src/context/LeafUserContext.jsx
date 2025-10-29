import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import axios from 'axios'
import { leafApiUrl, getLeafApiBaseUrl } from '../config/api'

const LeafUserContext = createContext()

export const useLeafUser = () => {
  const context = useContext(LeafUserContext)
  if (!context) {
    throw new Error('useLeafUser must be used within LeafUserProvider')
  }
  return context
}

export const LeafUserProvider = ({ children }) => {
  const { token, getEnvironment } = useAuth()
  const [selectedLeafUserId, setSelectedLeafUserId] = useState(() => {
    try {
      return localStorage.getItem('selected_leaf_user_id') || '453b3bd5-85d6-46b0-b5b7-2d4698f48307'
    } catch (e) {
      console.warn('Erro ao acessar localStorage:', e)
      return '453b3bd5-85d6-46b0-b5b7-2d4698f48307'
    }
  })
  const [leafUsers, setLeafUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Função para buscar lista de Leaf Users
  const fetchLeafUsers = async () => {
    if (!token) return

    setLoadingUsers(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      // Tentar buscar usuários via endpoint /api/users ou /users
      // Se não funcionar, podemos extrair dos batches existentes
      const apiBase = getLeafApiBaseUrl(env)
      
      try {
        // Tentar endpoint de usuários se existir
        const response = await axios.get(`${apiBase}/api/users`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.data && Array.isArray(response.data)) {
          setLeafUsers(response.data)
        }
      } catch (error) {
        // Se o endpoint não existir, buscar unique leafUserIds dos batches
        console.log('Endpoint /api/users não disponível, buscando de batches...')
        
        // Buscar batches para extrair leafUserIds únicos
        const batchUrl = leafApiUrl('/api/batch', env)
        const batchResponse = await axios.get(batchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        const batches = Array.isArray(batchResponse.data) ? batchResponse.data : []
        const uniqueUserIds = new Set()
        
        // Extrair leafUserIds únicos dos batches
        batches.forEach((batch, index) => {
          // IMPORTANTE: Usar batch.leafUserId, NÃO o índice
          if (batch && batch.leafUserId !== null && batch.leafUserId !== undefined && batch.leafUserId !== '') {
            const userId = String(batch.leafUserId).trim()
            // Garantir que não é um número simples (pode ser UUID ou outro formato válido)
            if (userId && userId.length > 0) {
              console.log(`📋 Batch[${index}] leafUserId encontrado:`, userId, 'tipo original:', typeof batch.leafUserId, 'tipo após conversão:', typeof userId)
              // Verificar que não estamos pegando o índice acidentalmente
              if (String(index) !== userId) {
                uniqueUserIds.add(userId)
              } else {
                console.warn(`⚠️ Ignorando índice ${index} que seria confundido com leafUserId`)
              }
            }
          }
        })
        
        // Buscar também de arquivos (sem leafUserId para pegar todos)
        try {
          const filesUrl = leafApiUrl('/api/v2/files', env)
          const filesResponse = await axios.get(filesUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            params: {
              page: 0,
              size: 100
              // Não passar leafUserId aqui para buscar de todos os usuários
            }
          })
          
          const files = Array.isArray(filesResponse.data) 
            ? filesResponse.data 
            : (filesResponse.data?.content || [])
          
          files.forEach((file, index) => {
            // IMPORTANTE: Usar file.leafUserId, NÃO o índice
            if (file && file.leafUserId !== null && file.leafUserId !== undefined && file.leafUserId !== '') {
              const userId = String(file.leafUserId).trim()
              // Garantir que não é um número simples ou índice
              if (userId && userId.length > 0) {
                console.log(`📁 File[${index}] leafUserId encontrado:`, userId, 'tipo original:', typeof file.leafUserId)
                // Verificar que não estamos pegando o índice acidentalmente
                if (String(index) !== userId) {
                  uniqueUserIds.add(userId)
                } else {
                  console.warn(`⚠️ Ignorando índice ${index} que seria confundido com leafUserId`)
                }
              }
            }
          })
        } catch (err) {
          console.log('Erro ao buscar arquivos para extrair leafUserIds:', err)
        }
        
        // Função para validar UUID
        const isValidUUID = (str) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          return uuidRegex.test(String(str))
        }
        
        // Converter para array de objetos
        // Aceitar UUIDs e também IDs numéricos/outros formatos que venham da API
        const usersList = Array.from(uniqueUserIds)
          .map((id, idx) => {
            const idStr = String(id).trim()
            // Verificar novamente que não é o índice
            if (String(idx) === idStr) {
              console.warn(`⚠️ Ignorando ID que coincide com índice ${idx}`)
              return null
            }
            
            console.log(`✅ Adicionando leafUserId à lista:`, idStr, 'índice:', idx)
            
            return {
              id: idStr, // SEMPRE preservar o ID completo aqui
              name: isValidUUID(idStr) ? (idStr.substring(0, 8) + '...') : idStr,
              displayName: isValidUUID(idStr) ? `User ${idStr.substring(0, 8)}` : `User ${idStr}`
            }
          })
          .filter(Boolean) // Remover nulls
        
        // Adicionar o usuário padrão se não estiver na lista
        const defaultUserId = '453b3bd5-85d6-46b0-b5b7-2d4698f48307'
        if (!usersList.find(u => u.id === defaultUserId)) {
          usersList.unshift({
            id: defaultUserId,
            name: 'Default User',
            displayName: 'Default User'
          })
        }
        
        setLeafUsers(usersList)
        
        // Manter o selectedLeafUserId atual se estiver na lista de usuários encontrados
        // ou se for o padrão
        if (selectedLeafUserId && usersList.length > 0) {
          const userExists = usersList.find(u => u.id === selectedLeafUserId)
          if (!userExists && selectedLeafUserId !== defaultUserId) {
            // Se o usuário selecionado não existir na lista, usar o primeiro da lista
            // ou manter o padrão se a lista estiver vazia
            if (usersList.length > 0) {
              setSelectedLeafUserId(usersList[0].id)
            } else {
              setSelectedLeafUserId(defaultUserId)
            }
          }
        } else if (!selectedLeafUserId || selectedLeafUserId.trim().length === 0) {
          // Se não houver seleção, usar o primeiro da lista ou padrão
          if (usersList.length > 0) {
            setSelectedLeafUserId(usersList[0].id)
          } else {
            setSelectedLeafUserId(defaultUserId)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar Leaf Users:', error)
      // Fallback para usuário padrão
      setLeafUsers([{
        id: '453b3bd5-85d6-46b0-b5b7-2d4698f48307',
        name: 'Default User',
        displayName: 'Default User'
      }])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Buscar usuários quando token estiver disponível
  useEffect(() => {
    if (token && getEnvironment) {
      fetchLeafUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, getEnvironment])

  // Salvar seleção no localStorage
  useEffect(() => {
    if (selectedLeafUserId) {
      try {
        localStorage.setItem('selected_leaf_user_id', selectedLeafUserId)
      } catch (e) {
        console.warn('Erro ao salvar no localStorage:', e)
      }
    }
  }, [selectedLeafUserId])

  const value = {
    selectedLeafUserId,
    setSelectedLeafUserId,
    leafUsers,
    loadingUsers,
    refreshUsers: fetchLeafUsers
  }

  return <LeafUserContext.Provider value={value}>{children}</LeafUserContext.Provider>
}

