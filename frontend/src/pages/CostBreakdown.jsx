import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { ArrowLeft, FileText, Download, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { costEstimationService } from '../services/api/costEstimation'
import { downloadFile } from '../utils/download'

export function CostBreakdown() {
  const { productId, calculationId } = useParams()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCostBreakdown()
  }, [productId, calculationId])

  const loadCostBreakdown = async () => {
    setLoading(true)
    try {
      const data = await costEstimationService.getCostBreakdown(productId, calculationId)
      setResult(data)
    } catch (error) {
      toast.error('Failed to load cost breakdown')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      const blob = await costEstimationService.exportToPDF(productId, calculationId)
      downloadFile(blob, `cost-breakdown-${productId}.pdf`)
      toast.success('PDF exported successfully')
    } catch (error) {
      toast.error('Failed to export PDF')
    }
  }

  const handleExportExcel = async () => {
    try {
      const blob = await costEstimationService.exportToExcel(productId, calculationId)
      downloadFile(blob, `cost-breakdown-${productId}.xlsx`)
      toast.success('Excel exported successfully')
    } catch (error) {
      toast.error('Failed to export Excel')
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/cost-estimation">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cost Breakdown</h1>
            <p className="text-muted-foreground">Detailed cost analysis</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={handleExportExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${result?.material_cost?.toFixed(2) || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${result?.labor_cost?.toFixed(2) || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overhead Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${result?.overhead_cost?.toFixed(2) || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-500">${result?.total_cost?.toFixed(2) || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operation Costs</CardTitle>
          <CardDescription>Cost breakdown by operation</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operation</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>MHR</TableHead>
                <TableHead>Time (min)</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result?.operation_costs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No operation costs available
                  </TableCell>
                </TableRow>
              ) : (
                result?.operation_costs?.map((op, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{op.operation_name}</TableCell>
                    <TableCell>{op.machine_name}</TableCell>
                    <TableCell>${op.mhr?.toFixed(2)}</TableCell>
                    <TableCell>{op.time}</TableCell>
                    <TableCell className="text-right font-medium">${op.cost?.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Part Costs</CardTitle>
          <CardDescription>Cost breakdown by part</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Part</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="text-right">Material Cost</TableHead>
                <TableHead className="text-right">Processing Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result?.part_costs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No part costs available
                  </TableCell>
                </TableRow>
              ) : (
                result?.part_costs?.map((part, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{part.name}</TableCell>
                    <TableCell>{part.material}</TableCell>
                    <TableCell>{part.weight}</TableCell>
                    <TableCell className="text-right">${part.material_cost?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${part.processing_cost?.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">${part.total_cost?.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
