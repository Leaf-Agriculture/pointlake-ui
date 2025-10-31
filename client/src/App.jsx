import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FileQueryWindow from './pages/FileQueryWindow'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { LeafUserProvider } from './context/LeafUserContext'

function App() {
  // Detectar base path para produção no GitHub Pages
  const basename = import.meta.env.PROD ? '/pointlake-ui' : ''
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LeafUserProvider>
          <Router basename={basename}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/file/:fileId" element={<FileQueryWindow />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </LeafUserProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

