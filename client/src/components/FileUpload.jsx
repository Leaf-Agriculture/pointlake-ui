import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLeafUser } from '../context/LeafUserContext'
import axios from 'axios'
import { leafApiUrl } from '../config/api'

function FileUpload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [conversionId, setConversionId] = useState(null)
  const [conversionStatus, setConversionStatus] = useState(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [batches, setBatches] = useState(null)
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const { token, getEnvironment } = useAuth()
  const { selectedLeafUserId } = useLeafUser()

  const loadBatches = async () => {
    if (!selectedLeafUserId) return
    setLoadingBatches(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl('/api/batch', env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          leafUserId: String(selectedLeafUserId).trim()
        }
      })
      
      setBatches(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      console.error('Erro ao carregar batches:', err)
      setBatches([])
    } finally {
      setLoadingBatches(false)
    }
  }

  const loadFiles = async () => {
    if (!selectedLeafUserId) return
    setLoadingFiles(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl('/api/v2/files', env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          leafUserId: String(selectedLeafUserId).trim(),
          page: 0,
          size: 100
        }
      })
      
      setFiles(Array.isArray(response.data) ? response.data : (response.data?.content || []))
    } catch (err) {
      console.error('Erro ao carregar arquivos:', err)
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  // Carregar batches e arquivos ao montar o componente e quando Leaf User mudar
  useEffect(() => {
    if (token && getEnvironment && selectedLeafUserId) {
      loadBatches()
      loadFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedLeafUserId])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    setError('')
    setSuccess('')
    
    if (selectedFile) {
        if (!selectedFile.name.endsWith('.zip')) {
          setError('Only ZIP files are allowed')
          setFile(null)
          return
        }
        
        if (selectedFile.size > 50 * 1024 * 1024) {
          setError('File is too large. Maximum 50MB')
          setFile(null)
          return
        }
      
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a ZIP file')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Função para validar ID do usuário
      const isValidUserId = (str) => {
        if (!str || String(str).trim().length === 0) return false
        return true // Aceitar qualquer ID que a API retornar
      }

      if (!selectedLeafUserId || !isValidUserId(selectedLeafUserId)) {
        setError('Please select a valid Leaf User')
        setUploading(false)
        return
      }

      const env = getEnvironment ? getEnvironment() : 'prod'
      const baseUrl = leafApiUrl('/api/upload', env)
      const apiUrl = `${baseUrl}?leafUserId=${encodeURIComponent(selectedLeafUserId)}&provider=Other`
      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          console.log('Progress:', progressEvent.loaded / progressEvent.total * 100)
        }
      })

      const batchId = response.data?.id || null
      setConversionId(batchId)
      setConversionStatus(null)
      
      setSuccess('File uploaded successfully! ID: ' + (batchId || 'N/A'))
      setFile(null)
      
      // Buscar lista de batches e arquivos após upload bem-sucedido
      if (batchId) {
        await loadBatches()
        await loadFiles()
      }
      
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) fileInput.value = ''
    } catch (err) {
      console.error('Erro no upload:', err)
      let errorMessage = 'Error uploading file'
      
      if (err.response?.data) {
        const data = err.response.data
        if (typeof data === 'string') {
          errorMessage = data
        } else if (data.detail) {
          errorMessage = data.detail
        } else if (data.message) {
          errorMessage = data.message
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        } else {
          errorMessage = JSON.stringify(data)
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const handleCheckStatus = async () => {
    if (!conversionId) {
      setError('No upload found')
      return
    }

    setCheckingStatus(true)
    setError('')
    setConversionStatus(null)

    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const apiUrl = leafApiUrl(`/api/batch/${conversionId}`, env)
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      setConversionStatus(response.data)
    } catch (err) {
      console.error('Erro ao verificar status:', err)
      let errorMessage = 'Error checking conversion status'
      
      if (err.response?.data) {
        const data = err.response.data
        if (typeof data === 'string') {
          errorMessage = data
        } else if (data.detail) {
          errorMessage = data.detail
        } else if (data.message) {
          errorMessage = data.message
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error)
        } else {
          errorMessage = JSON.stringify(data)
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    } finally {
      setCheckingStatus(false)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-2">
          Select a ZIP file
        </label>
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 file:cursor-pointer disabled:opacity-50 bg-zinc-800 border border-zinc-700 rounded-lg p-2"
        />
        {file && (
          <p className="mt-2 text-xs text-zinc-300">
            Selected: <strong className="text-emerald-400">{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-emerald-600 text-white py-1.5 rounded text-xs font-medium hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-emerald-500"
      >
        <span className="flex items-center justify-center gap-2">
          {uploading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
          {uploading ? 'Uploading...' : 'Upload File'}
        </span>
      </button>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="bg-emerald-900 border border-emerald-700 text-emerald-200 px-4 py-3 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {success}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload
