"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { Sidebar } from "@/components/sidebar"
import { TopBar } from "@/components/top-bar"
import { Dashboard } from "@/components/modules/dashboard"
import { RiskManagement } from "@/components/modules/risk-management"
import { OccupationalHealth } from "@/components/modules/occupational-health"
import { Employees } from "@/components/modules/employees"
import { Training } from "@/components/modules/training"
import { DigitalLibrary } from "@/components/modules/digital-library"
import { Reports } from "@/components/modules/reports"
import { ESocialIntegration } from "@/components/modules/esocial-integration"
import { NonConformities } from "@/components/modules/non-conformities"
import { WorkplaceSafety } from "@/components/modules/workplace-safety"
import { Settings } from "@/components/modules/settings"
import { MobileSidebarOverlay } from "@/components/mobile-sidebar-overlay"

interface DashboardClientProps {
  user: User
}

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

  const renderModule = () => {
    switch (activeModule) {
      case "dashboard":
        return <Dashboard />
      case "risk-management":
        return <RiskManagement />
      case "occupational-health":
        return <OccupationalHealth />
      case "employees":
        return <Employees />
      case "training":
        return <Training />
      case "digital-library":
        return <DigitalLibrary />
      case "reports":
        return <Reports />
      case "esocial":
        return <ESocialIntegration />
      case "non-conformities":
        return <NonConformities />
      case "workplace-safety":
        return <WorkplaceSafety />
      case "settings":
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-full w-full bg-background">
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

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          isMobile={isMobile}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          user={user}
        />
        <main className="flex-1 overflow-auto p-2 sm:p-3 md:p-4 lg:p-6 bg-background/50 min-h-0">
          <div className="w-full h-full">{renderModule()}</div>
        </main>
      </div>
    </div>
  )
}
