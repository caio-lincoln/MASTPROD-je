"use client"

import { useState } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Plus, Search, Filter, FileText, Edit, Eye, UserCheck, AlertTriangle, Building2 } from "lucide-react"
import { useCompany } from "@/contexts/company-context"
import { useCompanyData } from "@/hooks/use-company-data"

interface Employee {
  id: string
  companyId: string
  nome: string
  cpf: string
  cargo: string
  setor: string
  admissao: string
  status: string
  exameMedico: string
  treinamentos: string
  avatar?: string
}

const allEmployeeData: Employee[] = [
  // Empresa Alpha Ltda (ID: 1)
  {
    id: "1",
    companyId: "1",
    nome: "João Silva",
    cpf: "123.456.789-00",
    cargo: "Operador de Máquina",
    setor: "Produção",
    admissao: "2023-01-15",
    status: "Ativo",
    exameMedico: "Em Dia",
    treinamentos: "Completo",
    avatar: "/avatars/01.png",
  },
  {
    id: "2",
    companyId: "1",
    nome: "Maria Santos",
    cpf: "987.654.321-00",
    cargo: "Soldadora",
    setor: "Produção",
    admissao: "2022-03-20",
    status: "Ativo",
    exameMedico: "Vencendo",
    treinamentos: "Pendente",
    avatar: "/avatars/02.png",
  },
  {
    id: "3",
    companyId: "1",
    nome: "Pedro Oliveira",
    cpf: "456.789.123-00",
    cargo: "Mecânico",
    setor: "Manutenção",
    admissao: "2023-06-10",
    status: "Ativo",
    exameMedico: "Em Dia",
    treinamentos: "Completo",
    avatar: "/avatars/03.png",
  },
  // Empresa Beta Indústria (ID: 2)
  {
    id: "4",
    companyId: "2",
    nome: "Ana Costa",
    cpf: "789.123.456-00",
    cargo: "Supervisora",
    setor: "Qualidade",
    admissao: "2021-11-05",
    status: "Ativo",
    exameMedico: "Em Dia",
    treinamentos: "Completo",
    avatar: "/avatars/04.png",
  },
  {
    id: "5",
    companyId: "2",
    nome: "Carlos Ferreira",
    cpf: "321.654.987-00",
    cargo: "Técnico de Segurança",
    setor: "SST",
    admissao: "2022-08-12",
    status: "Ativo",
    exameMedico: "Em Dia",
    treinamentos: "Completo",
    avatar: "/avatars/05.png",
  },
  // Empresa Gamma Serviços (ID: 3)
  {
    id: "6",
    companyId: "3",
    nome: "Lucia Mendes",
    cpf: "654.321.789-00",
    cargo: "Operadora",
    setor: "Produção",
    admissao: "2023-02-28",
    status: "Ativo",
    exameMedico: "Vencendo",
    treinamentos: "Pendente",
    avatar: "/avatars/06.png",
  },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case "Ativo":
      return "default"
    case "Inativo":
      return "secondary"
    case "Afastado":
      return "destructive"
    default:
      return "secondary"
  }
}

