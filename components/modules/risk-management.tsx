"use client"

import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Plus, Edit, Eye, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"

const riskDataByCompany = {
  "1": [
    {
      id: 1,
      setor: "Produção",
      risco: "Ruído excessivo",
      probabilidade: "Alta",
      severidade: "Média",
      nivel: "Alto",
      status: "Ativo",
      descricao: "Exposição a ruído acima de 85 dB durante operação de máquinas industriais",
      medidasControle: "Uso obrigatório de protetor auricular, manutenção preventiva de equipamentos",
      responsavel: "João Silva",
      dataIdentificacao: "2024-01-15",
    },
    {
      id: 2,
      setor: "Manutenção",
      risco: "Trabalho em altura",
      probabilidade: "Média",
      severidade: "Alta",
      nivel: "Alto",
      status: "Ativo",
      descricao: "Atividades de manutenção realizadas em estruturas acima de 2 metros",
      medidasControle: "Treinamento NR-35, uso de EPI específico, inspeção de equipamentos",
      responsavel: "Maria Santos",
      dataIdentificacao: "2024-02-10",
    },
  ],
  "2": [
    {
      id: 3,
      setor: "Almoxarifado",
      risco: "Movimentação manual",
      probabilidade: "Alta",
      severidade: "Baixa",
      nivel: "Médio",
      status: "Controlado",
      descricao: "Levantamento e transporte manual de cargas pesadas",
      medidasControle: "Treinamento em ergonomia, uso de equipamentos auxiliares",
      responsavel: "Carlos Lima",
      dataIdentificacao: "2024-03-05",
    },
    {
      id: 4,
      setor: "Escritório",
      risco: "Ergonômico",
      probabilidade: "Média",
      severidade: "Baixa",
      nivel: "Baixo",
      status: "Controlado",
      descricao: "Posturas inadequadas durante trabalho em computador",
      medidasControle: "Mobiliário ergonômico, pausas regulares, ginástica laboral",
      responsavel: "Ana Costa",
      dataIdentificacao: "2024-04-12",
    },
  ],
  "3": [
    {
      id: 5,
      setor: "Laboratório",
      risco: "Exposição química",
      probabilidade: "Média",
      severidade: "Alta",
      nivel: "Alto",
      status: "Ativo",
      descricao: "Manuseio de substâncias químicas perigosas durante análises",
      medidasControle: "Capela de exaustão, EPI específico, procedimentos de emergência",
      responsavel: "Roberto Costa",
      dataIdentificacao: "2024-05-08",
    },
  ],
}

const actionPlansByCompany = {
  "1": [
    {
      id: 1,
      title: "Controle de Ruído - Produção",
      description: "Implementar cabine acústica para operador",
      deadline: "15/12/2024",
      responsible: "João Silva",
      status: "Vencido",
    },
  ],
  "2": [
    {
      id: 2,
      title: "Treinamento Altura - Manutenção",
      description: "Capacitar equipe em NR-35",
      deadline: "30/01/2025",
      responsible: "Maria Santos",
      status: "Em Andamento",
    },
  ],
  "3": [
    {
      id: 3,
      title: "EPI Laboratório",
      description: "Fornecimento de equipamentos químicos",
      deadline: "20/01/2025",
      responsible: "Carlos Lima",
      status: "Pendente",
    },
  ],
}

const getRiskColor = (nivel: string) => {
  switch (nivel) {
    case "Alto":
      return "bg-red-500"
    case "Médio":
      return "bg-yellow-500"
    case "Baixo":
      return "bg-green-500"
    default:
      return "bg-gray-500"
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "Ativo":
      return "destructive"
    case "Controlado":
      return "secondary"
    case "Eliminado":
      return "default"
    default:
      return "secondary"
  }
}

