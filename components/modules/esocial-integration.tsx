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
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
} from "lucide-react"
import { format } from "date-fns"

const eventDataByCompany = {
  "1": [
    {
      id: 1,
      evento: "S-2220",
      descricao: "Monitoramento da Saúde do Trabalhador",
      funcionario: "João Silva",
      cpf: "123.456.789-00",
      dataEvento: "2024-12-15",
      dataEnvio: "2024-12-16T10:30:00",
      status: "Enviado",
      protocolo: "1.2.202412.0000001",
      retorno: "Sucesso",
      companyId: "1",
    },
    {
      id: 2,
      evento: "S-2240",
      descricao: "Condições Ambientais do Trabalho - Agentes Nocivos",
      funcionario: "Maria Santos",
      cpf: "987.654.321-00",
      dataEvento: "2024-12-14",
      dataEnvio: "2024-12-15T14:15:00",
      status: "Enviado",
      protocolo: "1.2.202412.0000002",
      retorno: "Sucesso",
      companyId: "1",
    },
    {
      id: 3,
      evento: "S-2220",
      descricao: "Monitoramento da Saúde do Trabalhador",
      funcionario: "Pedro Oliveira",
      cpf: "456.789.123-00",
      dataEvento: "2024-12-16",
      dataEnvio: null,
      status: "Pendente",
      protocolo: null,
      retorno: null,
      companyId: "1",
    },
  ],
  "2": [
    {
      id: 4,
      evento: "S-2240",
      descricao: "Condições Ambientais do Trabalho - Agentes Nocivos",
      funcionario: "Ana Costa",
      cpf: "789.123.456-00",
      dataEvento: "2024-12-13",
      dataEnvio: "2024-12-14T09:45:00",
      status: "Erro",
      protocolo: null,
      retorno: "Erro de validação - CPF inválido",
      companyId: "2",
    },
    {
      id: 5,
      evento: "S-2210",
      descricao: "Comunicação de Acidente de Trabalho",
      funcionario: "Carlos Santos",
      cpf: "321.654.987-00",
      dataEvento: "2024-12-12",
      dataEnvio: "2024-12-13T11:20:00",
      status: "Enviado",
      protocolo: "1.2.202412.0000003",
      retorno: "Sucesso",
      companyId: "2",
    },
  ],
  "3": [
    {
      id: 6,
      evento: "S-2220",
      descricao: "Monitoramento da Saúde do Trabalhador",
      funcionario: "Lucia Mendes",
      cpf: "654.321.987-00",
      dataEvento: "2024-12-11",
      dataEnvio: "2024-12-12T16:45:00",
      status: "Enviado",
      protocolo: "1.2.202412.0000004",
      retorno: "Sucesso",
      companyId: "3",
    },
    {
      id: 7,
      evento: "S-2240",
      descricao: "Condições Ambientais do Trabalho - Agentes Nocivos",
      funcionario: "Roberto Silva",
      cpf: "147.258.369-00",
      dataEvento: "2024-12-10",
      dataEnvio: null,
      status: "Pendente",
      protocolo: null,
      retorno: null,
      companyId: "3",
    },
  ],
}

