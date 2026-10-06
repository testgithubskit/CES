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
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex h-16 items-center border-b border-gray-200 px-6 dark:border-gray-700">
        <h1 className="text-xl font-bold text-brand-500">CES</h1>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Cost Estimation</span>
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
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
        <div className="mt-6 space-y-1">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">Configuration</p>
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
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
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
