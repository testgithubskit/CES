import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../hooks/use-theme'
import { Button } from '../ui/button'
import { motion } from 'framer-motion'

export function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme()

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="rounded-full w-10 h-10 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-all duration-200"
      >
        <motion.div
          key={theme}
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5 text-brand-600" />
          ) : (
            <Sun className="h-5 w-5 text-yellow-400" />
          )}
        </motion.div>
        <span className="sr-only">Toggle theme</span>
      </Button>
    </motion.div>
  )
}
