"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  Shield,
  Heart,
  Users,
  GraduationCap,
  FileText,
  BarChart3,
  Database,
  AlertTriangle,
  HardHat,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface SidebarProps {
  activeModule: string
  setActiveModule: (module: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  isMobile?: boolean
  mobileSidebarOpen?: boolean
  setMobileSidebarOpen?: (open: boolean) => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "risk-management", label: "Gestão de Riscos", icon: Shield },
  { id: "occupational-health", label: "Saúde Ocupacional", icon: Heart },
  { id: "employees", label: "Funcionários", icon: Users },
  { id: "training", label: "Treinamentos", icon: GraduationCap },
  { id: "digital-library", label: "Biblioteca Digital", icon: FileText },
  { id: "reports", label: "Relatórios", icon: BarChart3 },
  { id: "esocial", label: "eSocial", icon: Database },
  { id: "non-conformities", label: "Não Conformidades", icon: AlertTriangle },
  { id: "workplace-safety", label: "Segurança do Trabalho", icon: HardHat },
  { id: "settings", label: "Configurações", icon: Settings },
]

export function Sidebar({
  activeModule,
  setActiveModule,
  collapsed,
  setCollapsed,
  isMobile = false,
  mobileSidebarOpen = false,
  setMobileSidebarOpen,
}: SidebarProps) {
  const handleModuleSelect = (moduleId: string) => {
    setActiveModule(moduleId)
    if (isMobile && setMobileSidebarOpen) {
      setMobileSidebarOpen(false)
    }
  }

  return (
    <div
      className={cn(
        "bg-sidebar border-r border-sidebar-border transition-all duration-300",
        isMobile
          ? cn(
              "fixed left-0 top-0 z-50 h-full w-64 transform lg:relative lg:translate-x-0",
              mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
            )
          : collapsed
            ? "w-16"
            : "w-64",
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {(!collapsed || isMobile) && <h1 className="text-xl font-bold text-sidebar-foreground">Sistema SST</h1>}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={activeModule === item.id ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent",
                  isMobile ? "h-12 px-4" : collapsed ? "px-2" : "h-10",
                  activeModule === item.id &&
                    "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
                )}
                onClick={() => handleModuleSelect(item.id)}
              >
                <Icon className={cn("h-4 w-4", (!collapsed || isMobile) && "mr-3")} />
                {(!collapsed || isMobile) && <span className="text-sm">{item.label}</span>}
              </Button>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
