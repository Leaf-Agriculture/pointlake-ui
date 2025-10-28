import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('leaf_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('leaf_token')
    if (storedToken) {
      setToken(storedToken)
    }
    setLoading(false)
  }, [])

  const login = async (username, password, rememberMe = true, environment = 'prod') => {
    try {
      const response = await axios.post('/api/authenticate', {
        username,
        password,
        rememberMe: rememberMe ? 'true' : 'false',
        environment
      })

      const { id_token } = response.data
      setToken(id_token)
      localStorage.setItem('leaf_token', id_token)
      localStorage.setItem('leaf_environment', environment)
      return { success: true }
    } catch (error) {
      console.error('Erro no login:', error)
      let errorMessage = 'Erro ao fazer login'
      
      if (error.response?.data) {
        const data = error.response.data
        if (typeof data === 'string') {
          errorMessage = data
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        } else if (data.message) {
          errorMessage = data.message
        } else {
          errorMessage = JSON.stringify(data)
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      return { 
        success: false, 
        error: errorMessage
      }
    }
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem('leaf_token')
    // Manter ambiente selecionado
  }
  
  const getEnvironment = () => {
    return localStorage.getItem('leaf_environment') || 'prod'
  }

  const value = {
    token,
    login,
    logout,
    loading,
    isAuthenticated: !!token,
    getEnvironment
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

