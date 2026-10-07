import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './hooks/use-theme'
import { AuthProvider } from './hooks/use-auth'
import { Toaster } from 'sonner'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { PublicLayout } from './layouts/PublicLayout'
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { Dashboard } from './pages/Dashboard'
import { Products } from './pages/Products'
import { ProductDetail } from './pages/ProductDetail'
import { PartDetail } from './pages/PartDetail'
import { BOM } from './pages/BOM'
import { ProcessPlan } from './pages/ProcessPlan'
import { WorkCenters } from './pages/WorkCenters'
import { Machines } from './pages/Machines'
import { Customers } from './pages/Customers'
import { MHRConfiguration } from './pages/MHRConfiguration'
import { CostEstimation } from './pages/CostEstimation'
import { CostBreakdown } from './pages/CostBreakdown'
import { NotFound } from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
            </Route>

            <Route
              element={
                <ProtectedRoute>
                  <AuthenticatedLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/parts/:id" element={<PartDetail />} />
              <Route path="/bom" element={<BOM />} />
              <Route path="/process-plan" element={<ProcessPlan />} />
              <Route path="/configuration/work-centers" element={<WorkCenters />} />
              <Route path="/configuration/machines" element={<Machines />} />
              <Route path="/configuration/customers" element={<Customers />} />
              <Route path="/configuration/mhr" element={<MHRConfiguration />} />
              <Route path="/cost-estimation" element={<CostEstimation />} />
              <Route path="/cost-estimation/:productId/:calculationId" element={<CostBreakdown />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
