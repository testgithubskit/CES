import { useState } from 'react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Box, RotateCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

export function ModelViewer3D({ document }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLoad = () => {
    setLoading(true)
    setError(null)
    setTimeout(() => {
      setLoading(false)
      setError('OpenCascade integration pending - 3D viewer will be implemented when OpenCascade.js is added')
    }, 1000)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={handleLoad}>
          <Box className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>3D Model Viewer - {document.file_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-[500px] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed">
            {loading ? (
              <div className="text-center">
                <p className="text-muted-foreground">Loading 3D model...</p>
              </div>
            ) : error ? (
              <div className="text-center max-w-md">
                <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: .stl, .step, .stp
                </p>
              </div>
            ) : (
              <div className="text-center">
                <Box className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">3D model viewer</p>
                <p className="text-xs text-muted-foreground mt-2">
                  OpenCascade.js integration pending
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
