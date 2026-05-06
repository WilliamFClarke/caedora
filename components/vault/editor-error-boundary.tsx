'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep a console trail so we can still diagnose from the browser.
    console.error('[EditorErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle className="text-destructive size-8" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Something went wrong rendering the editor.</p>
          <p className="text-muted-foreground max-w-sm text-xs">
            This is usually caused by resizing to a very narrow width while a menu was
            open. Reload or widen the window to recover.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={this.reset}>
            <RotateCw className="mr-2 size-3.5" />
            Try again
          </Button>
          <Button size="sm" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    )
  }
}
