"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileUpload } from "@/components/ui/file-upload"
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  HardHat,
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  AlertCircle,
  Eye,
  FileText,
  Upload,
  Settings,
  History,
  Download,
} from "lucide-react"
import { formatDateSafe } from "@/lib/utils/date-utils"
import { createBrowserClient } from "@/lib/supabase/client"
import { uploadArquivo } from "@/lib/supabase/storage"

interface SafetyInspection {
  id: string
  empresa_id: string
  setor: string
  responsavel: string
  data_inspecao: string
  status: string
  observacoes?: string
  created_at: string
}

interface Incident {
  id: string
  empresa_id: string
  tipo: string
  descricao: string
  data_ocorrencia: string
  gravidade: string
  status: string
  evidencia_url?: string
  created_at: string
}

interface SafetyEquipment {
  id: string
  empresa_id: string
  nome: string
  tipo: string
  validade: string
  quantidade: number
  created_at: string
}

interface EPIDelivery {
  id: string
  funcionario_id: string
  empresa_id: string
  epi_id: string
  data_entrega: string
  validade: string
  funcionario?: {
    nome: string
  }
  epi?: {
    nome: string
    tipo: string
  }
}

interface EPIInspection {
  id: string
  empresa_id: string
  epi_id: string
  data_inspecao: string
  resultado: string
  observacoes?: string
  epi?: {
    nome: string
  }
}

interface EPIMaintenance {
  id: string
  empresa_id: string
  epi_id: string
  data_manutencao: string
  tipo: string
  descricao: string
  epi?: {
    nome: string
  }
}

interface SafetyReport {
  id: string
  empresa_id: string
  modulo: string
  tipo: string
  arquivo_url?: string
  data_geracao: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Concluída":
    case "Ativo":
    case "Resolvido":
      return "default"
    case "Pendente":
    case "Investigando":
      return "secondary"
    case "Vencida":
    case "Crítico":
      return "destructive"
    case "Manutenção":
      return "outline"
    default:
      return "secondary"
  }
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Baixa":
      return "default"
    case "Média":
      return "secondary"
    case "Alta":
      return "destructive"
    case "Crítica":
      return "destructive"
    default:
      return "secondary"
  }
}

