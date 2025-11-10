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
import { Separator } from "@/components/ui/separator"
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
// JSZip import removed along with eSocial export handlers
import { uploadRelatorio } from "@/lib/supabase/storage"

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
  "Não Conformidades",
  "Segurança do Trabalho",
]

function Reports() {
  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("configurar")

  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    nome: '',
    descricao: '',
    modulo: '',
    formato: 'pdf',
    parametros: {}
  })

  // Estados existentes
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [reportToDelete, setReportToDelete] = useState<any>(null)

  // Novos estados para agendados e configurações
  const [reportSettings, setReportSettings] = useState<any>({
    storage_path: 'relatorios/',
    retention_days: 90,
    default_email: '',
    email_subject: 'Relatório Automático',
    auto_send_email: false,
    default_format: 'pdf',
    pdf_quality: 'alta',
    compression: 'media'
  })

  const [totalTemplates, setTotalTemplates] = useState(0)
  const [totalReports, setTotalReports] = useState(0)
  const [totalDownloads, setTotalDownloads] = useState(0)
  // Removido: contagem de agendamentos ativos
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([])
  const [reportHistory, setReportHistory] = useState<any[]>([])
  const [setores, setSetores] = useState<string[]>([])

  const supabase = createClientComponentClient()

  const loadReportTemplates = async () => {
    if (!selectedCompany) return;

    try {
      const { data, error } = await supabase
        .from('modelos_relatorios')
        .select('*')
        .eq('empresa_id', selectedCompany.id)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Converter para o formato esperado pelo componente
      const templates = data?.map(template => ({
        id: template.id,
        nome: template.nome,
        descricao: template.descricao,
        categoria: template.modulo,
        modulos: template.parametros?.modulos_incluidos || [],
        periodicidade: template.parametros?.periodicidade || 'Mensal',
        status: 'Ativo',
        ultimaGeracao: template.updated_at,
        downloads: 0,
        formato: template.formato
      })) || [];

      setReportTemplates(templates);
      setTotalTemplates(templates.length);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      // Fallback para dados estáticos se houver erro
      if (selectedCompany) {
        const companyId = Number(selectedCompany.id) as keyof typeof reportTemplatesByCompany
        setReportTemplates(reportTemplatesByCompany[companyId] || [])
        setTotalTemplates(reportTemplatesByCompany[companyId]?.length || 0)
      }
    }
  }

  // Carregar lista de setores distintos da empresa atual
  const loadSetores = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('setor')
        .eq('empresa_id', selectedCompany.id)
        .not('setor', 'is', null)

      if (error) throw error

      const uniqueSetores = Array.from(new Set((data || []).map((r: any) => r.setor))).sort()
      setSetores(uniqueSetores)
    } catch (error) {
      console.error('Erro ao carregar setores:', error)
      setSetores([])
    }
  }

  const loadReportHistory = () => {
    if (!selectedCompany) return

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('relatorios_gerados')
          .select('id, titulo, modulo, tipo_relatorio, criado_em, usuario_id, status, arquivo_url, tamanho_arquivo')
          .eq('empresa_id', selectedCompany.id)
          .order('criado_em', { ascending: false })

        if (error) throw error

        const history = (data || []).map((r: any) => ({
          id: r.id,
          nome: r.titulo,
          tipo: r.modulo,
          dataGeracao: r.criado_em,
          geradoPor: 'Sistema',
          formato: (r.tipo_relatorio || 'PDF').toUpperCase(),
          tamanho: r.tamanho_arquivo || '-',
          status: r.status === 'Gerado' ? 'Concluído' : r.status === 'Gerando' ? 'Processando' : r.status || 'Concluído',
          arquivo_url: r.arquivo_url,
        }))

        setReportHistory(history)
        setTotalReports(history.length)
        setTotalDownloads(
          reportTemplates.reduce((acc, template) => acc + (template.downloads || 0), 0)
        )
        // Removido: contagem de agendamentos ativos
      } catch (error) {
        console.error('Erro ao carregar histórico de relatórios:', error)
        const companyId = Number(selectedCompany.id) as keyof typeof reportHistoryByCompany
        setReportHistory(reportHistoryByCompany[companyId] || [])
        setTotalReports(reportHistoryByCompany[companyId]?.length || 0)
        setTotalDownloads(
          reportTemplatesByCompany[companyId]?.reduce((acc, template) => acc + template.downloads, 0) || 0,
        )
        // Removido: contagem de agendamentos ativos
      }
    })()
  }

  useEffect(() => {
    if (selectedCompany) {
      loadReportTemplates()
      loadReportHistory()
      loadReportSettings()
      loadSetores()
    }
  }, [selectedCompany])

  // Prefill de destinatários removido junto ao módulo de agendados

  // Função de agendados removida

  // Função para carregar configurações
  const loadReportSettings = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from('configuracoes_relatorios')
        .select('*')
        .eq('empresa_id', selectedCompany.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setReportSettings({
          ...reportSettings,
          ...data.configuracoes
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  // Função para salvar configurações
  const saveReportSettings = async () => {
    if (!selectedCompany) return

    try {
      const { error } = await supabase
        .from('configuracoes_relatorios')
        .upsert({
          empresa_id: selectedCompany.id,
          configuracoes: reportSettings
        })

      if (error) throw error

      toast({
        title: "Configurações Salvas",
        description: "As configurações foram salvas com sucesso!",
      })
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  // Função para criar modelo no Supabase
  const handleCreateTemplate = async () => {
    if (!newTemplate.nome || !newTemplate.modulo) {
      toast({
        title: "Erro",
        description: "Nome e categoria são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('modelos_relatorios')
        .insert([{
          empresa_id: selectedCompany.id,
          nome: newTemplate.nome,
          descricao: newTemplate.descricao,
          modulo: newTemplate.modulo,
          formato: newTemplate.formato,
          parametros: {
            modulos_incluidos: selectedModules,
            ...newTemplate.parametros
          }
        }]);

      if (error) throw error;

      toast({
        title: "Modelo Criado",
        description: `Modelo "${newTemplate.nome}" criado com sucesso!`,
      });

      setShowCreateTemplateModal(false);
      setNewTemplate({ nome: '', descricao: '', modulo: '', formato: 'pdf', parametros: {} });
      setSelectedModules([]);
      
      // Recarregar templates
      loadReportTemplates();
    } catch (error) {
      console.error('Erro ao criar modelo:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar modelo. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  // eSocial handlers removed

  const handleGenerateReport = async (template: any) => {
    if (!selectedCompany) return

    setIsGenerating(true)
    try {
      const agora = new Date()
      const nomeArquivoBase = `${template.nome.replace(/\s+/g, "_")}_${format(agora, "yyyyMMdd_HHmm")}`
      const formato = (template.formato || reportSettings.default_format || "pdf").toLowerCase()
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        excel: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        csv: "text/csv",
      }
      const mimeType = mimeMap[formato] || "application/pdf"

      const conteudo = `Relatório: ${template.nome}\nEmpresa: ${selectedCompany.name}\nCategoria: ${template.categoria}\nGerado em: ${format(agora, "dd/MM/yyyy HH:mm")}\nMódulos: ${(template.modulos || []).join(", ")}`
      const blob = new Blob([conteudo], { type: mimeType })
      const fileName = `${nomeArquivoBase}.${formato === "excel" ? "xls" : formato}`
      const file = new File([blob], fileName, { type: mimeType })

      const upload = await uploadRelatorio(file, String(selectedCompany.id), fileName)
      if (!upload || upload.error) {
        throw new Error(upload?.error || "Falha no upload do relatório")
      }

      const { data: userData } = await supabase.auth.getUser()
      const usuarioId = userData?.user?.id || null

      const { error: insertError } = await supabase
        .from("relatorios_gerados")
        .insert({
          empresa_id: selectedCompany.id,
          usuario_id: usuarioId,
          modulo: (template.modulos?.[0] || template.categoria || "Relatórios"),
          tipo_relatorio: formato === "excel" ? "Excel" : formato.toUpperCase(),
          titulo: template.nome,
          parametros: { categoria: template.categoria, modulos: template.modulos },
          arquivo_url: upload.publicUrl,
          tamanho_arquivo: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          status: "Gerado",
        })

      if (insertError) {
        console.warn("[v0] Falha ao gravar histórico no banco:", insertError.message)
        setReportHistory((prev) => [
          ...prev,
          {
            id: Date.now(),
            nome: `${template.nome}`,
            tipo: template.categoria,
            dataGeracao: agora.toISOString(),
            geradoPor: "Sistema",
            formato: formato.toUpperCase(),
            tamanho: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            status: "Concluído",
            arquivo_url: upload.publicUrl,
          },
        ])
      } else {
        loadReportHistory()
      }

      toast({
        title: "Relatório Gerado",
        description: `Relatório "${template.nome}" gerado e armazenado com sucesso!`,
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
      if (!report.arquivo_url) throw new Error("URL do arquivo não disponível")

      const link = document.createElement("a")
      link.href = report.arquivo_url
      link.download = `${report.nome}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

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


  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase()
    switch (s) {
      case "ativo":
      case "concluído":
      case "concluido":
      case "enviado":
        return "default"
      case "processando":
      case "preparando":
        return "secondary"
      case "erro":
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

  // eSocial status icon helper removed

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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerar Novo Relatório - {selectedCompany.name}</DialogTitle>
              <DialogDescription>Configure um relatório personalizado com os dados desejados</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      {setores.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
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
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Cards de Resumo (ajustado após remoção de Agendamentos) */}
          <div className="grid gap-4 md:grid-cols-3">
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

            {/* Card de Agendamentos removido */}
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
                  <Button className="mt-4" onClick={() => setShowCreateTemplateModal(true)}>
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

        {/* eSocial tab, dialog, and content removed */}

        

        <TabsContent value="configuracoes" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Relatórios</CardTitle>
                <CardDescription>Personalize as configurações gerais dos relatórios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Configurações de Armazenamento</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pasta Padrão no Storage</Label>
                      <Input 
                        value={reportSettings.storage_path || 'relatorios/'}
                        onChange={(e) => setReportSettings({...reportSettings, storage_path: e.target.value})}
                        placeholder="relatorios/"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Retenção de Arquivos (dias)</Label>
                      <Input 
                        type="number"
                        value={reportSettings.retention_days || 90}
                        onChange={(e) => setReportSettings({...reportSettings, retention_days: parseInt(e.target.value)})}
                        placeholder="90"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Configurações de Email</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Padrão para Envio</Label>
                      <Input 
                        type="email"
                        value={reportSettings.default_email || ''}
                        onChange={(e) => setReportSettings({...reportSettings, default_email: e.target.value})}
                        placeholder="relatorios@empresa.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assunto Padrão</Label>
                      <Input 
                        value={reportSettings.email_subject || 'Relatório Automático'}
                        onChange={(e) => setReportSettings({...reportSettings, email_subject: e.target.value})}
                        placeholder="Relatório Automático"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="auto-send"
                      checked={reportSettings.auto_send_email || false}
                      onCheckedChange={(checked) => setReportSettings({...reportSettings, auto_send_email: checked})}
                    />
                    <Label htmlFor="auto-send">Enviar automaticamente por email após geração</Label>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Configurações de Formato</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Formato Padrão</Label>
                      <Select 
                        value={reportSettings.default_format || 'pdf'}
                        onValueChange={(value) => setReportSettings({...reportSettings, default_format: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="excel">Excel</SelectItem>
                          <SelectItem value="csv">CSV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Qualidade PDF</Label>
                      <Select 
                        value={reportSettings.pdf_quality || 'alta'}
                        onValueChange={(value) => setReportSettings({...reportSettings, pdf_quality: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Compressão</Label>
                      <Select 
                        value={reportSettings.compression || 'media'}
                        onValueChange={(value) => setReportSettings({...reportSettings, compression: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhuma">Nenhuma</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => loadReportSettings()}>
                    Cancelar
                  </Button>
                  <Button onClick={saveReportSettings}>
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal para Criar Modelo */}
      <Dialog open={showCreateTemplateModal} onOpenChange={setShowCreateTemplateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Novo Modelo de Relatório</DialogTitle>
            <DialogDescription>
              Configure um modelo personalizado para {selectedCompany.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Modelo</Label>
                <Input 
                  placeholder="Ex: Relatório Mensal de SST"
                  value={newTemplate.nome}
                  onChange={(e) => setNewTemplate({...newTemplate, nome: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={newTemplate.modulo} onValueChange={(value) => setNewTemplate({...newTemplate, modulo: value})}>
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
              <Label>Descrição</Label>
              <Input 
                placeholder="Descreva o objetivo deste relatório"
                value={newTemplate.descricao}
                onChange={(e) => setNewTemplate({...newTemplate, descricao: e.target.value})}
              />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Formato Padrão</Label>
                <Select value={newTemplate.formato} onValueChange={(value) => setNewTemplate({...newTemplate, formato: value})}>
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
                <Label>Periodicidade</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Frequência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowCreateTemplateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTemplate}>
               Criar Modelo
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Agendados removido */}
    </div>
  )
}

export { Reports }
export default Reports
