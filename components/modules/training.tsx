"use client"

import { useState } from "react"
import { useCompany } from "@/contexts/company-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  GraduationCap,
  Plus,
  CalendarIcon,
  FileText,
  Users,
  Clock,
  CheckCircle,
  Download,
  BookOpen,
  Award,
  AlertCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const trainingDataByCompany = {
  "1": [
    {
      id: 1,
      nome: "NR-35 - Trabalho em Altura",
      categoria: "Norma Regulamentadora",
      cargaHoraria: 8,
      validade: 24,
      instrutor: "João Santos",
      status: "Ativo",
      participantes: 45,
      concluidos: 38,
      pendentes: 7,
      proximaTurma: "2025-01-15",
      companyId: "1",
      descricao: "Treinamento obrigatório para trabalhos realizados acima de 2 metros de altura, conforme NR-35.",
    },
    {
      id: 2,
      nome: "NR-10 - Segurança em Instalações Elétricas",
      categoria: "Norma Regulamentadora",
      cargaHoraria: 40,
      validade: 24,
      instrutor: "Maria Silva",
      status: "Ativo",
      participantes: 23,
      concluidos: 23,
      pendentes: 0,
      proximaTurma: "2025-02-10",
      companyId: "1",
      descricao: "Capacitação em segurança para trabalhos com instalações elétricas energizadas.",
    },
  ],
  "2": [
    {
      id: 3,
      nome: "Primeiros Socorros",
      categoria: "Capacitação Geral",
      cargaHoraria: 16,
      validade: 12,
      instrutor: "Dr. Carlos Lima",
      status: "Planejado",
      participantes: 0,
      concluidos: 0,
      pendentes: 30,
      proximaTurma: "2025-01-20",
      companyId: "2",
      descricao: "Treinamento básico de primeiros socorros para situações de emergência.",
    },
    {
      id: 4,
      nome: "NR-33 - Espaços Confinados",
      categoria: "Norma Regulamentadora",
      cargaHoraria: 16,
      validade: 12,
      instrutor: "Roberto Costa",
      status: "Ativo",
      participantes: 18,
      concluidos: 12,
      pendentes: 6,
      proximaTurma: "2025-01-25",
      companyId: "2",
      descricao: "Capacitação para trabalhos em espaços confinados com atmosfera controlada.",
    },
  ],
  "3": [
    {
      id: 5,
      nome: "NR-12 - Segurança em Máquinas",
      categoria: "Norma Regulamentadora",
      cargaHoraria: 8,
      validade: 24,
      instrutor: "Ana Ferreira",
      status: "Ativo",
      participantes: 32,
      concluidos: 28,
      pendentes: 4,
      proximaTurma: "2025-02-05",
      companyId: "3",
      descricao: "Treinamento sobre segurança na operação de máquinas e equipamentos.",
    },
  ],
}

const participantDataByCompany = {
  "1": [
    {
      id: 1,
      nome: "Pedro Oliveira",
      cargo: "Eletricista",
      treinamento: "NR-10",
      dataInicio: "2024-11-01",
      dataConclusao: "2024-11-05",
      status: "Concluído",
      nota: 8.5,
      certificado: true,
      companyId: "1",
    },
    {
      id: 2,
      nome: "Ana Costa",
      cargo: "Técnica de Segurança",
      treinamento: "NR-35",
      dataInicio: "2024-12-01",
      dataConclusao: null,
      status: "Em Andamento",
      nota: null,
      certificado: false,
      companyId: "1",
    },
  ],
  "2": [
    {
      id: 3,
      nome: "Carlos Santos",
      cargo: "Soldador",
      treinamento: "NR-33",
      dataInicio: null,
      dataConclusao: null,
      status: "Pendente",
      nota: null,
      certificado: false,
      companyId: "2",
    },
  ],
  "3": [
    {
      id: 4,
      nome: "Lucia Mendes",
      cargo: "Operadora de Máquinas",
      treinamento: "NR-12",
      dataInicio: "2024-12-10",
      dataConclusao: "2024-12-12",
      status: "Concluído",
      nota: 9.2,
      certificado: true,
      companyId: "3",
    },
  ],
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Ativo":
      return "default"
    case "Concluído":
      return "default"
    case "Em Andamento":
      return "secondary"
    case "Pendente":
      return "destructive"
    case "Planejado":
      return "outline"
    default:
      return "secondary"
  }
}

