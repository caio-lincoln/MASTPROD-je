"use client"

import { useState } from "react"
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
  CheckCircle,
  Clock,
  Plus,
  Search,
  Calendar,
  MapPin,
  Users,
  AlertCircle,
  Eye,
  FileText,
  Upload,
  Settings,
  History,
} from "lucide-react"
import { format } from "date-fns"

interface SafetyInspection {
  id: string
  area: string
  inspector: string
  date: string
  score: number
  status: "pending" | "completed" | "overdue"
  items: {
    category: string
    compliant: number
    total: number
  }[]
}

interface Incident {
  id: string
  type: "accident" | "near-miss" | "unsafe-condition"
  severity: "low" | "medium" | "high" | "critical"
  description: string
  location: string
  date: string
  reportedBy: string
  status: "investigating" | "resolved" | "pending"
}

interface SafetyEquipment {
  id: string
  name: string
  type: "collective" | "individual"
  location: string
  status: "active" | "maintenance" | "inactive"
  lastInspection: string
  nextInspection: string
}

const inspectionsByCompany = {
  "1": [
    {
      id: "INS001",
      area: "Setor de Soldagem",
      inspector: "João Silva",
      date: "2024-01-15",
      score: 85,
      status: "completed" as const,
      items: [
        { category: "EPIs", compliant: 8, total: 10 },
        { category: "Equipamentos", compliant: 15, total: 18 },
        { category: "Sinalização", compliant: 12, total: 12 },
        { category: "Limpeza", compliant: 9, total: 10 },
      ],
    },
    {
      id: "INS002",
      area: "Almoxarifado",
      inspector: "Maria Santos",
      date: "2024-01-14",
      score: 92,
      status: "completed" as const,
      items: [
        { category: "Armazenamento", compliant: 18, total: 20 },
        { category: "Sinalização", compliant: 10, total: 10 },
        { category: "Acesso", compliant: 8, total: 8 },
        { category: "Ventilação", compliant: 6, total: 7 },
      ],
    },
  ],
  "2": [
    {
      id: "INS003",
      area: "Linha de Produção A",
      inspector: "Pedro Costa",
      date: "2024-01-16",
      score: 78,
      status: "pending" as const,
      items: [
        { category: "EPIs", compliant: 6, total: 8 },
        { category: "Máquinas", compliant: 12, total: 15 },
        { category: "Iluminação", compliant: 8, total: 8 },
        { category: "Ruído", compliant: 4, total: 6 },
      ],
    },
  ],
  "3": [
    {
      id: "INS004",
      area: "Laboratório Químico",
      inspector: "Ana Lima",
      date: "2024-01-17",
      score: 95,
      status: "completed" as const,
      items: [
        { category: "EPIs", compliant: 10, total: 10 },
        { category: "Ventilação", compliant: 8, total: 8 },
        { category: "Chuveiros", compliant: 6, total: 6 },
        { category: "Armazenamento", compliant: 14, total: 15 },
      ],
    },
  ],
}

const incidentsByCompany = {
  "1": [
    {
      id: "INC001",
      type: "near-miss" as const,
      severity: "medium" as const,
      description: "Quase acidente com empilhadeira no corredor principal",
      location: "Corredor A - Setor 3",
      date: "2024-01-15",
      reportedBy: "Carlos Oliveira",
      status: "investigating" as const,
    },
    {
      id: "INC002",
      type: "unsafe-condition" as const,
      severity: "high" as const,
      description: "Piso molhado sem sinalização adequada",
      location: "Refeitório",
      date: "2024-01-14",
      reportedBy: "Ana Costa",
      status: "resolved" as const,
    },
  ],
  "2": [
    {
      id: "INC003",
      type: "accident" as const,
      severity: "low" as const,
      description: "Corte superficial durante manuseio de peça",
      location: "Linha de Produção B",
      date: "2024-01-16",
      reportedBy: "Roberto Silva",
      status: "resolved" as const,
    },
  ],
  "3": [
    {
      id: "INC004",
      type: "unsafe-condition" as const,
      severity: "critical" as const,
      description: "Vazamento de produto químico",
      location: "Laboratório - Bancada 3",
      date: "2024-01-17",
      reportedBy: "Fernanda Santos",
      status: "investigating" as const,
    },
  ],
}

