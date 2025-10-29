import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [environment, setEnvironment] = useState(() => {
    return localStorage.getItem('leaf_environment') || 'prod'
  })
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleEnvironmentChange = (env) => {
    setEnvironment(env)
    localStorage.setItem('leaf_environment', env)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Armazenar ambiente selecionado
    localStorage.setItem('leaf_environment', environment)

    const result = await login(username, password, rememberMe, environment)
    
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error || 'Erro ao fazer login')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="bg-zinc-900 p-8 rounded-lg shadow-2xl border border-zinc-800 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-lg font-bold">L</span>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-100">Point Lake GIS Studio</h1>
          </div>
          <p className="text-zinc-400">Authentication with Point Lake API</p>
        </div>

        {/* Seletor de Ambiente */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Ambiente
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleEnvironmentChange('dev')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition duration-150 border ${
                environment === 'dev'
                  ? 'bg-orange-950 text-orange-300 border-orange-800'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-300'
              }`}
            >
              DEV
            </button>
            <button
              type="button"
              onClick={() => handleEnvironmentChange('prod')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition duration-150 border ${
                environment === 'prod'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-300'
              }`}
            >
              PROD
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {environment === 'dev' ? 'Desenvolvimento' : 'Produção'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-zinc-300 mb-2">
              Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-100 placeholder-zinc-500"
              placeholder="Digite seu usuário"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-zinc-100 placeholder-zinc-500"
              placeholder="Digite sua senha"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-700 rounded bg-zinc-800"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-zinc-300">
              Manter conectado (30 dias)
            </label>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-blue-500"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              )}
              {loading ? 'Autenticando...' : 'Entrar'}
            </span>
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          <p>Login with your Point Lake credentials</p>
          <a 
            href="https://learn.withleaf.io/docs/authentication" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 hover:underline transition duration-150"
          >
            Ver documentação da API
          </a>
        </div>
      </div>
    </div>
  )
}

export default Login

