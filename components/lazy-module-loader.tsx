"use client"

import { Suspense, lazy } from "react"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { ModuleErrorBoundary } from "@/components/error-boundary"

interface LazyModuleLoaderProps {
  moduleId: string
  moduleName: string
  importPath: string
  fallbackVariant?: "card" | "table" | "list" | "dashboard"
}

export function LazyModuleLoader({
  moduleId,
  moduleName,
  importPath,
  fallbackVariant = "dashboard",
}: LazyModuleLoaderProps) {
  const LazyComponent = lazy(() =>
    import(importPath).catch((error) => {
      console.error(`Failed to load module ${moduleName}:`, error)
      // Return a fallback component on import error
      return {
        default: () => (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">Erro ao carregar módulo</h3>
              <p className="text-sm text-muted-foreground mb-4">O módulo {moduleName} não pôde ser carregado.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Recarregar Página
              </button>
            </div>
          </div>
        ),
      }
    }),
  )

  const LoadingFallback = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="px-1">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
      </div>
      <LoadingSkeleton variant={fallbackVariant} />
    </div>
  )

  return (
    <ModuleErrorBoundary moduleName={moduleName}>
      <Suspense fallback={<LoadingFallback />}>
        <LazyComponent />
      </Suspense>
    </ModuleErrorBoundary>
  )
}

export function createLazyModule(
  importPath: string,
  moduleName: string,
  fallbackVariant: "card" | "table" | "list" | "dashboard" = "dashboard",
) {
  return function LazyModule() {
    return (
      <LazyModuleLoader
        moduleId={importPath}
        moduleName={moduleName}
        importPath={importPath}
        fallbackVariant={fallbackVariant}
      />
    )
  }
}

export function preloadModule(importPath: string) {
  return import(importPath).catch((error) => {
    console.warn(`Failed to preload module ${importPath}:`, error)
  })
}

export function preloadCriticalModules() {
  // Preload most commonly used modules
  const criticalModules = [
    "@/components/modules/dashboard",
    "@/components/modules/employees",
    "@/components/modules/occupational-health",
  ]

  criticalModules.forEach((module) => {
    setTimeout(() => preloadModule(module), 100)
  })
}
