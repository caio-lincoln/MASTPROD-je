"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Menu, Moon, Sun, User, LogOut } from "lucide-react"
import { useTheme } from "next-themes"
import { CompanySelector } from "@/components/company-selector"
import { MobileCompanySelector } from "@/components/mobile-company-selector"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { ProfileEditDialog } from "@/components/profile-edit-dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { useState, useEffect } from "react"

interface TopBarProps {
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  isMobile?: boolean
  mobileSidebarOpen?: boolean
  setMobileSidebarOpen?: (open: boolean) => void
  user?: SupabaseUser // Added user prop for authentication
}

export function TopBar({
  sidebarCollapsed,
  setSidebarCollapsed,
  isMobile = false,
  mobileSidebarOpen = false,
  setMobileSidebarOpen,
  user, // Added user parameter
}: TopBarProps) {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  const handleMenuClick = () => {
    if (isMobile && setMobileSidebarOpen) {
      setMobileSidebarOpen(!mobileSidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()

    try {
      await supabase.auth.signOut()
      router.push("/auth/login")
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleProfileUpdate = (profile: any) => {
    setUserProfile(profile)
  }

  // Carregar perfil do usuário
  useEffect(() => {
    if (user) {
      const loadProfile = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (data) {
          setUserProfile(data)
        }
      }
      loadProfile()
    }
  }, [user])

  const userEmail = user?.email || "usuario@empresa.com"
  const userName = userProfile?.display_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário"
  const userAvatar = userProfile?.avatar_url || user?.user_metadata?.avatar_url || "/placeholder.svg"
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="bg-card border-b border-border px-2 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 shrink-0">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMenuClick}
            className="h-9 w-9 p-0 shrink-0 min-h-[44px] sm:min-h-[36px]"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden lg:flex flex-1 justify-center max-w-xl xl:max-w-2xl mx-2 xl:mx-4">
          <div className="w-full">
            <CompanySelector />
          </div>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <div className="lg:hidden">
            <MobileCompanySelector />
          </div>

          {/* Notificações */}
          <NotificationCenter />

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
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 sm:w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setProfileDialogOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{isLoggingOut ? "Saindo..." : "Sair"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Diálogo de edição de perfil */}
      {user && (
        <ProfileEditDialog
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
          user={user}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </header>
  )
}
