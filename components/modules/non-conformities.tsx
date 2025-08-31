"use client"

import { useState } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckSquare,
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
      companyId: "1",
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
      companyId: "1",
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
      companyId: "2",
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
      companyId: "2",
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
      companyId: "3",
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

  const [isNewNCOpen, setIsNewNCOpen] = useState(false)
  const [isEditNCOpen, setIsEditNCOpen] = useState(false)
  const [isViewNCOpen, setIsViewNCOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null)
  const [editingNC, setEditingNC] = useState<NonConformity | null>(null)
  const [deletingNC, setDeletingNC] = useState<NonConformity | null>(null)
  const [resolvingNC, setResolvingNC] = useState<NonConformity | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "",
    severity: "",
    location: "",
    assignedTo: "",
    dueDate: "",
    actions: [""],
  })

  const handleNewNC = () => {
    setFormData({
      title: "",
      description: "",
      type: "",
      severity: "",
      location: "",
      assignedTo: "",
      dueDate: "",
      actions: [""],
    })
    setIsNewNCOpen(true)
  }

  const handleViewNC = (nc: NonConformity) => {
    setSelectedNC(nc)
    setIsViewNCOpen(true)
  }

  const handleEditNC = (nc: NonConformity) => {
    setEditingNC(nc)
    setFormData({
      title: nc.title,
      description: nc.description,
      type: nc.type,
      severity: nc.severity,
      location: nc.location,
      assignedTo: nc.assignedTo,
      dueDate: nc.dueDate,
      actions: nc.actions.length > 0 ? nc.actions : [""],
    })
    setIsEditNCOpen(true)
  }

  const handleDeleteNC = (nc: NonConformity) => {
    setDeletingNC(nc)
    setIsDeleteDialogOpen(true)
  }

  const handleResolveNC = (nc: NonConformity) => {
    setResolvingNC(nc)
    setIsResolveDialogOpen(true)
  }

  const handleSaveNC = () => {
    // Validate required fields
    if (
      !formData.title ||
      !formData.description ||
      !formData.type ||
      !formData.severity ||
      !formData.location ||
      !formData.assignedTo ||
      !formData.dueDate
    ) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    console.log("[v0] Saving NC:", formData)

    if (editingNC) {
      console.log("[v0] Updating NC:", editingNC.id)
      setIsEditNCOpen(false)
      setEditingNC(null)
    } else {
      console.log("[v0] Creating new NC")
      setIsNewNCOpen(false)
    }

    // Reset form
    setFormData({
      title: "",
      description: "",
      type: "",
      severity: "",
      location: "",
      assignedTo: "",
      dueDate: "",
      actions: [""],
    })
  }

  const handleCancelForm = () => {
    setIsNewNCOpen(false)
    setIsEditNCOpen(false)
    setEditingNC(null)
    setFormData({
      title: "",
      description: "",
      type: "",
      severity: "",
      location: "",
      assignedTo: "",
      dueDate: "",
      actions: [""],
    })
  }

  const confirmDelete = () => {
    if (deletingNC) {
      console.log("[v0] Deleting NC:", deletingNC.id)
      setIsDeleteDialogOpen(false)
      setDeletingNC(null)
    }
  }

  const confirmResolve = () => {
    if (resolvingNC) {
      console.log("[v0] Resolving NC:", resolvingNC.id)
      setIsResolveDialogOpen(false)
      setResolvingNC(null)
    }
  }

  const addAction = () => {
    setFormData({ ...formData, actions: [...formData.actions, ""] })
  }

  const removeAction = (index: number) => {
    const newActions = formData.actions.filter((_, i) => i !== index)
    setFormData({ ...formData, actions: newActions.length > 0 ? newActions : [""] })
  }

  const updateAction = (index: number, value: string) => {
    const newActions = [...formData.actions]
    newActions[index] = value
    setFormData({ ...formData, actions: newActions })
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
        <Button onClick={handleNewNC}>
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
                      <div className="flex items-center gap-2">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewNC(nc)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditNC(nc)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            {nc.status !== "resolved" && nc.status !== "closed" && (
                              <DropdownMenuItem onClick={() => handleResolveNC(nc)}>
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Resolver
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDeleteNC(nc)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

      <Dialog open={isNewNCOpen} onOpenChange={setIsNewNCOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Não Conformidade</DialogTitle>
            <DialogDescription>Registre uma nova não conformidade para {selectedCompany.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: EPI não utilizado na área de soldagem"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Descreva detalhadamente a não conformidade observada"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Segurança</SelectItem>
                    <SelectItem value="health">Saúde</SelectItem>
                    <SelectItem value="environmental">Ambiental</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidade *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a severidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local *</Label>
                <Input
                  placeholder="Ex: Setor de Soldagem - Linha 2"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maria Santos">Maria Santos</SelectItem>
                    <SelectItem value="Carlos Oliveira">Carlos Oliveira</SelectItem>
                    <SelectItem value="Lucia Ferreira">Lucia Ferreira</SelectItem>
                    <SelectItem value="Sandra Moura">Sandra Moura</SelectItem>
                    <SelectItem value="Marcos Pereira">Marcos Pereira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prazo para Resolução *</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Ações Corretivas</Label>
              {formData.actions.map((action, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Descreva a ação corretiva"
                    value={action}
                    onChange={(e) => updateAction(index, e.target.value)}
                  />
                  {formData.actions.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => removeAction(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Ação
              </Button>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelForm}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNC}>Registrar Não Conformidade</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditNCOpen} onOpenChange={setIsEditNCOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Não Conformidade</DialogTitle>
            <DialogDescription>Edite as informações da não conformidade {editingNC?.id}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: EPI não utilizado na área de soldagem"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Descreva detalhadamente a não conformidade observada"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safety">Segurança</SelectItem>
                    <SelectItem value="health">Saúde</SelectItem>
                    <SelectItem value="environmental">Ambiental</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidade *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) => setFormData({ ...formData, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a severidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Crítica</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local *</Label>
                <Input
                  placeholder="Ex: Setor de Soldagem - Linha 2"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maria Santos">Maria Santos</SelectItem>
                    <SelectItem value="Carlos Oliveira">Carlos Oliveira</SelectItem>
                    <SelectItem value="Lucia Ferreira">Lucia Ferreira</SelectItem>
                    <SelectItem value="Sandra Moura">Sandra Moura</SelectItem>
                    <SelectItem value="Marcos Pereira">Marcos Pereira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prazo para Resolução *</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Ações Corretivas</Label>
              {formData.actions.map((action, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Descreva a ação corretiva"
                    value={action}
                    onChange={(e) => updateAction(index, e.target.value)}
                  />
                  {formData.actions.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => removeAction(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Ação
              </Button>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelForm}>
              Cancelar
            </Button>
            <Button onClick={handleSaveNC}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewNCOpen} onOpenChange={setIsViewNCOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedNC?.id} - {selectedNC?.title}
            </DialogTitle>
            <DialogDescription>Detalhes completos da não conformidade</DialogDescription>
          </DialogHeader>
          {selectedNC && (
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID:</span>
                      <span className="font-medium">{selectedNC.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium">
                        {selectedNC.type === "safety"
                          ? "Segurança"
                          : selectedNC.type === "health"
                            ? "Saúde"
                            : selectedNC.type === "environmental"
                              ? "Ambiental"
                              : "Legal"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Severidade:</span>
                      <Badge className={getSeverityColor(selectedNC.severity)}>
                        {selectedNC.severity === "critical"
                          ? "Crítica"
                          : selectedNC.severity === "high"
                            ? "Alta"
                            : selectedNC.severity === "medium"
                              ? "Média"
                              : "Baixa"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(selectedNC.status)}>
                        {selectedNC.status === "open"
                          ? "Aberta"
                          : selectedNC.status === "in-progress"
                            ? "Em Andamento"
                            : selectedNC.status === "resolved"
                              ? "Resolvida"
                              : "Fechada"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Local:</span>
                      <span className="font-medium">{selectedNC.location}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Responsabilidades</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reportado por:</span>
                      <span className="font-medium">{selectedNC.reportedBy}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data do Relato:</span>
                      <span className="font-medium">
                        {new Date(selectedNC.reportedDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Responsável:</span>
                      <span className="font-medium">{selectedNC.assignedTo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prazo:</span>
                      <span className="font-medium">{new Date(selectedNC.dueDate).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{selectedNC.description}</p>
                </CardContent>
              </Card>

              {selectedNC.actions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ações Corretivas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedNC.actions.map((action, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setIsViewNCOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a não conformidade "{deletingNC?.id} - {deletingNC?.title}"? Esta ação não
              pode ser desfeita e todos os dados relacionados serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolver Não Conformidade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar a não conformidade "{resolvingNC?.id} - {resolvingNC?.title}" como
              resolvida? Esta ação indicará que todas as ações corretivas foram implementadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmResolve} className="bg-green-600 text-white hover:bg-green-700">
              Resolver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export { NonConformitiesComponent as NonConformities }
export default NonConformitiesComponent
