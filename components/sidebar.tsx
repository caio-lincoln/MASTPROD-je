"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  ChevronDown,
  Building2,
  Activity,
  FileBarChart,
  Cog,
} from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  activeModule: string
  setActiveModule: (module: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  isMobile?: boolean
  mobileSidebarOpen?: boolean
  setMobileSidebarOpen?: (open: boolean) => void
}

const menuGroups = [
  {
    id: "overview",
    label: "Visão Geral",
    icon: LayoutDashboard,
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "management",
    label: "Gestão",
    icon: Building2,
    items: [
      { id: "risk-management", label: "Gestão de Riscos", icon: Shield },
      { id: "employees", label: "Funcionários", icon: Users },
      { id: "digital-library", label: "Biblioteca Digital", icon: FileText },
    ],
  },
  {
    id: "operations",
    label: "Operações",
    icon: Activity,
    items: [
      { id: "occupational-health", label: "Saúde Ocupacional", icon: Heart },
      { id: "workplace-safety", label: "Segurança do Trabalho", icon: HardHat },
      { id: "training", label: "Treinamentos", icon: GraduationCap },
      { id: "non-conformities", label: "Não Conformidades", icon: AlertTriangle },
    ],
  },
  {
    id: "reports",
    label: "Relatórios",
    icon: FileBarChart,
    items: [
      { id: "reports", label: "Relatórios", icon: BarChart3 },
      { id: "esocial", label: "eSocial", icon: Database },
    ],
  },
  {
    id: "settings",
    label: "Configurações",
    icon: Cog,
    items: [{ id: "settings", label: "Configurações", icon: Settings }],
  },
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
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    menuGroups.map((group) => group.id), // All groups expanded by default
  )

  const handleModuleSelect = (moduleId: string) => {
    setActiveModule(moduleId)
    if (isMobile && setMobileSidebarOpen) {
      setMobileSidebarOpen(false)
    }
  }

  const toggleGroup = (groupId: string) => {
    if (collapsed && !isMobile) return // Don't allow toggle when collapsed on desktop

    setExpandedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]))
  }

  const isGroupExpanded = (groupId: string) => expandedGroups.includes(groupId)

  const renderMenuItem = (item: any, isInGroup = false) => {
    const Icon = item.icon
    const isActive = activeModule === item.id

    const buttonContent = (
      <Button
        key={item.id}
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
          isMobile ? "h-12 px-4" : collapsed ? "px-2 h-10" : "h-10",
          isInGroup && !collapsed && "ml-6 w-[calc(100%-1.5rem)]",
          isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
        )}
        onClick={() => handleModuleSelect(item.id)}
      >
        <Icon className={cn("h-4 w-4 shrink-0", (!collapsed || isMobile) && "mr-3")} />
        {(!collapsed || isMobile) && <span className="text-sm truncate">{item.label}</span>}
      </Button>
    )

    if (collapsed && !isMobile) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      )
    }

    return buttonContent
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col",
          isMobile
            ? cn(
                "fixed left-0 top-0 z-50 h-full w-72 transform lg:relative lg:translate-x-0 shadow-2xl",
                mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
              )
            : collapsed
              ? "w-16"
              : "w-64",
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border bg-sidebar/50">
          {(!collapsed || isMobile) && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-sidebar-foreground">MASTPROD SST</h1>
                <p className="text-xs text-sidebar-foreground/60">Gestão Integrada</p>
              </div>
            </div>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8 p-0"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-2">
            {menuGroups.map((group) => {
              const GroupIcon = group.icon
              const isExpanded = isGroupExpanded(group.id)

              // Special handling for single-item groups (like Dashboard)
              if (group.items.length === 1) {
                return renderMenuItem(group.items[0])
              }

              return (
                <Collapsible key={group.id} open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/50 font-medium",
                        isMobile ? "h-12 px-4 text-base" : collapsed ? "px-2 h-8" : "h-8 px-2",
                      )}
                      disabled={collapsed && !isMobile}
                    >
                      <GroupIcon className={cn("h-4 w-4 shrink-0", (!collapsed || isMobile) && "mr-2")} />
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="text-xs uppercase tracking-wider flex-1 text-left">{group.label}</span>
                          <ChevronDown className={cn("h-3 w-3 transition-transform", !isExpanded && "-rotate-90")} />
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-1 mt-1">
                    {group.items.map((item) => renderMenuItem(item, true))}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </nav>
        </ScrollArea>

        {(!collapsed || isMobile) && (
          <div className="p-4 border-t border-sidebar-border bg-sidebar/30">
            <div className="text-xs text-sidebar-foreground/50 text-center">
              <p>Sistema SST v1.0</p>
              <p>© 2025 - Todos os direitos reservados</p>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
