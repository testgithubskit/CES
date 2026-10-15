import { Link, useLocation } from 'react-router-dom'
import { FileText, LogOut, Moon, Package, Settings, Sun } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../hooks/use-auth'
import { useTheme } from '../../hooks/use-theme'
import { Button } from '../ui/button'
import { Hint } from '../ui/tooltip'
import { Logo } from '../common/Logo'

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const productsActive = location.pathname === '/products' || location.pathname.startsWith('/products/')
  const configActive = location.pathname.startsWith('/configuration')
  const reportsActive = location.pathname.startsWith('/reports')

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-background">
      <div className="flex h-16 items-center gap-2 border-b border-border px-3">
        <Logo className="h-14 w-36 shrink-0" />
        
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <Link
          to="/products"
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-base',
            productsActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
          )}
        >
          <Package className="h-4 w-4" />
          Products
        </Link>
        <Link
          to="/reports"
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-base',
            reportsActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
          )}
        >
          <FileText className="h-4 w-4" />
          Report
        </Link>
        <Link
          to="/configuration?tab=work-centers"
          className={cn(
            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-base',
            configActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
          )}
        >
          <Settings className="h-4 w-4" />
          Configuration
        </Link>
      </nav>
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{user?.name || 'User'}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.role || 'user'}</p>
        </div>
        <div className="flex items-center">
          <Hint label={theme === 'dark' ? 'Light theme' : 'Dark theme'}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </Hint>
          <Hint label="Log out">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </Hint>
        </div>
      </div>
    </div>
  )
}
