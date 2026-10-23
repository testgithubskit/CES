import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './hooks/use-theme'
import { AuthProvider } from './hooks/use-auth'
import { Toaster } from 'sonner'
import { TooltipProvider } from './components/ui/tooltip'
import { ConfirmProvider } from './components/common/ConfirmDialog'
import { useTheme } from './hooks/use-theme'
import { Check, X } from 'lucide-react'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { PublicLayout } from './layouts/PublicLayout'
import { AuthenticatedLayout } from './layouts/AuthenticatedLayout'
import { SignIn } from './pages/SignIn'
import { Products } from './pages/Products'
import { Configuration } from './pages/Configuration'
import { ProductBom } from './pages/ProductBom'
import { Reports } from './pages/Reports'
import { Machines } from './pages/Machines'
import { NotFound } from './pages/NotFound'

function AppToaster() {
  const { theme } = useTheme()
  return (
    <Toaster
      theme={theme}
      position="top-right"
      closeButton
      icons={{
        success: <Check className="h-4 w-4" />,
        error: <X className="h-4 w-4" />,
        info: <Check className="h-4 w-4" />,
        warning: <X className="h-4 w-4" />,
      }}
    />
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <TooltipProvider delayDuration={180}>
        <ConfirmProvider>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/signin" element={<SignIn />} />
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
              <Route path="/reports" element={<Reports />} />
              <Route path="/configuration" element={<Configuration />} />
              <Route path="/configuration/work-centers" element={<Navigate to="/configuration?tab=work-centers" replace />} />
              <Route path="/configuration/work-centers/:workCenterId" element={<Machines />} />
              <Route path="/configuration/machines" element={<Navigate to="/configuration?tab=work-centers" replace />} />
              <Route path="/configuration/customers" element={<Navigate to="/configuration?tab=customers" replace />} />
              <Route path="/configuration/mhr" element={<Navigate to="/configuration?tab=mhr" replace />} />
              <Route path="/configuration/access-control" element={<Navigate to="/configuration?tab=access" replace />} />
            </Route>

            <Route path="/" element={<Navigate to="/products" replace />} />
            <Route path="/dashboard" element={<Navigate to="/products" replace />} />
            <Route path="/bom" element={<Navigate to="/products" replace />} />
            <Route path="/process-plan" element={<Navigate to="/products" replace />} />
            <Route path="/cost-estimation" element={<Navigate to="/products" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AppToaster />
        </AuthProvider>
        </ConfirmProvider>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