const equipmentByCompany = {
  "1": [
    {
      id: "EQ001",
      name: "Sistema de Ventilação - Linha 1",
      type: "collective" as const,
      location: "Setor de Pintura",
      status: "active" as const,
      lastInspection: "2024-01-10",
      nextInspection: "2024-04-10",
    },
    {
      id: "EQ002",
      name: "Chuveiro de Emergência",
      type: "collective" as const,
      location: "Laboratório Químico",
      status: "maintenance" as const,
      lastInspection: "2024-01-05",
      nextInspection: "2024-01-20",
    },
  ],
  "2": [
    {
      id: "EQ003",
      name: "Sistema de Exaustão",
      type: "collective" as const,
      location: "Área de Soldagem",
      status: "active" as const,
      lastInspection: "2024-01-12",
      nextInspection: "2024-04-12",
    },
  ],
  "3": [
    {
      id: "EQ004",
      name: "Capela de Exaustão",
      type: "collective" as const,
      location: "Laboratório Principal",
      status: "active" as const,
      lastInspection: "2024-01-08",
      nextInspection: "2024-04-08",
    },
    {
      id: "EQ005",
      name: "Lava-olhos de Emergência",
      type: "collective" as const,
      location: "Laboratório Secundário",
      status: "inactive" as const,
      lastInspection: "2024-01-01",
      nextInspection: "2024-01-15",
    },
  ],
}

