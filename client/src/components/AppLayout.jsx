import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import SidebarMenu from './SidebarMenu'

const AppLayout = ({ children, showSidebar = true }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { logout, isAuthenticated } = useAuth()

  // Fechar sidebar automaticamente em mobile quando redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fechar sidebar quando clicar fora (mobile)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector('[data-sidebar]')
        const hamburger = document.querySelector('[data-hamburger]')
        if (sidebar && !sidebar.contains(event.target) && hamburger && !hamburger.contains(event.target)) {
          setIsSidebarOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSidebarOpen])

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  if (!isAuthenticated) {
    return children
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      {showSidebar && (
        <div data-sidebar>
          <SidebarMenu isOpen={isSidebarOpen} onToggle={toggleSidebar} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-zinc-900 border-b border-zinc-700 px-4 py-3 flex items-center justify-between">
          {/* Hamburger Menu */}
          {showSidebar && (
            <button
              data-hamburger
              onClick={toggleSidebar}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors md:hidden"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Spacer for mobile */}
          {!showSidebar && <div className="w-10 md:w-0"></div>}

          {/* User Menu */}
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-sm text-zinc-400">
                Point Lake GIS Studio
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm bg-zinc-800 text-zinc-300 rounded hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