export function Training() {
  const { selectedCompany } = useCompany()
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedTraining, setSelectedTraining] = useState<any>(null)

  const [isNewTrainingOpen, setIsNewTrainingOpen] = useState(false)
  const [isEditTrainingOpen, setIsEditTrainingOpen] = useState(false)
  const [isViewTrainingOpen, setIsViewTrainingOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTraining, setEditingTraining] = useState<any>(null)
  const [deletingTraining, setDeletingTraining] = useState<any>(null)

  const [formData, setFormData] = useState({
    nome: "",
    categoria: "",
    cargaHoraria: "",
    validade: "",
    instrutor: "",
    descricao: "",
    proximaTurma: null as Date | null,
  })

  const trainingData = selectedCompany ? trainingDataByCompany[selectedCompany.id] || [] : []
  const participantData = selectedCompany ? participantDataByCompany[selectedCompany.id] || [] : []

  const stats = {
    totalTreinamentos: trainingData.length,
    totalParticipantes: trainingData.reduce((acc, t) => acc + t.participantes, 0),
    totalConcluidos: trainingData.reduce((acc, t) => acc + t.concluidos, 0),
    totalPendentes: trainingData.reduce((acc, t) => acc + t.pendentes, 0),
  }

  const handleNewTraining = () => {
    setFormData({
      nome: "",
      categoria: "",
      cargaHoraria: "",
      validade: "",
      instrutor: "",
      descricao: "",
      proximaTurma: null,
    })
    setIsNewTrainingOpen(true)
  }

  const handleEditTraining = (training: any) => {
    setEditingTraining(training)
    setFormData({
      nome: training.nome,
      categoria: training.categoria,
      cargaHoraria: training.cargaHoraria.toString(),
      validade: training.validade.toString(),
      instrutor: training.instrutor,
      descricao: training.descricao || "",
      proximaTurma: new Date(training.proximaTurma),
    })
    setIsEditTrainingOpen(true)
  }

  const handleViewTraining = (training: any) => {
    setSelectedTraining(training)
    setIsViewTrainingOpen(true)
  }

  const handleDeleteTraining = (training: any) => {
    setDeletingTraining(training)
    setIsDeleteDialogOpen(true)
  }

  const handleSaveTraining = () => {
    // Validate required fields
    if (!formData.nome || !formData.categoria || !formData.cargaHoraria || !formData.validade || !formData.instrutor) {
      alert("Por favor, preencha todos os campos obrigatórios.")
      return
    }

    console.log("[v0] Saving training:", formData)

    if (editingTraining) {
      // Update existing training
      console.log("[v0] Updating training:", editingTraining.id)
      setIsEditTrainingOpen(false)
      setEditingTraining(null)
    } else {
      // Create new training
      console.log("[v0] Creating new training")
      setIsNewTrainingOpen(false)
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

  const confirmDelete = () => {
    if (deletingTraining) {
      console.log("[v0] Deleting training:", deletingTraining.id)
      // Here you would delete from the actual data source
      setIsDeleteDialogOpen(false)
      setDeletingTraining(null)
    }
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
              <GraduationCap className="h-8 w-8" />
              <span>Treinamentos</span>
            </h1>
            <p className="text-muted-foreground">Gestão de treinamentos e certificações digitais</p>
          </div>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <GraduationCap className="h-8 w-8" />
            <span>Treinamentos</span>
          </h1>
          <p className="text-muted-foreground">
            Gestão de treinamentos e certificações digitais - {selectedCompany.name}
          </p>
        </div>
        <Button onClick={handleNewTraining}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Treinamento
        </Button>
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
              {trainingData.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum treinamento encontrado</h3>
                  <p className="text-muted-foreground">Não há treinamentos cadastrados para {selectedCompany.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trainingData.map((training) => (
                    <div key={training.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{training.nome}</h3>
                          <p className="text-sm text-muted-foreground">{training.categoria}</p>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                            <span>⏱️ {training.cargaHoraria}h</span>
                            <span>📅 Validade: {training.validade} meses</span>
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
                            <span>{Math.round((training.concluidos / training.participantes) * 100) || 0}%</span>
                          </div>
                          <Progress
                            value={
                              training.participantes > 0 ? (training.concluidos / training.participantes) * 100 : 0
                            }
                            className="h-2"
                          />
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Participantes</p>
                            <p className="font-medium">{training.participantes}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Concluídos</p>
                            <p className="font-medium text-green-600">{training.concluidos}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pendentes</p>
                            <p className="font-medium text-yellow-600">{training.pendentes}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Próxima Turma</p>
                            <p className="font-medium">{format(new Date(training.proximaTurma), "dd/MM/yyyy")}</p>
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
                  {participantData.length === 0 ? (
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
                    participantData.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">{participant.nome}</TableCell>
                        <TableCell>{participant.cargo}</TableCell>
                        <TableCell>{participant.treinamento}</TableCell>
                        <TableCell>
                          {participant.dataInicio ? format(new Date(participant.dataInicio), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          {participant.dataConclusao ? format(new Date(participant.dataConclusao), "dd/MM/yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(participant.status) as any}>{participant.status}</Badge>
                        </TableCell>
                        <TableCell>{participant.nota || "-"}</TableCell>
                        <TableCell>
                          {participant.certificado ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {participant.certificado && (
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
                    <div className="text-2xl font-bold text-blue-600">156</div>
                    <p className="text-sm text-muted-foreground">Este Mês</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {trainingData.map((training) => (
                    <div key={training.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{training.nome}</p>
                        <p className="text-sm text-muted-foreground">{training.concluidos} certificados emitidos</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Baixar Lote
                      </Button>
                    </div>
                  ))}
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
                    {trainingData.map((training) => (
                      <div key={training.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{training.nome}</p>
                            <p className="text-sm text-muted-foreground">
                              {training.instrutor} • {training.cargaHoraria}h
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {training.participantes} participantes inscritos
                            </p>
                          </div>
                          <Badge variant={training.status === "Planejado" ? "outline" : undefined}>
                            {format(new Date(training.proximaTurma), "dd/MM")}
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

      <Dialog open={isNewTrainingOpen} onOpenChange={setIsNewTrainingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Treinamento</DialogTitle>
            <DialogDescription>Configure um novo programa de treinamento para {selectedCompany.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
                    selected={formData.proximaTurma}
                    onSelect={(date) => setFormData({ ...formData, proximaTurma: date })}
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
            <Button onClick={handleSaveTraining}>Criar Treinamento</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditTrainingOpen} onOpenChange={setIsEditTrainingOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Treinamento</DialogTitle>
            <DialogDescription>Edite as informações do treinamento para {selectedCompany.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
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
                    selected={formData.proximaTurma}
                    onSelect={(date) => setFormData({ ...formData, proximaTurma: date })}
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedTraining?.nome}</DialogTitle>
            <DialogDescription>Detalhes completos do treinamento</DialogDescription>
          </DialogHeader>
          {selectedTraining && (
            <div className="grid gap-6 py-4">
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
                      <span>{selectedTraining.cargaHoraria}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validade:</span>
                      <span>{selectedTraining.validade} meses</span>
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
                      <span className="font-medium">{selectedTraining.participantes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Concluídos:</span>
                      <span className="font-medium text-green-600">{selectedTraining.concluidos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pendentes:</span>
                      <span className="font-medium text-yellow-600">{selectedTraining.pendentes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de Aprovação:</span>
                      <span className="font-medium">
                        {selectedTraining.participantes > 0
                          ? Math.round((selectedTraining.concluidos / selectedTraining.participantes) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Próxima Turma:</span>
                      <span className="font-medium">
                        {format(new Date(selectedTraining.proximaTurma), "dd/MM/yyyy")}
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

export { Training as TrainingComponent }
export default Training
