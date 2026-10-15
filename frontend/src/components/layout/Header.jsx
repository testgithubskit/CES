import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, FileText, LogOut, Package, Search } from 'lucide-react'
import { useAuth } from '../../hooks/use-auth'
import { ThemeSwitcher } from './ThemeSwitcher'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import { Dialog, DialogContent } from '../ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { CommandSearch } from '../spectrumui/command-search'
import { productsService } from '../../services/api/products'

const pages = [
  { label: 'Products', href: '/products', icon: <Package /> },
  { label: 'Report', href: '/reports', icon: <FileText /> },
  { label: 'Configuration', href: '/configuration?tab=work-centers', icon: <Factory /> },
]

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState([])

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    productsService.getAll().then((data) => {
      setProducts(Array.isArray(data) ? data : data.items || [])
    }).catch(() => setProducts([]))
  }, [open])

  const getInitials = (name) => {
    if (!name) return 'U'
    return name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2)
  }

  const groups = [
    { label: 'Pages', items: pages },
    {
      label: 'Products',
      items: products.map((product) => ({
        label: `${product.product_number} ${product.product_name} ${Object.values(product.custom_fields || {}).filter(Boolean).join(' ')}`.trim(),
        href: `/products/${product.id}`,
        icon: <Package />,
      })),
    },
  ]

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
      <Button variant="outline" className="h-8 w-72 justify-start text-muted-foreground" onClick={() => setOpen(true)}>
        <Search className="h-4 w-4" />
        Search
        <span className="ml-auto text-[10px] uppercase tracking-wide">Ctrl K</span>
      </Button>
      <div className="flex items-center gap-2">
        <ThemeSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {getInitials(user?.name || user?.email)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52" align="end">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{user?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.role || 'user'}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl border-0 bg-transparent p-0 shadow-none">
          <CommandSearch
            autoType={false}
            query=""
            placeholder="Search pages and products"
            height={420}
            groups={groups}
            onSelect={(item) => {
              if (item.href) navigate(item.href)
              setOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>
    </header>
  )
}
