"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface SafetyInspection {
  id: string
  empresa_id: string
  setor: string
  local_inspecao?: string
  responsavel: string
  data_inspecao: string
  status: string
  observacoes?: string
  agendar_proxima?: string
  created_at: string
  updated_at?: string
}

interface Incident {
  id: string
  empresa_id: string
  tipo: string
  descricao: string
  data_ocorrencia: string
  gravidade: string
  status: string
  evidencias_url?: string
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
  
  // Estados para agendamento da próxima inspeção
  const [nextInspectionDate, setNextInspectionDate] = useState("")
  const [nextInspectionObservations, setNextInspectionObservations] = useState("")

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
          evidencias_url: data.evidencias_url,
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
      const filePath = await uploadArquivo(file, "evidencias", selectedCompany?.id || "", fileName)

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

  const generatePDFReport = async (tipo: string) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Header
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      pdf.text('RELATÓRIO DE SEGURANÇA DO TRABALHO', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Empresa: ${selectedCompany?.name}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      pdf.text(`Data de Geração: ${formatDateSafe(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 20

      // Content based on report type
      switch (tipo) {
        case 'inspecoes':
          pdf.setFontSize(16)
          pdf.setFont('helvetica', 'bold')
          pdf.text('RELATÓRIO DE INSPEÇÕES', 20, yPosition)
          yPosition += 15

          // Statistics
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'normal')
          pdf.text('RESUMO ESTATÍSTICO:', 20, yPosition)
          yPosition += 8
          pdf.text(`• Total de Inspeções: ${stats.totalInspections}`, 25, yPosition)
          yPosition += 6
          pdf.text(`• Inspeções Concluídas: ${stats.completedInspections}`, 25, yPosition)
          yPosition += 6
          pdf.text(`• Inspeções Pendentes: ${stats.pendingInspections}`, 25, yPosition)
          yPosition += 15

          // Detailed inspections
          if (inspections.length > 0) {
            pdf.text('DETALHAMENTO DAS INSPEÇÕES:', 20, yPosition)
            yPosition += 10

            inspections.slice(0, 10).forEach((inspection, index) => {
              if (yPosition > pageHeight - 30) {
                pdf.addPage()
                yPosition = 20
              }
              pdf.text(`${index + 1}. ${inspection.setor} - ${inspection.responsavel}`, 25, yPosition)
              yPosition += 5
              pdf.text(`   Data: ${formatDateSafe(inspection.data_inspecao)} | Status: ${inspection.status}`, 25, yPosition)
              yPosition += 5
              if (inspection.observacoes) {
                pdf.text(`   Observações: ${inspection.observacoes.substring(0, 80)}...`, 25, yPosition)
                yPosition += 5
              }
              yPosition += 3
            })
          }
          break

        case 'incidentes':
          pdf.setFontSize(16)
          pdf.setFont('helvetica', 'bold')
          pdf.text('ANÁLISE DE INCIDENTES', 20, yPosition)
          yPosition += 15

          // Statistics
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'normal')
          pdf.text('RESUMO ESTATÍSTICO:', 20, yPosition)
          yPosition += 8
          pdf.text(`• Total de Incidentes: ${stats.totalIncidents}`, 25, yPosition)
          yPosition += 6
          pdf.text(`• Incidentes Resolvidos: ${stats.resolvedIncidents}`, 25, yPosition)
          yPosition += 6
          pdf.text(`• Em Investigação: ${stats.investigatingIncidents}`, 25, yPosition)
          yPosition += 15

          // Detailed incidents
          if (incidents.length > 0) {
            pdf.text('DETALHAMENTO DOS INCIDENTES:', 20, yPosition)
            yPosition += 10

            incidents.slice(0, 10).forEach((incident, index) => {
              if (yPosition > pageHeight - 30) {
                pdf.addPage()
                yPosition = 20
              }
              pdf.text(`${index + 1}. ${incident.tipo} - Gravidade: ${incident.gravidade}`, 25, yPosition)
              yPosition += 5
              pdf.text(`   Data: ${formatDateSafe(incident.data_ocorrencia)} | Status: ${incident.status}`, 25, yPosition)
              yPosition += 5
              pdf.text(`   Descrição: ${incident.descricao.substring(0, 80)}...`, 25, yPosition)
              yPosition += 8
            })
          }
          break

        case 'equipamentos':
          pdf.setFontSize(16)
          pdf.setFont('helvetica', 'bold')
          pdf.text('STATUS DOS EQUIPAMENTOS', 20, yPosition)
          yPosition += 15

          // Statistics
          pdf.setFontSize(12)
          pdf.setFont('helvetica', 'normal')
          pdf.text('RESUMO ESTATÍSTICO:', 20, yPosition)
          yPosition += 8
          pdf.text(`• Total de Equipamentos: ${stats.totalEquipment}`, 25, yPosition)
          yPosition += 6
          pdf.text(`• Equipamentos Ativos: ${stats.activeEquipment}`, 25, yPosition)
          yPosition += 6
          pdf.text(`• Equipamentos Vencidos: ${stats.expiredEquipment}`, 25, yPosition)
          yPosition += 15

          // Detailed equipment
          if (equipment.length > 0) {
            pdf.text('DETALHAMENTO DOS EQUIPAMENTOS:', 20, yPosition)
            yPosition += 10

            equipment.slice(0, 15).forEach((item, index) => {
              if (yPosition > pageHeight - 30) {
                pdf.addPage()
                yPosition = 20
              }
              pdf.text(`${index + 1}. ${item.nome} (${item.tipo})`, 25, yPosition)
              yPosition += 5
              pdf.text(`   Quantidade: ${item.quantidade} | Validade: ${formatDateSafe(item.validade)}`, 25, yPosition)
              yPosition += 8
            })
          }
          break
      }

      // Footer
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'italic')
      pdf.text('Relatório gerado automaticamente pelo Sistema MASTPROD', pageWidth / 2, pageHeight - 10, { align: 'center' })

      return pdf
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      throw error
    }
  }

  const handleGenerateReport = async (tipo: string) => {
    try {
      // Generate PDF
      const pdf = await generatePDFReport(tipo)
      
      // Convert PDF to blob
      const pdfBlob = pdf.output('blob')
      
      // Create filename
      const timestamp = Date.now()
      let fileName = ''
      let reportTitle = ''
      
      switch (tipo) {
        case 'inspecoes':
          fileName = `relatorio-inspecoes-${timestamp}.pdf`
          reportTitle = 'Relatório de Inspeções'
          break
        case 'incidentes':
          fileName = `analise-incidentes-${timestamp}.pdf`
          reportTitle = 'Análise de Incidentes'
          break
        case 'equipamentos':
          fileName = `status-equipamentos-${timestamp}.pdf`
          reportTitle = 'Status dos Equipamentos'
          break
      }

      // Create file from blob
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' })

      // Upload to storage
      const filePath = await uploadArquivo(file, 'relatorios', selectedCompany?.id || '', fileName)

      // Save report record to database
      const { error } = await supabase.from('logs_gerais').insert([
        {
          empresa_id: selectedCompany?.id,
          modulo: 'Segurança do Trabalho',
          tipo: reportTitle,
          arquivo_url: filePath,
          data_geracao: new Date().toISOString(),
        },
      ])

      if (error) throw error

      // Also trigger direct download
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Sucesso',
        description: `${reportTitle} gerado e salvo com sucesso.`,
      })

      loadData()
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível gerar o relatório.',
        variant: 'destructive',
      })
    }
  }

  const handleDownloadReport = async (report: SafetyReport) => {
    try {
      if (!report.arquivo_url) {
        toast({
          title: 'Erro',
          description: 'URL do arquivo não encontrada.',
          variant: 'destructive',
        })
        return
      }

      // Open file in new tab for download
      window.open(report.arquivo_url, '_blank')
      
      toast({
        title: 'Sucesso',
        description: 'Download iniciado.',
      })
    } catch (error) {
      console.error('Erro ao fazer download:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível fazer o download do relatório.',
        variant: 'destructive',
      })
    }
  }

  const handleViewInspectionDetails = (inspection: SafetyInspection) => {
    setSelectedInspection(inspection)
    setIsInspectionDialogOpen(true)
  }

  const handleScheduleNextInspection = (inspection: SafetyInspection) => {
    setSelectedInspection(inspection)
    // Limpar campos do formulário
    setNextInspectionDate("")
    setNextInspectionObservations("")
    setIsScheduleDialogOpen(true)
  }

  const handleSaveNextInspection = async () => {
    if (!selectedInspection || !nextInspectionDate) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a data da próxima inspeção.",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("inspecoes_seguranca")
        .update({ agendar_proxima: nextInspectionDate })
        .eq("id", selectedInspection.id)

      if (error) throw error

      // Criar nova inspeção agendada
      const { error: insertError } = await supabase
        .from("inspecoes_seguranca")
        .insert([
          {
            empresa_id: selectedInspection.empresa_id,
            setor: selectedInspection.setor,
            local_inspecao: selectedInspection.local_inspecao,
            responsavel: selectedInspection.responsavel,
            data_inspecao: nextInspectionDate,
            status: "scheduled",
            observacoes: nextInspectionObservations || "Inspeção agendada automaticamente",
          },
        ])

      if (insertError) throw insertError

      toast({
        title: "Sucesso",
        description: "Próxima inspeção agendada com sucesso.",
      })

      setIsScheduleDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Erro ao agendar próxima inspeção:", error)
      toast({
        title: "Erro",
        description: "Não foi possível agendar a próxima inspeção.",
        variant: "destructive",
      })
    }
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
                        {incident.evidencias_url && (
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
                          <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download PDF
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

      {/* Diálogo de Detalhes da Inspeção */}
      <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Inspeção</DialogTitle>
            <DialogDescription>
              Informações completas da inspeção de segurança
            </DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Setor</Label>
                  <p className="text-sm text-muted-foreground">{selectedInspection.setor}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Local da Inspeção</Label>
                  <p className="text-sm text-muted-foreground">{selectedInspection.local_inspecao || "Não informado"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Responsável</Label>
                  <p className="text-sm text-muted-foreground">{selectedInspection.responsavel}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data da Inspeção</Label>
                  <p className="text-sm text-muted-foreground">{formatDateSafe(selectedInspection.data_inspecao)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={getStatusColor(selectedInspection.status) as any}>
                    {selectedInspection.status === "done"
                      ? "Concluída"
                      : selectedInspection.status === "scheduled"
                        ? "Agendada"
                        : selectedInspection.status === "critical"
                          ? "Crítica"
                          : selectedInspection.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Próxima Inspeção</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedInspection.agendar_proxima ? formatDateSafe(selectedInspection.agendar_proxima) : "Não agendada"}
                  </p>
                </div>
              </div>
              {selectedInspection.observacoes && (
                <div>
                  <Label className="text-sm font-medium">Observações</Label>
                  <p className="text-sm text-muted-foreground mt-1">{selectedInspection.observacoes}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <Label className="text-xs font-medium">Criado em</Label>
                  <p>{formatDateSafe(selectedInspection.created_at, "dd/MM/yyyy HH:mm")}</p>
                </div>
                {selectedInspection.updated_at && (
                  <div>
                    <Label className="text-xs font-medium">Atualizado em</Label>
                    <p>{formatDateSafe(selectedInspection.updated_at, "dd/MM/yyyy HH:mm")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInspectionDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Agendamento da Próxima Inspeção */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Próxima Inspeção</DialogTitle>
            <DialogDescription>
              Defina a data e observações para a próxima inspeção de segurança
            </DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Inspeção Atual</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Setor:</strong> {selectedInspection.setor}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Responsável:</strong> {selectedInspection.responsavel}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Data:</strong> {formatDateSafe(selectedInspection.data_inspecao)}
                </p>
              </div>
              <div>
                <Label htmlFor="nextDate">Data da Próxima Inspeção *</Label>
                <Input
                  id="nextDate"
                  type="date"
                  value={nextInspectionDate}
                  onChange={(e) => setNextInspectionDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="nextObservations">Observações</Label>
                <Textarea
                  id="nextObservations"
                  placeholder="Observações para a próxima inspeção..."
                  value={nextInspectionObservations}
                  onChange={(e) => setNextInspectionObservations(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNextInspection}>
              <Calendar className="h-4 w-4 mr-2" />
              Agendar Inspeção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Detalhes do Incidente */}
      <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Incidente</DialogTitle>
            <DialogDescription>
              Informações completas do incidente registrado
            </DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <p className="text-sm text-muted-foreground">{selectedIncident.tipo}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Gravidade</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getSeverityColor(selectedIncident.gravidade) as any}>
                      {selectedIncident.gravidade}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data da Ocorrência</Label>
                  <p className="text-sm text-muted-foreground">{formatDateSafe(selectedIncident.data_ocorrencia)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(selectedIncident.status) as any}>
                      {selectedIncident.status === "aberto"
                        ? "Aberto"
                        : selectedIncident.status === "em análise"
                          ? "Em Análise"
                          : selectedIncident.status === "resolvido"
                            ? "Resolvido"
                            : selectedIncident.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Descrição</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm">{selectedIncident.descricao}</p>
                </div>
              </div>
              {selectedIncident.evidencias_url && (
                 <div>
                   <Label className="text-sm font-medium">Evidências</Label>
                   <div className="mt-1 p-3 bg-muted rounded-lg">
                     <div className="flex items-center space-x-2">
                       <FileText className="h-4 w-4" />
                       <span className="text-sm">Arquivo de evidência disponível</span>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => window.open(selectedIncident.evidencias_url, '_blank')}
                       >
                         <Download className="h-4 w-4 mr-1" />
                         Baixar
                       </Button>
                     </div>
                   </div>
                 </div>
               )}
              <div>
                <Label className="text-sm font-medium">Data de Registro</Label>
                <p className="text-sm text-muted-foreground">{formatDateSafe(selectedIncident.created_at)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsIncidentDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Adicionar Evidência */}
      <Dialog open={isEvidenceDialogOpen} onOpenChange={setIsEvidenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Evidência</DialogTitle>
            <DialogDescription>
              Anexe imagens, vídeos, áudios ou documentos relacionados ao incidente
            </DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Incidente</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Tipo:</strong> {selectedIncident.tipo}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Data:</strong> {formatDateSafe(selectedIncident.data_ocorrencia)}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Descrição:</strong> {selectedIncident.descricao}
                </p>
              </div>
              <div>
                <Label>Arquivo de Evidência</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Formatos aceitos: Imagens (JPG, PNG), Vídeos (MP4, AVI), Áudios (MP3, WAV), Documentos (PDF, DOC)
                </p>
                <FileUpload
                  type="evidencias-incidentes"
                  onUploadComplete={async (url, path) => {
                    if (selectedIncident && path) {
                      try {
                        const { error } = await supabase
                          .from("incidentes")
                          .update({ evidencias_url: path })
                          .eq("id", selectedIncident.id)
                        
                        if (error) throw error
                        
                        toast({
                          title: "Sucesso",
                          description: "Evidência adicionada com sucesso.",
                        })
                        
                        loadData()
                        setIsEvidenceDialogOpen(false)
                      } catch (error) {
                        console.error("Erro ao salvar evidência:", error)
                        toast({
                          title: "Erro",
                          description: "Não foi possível salvar a evidência.",
                          variant: "destructive",
                        })
                      }
                    }
                  }}
                  onUploadError={(error) => {
                    console.error("Erro no upload:", error)
                    toast({
                      title: "Erro",
                      description: "Erro no upload do arquivo.",
                      variant: "destructive",
                    })
                  }}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp4,.avi,.mov,.mp3,.wav,.m4a"
                  maxSizeMB={100}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEvidenceDialogOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Detalhes do Equipamento */}
      <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Equipamento</DialogTitle>
            <DialogDescription>
              Informações completas do equipamento de segurança
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nome</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm font-semibold">{selectedEquipment.nome}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedEquipment.tipo}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Quantidade</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedEquipment.quantidade} unidades</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Validade</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg flex items-center justify-between">
                    <p className="text-sm">{formatDateSafe(selectedEquipment.validade)}</p>
                    <Badge variant={new Date(selectedEquipment.validade) > new Date() ? "default" : "destructive"}>
                      {new Date(selectedEquipment.validade) > new Date() ? "Válido" : "Vencido"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Data de Cadastro</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <p className="text-sm">{formatDateSafe(selectedEquipment.created_at)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEquipmentDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Inspeção do Equipamento */}
      <Dialog open={isInspectDialogOpen} onOpenChange={setIsInspectDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inspecionar Equipamento</DialogTitle>
            <DialogDescription>
              Registre uma nova inspeção do equipamento de segurança
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Equipamento</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Nome:</strong> {selectedEquipment.nome}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Tipo:</strong> {selectedEquipment.tipo}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="inspection-date">Data da Inspeção</Label>
                  <Input
                    id="inspection-date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="inspection-result">Resultado</Label>
                  <select
                    id="inspection-result"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="aprovado">Aprovado</option>
                    <option value="reprovado">Reprovado</option>
                    <option value="condicional">Condicional</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="inspection-observations">Observações</Label>
                <Textarea
                  id="inspection-observations"
                  placeholder="Descreva os detalhes da inspeção..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInspectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={async () => {
              if (!selectedEquipment) return
              
              const dateInput = document.getElementById('inspection-date') as HTMLInputElement
              const resultSelect = document.getElementById('inspection-result') as HTMLSelectElement
              const observationsTextarea = document.getElementById('inspection-observations') as HTMLTextAreaElement
              
              try {
                const { error } = await supabase
                  .from("inspecoes_epi")
                  .insert({
                    empresa_id: selectedCompany?.id,
                    epi_id: selectedEquipment.id,
                    data_inspecao: dateInput.value,
                    resultado: resultSelect.value,
                    observacoes: observationsTextarea.value
                  })
                
                if (error) throw error
                
                toast({
                  title: "Sucesso",
                  description: "Inspeção registrada com sucesso.",
                })
                
                loadData()
                setIsInspectDialogOpen(false)
              } catch (error) {
                console.error("Erro ao registrar inspeção:", error)
                toast({
                  title: "Erro",
                  description: "Não foi possível registrar a inspeção.",
                  variant: "destructive",
                })
              }
            }}>
              Registrar Inspeção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Manutenção do Equipamento */}
      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agendar Manutenção</DialogTitle>
            <DialogDescription>
              Registre uma manutenção do equipamento de segurança
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Equipamento</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Nome:</strong> {selectedEquipment.nome}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Tipo:</strong> {selectedEquipment.tipo}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maintenance-date">Data da Manutenção</Label>
                  <Input
                    id="maintenance-date"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenance-type">Tipo de Manutenção</Label>
                  <select
                    id="maintenance-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="preventiva">Preventiva</option>
                    <option value="corretiva">Corretiva</option>
                    <option value="preditiva">Preditiva</option>
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="maintenance-description">Descrição da Manutenção</Label>
                <Textarea
                  id="maintenance-description"
                  placeholder="Descreva os procedimentos realizados..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={async () => {
              if (!selectedEquipment) return
              
              const dateInput = document.getElementById('maintenance-date') as HTMLInputElement
              const typeSelect = document.getElementById('maintenance-type') as HTMLSelectElement
              const descriptionTextarea = document.getElementById('maintenance-description') as HTMLTextAreaElement
              
              try {
                const { error } = await supabase
                  .from("manutencoes_epi")
                  .insert({
                    empresa_id: selectedCompany?.id,
                    epi_id: selectedEquipment.id,
                    data_manutencao: dateInput.value,
                    tipo: typeSelect.value,
                    descricao: descriptionTextarea.value
                  })
                
                if (error) throw error
                
                toast({
                  title: "Sucesso",
                  description: "Manutenção registrada com sucesso.",
                })
                
                loadData()
                setIsMaintenanceDialogOpen(false)
              } catch (error) {
                console.error("Erro ao registrar manutenção:", error)
                toast({
                  title: "Erro",
                  description: "Não foi possível registrar a manutenção.",
                  variant: "destructive",
                })
              }
            }}>
              Registrar Manutenção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Histórico do Equipamento */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico do Equipamento</DialogTitle>
            <DialogDescription>
              Timeline completo de inspeções e manutenções
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Equipamento</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Nome:</strong> {selectedEquipment.nome} • <strong>Tipo:</strong> {selectedEquipment.tipo}
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Inspeções */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <Search className="h-4 w-4 mr-2" />
                    Inspeções ({epiInspections.filter(i => i.epi_id === selectedEquipment.id).length})
                  </h4>
                  <div className="space-y-3">
                    {epiInspections
                      .filter(inspection => inspection.epi_id === selectedEquipment.id)
                      .map((inspection) => (
                        <div key={inspection.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">
                                Inspeção - {formatDateSafe(inspection.data_inspecao)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Resultado: {inspection.resultado}
                              </p>
                            </div>
                            <Badge variant={inspection.resultado === 'aprovado' ? 'default' : inspection.resultado === 'reprovado' ? 'destructive' : 'secondary'}>
                              {inspection.resultado}
                            </Badge>
                          </div>
                          {inspection.observacoes && (
                            <p className="text-sm text-muted-foreground">
                              {inspection.observacoes}
                            </p>
                          )}
                        </div>
                      ))
                    }
                    {epiInspections.filter(i => i.epi_id === selectedEquipment.id).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma inspeção registrada
                      </p>
                    )}
                  </div>
                </div>

                {/* Manutenções */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Manutenções ({epiMaintenances.filter(m => m.epi_id === selectedEquipment.id).length})
                  </h4>
                  <div className="space-y-3">
                    {epiMaintenances
                      .filter(maintenance => maintenance.epi_id === selectedEquipment.id)
                      .map((maintenance) => (
                        <div key={maintenance.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">
                                Manutenção - {formatDateSafe(maintenance.data_manutencao)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Tipo: {maintenance.tipo}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {maintenance.tipo}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {maintenance.descricao}
                          </p>
                        </div>
                      ))
                    }
                    {epiMaintenances.filter(m => m.epi_id === selectedEquipment.id).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma manutenção registrada
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { WorkplaceSafety as WorkplaceSafetyComponent }
export default WorkplaceSafety
