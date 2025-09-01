"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell, Check, CheckCheck, AlertTriangle, Info, Clock, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useCompany } from "@/contexts/company-context"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  titulo: string
  mensagem: string
  tipo: "alerta" | "aviso" | "sistema" | "lembrete"
  lida: boolean
  origem: string
  origem_id: string
  prioridade: "baixa" | "normal" | "alta" | "critica"
  data_criacao: string
  empresa_nome: string
}

const getNotificationIcon = (tipo: string, prioridade: string) => {
  if (prioridade === "critica") return <AlertTriangle className="h-4 w-4 text-red-500" />

  switch (tipo) {
    case "alerta":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />
    case "aviso":
      return <Info className="h-4 w-4 text-blue-500" />
    case "sistema":
      return <Settings className="h-4 w-4 text-gray-500" />
    case "lembrete":
      return <Clock className="h-4 w-4 text-green-500" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

const getPriorityColor = (prioridade: string) => {
  switch (prioridade) {
    case "critica":
      return "border-l-red-500"
    case "alta":
      return "border-l-orange-500"
    case "normal":
      return "border-l-blue-500"
    case "baixa":
      return "border-l-gray-500"
    default:
      return "border-l-gray-300"
  }
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { selectedCompany } = useCompany()
  const supabase = createClient()

  const loadNotifications = async () => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("v_notificacoes_ativas")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("data_criacao", { ascending: false })
        .limit(20)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount((data || []).filter((n) => !n.lida).length)
    } catch (error) {
      console.error("Erro ao carregar notificações:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc("marcar_notificacao_lida", {
        notificacao_id_input: notificationId,
      })

      if (error) throw error

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, lida: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!selectedCompany) return

    try {
      const { error } = await supabase.rpc("marcar_todas_notificacoes_lidas", {
        empresa_id_input: selectedCompany.id,
      })

      if (error) throw error

      setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Erro ao marcar todas as notificações como lidas:", error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return "Agora há pouco"
    if (diffInHours < 24) return `${diffInHours}h atrás`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d atrás`

    return date.toLocaleDateString("pt-BR")
  }

  useEffect(() => {
    loadNotifications()
  }, [selectedCompany])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0 min-h-[44px] sm:min-h-[36px]">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 rounded-full p-0 text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 px-2 text-xs">
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <Separator />

        <ScrollArea className="h-96">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Carregando notificações...</div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação encontrada</div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 border-l-4 hover:bg-muted/50 cursor-pointer transition-colors",
                    getPriorityColor(notification.prioridade),
                    !notification.lida && "bg-muted/30",
                  )}
                  onClick={() => !notification.lida && markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.tipo, notification.prioridade)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn("text-sm font-medium truncate", !notification.lida && "font-semibold")}>
                          {notification.titulo}
                        </p>
                        {!notification.lida && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notification.id)
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notification.mensagem}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">{formatDate(notification.data_criacao)}</span>
                        <Badge variant="outline" className="text-xs">
                          {notification.tipo}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
