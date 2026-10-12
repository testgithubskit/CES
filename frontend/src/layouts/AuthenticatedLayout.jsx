import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/layout/Sidebar'

export function AuthenticatedLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background p-4">
        <Outlet />
      </main>
    </div>
  )
}
