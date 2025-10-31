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

  // Função para criar um novo Point Lake User
  const createLeafUser = async (name, email) => {
    if (!token) return { success: false, error: 'No authentication token' }

    setLoadingUsers(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const usersApiUrl = `${getUserManagementApiUrl(env)}/users`
      
      console.log('➕ Creating new Point Lake User:', { name, email })
      
      const response = await axios.post(usersApiUrl, {
        name: name || undefined,
        email: email || undefined
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      })
      
      console.log('✅ Point Lake User created:', response.data)
      
      // Recarregar lista de usuários
      await fetchLeafUsers()
      
      return { success: true, user: response.data }
    } catch (error) {
      console.error('❌ Error creating Point Lake User:', error)
      console.error('  - URL:', error.config?.url)
      console.error('  - Status:', error.response?.status)
      console.error('  - Data:', error.response?.data)
      
      let errorMessage = 'Error creating user'
      if (error.response?.data) {
        const data = error.response.data
        if (typeof data === 'string') {
          errorMessage = data
        } else if (data.message) {
          errorMessage = data.message
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return { success: false, error: errorMessage }
    } finally {
      setLoadingUsers(false)
    }
  }

  // Função para buscar lista de Point Lake Users do endpoint correto
  const fetchLeafUsers = async () => {
    if (!token) return

    setLoadingUsers(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      
      // Usar o endpoint correto de User Management
      const usersApiUrl = `${getUserManagementApiUrl(env)}/users`
      
      console.log('🔍 Searching for Point Lake Users from:', usersApiUrl)
      
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
          name: user.name || user.apiOwnerUsername || user.email || 'No name',
          displayName: user.name || user.apiOwnerUsername || user.email || `User ${String(user.id || '').substring(0, 8)}`,
          email: user.email || null,
          apiOwnerUsername: user.apiOwnerUsername || null
        }))
        
        console.log('✅ Point Lake Users found:', usersList.length, usersList)
        
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
      console.error('❌ Error fetching Point Lake Users:', error)
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
        refreshUsers: fetchLeafUsers,
        createLeafUser
      }

  return <LeafUserContext.Provider value={value}>{children}</LeafUserContext.Provider>
}

