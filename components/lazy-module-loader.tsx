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
  // Use a more specific import pattern to avoid webpack warnings
  const LazyComponent = lazy(() => {
    // Define known module paths to avoid dynamic import warnings
    const moduleMap: Record<string, () => Promise<any>> = {
      "@/components/modules/dashboard": () => import("@/components/modules/dashboard"),
      "@/components/modules/employees": () => import("@/components/modules/employees"),
      "@/components/modules/occupational-health": () => import("@/components/modules/occupational-health"),
      "@/components/modules/training": () => import("@/components/modules/training"),
      "@/components/modules/reports": () => import("@/components/modules/reports"),
      "@/components/modules/esocial": () => import("@/components/modules/esocial"),
      // Legacy module removed; alias to new API-backed eSocial
      "@/components/modules/esocial-integration": () => import("@/components/modules/esocial"),
      "@/components/modules/digital-library": () => import("@/components/modules/digital-library"),
      "@/components/modules/risk-management": () => import("@/components/modules/risk-management"),
      "@/components/modules/workplace-safety": () => import("@/components/modules/workplace-safety"),
      "@/components/modules/non-conformities": () => import("@/components/modules/non-conformities"),
      "@/components/modules/audit-logs": () => import("@/components/modules/audit-logs"),
      "@/components/modules/settings": () => import("@/components/modules/settings"),
    }

    const importFn = moduleMap[importPath]
    if (!importFn) {
      console.warn(`Unknown module path: ${importPath}. Using fallback.`)
      return Promise.resolve({
        default: () => (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">Módulo não encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">O módulo {moduleName} não está disponível.</p>
            </div>
          </div>
        ),
      })
    }

    return importFn().catch((error) => {
      console.error(`Failed to load module ${moduleName}:`, error)
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
    })
  })

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
  // Use the same module map to avoid dynamic import warnings
  const moduleMap: Record<string, () => Promise<any>> = {
    "@/components/modules/dashboard": () => import("@/components/modules/dashboard"),
    "@/components/modules/employees": () => import("@/components/modules/employees"),
    "@/components/modules/occupational-health": () => import("@/components/modules/occupational-health"),
    "@/components/modules/training": () => import("@/components/modules/training"),
    "@/components/modules/reports": () => import("@/components/modules/reports"),
    // Legacy module removed; alias to new API-backed eSocial
    "@/components/modules/esocial-integration": () => import("@/components/modules/esocial"),
    "@/components/modules/digital-library": () => import("@/components/modules/digital-library"),
    "@/components/modules/risk-management": () => import("@/components/modules/risk-management"),
    "@/components/modules/workplace-safety": () => import("@/components/modules/workplace-safety"),
    "@/components/modules/non-conformities": () => import("@/components/modules/non-conformities"),
    "@/components/modules/audit-logs": () => import("@/components/modules/audit-logs"),
    "@/components/modules/settings": () => import("@/components/modules/settings"),
  }

  const importFn = moduleMap[importPath]
  if (!importFn) {
    console.warn(`Cannot preload unknown module: ${importPath}`)
    return Promise.resolve()
  }

  return importFn().catch((error) => {
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
