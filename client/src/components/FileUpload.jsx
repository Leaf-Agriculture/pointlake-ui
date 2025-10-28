import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

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

  const loadBatches = async () => {
    setLoadingBatches(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get('/api/batch', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
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
    setLoadingFiles(true)
    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get('/api/v2/files?page=0&size=100', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
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

  // Carregar batches e arquivos ao montar o componente
  useEffect(() => {
    if (token && getEnvironment) {
      loadBatches()
      loadFiles()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    setError('')
    setSuccess('')
    
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Apenas arquivos ZIP são permitidos')
        setFile(null)
        return
      }
      
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('O arquivo é muito grande. Máximo 50MB')
        setFile(null)
        return
      }
      
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo ZIP')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
          'x-environment': env
        },
        onUploadProgress: (progressEvent) => {
          console.log('Progress:', progressEvent.loaded / progressEvent.total * 100)
        }
      })

      const batchId = response.data?.id || null
      setConversionId(batchId)
      setConversionStatus(null)
      
      setSuccess('Arquivo enviado com sucesso! ID: ' + (batchId || 'N/A'))
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
      let errorMessage = 'Erro ao fazer upload do arquivo'
      
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
      setError('Nenhum upload encontrado')
      return
    }

    setCheckingStatus(true)
    setError('')
    setConversionStatus(null)

    try {
      const env = getEnvironment ? getEnvironment() : 'prod'
      const response = await axios.get(`/api/batch/${conversionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-environment': env
        }
      })

      setConversionStatus(response.data)
    } catch (err) {
      console.error('Erro ao verificar status:', err)
      let errorMessage = 'Erro ao verificar status da conversão'
      
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

      {conversionId && (
        <div>
          <button
            onClick={handleCheckStatus}
            disabled={checkingStatus}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 border border-blue-500"
          >
            <span className="flex items-center justify-center gap-2">
              {checkingStatus ? (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              )}
              {checkingStatus ? 'Checking...' : 'Check Processing Status'}
            </span>
          </button>

          {conversionStatus && (
            <div className="mt-4 bg-slate-700 border border-slate-600 rounded-lg p-4">
              <h3 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Conversion Status
              </h3>
              <div className="space-y-2">
                {conversionStatus.status && (
                  <p className="text-sm">
                    <span className="font-semibold text-slate-300">Status:</span>{' '}
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      conversionStatus.status === 'completed' ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' :
                      conversionStatus.status === 'processing' ? 'bg-orange-900 text-orange-300 border border-orange-700' :
                      conversionStatus.status === 'failed' ? 'bg-red-900 text-red-300 border border-red-700' :
                      'bg-slate-600 text-slate-300 border border-slate-500'
                    }`}>
                      {conversionStatus.status.toUpperCase()}
                    </span>
                  </p>
                )}
                {conversionStatus.id && (
                  <p className="text-sm">
                    <span className="font-semibold text-slate-300">ID:</span> 
                    <span className="text-slate-400 font-mono ml-1">{conversionStatus.id}</span>
                  </p>
                )}
                {conversionStatus.createdAt && (
                  <p className="text-sm">
                    <span className="font-semibold text-slate-300">Created:</span> 
                    <span className="text-slate-400 ml-1">{new Date(conversionStatus.createdAt).toLocaleString()}</span>
                  </p>
                )}
              </div>
              <pre className="mt-3 text-xs bg-slate-800 border border-slate-600 p-2 rounded overflow-auto max-h-40 text-slate-300">
                {JSON.stringify(conversionStatus, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tabela de Uploads */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Meus Uploads</h3>
          <button
            onClick={async () => { await loadBatches(); await loadFiles(); }}
            disabled={loadingBatches || loadingFiles}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {(loadingBatches || loadingFiles) ? '⏳ Carregando...' : '🔄 Atualizar Lista'}
          </button>
        </div>

        {batches && batches.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Nome do Arquivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Arquivos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {batch.fileName || 'Sem nome'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">
                        {batch.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {batch.uploadTimestamp 
                          ? new Date(batch.uploadTimestamp).toLocaleString('pt-BR')
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        batch.status === 'PROCESSED' || batch.status === 'completed' 
                          ? 'bg-green-100 text-green-800' :
                        batch.status === 'FAILED' || batch.status === 'failed' 
                          ? 'bg-red-100 text-red-800' :
                        batch.status === 'processing' 
                          ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {batch.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {batch.leafFiles && batch.leafFiles.length > 0 
                          ? `${batch.leafFiles.length} arquivo(s)`
                          : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">Nenhum upload encontrado</p>
            <p className="text-xs text-gray-500 mt-1">Faça upload de um arquivo ZIP para começar</p>
          </div>
        )}
      </div>

      {/* Tabela de Arquivos Processados */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Arquivos Processados</h3>
        </div>

        {files && files.length > 0 ? (
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Nome
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Tamanho
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Data
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                    Tipo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.slice(0, 10).map((file, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {file.name || file.filename || 'Sem nome'}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {file.size ? `${(file.size / 1024).toFixed(2)} KB` : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {file.createdDate 
                        ? new Date(file.createdDate).toLocaleString('pt-BR')
                        : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {file.type || file.mimeType || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">Nenhum arquivo processado encontrado</p>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <p className="font-semibold mb-1">Informações sobre upload:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Apenas arquivos ZIP são aceitos</li>
          <li>Tamanho máximo: 50MB</li>
          <li>O arquivo será processado pela API Leaf</li>
          <li>Formatos aceitos: arquivos de máquinas agrícolas</li>
        </ul>
      </div>
    </div>
  )
}

export default FileUpload
