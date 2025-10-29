import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { LeafUserProvider } from './context/LeafUserContext'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LeafUserProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </LeafUserProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

