import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard,
  Package,
  TreeDeciduous,
  Settings,
  Calculator,
  Factory,
  Users,
  Cog,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'BOM', href: '/bom', icon: TreeDeciduous },
  { name: 'Process Plan', href: '/process-plan', icon: Settings },
  { name: 'Configuration', href: '/configuration', icon: Cog },
  { name: 'Cost Estimation', href: '/cost-estimation', icon: Calculator },
]

const configNavigation = [
  { name: 'Work Centers', href: '/configuration/work-centers', icon: Factory },
  { name: 'Machines', href: '/configuration/machines', icon: Cog },
  { name: 'Customers', href: '/configuration/customers', icon: Users },
  { name: 'MHR Configuration', href: '/configuration/mhr', icon: Calculator },
]

export function Sidebar() {
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-brand-500">CES</h1>
        <span className="ml-2 text-sm text-muted-foreground">Cost Estimation</span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-brand-500 text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
        <div className="mt-6 space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase">Configuration</p>
          {configNavigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-brand-500 text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
