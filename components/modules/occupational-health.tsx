"use client"

import { useState } from "react"
import { useCompany } from "@/contexts/company-context"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
  Heart,
  Plus,
  CalendarIcon,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Download,
  Edit,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const examDataByCompany = {
  "1": [
    {
      id: 1,
      funcionario: "João Silva",
      cargo: "Operador",
      tipoExame: "Periódico",
      dataExame: "2024-11-15",
      proximoExame: "2025-11-15",
      status: "Em Dia",
      medico: "Dr. Carlos Santos",
    },
    {
      id: 2,
      funcionario: "Maria Santos",
      cargo: "Soldadora",
      tipoExame: "Periódico",
      dataExame: "2024-10-20",
      proximoExame: "2025-04-20",
      status: "Vencendo",
      medico: "Dra. Ana Costa",
    },
  ],
  "2": [
    {
      id: 3,
      funcionario: "Pedro Oliveira",
      cargo: "Mecânico",
      tipoExame: "Admissional",
      dataExame: "2024-12-01",
      proximoExame: "2025-12-01",
      status: "Em Dia",
      medico: "Dr. Carlos Santos",
    },
    {
      id: 4,
      funcionario: "Ana Costa",
      cargo: "Técnica",
      tipoExame: "Periódico",
      dataExame: "2024-09-15",
      proximoExame: "2025-03-15",
      status: "Vencendo",
      medico: "Dr. Roberto Lima",
    },
  ],
  "3": [
    {
      id: 5,
      funcionario: "Carlos Lima",
      cargo: "Químico",
      tipoExame: "Periódico",
      dataExame: "2024-11-01",
      proximoExame: "2025-05-01",
      status: "Em Dia",
      medico: "Dra. Fernanda Silva",
    },
  ],
}

const asoDataByCompany = {
  "1": { pendentes: 8, emitidos: 45 },
  "2": { pendentes: 12, emitidos: 89 },
  "3": { pendentes: 3, emitidos: 23 },
}

