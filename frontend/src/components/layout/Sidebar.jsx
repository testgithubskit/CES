import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Calculator01Icon,
  ChevronDownIcon,
  Factory01Icon,
  Logout01Icon,
  Moon02Icon,
  Package01Icon,
  Settings01Icon,
  Sun03Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/use-auth'
import { useTheme } from '../../hooks/use-theme'
import { Button } from '../ui/button'

const configNavigation = [
  { name: 'Work Centers', href: '/configuration/work-centers', icon: Factory01Icon },
  { name: 'Customers', href: '/configuration/customers', icon: UserGroupIcon },
  { name: 'MHR', href: '/configuration/mhr', icon: Calculator01Icon },
  { name: 'Access Control', href: '/configuration/access-control', icon: Settings01Icon },
]

function NavIcon({ icon }) {
  return <HugeiconsIcon icon={icon} size={16} strokeWidth={1.75} />
}

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const configActive = location.pathname.startsWith('/configuration')
  const [configOpen, setConfigOpen] = useState(configActive)

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)

  return (
    <div className="flex h-full w-60 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h1 className="font-heading text-base font-bold tracking-tight">CES</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <Link
          to="/products"
          className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 text-sm',
            isActive('/products') ? 'bg-foreground text-background' : 'text-foreground hover:bg-accent'
          )}
        >
          <NavIcon icon={Package01Icon} />
          Products
        </Link>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setConfigOpen((open) => !open)}
            className={cn(
              'flex w-full items-center gap-2 px-2.5 py-1.5 text-sm',
              configActive ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent'
            )}
          >
            <NavIcon icon={Settings01Icon} />
            Configuration
            <HugeiconsIcon icon={ChevronDownIcon} size={14} className={cn('ml-auto transition-transform', configOpen && 'rotate-180')} />
          </button>
          {configOpen && (
            <div className="mt-1 space-y-0.5 pl-2">
              {configNavigation.filter((item) => item.name !== 'Access Control' || String(user?.role || '').toLowerCase() === 'admin').map((item) => {
                const active = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 text-sm',
                      active ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <NavIcon icon={item.icon} />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </nav>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user?.name || 'User'}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.role || 'user'}</p>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} aria-label="Toggle theme">
            <HugeiconsIcon icon={theme === 'dark' ? Sun03Icon : Moon02Icon} size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} aria-label="Log out">
            <HugeiconsIcon icon={Logout01Icon} size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
