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
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  BarChart3,
  Plus,
  Download,
  FileText,
  CalendarIcon,
  Filter,
  Eye,
  Settings,
  TrendingUp,
  Clock,
  Mail,
  AlertTriangle,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const reportTemplatesByCompany = {
  1: [
    {
      id: 1,
      nome: "Relatório Geral de SST",
      categoria: "Geral",
      descricao: "Visão completa de todos os indicadores de segurança e saúde",
      modulos: ["Dashboard", "Funcionários", "Exames", "Treinamentos"],
      periodicidade: "Mensal",
      ultimaGeracao: "2024-12-01",
      status: "Ativo",
      downloads: 45,
    },
    {
      id: 2,
      nome: "Controle de Exames Médicos",
      categoria: "Saúde Ocupacional",
      descricao: "Status detalhado dos exames médicos e ASOs",
      modulos: ["Saúde Ocupacional", "Funcionários"],
      periodicidade: "Semanal",
      ultimaGeracao: "2024-12-15",
      status: "Ativo",
      downloads: 32,
    },
    {
      id: 3,
      nome: "Matriz de Riscos por Setor",
      categoria: "Gestão de Riscos",
      descricao: "Análise detalhada dos riscos identificados por área",
      modulos: ["Gestão de Riscos"],
      periodicidade: "Trimestral",
      ultimaGeracao: "2024-10-01",
      status: "Ativo",
      downloads: 28,
    },
  ],
  2: [
    {
      id: 4,
      nome: "Eficácia de Treinamentos",
      categoria: "Treinamentos",
      descricao: "Análise de participação e aprovação nos treinamentos",
      modulos: ["Treinamentos", "Funcionários"],
      periodicidade: "Mensal",
      ultimaGeracao: "2024-12-01",
      status: "Ativo",
      downloads: 19,
    },
    {
      id: 5,
      nome: "Não Conformidades Abertas",
      categoria: "Não Conformidades",
      descricao: "Status das não conformidades e planos de ação",
      modulos: ["Não Conformidades"],
      periodicidade: "Quinzenal",
      ultimaGeracao: "2024-12-15",
      status: "Ativo",
      downloads: 23,
    },
  ],
  3: [
    {
      id: 6,
      nome: "Relatório de Segurança Industrial",
      categoria: "Segurança",
      descricao: "Indicadores de segurança e prevenção de acidentes",
      modulos: ["Segurança do Trabalho", "Funcionários"],
      periodicidade: "Mensal",
      ultimaGeracao: "2024-11-30",
      status: "Ativo",
      downloads: 15,
    },
  ],
}

const reportHistoryByCompany = {
  1: [
    {
      id: 1,
      nome: "Relatório Geral de SST - Novembro 2024",
      tipo: "Geral",
      dataGeracao: "2024-12-01T10:30:00",
      geradoPor: "João Santos",
      formato: "PDF",
      tamanho: "2.5 MB",
      status: "Concluído",
    },
    {
      id: 2,
      nome: "Controle de Exames - Semana 50",
      tipo: "Saúde Ocupacional",
      dataGeracao: "2024-12-15T14:15:00",
      geradoPor: "Maria Silva",
      formato: "Excel",
      tamanho: "1.2 MB",
      status: "Concluído",
    },
  ],
  2: [
    {
      id: 3,
      nome: "Treinamentos - Dezembro 2024",
      tipo: "Treinamentos",
      dataGeracao: "2024-12-16T09:45:00",
      geradoPor: "Carlos Lima",
      formato: "PDF",
      tamanho: "1.8 MB",
      status: "Processando",
    },
  ],
  3: [
    {
      id: 4,
      nome: "Segurança Industrial - Novembro 2024",
      tipo: "Segurança",
      dataGeracao: "2024-12-02T16:20:00",
      geradoPor: "Ana Costa",
      formato: "Excel",
      tamanho: "3.1 MB",
      status: "Concluído",
    },
  ],
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Ativo":
      return "default"
    case "Concluído":
      return "default"
    case "Processando":
      return "secondary"
    case "Erro":
      return "destructive"
    default:
      return "secondary"
  }
}

const getFormatIcon = (formato: string) => {
  switch (formato.toLowerCase()) {
    case "pdf":
      return "📄"
    case "excel":
    case "xlsx":
      return "📊"
    case "word":
    case "docx":
      return "📝"
    default:
      return "📁"
  }
}

