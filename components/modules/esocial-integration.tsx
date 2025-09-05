"use client"

import { useState } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Database,
  Plus,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Settings,
  Download,
  Upload,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Shield,
  Key,
  TestTube,
} from "lucide-react"
import { format } from "date-fns"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"

import { createClient } from "@/lib/supabase/client"
import { useEffect } from "react"
import { ESocialService } from "@/lib/esocial/esocial-service"
import { DigitalSignatureService } from "@/lib/esocial/digital-signature"

interface ESocialEvent {
  id: number
  evento: string
  descricao: string
  funcionario_nome: string
  funcionario_cpf: string
  data_evento: string
  data_envio: string | null
  status: "Enviado" | "Pendente" | "Erro"
  protocolo: string | null
  retorno: string | null
  empresa_id: string
}

interface EventType {
  codigo: string
  nome: string
  descricao: string
  obrigatorio: boolean
  prazo: string
  total: number
  enviados: number
  pendentes: number
  erros: number
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Enviado":
      return "default"
    case "Pendente":
      return "secondary"
    case "Erro":
      return "destructive"
    case "Processando":
      return "outline"
    default:
      return "secondary"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Enviado":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "Pendente":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "Erro":
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "Processando":
      return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export function ESocialIntegration() {
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [selectedEvent, setSelectedEvent] = useState<ESocialEvent | null>(null)
  const [events, setEvents] = useState<ESocialEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [certificatePassword, setCertificatePassword] = useState("")
  const [testingConnection, setTestingConnection] = useState(false)
  const [processingEvents, setProcessingEvents] = useState(false)

  const supabase = createClient()

  const loadEvents = async () => {
    if (!selectedCompany) {
      setEvents([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase
        .from("eventos_esocial")
        .select(`
          *,
          funcionarios (
            nome,
            cpf
          )
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("data_evento", { ascending: false })

      if (supabaseError) throw supabaseError

      const transformedEvents: ESocialEvent[] = (data || []).map((event) => ({
        id: event.id,
        evento: event.tipo_evento,
        descricao: getEventDescription(event.tipo_evento),
        funcionario_nome: event.funcionarios?.nome || "N/A",
        funcionario_cpf: event.funcionarios?.cpf || "N/A",
        data_evento: event.data_evento,
        data_envio: event.data_envio,
        status: event.status as "Enviado" | "Pendente" | "Erro",
        protocolo: event.protocolo,
        retorno: event.retorno,
        empresa_id: event.empresa_id,
      }))

      setEvents(transformedEvents)
    } catch (err) {
      console.error("Erro ao carregar eventos eSocial:", err)
      setError("Erro ao carregar eventos eSocial")
    } finally {
      setLoading(false)
    }
  }

  const getEventDescription = (tipoEvento: string): string => {
    const descriptions: Record<string, string> = {
      "S-2220": "Monitoramento da Saúde do Trabalhador",
      "S-2240": "Condições Ambientais do Trabalho - Agentes Nocivos",
      "S-2210": "Comunicação de Acidente de Trabalho",
    }
    return descriptions[tipoEvento] || tipoEvento
  }

  const getEventTypes = (events: ESocialEvent[]): EventType[] => {
    const eventTypes = [
      {
        codigo: "S-2220",
        nome: "Monitoramento da Saúde do Trabalhador",
        descricao: "Informações sobre exames médicos ocupacionais",
        obrigatorio: true,
        prazo: "Até o dia 15 do mês seguinte",
      },
      {
        codigo: "S-2240",
        nome: "Condições Ambientais do Trabalho",
        descricao: "Informações sobre agentes nocivos e fatores de risco",
        obrigatorio: true,
        prazo: "Até o dia 15 do mês seguinte",
      },
      {
        codigo: "S-2210",
        nome: "Comunicação de Acidente de Trabalho",
        descricao: "Registro de acidentes e doenças ocupacionais",
        obrigatorio: true,
        prazo: "Até o 1º dia útil seguinte",
      },
    ]

    return eventTypes
      .map((eventType) => {
        const typeEvents = events.filter((event) => event.evento === eventType.codigo)
        const enviados = typeEvents.filter((event) => event.status === "Enviado").length
        const pendentes = typeEvents.filter((event) => event.status === "Pendente").length
        const erros = typeEvents.filter((event) => event.status === "Erro").length

        return {
          ...eventType,
          total: typeEvents.length,
          enviados,
          pendentes,
          erros,
        }
      })
      .filter((eventType) => eventType.total > 0)
  }

  const handleTestConnection = async () => {
    if (!selectedCompany) return

    setTestingConnection(true)
    try {
      const esocialService = new ESocialService()
      const result = await esocialService.testarConectividade(selectedCompany.id)

      if (result.sucesso) {
        toast({
          title: "Conexão bem-sucedida",
          description: "Conectividade com eSocial verificada com sucesso",
        })
      } else {
        toast({
          title: "Erro na conexão",
          description: result.erro || "Falha ao conectar com eSocial",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro na conexão",
        description: "Falha ao testar conectividade",
        variant: "destructive",
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleCertificateUpload = async () => {
    if (!certificateFile || !certificatePassword || !selectedCompany) return

    try {
      const signatureService = new DigitalSignatureService()
      const result = await signatureService.uploadCertificadoA1(
        certificateFile,
        certificatePassword,
        selectedCompany.id,
      )

      if (result.sucesso) {
        toast({
          title: "Certificado carregado",
          description: "Certificado A1 configurado com sucesso",
        })
        setCertificateFile(null)
        setCertificatePassword("")
      } else {
        toast({
          title: "Erro no certificado",
          description: result.erro || "Falha ao carregar certificado",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro no certificado",
        description: "Falha ao processar certificado",
        variant: "destructive",
      })
    }
  }

  const handleProcessEvents = async () => {
    if (!selectedCompany) return

    setProcessingEvents(true)
    try {
      const esocialService = new ESocialService()
      const result = await esocialService.processarEventosAutomaticos(selectedCompany.id)

      toast({
        title: "Processamento iniciado",
        description: `${result.eventosProcessados} eventos em processamento`,
      })

      // Recarregar eventos após processamento
      await loadEvents()
    } catch (err) {
      toast({
        title: "Erro no processamento",
        description: "Falha ao processar eventos",
        variant: "destructive",
      })
    } finally {
      setProcessingEvents(false)
    }
  }

  const handleGenerateEvent = async (tipoEvento: string) => {
    if (!selectedCompany) return

    try {
      const esocialService = new ESocialService()
      const result = await esocialService.gerarEventos(selectedCompany.id, tipoEvento)

      if (result.sucesso) {
        toast({
          title: "Eventos gerados",
          description: `${result.eventosGerados} eventos ${tipoEvento} criados`,
        })
        await loadEvents()
      } else {
        toast({
          title: "Erro na geração",
          description: result.erro || "Falha ao gerar eventos",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Erro na geração",
        description: "Falha ao gerar eventos",
        variant: "destructive",
      })
    }
  }

  const handleResendEvent = async (eventId: number) => {
    try {
      const { error } = await supabase
        .from("eventos_esocial")
        .update({
          status: "Pendente",
          data_envio: null,
          protocolo: null,
          retorno: null,
        })
        .eq("id", eventId)

      if (error) throw error

      // Recarregar eventos após reenviar
      await loadEvents()
    } catch (err) {
      console.error("Erro ao reenviar evento:", err)
      setError("Erro ao reenviar evento")
    }
  }

  useEffect(() => {
    loadEvents()
  }, [selectedCompany])

  const eventTypes = getEventTypes(events)
  const stats = {
    totalEvents: events.length,
    enviados: events.filter((event) => event.status === "Enviado").length,
    pendentes: events.filter((event) => event.status === "Pendente").length,
    erros: events.filter((event) => event.status === "Erro").length,
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <Database className="h-8 w-8" />
              <span>Integração eSocial</span>
            </h1>
            <p className="text-muted-foreground">Envio automático de eventos SST (S-2220, S-2240) para o eSocial</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
                <p className="text-muted-foreground">
                  Selecione uma empresa no menu superior para visualizar os eventos eSocial
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Integração eSocial</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando eventos eSocial...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Integração eSocial</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={loadEvents}>Tentar Novamente</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Database className="h-8 w-8" />
            <span>Integração eSocial</span>
          </h1>
          <p className="text-muted-foreground">
            Envio automático de eventos SST para o eSocial - {selectedCompany?.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleTestConnection} disabled={testingConnection}>
            <TestTube className="h-4 w-4 mr-2" />
            {testingConnection ? "Testando..." : "Testar Conexão"}
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Button onClick={handleProcessEvents} disabled={processingEvents}>
            <Send className="h-4 w-4 mr-2" />
            {processingEvents ? "Processando..." : "Processar Eventos"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="eventos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Evento</TabsTrigger>
          <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="eventos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enviados</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.enviados}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalEvents > 0 ? Math.round((stats.enviados / stats.totalEvents) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pendentes}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalEvents > 0 ? Math.round((stats.pendentes / stats.totalEvents) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.erros}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalEvents > 0 ? Math.round((stats.erros / stats.totalEvents) * 100) : 0}% do total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Ações Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Operações frequentes do eSocial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button className="h-20 flex flex-col space-y-2">
                  <Send className="h-6 w-6" />
                  <span>Enviar Pendentes</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
                  <RefreshCw className="h-6 w-6" />
                  <span>Consultar Status</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
                  <Download className="h-6 w-6" />
                  <span>Baixar Retornos</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
                  <Upload className="h-6 w-6" />
                  <span>Importar Dados</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Eventos eSocial</CardTitle>
              <CardDescription>Histórico de eventos enviados e pendentes de {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Input placeholder="Buscar por funcionário ou CPF..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="s2220">S-2220</SelectItem>
                      <SelectItem value="s2240">S-2240</SelectItem>
                      <SelectItem value="s2210">S-2210</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="enviado">Enviado</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="erro">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Data do Evento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.evento}</div>
                            <div className="text-sm text-muted-foreground">{event.descricao}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.funcionario_nome}</div>
                            <div className="text-sm text-muted-foreground">{event.funcionario_cpf}</div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(event.data_evento).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.status === "Enviado"
                                ? "default"
                                : event.status === "Pendente"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {event.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{event.protocolo || "-"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedEvent(event)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              {event.status === "Erro" && (
                                <DropdownMenuItem onClick={() => handleResendEvent(event.id)}>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Reenviar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Exportar XML
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tipos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Eventos eSocial</CardTitle>
              <CardDescription>Configuração e status dos eventos SST de {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Tipos de Eventos Disponíveis</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {eventTypes.map((eventType) => (
                    <Card key={eventType.codigo}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium">{eventType.codigo}</CardTitle>
                          <Button size="sm" onClick={() => handleGenerateEvent(eventType.codigo)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Gerar
                          </Button>
                        </div>
                        <CardDescription className="text-xs">{eventType.nome}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-3">{eventType.descricao}</div>
                        <div className="flex justify-between text-xs">
                          <span>Total: {eventType.total}</span>
                          <span className="text-green-600">Enviados: {eventType.enviados}</span>
                          <span className="text-yellow-600">Pendentes: {eventType.pendentes}</span>
                          <span className="text-red-600">Erros: {eventType.erros}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoramento" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Status da Conexão</span>
                </CardTitle>
                <CardDescription>Monitoramento da conectividade com o eSocial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">Conexão Ativa</p>
                      <p className="text-sm text-muted-foreground">Última verificação: há 2 minutos</p>
                    </div>
                  </div>
                  <Badge>Online</Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ambiente:</span>
                    <span className="font-medium">Produção</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Versão do Layout:</span>
                    <span className="font-medium">S-1.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certificado Digital:</span>
                    <Badge>Válido até 15/06/2025</Badge>
                  </div>
                </div>

                <Button className="w-full bg-transparent" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Testar Conexão
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas de Envio</CardTitle>
                <CardDescription>Performance dos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">98.2%</div>
                    <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold">1.8s</div>
                    <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Eventos Enviados</span>
                    <span className="font-medium">1,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sucessos</span>
                    <span className="font-medium text-green-600">1,225</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Erros</span>
                    <span className="font-medium text-red-600">22</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tempo Total</span>
                    <span className="font-medium">37min 42s</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Log de Atividades</CardTitle>
              <CardDescription>Registro detalhado das operações eSocial</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">Lote S-2220 enviado com sucesso</p>
                    <p className="text-sm text-muted-foreground">15 eventos processados • 16/12/2024 às 14:30</p>
                  </div>
                  <Badge>Sucesso</Badge>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <div className="flex-1">
                    <p className="font-medium">Certificado digital expira em 180 dias</p>
                    <p className="text-sm text-muted-foreground">Renovação necessária • 16/12/2024 às 08:00</p>
                  </div>
                  <Badge variant="secondary">Aviso</Badge>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium">Sincronização automática executada</p>
                    <p className="text-sm text-muted-foreground">89 eventos verificados • 16/12/2024 às 06:00</p>
                  </div>
                  <Badge>Sucesso</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificados" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Certificado A1 (Arquivo)</span>
                </CardTitle>
                <CardDescription>Upload e configuração de certificado A1</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Arquivo do Certificado (.p12/.pfx)</Label>
                  <Input
                    type="file"
                    accept=".p12,.pfx"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Senha do Certificado</Label>
                  <Input
                    type="password"
                    value={certificatePassword}
                    onChange={(e) => setCertificatePassword(e.target.value)}
                    placeholder="Digite a senha do certificado"
                  />
                </div>

                <Button
                  onClick={handleCertificateUpload}
                  disabled={!certificateFile || !certificatePassword}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Carregar Certificado A1
                </Button>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge variant="outline">Não configurado</Badge>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5" />
                  <span>Certificado A3 (Token/Smartcard)</span>
                </CardTitle>
                <CardDescription>Configuração de certificado A3</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Driver do Token</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safenet">SafeNet</SelectItem>
                      <SelectItem value="gemalto">Gemalto</SelectItem>
                      <SelectItem value="watchdata">WatchData</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>PIN do Token</Label>
                  <Input type="password" placeholder="Digite o PIN do token" />
                </div>

                <Button className="w-full bg-transparent" variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Detectar Certificado A3
                </Button>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Status: <Badge variant="outline">Token não detectado</Badge>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Validação de Certificados</CardTitle>
              <CardDescription>Verificação de validade e configuração</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="font-medium">Certificado Válido</p>
                    <p className="text-sm text-muted-foreground">Expira em 180 dias</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="font-medium">Assinatura Digital</p>
                    <p className="text-sm text-muted-foreground">Configurada</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Key className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                    <p className="font-medium">Cadeia de Confiança</p>
                    <p className="text-sm text-muted-foreground">Verificada</p>
                  </div>
                </div>

                <Button variant="outline" className="w-full bg-transparent">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Validar Certificados
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Conexão</CardTitle>
                <CardDescription>Parâmetros de conexão com o eSocial para {selectedCompany.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Produção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="homologacao">Homologação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Certificado Digital</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Certificado atual válido até 15/06/2025</p>
                    <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                      Alterar Certificado
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>CNPJ da Empresa</Label>
                  <Input value={selectedCompany.cnpj || "12.345.678/0001-90"} disabled />
                </div>

                <div className="space-y-2">
                  <Label>Versão do Layout</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="S-1.0" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="s1.0">S-1.0 (Atual)</SelectItem>
                      <SelectItem value="s1.1">S-1.1 (Beta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Envio</CardTitle>
                <CardDescription>Parâmetros para envio automático</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Envio Automático</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Habilitado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="habilitado">Habilitado</SelectItem>
                      <SelectItem value="desabilitado">Desabilitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horário de Envio</Label>
                  <Input type="time" defaultValue="08:00" />
                </div>

                <div className="space-y-2">
                  <Label>Tamanho do Lote</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="50 eventos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25 eventos</SelectItem>
                      <SelectItem value="50">50 eventos</SelectItem>
                      <SelectItem value="100">100 eventos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tentativas em Caso de Erro</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="3 tentativas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 tentativa</SelectItem>
                      <SelectItem value="3">3 tentativas</SelectItem>
                      <SelectItem value="5">5 tentativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>E-mail para Notificações</Label>
                  <Input placeholder="admin@empresa.com" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Mapeamento de Dados</CardTitle>
              <CardDescription>Configuração do mapeamento automático de dados SST</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">S-2220 - Monitoramento da Saúde</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Dados do Funcionário:</span>
                        <Badge variant="outline">Módulo Funcionários</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Exames Médicos:</span>
                        <Badge variant="outline">Saúde Ocupacional</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>ASO:</span>
                        <Badge variant="outline">Saúde Ocupacional</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">S-2240 - Condições Ambientais</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Dados do Funcionário:</span>
                        <Badge variant="outline">Módulo Funcionários</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Riscos Ocupacionais:</span>
                        <Badge variant="outline">Gestão de Riscos</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Agentes Nocivos:</span>
                        <Badge variant="outline">Gestão de Riscos</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-transparent" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Mapeamentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Evento */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Evento {selectedEvent.evento}</DialogTitle>
              <DialogDescription>Informações completas do evento eSocial</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Evento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span>{selectedEvent.evento}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Funcionário:</span>
                      <span>{selectedEvent.funcionario_nome}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF:</span>
                      <span>{selectedEvent.funcionario_cpf}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data do Evento:</span>
                      <span>{format(new Date(selectedEvent.data_evento), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedEvent.status) as any}>{selectedEvent.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status do Envio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data de Envio:</span>
                      <span>
                        {selectedEvent.data_envio
                          ? format(new Date(selectedEvent.data_envio), "dd/MM/yyyy HH:mm")
                          : "Não enviado"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Protocolo:</span>
                      <span>{selectedEvent.protocolo || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Retorno:</span>
                      <span>{selectedEvent.retorno || "Aguardando"}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados do XML</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
                      {`<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_00_00">
  <evtMonit Id="ID1234567890123456789012345678901234567890">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>1</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>12345678000190</nrInsc>
    </ideEmpregador>
    <ideTrabalhador>
      <cpfTrab>${selectedEvent.funcionario_cpf.replace(/\D/g, "")}</cpfTrab>
    </ideTrabalhador>
    <!-- Dados específicos do evento -->
  </evtMonit>
</eSocial>`}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar XML
                </Button>
                {selectedEvent.status === "Pendente" && (
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Agora
                  </Button>
                )}
                {selectedEvent.status === "Erro" && (
                  <Button>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reenviar
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export { ESocialIntegration as ESocialIntegrationComponent }
export default ESocialIntegration
