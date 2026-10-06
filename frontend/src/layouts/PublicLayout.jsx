import { Outlet } from 'react-router-dom'

export function PublicLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-900 dark:to-brand-950">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
