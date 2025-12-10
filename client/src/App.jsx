import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import FileQueryWindow from './pages/FileQueryWindow'
import PointsAnalytics from './pages/PointsAnalytics'
import FieldPerformanceAnalytics from './pages/FieldPerformanceAnalytics'
import SqlAnalytics from './pages/SqlAnalytics'
import ErrorBoundary from './components/ErrorBoundary'
import AppLayout from './components/AppLayout'
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
              <Route path="/dashboard" element={
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              } />
              <Route path="/file/:fileId" element={
                <AppLayout showSidebar={false}>
                  <FileQueryWindow />
                </AppLayout>
              } />
              <Route path="/points-analytics" element={
                <AppLayout>
                  <PointsAnalytics />
                </AppLayout>
              } />
              <Route path="/field-performance" element={
                <AppLayout>
                  <FieldPerformanceAnalytics />
                </AppLayout>
              } />
              <Route path="/sql-analytics" element={
                <AppLayout>
                  <SqlAnalytics />
                </AppLayout>
              } />
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </LeafUserProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

