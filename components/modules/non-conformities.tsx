"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/contexts/company-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertTriangle,
  Plus,
  CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  FileText,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/client"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"

interface NonConformity {
  id: string
  empresa_id: string
  titulo: string
  descricao: string
  categoria: string
  severidade: string
  status: string
  reportado_por: string
  data_reporte: string
  local: string
  data_prazo: string
  responsavel: string
  acoes_corretivas: string[]
  created_at: string
  updated_at: string
  data_resolucao?: string
}

export function NonConformities() {
  const [nonConformities, setNonConformities] = useState<NonConformity[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredNCs, setFilteredNCs] = useState<NonConformity[]>([])
  const [selectedNC, setSelectedNC] = useState<NonConformity | null>(null)
  const [isNewNCOpen, setIsNewNCOpen] = useState(false)
  const [isEditNCOpen, setIsEditNCOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [isViewNCOpen, setIsViewNCOpen] = useState(false)
  const [editingNC, setEditingNC] = useState<NonConformity | null>(null)
  const [deletingNC, setDeletingNC] = useState<NonConformity | null>(null)
  const [resolvingNC, setResolvingNC] = useState<NonConformity | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    severidade: "",
    local: "",
    responsavel: "",
    data_prazo: new Date(),
    acoes_corretivas: [""],
  })

  const { selectedCompany } = useCompany()
  const { toast } = useToast()
  const supabase = createBrowserClient()

  useEffect(() => {
    if (selectedCompany) {
      loadNonConformities()
    }
  }, [selectedCompany])

  useEffect(() => {
    filterNCs()
  }, [nonConformities, searchTerm, statusFilter, typeFilter, severityFilter])

  const loadNonConformities = async () => {
    if (!selectedCompany) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("nao_conformidades")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      if (error) throw error
      setNonConformities(data || [])
    } catch (error) {
      console.error("Erro ao carregar não conformidades:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterNCs = () => {
    let filtered = nonConformities

    if (searchTerm) {
      filtered = filtered.filter(
        (nc) =>
          nc.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          nc.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          nc.local.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((nc) => nc.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((nc) => nc.categoria === typeFilter)
    }

    if (severityFilter !== "all") {
      filtered = filtered.filter((nc) => nc.severidade === severityFilter)
    }

    setFilteredNCs(filtered)
  }

  const handleSaveNC = async () => {
    // Validate required fields
    if (
      !formData.titulo ||
      !formData.descricao ||
      !formData.categoria ||
      !formData.severidade ||
      !formData.local ||
      !formData.responsavel ||
      !formData.data_prazo
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "warning",
      })
      return
    }

    try {
      setLoading(true)

      const ncData = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        categoria: formData.categoria,
        severidade: formData.severidade,
        local: formData.local,
        responsavel: formData.responsavel,
        data_prazo: formData.data_prazo.toISOString(),
        acoes_corretivas: formData.acoes_corretivas,
        empresa_id: selectedCompany?.id || '',
        status: "Aberta",
      }

      if (editingNC) {
        // Update existing NC
        const { error } = await supabase.from("nao_conformidades").update(ncData).eq("id", editingNC.id)

        if (error) throw error
        setIsEditNCOpen(false)
        setEditingNC(null)
      } else {
        // Create new NC
        const { error } = await supabase.from("nao_conformidades").insert([ncData])

        if (error) throw error
        setIsNewNCOpen(false)
      }

      await loadNonConformities()
    } catch (error) {
      console.error("Erro ao salvar não conformidade:", error)
      toast({
        title: "Erro ao salvar",
        description: "Erro ao salvar não conformidade. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelForm = () => {
    setIsNewNCOpen(false)
    setIsEditNCOpen(false)
    setEditingNC(null)
    setFormData({
      titulo: "",
      descricao: "",
      categoria: "",
      severidade: "",
      local: "",
      responsavel: "",
      data_prazo: new Date(),
      acoes_corretivas: [""],
    })
  }

  const confirmDelete = async () => {
    if (!deletingNC) return

    try {
      setLoading(true)
      const { error } = await supabase.from("nao_conformidades").delete().eq("id", deletingNC.id)

      if (error) throw error

      setIsDeleteDialogOpen(false)
      setDeletingNC(null)
      await loadNonConformities()
    } catch (error) {
      console.error("Erro ao excluir não conformidade:", error)
      toast({
        title: "Erro ao excluir",
        description: "Erro ao excluir não conformidade. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const confirmResolve = async () => {
    if (!resolvingNC) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from("nao_conformidades")
        .update({ status: "Resolvida", data_resolucao: new Date().toISOString() })
        .eq("id", resolvingNC.id)

      if (error) throw error

      setIsResolveDialogOpen(false)
      setResolvingNC(null)
      await loadNonConformities()
    } catch (error) {
      console.error("Erro ao resolver não conformidade:", error)
      toast({
        title: "Erro ao resolver",
        description: "Erro ao resolver não conformidade. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const types = {
      seguranca: "Segurança",
      saude: "Saúde",
      ambiental: "Ambiental",
      legal: "Legal",
    }
    return types[type as keyof typeof types] || type
  }

  const getSeverityLabel = (severity: string) => {
    const severities = {
      baixa: "Baixa",
      media: "Média",
      alta: "Alta",
      critica: "Crítica",
    }
    return severities[severity as keyof typeof severities] || severity
  }

  const getStatusLabel = (status: string) => {
    const statuses = {
      aberta: "Aberta",
      em_andamento: "Em Andamento",
      resolvida: "Resolvida",
      fechada: "Fechada",
    }
    return statuses[status as keyof typeof statuses] || status
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aberta":
        return "destructive"
      case "em_andamento":
        return "secondary"
      case "resolvida":
        return "default"
      case "fechada":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "baixa":
        return "outline"
      case "media":
        return "secondary"
      case "alta":
        return "default"
      case "critica":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "aberta":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "em_andamento":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "resolvida":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "fechada":
        return <CheckCircle className="h-4 w-4 text-gray-500" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const stats = {
    total: nonConformities.length,
    abertas: nonConformities.filter((nc) => nc.status === "aberta").length,
    emAndamento: nonConformities.filter((nc) => nc.status === "em_andamento").length,
    resolvidas: nonConformities.filter((nc) => nc.status === "resolvida").length,
    criticas: nonConformities.filter((nc) => nc.severidade === "critica").length,
  }

  const handleViewNC = (nc: NonConformity) => {
    setSelectedNC(nc)
    setIsViewNCOpen(true)
  }

  const handleEditNC = (nc: NonConformity) => {
    setEditingNC(nc)
    setFormData({
      titulo: nc.titulo,
      descricao: nc.descricao,
      categoria: nc.categoria,
      severidade: nc.severidade,
      local: nc.local,
      responsavel: nc.responsavel,
      data_prazo: new Date(nc.data_prazo),
      acoes_corretivas: nc.acoes_corretivas.length > 0 ? nc.acoes_corretivas : [""],
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

  const addAction = () => {
    setFormData((prev) => ({
      ...prev,
      acoes_corretivas: [...prev.acoes_corretivas, ""],
    }))
  }

  const removeAction = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      acoes_corretivas: prev.acoes_corretivas.filter((_, i) => i !== index),
    }))
  }

  const updateAction = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      acoes_corretivas: prev.acoes_corretivas.map((action, i) => (i === index ? value : action)),
    }))
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <AlertTriangle className="h-8 w-8" />
            <span>Não Conformidades</span>
          </h1>
          <p className="text-muted-foreground">Gestão de não conformidades e planos de ação</p>
        </div>

        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Seleção de Empresa</AlertDialogTitle>
              <AlertDialogDescription>
                Selecione uma empresa para visualizar e gerenciar as não conformidades.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Fechar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8" />
              <span>Não Conformidades</span>
            </h1>
            <p className="text-muted-foreground">Carregando não conformidades - {selectedCompany.name}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <AlertTriangle className="h-8 w-8" />
            <span>Não Conformidades</span>
          </h1>
          <p className="text-muted-foreground">Gestão de não conformidades e planos de ação | {selectedCompany.name}</p>
        </div>
        <Dialog open={isNewNCOpen} onOpenChange={setIsNewNCOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Não Conformidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Nova Não Conformidade</DialogTitle>
              <DialogDescription>Registre uma nova não conformidade para {selectedCompany.name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    placeholder="Título da não conformidade"
                    value={formData.titulo}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Local *</Label>
                  <Input
                    placeholder="Local onde foi identificada"
                    value={formData.local}
                    onChange={(e) => setFormData((prev) => ({ ...prev, local: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea
                  placeholder="Descreva detalhadamente a não conformidade identificada"
                  rows={3}
                  value={formData.descricao}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, categoria: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seguranca">Segurança</SelectItem>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="ambiental">Ambiental</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severidade *</Label>
                  <Select
                    value={formData.severidade}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, severidade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a severidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Prazo *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-[280px]", "pl-3", "text-sm", "font-normal")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(formData.data_prazo, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.data_prazo}
                        onSelect={(date) => setFormData((prev) => ({ ...prev, data_prazo: date || new Date() }))}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Input
                  placeholder="Nome do responsável pela correção"
                  value={formData.responsavel}
                  onChange={(e) => setFormData((prev) => ({ ...prev, responsavel: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Ações Corretivas</Label>
                {formData.acoes_corretivas.map((action, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Ação corretiva ${index + 1}`}
                      value={action}
                      onChange={(e) => updateAction(index, e.target.value)}
                    />
                    {formData.acoes_corretivas.length > 1 && (
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
              <Button onClick={handleSaveNC} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{selectedCompany.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abertas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.abertas}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.abertas / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.emAndamento}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.emAndamento / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolvidas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolvidas}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.resolvidas / stats.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Críticas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticas}</div>
            <p className="text-xs text-muted-foreground">Requer atenção imediata</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de NCs</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Não Conformidades</CardTitle>
              <CardDescription>Lista de todas as não conformidades - {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Buscar não conformidades..."
                    className="w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="aberta">Abertas</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="resolvida">Resolvidas</SelectItem>
                      <SelectItem value="fechada">Fechadas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="seguranca">Segurança</SelectItem>
                      <SelectItem value="saude">Saúde</SelectItem>
                      <SelectItem value="ambiental">Ambiental</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Severidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNCs.map((nc) => (
                    <TableRow key={nc.id}>
                      <TableCell className="font-mono text-sm">{nc.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{nc.titulo}</TableCell>
                      <TableCell>{getTypeLabel(nc.categoria)}</TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(nc.severidade) as any}>
                          {getSeverityLabel(nc.severidade)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(nc.status)}
                          <Badge variant={getStatusColor(nc.status) as any}>{getStatusLabel(nc.status)}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>{nc.responsavel}</TableCell>
                      <TableCell>{format(new Date(nc.data_prazo), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
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
                            {nc.status !== "resolvida" && (
                              <DropdownMenuItem onClick={() => handleResolveNC(nc)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Resolver
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDeleteNC(nc)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredNCs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {nonConformities.length === 0
                    ? `Nenhuma não conformidade cadastrada para ${selectedCompany.name}`
                    : "Nenhuma não conformidade encontrada com os filtros aplicados"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["seguranca", "saude", "ambiental", "legal"].map((categoria) => {
                    const count = nonConformities.filter((nc) => nc.categoria === categoria).length
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                    return (
                      <div key={categoria} className="flex justify-between items-center">
                        <span className="text-sm">{getTypeLabel(categoria)}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Severidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["critica", "alta", "media", "baixa"].map((severidade) => {
                    const count = nonConformities.filter((nc) => nc.severidade === severidade).length
                    const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                    return (
                      <div key={severidade} className="flex justify-between items-center">
                        <span className="text-sm">{getSeverityLabel(severidade)}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View NC Dialog */}
      <Dialog open={isViewNCOpen} onOpenChange={setIsViewNCOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Não Conformidade</DialogTitle>
            <DialogDescription>Informações completas da não conformidade</DialogDescription>
          </DialogHeader>
          {selectedNC && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Título</Label>
                  <p className="font-medium">{selectedNC.titulo}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Local</Label>
                  <p>{selectedNC.local}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                <p className="text-sm">{selectedNC.descricao}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Categoria</Label>
                  <p>{getTypeLabel(selectedNC.categoria)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Severidade</Label>
                  <Badge variant={getSeverityColor(selectedNC.severidade) as any}>
                    {getSeverityLabel(selectedNC.severidade)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedNC.status)}
                    <Badge variant={getStatusColor(selectedNC.status) as any}>
                      {getStatusLabel(selectedNC.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Responsável</Label>
                  <p>{selectedNC.responsavel}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Data Prazo</Label>
                  <p>{format(new Date(selectedNC.data_prazo), "dd/MM/yyyy")}</p>
                </div>
              </div>
              {selectedNC.acoes_corretivas.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Ações Corretivas</Label>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedNC.acoes_corretivas.map((action, index) => (
                      <li key={index} className="text-sm">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsViewNCOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => handleEditNC(selectedNC!)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit NC Dialog */}
      <Dialog open={isEditNCOpen} onOpenChange={setIsEditNCOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar Não Conformidade</DialogTitle>
            <DialogDescription>
              Atualize as informações da não conformidade para {selectedCompany.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  placeholder="Título da não conformidade"
                  value={formData.titulo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Local *</Label>
                <Input
                  placeholder="Local onde foi identificada"
                  value={formData.local}
                  onChange={(e) => setFormData((prev) => ({ ...prev, local: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Descreva detalhadamente a não conformidade identificada"
                rows={3}
                value={formData.descricao}
                onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, categoria: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seguranca">Segurança</SelectItem>
                    <SelectItem value="saude">Saúde</SelectItem>
                    <SelectItem value="ambiental">Ambiental</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severidade *</Label>
                <Select
                  value={formData.severidade}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, severidade: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a severidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Prazo *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-[280px]", "pl-3", "text-sm", "font-normal")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.data_prazo, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.data_prazo}
                      onSelect={(date) => setFormData((prev) => ({ ...prev, data_prazo: date || new Date() }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsável *</Label>
              <Input
                placeholder="Nome do responsável pela correção"
                value={formData.responsavel}
                onChange={(e) => setFormData((prev) => ({ ...prev, responsavel: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Ações Corretivas</Label>
              {formData.acoes_corretivas.map((action, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Ação corretiva ${index + 1}`}
                    value={action}
                    onChange={(e) => updateAction(index, e.target.value)}
                  />
                  {formData.acoes_corretivas.length > 1 && (
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
            <Button onClick={handleSaveNC} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta não conformidade? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {deletingNC && (
            <div className="py-4">
              <p className="font-medium">{deletingNC.titulo}</p>
              <p className="text-sm text-muted-foreground">{deletingNC.local}</p>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolve Confirmation Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Resolução</DialogTitle>
            <DialogDescription>Tem certeza que deseja marcar esta não conformidade como resolvida?</DialogDescription>
          </DialogHeader>
          {resolvingNC && (
            <div className="py-4">
              <p className="font-medium">{resolvingNC.titulo}</p>
              <p className="text-sm text-muted-foreground">{resolvingNC.local}</p>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmResolve}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolver
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
