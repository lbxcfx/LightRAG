import type { ReactNode } from 'react'
import React from 'react'

type Props = {
  children: ReactNode
}

type State = {
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('WebUI render crashed:', error, errorInfo)
  }

  render() {
    if (!this.state.error) return this.props.children

    const message = this.state.error?.message || String(this.state.error)
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div className="max-w-3xl rounded-lg border bg-card p-4 text-card-foreground">
          <div className="text-lg font-semibold">WebUI crashed</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Refresh the page. If it keeps happening, copy the error below.
          </div>
          <pre className="mt-3 max-h-[50vh] overflow-auto rounded bg-muted p-3 text-xs">
            {message}
          </pre>
        </div>
      </div>
    )
  }
}