export function Reports() {
  const { selectedCompany } = useCompany()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>([])

  const reportTemplates = selectedCompany ? reportTemplatesByCompany[selectedCompany.id] || [] : []
  const reportHistory = selectedCompany ? reportHistoryByCompany[selectedCompany.id] || [] : []

  const totalTemplates = reportTemplates.length
  const totalReports = reportHistory.length
  const totalDownloads = reportTemplates.reduce((sum, template) => sum + template.downloads, 0)
  const activeSchedules = selectedCompany ? Math.floor(totalTemplates * 0.6) : 0

  const availableModules = [
    "Dashboard",
    "Gestão de Riscos",
    "Saúde Ocupacional",
    "Funcionários",
    "Treinamentos",
    "Biblioteca Digital",
    "Não Conformidades",
    "Segurança do Trabalho",
  ]

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <BarChart3 className="h-8 w-8" />
              <span>Relatórios</span>
            </h1>
            <p className="text-muted-foreground">Geração dinâmica de relatórios por módulo e unidade organizacional</p>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Selecione uma empresa no menu superior para visualizar e gerar relatórios específicos da organização.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <BarChart3 className="h-8 w-8" />
            <span>Relatórios</span>
          </h1>
          <p className="text-muted-foreground">
            Geração dinâmica de relatórios por módulo e unidade organizacional - {selectedCompany.nome}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Relatório
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Gerar Novo Relatório - {selectedCompany.nome}</DialogTitle>
              <DialogDescription>Configure um relatório personalizado com os dados desejados</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Relatório</Label>
                  <Input placeholder="Ex: Relatório Mensal de SST" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="saude">Saúde Ocupacional</SelectItem>
                      <SelectItem value="riscos">Gestão de Riscos</SelectItem>
                      <SelectItem value="treinamentos">Treinamentos</SelectItem>
                      <SelectItem value="conformidade">Conformidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Módulos a Incluir</Label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg">
                  {availableModules.map((module) => (
                    <div key={module} className="flex items-center space-x-2">
                      <Checkbox
                        id={module}
                        checked={selectedModules.includes(module)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedModules([...selectedModules, module])
                          } else {
                            setSelectedModules(selectedModules.filter((m) => m !== module))
                          }
                        }}
                      />
                      <Label htmlFor={module} className="text-sm">
                        {module}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mes-atual">Mês Atual</SelectItem>
                      <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                      <SelectItem value="trimestre">Trimestre</SelectItem>
                      <SelectItem value="semestre">Semestre</SelectItem>
                      <SelectItem value="ano">Ano</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="word">Word</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Setor (Opcional)</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os Setores</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Inicial (se personalizado)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Enviar por E-mail</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="email" />
                    <Label htmlFor="email" className="text-sm">
                      Enviar automaticamente após geração
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Gerar Relatório</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Modelos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="agendados">Agendados</TabsTrigger>
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Modelos Ativos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTemplates}</div>
                <p className="text-xs text-muted-foreground">Para {selectedCompany.nome}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Relatórios Gerados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalReports}</div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Downloads</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDownloads}</div>
                <p className="text-xs text-muted-foreground">Total acumulado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSchedules}</div>
                <p className="text-xs text-muted-foreground">Relatórios automáticos</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Modelos */}
          <Card>
            <CardHeader>
              <CardTitle>Modelos de Relatórios - {selectedCompany.nome}</CardTitle>
              <CardDescription>Templates pré-configurados para geração rápida</CardDescription>
            </CardHeader>
            <CardContent>
              {reportTemplates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum modelo de relatório configurado para esta empresa.</p>
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Modelo
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {reportTemplates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{template.nome}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{template.descricao}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>📊 {template.categoria}</span>
                            <span>🔄 {template.periodicidade}</span>
                            <span>📅 Último: {format(new Date(template.ultimaGeracao), "dd/MM/yyyy")}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(template.status) as any}>{template.status}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedTemplate(template)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Módulos Incluídos</p>
                          <div className="flex flex-wrap gap-1">
                            {template.modulos.map((modulo, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {modulo}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Downloads</p>
                            <p className="font-medium">{template.downloads}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Periodicidade</p>
                            <p className="font-medium">{template.periodicidade}</p>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Configurar
                          </Button>
                          <Button size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Gerar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Relatórios - {selectedCompany.nome}</CardTitle>
              <CardDescription>Todos os relatórios gerados recentemente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Input placeholder="Buscar relatório..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="riscos">Riscos</SelectItem>
                      <SelectItem value="treinamentos">Treinamentos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="processando">Processando</SelectItem>
                      <SelectItem value="erro">Erro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Relatório</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Gerado por</TableHead>
                    <TableHead>Formato</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhum relatório gerado para esta empresa ainda.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportHistory.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{getFormatIcon(report.formato)}</span>
                            <div>
                              <p className="font-medium">{report.nome}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{report.tipo}</TableCell>
                        <TableCell>
                          <div>
                            <p>{format(new Date(report.dataGeracao), "dd/MM/yyyy")}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(report.dataGeracao), "HH:mm")}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{report.geradoPor}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{report.formato}</Badge>
                        </TableCell>
                        <TableCell>{report.tamanho}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(report.status) as any}>{report.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {report.status === "Concluído" && (
                              <>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendados" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Relatórios Agendados</span>
                </CardTitle>
                <CardDescription>Relatórios configurados para geração automática</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">Relatório Geral de SST</h4>
                      <p className="text-sm text-muted-foreground">Todo dia 1º do mês às 08:00</p>
                    </div>
                    <Badge>Ativo</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Próxima execução: 01/01/2025 às 08:00</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">Controle de Exames</h4>
                      <p className="text-sm text-muted-foreground">Toda segunda-feira às 09:00</p>
                    </div>
                    <Badge>Ativo</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Próxima execução: 23/12/2024 às 09:00</div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">Não Conformidades</h4>
                      <p className="text-sm text-muted-foreground">A cada 15 dias às 14:00</p>
                    </div>
                    <Badge variant="secondary">Pausado</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">Última execução: 15/12/2024 às 14:00</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurar Novo Agendamento</CardTitle>
                <CardDescription>Automatize a geração de relatórios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Modelo de Relatório</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Relatório Geral de SST</SelectItem>
                      <SelectItem value="exames">Controle de Exames</SelectItem>
                      <SelectItem value="riscos">Matriz de Riscos</SelectItem>
                      <SelectItem value="treinamentos">Eficácia de Treinamentos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quinzenal">Quinzenal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Horário</Label>
                    <Input type="time" defaultValue="08:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Formato</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="PDF" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="word">Word</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>E-mails para Envio</Label>
                  <Input placeholder="email1@empresa.com, email2@empresa.com" />
                </div>

                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Agendamento
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Configurações Gerais</CardTitle>
                <CardDescription>Configurações padrão para geração de relatórios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Formato Padrão</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="PDF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="word">Word</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Clique para fazer upload do logo</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Rodapé Padrão</Label>
                  <Input placeholder="© 2024 Empresa - Sistema SST" />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox id="watermark" />
                  <Label htmlFor="watermark">Incluir marca d'água nos relatórios</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Permissões de Acesso</CardTitle>
                <CardDescription>Controle quem pode gerar e acessar relatórios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Administradores</p>
                      <p className="text-sm text-muted-foreground">Acesso total a todos os relatórios</p>
                    </div>
                    <Badge>Total</Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Coordenadores SST</p>
                      <p className="text-sm text-muted-foreground">Acesso aos relatórios de sua área</p>
                    </div>
                    <Badge variant="secondary">Limitado</Badge>
                  </div>

                  <div className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Supervisores</p>
                      <p className="text-sm text-muted-foreground">Apenas visualização de relatórios</p>
                    </div>
                    <Badge variant="outline">Leitura</Badge>
                  </div>
                </div>

                <Button className="w-full bg-transparent" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Gerenciar Permissões
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Template */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.nome}</DialogTitle>
              <DialogDescription>Detalhes do modelo de relatório</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Modelo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoria:</span>
                      <span>{selectedTemplate.categoria}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Periodicidade:</span>
                      <span>{selectedTemplate.periodicidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última Geração:</span>
                      <span>{format(new Date(selectedTemplate.ultimaGeracao), "dd/MM/yyyy")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedTemplate.status) as any}>{selectedTemplate.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estatísticas de Uso</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de Downloads:</span>
                      <span className="font-medium">{selectedTemplate.downloads}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Módulos Incluídos:</span>
                      <span className="font-medium">{selectedTemplate.modulos.length}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Módulos Incluídos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.modulos.map((modulo: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {modulo}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar
                </Button>
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Gerar Agora
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export { Reports as ReportsComponent }
export default Reports
