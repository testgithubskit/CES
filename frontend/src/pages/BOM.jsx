import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { ArrowRight, TreeDeciduous } from 'lucide-react'

export function BOM() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bill of Materials</h1>
        <p className="text-muted-foreground">View and manage product BOM structures</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>Navigate to product BOM views</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TreeDeciduous className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Select a product from the Products page to view its BOM structure
            </p>
            <Link to="/products">
              <Button className="bg-brand-500 hover:bg-brand-600">
                Go to Products <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