const getExamStatusColor = (status: string) => {
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

const getTrainingStatusColor = (status: string) => {
  switch (status) {
    case "Completo":
      return "default"
    case "Pendente":
      return "secondary"
    case "Vencido":
      return "destructive"
    default:
      return "secondary"
  }
}

export function Employees() {
  const { selectedCompany } = useCompany()
  const employeeData = useCompanyData(allEmployeeData)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const stats = {
    total: employeeData.length,
    ativos: employeeData.filter((e) => e.status === "Ativo").length,
    examesPendentes: employeeData.filter((e) => e.exameMedico === "Vencendo" || e.exameMedico === "Vencido").length,
    treinamentosPendentes: employeeData.filter((e) => e.treinamentos === "Pendente" || e.treinamentos === "Vencido")
      .length,
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
            <Users className="h-8 w-8" />
            <span>Funcionários</span>
          </h1>
          <p className="text-muted-foreground">Gestão completa de funcionários e informações SST</p>
        </div>

        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            Selecione uma empresa na barra superior para visualizar e gerenciar os funcionários.
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
            <Users className="h-8 w-8" />
            <span>Funcionários</span>
          </h1>
          <p className="text-muted-foreground">
            Gestão completa de funcionários e informações SST - {selectedCompany.name}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Funcionário</DialogTitle>
              <DialogDescription>Adicione um novo funcionário ao sistema com informações SST</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input placeholder="Digite o nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input placeholder="000.000.000-00" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador">Operador de Máquina</SelectItem>
                      <SelectItem value="soldador">Soldador</SelectItem>
                      <SelectItem value="mecanico">Mecânico</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="qualidade">Qualidade</SelectItem>
                      <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admissao">Data de Admissão</Label>
                  <Input type="date" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input type="email" placeholder="funcionario@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input placeholder="(11) 99999-9999" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço Completo</Label>
                <Input placeholder="Rua, número, bairro, cidade - CEP" />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline">Cancelar</Button>
              <Button>Cadastrar Funcionário</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de Funcionários</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          {/* Filtros e Busca */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nome, CPF ou cargo..." className="pl-10" />
                  </div>
                </div>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="qualidade">Qualidade</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="afastado">Afastado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Funcionários */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Funcionários</CardTitle>
              <CardDescription>Informações completas dos funcionários e status SST</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Cargo/Setor</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Exame Médico</TableHead>
                    <TableHead>Treinamentos</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeData.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={employee.avatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {employee.nome
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{employee.nome}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.cpf}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{employee.cargo}</p>
                          <p className="text-sm text-muted-foreground">{employee.setor}</p>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(employee.admissao).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(employee.status) as any}>{employee.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getExamStatusColor(employee.exameMedico) as any}>{employee.exameMedico}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTrainingStatusColor(employee.treinamentos) as any}>
                          {employee.treinamentos}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(employee)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">+5.2% vs mês anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.ativos}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.ativos / stats.total) * 100).toFixed(1)}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exames Pendentes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.examesPendentes}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.examesPendentes / stats.total) * 100).toFixed(1)}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Treinamentos Pendentes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.treinamentosPendentes}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.treinamentosPendentes / stats.total) * 100).toFixed(1)}% do total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos e Estatísticas */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Setor</CardTitle>
                <CardDescription>Número de funcionários por área</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Produção</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: "65%" }}></div>
                      </div>
                      <span className="text-sm font-medium">812</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Manutenção</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: "20%" }}></div>
                      </div>
                      <span className="text-sm font-medium">249</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Qualidade</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "10%" }}></div>
                      </div>
                      <span className="text-sm font-medium">124</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Administrativo</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: "5%" }}></div>
                      </div>
                      <span className="text-sm font-medium">62</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status de Conformidade SST</CardTitle>
                <CardDescription>Situação geral dos funcionários</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <UserCheck className="h-5 w-5 text-green-500" />
                      <span>Conformes</span>
                    </div>
                    <span className="font-bold text-green-600">1,000</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span>Atenção</span>
                    </div>
                    <span className="font-bold text-yellow-600">198</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span>Não Conformes</span>
                    </div>
                    <span className="font-bold text-red-600">49</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Relatório Geral</CardTitle>
                <CardDescription>Lista completa de funcionários com dados SST</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Gerar Relatório</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Exames Vencidos</CardTitle>
                <CardDescription>Funcionários com exames médicos vencidos</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline">
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Treinamentos Pendentes</CardTitle>
                <CardDescription>Funcionários com treinamentos em atraso</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline">
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Funcionário */}
      {selectedEmployee && (
        <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Funcionário</DialogTitle>
              <DialogDescription>Informações completas e histórico SST</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedEmployee.avatar || "/placeholder.svg"} />
                  <AvatarFallback>
                    {selectedEmployee.nome
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedEmployee.nome}</h3>
                  <p className="text-muted-foreground">
                    {selectedEmployee.cargo} - {selectedEmployee.setor}
                  </p>
                  <p className="text-sm text-muted-foreground">CPF: {selectedEmployee.cpf}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data de Admissão:</span>
                      <span>{new Date(selectedEmployee.admissao).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedEmployee.status) as any}>{selectedEmployee.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">E-mail:</span>
                      <span>joao.silva@empresa.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span>(11) 99999-9999</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status SST</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exame Médico:</span>
                      <Badge variant={getExamStatusColor(selectedEmployee.exameMedico) as any}>
                        {selectedEmployee.exameMedico}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Treinamentos:</span>
                      <Badge variant={getTrainingStatusColor(selectedEmployee.treinamentos) as any}>
                        {selectedEmployee.treinamentos}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último ASO:</span>
                      <span>15/11/2024</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Próximo Exame:</span>
                      <span>15/11/2025</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
