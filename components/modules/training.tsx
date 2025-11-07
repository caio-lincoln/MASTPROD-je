"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/contexts/company-context"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  GraduationCap,
  Plus,
  CalendarIcon,
  Users,
  Clock,
  Award,
  BookOpen,
  Edit,
  Eye,
  Trash2,
  Download,
  AlertCircle,
  CheckCircle,
  MoreHorizontal,
  FileText,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { createBrowserClient } from "@/lib/supabase/client"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface Training {
  id: number
  nome: string
  categoria: string
  carga_horaria: number
  validade_meses: number
  instrutor: string
  status: string
  descricao?: string
  proxima_turma?: string
  empresa_id: string
  created_at: string
  updated_at: string
}

interface TrainingParticipant {
  id: number
  treinamento_id: number
  funcionario_id: number
  data_inicio?: string
  data_conclusao?: string
  status: string
  nota?: number
  certificado_url?: string
  funcionario: {
    nome: string
    cargo: string
  }
  treinamento: {
    nome: string
  }
}

interface Certificate {
  id: string
  treinamento_nome: string
  data_treinamento: string
  certificado_url: string
  funcionario: {
    nome: string
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Ativo":
      return "default"
    case "Planejado":
      return "secondary"
    case "Concluído":
      return "outline"
    case "Cancelado":
      return "destructive"
    default:
      return "secondary"
  }
}

const getParticipantStatusColor = (status: string) => {
  switch (status) {
    case "Concluído":
      return "default"
    case "Em Andamento":
      return "secondary"
    case "Pendente":
      return "outline"
    case "Reprovado":
      return "destructive"
    default:
      return "secondary"
  }
}