const medicalHistoryByCompany = {
  "1": [
    {
      funcionario: "João Silva",
      cargo: "Operador de Máquina",
      historico: [
        { tipo: "Admissional", data: "15/01/2023", medico: "Dr. Carlos Santos", resultado: "Apto" },
        { tipo: "Periódico", data: "15/01/2024", medico: "Dr. Carlos Santos", resultado: "Apto" },
        { tipo: "Periódico", data: "15/11/2024", medico: "Dr. Carlos Santos", resultado: "Apto" },
      ],
    },
  ],
  "2": [
    {
      funcionario: "Pedro Oliveira",
      cargo: "Mecânico Industrial",
      historico: [
        { tipo: "Admissional", data: "10/03/2023", medico: "Dr. Roberto Lima", resultado: "Apto" },
        { tipo: "Periódico", data: "10/09/2024", medico: "Dr. Roberto Lima", resultado: "Apto" },
      ],
    },
  ],
  "3": [
    {
      funcionario: "Carlos Lima",
      cargo: "Químico Analista",
      historico: [
        { tipo: "Admissional", data: "05/06/2023", medico: "Dra. Fernanda Silva", resultado: "Apto" },
        { tipo: "Periódico", data: "05/12/2024", medico: "Dra. Fernanda Silva", resultado: "Apto" },
      ],
    },
  ],
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

export function OccupationalHealth() {
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [showExamDetails, setShowExamDetails] = useState(false)
  const [showAsoDialog, setShowAsoDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const { selectedCompany } = useCompany()

  const companyExams = selectedCompany ? examDataByCompany[selectedCompany.id] || [] : []
  const companyAsos = selectedCompany
    ? asoDataByCompany[selectedCompany.id] || { pendentes: 0, emitidos: 0 }
    : { pendentes: 0, emitidos: 0 }
  const companyMedicalHistory = selectedCompany ? medicalHistoryByCompany[selectedCompany.id] || [] : []

  const examStats = {
    total: companyExams.length,
    emDia: companyExams.filter((e) => e.status === "Em Dia").length,
    vencendo: companyExams.filter((e) => e.status === "Vencendo").length,
    vencidos: companyExams.filter((e) => e.status === "Vencido").length,
  }

  const handleViewExam = (exam: any) => {
    setSelectedExam(exam)
    setShowExamDetails(true)
  }

  const handleGenerateAso = (employee?: any) => {
    setSelectedEmployee(employee)
    setShowAsoDialog(true)
  }

  const handleAsoSubmit = () => {
    console.log("[v0] Generating ASO for:", selectedEmployee)
    setShowAsoDialog(false)
    setSelectedEmployee(null)
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
        <Dialog>
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
                  <Label>Funcionário</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyExams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.funcionario.toLowerCase()}>
                          {exam.funcionario}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Exame</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admissional">Admissional</SelectItem>
                      <SelectItem value="periodico">Periódico</SelectItem>
                      <SelectItem value="retorno">Retorno ao Trabalho</SelectItem>
                      <SelectItem value="mudanca">Mudança de Função</SelectItem>
                      <SelectItem value="demissional">Demissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data do Exame</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Médico Responsável</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o médico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carlos">Dr. Carlos Santos</SelectItem>
                      <SelectItem value="ana">Dra. Ana Costa</SelectItem>
                      <SelectItem value="roberto">Dr. Roberto Lima</SelectItem>
                      <SelectItem value="fernanda">Dra. Fernanda Silva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Input placeholder="Observações adicionais sobre o exame" />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Agendar Exame</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="exames" className="space-y-4">
        <TabsList>
          <TabsTrigger value="exames">Controle de Exames</TabsTrigger>
          <TabsTrigger value="calendario">Calendário</TabsTrigger>
          <TabsTrigger value="asos">ASOs</TabsTrigger>
          <TabsTrigger value="historico">Histórico Médico</TabsTrigger>
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
                  {companyExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.funcionario}</TableCell>
                      <TableCell>{exam.cargo}</TableCell>
                      <TableCell>{exam.tipoExame}</TableCell>
                      <TableCell>{format(new Date(exam.dataExame), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{format(new Date(exam.proximoExame), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{exam.medico}</TableCell>
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
                            <DropdownMenuItem>
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Reagendar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {companyExams.length === 0 && (
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
                  <h3 className="font-semibold">Exames Agendados</h3>
                  <div className="space-y-3">
                    {companyExams.slice(0, 3).map((exam, index) => (
                      <div key={exam.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {exam.funcionario} - {exam.tipoExame}
                            </p>
                            <p className="text-sm text-muted-foreground">{exam.medico}</p>
                          </div>
                          <Badge variant={index === 0 ? "default" : "outline"}>
                            {index === 0 ? "Hoje" : index === 1 ? "Amanhã" : format(new Date(exam.dataExame), "dd/MM")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {companyExams.length === 0 && (
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
                    <div className="text-2xl font-bold text-yellow-600">{companyAsos.pendentes}</div>
                    <p className="text-sm text-muted-foreground">Pendentes de assinatura</p>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">ASOs Emitidos</CardTitle>
                    <CardDescription>Total de atestados no mês</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{companyAsos.emitidos}</div>
                    <p className="text-sm text-muted-foreground">Este mês</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Médico dos Funcionários</CardTitle>
              <CardDescription>
                Registro completo do histórico de saúde ocupacional - {selectedCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input placeholder="Buscar funcionário..." className="flex-1" />
                  <Button variant="outline">Buscar</Button>
                </div>

                {companyMedicalHistory.map((employee, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">
                      {employee.funcionario} - {employee.cargo}
                    </h4>
                    <div className="space-y-3">
                      {employee.historico.map((record, recordIndex) => (
                        <div key={recordIndex} className="flex justify-between items-center p-2 bg-muted rounded">
                          <div>
                            <p className="font-medium">{record.tipo}</p>
                            <p className="text-sm text-muted-foreground">
                              {record.data} - {record.medico}
                            </p>
                          </div>
                          <Badge variant={record.resultado === "Apto" ? "default" : "destructive"}>
                            {record.resultado}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {companyMedicalHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum histórico médico encontrado para {selectedCompany.name}
                  </div>
                )}
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
                  <p className="font-medium">{selectedExam.funcionario}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Cargo</Label>
                  <p>{selectedExam.cargo}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Tipo de Exame</Label>
                  <p>{selectedExam.tipoExame}</p>
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
                  <p>{format(new Date(selectedExam.dataExame), "dd/MM/yyyy")}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Próximo Exame</Label>
                  <p>{format(new Date(selectedExam.proximoExame), "dd/MM/yyyy")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Médico Responsável</Label>
                  <p>{selectedExam.medico}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowExamDetails(false)}>
              Fechar
            </Button>
            <Button onClick={() => handleGenerateAso(selectedExam)}>
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
              {selectedEmployee && ` para ${selectedEmployee.funcionario}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Funcionário *</Label>
                <Select defaultValue={selectedEmployee?.funcionario?.toLowerCase()}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o funcionário" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyExams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.funcionario.toLowerCase()}>
                        {exam.funcionario}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de ASO *</Label>
                <Select defaultValue={selectedEmployee?.tipoExame?.toLowerCase()}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admissional">Admissional</SelectItem>
                    <SelectItem value="periodico">Periódico</SelectItem>
                    <SelectItem value="retorno">Retorno ao Trabalho</SelectItem>
                    <SelectItem value="mudanca">Mudança de Função</SelectItem>
                    <SelectItem value="demissional">Demissional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data do Exame *</Label>
                <Input type="date" defaultValue={selectedEmployee?.dataExame || format(new Date(), "yyyy-MM-dd")} />
              </div>
              <div className="space-y-2">
                <Label>Médico Responsável *</Label>
                <Select defaultValue={selectedEmployee?.medico?.toLowerCase().replace(/\s+/g, "-")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o médico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr-carlos-santos">Dr. Carlos Santos</SelectItem>
                    <SelectItem value="dra-ana-costa">Dra. Ana Costa</SelectItem>
                    <SelectItem value="dr-roberto-lima">Dr. Roberto Lima</SelectItem>
                    <SelectItem value="dra-fernanda-silva">Dra. Fernanda Silva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resultado do Exame *</Label>
                <Select defaultValue="apto">
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apto">Apto</SelectItem>
                    <SelectItem value="apto-com-restricoes">Apto com Restrições</SelectItem>
                    <SelectItem value="inapto">Inapto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Próximo Exame</Label>
                <Input
                  type="date"
                  defaultValue={
                    selectedEmployee?.proximoExame ||
                    format(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações Médicas</Label>
              <Textarea
                placeholder="Observações sobre o estado de saúde do funcionário, restrições ou recomendações..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Riscos Ocupacionais Identificados</Label>
              <Textarea placeholder="Liste os riscos ocupacionais aos quais o funcionário está exposto..." rows={2} />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowAsoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAsoSubmit}>
              <Download className="h-4 w-4 mr-2" />
              Gerar e Baixar ASO
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
