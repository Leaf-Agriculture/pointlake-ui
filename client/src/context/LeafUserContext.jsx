import React, { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import axios from 'axios'
import { getUserManagementApiUrl } from '../config/api'

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

  // Função para buscar lista de Leaf Users do endpoint correto
  const fetchLeafUsers = async () => {
    if (!token) return

    setLoadingUsers(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      
      // Usar o endpoint correto de User Management
      const usersApiUrl = `${getUserManagementApiUrl(env)}/users`
      
      console.log('🔍 Buscando Leaf Users de:', usersApiUrl)
      
      const response = await axios.get(usersApiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': '*/*'
        }
      })
      
      if (response.data && Array.isArray(response.data)) {
        // A API já retorna um array de objetos com id, name, email, etc.
        const usersList = response.data.map(user => ({
          id: String(user.id || '').trim(),
          name: user.name || user.apiOwnerUsername || user.email || 'Sem nome',
          displayName: user.name || user.apiOwnerUsername || user.email || `User ${String(user.id || '').substring(0, 8)}`,
          email: user.email || null,
          apiOwnerUsername: user.apiOwnerUsername || null
        }))
        
        console.log('✅ Leaf Users encontrados:', usersList.length, usersList)
        
        setLeafUsers(usersList)
        
        // Se não houver usuário selecionado ou o selecionado não estiver na lista, usar o primeiro
        if (usersList.length > 0) {
          const currentExists = usersList.find(u => u.id === selectedLeafUserId)
          if (!currentExists) {
            // Usar o primeiro usuário da lista como padrão
            setSelectedLeafUserId(usersList[0].id)
          }
        }
      } else {
        console.warn('⚠️ Resposta da API não é um array:', response.data)
        setLeafUsers([])
      }
    } catch (error) {
      console.error('❌ Erro ao buscar Leaf Users:', error)
      console.error('  - URL:', error.config?.url)
      console.error('  - Status:', error.response?.status)
      console.error('  - Data:', error.response?.data)
      
      // Fallback para usuário padrão em caso de erro
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

