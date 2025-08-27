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
import {
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  User,
  MapPin,
  CheckCircle,
  Clock,
  XCircle,
  Building2,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NonConformity {
  id: string
  companyId: string
  title: string
  description: string
  type: "safety" | "health" | "environmental" | "legal"
  severity: "low" | "medium" | "high" | "critical"
  status: "open" | "in-progress" | "resolved" | "closed"
  reportedBy: string
  reportedDate: string
  location: string
  dueDate: string
  assignedTo: string
  actions: string[]
}

const NonConformitiesComponent = () => {
  const { selectedCompany } = useCompany()

  const [allNonConformities] = useState<NonConformity[]>([
    {
      id: "NC001",
      companyId: "empresa-1",
      title: "EPI não utilizado na área de soldagem",
      description: "Funcionário observado sem máscara de solda durante operação",
      type: "safety",
      severity: "high",
      status: "open",
      reportedBy: "João Silva",
      reportedDate: "2024-01-15",
      location: "Setor de Soldagem - Linha 2",
      dueDate: "2024-01-22",
      assignedTo: "Maria Santos",
      actions: ["Treinamento sobre uso de EPI", "Verificação diária de EPIs"],
    },
    {
      id: "NC002",
      companyId: "empresa-1",
      title: "Vazamento de óleo no piso",
      description: "Identificado vazamento de óleo hidráulico próximo à máquina 15",
      type: "environmental",
      severity: "medium",
      status: "in-progress",
      reportedBy: "Ana Costa",
      reportedDate: "2024-01-14",
      location: "Setor de Usinagem",
      dueDate: "2024-01-20",
      assignedTo: "Carlos Oliveira",
      actions: ["Limpeza imediata", "Reparo do equipamento", "Instalação de bandeja coletora"],
    },
    {
      id: "NC003",
      companyId: "empresa-2",
      title: "Falta de sinalização de emergência",
      description: "Ausência de placas de saída de emergência no 2º andar",
      type: "safety",
      severity: "high",
      status: "open",
      reportedBy: "Pedro Alves",
      reportedDate: "2024-01-16",
      location: "2º Andar - Ala Norte",
      dueDate: "2024-01-25",
      assignedTo: "Lucia Ferreira",
      actions: ["Instalação de placas", "Verificação de rotas de fuga"],
    },
    {
      id: "NC004",
      companyId: "empresa-2",
      title: "Ruído excessivo na produção",
      description: "Níveis de ruído acima do permitido na linha de montagem",
      type: "health",
      severity: "medium",
      status: "resolved",
      reportedBy: "Roberto Lima",
      reportedDate: "2024-01-10",
      location: "Linha de Montagem A",
      dueDate: "2024-01-18",
      assignedTo: "Sandra Moura",
      actions: ["Instalação de barreiras acústicas", "Fornecimento de protetores auriculares"],
    },
    {
      id: "NC005",
      companyId: "empresa-3",
      title: "Descarte inadequado de resíduos",
      description: "Resíduos químicos sendo descartados em lixo comum",
      type: "environmental",
      severity: "critical",
      status: "in-progress",
      reportedBy: "Fernanda Souza",
      reportedDate: "2024-01-17",
      location: "Laboratório Químico",
      dueDate: "2024-01-20",
      assignedTo: "Marcos Pereira",
      actions: ["Treinamento sobre descarte", "Instalação de coletores específicos", "Auditoria de processos"],
    },
  ])

  const nonConformities = selectedCompany ? allNonConformities.filter((nc) => nc.companyId === selectedCompany.id) : []

  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterSeverity, setFilterSeverity] = useState("all")
  const [showNewForm, setShowNewForm] = useState(false)

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800 border-red-200"
      case "in-progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200"
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <XCircle className="h-4 w-4" />
      case "in-progress":
        return <Clock className="h-4 w-4" />
      case "resolved":
        return <CheckCircle className="h-4 w-4" />
      case "closed":
        return <CheckCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filteredNonConformities = nonConformities.filter((nc) => {
    const matchesSearch =
      nc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nc.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || nc.status === filterStatus
    const matchesSeverity = filterSeverity === "all" || nc.severity === filterSeverity
    return matchesSearch && matchesStatus && matchesSeverity
  })

  const stats = {
    total: nonConformities.length,
    open: nonConformities.filter((nc) => nc.status === "open").length,
    inProgress: nonConformities.filter((nc) => nc.status === "in-progress").length,
    resolved: nonConformities.filter((nc) => nc.status === "resolved").length,
    critical: nonConformities.filter((nc) => nc.severity === "critical").length,
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Não Conformidades</h1>
          <p className="text-muted-foreground">Gestão e acompanhamento de não conformidades de SST</p>
        </div>

        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>Selecione uma empresa para visualizar e gerenciar as não conformidades.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Não Conformidades</h1>
          <p className="text-muted-foreground">
            Gestão e acompanhamento de não conformidades de SST - {selectedCompany.name}
          </p>
        </div>
        <Button onClick={() => setShowNewForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Não Conformidade
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Não Conformidades</TabsTrigger>
          <TabsTrigger value="analytics">Análise e Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filtros */}
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
                      placeholder="Buscar não conformidades..."
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
                      <SelectItem value="open">Abertas</SelectItem>
                      <SelectItem value="in-progress">Em Andamento</SelectItem>
                      <SelectItem value="resolved">Resolvidas</SelectItem>
                      <SelectItem value="closed">Fechadas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="severity">Severidade</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Todas as severidades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as severidades</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Não Conformidades */}
          <div className="space-y-4">
            {filteredNonConformities.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    {nonConformities.length === 0
                      ? "Nenhuma não conformidade registrada para esta empresa."
                      : "Nenhuma não conformidade encontrada com os filtros aplicados."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredNonConformities.map((nc) => (
                <Card key={nc.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {nc.id} - {nc.title}
                          <Badge className={getSeverityColor(nc.severity)}>
                            {nc.severity === "critical"
                              ? "Crítica"
                              : nc.severity === "high"
                                ? "Alta"
                                : nc.severity === "medium"
                                  ? "Média"
                                  : "Baixa"}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{nc.description}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(nc.status)}>
                        {getStatusIcon(nc.status)}
                        <span className="ml-1">
                          {nc.status === "open"
                            ? "Aberta"
                            : nc.status === "in-progress"
                              ? "Em Andamento"
                              : nc.status === "resolved"
                                ? "Resolvida"
                                : "Fechada"}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Reportado por: {nc.reportedBy}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Data: {new Date(nc.reportedDate).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>Local: {nc.location}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Responsável: {nc.assignedTo}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Prazo: {new Date(nc.dueDate).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>
                    {nc.actions.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium">Ações Corretivas:</Label>
                        <ul className="mt-2 space-y-1">
                          {nc.actions.map((action, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              • {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                      <Button variant="outline" size="sm">
                        Adicionar Ação
                      </Button>
                      <Button variant="outline" size="sm">
                        Histórico
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Não Conformidades por Tipo</CardTitle>
                <CardDescription>Distribuição por categoria - {selectedCompany.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Segurança</span>
                    <span className="font-medium">
                      {Math.round(
                        (nonConformities.filter((nc) => nc.type === "safety").length / nonConformities.length) * 100,
                      ) || 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saúde</span>
                    <span className="font-medium">
                      {Math.round(
                        (nonConformities.filter((nc) => nc.type === "health").length / nonConformities.length) * 100,
                      ) || 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ambiental</span>
                    <span className="font-medium">
                      {Math.round(
                        (nonConformities.filter((nc) => nc.type === "environmental").length / nonConformities.length) *
                          100,
                      ) || 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Legal</span>
                    <span className="font-medium">
                      {Math.round(
                        (nonConformities.filter((nc) => nc.type === "legal").length / nonConformities.length) * 100,
                      ) || 0}
                      %
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tempo Médio de Resolução</CardTitle>
                <CardDescription>Por nível de severidade - {selectedCompany.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Crítica</span>
                    <span className="font-medium">2 dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Alta</span>
                    <span className="font-medium">5 dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Média</span>
                    <span className="font-medium">10 dias</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Baixa</span>
                    <span className="font-medium">15 dias</span>
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

export { NonConformitiesComponent as NonConformities }
export default NonConformitiesComponent
