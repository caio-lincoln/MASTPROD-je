"use client"

import { useState, useEffect, Suspense, lazy } from "react"
import type { User } from "@supabase/supabase-js"
import { Sidebar } from "@/components/sidebar"
import { TopBar } from "@/components/top-bar"
import { MobileSidebarOverlay } from "@/components/mobile-sidebar-overlay"
import { ModuleErrorBoundary } from "@/components/error-boundary"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
import { preloadModuleUtilities } from "@/lib/dynamic-imports"

const Dashboard = lazy(() => import("@/components/modules/dashboard"))
const RiskManagement = lazy(() => import("@/components/modules/risk-management").then((module) => ({ default: module.RiskManagement })))
const OccupationalHealth = lazy(() => import("@/components/modules/occupational-health").then((module) => ({ default: module.OccupationalHealth })))
const Employees = lazy(() => import("@/components/modules/employees").then((module) => ({ default: module.Employees })))
const Training = lazy(() => import("@/components/modules/training"))
const DigitalLibrary = lazy(() => import("@/components/modules/digital-library"))
const Reports = lazy(() => import("@/components/modules/reports"))
const ESocial = lazy(() => import("@/components/modules/esocial"))
const NonConformities = lazy(() => import("@/components/modules/non-conformities").then((module) => ({ default: module.NonConformities })))
const WorkplaceSafety = lazy(() => import("@/components/modules/workplace-safety"))
const Settings = lazy(() => import("@/components/modules/settings"))

interface DashboardClientProps {
  user: User
}

const ModuleLoadingFallback = ({ moduleName }: { moduleName: string }) => (
  <div className="space-y-4 sm:space-y-6">
    <div className="px-1">
      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
      <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
    </div>
    <LoadingSkeleton variant="dashboard" />
  </div>
)

export function DashboardClient({ user }: DashboardClientProps) {
  const [activeModule, setActiveModule] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  useEffect(() => {
    preloadModuleUtilities(activeModule)
  }, [activeModule])

  const renderModule = () => {
    const moduleComponents = {
      dashboard: {
        component: Dashboard,
        name: "Dashboard",
        fallback: <ModuleLoadingFallback moduleName="Dashboard" />,
      },
      "risk-management": {
        component: RiskManagement,
        name: "Gestão de Riscos",
        fallback: <ModuleLoadingFallback moduleName="Gestão de Riscos" />,
      },
      "occupational-health": {
        component: OccupationalHealth,
        name: "Saúde Ocupacional",
        fallback: <ModuleLoadingFallback moduleName="Saúde Ocupacional" />,
      },
      employees: {
        component: Employees,
        name: "Funcionários",
        fallback: <ModuleLoadingFallback moduleName="Funcionários" />,
      },
      training: {
        component: Training,
        name: "Treinamentos",
        fallback: <ModuleLoadingFallback moduleName="Treinamentos" />,
      },
      "digital-library": {
        component: DigitalLibrary,
        name: "Biblioteca Digital",
        fallback: <ModuleLoadingFallback moduleName="Biblioteca Digital" />,
      },
      reports: {
        component: Reports,
        name: "Relatórios",
        fallback: <ModuleLoadingFallback moduleName="Relatórios" />,
      },
      esocial: {
        component: ESocial,
        name: "eSocial",
        fallback: <ModuleLoadingFallback moduleName="eSocial" />,
      },
      // Legacy integration removed; use API-backed eSocial module
      "non-conformities": {
        component: NonConformities,
        name: "Não Conformidades",
        fallback: <ModuleLoadingFallback moduleName="Não Conformidades" />,
      },
      "workplace-safety": {
        component: WorkplaceSafety,
        name: "Segurança do Trabalho",
        fallback: <ModuleLoadingFallback moduleName="Segurança do Trabalho" />,
      },
      settings: {
        component: Settings,
        name: "Configurações",
        fallback: <ModuleLoadingFallback moduleName="Configurações" />,
      },
    }

    const moduleConfig = moduleComponents[activeModule as keyof typeof moduleComponents] || moduleComponents.dashboard
    const Component = moduleConfig.component

    return (
      <ModuleErrorBoundary moduleName={moduleConfig.name}>
        <Suspense fallback={moduleConfig.fallback}>
          <Component />
        </Suspense>
      </ModuleErrorBoundary>
    )
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <MobileSidebarOverlay isOpen={isMobile && mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        isMobile={isMobile}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          isMobile={isMobile}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          user={user}
        />
        <main className="flex-1 overflow-auto p-2 sm:p-3 md:p-4 lg:p-6 bg-background/50 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div className="w-full h-full max-w-full">{renderModule()}</div>
        </main>
      </div>
    </div>
  )
}