export { TrainingComponent as Training }
export default function TrainingComponent() {
  const { selectedCompany } = useCompany()
  const [loading, setLoading] = useState(false)
  const [trainings, setTrainings] = useState<Training[]>([])
  const [participants, setParticipants] = useState<TrainingParticipant[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [certificatesThisMonth, setCertificatesThisMonth] = useState(0)
  const [isNewTrainingOpen, setIsNewTrainingOpen] = useState(false)
  const [isEditTrainingOpen, setIsEditTrainingOpen] = useState(false)
  const [isViewTrainingOpen, setIsViewTrainingOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null)
  const [editingTraining, setEditingTraining] = useState<Training | null>(null)
  const [deletingTraining, setDeletingTraining] = useState<Training | null>(null)
  const [formData, setFormData] = useState({
    nome: "",
    categoria: "",
    cargaHoraria: "",
    validade: "",
    instrutor: "",
    descricao: "",
    proximaTurma: null as Date | null,
  })
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const supabase = createBrowserClient()
  const { toast } = useToast()

  const loadCertificates = async () => {
    if (!selectedCompany) return

    try {
      // Get certificates issued this month
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

      const { data: monthlyData, error: monthlyError } = await supabase
        .from("treinamento_funcionarios")
        .select(`
          id,
          treinamentos!inner(
            id,
            empresa_id
          )
        `)
        .eq("status", "concluido")
        .gte("created_at", startOfMonth.toISOString())
        .eq("treinamentos.empresa_id", selectedCompany.id)

      if (monthlyError) throw monthlyError
      setCertificatesThisMonth(monthlyData?.length || 0)

      // Get all certificates with details
      const { data: certificatesData, error: certificatesError } = await supabase
        .from("treinamento_funcionarios")
        .select(`
          id,
          certificado_url,
          created_at,
          funcionarios (
            nome
          ),
          treinamentos (
            nome,
            empresa_id
          )
        `)
        .eq("status", "concluido")
        .not("certificado_url", "is", null)
        .eq("treinamentos.empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      if (certificatesError) throw certificatesError

      const formattedCertificates =
        certificatesData?.map((cert: any) => ({
          id: cert.id,
          treinamento_nome: cert.treinamentos?.nome || "",
          data_treinamento: cert.created_at,
          certificado_url: cert.certificado_url || "",
          funcionario: {
            nome: cert.funcionarios?.nome || "",
          },
        })) || []

      setCertificates(formattedCertificates)
    } catch (error) {
      console.error("Erro ao carregar certificados:", error)
    }
  }

  const loadTrainings = async () => {
    if (!selectedCompany) return

    try {
      setLoading(true)

      // Load trainings
      const { data: trainingsData, error: trainingsError } = await supabase
        .from("treinamentos")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      if (trainingsError) throw trainingsError

      // Load participants with related data
      const { data: participantsData, error: participantsError } = await supabase
        .from("treinamento_funcionarios")
        .select(`
          *,
          funcionario:funcionarios(nome, cargo),
          treinamento:treinamentos(nome)
        `)
        .eq("treinamentos.empresa_id", selectedCompany.id)

      if (participantsError) throw participantsError

      setTrainings(trainingsData || [])
      setParticipants(participantsData || [])

      await loadCertificates()
    } catch (error) {
      console.error("Erro ao carregar treinamentos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrainings()
  }, [selectedCompany])

  const handleDownloadCertificate = async (certificateUrl: string) => {
    try {
      if (certificateUrl.startsWith("http")) {
        // Direct URL - open in new tab
        window.open(certificateUrl, "_blank")
      } else {
        // Storage path - create signed URL
        const { data, error } = await supabase.storage.from("certificados").createSignedUrl(certificateUrl, 3600) // 1 hour access

        if (error) throw error

        if (data?.signedUrl) {
          window.open(data.signedUrl, "_blank")
        }
      }
    } catch (error) {
      console.error("Erro ao baixar certificado:", error)
      toast({
        title: "Erro ao baixar",
        description: "Não foi possível baixar o certificado.",
        variant: "destructive",
      })
    }
  }

  const stats = {
    totalTreinamentos: trainings.length,
    totalParticipantes: participants.length,
    totalConcluidos: participants.filter((p) => p.status === "Concluído").length,
    totalPendentes: participants.filter((p) => p.status === "Pendente").length,
  }

  const handleViewTraining = (training: any) => {
    setSelectedTraining(training)
    setIsViewTrainingOpen(true)
  }

  const handleEditTraining = (training: any) => {
    setEditingTraining(training)
    setFormData({
      nome: training.nome,
      categoria: training.categoria,
      cargaHoraria: training.carga_horaria.toString(),
      validade: training.validade_meses.toString(),
      instrutor: training.instrutor,
      descricao: training.descricao || "",
      proximaTurma: training.proxima_turma ? new Date(training.proxima_turma) : null,
    })
    setIsEditTrainingOpen(true)
  }

  const handleDeleteTraining = (training: any) => {
    setDeletingTraining(training)
    setIsDeleteDialogOpen(true)
  }

  const handleSaveTraining = async () => {
    // Validate required fields
    if (!formData.nome || !formData.categoria || !formData.cargaHoraria || !formData.validade || !formData.instrutor) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "warning",
      })
      return
    }

    if (!selectedCompany) return

    try {
      const trainingData = {
        nome: formData.nome,
        categoria: formData.categoria,
        carga_horaria: Number.parseInt(formData.cargaHoraria),
        validade_meses: Number.parseInt(formData.validade),
        instrutor: formData.instrutor,
        descricao: formData.descricao,
        proxima_turma: formData.proximaTurma?.toISOString(),
        empresa_id: selectedCompany.id,
        status: "Planejado",
      }

      if (editingTraining) {
        // Update existing training
        const { error } = await supabase.from("treinamentos").update(trainingData).eq("id", editingTraining.id)

        if (error) throw error
        setIsEditTrainingOpen(false)
        setEditingTraining(null)
      } else {
        // Create new training
        const { error } = await supabase.from("treinamentos").insert([trainingData])

        if (error) throw error
        setIsNewTrainingOpen(false)
      }

      await loadTrainings() // Reload data
    } catch (error) {
      console.error("Erro ao salvar treinamento:", error)
      toast({
        title: "Erro ao salvar",
        description: "Erro ao salvar treinamento. Tente novamente.",
        variant: "destructive",
      })
    }

    // Reset form
    setFormData({
      nome: "",
      categoria: "",
      cargaHoraria: "",
      validade: "",
      instrutor: "",
      descricao: "",
      proximaTurma: null,
    })
  }

  const handleCancelForm = () => {
    setIsNewTrainingOpen(false)
    setIsEditTrainingOpen(false)
    setEditingTraining(null)
    setFormData({
      nome: "",
      categoria: "",
      cargaHoraria: "",
      validade: "",
      instrutor: "",
      descricao: "",
      proximaTurma: null,
    })
  }

  const confirmDelete = async () => {
    if (!deletingTraining) return

    try {
      const { error } = await supabase.from("treinamentos").delete().eq("id", deletingTraining.id)

      if (error) throw error

      await loadTrainings() // Reload data
      setIsDeleteDialogOpen(false)
      setDeletingTraining(null)
    } catch (error) {
      console.error("Erro ao excluir treinamento:", error)
      toast({
        title: "Erro ao excluir",
        description: "Erro ao excluir treinamento. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8" />
            <span>Treinamentos</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestão de capacitações e certificações obrigatórias
          </p>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
                <p className="text-muted-foreground">
                  Selecione uma empresa no menu superior para visualizar os treinamentos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8" />
            <span>Treinamentos</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestão de capacitações e certificações obrigatórias - {selectedCompany.name}
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando treinamentos...</p>
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
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="leading-tight">Treinamentos</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gestão de capacitações e certificações obrigatórias - {selectedCompany.name}
          </p>
        </div>
        <Dialog open={isNewTrainingOpen} onOpenChange={setIsNewTrainingOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Treinamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Treinamento</DialogTitle>
              <DialogDescription>
                Adicione um novo treinamento ao programa de capacitação de {selectedCompany.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Treinamento *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: NR-35 - Trabalho em Altura"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Norma Regulamentadora">Norma Regulamentadora</SelectItem>
                      <SelectItem value="Capacitação Geral">Capacitação Geral</SelectItem>
                      <SelectItem value="Técnico Especializado">Técnico Especializado</SelectItem>
                      <SelectItem value="Integração">Integração</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargaHoraria">Carga Horária (h) *</Label>
                  <Input
                    id="cargaHoraria"
                    type="number"
                    value={formData.cargaHoraria}
                    onChange={(e) => setFormData({ ...formData, cargaHoraria: e.target.value })}
                    placeholder="8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validade">Validade (meses) *</Label>
                  <Input
                    id="validade"
                    type="number"
                    value={formData.validade}
                    onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                    placeholder="24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instrutor">Instrutor *</Label>
                  <Input
                    id="instrutor"
                    value={formData.instrutor}
                    onChange={(e) => setFormData({ ...formData, instrutor: e.target.value })}
                    placeholder="Nome do instrutor"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proximaTurma">Próxima Turma</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-transparent",
                        !formData.proximaTurma && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.proximaTurma ? (
                        format(formData.proximaTurma, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.proximaTurma || undefined}
                      onSelect={(date) => setFormData({ ...formData, proximaTurma: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descreva o conteúdo e objetivos do treinamento"
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" onClick={handleCancelForm} className="w-full sm:w-auto bg-transparent">
                Cancelar
              </Button>
              <Button onClick={handleSaveTraining} className="w-full sm:w-auto">
                Salvar Treinamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="treinamentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>
          <TabsTrigger value="participantes">Participantes</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="treinamentos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Treinamentos Ativos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTreinamentos}</div>
                <p className="text-xs text-muted-foreground">Programas disponíveis</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Participantes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalParticipantes}</div>
                <p className="text-xs text-muted-foreground">Total inscritos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.totalConcluidos}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalParticipantes > 0
                    ? Math.round((stats.totalConcluidos / stats.totalParticipantes) * 100)
                    : 0}
                  % de aprovação
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.totalPendentes}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.totalParticipantes > 0
                    ? Math.round((stats.totalPendentes / stats.totalParticipantes) * 100)
                    : 0}
                  % restante
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Treinamentos</CardTitle>
              <CardDescription>Todos os programas de treinamento de {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {trainings.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum treinamento encontrado</h3>
                  <p className="text-muted-foreground">Não há treinamentos cadastrados para {selectedCompany.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trainings.map((training) => (
                    <div key={training.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{training.nome}</h3>
                          <p className="text-sm text-muted-foreground">{training.categoria}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                            <span>⏱️ {training.carga_horaria}h</span>
                            <span>📅 Validade: {training.validade_meses} meses</span>
                            <span>👨‍🏫 {training.instrutor}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(training.status) as any}>{training.status}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewTraining(training)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditTraining(training)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteTraining(training)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progresso Geral</span>
                            <span>{Math.round((participants.filter(p => p.treinamento_id === training.id && p.status === "Concluído").length / participants.filter(p => p.treinamento_id === training.id).length) * 100) || 0}%</span>
                          </div>
                          <Progress
                            value={
                              participants.filter(p => p.treinamento_id === training.id).length > 0 ? (participants.filter(p => p.treinamento_id === training.id && p.status === "Concluído").length / participants.filter(p => p.treinamento_id === training.id).length) * 100 : 0
                            }
                            className="h-2"
                          />
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Participantes</p>
                            <p className="font-medium">{participants.filter(p => p.treinamento_id === training.id).length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Concluídos</p>
                            <p className="font-medium text-green-600">{participants.filter(p => p.treinamento_id === training.id && p.status === "Concluído").length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pendentes</p>
                            <p className="font-medium text-yellow-600">{participants.filter(p => p.treinamento_id === training.id && p.status === "Pendente").length}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Próxima Turma</p>
                            <p className="font-medium">{training.proxima_turma ? format(new Date(training.proxima_turma), "dd/MM/yyyy") : "Não definida"}</p>
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Users className="h-4 w-4 mr-1" />
                              Inscrever
                            </Button>
                            <Button variant="outline" size="sm">
                              <FileText className="h-4 w-4 mr-1" />
                              Relatório
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participantes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Participantes dos Treinamentos</CardTitle>
              <CardDescription>
                Status individual dos funcionários de {selectedCompany.name} nos treinamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Input placeholder="Buscar participante..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Treinamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="nr35">NR-35</SelectItem>
                      <SelectItem value="nr10">NR-10</SelectItem>
                      <SelectItem value="primeiros-socorros">Primeiros Socorros</SelectItem>
                      <SelectItem value="nr33">NR-33</SelectItem>
                      <SelectItem value="nr12">NR-12</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                      <SelectItem value="andamento">Em Andamento</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
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
                    <TableHead>Participante</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Data Conclusão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Certificado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="space-y-2">
                          <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                          <p className="text-muted-foreground">
                            Nenhum participante encontrado para {selectedCompany.name}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    participants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">{participant.funcionario.nome}</TableCell>
                        <TableCell>{participant.funcionario.cargo}</TableCell>
                        <TableCell>{participant.treinamento.nome}</TableCell>
                        <TableCell>
                          {participant.data_inicio ? format(new Date(participant.data_inicio), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {participant.data_conclusao
                            ? format(new Date(participant.data_conclusao), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getParticipantStatusColor(participant.status) as any}>
                            {participant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{participant.nota || "-"}</TableCell>
                        <TableCell>
                          {participant.certificado_url ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {participant.certificado_url && (
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <FileText className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="certificados" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Certificados Digitais</span>
                </CardTitle>
                <CardDescription>Gestão e emissão automática de certificados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.totalConcluidos}</div>
                    <p className="text-sm text-muted-foreground">Certificados Emitidos</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{certificatesThisMonth}</div>
                    <p className="text-sm text-muted-foreground">Este Mês</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Certificados Recentes</h4>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Funcionário</TableHead>
                          <TableHead>Treinamento</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {certificates.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                              Nenhum certificado encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          certificates.slice(0, 5).map((certificate) => (
                            <TableRow key={certificate.id}>
                              <TableCell className="font-medium">{certificate.funcionario.nome}</TableCell>
                              <TableCell>{certificate.treinamento_nome}</TableCell>
                              <TableCell>
                                {format(new Date(certificate.data_treinamento), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadCertificate(certificate.certificado_url)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Configurações de Certificado</CardTitle>
                <CardDescription>Personalização dos certificados digitais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Modelo de Certificado</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Modelo Padrão</SelectItem>
                      <SelectItem value="nr">Modelo NR</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assinatura Digital</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Responsável pela assinatura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diretor">Diretor de SST</SelectItem>
                      <SelectItem value="coordenador">Coordenador</SelectItem>
                      <SelectItem value="instrutor">Instrutor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Visualizar Modelo
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendário de Treinamentos</CardTitle>
              <CardDescription>Cronograma de turmas e eventos de capacitação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Próximos Treinamentos</h3>
                  <div className="space-y-3">
                    {trainings.map((training) => (
                      <div key={training.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{training.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {training.instrutor} • {training.carga_horaria}h
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {participants.filter(p => p.treinamento_id === training.id).length} participantes inscritos
                            </p>
                          </div>
                          <Badge variant={training.status === "Planejado" ? "outline" : undefined}>
                            {training.proxima_turma ? format(new Date(training.proxima_turma), "dd/MM") : "--/--"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditTrainingOpen} onOpenChange={setIsEditTrainingOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Treinamento</DialogTitle>
            <DialogDescription>Edite as informações do treinamento para {selectedCompany.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Treinamento *</Label>
                <Input
                  placeholder="Ex: NR-35 - Trabalho em Altura"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Norma Regulamentadora">Norma Regulamentadora</SelectItem>
                    <SelectItem value="Capacitação Geral">Capacitação Geral</SelectItem>
                    <SelectItem value="Treinamento Técnico">Treinamento Técnico</SelectItem>
                    <SelectItem value="Comportamental">Comportamental</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Carga Horária *</Label>
                <Input
                  type="number"
                  placeholder="8"
                  value={formData.cargaHoraria}
                  onChange={(e) => setFormData({ ...formData, cargaHoraria: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Validade (meses) *</Label>
                <Input
                  type="number"
                  placeholder="24"
                  value={formData.validade}
                  onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Instrutor *</Label>
                <Select
                  value={formData.instrutor}
                  onValueChange={(value) => setFormData({ ...formData, instrutor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="João Santos">João Santos</SelectItem>
                    <SelectItem value="Maria Silva">Maria Silva</SelectItem>
                    <SelectItem value="Dr. Carlos Lima">Dr. Carlos Lima</SelectItem>
                    <SelectItem value="Roberto Costa">Roberto Costa</SelectItem>
                    <SelectItem value="Ana Ferreira">Ana Ferreira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o conteúdo e objetivos do treinamento"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data da Próxima Turma</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.proximaTurma
                      ? format(formData.proximaTurma, "PPP", { locale: ptBR })
                      : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.proximaTurma || undefined}
                    onSelect={(date) => setFormData({ ...formData, proximaTurma: date || null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelForm}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTraining}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewTrainingOpen} onOpenChange={setIsViewTrainingOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.nome}</DialogTitle>
            <DialogDescription>Detalhes completos do treinamento</DialogDescription>
          </DialogHeader>
          {selectedTraining && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Categoria:</span>
                      <span>{selectedTraining.categoria}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carga Horária:</span>
                      <span>{selectedTraining.carga_horaria}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validade:</span>
                      <span>{selectedTraining.validade_meses} meses</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Instrutor:</span>
                      <span>{selectedTraining.instrutor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedTraining.status) as any}>{selectedTraining.status}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Estatísticas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de Participantes:</span>
                      <span className="font-medium">
                        {participants.filter((p) => p.treinamento_id === selectedTraining.id).length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Concluídos:</span>
                      <span className="font-medium text-green-600">
                        {
                          participants.filter(
                            (p) => p.treinamento_id === selectedTraining.id && p.status === "Concluído",
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pendentes:</span>
                      <span className="font-medium text-yellow-600">
                        {
                          participants.filter(
                            (p) => p.treinamento_id === selectedTraining.id && p.status === "Pendente",
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de Aprovação:</span>
                      <span className="font-medium">
                        {(() => {
                          const totalParticipants = participants.filter(
                            (p) => p.treinamento_id === selectedTraining.id,
                          ).length
                          const completedParticipants = participants.filter(
                            (p) => p.treinamento_id === selectedTraining.id && p.status === "Concluído",
                          ).length
                          return totalParticipants > 0
                            ? Math.round((completedParticipants / totalParticipants) * 100)
                            : 0
                        })()}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Próxima Turma:</span>
                      <span className="font-medium">
                        {selectedTraining.proxima_turma
                          ? format(new Date(selectedTraining.proxima_turma), "dd/MM/yyyy")
                          : "-"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedTraining.descricao && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Descrição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{selectedTraining.descricao}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setIsViewTrainingOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o treinamento "{deletingTraining?.nome}"? Esta ação não pode ser desfeita e
              todos os dados relacionados serão perdidos.
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
    </div>
  )
}
