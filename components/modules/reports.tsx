"use client"

import { useState, useEffect } from "react"
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
import { useToast } from "@/hooks/use-toast"
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
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import JSZip from "jszip"

interface ReportTemplate {
  id: number
  nome: string
  categoria: string
  descricao: string
  modulos: string[]
  periodicidade: string
  ultimaGeracao: string
  status: string
  downloads: number
}

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

const availableModules = [
  "Dashboard",
  "Funcionários",
  "Exames",
  "Treinamentos",
  "Saúde Ocupacional",
  "Gestão de Riscos",
  "Treinamentos",
  "Não Conformidades",
  "Segurança do Trabalho",
]

function Reports() {
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("configurar")

  const [esocialEvents, setEsocialEvents] = useState<any[]>([])
  const [fatoresRisco, setFatoresRisco] = useState<any[]>([])
  const [loadingEsocial, setLoadingEsocial] = useState(false)
  const [generatingEvent, setGeneratingEvent] = useState(false)

  // Estados existentes
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [reportToDelete, setReportToDelete] = useState<any>(null)
  const [selectedEsocialEvent, setSelectedEsocialEvent] = useState<any>(null)
  const [isResending, setIsResending] = useState(false)
  const [esocialConfig, setEsocialConfig] = useState({
    eventTypes: [] as string[],
    frequency: "manual",
    companies: [] as string[],
  })

  const [totalTemplates, setTotalTemplates] = useState(0)
  const [totalReports, setTotalReports] = useState(0)
  const [totalDownloads, setTotalDownloads] = useState(0)
  const [activeSchedules, setActiveSchedules] = useState(0)
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([])
  const [reportHistory, setReportHistory] = useState<any[]>([])

  const supabase = createClientComponentClient()

  const loadEsocialEvents = async () => {
    if (!selectedCompany) return

    setLoadingEsocial(true)
    try {
      const { data, error } = await supabase
        .from("view_eventos_esocial")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setEsocialEvents(data || [])
    } catch (error) {
      console.error("[v0] Erro ao carregar eventos eSocial:", error)
    } finally {
      setLoadingEsocial(false)
    }
  }

  const loadFatoresRisco = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("fatores_risco")
        .select(`
          *,
          funcionarios (
            nome,
            cpf
          )
        `)
        .eq("empresa_id", selectedCompany.id)

      if (error) throw error
      setFatoresRisco(data || [])
    } catch (error) {
      console.error("[v0] Erro ao carregar fatores de risco:", error)
    }
  }

  const loadReportTemplates = () => {
    if (selectedCompany) {
      const companyId = Number(selectedCompany.id) as keyof typeof reportTemplatesByCompany
      setReportTemplates(reportTemplatesByCompany[companyId] || [])
      setTotalTemplates(reportTemplatesByCompany[companyId]?.length || 0)
    }
  }

  const loadReportHistory = () => {
    if (selectedCompany) {
      const companyId = Number(selectedCompany.id) as keyof typeof reportHistoryByCompany
      setReportHistory(reportHistoryByCompany[companyId] || [])
      setTotalReports(reportHistoryByCompany[companyId]?.length || 0)
      setTotalDownloads(
        reportTemplatesByCompany[companyId]?.reduce((acc, template) => acc + template.downloads, 0) || 0,
      )
      setActiveSchedules(0) // Placeholder for active schedules
    }
  }

  useEffect(() => {
    if (selectedCompany && activeTab === "esocial") {
      loadEsocialEvents()
      loadFatoresRisco()
    }
    if (selectedCompany) {
      loadReportTemplates()
      loadReportHistory()
    }
  }, [selectedCompany, activeTab])

  const generateS2220Event = async () => {
    if (!selectedCompany) return

    setGeneratingEvent(true)
    try {
      const { error } = await supabase.from("eventos_esocial").insert({
        empresa_id: selectedCompany.id,
        tipo_evento: "S-2220",
        status: "pendente",
        data_evento: new Date().toISOString(),
      })

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Evento S-2220 gerado com sucesso!",
      })
      loadEsocialEvents() // Recarregar lista
    } catch (error) {
      console.error("Erro ao gerar evento S-2220:", error)
      toast({
        title: "Erro",
        description: "Erro ao gerar evento S-2220",
        variant: "destructive",
      })
    } finally {
      setGeneratingEvent(false)
    }
  }

  const generateS2240Event = async () => {
    if (!selectedCompany) return

    setGeneratingEvent(true)
    try {
      const { error } = await supabase.from("eventos_esocial").insert({
        empresa_id: selectedCompany.id,
        tipo_evento: "S-2240",
        status: "pendente",
        data_evento: new Date().toISOString(),
      })

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Evento S-2240 gerado com sucesso!",
      })
      loadEsocialEvents() // Recarregar lista
    } catch (error) {
      console.error("Erro ao gerar evento S-2240:", error)
      toast({
        title: "Erro",
        description: "Erro ao gerar evento S-2240",
        variant: "destructive",
      })
    } finally {
      setGeneratingEvent(false)
    }
  }

  const handleExportXML = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from("eventos_esocial")
        .select("xml_gerado, tipo_evento")
        .eq("id", eventId)
        .single()

      if (error) throw error

      if (data.xml_gerado) {
        const blob = new Blob([data.xml_gerado], { type: "application/xml" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${data.tipo_evento}_${eventId}.xml`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast({
          title: "XML exportado",
          description: "Arquivo XML baixado com sucesso.",
          variant: "default",
        })
      } else {
        toast({
          title: "XML não disponível",
          description: "Este evento ainda não possui XML gerado.",
          variant: "warning",
        })
      }
    } catch (error) {
      console.error("Erro ao exportar XML:", error)
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o XML. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleGenerateReport = async (template: any) => {
    if (!selectedCompany) return

    setIsGenerating(true)
    try {
      // Simular chamada API
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Aqui seria a chamada real para /api/reports/generate
      console.log("[v0] Gerando relatório:", template.nome)

      // Simular sucesso
      toast({
        title: "Relatório Gerado",
        description: `Relatório "${template.nome}" gerado com sucesso!`,
      })
    } catch (error) {
      console.error("Erro ao gerar relatório:", error)
      toast({
        title: "Erro",
        description: "Erro ao gerar relatório. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleConfigureTemplate = (template: any) => {
    setSelectedTemplate(template)
    setIsConfiguring(true)
  }

  const handleViewReport = (report: any) => {
    setSelectedReport(report)
  }

  const handleDownloadReport = async (report: any) => {
    try {
      // Simular download
      console.log("[v0] Baixando relatório:", report.nome)

      // Aqui seria a chamada real para /api/reports/download
      const link = document.createElement("a")
      link.href = "#" // URL real do arquivo
      link.download = `${report.nome}.pdf`
      link.click()

      toast({
        title: "Download Iniciado",
        description: `Download de "${report.nome}" iniciado!`,
      })
    } catch (error) {
      console.error("Erro no download:", error)
      toast({
        title: "Erro",
        description: "Erro no download. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteReport = async (report: any) => {
    try {
      // Simular chamada API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("[v0] Excluindo relatório:", report.nome)
      toast({
        title: "Relatório Excluído",
        description: `Relatório "${report.nome}" excluído com sucesso!`,
      })
      setReportToDelete(null)
    } catch (error) {
      console.error("Erro ao excluir:", error)
      toast({
        title: "Erro",
        description: "Erro ao excluir relatório.",
        variant: "destructive",
      })
    }
  }

  const handleViewEsocialEvent = (event: any) => {
    setSelectedEsocialEvent(event)
  }

  const handleResendEsocialEvent = async (event: any) => {
    if (!selectedCompany) return

    setIsResending(true)
    try {
      const { error } = await supabase.from("eventos_esocial").update({ status: "pendente" }).eq("id", event.id)

      if (error) throw error

      toast({
        title: "Evento Reenviado",
        description: `Evento ${event.tipo_evento} marcado para reenvio!`,
      })
      loadEsocialEvents() // Recarregar lista
    } catch (error) {
      console.error("Erro ao reenviar:", error)
      toast({
        title: "Erro",
        description: "Erro ao reenviar evento.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleExportEsocial = async (exportFormat: string) => {
    try {
      if (exportFormat === "xml") {
        const { data, error } = await supabase
          .from("eventos_esocial")
          .select("id, tipo_evento, xml_gerado, data_evento")
          .eq("empresa_id", selectedCompany?.id)
          .not("xml_gerado", "is", null)

        if (error) throw error

        if (data && data.length > 0) {
          // Criar ZIP com todos os XMLs usando JSZip
          const zip = new JSZip()

          // Adicionar cada XML ao ZIP
          data.forEach((event) => {
            const fileName = `${event.tipo_evento}_${event.id}_${format(new Date(event.data_evento), "yyyyMMdd")}.xml`
            zip.file(fileName, event.xml_gerado)
          })

          // Gerar o arquivo ZIP
          const zipBlob = await zip.generateAsync({ type: "blob" })

          // Download do ZIP
          const url = URL.createObjectURL(zipBlob)
          const a = document.createElement("a")
          a.href = url
          a.download = `esocial_xmls_${selectedCompany?.name || 'empresa'}_${format(new Date(), "yyyyMMdd")}.zip`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          toast({
            title: "Exportação concluída",
            description: `${data.length} arquivos XML exportados em ZIP.`,
            variant: "default",
          })
        } else {
          toast({
            title: "Nenhum XML disponível",
            description: "Não há eventos com XML gerado para exportação.",
            variant: "warning",
          })
        }
      } else if (exportFormat === "csv") {
        const { data, error } = await supabase
          .from("eventos_esocial")
          .select("*")
          .eq("empresa_id", selectedCompany?.id)
          .order("data_evento", { ascending: false })

        if (error) throw error

        if (data && data.length > 0) {
          // Converter para CSV
          const headers = ["ID", "Tipo Evento", "Data Evento", "Status", "Funcionário", "Data Envio", "Protocolo"]
          const csvContent = [
            headers.join(","),
            ...data.map((event) =>
              [
                event.id,
                event.tipo_evento,
                format(new Date(event.data_evento), "dd/MM/yyyy"),
                event.status,
                event.funcionario_nome || "",
                event.data_envio ? format(new Date(event.data_envio), "dd/MM/yyyy HH:mm") : "",
                event.protocolo_recepcao || "",
              ].join(","),
            ),
          ].join("\n")

          // Download do CSV
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `esocial_eventos_${selectedCompany?.name || 'empresa'}_${format(new Date(), "yyyyMMdd")}.csv`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          toast({
            title: "CSV exportado",
            description: `${data.length} eventos exportados em CSV.`,
            variant: "default",
          })
        } else {
          toast({
            title: "Nenhum evento disponível",
            description: "Não há eventos para exportação.",
            variant: "warning",
          })
        }
      }
    } catch (error) {
      console.error("Erro na exportação:", error)
      toast({
        title: "Erro na exportação",
        description: "Não foi possível completar a exportação. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ativo":
      case "Concluído":
      case "Enviado":
        return "default"
      case "Processando":
      case "Pendente":
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

  const getEsocialStatusIcon = (status: string) => {
    switch (status) {
      case "Enviado":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Pendente":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "Erro":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

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
            Geração dinâmica de relatórios por módulo e unidade organizacional - {selectedCompany?.name}
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
              <DialogTitle>Gerar Novo Relatório - {selectedCompany.name}</DialogTitle>
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
          <TabsTrigger value="esocial">eSocial</TabsTrigger>
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
                <p className="text-xs text-muted-foreground">Para {selectedCompany.name}</p>
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
              <CardTitle>Modelos de Relatórios - {selectedCompany.name}</CardTitle>
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
                          <Button variant="outline" size="sm" onClick={() => handleConfigureTemplate(template)}>
                            <Settings className="h-4 w-4 mr-1" />
                            Configurar
                          </Button>
                          <Button size="sm" onClick={() => handleGenerateReport(template)} disabled={isGenerating}>
                            {isGenerating ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
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
              <CardTitle>Histórico de Relatórios - {selectedCompany.name}</CardTitle>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadReport(report)}
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewReport(report)}
                                  title="Visualizar"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="Enviar por email">
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setReportToDelete(report)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4" />
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

        <TabsContent value="esocial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios eSocial - {selectedCompany.name}</CardTitle>
              <CardDescription>Eventos eSocial transmitidos e pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Input placeholder="Buscar por funcionário ou evento..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Evento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="s-2220">S-2220</SelectItem>
                      <SelectItem value="s-2240">S-2240</SelectItem>
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
                <div className="flex space-x-2">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </Button>
                  <Button disabled={generatingEvent}>
                    <Plus className="h-4 w-4 mr-2" />
                    {generatingEvent ? "Gerando..." : "Gerar Manualmente"}
                  </Button>
                </div>
              </div>

              {loadingEsocial ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Carregando eventos eSocial...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {esocialEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">Nenhum evento eSocial para esta empresa.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      esocialEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{event.tipo_evento}</p>
                              <p className="text-sm text-muted-foreground">{event.tipo_descricao}</p>
                            </div>
                          </TableCell>
                          <TableCell>{event.funcionario_nome}</TableCell>
                          <TableCell>{event.cpf}</TableCell>
                          <TableCell>{format(new Date(event.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getEsocialStatusIcon(event.status)}
                              <Badge variant={getStatusColor(event.status) as any}>{event.status}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewEsocialEvent(event)}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {(event.status === "erro" || event.status === "pendente") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResendEsocialEvent(event)}
                                  disabled={isResending}
                                  title="Reenviar"
                                >
                                  {isResending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportXML(event.id)}
                                title="Exportar XML"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agendados" className="space-y-4">
          {/* Agendados Content */}
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-4">
          {/* Configurações Content */}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { Reports }
export default Reports
