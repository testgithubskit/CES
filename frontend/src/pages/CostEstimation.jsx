import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Calculator, DollarSign, FileText, Download } from 'lucide-react'
import { toast } from 'sonner'
import { productsService } from '../services/api/products'
import { costEstimationService } from '../services/api/costEstimation'
import { downloadFile } from '../utils/download'

export function CostEstimation() {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [calculationData, setCalculationData] = useState({
    quantity: 1,
    additional_costs: 0,
    include_overhead: true,
  })
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await productsService.getAll()
      setProducts(data.items || data)
    } catch (error) {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product')
      return
    }
    setCalculating(true)
    try {
      const response = await costEstimationService.calculateProductCost(selectedProduct, calculationData)
      setResult(response)
      toast.success('Cost calculated successfully')
    } catch (error) {
      toast.error('Failed to calculate cost')
    } finally {
      setCalculating(false)
    }
  }

  const handleExportPDF = async () => {
    if (!result) return
    try {
      const blob = await costEstimationService.exportToPDF(selectedProduct, result.calculation_id)
      downloadFile(blob, `cost-estimation-${selectedProduct}.pdf`)
      toast.success('PDF exported successfully')
    } catch (error) {
      toast.error('Failed to export PDF')
    }
  }

  const handleExportExcel = async () => {
    if (!result) return
    try {
      const blob = await costEstimationService.exportToExcel(selectedProduct, result.calculation_id)
      downloadFile(blob, `cost-estimation-${selectedProduct}.xlsx`)
      toast.success('Excel exported successfully')
    } catch (error) {
      toast.error('Failed to export Excel')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cost Estimation</h1>
        <p className="text-muted-foreground">Calculate product costs based on MHR and operations</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Calculation Parameters</CardTitle>
            <CardDescription>Select product and define calculation parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={calculationData.quantity}
                onChange={(e) => setCalculationData({ ...calculationData, quantity: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additional_costs">Additional Costs ($)</Label>
              <Input
                id="additional_costs"
                type="number"
                step="0.01"
                value={calculationData.additional_costs}
                onChange={(e) => setCalculationData({ ...calculationData, additional_costs: parseFloat(e.target.value) })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include_overhead"
                checked={calculationData.include_overhead}
                onChange={(e) => setCalculationData({ ...calculationData, include_overhead: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="include_overhead">Include Overhead</Label>
            </div>
            <Button onClick={handleCalculate} disabled={calculating || !selectedProduct} className="w-full bg-brand-500 hover:bg-brand-600">
              {calculating ? 'Calculating...' : 'Calculate Cost'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Summary</CardTitle>
            <CardDescription>Estimated cost breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Material Cost</span>
                  <span className="font-medium">${result.material_cost?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Labor Cost</span>
                  <span className="font-medium">${result.labor_cost?.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Overhead Cost</span>
                  <span className="font-medium">${result.overhead_cost?.toFixed(2) || 0}</span>
                </div>
                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="font-semibold">Total Cost (per unit)</span>
                  <span className="text-2xl font-bold text-brand-500">${result.total_cost?.toFixed(2) || 0}</span>
                </div>
                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="font-semibold">Total Cost ({calculationData.quantity} units)</span>
                  <span className="text-xl font-bold">${(result.total_cost * calculationData.quantity)?.toFixed(2) || 0}</span>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleExportPDF} variant="outline" className="flex-1">
                    <FileText className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button onClick={handleExportExcel} variant="outline" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
                <Link to={`/cost-estimation/${selectedProduct}/${result.calculation_id}`}>
                  <Button variant="ghost" className="w-full">
                    View Detailed Breakdown
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a product and calculate to see cost summary</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
