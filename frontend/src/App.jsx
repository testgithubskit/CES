import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './hooks/use-theme'
import { AuthProvider } from './hooks/use-auth'
import { Toaster } from 'sonner'
import { Check, X } from 'lucide-react'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { PublicLayout } from './layouts/PublicLayout'
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { Products } from './pages/Products'
import { ProductBom } from './pages/ProductBom'
import { WorkCenters } from './pages/WorkCenters'
import { Machines } from './pages/Machines'
import { Customers } from './pages/Customers'
import { MHRConfiguration } from './pages/MHRConfiguration'
import { AccessControl } from './pages/AccessControl'
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
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductBom />} />
              <Route path="/configuration/work-centers" element={<WorkCenters />} />
              <Route path="/configuration/work-centers/:workCenterId" element={<Machines />} />
              <Route path="/configuration/machines" element={<Navigate to="/configuration/work-centers" replace />} />
              <Route path="/configuration/customers" element={<Customers />} />
              <Route path="/configuration/mhr" element={<MHRConfiguration />} />
              <Route path="/configuration/access-control" element={<AccessControl />} />
            </Route>

            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/dashboard" element={<Navigate to="/products" replace />} />
            <Route path="/bom" element={<Navigate to="/products" replace />} />
            <Route path="/process-plan" element={<Navigate to="/products" replace />} />
            <Route path="/cost-estimation" element={<Navigate to="/products" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster
            position="top-right"
            icons={{
              success: <Check className="h-4 w-4" />,
              error: <X className="h-4 w-4" />,
              info: <Check className="h-4 w-4" />,
              warning: <X className="h-4 w-4" />,
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
