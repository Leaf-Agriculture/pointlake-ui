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
    return localStorage.getItem('selected_leaf_user_id') || '453b3bd5-85d6-46b0-b5b7-2d4698f48307'
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
        batches.forEach(batch => {
          if (batch.leafUserId) {
            uniqueUserIds.add(String(batch.leafUserId))
          }
        })
        
        // Buscar também de arquivos
        try {
          const filesUrl = leafApiUrl('/api/v2/files', env)
          const filesResponse = await axios.get(filesUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            params: {
              page: 0,
              size: 100
            }
          })
          
          const files = Array.isArray(filesResponse.data) 
            ? filesResponse.data 
            : (filesResponse.data?.content || [])
          
          files.forEach(file => {
            if (file.leafUserId) {
              uniqueUserIds.add(String(file.leafUserId))
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
        
        // Converter para array de objetos, filtrando apenas UUIDs válidos
        const usersList = Array.from(uniqueUserIds)
          .map(id => String(id))
          .filter(id => isValidUUID(id)) // Filtrar apenas UUIDs válidos
          .map(idStr => ({
            id: idStr,
            name: idStr.substring(0, 8) + '...', // Nome curto baseado no ID
            displayName: `User ${idStr.substring(0, 8)}`
          }))
        
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
        
        // Se o selectedLeafUserId atual não for um UUID válido, resetar para o padrão
        if (!isValidUUID(selectedLeafUserId)) {
          setSelectedLeafUserId(defaultUserId)
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
      localStorage.setItem('selected_leaf_user_id', selectedLeafUserId)
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

