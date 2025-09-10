"use client"

import { useState, useEffect } from "react"
import { useCompany } from "@/contexts/company-context"
import { createBrowserClient } from "@/lib/supabase/client"
import { uploadFile } from "@/lib/supabase/storage"
import { FileUpload } from "@/components/ui/file-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Heart,
  Plus,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Download,
  Upload,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

interface ExameAso {
  id: string
  funcionario_id: string
  funcionario_nome: string
  funcionario_cargo: string
  tipo_exame: string
  data_exame: string
  data_proximo_exame: string
  medico_responsavel: string
  resultado: string
  status: string
  observacoes?: string
  arquivo_url?: string
  created_at: string
  updated_at: string
}

interface Funcionario {
  id: string
  nome: string
  cargo: string
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Em Dia":
      return "default"
    case "Vencendo":
      return "secondary"
    case "Vencido":
      return "destructive"
    default:
      return "secondary"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Em Dia":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "Vencendo":
      return <Clock className="h-4 w-4 text-yellow-500" />
    case "Vencido":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const calculateExamStatus = (proximoExame: string): string => {
  const today = new Date()
  const nextExamDate = new Date(proximoExame)
  const diffTime = nextExamDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return "Vencido"
  if (diffDays <= 30) return "Vencendo"
  return "Em Dia"
}

export function OccupationalHealth() {
  const [exames, setExames] = useState<ExameAso[]>([])
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedExam, setSelectedExam] = useState<ExameAso | null>(null)
  const [showExamDetails, setShowExamDetails] = useState(false)
  const [showAsoDialog, setShowAsoDialog] = useState(false)
  const [showNewExamDialog, setShowNewExamDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<ExameAso | null>(null)
  const [uploading, setUploading] = useState(false)

  const [newExamData, setNewExamData] = useState({
    funcionario_id: "",
    tipo_exame: "",
    data_exame: "",
    medico_responsavel: "",
    observacoes: "",
  })

  const [asoData, setAsoData] = useState({
    funcionario_id: "",
    tipo_exame: "",
    data_exame: "",
    medico_responsavel: "",
    resultado: "apto",
    data_proximo_exame: "",
    observacoes: "",
    riscos_ocupacionais: "",
    arquivo_url: "",
  })

  const { selectedCompany } = useCompany()
  const supabase = createBrowserClient()

  useEffect(() => {
    if (selectedCompany) {
      loadExames()
      loadFuncionarios()
    }
  }, [selectedCompany])

  const loadExames = async () => {
    if (!selectedCompany) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("exames_aso")
        .select(`
          *,
          funcionarios!inner(nome, cargo)
        `)
        .eq("empresa_id", selectedCompany.id)
        .order("data_exame", { ascending: false })

      if (error) throw error

      const transformedExames: ExameAso[] = data.map((exam) => ({
        id: exam.id,
        funcionario_id: exam.funcionario_id,
        funcionario_nome: exam.funcionarios.nome,
        funcionario_cargo: exam.funcionarios.cargo,
        tipo_exame: exam.tipo_exame,
        data_exame: exam.data_exame,
        data_proximo_exame: exam.data_proximo_exame,
        medico_responsavel: exam.medico_responsavel,
        resultado: exam.resultado,
        status: calculateExamStatus(exam.data_proximo_exame),
        observacoes: exam.observacoes,
        arquivo_url: exam.arquivo_url,
        created_at: exam.created_at,
        updated_at: exam.updated_at,
      }))

      setExames(transformedExames)
    } catch (error) {
      console.error("Erro ao carregar exames:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadFuncionarios = async () => {
    if (!selectedCompany) return

    try {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("id, nome, cargo")
        .eq("empresa_id", selectedCompany.id)
        .eq("ativo", true)
        .order("nome")

      if (error) throw error
      setFuncionarios(data || [])
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error)
    }
  }

  const examStats = {
    total: exames.length,
    emDia: exames.filter((e) => e.status === "Em Dia").length,
    vencendo: exames.filter((e) => e.status === "Vencendo").length,
    vencidos: exames.filter((e) => e.status === "Vencido").length,
  }

  const asoStats = {
    pendentes: exames.filter((e) => !e.arquivo_url).length,
    emitidos: exames.filter((e) => e.arquivo_url).length,
  }

  const handleViewExam = (exam: ExameAso) => {
    setSelectedExam(exam)
    setShowExamDetails(true)
  }

  const handleGenerateAso = (exam?: ExameAso) => {
    if (exam) {
      setAsoData({
        funcionario_id: exam.funcionario_id,
        tipo_exame: exam.tipo_exame,
        data_exame: exam.data_exame,
        medico_responsavel: exam.medico_responsavel,
        resultado: exam.resultado || "apto",
        data_proximo_exame: exam.data_proximo_exame,
        observacoes: exam.observacoes || "",
        riscos_ocupacionais: "",
        arquivo_url: exam.arquivo_url || "",
      })
    }
    setSelectedEmployee(exam || null)
    setShowAsoDialog(true)
  }

  const handleCreateExam = async () => {
    if (!selectedCompany || !newExamData.funcionario_id || !newExamData.tipo_exame) return

    try {
      setLoading(true)

      // Calculate next exam date (1 year from exam date)
      const examDate = new Date(newExamData.data_exame)
      const nextExamDate = new Date(examDate)
      nextExamDate.setFullYear(nextExamDate.getFullYear() + 1)

      const { error } = await supabase.from("exames_aso").insert({
        empresa_id: selectedCompany.id,
        funcionario_id: newExamData.funcionario_id,
        tipo_exame: newExamData.tipo_exame,
        data_exame: newExamData.data_exame,
        data_proximo_exame: nextExamDate.toISOString().split("T")[0],
        medico_responsavel: newExamData.medico_responsavel,
        resultado: "Agendado",
        observacoes: newExamData.observacoes,
      })

      if (error) throw error

      // Reset form and reload data
      setNewExamData({
        funcionario_id: "",
        tipo_exame: "",
        data_exame: "",
        medico_responsavel: "",
        observacoes: "",
      })
      setShowNewExamDialog(false)
      await loadExames()
    } catch (error) {
      console.error("Erro ao criar exame:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAsoSubmit = async () => {
    if (!selectedCompany || !asoData.funcionario_id) return

    try {
      setUploading(true)

      // Update or create ASO record
      const { error } = await supabase.from("exames_aso").upsert({
        empresa_id: selectedCompany.id,
        funcionario_id: asoData.funcionario_id,
        tipo_exame: asoData.tipo_exame,
        data_exame: asoData.data_exame,
        data_proximo_exame: asoData.data_proximo_exame,
        medico_responsavel: asoData.medico_responsavel,
        resultado: asoData.resultado,
        observacoes: asoData.observacoes,
        arquivo_url: asoData.arquivo_url || undefined,
      })

      if (error) throw error

      setShowAsoDialog(false)
      setSelectedEmployee(null)
      await loadExames()
    } catch (error) {
      console.error("Erro ao gerar ASO:", error)
    } finally {
      setUploading(false)
    }
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Heart className="h-8 w-8" />
            <span>Saúde Ocupacional</span>
          </h1>
          <p className="text-muted-foreground">Gestão de exames médicos e ASO - NR-07 (PCMSO)</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione uma empresa para visualizar e gerenciar os exames médicos ocupacionais.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <Heart className="h-8 w-8" />
              <span>Saúde Ocupacional</span>
            </h1>
            <p className="text-muted-foreground">Carregando dados de saúde ocupacional - {selectedCompany.name}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
            <Heart className="h-8 w-8" />
            <span>Saúde Ocupacional</span>
          </h1>
          <p className="text-muted-foreground">
            Gestão de exames médicos e ASO - NR-07 (PCMSO) | {selectedCompany.name}
          </p>
        </div>
        <Dialog open={showNewExamDialog} onOpenChange={setShowNewExamDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agendar Exame
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agendar Novo Exame</DialogTitle>
              <DialogDescription>
                Cadastre um novo exame médico ocupacional para {selectedCompany.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Funcionário *</Label>
                  <Select
                    value={newExamData.funcionario_id}
                    onValueChange={(value) => setNewExamData((prev) => ({ ...prev, funcionario_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {funcionarios.map((funcionario) => (
                        <SelectItem key={funcionario.id} value={funcionario.id}>
                          {funcionario.nome} - {funcionario.cargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Exame *</Label>
                  <Select
                    value={newExamData.tipo_exame}
                    onValueChange={(value) => setNewExamData((prev) => ({ ...prev, tipo_exame: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admissional">Admissional</SelectItem>
                      <SelectItem value="Periódico">Periódico</SelectItem>
                      <SelectItem value="Retorno ao Trabalho">Retorno ao Trabalho</SelectItem>
                      <SelectItem value="Mudança de Função">Mudança de Função</SelectItem>
                      <SelectItem value="Demissional">Demissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data do Exame *</Label>
                  <Input
                    type="date"
                    value={newExamData.data_exame}
                    onChange={(e) => setNewExamData((prev) => ({ ...prev, data_exame: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Médico Responsável *</Label>
                  <Select
                    value={newExamData.medico_responsavel}
                    onValueChange={(value) => setNewExamData((prev) => ({ ...prev, medico_responsavel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o médico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dr. Carlos Santos">Dr. Carlos Santos</SelectItem>
                      <SelectItem value="Dra. Ana Costa">Dra. Ana Costa</SelectItem>
                      <SelectItem value="Dr. Roberto Lima">Dr. Roberto Lima</SelectItem>
                      <SelectItem value="Dra. Fernanda Silva">Dra. Fernanda Silva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações adicionais sobre o exame"
                  value={newExamData.observacoes}
                  onChange={(e) => setNewExamData((prev) => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowNewExamDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateExam} disabled={loading}>
                {loading ? "Agendando..." : "Agendar Exame"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="exames" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exames">Controle de Exames</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="asos">ASOs</TabsTrigger>
        </TabsList>

        <TabsContent value="exames" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{examStats.total}</div>
                <p className="text-xs text-muted-foreground">{selectedCompany.name}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Dia</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{examStats.emDia}</div>
                <p className="text-xs text-muted-foreground">
                  {examStats.total > 0 ? ((examStats.emDia / examStats.total) * 100).toFixed(1) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencendo (30 dias)</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{examStats.vencendo}</div>
                <p className="text-xs text-muted-foreground">
                  {examStats.total > 0 ? ((examStats.vencendo / examStats.total) * 100).toFixed(1) : 0}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{examStats.vencidos}</div>
                <p className="text-xs text-muted-foreground">
                  {examStats.total > 0 ? ((examStats.vencidos / examStats.total) * 100).toFixed(1) : 0}% do total
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Controle de Exames Médicos</CardTitle>
              <CardDescription>Lista de todos os exames médicos ocupacionais - {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                  <Input placeholder="Buscar funcionário..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="em-dia">Em Dia</SelectItem>
                      <SelectItem value="vencendo">Vencendo</SelectItem>
                      <SelectItem value="vencido">Vencido</SelectItem>
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
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Tipo de Exame</TableHead>
                    <TableHead>Data do Exame</TableHead>
                    <TableHead>Próximo Exame</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exames.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.funcionario_nome}</TableCell>
                      <TableCell>{exam.funcionario_cargo}</TableCell>
                      <TableCell>{exam.tipo_exame}</TableCell>
                      <TableCell>{format(new Date(exam.data_exame), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{format(new Date(exam.data_proximo_exame), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{exam.medico_responsavel}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(exam.status)}
                          <Badge variant={getStatusColor(exam.status) as any}>{exam.status}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewExam(exam)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateAso(exam)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Gerar ASO
                            </DropdownMenuItem>
                            {exam.arquivo_url && (
                              <DropdownMenuItem onClick={() => window.open(exam.arquivo_url, "_blank")}>
                                <Download className="h-4 w-4 mr-2" />
                                Baixar ASO
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {exames.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum exame cadastrado para {selectedCompany.name}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calendário de Exames</CardTitle>
              <CardDescription>Visualização mensal dos exames agendados - {selectedCompany.name}</CardDescription>
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
                  <h3 className="font-semibold">Próximos Exames</h3>
                  <div className="space-y-3">
                    {exames.slice(0, 5).map((exam) => (
                      <div key={exam.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {exam.funcionario_nome} - {exam.tipo_exame}
                            </p>
                            <p className="text-sm text-muted-foreground">{exam.medico_responsavel}</p>
                          </div>
                          <Badge variant={getStatusColor(exam.status) as any}>
                            {format(new Date(exam.data_proximo_exame), "dd/MM")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {exames.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        Nenhum exame agendado para {selectedCompany.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="asos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Atestados de Saúde Ocupacional (ASO)</CardTitle>
              <CardDescription>Gestão e emissão de ASOs - {selectedCompany.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">Gerar ASO</CardTitle>
                    <CardDescription>Emitir novo atestado de saúde ocupacional</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" onClick={() => handleGenerateAso()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo ASO
                    </Button>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">ASOs Pendentes</CardTitle>
                    <CardDescription>Atestados aguardando emissão</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{asoStats.pendentes}</div>
                    <p className="text-sm text-muted-foreground">Sem arquivo anexado</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">ASOs Emitidos</CardTitle>
                    <CardDescription>Total de atestados com arquivo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{asoStats.emitidos}</div>
                    <p className="text-sm text-muted-foreground">Com arquivo anexado</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showExamDetails} onOpenChange={setShowExamDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Exame Médico</DialogTitle>
            <DialogDescription>Informações completas do exame ocupacional</DialogDescription>
          </DialogHeader>
          {selectedExam && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Funcionário</Label>
                  <p className="font-medium">{selectedExam.funcionario_nome}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Cargo</Label>
                  <p>{selectedExam.funcionario_cargo}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Exame</Label>
                  <p>{selectedExam.tipo_exame}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedExam.status)}
                    <Badge variant={getStatusColor(selectedExam.status) as any}>{selectedExam.status}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Data do Exame</Label>
                  <p>{format(new Date(selectedExam.data_exame), "dd/MM/yyyy")}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Próximo Exame</Label>
                  <p>{format(new Date(selectedExam.data_proximo_exame), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Médico Responsável</Label>
                  <p>{selectedExam.medico_responsavel}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Resultado</Label>
                  <p>{selectedExam.resultado}</p>
                </div>
              </div>
              {selectedExam.observacoes && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Observações</Label>
                  <p className="text-sm">{selectedExam.observacoes}</p>
                </div>
              )}
              {selectedExam.arquivo_url && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">ASO</Label>
                  <Button variant="outline" size="sm" onClick={() => window.open(selectedExam.arquivo_url, "_blank")}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar ASO
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowExamDetails(false)}>
              Fechar
            </Button>
            <Button onClick={() => handleGenerateAso(selectedExam!)}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar ASO
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAsoDialog} onOpenChange={setShowAsoDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Gerar Atestado de Saúde Ocupacional (ASO)</DialogTitle>
            <DialogDescription>
              Preencha os dados para emissão do ASO
              {selectedEmployee && ` para ${selectedEmployee.funcionario_nome}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Funcionário *</Label>
                <Select
                  value={asoData.funcionario_id}
                  onValueChange={(value) => setAsoData((prev) => ({ ...prev, funcionario_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {funcionarios.map((funcionario) => (
                      <SelectItem key={funcionario.id} value={funcionario.id}>
                        {funcionario.nome} - {funcionario.cargo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de ASO *</Label>
                <Select
                  value={asoData.tipo_exame}
                  onValueChange={(value) => setAsoData((prev) => ({ ...prev, tipo_exame: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admissional">Admissional</SelectItem>
                    <SelectItem value="Periódico">Periódico</SelectItem>
                    <SelectItem value="Retorno ao Trabalho">Retorno ao Trabalho</SelectItem>
                    <SelectItem value="Mudança de Função">Mudança de Função</SelectItem>
                    <SelectItem value="Demissional">Demissional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data do Exame *</Label>
                <Input
                  type="date"
                  value={asoData.data_exame}
                  onChange={(e) => setAsoData((prev) => ({ ...prev, data_exame: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Médico Responsável *</Label>
                <Select
                  value={asoData.medico_responsavel}
                  onValueChange={(value) => setAsoData((prev) => ({ ...prev, medico_responsavel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o médico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dr. Carlos Santos">Dr. Carlos Santos</SelectItem>
                    <SelectItem value="Dra. Ana Costa">Dra. Ana Costa</SelectItem>
                    <SelectItem value="Dr. Roberto Lima">Dr. Roberto Lima</SelectItem>
                    <SelectItem value="Dra. Fernanda Silva">Dra. Fernanda Silva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resultado do Exame *</Label>
                <Select
                  value={asoData.resultado}
                  onValueChange={(value) => setAsoData((prev) => ({ ...prev, resultado: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Apto">Apto</SelectItem>
                    <SelectItem value="Apto com Restrições">Apto com Restrições</SelectItem>
                    <SelectItem value="Inapto">Inapto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Próximo Exame</Label>
                <Input
                  type="date"
                  value={asoData.data_proximo_exame}
                  onChange={(e) => setAsoData((prev) => ({ ...prev, data_proximo_exame: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações Médicas</Label>
              <Textarea
                placeholder="Observações sobre o estado de saúde do funcionário, restrições ou recomendações..."
                rows={3}
                value={asoData.observacoes}
                onChange={(e) => setAsoData((prev) => ({ ...prev, observacoes: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Riscos Ocupacionais Identificados</Label>
              <Textarea
                placeholder="Liste os riscos ocupacionais aos quais o funcionário está exposto..."
                rows={2}
                value={asoData.riscos_ocupacionais}
                onChange={(e) => setAsoData((prev) => ({ ...prev, riscos_ocupacionais: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload do ASO (PDF)</Label>
              <FileUpload
                type="aso"
                accept=".pdf"
                maxSizeMB={10} // 10MB
                onUploadComplete={(url, path) => {
                  // Set the uploaded file URL to be used when saving the ASO
                  setAsoData(prev => ({ ...prev, arquivo_url: url }))
                }}
                onUploadError={(error) => {
                  console.error('Erro no upload:', error)
                }}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAsoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAsoSubmit} disabled={uploading}>
              {uploading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Salvar ASO
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Export default para compatibilidade com importações dinâmicas
export default OccupationalHealth
