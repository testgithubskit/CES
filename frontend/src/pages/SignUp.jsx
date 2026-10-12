import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Lock, Mail, User, ArrowRight, CheckCircle, XCircle } from 'lucide-react'

export function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirm_password: '',
  })
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length !== 6) {
      toast.error('Password must be exactly 6 characters')
      return
    }

    setLoading(true)

    try {
      await register({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: 'user',
      })
      toast.success('Account created successfully')
      navigate('/signin')
    } catch (error) {
      const detail = error.response?.data?.detail
      const message = typeof detail === 'string' ? detail : 'Failed to create account. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const passwordValid = formData.password.length === 6
  const passwordsMatch = formData.password === formData.confirm_password && formData.password !== ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="space-y-1 text-center pb-8">
          
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-transparent">
            Cost Estimation Software
          </CardTitle>
          <CardDescription className="pt-2 text-base">Create your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <div className="flex h-12 items-center gap-2 border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  maxLength={50}
                  autoComplete="off"
                  value={formData.name}
                  onChange={handleChange}
                  className="h-full border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="flex h-12 items-center gap-2 border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  maxLength={50}
                  autoComplete="off"
                  value={formData.email}
                  onChange={handleChange}
                  className="h-full border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="flex h-12 items-center gap-2 border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  maxLength={6}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="h-full border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {formData.password && (
                  passwordValid ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-foreground" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Password must be exactly 6 characters
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <Label htmlFor="confirm_password" className="text-sm font-medium">Confirm Password</Label>
              <div className="flex h-12 items-center gap-2 border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  maxLength={6}
                  autoComplete="new-password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className="h-full border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {formData.confirm_password && (
                  passwordsMatch ? (
                    <CheckCircle className="h-4 w-4 shrink-0 text-foreground" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )
                )}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Sign Up
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
            </motion.div>
          </form>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center text-sm"
          >
            Already have an account?{' '}
            <Link
              to="/signin"
              className="font-semibold underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
