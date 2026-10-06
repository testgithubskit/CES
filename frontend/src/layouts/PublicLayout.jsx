import { Outlet } from 'react-router-dom'
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher'

export function PublicLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-blue-50 to-brand-100 dark:from-gray-900 dark:via-gray-800 dark:to-brand-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-200/30 dark:bg-brand-700/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/30 dark:bg-blue-700/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="absolute top-6 right-6 z-10">
        <ThemeSwitcher />
      </div>

      <div className="w-full max-w-md px-4 relative z-10">
        <Outlet />
      </div>
    </div>
  )
}