const WorkplaceSafety = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [selectedInspection, setSelectedInspection] = useState<SafetyInspection | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [selectedEquipment, setSelectedEquipment] = useState<SafetyEquipment | null>(null)
  const [showInspectionDetails, setShowInspectionDetails] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [showInvestigationDialog, setShowInvestigationDialog] = useState(false)
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false)
  const [showInspectDialog, setShowInspectDialog] = useState(false)
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const { selectedCompany } = useCompany()

  const companyInspections = selectedCompany ? inspectionsByCompany[selectedCompany.id] || [] : []
  const companyIncidents = selectedCompany ? incidentsByCompany[selectedCompany.id] || [] : []
  const companyEquipment = selectedCompany ? equipmentByCompany[selectedCompany.id] || [] : []

  const handleViewInspectionDetails = (inspection: SafetyInspection) => {
    setSelectedInspection(inspection)
    setShowInspectionDetails(true)
  }

  const handleScheduleNext = (inspection: SafetyInspection) => {
    setSelectedInspection(inspection)
    setShowScheduleDialog(true)
  }

  const handleInvestigate = (incident: Incident) => {
    setSelectedIncident(incident)
    setShowInvestigationDialog(true)
  }

  const handleAddEvidence = (incident: Incident) => {
    setSelectedIncident(incident)
    setShowEvidenceDialog(true)
  }

  const handleInspectEquipment = (equipment: SafetyEquipment) => {
    setSelectedEquipment(equipment)
    setShowInspectDialog(true)
  }

  const handleMaintenance = (equipment: SafetyEquipment) => {
    setSelectedEquipment(equipment)
    setShowMaintenanceDialog(true)
  }

  const handleHistory = (equipment: SafetyEquipment) => {
    setSelectedEquipment(equipment)
    setShowHistoryDialog(true)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200"
      case "investigating":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200"
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const stats = {
    totalInspections: companyInspections.length,
    averageScore:
      companyInspections.length > 0
        ? Math.round(companyInspections.reduce((acc, ins) => acc + ins.score, 0) / companyInspections.length)
        : 0,
    pendingInspections: companyInspections.filter((ins) => ins.status === "pending").length,
    totalIncidents: companyIncidents.length,
    openIncidents: companyIncidents.filter((inc) => inc.status === "investigating").length,
    equipmentActive: companyEquipment.filter((eq) => eq.status === "active").length,
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Segurança do Trabalho</h1>
          <p className="text-muted-foreground">Gestão completa de segurança e prevenção de acidentes</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Segurança do Trabalho</h1>
          <p className="text-muted-foreground">
            Gestão completa de segurança e prevenção de acidentes | {selectedCompany.name}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Inspeção
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspeções</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInspections}</div>
            <p className="text-xs text-muted-foreground">{selectedCompany.name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>{stats.averageScore}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingInspections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIncidents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Investigação</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.openIncidents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipamentos Ativos</CardTitle>
            <HardHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.equipmentActive}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inspections" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inspections">Inspeções de Segurança</TabsTrigger>
          <TabsTrigger value="incidents">Incidentes e Acidentes</TabsTrigger>
          <TabsTrigger value="equipment">Equipamentos de Segurança</TabsTrigger>
          <TabsTrigger value="analytics">Análise e Indicadores</TabsTrigger>
        </TabsList>

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Buscar inspeções..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="completed">Concluídas</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="overdue">Atrasadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {companyInspections.map((inspection) => (
              <Card key={inspection.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {inspection.id} - {inspection.area}
                        <Badge className={getStatusColor(inspection.status)}>
                          {inspection.status === "completed"
                            ? "Concluída"
                            : inspection.status === "pending"
                              ? "Pendente"
                              : "Atrasada"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Inspetor: {inspection.inspector} | Data: {new Date(inspection.date).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(inspection.score)}`}>{inspection.score}%</div>
                      <div className="text-sm text-muted-foreground">Score Geral</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {inspection.items.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{item.category}</span>
                            <span className="font-medium">
                              {item.compliant}/{item.total}
                            </span>
                          </div>
                          <Progress value={(item.compliant / item.total) * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewInspectionDetails(inspection)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Gerar Relatório
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleScheduleNext(inspection)}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Agendar Próxima
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {companyInspections.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma inspeção cadastrada para {selectedCompany.name}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <div className="space-y-4">
            {companyIncidents.map((incident) => (
              <Card key={incident.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {incident.id} -{" "}
                        {incident.type === "accident"
                          ? "Acidente"
                          : incident.type === "near-miss"
                            ? "Quase Acidente"
                            : "Condição Insegura"}
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity === "critical"
                            ? "Crítica"
                            : incident.severity === "high"
                              ? "Alta"
                              : incident.severity === "medium"
                                ? "Média"
                                : "Baixa"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{incident.description}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(incident.status)}>
                      {incident.status === "investigating"
                        ? "Investigando"
                        : incident.status === "resolved"
                          ? "Resolvido"
                          : "Pendente"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{incident.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(incident.date).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Reportado por: {incident.reportedBy}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleInvestigate(incident)}>
                      <Search className="h-4 w-4 mr-2" />
                      Investigar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleAddEvidence(incident)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Adicionar Evidência
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Gerar Relatório
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {companyIncidents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum incidente registrado para {selectedCompany.name}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <div className="space-y-4">
            {companyEquipment.map((eq) => (
              <Card key={eq.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {eq.name}
                        <Badge variant="outline">{eq.type === "collective" ? "Coletivo" : "Individual"}</Badge>
                      </CardTitle>
                      <CardDescription>Local: {eq.location}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(eq.status)}>
                      {eq.status === "active" ? "Ativo" : eq.status === "maintenance" ? "Manutenção" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Última inspeção: {new Date(eq.lastInspection).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Próxima inspeção: {new Date(eq.nextInspection).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleInspectEquipment(eq)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Inspecionar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleMaintenance(eq)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manutenção
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleHistory(eq)}>
                      <History className="h-4 w-4 mr-2" />
                      Histórico
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {companyEquipment.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum equipamento cadastrado para {selectedCompany.name}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Indicadores de Segurança - {selectedCompany.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Frequência de Acidentes</span>
                      <span className="font-medium">
                        {companyIncidents.filter((i) => i.type === "accident").length > 0 ? "2.1" : "0.0"}
                      </span>
                    </div>
                    <Progress
                      value={companyIncidents.filter((i) => i.type === "accident").length * 10}
                      className="h-2 mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Gravidade</span>
                      <span className="font-medium">
                        {companyIncidents.filter((i) => i.severity === "high" || i.severity === "critical").length * 15}
                      </span>
                    </div>
                    <Progress
                      value={
                        companyIncidents.filter((i) => i.severity === "high" || i.severity === "critical").length * 15
                      }
                      className="h-2 mt-1"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Conformidade em Inspeções</span>
                      <span className="font-medium">{stats.averageScore}%</span>
                    </div>
                    <Progress value={stats.averageScore} className="h-2 mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Incidentes por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Quase Acidentes</span>
                    <span className="font-medium">
                      {companyIncidents.length > 0
                        ? Math.round(
                            (companyIncidents.filter((i) => i.type === "near-miss").length / companyIncidents.length) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Condições Inseguras</span>
                    <span className="font-medium">
                      {companyIncidents.length > 0
                        ? Math.round(
                            (companyIncidents.filter((i) => i.type === "unsafe-condition").length /
                              companyIncidents.length) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Acidentes</span>
                    <span className="font-medium">
                      {companyIncidents.length > 0
                        ? Math.round(
                            (companyIncidents.filter((i) => i.type === "accident").length / companyIncidents.length) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Inspection Details Dialog */}
      <Dialog open={showInspectionDetails} onOpenChange={setShowInspectionDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Inspeção</DialogTitle>
            <DialogDescription>Informações completas da inspeção de segurança</DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">ID da Inspeção</Label>
                  <p className="font-medium">{selectedInspection.id}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Área</Label>
                  <p>{selectedInspection.area}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Inspetor</Label>
                  <p>{selectedInspection.inspector}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Data</Label>
                  <p>{new Date(selectedInspection.date).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Score Geral</Label>
                <div className="flex items-center space-x-2">
                  <div className={`text-2xl font-bold ${getScoreColor(selectedInspection.score)}`}>
                    {selectedInspection.score}%
                  </div>
                  <Badge className={getStatusColor(selectedInspection.status)}>
                    {selectedInspection.status === "completed" ? "Concluída" : "Pendente"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-sm font-medium text-muted-foreground">Itens Avaliados</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedInspection.items.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{item.category}</span>
                        <span className="text-sm text-muted-foreground">
                          {item.compliant}/{item.total}
                        </span>
                      </div>
                      <Progress value={(item.compliant / item.total) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {((item.compliant / item.total) * 100).toFixed(1)}% de conformidade
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowInspectionDetails(false)}>
              Fechar
            </Button>
            <Button onClick={() => handleScheduleNext(selectedInspection!)}>
              <Calendar className="h-4 w-4 mr-2" />
              Agendar Próxima
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Next Inspection Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agendar Próxima Inspeção</DialogTitle>
            <DialogDescription>
              Agende uma nova inspeção baseada na inspeção anterior
              {selectedInspection && ` - ${selectedInspection.area}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área *</Label>
                <Input defaultValue={selectedInspection?.area} />
              </div>
              <div className="space-y-2">
                <Label>Inspetor *</Label>
                <Select defaultValue={selectedInspection?.inspector.toLowerCase().replace(/\s+/g, "-")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o inspetor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="joao-silva">João Silva</SelectItem>
                    <SelectItem value="maria-santos">Maria Santos</SelectItem>
                    <SelectItem value="pedro-costa">Pedro Costa</SelectItem>
                    <SelectItem value="ana-lima">Ana Lima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Inspeção *</Label>
                <Input
                  type="date"
                  defaultValue={format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações especiais para esta inspeção..."
                defaultValue={
                  selectedInspection?.score && selectedInspection.score < 80
                    ? "Atenção especial aos itens que apresentaram não conformidade na inspeção anterior."
                    : ""
                }
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowScheduleDialog(false)}>
              <Calendar className="h-4 w-4 mr-2" />
              Agendar Inspeção
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Investigation Dialog */}
      <Dialog open={showInvestigationDialog} onOpenChange={setShowInvestigationDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Investigação de Incidente</DialogTitle>
            <DialogDescription>
              Preencha os detalhes da investigação
              {selectedIncident && ` - ${selectedIncident.id}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Tipo de Incidente</Label>
                <p>
                  {selectedIncident?.type === "accident"
                    ? "Acidente"
                    : selectedIncident?.type === "near-miss"
                      ? "Quase Acidente"
                      : "Condição Insegura"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Severidade</Label>
                <Badge className={getSeverityColor(selectedIncident?.severity || "")}>
                  {selectedIncident?.severity === "critical"
                    ? "Crítica"
                    : selectedIncident?.severity === "high"
                      ? "Alta"
                      : selectedIncident?.severity === "medium"
                        ? "Média"
                        : "Baixa"}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Descrição do Incidente</Label>
              <p className="p-2 bg-muted rounded">{selectedIncident?.description}</p>
            </div>
            <div className="space-y-2">
              <Label>Análise de Causa Raiz *</Label>
              <Textarea placeholder="Descreva as causas identificadas que levaram ao incidente..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Medidas Corretivas *</Label>
              <Textarea placeholder="Liste as medidas corretivas implementadas ou planejadas..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável pela Investigação *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="joao-silva">João Silva</SelectItem>
                    <SelectItem value="maria-santos">Maria Santos</SelectItem>
                    <SelectItem value="pedro-costa">Pedro Costa</SelectItem>
                    <SelectItem value="ana-lima">Ana Lima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prazo para Conclusão</Label>
                <Input
                  type="date"
                  defaultValue={format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowInvestigationDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowInvestigationDialog(false)}>
              <FileText className="h-4 w-4 mr-2" />
              Salvar Investigação
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Evidence Dialog */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Adicionar Evidência</DialogTitle>
            <DialogDescription>
              Faça upload de arquivos relacionados ao incidente
              {selectedIncident && ` - ${selectedIncident.id}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Incidente</Label>
              <p className="p-2 bg-muted rounded">{selectedIncident?.description}</p>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Evidência *</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foto">Fotografia</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="documento">Documento</SelectItem>
                  <SelectItem value="relatorio">Relatório</SelectItem>
                  <SelectItem value="laudo">Laudo Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo *</Label>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">Clique para selecionar ou arraste arquivos aqui</p>
                <p className="text-xs text-muted-foreground">Formatos aceitos: JPG, PNG, PDF, DOC, MP4 (máx. 10MB)</p>
                <Input type="file" className="mt-2" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.mp4" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição da Evidência</Label>
              <Textarea placeholder="Descreva o conteúdo da evidência e sua relevância para o caso..." />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowEvidenceDialog(false)}>
              <Upload className="h-4 w-4 mr-2" />
              Adicionar Evidência
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Inspection Dialog */}
      <Dialog open={showInspectDialog} onOpenChange={setShowInspectDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inspeção de Equipamento</DialogTitle>
            <DialogDescription>
              Registre uma nova inspeção
              {selectedEquipment && ` - ${selectedEquipment.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Equipamento</Label>
              <p className="font-medium">{selectedEquipment?.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data da Inspeção *</Label>
                <Input type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} />
              </div>
              <div className="space-y-2">
                <Label>Resultado *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="aprovado-restricoes">Aprovado com Restrições</SelectItem>
                    <SelectItem value="reprovado">Reprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações *</Label>
              <Textarea
                placeholder="Descreva o estado do equipamento, problemas encontrados, recomendações..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Próxima Inspeção</Label>
              <Input type="date" defaultValue={format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")} />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowInspectDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowInspectDialog(false)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Registrar Inspeção
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment Maintenance Dialog */}
      <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manutenção de Equipamento</DialogTitle>
            <DialogDescription>
              Registre ou agende manutenção
              {selectedEquipment && ` - ${selectedEquipment.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Equipamento</Label>
              <p className="font-medium">{selectedEquipment?.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Manutenção *</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="preditiva">Preditiva</SelectItem>
                    <SelectItem value="emergencial">Emergencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Programada *</Label>
                <Input
                  type="date"
                  defaultValue={format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição dos Serviços *</Label>
              <Textarea placeholder="Descreva os serviços de manutenção a serem realizados..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável Técnico</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="joao-silva">João Silva</SelectItem>
                    <SelectItem value="maria-santos">Maria Santos</SelectItem>
                    <SelectItem value="pedro-costa">Pedro Costa</SelectItem>
                    <SelectItem value="ana-lima">Ana Lima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select defaultValue="normal">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowMaintenanceDialog(false)}>
              <Settings className="h-4 w-4 mr-2" />
              Agendar Manutenção
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Equipment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Histórico do Equipamento</DialogTitle>
            <DialogDescription>
              Histórico completo de inspeções e manutenções
              {selectedEquipment && ` - ${selectedEquipment.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Equipamento</Label>
              <p className="font-medium">{selectedEquipment?.name}</p>
              <p className="text-sm text-muted-foreground">Local: {selectedEquipment?.location}</p>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-3">Inspeções Recentes</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">Inspeção de Rotina</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEquipment && new Date(selectedEquipment.lastInspection).toLocaleDateString("pt-BR")} -
                        João Silva
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">Aprovado</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">Inspeção Preventiva</p>
                      <p className="text-sm text-muted-foreground">15/11/2024 - Maria Santos</p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">Aprovado</Badge>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Manutenções Realizadas</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">Manutenção Preventiva</p>
                      <p className="text-sm text-muted-foreground">10/11/2024 - Pedro Costa</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">Concluída</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">Troca de Filtros</p>
                      <p className="text-sm text-muted-foreground">05/10/2024 - Ana Lima</p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">Concluída</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Fechar
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Exportar Histórico
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WorkplaceSafety
export { WorkplaceSafety }