export function RiskManagement() {
  const [selectedRisk, setSelectedRisk] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRisk, setEditingRisk] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    setor: "",
    risco: "",
    probabilidade: "",
    severidade: "",
    descricao: "",
    medidasControle: "",
    responsavel: "",
  })
  const { selectedCompany } = useCompany()

  const companyRisks = selectedCompany ? riskDataByCompany[selectedCompany.id] || [] : []
  const companyActionPlans = selectedCompany ? actionPlansByCompany[selectedCompany.id] || [] : []

  const riskStats = {
    total: companyRisks.length,
    alto: companyRisks.filter((r) => r.nivel === "Alto").length,
    medio: companyRisks.filter((r) => r.nivel === "Médio").length,
    baixo: companyRisks.filter((r) => r.nivel === "Baixo").length,
    ativo: companyRisks.filter((r) => r.status === "Ativo").length,
    controlado: companyRisks.filter((r) => r.status === "Controlado").length,
  }

  const handleViewRisk = (risk: any) => {
    setSelectedRisk(risk)
    setIsViewDialogOpen(true)
  }

  const handleEditRisk = (risk: any) => {
    setEditingRisk(risk)
    setEditFormData({
      setor: risk.setor,
      risco: risk.risco,
      probabilidade: risk.probabilidade,
      severidade: risk.severidade,
      descricao: risk.descricao || "",
      medidasControle: risk.medidasControle || "",
      responsavel: risk.responsavel || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveRisk = () => {
    console.log("[v0] Saving risk changes:", editFormData)
    // Here you would typically update the risk in the database
    setIsEditDialogOpen(false)
    setEditingRisk(null)
  }

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false)
    setEditingRisk(null)
    setEditFormData({
      setor: "",
      risco: "",
      probabilidade: "",
      severidade: "",
      descricao: "",
      medidasControle: "",
      responsavel: "",
    })
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            <span>Gestão de Riscos (PGR)</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Programa de Gerenciamento de Riscos - NR-01</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Selecione uma empresa para visualizar e gerenciar os riscos ocupacionais.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="px-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center space-x-2">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="leading-tight">Gestão de Riscos (PGR)</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Programa de Gerenciamento de Riscos - NR-01 | {selectedCompany.name}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Risco
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Risco</DialogTitle>
              <DialogDescription>
                Adicione um novo risco ao inventário do PGR para {selectedCompany.name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="setor">Setor</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="almoxarifado">Almoxarifado</SelectItem>
                      <SelectItem value="escritorio">Escritório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funcao">Função</Label>
                  <Input placeholder="Ex: Operador de máquina" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="risco">Descrição do Risco</Label>
                <Textarea placeholder="Descreva detalhadamente o risco identificado" className="min-h-[80px]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Probabilidade</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severidade</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nível de Risco</Label>
                  <Input value="Calculado automaticamente" disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="medidas">Medidas de Controle</Label>
                <Textarea
                  placeholder="Descreva as medidas de controle implementadas ou planejadas"
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Cancelar
              </Button>
              <Button className="w-full sm:w-auto">Salvar Risco</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Riscos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{riskStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Riscos Altos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{riskStats.alto}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Riscos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{riskStats.ativo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Controlados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{riskStats.controlado}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matriz" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="matriz" className="text-xs sm:text-sm">
              Matriz de Riscos
            </TabsTrigger>
            <TabsTrigger value="inventario" className="text-xs sm:text-sm">
              Inventário
            </TabsTrigger>
            <TabsTrigger value="planos" className="text-xs sm:text-sm">
              Planos de Ação
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs sm:text-sm">
              Relatórios
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="matriz" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Matriz de Riscos Dinâmica</CardTitle>
              <CardDescription className="text-sm">
                Visualização interativa dos riscos por probabilidade e severidade - {selectedCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[320px] grid grid-cols-4 gap-2 mb-6">
                  <div></div>
                  <div className="text-center font-medium text-xs sm:text-sm">Baixa</div>
                  <div className="text-center font-medium text-xs sm:text-sm">Média</div>
                  <div className="text-center font-medium text-xs sm:text-sm">Alta</div>

                  <div className="font-medium text-xs sm:text-sm">Alta</div>
                  <div className="h-16 sm:h-20 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Médio
                  </div>
                  <div className="h-16 sm:h-20 bg-red-100 dark:bg-red-900 border-2 border-red-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Alto ({companyRisks.filter((r) => r.probabilidade === "Alta" && r.severidade === "Média").length})
                  </div>
                  <div className="h-16 sm:h-20 bg-red-100 dark:bg-red-900 border-2 border-red-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Alto ({companyRisks.filter((r) => r.probabilidade === "Alta" && r.severidade === "Alta").length})
                  </div>

                  <div className="font-medium text-xs sm:text-sm">Média</div>
                  <div className="h-16 sm:h-20 bg-green-100 dark:bg-green-900 border-2 border-green-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Baixo ({companyRisks.filter((r) => r.probabilidade === "Média" && r.severidade === "Baixa").length})
                  </div>
                  <div className="h-16 sm:h-20 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Médio
                  </div>
                  <div className="h-16 sm:h-20 bg-red-100 dark:bg-red-900 border-2 border-red-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Alto ({companyRisks.filter((r) => r.probabilidade === "Média" && r.severidade === "Alta").length})
                  </div>

                  <div className="font-medium text-xs sm:text-sm">Baixa</div>
                  <div className="h-16 sm:h-20 bg-green-100 dark:bg-green-900 border-2 border-green-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Baixo
                  </div>
                  <div className="h-16 sm:h-20 bg-green-100 dark:bg-green-900 border-2 border-green-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Baixo
                  </div>
                  <div className="h-16 sm:h-20 bg-yellow-100 dark:bg-yellow-900 border-2 border-yellow-300 rounded flex items-center justify-center text-xs sm:text-sm p-1">
                    Médio ({companyRisks.filter((r) => r.probabilidade === "Baixa" && r.severidade === "Alta").length})
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <span className="font-medium">Severidade →</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Inventário de Riscos</CardTitle>
              <CardDescription className="text-sm">
                Lista completa de todos os riscos identificados - {selectedCompany.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Setor</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Probabilidade</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyRisks.map((risk) => (
                      <TableRow key={risk.id}>
                        <TableCell className="font-medium">{risk.setor}</TableCell>
                        <TableCell>{risk.risco}</TableCell>
                        <TableCell>{risk.probabilidade}</TableCell>
                        <TableCell>{risk.severidade}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${getRiskColor(risk.nivel)}`} />
                            <span>{risk.nivel}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(risk.status) as any}>{risk.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm" onClick={() => handleViewRisk(risk)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditRisk(risk)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="sm:hidden space-y-3">
                {companyRisks.map((risk) => (
                  <Card key={risk.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(risk.nivel)}`} />
                        <span className="font-medium text-sm">{risk.setor}</span>
                      </div>
                      <Badge variant={getStatusColor(risk.status) as any} className="text-xs">
                        {risk.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-2">{risk.risco}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                      <div>Prob: {risk.probabilidade}</div>
                      <div>Sev: {risk.severidade}</div>
                      <div>Nível: {risk.nivel}</div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleViewRisk(risk)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleEditRisk(risk)}>
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {companyRisks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum risco cadastrado para {selectedCompany.name}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planos" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                  <span>Planos de Ação - {selectedCompany.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {companyActionPlans
                  .filter((plan) => plan.status !== "Concluído")
                  .map((plan) => (
                    <div key={plan.id} className="p-3 sm:p-4 border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <h4 className="font-medium text-sm sm:text-base">{plan.title}</h4>
                        <Badge
                          variant={plan.status === "Vencido" ? "destructive" : "secondary"}
                          className="text-xs w-fit"
                        >
                          {plan.status}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">{plan.description}</p>
                      <div className="text-xs text-muted-foreground">
                        Prazo: {plan.deadline} | Responsável: {plan.responsible}
                      </div>
                    </div>
                  ))}
                {companyActionPlans.filter((plan) => plan.status !== "Concluído").length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">Nenhum plano de ação pendente</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span>Planos Concluídos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {companyActionPlans
                  .filter((plan) => plan.status === "Concluído")
                  .map((plan) => (
                    <div key={plan.id} className="p-3 sm:p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                        <h4 className="font-medium text-sm sm:text-base">{plan.title}</h4>
                        <Badge className="text-xs w-fit">Concluído</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">{plan.description}</p>
                      <div className="text-xs text-muted-foreground">Concluído em: {plan.deadline}</div>
                    </div>
                  ))}
                {companyActionPlans.filter((plan) => plan.status === "Concluído").length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">Nenhum plano concluído ainda</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Relatório PGR Completo</CardTitle>
                <CardDescription className="text-sm">
                  Documento completo do Programa de Gerenciamento de Riscos - {selectedCompany.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Gerar Relatório</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Matriz por Setor</CardTitle>
                <CardDescription className="text-sm">
                  Relatório específico de riscos por área da empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-transparent" variant="outline">
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Planos de Ação</CardTitle>
                <CardDescription className="text-sm">Status e cronograma das ações preventivas</CardDescription>
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

      {selectedRisk && (
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Risco</DialogTitle>
              <DialogDescription>Informações completas do risco identificado</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Setor:</span>
                      <span className="font-medium">{selectedRisk.setor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Probabilidade:</span>
                      <span>{selectedRisk.probabilidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Severidade:</span>
                      <span>{selectedRisk.severidade}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nível de Risco:</span>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(selectedRisk.nivel)}`} />
                        <span className="font-medium">{selectedRisk.nivel}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={getStatusColor(selectedRisk.status) as any}>{selectedRisk.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Responsável:</span>
                      <span>{selectedRisk.responsavel}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Descrição do Risco</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRisk.descricao}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Medidas de Controle</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedRisk.medidasControle}</p>
                </CardContent>
              </Card>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false)
                    handleEditRisk(selectedRisk)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Risco
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editingRisk && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Risco</DialogTitle>
              <DialogDescription>Atualize as informações do risco "{editingRisk.risco}"</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select
                    value={editFormData.setor}
                    onValueChange={(value) => setEditFormData({ ...editFormData, setor: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Produção">Produção</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Almoxarifado">Almoxarifado</SelectItem>
                      <SelectItem value="Escritório">Escritório</SelectItem>
                      <SelectItem value="Laboratório">Laboratório</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Input
                    value={editFormData.responsavel}
                    onChange={(e) => setEditFormData({ ...editFormData, responsavel: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição do Risco</Label>
                <Input
                  value={editFormData.risco}
                  onChange={(e) => setEditFormData({ ...editFormData, risco: e.target.value })}
                  placeholder="Descrição breve do risco"
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição Detalhada</Label>
                <Textarea
                  value={editFormData.descricao}
                  onChange={(e) => setEditFormData({ ...editFormData, descricao: e.target.value })}
                  placeholder="Descreva detalhadamente o risco identificado"
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Probabilidade</Label>
                  <Select
                    value={editFormData.probabilidade}
                    onValueChange={(value) => setEditFormData({ ...editFormData, probabilidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severidade</Label>
                  <Select
                    value={editFormData.severidade}
                    onValueChange={(value) => setEditFormData({ ...editFormData, severidade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Medidas de Controle</Label>
                <Textarea
                  value={editFormData.medidasControle}
                  onChange={(e) => setEditFormData({ ...editFormData, medidasControle: e.target.value })}
                  placeholder="Descreva as medidas de controle implementadas ou planejadas"
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
              <Button onClick={handleSaveRisk}>Salvar Alterações</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
