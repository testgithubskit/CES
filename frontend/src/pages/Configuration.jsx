import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { WorkCenters } from './WorkCenters'
import { Customers } from './Customers'
import { MHRConfiguration } from './MHRConfiguration'
import { AccessControl } from './AccessControl'
import { ConfigSwitch, ConfigTabsProvider } from './configTabs'

const tabs = [
  ['work-centers', 'Work Centers'],
  ['customers', 'Customers'],
  ['mhr', 'MHR'],
  ['access', 'Access Control'],
]

export function Configuration() {
  const { user } = useAuth()
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin'
  const [params, setParams] = useSearchParams()
  const current = params.get('tab') || 'work-centers'
  const visible = tabs.filter(([key]) => key !== 'access' || isAdmin)
  const value = visible.some(([key]) => key === current) ? current : 'work-centers'

  return (
    <ConfigTabsProvider value={value} onChange={(next) => setParams({ tab: next })} tabs={visible}>
      <div className="flex h-[calc(100vh-2rem)] flex-col gap-3">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <h1 className="font-heading text-2xl font-bold">Configuration</h1>
            <p className="text-sm text-muted-foreground">Work centers, customers, machine hour rates, and access.</p>
          </div>
          <div className="ml-auto">
            <ConfigSwitch />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {value === 'work-centers' && <WorkCenters embedded />}
          {value === 'customers' && <Customers embedded />}
          {value === 'mhr' && <MHRConfiguration embedded />}
          {value === 'access' && isAdmin && <AccessControl embedded />}
        </div>
      </div>
    </ConfigTabsProvider>
  )
}
