import { Outlet } from 'react-router-dom'
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher'
import { useTheme } from '../hooks/use-theme'
import ShapeGrid from '../components/ShapeGrid/ShapeGrid'

export function PublicLayout() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0">
        <ShapeGrid
          shape="cross"
          direction="none"
          lineColor={dark ? '#ffffff' : '#18181b'}
          hoverColor="#004883"
          hoverFillColor={dark ? '#ffffff' : '#004883'}
          fillOpacity={0.15}
          cellSize={26}
          speed={2}
          tiltX={0}
          tiltY={0}
          rainbow={false}
          radius={2.8}
          trail={1.2}
          glow={0.2}
          twinkle={0.5}
          fade={0}
        />
      </div>
      <div className="absolute top-6 right-6 z-10">
        <ThemeSwitcher />
      </div>
      <div className="relative z-10 w-full max-w-md px-4">
        <Outlet />
      </div>
    </div>
  )
}
