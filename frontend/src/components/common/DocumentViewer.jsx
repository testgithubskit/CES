import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Eye } from 'lucide-react'

export function DocumentViewer({ document }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{document.file_name}</DialogTitle>
        </DialogHeader>
        <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Document preview will be loaded here</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
