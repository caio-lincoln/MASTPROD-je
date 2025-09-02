"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
} from "lucide-react"
import { format } from "date-fns"
import { createBrowserClient } from "@/lib/supabase/client"

interface SafetyInspection {
  id: number
  area: string
  inspetor: string
  data_inspecao: string
  pontuacao: number
  status: string
  observacoes?: string
  empresa_id: string
  created_at: string
  updated_at: string
}

interface Incident {
  id: number
  tipo: string
  severidade: string
  descricao: string
  local: string
  data_ocorrencia: string
  reportado_por: string
  status: string
  empresa_id: string
  created_at: string
  updated_at: string
}

interface SafetyEquipment {
  id: number
  nome: string
  tipo: string
  localizacao: string
  status: string
  ultima_inspecao?: string
  proxima_inspecao?: string
  empresa_id: string
  created_at: string
  updated_at: string
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
  const [loading, setLoading] = useState(true)

  const { selectedCompany } = useCompany()
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

      // Load equipment (using EPIs table as safety equipment)
      const { data: equipmentData, error: equipmentError } = await supabase
        .from("epis")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      if (equipmentError) throw equipmentError

      setInspections(inspectionsData || [])
      setIncidents(incidentsData || [])
      setEquipment(equipmentData || [])
    } catch (error) {
      console.error("Erro ao carregar dados de segurança:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedCompany])

  const stats = {
    totalInspections: inspections.length,
    completedInspections: inspections.filter((i) => i.status === "Concluída").length,
    pendingInspections: inspections.filter((i) => i.status === "Pendente").length,
    totalIncidents: incidents.length,
    resolvedIncidents: incidents.filter((i) => i.status === "Resolvido").length,
    investigatingIncidents: incidents.filter((i) => i.status === "Investigando").length,
    totalEquipment: equipment.length,
    activeEquipment: equipment.filter((e) => e.status === "Ativo").length,
    maintenanceEquipment: equipment.filter((e) => e.status === "Manutenção").length,
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
            <span>Segurança do Trabalho</span>
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
                          <h3 className="font-semibold text-lg">{inspection.area}</h3>
                          <p className="text-sm text-muted-foreground">
                            Inspetor: {inspection.inspetor} • {format(new Date(inspection.data_inspecao), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(inspection.status) as any}>{inspection.status}</Badge>
                          <div className="text-right">
                            <div className="text-lg font-bold">{inspection.pontuacao}%</div>
                            <div className="text-xs text-muted-foreground">Pontuação</div>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Conformidade Geral</span>
                          <span>{inspection.pontuacao}%</span>
                        </div>
                        <Progress value={inspection.pontuacao} className="h-2" />
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex space-x-4 text-sm text-muted-foreground">
                          <span>📍 {inspection.area}</span>
                          <span>📅 {format(new Date(inspection.data_inspecao), "dd/MM/yyyy")}</span>
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
                            <Badge variant={getSeverityColor(incident.severidade) as any}>{incident.severidade}</Badge>
                            <Badge variant="outline">{incident.tipo}</Badge>
                          </div>
                          <h3 className="font-semibold text-base mb-1">{incident.descricao}</h3>
                          <p className="text-sm text-muted-foreground">
                            📍 {incident.local} • 📅 {format(new Date(incident.data_ocorrencia), "dd/MM/yyyy")}
                          </p>
                          <p className="text-sm text-muted-foreground">Reportado por: {incident.reportado_por}</p>
                        </div>
                        <Badge variant={getStatusColor(incident.status) as any}>{incident.status}</Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewIncidentDetails(incident)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver Detalhes
                        </Button>
                        {incident.status === "Investigando" && (
                          <Button variant="outline" size="sm" onClick={() => handleInvestigateIncident(incident)}>
                            <Search className="h-4 w-4 mr-1" />
                            Investigar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleAddEvidence(incident)}>
                          <Upload className="h-4 w-4 mr-1" />
                          Adicionar Evidência
                        </Button>
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
              <CardTitle className="text-base sm:text-lg">Equipamentos de Segurança</CardTitle>
              <CardDescription className="text-sm">
                Controle e manutenção de EPIs e EPCs - {selectedCompany.name}
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
                            📍 {item.localizacao} • Tipo: {item.tipo}
                          </p>
                          {item.ultima_inspecao && (
                            <p className="text-sm text-muted-foreground">
                              Última inspeção: {format(new Date(item.ultima_inspecao), "dd/MM/yyyy")}
                            </p>
                          )}
                          {item.proxima_inspecao && (
                            <p className="text-sm text-muted-foreground">
                              Próxima inspeção: {format(new Date(item.proxima_inspecao), "dd/MM/yyyy")}
                            </p>
                          )}
                        </div>
                        <Badge variant={getStatusColor(item.status) as any}>{item.status}</Badge>
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
                <Button className="w-full">
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
                <Button className="w-full bg-transparent" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Status dos Equipamentos</CardTitle>
                <CardDescription className="text-sm">Controle de manutenção e inspeção de EPIs/EPCs</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs for various actions */}
      <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Inspeção</DialogTitle>
            <DialogDescription>Informações completas da inspeção de segurança</DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Área Inspecionada</Label>
                  <p className="font-medium">{selectedInspection.area}</p>
                </div>
                <div>
                  <Label>Inspetor</Label>
                  <p className="font-medium">{selectedInspection.inspetor}</p>
                </div>
                <div>
                  <Label>Data da Inspeção</Label>
                  <p className="font-medium">{format(new Date(selectedInspection.data_inspecao), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label>Pontuação</Label>
                  <p className="font-medium">{selectedInspection.pontuacao}%</p>
                </div>
              </div>
              {selectedInspection.observacoes && (
                <div>
                  <Label>Observações</Label>
                  <p className="text-sm text-muted-foreground">{selectedInspection.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Próxima Inspeção</DialogTitle>
            <DialogDescription>Configure a próxima inspeção de segurança</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data da Próxima Inspeção</Label>
              <Input type="date" />
            </div>
            <div>
              <Label>Inspetor Responsável</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o inspetor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="joao">João Silva</SelectItem>
                  <SelectItem value="maria">Maria Santos</SelectItem>
                  <SelectItem value="pedro">Pedro Costa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea placeholder="Observações adicionais sobre a inspeção" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsScheduleDialogOpen(false)}>Agendar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isIncidentDialogOpen} onOpenChange={setIsIncidentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Incidente</DialogTitle>
            <DialogDescription>Informações completas do incidente registrado</DialogDescription>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <p className="font-medium">{selectedIncident.tipo}</p>
                </div>
                <div>
                  <Label>Severidade</Label>
                  <Badge variant={getSeverityColor(selectedIncident.severidade) as any}>
                    {selectedIncident.severidade}
                  </Badge>
                </div>
                <div>
                  <Label>Local</Label>
                  <p className="font-medium">{selectedIncident.local}</p>
                </div>
                <div>
                  <Label>Data da Ocorrência</Label>
                  <p className="font-medium">{format(new Date(selectedIncident.data_ocorrencia), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <p className="text-sm text-muted-foreground">{selectedIncident.descricao}</p>
              </div>
              <div>
                <Label>Reportado por</Label>
                <p className="font-medium">{selectedIncident.reportado_por}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isInvestigateDialogOpen} onOpenChange={setIsInvestigateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Investigar Incidente</DialogTitle>
            <DialogDescription>Adicione informações da investigação</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Causa Raiz</Label>
              <Textarea placeholder="Descreva a causa raiz identificada" />
            </div>
            <div>
              <Label>Ações Corretivas</Label>
              <Textarea placeholder="Liste as ações corretivas implementadas" />
            </div>
            <div>
              <Label>Responsável pela Investigação</Label>
              <Input placeholder="Nome do responsável" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsInvestigateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsInvestigateDialogOpen(false)}>Salvar Investigação</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEvidenceDialogOpen} onOpenChange={setIsEvidenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Evidência</DialogTitle>
            <DialogDescription>Anexe fotos, documentos ou outras evidências</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Evidência</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foto">Fotografia</SelectItem>
                  <SelectItem value="documento">Documento</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="relatorio">Relatório</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Arquivo</Label>
              <Input type="file" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea placeholder="Descreva a evidência anexada" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEvidenceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsEvidenceDialogOpen(false)}>Anexar Evidência</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Equipamento</DialogTitle>
            <DialogDescription>Informações completas do equipamento de segurança</DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <p className="font-medium">{selectedEquipment.nome}</p>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <p className="font-medium">{selectedEquipment.tipo}</p>
                </div>
                <div>
                  <Label>Localização</Label>
                  <p className="font-medium">{selectedEquipment.localizacao}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={getStatusColor(selectedEquipment.status) as any}>{selectedEquipment.status}</Badge>
                </div>
                {selectedEquipment.ultima_inspecao && (
                  <div>
                    <Label>Última Inspeção</Label>
                    <p className="font-medium">{format(new Date(selectedEquipment.ultima_inspecao), "dd/MM/yyyy")}</p>
                  </div>
                )}
                {selectedEquipment.proxima_inspecao && (
                  <div>
                    <Label>Próxima Inspeção</Label>
                    <p className="font-medium">{format(new Date(selectedEquipment.proxima_inspecao), "dd/MM/yyyy")}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isInspectDialogOpen} onOpenChange={setIsInspectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inspecionar Equipamento</DialogTitle>
            <DialogDescription>Registre os resultados da inspeção</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data da Inspeção</Label>
              <Input type="date" />
            </div>
            <div>
              <Label>Resultado</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
                  <SelectItem value="manutencao">Necessita Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea placeholder="Observações sobre a inspeção" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsInspectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsInspectDialogOpen(false)}>Salvar Inspeção</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMaintenanceDialogOpen} onOpenChange={setIsMaintenanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Manutenção</DialogTitle>
            <DialogDescription>Configure a manutenção do equipamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data da Manutenção</Label>
              <Input type="date" />
            </div>
            <div>
              <Label>Tipo de Manutenção</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preditiva">Preditiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Input placeholder="Nome do responsável pela manutenção" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea placeholder="Descreva os serviços a serem realizados" />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsMaintenanceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsMaintenanceDialogOpen(false)}>Agendar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Histórico do Equipamento</DialogTitle>
            <DialogDescription>Registro completo de inspeções e manutenções</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Histórico em Desenvolvimento</h3>
              <p className="text-muted-foreground">O histórico detalhado do equipamento será exibido aqui</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { WorkplaceSafety as WorkplaceSafetyComponent }
export default WorkplaceSafety
