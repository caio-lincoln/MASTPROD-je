"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    console.error("ErrorBoundary caught an error:", error, errorInfo)

    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.handleReset()
    }, 10000)
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.handleReset()
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  handleReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
      this.resetTimeoutId = null
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="mx-auto max-w-2xl mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Ops! Algo deu errado
            </CardTitle>
            <CardDescription>
              Ocorreu um erro inesperado. Você pode tentar recarregar a página ou entrar em contato com o suporte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === "development" && this.state.error && (
              <Alert>
                <AlertDescription>
                  <details className="whitespace-pre-wrap">
                    <summary className="cursor-pointer font-medium mb-2">Detalhes do erro (desenvolvimento)</summary>
                    <code className="text-xs">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </code>
                  </details>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button onClick={() => window.location.reload()} size="sm">
                Recarregar Página
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export function ModuleErrorBoundary({
  children,
  moduleName,
}: {
  children: ReactNode
  moduleName: string
}) {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error(`Error in ${moduleName} module:`, error, errorInfo)
  }

  const fallback = (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Erro no módulo {moduleName}
        </CardTitle>
        <CardDescription>Este módulo encontrou um problema e não pode ser carregado no momento.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => window.location.reload()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Recarregar
        </Button>
      </CardContent>
    </Card>
  )

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  )
}
