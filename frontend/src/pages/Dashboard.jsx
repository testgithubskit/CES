import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Package, TreeDeciduous, Settings, Calculator, ArrowRight } from 'lucide-react'

export function Dashboard() {
  const quickActions = [
    {
      title: 'Products',
      description: 'Manage your product catalog',
      icon: Package,
      href: '/products',
      color: 'bg-brand-500',
    },
    {
      title: 'BOM',
      description: 'View and manage Bill of Materials',
      icon: TreeDeciduous,
      href: '/bom',
      color: 'bg-brand-600',
    },
    {
      title: 'Process Plan',
      description: 'Configure manufacturing operations',
      icon: Settings,
      href: '/process-plan',
      color: 'bg-brand-700',
    },
    {
      title: 'Cost Estimation',
      description: 'Calculate product costs',
      icon: Calculator,
      href: '/cost-estimation',
      color: 'bg-brand-800',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to CES - Cost Estimation Software</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Card key={action.title} className="transition-all hover:shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
                <div className={`p-2 rounded-lg ${action.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-4">{action.description}</p>
                <Link to={action.href}>
                  <Button variant="ghost" size="sm" className="w-full">
                    Open <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Quick guide to get started with CES</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-semibold">Create Products</h3>
              <p className="text-sm text-muted-foreground">Add your products to the catalog</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-semibold">Build BOM</h3>
              <p className="text-sm text-muted-foreground">Define assemblies, subassemblies, and parts</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-semibold">Configure Process Plans</h3>
              <p className="text-sm text-muted-foreground">Set up manufacturing operations and machine assignments</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white font-bold text-sm">
              4
            </div>
            <div>
              <h3 className="font-semibold">Calculate Costs</h3>
              <p className="text-sm text-muted-foreground">Estimate product costs using MHR calculations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