export function WorkplaceSafety() {
  const [inspections, setInspections] = useState<SafetyInspection[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [equipment, setEquipment] = useState<SafetyEquipment[]>([])
  const [deliveries, setDeliveries] = useState<EPIDelivery[]>([])
  const [epiInspections, setEpiInspections] = useState<EPIInspection[]>([])
  const [epiMaintenances, setEpiMaintenances] = useState<EPIMaintenance[]>([])
  const [reports, setReports] = useState<SafetyReport[]>([])
  const [loading, setLoading] = useState(true)

  const { selectedCompany } = useCompany()
  const { toast } = useToast()

  const [selectedInspection, setSelectedInspection] = useState<SafetyInspection | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<SafetyEquipment | null>(null)
  const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState(false)
  const [isIncidentDialogOpen, setIsIncidentDialogOpen] = useState(false)
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [isInvestigateDialogOpen, setIsInvestigateDialogOpen] = useState(false)
  const [isEvidenceDialogOpen, setIsEvidenceDialogOpen] = useState(false)
  const [isInspectDialogOpen, setIsInspectDialogOpen] = useState(false)
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false)
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false)

  const supabase = createBrowserClient()

  const loadData = async () => {
    if (!selectedCompany) return

    try {
      setLoading(true)

      // Load inspections
      const { data: inspectionsData, error: inspectionsError } = await supabase
        .from("inspecoes_seguranca")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("data_inspecao", { ascending: false })

      if (inspectionsError) throw inspectionsError

      // Load incidents
      const { data: incidentsData, error: incidentsError } = await supabase
        .from("incidentes")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("data_ocorrencia", { ascending: false })

      if (incidentsError) throw incidentsError

      // Load equipment (EPIs)
      const { data: equipmentData, error: equipmentError } = await supabase
        .from("epis")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      if (equipmentError) throw equipmentError

      // Load EPI deliveries with employee and EPI details
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from("entregas_epi")
        .select(`
          *,
          funcionario:funcionarios(nome),
          epi:epis(nome, tipo)
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("data_entrega", { ascending: false })

      if (deliveriesError) throw deliveriesError

      // Load EPI inspections
      const { data: epiInspectionsData, error: epiInspectionsError } = await supabase
        .from("inspecoes_epi")
        .select(`
          *,
          epi:epis(nome)
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("data_inspecao", { ascending: false })

      if (epiInspectionsError) throw epiInspectionsError

      // Load EPI maintenances
      const { data: epiMaintenancesData, error: epiMaintenancesError } = await supabase
        .from("manutencoes_epi")
        .select(`
          *,
          epi:epis(nome)
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("data_manutencao", { ascending: false })

      if (epiMaintenancesError) throw epiMaintenancesError

      // Load safety reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("logs_gerais")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .eq("modulo", "Segurança do Trabalho")
        .order("data_geracao", { ascending: false })

      if (reportsError) throw reportsError

      setInspections(inspectionsData || [])
      setIncidents(incidentsData || [])
      setEquipment(equipmentData || [])
      setDeliveries(deliveriesData || [])
      setEpiInspections(epiInspectionsData || [])
      setEpiMaintenances(epiMaintenancesData || [])
      setReports(reportsData || [])
    } catch (error) {
      console.error("Erro ao carregar dados de segurança:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados de segurança.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCompany])

  const stats = {
    totalInspections: inspections.length,
    completedInspections: inspections.filter((i) => i.status === "done").length,
    pendingInspections: inspections.filter((i) => i.status === "scheduled").length,
    totalIncidents: incidents.length,
    resolvedIncidents: incidents.filter((i) => i.status === "resolvido").length,
    investigatingIncidents: incidents.filter((i) => i.status === "em análise").length,
    totalEquipment: equipment.length,
    activeEquipment: equipment.filter((e) => new Date(e.validade) > new Date()).length,
    expiredEquipment: equipment.filter((e) => new Date(e.validade) <= new Date()).length,
  }

  const handleCreateInspection = async (data: any) => {
    try {
      const { error } = await supabase.from("inspecoes_seguranca").insert([
        {
          empresa_id: selectedCompany?.id,
          setor: data.setor,
          responsavel: data.responsavel,
          data_inspecao: data.data_inspecao,
          status: data.status || "scheduled",
          observacoes: data.observacoes,
        },
      ])

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Inspeção criada com sucesso.",
      })

      loadData()
    } catch (error) {
      console.error("Erro ao criar inspeção:", error)
      toast({
        title: "Erro",
        description: "Não foi possível criar a inspeção.",
        variant: "destructive",
      })
    }
  }

  const handleCreateIncident = async (data: any) => {
    try {
      const { error } = await supabase.from("incidentes").insert([
        {
          empresa_id: selectedCompany?.id,
          tipo: data.tipo,
          descricao: data.descricao,
          data_ocorrencia: data.data_ocorrencia,
          gravidade: data.gravidade,
          status: data.status || "aberto",
          evidencia_url: data.evidencia_url,
        },
      ])

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Incidente registrado com sucesso.",
      })

      loadData()
    } catch (error) {
      console.error("Erro ao criar incidente:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar o incidente.",
        variant: "destructive",
      })
    }
  }

  const handleUploadEvidence = async (file: File, incidentId: string) => {
    try {
      const fileName = `incident-${incidentId}-${Date.now()}-${file.name}`
      const filePath = await uploadArquivo(file, "evidencia", selectedCompany?.id || "", fileName)

      const { error } = await supabase.from("incidentes").update({ evidencia_url: filePath }).eq("id", incidentId)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Evidência anexada com sucesso.",
      })

      loadData()
    } catch (error) {
      console.error("Erro ao fazer upload da evidência:", error)
      toast({
        title: "Erro",
        description: "Não foi possível anexar a evidência.",
        variant: "destructive",
      })
    }
  }

  const handleGenerateReport = async (tipo: string) => {
    try {
      // Generate report content based on type
      let reportContent = ""
      let fileName = ""

      switch (tipo) {
        case "inspecoes":
          reportContent = `Relatório de Inspeções - ${selectedCompany?.name}\n\nTotal de inspeções: ${stats.totalInspections}\nConcluídas: ${stats.completedInspections}\nPendentes: ${stats.pendingInspections}`
          fileName = `relatorio-inspecoes-${Date.now()}.txt`
          break
        case "incidentes":
          reportContent = `Análise de Incidentes - ${selectedCompany?.name}\n\nTotal de incidentes: ${stats.totalIncidents}\nResolvidos: ${stats.resolvedIncidents}\nEm investigação: ${stats.investigatingIncidents}`
          fileName = `analise-incidentes-${Date.now()}.txt`
          break
        case "equipamentos":
          reportContent = `Status dos Equipamentos - ${selectedCompany?.name}\n\nTotal de equipamentos: ${stats.totalEquipment}\nAtivos: ${stats.activeEquipment}\nVencidos: ${stats.expiredEquipment}`
          fileName = `status-equipamentos-${Date.now()}.txt`
          break
      }

      // Create file and upload to storage
      const blob = new Blob([reportContent], { type: "text/plain" })
      const file = new File([blob], fileName, { type: "text/plain" })

      const filePath = await uploadArquivo(file, "relatorio", selectedCompany?.id || "", fileName)

      // Save report record to database
      const { error } = await supabase.from("logs_gerais").insert([
        {
          empresa_id: selectedCompany?.id,
          modulo: "Segurança do Trabalho",
          tipo: tipo,
          arquivo_url: filePath,
        },
      ])

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso.",
      })

      loadData()
    } catch (error) {
      console.error("Erro ao gerar relatório:", error)
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      })
    }
  }

  const handleViewInspectionDetails = (inspection: SafetyInspection) => {
    setSelectedInspection(inspection)
    setIsInspectionDialogOpen(true)
  }

  const handleScheduleNextInspection = (inspection: SafetyInspection) => {
    setSelectedInspection(inspection)
    setIsScheduleDialogOpen(true)
  }

  const handleViewIncidentDetails = (incident: Incident) => {
    setSelectedIncident(incident)
    setIsIncidentDialogOpen(true)
  }

  const handleInvestigateIncident = (incident: Incident) => {
    setSelectedIncident(incident)
    setIsInvestigateDialogOpen(true)
  }

  const handleAddEvidence = (incident: Incident) => {
    setSelectedIncident(incident)
    setIsEvidenceDialogOpen(true)
  }

  const handleViewEquipmentDetails = (equipment: SafetyEquipment) => {
    setSelectedEquipment(equipment)
    setIsEquipmentDialogOpen(true)
  }

  const handleInspectEquipment = (equipment: SafetyEquipment) => {
    setSelectedEquipment(equipment)
    setIsInspectDialogOpen(true)
  }

  const handleScheduleMaintenance = (equipment: SafetyEquipment) => {
    setSelectedEquipment(equipment)
    setIsMaintenanceDialogOpen(true)
  }

  const handleViewHistory = (equipment: SafetyEquipment) => {
    setSelectedEquipment(equipment)
    setIsHistoryDialogOpen(true)
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            <span>Segurança do Trabalho</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestão de inspeções, incidentes e equipamentos de segurança
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione uma empresa para visualizar e gerenciar as informações de segurança do trabalho.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="leading-tight">Segurança do Trabalho</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestão de inspeções, incidentes e equipamentos de segurança - {selectedCompany.name}
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dados de segurança...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="leading-tight">Segurança do Trabalho</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestão de inspeções, incidentes e equipamentos de segurança - {selectedCompany.name}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Nova Inspeção
          </Button>
          <Button className="w-full sm:w-auto">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Reportar Incidente
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inspeções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalInspections}</div>
            <p className="text-xs text-muted-foreground">{stats.completedInspections} concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Incidentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.totalIncidents}</div>
            <p className="text-xs text-muted-foreground">{stats.investigatingIncidents} investigando</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Equipamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalEquipment}</div>
            <p className="text-xs text-muted-foreground">{stats.activeEquipment} ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conformidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {stats.totalInspections > 0 ? Math.round((stats.completedInspections / stats.totalInspections) * 100) : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Taxa geral</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inspecoes" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="inspecoes" className="text-xs sm:text-sm">
              Inspeções
            </TabsTrigger>
            <TabsTrigger value="incidentes" className="text-xs sm:text-sm">
              Incidentes
            </TabsTrigger>
            <TabsTrigger value="equipamentos" className="text-xs sm:text-sm">
              Equipamentos
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs sm:text-sm">
              Relatórios
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="inspecoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Inspeções de Segurança</CardTitle>
              <CardDescription className="text-sm">
                Histórico e status das inspeções realizadas - {selectedCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inspections.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma inspeção encontrada</h3>
                  <p className="text-muted-foreground">
                    Não há inspeções de segurança cadastradas para {selectedCompany.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {inspections.map((inspection) => (
                    <div key={inspection.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{inspection.setor}</h3>
                          <p className="text-sm text-muted-foreground">
                            Responsável: {inspection.responsavel} • {formatDateSafe(inspection.data_inspecao)}
                          </p>
                        </div>
                        <Badge variant={getStatusColor(inspection.status) as any}>
                          {inspection.status === "done"
                            ? "Concluída"
                            : inspection.status === "scheduled"
                              ? "Agendada"
                              : inspection.status === "critical"
                                ? "Crítica"
                                : inspection.status}
                        </Badge>
                      </div>

                      {inspection.observacoes && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">{inspection.observacoes}</p>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex space-x-4 text-sm text-muted-foreground">
                          <span>📍 {inspection.setor}</span>
                          <span>📅 {formatDateSafe(inspection.data_inspecao)}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewInspectionDetails(inspection)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Detalhes
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleScheduleNextInspection(inspection)}>
                            <Calendar className="h-4 w-4 mr-1" />
                            Agendar Próxima
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

        <TabsContent value="incidentes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Incidentes e Acidentes</CardTitle>
              <CardDescription className="text-sm">
                Registro e acompanhamento de ocorrências - {selectedCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {incidents.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum incidente registrado</h3>
                  <p className="text-muted-foreground">
                    Não há incidentes ou acidentes registrados para {selectedCompany.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant={getSeverityColor(incident.gravidade) as any}>{incident.gravidade}</Badge>
                            <Badge variant="outline">{incident.tipo}</Badge>
                          </div>
                          <h3 className="font-semibold text-base mb-1">{incident.descricao}</h3>
                          <p className="text-sm text-muted-foreground">📅 {formatDateSafe(incident.data_ocorrencia)}</p>
                        </div>
                        <Badge variant={getStatusColor(incident.status) as any}>
                          {incident.status === "aberto"
                            ? "Aberto"
                            : incident.status === "em análise"
                              ? "Em Análise"
                              : incident.status === "resolvido"
                                ? "Resolvido"
                                : incident.status}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewIncidentDetails(incident)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                        {incident.status === "em análise" && (
                          <Button variant="outline" size="sm" onClick={() => handleInvestigateIncident(incident)}>
                            <Search className="h-4 w-4 mr-1" />
                            Investigar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleAddEvidence(incident)}>
                          <Upload className="h-4 w-4 mr-1" />
                          Adicionar Evidência
                        </Button>
                        {incident.evidencia_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(incident.evidencia_url, "_blank")}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipamentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Equipamentos de Segurança (EPIs)</CardTitle>
              <CardDescription className="text-sm">
                Controle e manutenção de EPIs - {selectedCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {equipment.length === 0 ? (
                <div className="text-center py-8">
                  <HardHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum equipamento cadastrado</h3>
                  <p className="text-muted-foreground">
                    Não há equipamentos de segurança cadastrados para {selectedCompany.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {equipment.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base mb-1">{item.nome}</h3>
                          <p className="text-sm text-muted-foreground">
                            Tipo: {item.tipo} • Quantidade: {item.quantidade}
                          </p>
                          <p className="text-sm text-muted-foreground">Validade: {formatDateSafe(item.validade)}</p>
                        </div>
                        <Badge variant={new Date(item.validade) > new Date() ? "default" : "destructive"}>
                          {new Date(item.validade) > new Date() ? "Válido" : "Vencido"}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewEquipmentDetails(item)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleInspectEquipment(item)}>
                          <Search className="h-4 w-4 mr-1" />
                          Inspecionar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleScheduleMaintenance(item)}>
                          <Settings className="h-4 w-4 mr-1" />
                          Manutenção
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleViewHistory(item)}>
                          <History className="h-4 w-4 mr-1" />
                          Histórico
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Relatório de Inspeções</CardTitle>
                <CardDescription className="text-sm">Consolidado das inspeções de segurança realizadas</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => handleGenerateReport("inspecoes")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Análise de Incidentes</CardTitle>
                <CardDescription className="text-sm">
                  Estatísticas e tendências dos incidentes registrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-transparent"
                  variant="outline"
                  onClick={() => handleGenerateReport("incidentes")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Status dos Equipamentos</CardTitle>
                <CardDescription className="text-sm">Controle de manutenção e inspeção de EPIs</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-transparent"
                  variant="outline"
                  onClick={() => handleGenerateReport("equipamentos")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          </div>

          {reports.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Relatórios Gerados</CardTitle>
                <CardDescription className="text-sm">
                  Histórico de relatórios gerados para {selectedCompany.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-base mb-1">{report.tipo}</h3>
                          <p className="text-sm text-muted-foreground">
                            Gerado em: {formatDateSafe(report.data_geracao, "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                        {report.arquivo_url && (
                          <Button variant="outline" size="sm" onClick={() => window.open(report.arquivo_url, "_blank")}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isEvidenceDialogOpen} onOpenChange={setIsEvidenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Evidência</DialogTitle>
            <DialogDescription>Anexe fotos, documentos ou outras evidências</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Arquivo de Evidência</Label>
              <FileUpload
                onUpload={(file) => {
                  if (selectedIncident) {
                    handleUploadEvidence(file, selectedIncident.id)
                    setIsEvidenceDialogOpen(false)
                  }
                }}
                accept="image/*,.pdf,.doc,.docx"
                maxSize={10 * 1024 * 1024} // 10MB
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ... existing dialogs ... */}
    </div>
  )
}

export { WorkplaceSafety as WorkplaceSafetyComponent }
export default WorkplaceSafety
