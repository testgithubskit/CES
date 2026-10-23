import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '../ui/input'

export function PasswordInput({ className = '', inputClassName = '', ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className={`relative ${className}`}>
      <Input {...props} type={visible ? 'text' : 'password'} className={`pr-9 ${inputClassName}`} />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
