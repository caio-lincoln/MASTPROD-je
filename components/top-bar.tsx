"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Menu, Moon, Sun, User, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import { CompanySelector } from "@/components/company-selector"
import { MobileCompanySelector } from "@/components/mobile-company-selector"

interface TopBarProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  isMobile?: boolean
  mobileSidebarOpen?: boolean
  setMobileSidebarOpen?: (open: boolean) => void
}

export function TopBar({
  sidebarCollapsed,
  setSidebarCollapsed,
  isMobile = false,
  mobileSidebarOpen = false,
  setMobileSidebarOpen,
}: TopBarProps) {
  const { theme, setTheme } = useTheme()

  const handleMenuClick = () => {
    if (isMobile && setMobileSidebarOpen) {
      setMobileSidebarOpen(!mobileSidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  return (
    <header className="bg-card border-b border-border px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 shrink-0">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMenuClick}
            className="h-9 w-9 p-0 shrink-0 min-h-[44px] sm:min-h-[36px]"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground truncate">
              {isMobile ? "SST" : "Sistema SST"}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block truncate">
              Gestão completa de Segurança e Saúde no Trabalho
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 justify-center max-w-xs xl:max-w-md mx-2 xl:mx-4">
          <div className="w-full">
            <CompanySelector />
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <div className="lg:hidden">
            <MobileCompanySelector />
          </div>

          {/* Notificações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 min-h-[44px] sm:min-h-[36px]">
                <Bell className="h-4 w-4" />
                <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs">3</Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 sm:w-72 lg:w-80">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Exame médico vencendo</p>
                  <p className="text-xs text-muted-foreground">João Silva - ASO vence em 5 dias</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Treinamento pendente</p>
                  <p className="text-xs text-muted-foreground">NR-35 - 15 funcionários pendentes</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">Não conformidade aberta</p>
                  <p className="text-xs text-muted-foreground">NC-2024-001 - Prazo: 2 dias</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tema */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 p-0 min-h-[44px] sm:min-h-[36px]"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px]"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="@usuario" />
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">Admin SST</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">admin@empresa.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