const getEventTypesForCompany = (events: any[]) => {
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
    .filter((eventType) => eventType.total > 0) // Only show event types that have events
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
  const [selectedEvent, setSelectedEvent] = useState<any>(null)

  const eventData = selectedCompany ? eventDataByCompany[selectedCompany.id] || [] : []
  const eventTypes = getEventTypesForCompany(eventData)

  const stats = {
    totalEvents: eventData.length,
    enviados: eventData.filter((event) => event.status === "Enviado").length,
    pendentes: eventData.filter((event) => event.status === "Pendente").length,
    erros: eventData.filter((event) => event.status === "Erro").length,
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Database className="h-8 w-8" />
            <span>Integração eSocial</span>
          </h1>
          <p className="text-muted-foreground">
            Envio automático de eventos SST para o eSocial - {selectedCompany.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Novo Evento eSocial</DialogTitle>
                <DialogDescription>
                  Configure um novo evento para envio ao eSocial - {selectedCompany.name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Evento</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o evento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s2220">S-2220 - Monitoramento da Saúde</SelectItem>
                        <SelectItem value="s2240">S-2240 - Condições Ambientais</SelectItem>
                        <SelectItem value="s2210">S-2210 - Acidente de Trabalho</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Funcionário</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="joao">João Silva - 123.456.789-00</SelectItem>
                        <SelectItem value="maria">Maria Santos - 987.654.321-00</SelectItem>
                        <SelectItem value="pedro">Pedro Oliveira - 456.789.123-00</SelectItem>
                        <SelectItem value="ana">Ana Costa - 789.123.456-00</SelectItem>
                        <SelectItem value="carlos">Carlos Santos - 321.654.987-00</SelectItem>
                        <SelectItem value="lucia">Lucia Mendes - 654.321.987-00</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data do Evento</Label>
                  <Input type="date" />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input placeholder="Informações adicionais sobre o evento" />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Dados Automáticos</h4>
                  <p className="text-sm text-muted-foreground">
                    Os dados do funcionário, exames médicos e informações de risco serão incluídos automaticamente com
                    base no tipo de evento selecionado e nos dados de {selectedCompany.name}.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline">Cancelar</Button>
                <Button>Criar Evento</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="eventos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de Evento</TabsTrigger>
          <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
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

              {eventData.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum evento encontrado</h3>
                  <p className="text-muted-foreground">
                    Não há eventos eSocial cadastrados para {selectedCompany.name}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Data Evento</TableHead>
                      <TableHead>Data Envio</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventData.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{event.evento}</p>
                            <p className="text-sm text-muted-foreground">{event.descricao}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{event.funcionario}</TableCell>
                        <TableCell>{event.cpf}</TableCell>
                        <TableCell>{format(new Date(event.dataEvento), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          {event.dataEnvio ? (
                            <div>
                              <p>{format(new Date(event.dataEnvio), "dd/MM/yyyy")}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(event.dataEnvio), "HH:mm")}
                              </p>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(event.status)}
                            <Badge variant={getStatusColor(event.status) as any}>{event.status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.protocolo ? (
                            <Badge variant="outline">{event.protocolo}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                            {event.status === "Pendente" && (
                              <Button variant="ghost" size="sm">
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {event.status === "Erro" && (
                              <Button variant="ghost" size="sm">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
              {eventTypes.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nenhum tipo de evento disponível para {selectedCompany.name}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {eventTypes.map((eventType) => (
                    <div key={eventType.codigo} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg flex items-center space-x-2">
                            <span>{eventType.codigo}</span>
                            {eventType.obrigatorio && <Badge variant="destructive">Obrigatório</Badge>}
                          </h3>
                          <p className="text-lg font-medium">{eventType.nome}</p>
                          <p className="text-sm text-muted-foreground mb-2">{eventType.descricao}</p>
                          <p className="text-sm text-muted-foreground">⏰ Prazo: {eventType.prazo}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="text-center p-3 bg-muted rounded-lg">
                          <div className="text-2xl font-bold">{eventType.total}</div>
                          <p className="text-sm text-muted-foreground">Total</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{eventType.enviados}</div>
                          <p className="text-sm text-muted-foreground">Enviados</p>
                        </div>
                        <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">{eventType.pendentes}</div>
                          <p className="text-sm text-muted-foreground">Pendentes</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{eventType.erros}</div>
                          <p className="text-sm text-muted-foreground">Erros</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progresso de Envio</span>
                          <span>
                            {eventType.total > 0 ? Math.round((eventType.enviados / eventType.total) * 100) : 0}%
                          </span>
                        </div>
                        <Progress
                          value={eventType.total > 0 ? (eventType.enviados / eventType.total) * 100 : 0}
                          className="h-2"
                        />
                      </div>

                      <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-1" />
                          Configurar
                        </Button>
                        <Button size="sm">
                          <Send className="h-4 w-4 mr-1" />
                          Enviar Pendentes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      <span>{selectedEvent.funcionario}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF:</span>
                      <span>{selectedEvent.cpf}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data do Evento:</span>
                      <span>{format(new Date(selectedEvent.dataEvento), "dd/MM/yyyy")}</span>
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
                        {selectedEvent.dataEnvio
                          ? format(new Date(selectedEvent.dataEnvio), "dd/MM/yyyy HH:mm")
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
      <cpfTrab>${selectedEvent.cpf.replace(/\D/g, "")}</cpfTrab>
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
