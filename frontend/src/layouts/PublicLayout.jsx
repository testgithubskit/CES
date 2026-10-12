import { Outlet } from 'react-router-dom'
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher'

export function PublicLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="absolute top-6 right-6 z-10">
        <ThemeSwitcher />
      </div>
      <div className="relative z-10 w-full max-w-md px-4">
        <Outlet />
      </div>
    </div>
  )
}
