import { useState, useEffect } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Calculator, DollarSign, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { machinesService } from '../services/api/machines'
import { mhrService } from '../services/api/mhr'

export function MHRConfiguration() {
  const [machines, setMachines] = useState([])
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [parameters, setParameters] = useState({
    labor_cost_per_hour: '',
    overhead_rate: '',
    energy_cost_per_hour: '',
    maintenance_cost_per_hour: '',
    depreciation_per_hour: '',
  })
  const [mhrResult, setMhrResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)

  useEffect(() => {
    loadMachines()
  }, [])

  const loadMachines = async () => {
    setLoading(true)
    try {
      const data = await machinesService.getAll()
      setMachines(data.items || data)
    } catch (error) {
      toast.error('Failed to load machines')
    } finally {
      setLoading(false)
    }
  }

  const handleMachineSelect = async (machineId) => {
    setSelectedMachine(machineId)
    try {
      const config = await mhrService.getMHRConfig(machineId)
      setParameters(config.parameters || {})
      const mhr = await mhrService.getMachineMHR(machineId)
      setMhrResult(mhr)
    } catch (error) {
      console.error('Failed to load MHR config')
    }
  }

  const handleCalculate = async () => {
    if (!selectedMachine) {
      toast.error('Please select a machine')
      return
    }
    setCalculating(true)
    try {
      const result = await mhrService.calculateMHR(selectedMachine, parameters)
      setMhrResult(result)
      toast.success('MHR calculated successfully')
    } catch (error) {
      toast.error('Failed to calculate MHR')
    } finally {
      setCalculating(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!selectedMachine) {
      toast.error('Please select a machine')
      return
    }
    try {
      await mhrService.updateMHRConfig(selectedMachine, parameters)
      toast.success('MHR configuration saved successfully')
    } catch (error) {
      toast.error('Failed to save MHR configuration')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">MHR Configuration</h1>
        <p className="text-muted-foreground">Configure and calculate Machine Hourly Rate (MHR)</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected Machine</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Select value={selectedMachine} onValueChange={handleMachineSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a machine" />
              </SelectTrigger>
              <SelectContent>
                {machines.map((machine) => (
                  <SelectItem key={machine.id} value={machine.id}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current MHR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mhrResult ? `$${mhrResult.mhr_value?.toFixed(2)}` : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {selectedMachine ? 'Ready to calculate' : 'Select a machine to begin'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>MHR Parameters</CardTitle>
            <CardDescription>Enter cost parameters for MHR calculation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="labor_cost_per_hour">Labor Cost per Hour ($)</Label>
              <Input
                id="labor_cost_per_hour"
                type="number"
                step="0.01"
                value={parameters.labor_cost_per_hour}
                onChange={(e) => setParameters({ ...parameters, labor_cost_per_hour: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="overhead_rate">Overhead Rate (%)</Label>
              <Input
                id="overhead_rate"
                type="number"
                step="0.01"
                value={parameters.overhead_rate}
                onChange={(e) => setParameters({ ...parameters, overhead_rate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="energy_cost_per_hour">Energy Cost per Hour ($)</Label>
              <Input
                id="energy_cost_per_hour"
                type="number"
                step="0.01"
                value={parameters.energy_cost_per_hour}
                onChange={(e) => setParameters({ ...parameters, energy_cost_per_hour: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance_cost_per_hour">Maintenance Cost per Hour ($)</Label>
              <Input
                id="maintenance_cost_per_hour"
                type="number"
                step="0.01"
                value={parameters.maintenance_cost_per_hour}
                onChange={(e) => setParameters({ ...parameters, maintenance_cost_per_hour: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="depreciation_per_hour">Depreciation per Hour ($)</Label>
              <Input
                id="depreciation_per_hour"
                type="number"
                step="0.01"
                value={parameters.depreciation_per_hour}
                onChange={(e) => setParameters({ ...parameters, depreciation_per_hour: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCalculate} disabled={calculating || !selectedMachine} className="bg-brand-500 hover:bg-brand-600">
                {calculating ? 'Calculating...' : 'Calculate MHR'}
              </Button>
              <Button onClick={handleSaveConfig} variant="outline" disabled={!selectedMachine}>
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MHR Breakdown</CardTitle>
            <CardDescription>Detailed breakdown of MHR components</CardDescription>
          </CardHeader>
          <CardContent>
            {mhrResult ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Labor Cost</span>
                  <span className="font-medium">${parameters.labor_cost_per_hour || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Energy Cost</span>
                  <span className="font-medium">${parameters.energy_cost_per_hour || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maintenance Cost</span>
                  <span className="font-medium">${parameters.maintenance_cost_per_hour || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Depreciation</span>
                  <span className="font-medium">${parameters.depreciation_per_hour || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overhead</span>
                  <span className="font-medium">{parameters.overhead_rate || 0}%</span>
                </div>
                <div className="border-t pt-4 flex justify-between">
                  <span className="font-semibold">Total MHR</span>
                  <span className="font-bold text-brand-500">${mhrResult.mhr_value?.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a machine and calculate MHR to see breakdown
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
