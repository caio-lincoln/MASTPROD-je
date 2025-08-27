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
} from "lucide-react"

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
  const { selectedCompany } = useCompany()

  const companyInspections = selectedCompany ? inspectionsByCompany[selectedCompany.id] || [] : []
  const companyIncidents = selectedCompany ? incidentsByCompany[selectedCompany.id] || [] : []
  const companyEquipment = selectedCompany ? equipmentByCompany[selectedCompany.id] || [] : []

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
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm">
                        Gerar Relatório
                      </Button>
                      <Button variant="outline" size="sm">
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
                    <Button variant="outline" size="sm">
                      Investigar
                    </Button>
                    <Button variant="outline" size="sm">
                      Adicionar Evidência
                    </Button>
                    <Button variant="outline" size="sm">
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
                    <Button variant="outline" size="sm">
                      Inspecionar
                    </Button>
                    <Button variant="outline" size="sm">
                      Manutenção
                    </Button>
                    <Button variant="outline" size="sm">
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
    </div>
  )
}

export default WorkplaceSafety
export { WorkplaceSafety }
