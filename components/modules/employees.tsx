"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { AlertCircle, Eye, MoreHorizontal, Plus, UserPlus, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCompany } from "@/contexts/company-context"
import { createClient } from "@/lib/supabase/client"

interface Employee {
  id: string
  empresa_id: string
  nome: string
  cpf: string
  matricula_esocial?: string
  data_nascimento: string
  cargo: string
  setor: string
  email?: string
  status: boolean
  created_at: string
}

const getStatusColor = (status: boolean) => {
  return status ? "default" : "secondary"
}

const getStatusText = (status: boolean) => {
  return status ? "Ativo" : "Inativo"
}

export function Employees() {
  const { selectedCompany } = useCompany()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isNewEmployeeDialogOpen, setIsNewEmployeeDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    matricula_esocial: "",
    data_nascimento: "",
    cargo: "",
    setor: "",
    email: "",
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    if (selectedCompany) {
      loadEmployees()
    } else {
      setEmployees([])
      setIsLoading(false)
    }
  }, [selectedCompany])

  const loadEmployees = async () => {
    if (!selectedCompany) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("empresa_id", selectedCompany.id)
        .order("nome")

      if (error) {
        console.error("Erro ao carregar funcionários:", error)
        return
      }

      setEmployees(data || [])
    } catch (error) {
      console.error("Erro ao carregar funcionários:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.nome.trim()) {
      errors.nome = "Nome é obrigatório"
    }

    if (!formData.cpf.trim()) {
      errors.cpf = "CPF é obrigatório"
    } else if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      errors.cpf = "CPF deve estar no formato 000.000.000-00"
    }

    if (!formData.data_nascimento) {
      errors.data_nascimento = "Data de nascimento é obrigatória"
    } else {
      const birthDate = new Date(formData.data_nascimento)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      if (age < 14) {
        errors.data_nascimento = "Funcionário deve ter pelo menos 14 anos"
      }
    }

    if (!formData.cargo.trim()) {
      errors.cargo = "Cargo é obrigatório"
    }

    if (!formData.setor.trim()) {
      errors.setor = "Setor é obrigatório"
    }

    if (formData.matricula_esocial && formData.matricula_esocial.length > 20) {
      errors.matricula_esocial = "Matrícula eSocial deve ter no máximo 20 caracteres"
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email deve ter um formato válido"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      nome: employee.nome,
      cpf: employee.cpf,
      matricula_esocial: employee.matricula_esocial || "",
      data_nascimento: employee.data_nascimento,
      cargo: employee.cargo,
      setor: employee.setor,
      email: employee.email || "",
    })
    setFormErrors({})
    setIsEditDialogOpen(true)
  }

  const handleNewEmployee = () => {
    setEditingEmployee(null)
    setFormData({
      nome: "",
      cpf: "",
      matricula_esocial: "",
      data_nascimento: "",
      cargo: "",
      setor: "",
      email: "",
    })
    setFormErrors({})
    setIsNewEmployeeDialogOpen(true)
  }

  const handleCancel = () => {
    setIsEditDialogOpen(false)
    setIsNewEmployeeDialogOpen(false)
    setEditingEmployee(null)
    setFormData({
      nome: "",
      cpf: "",
      matricula_esocial: "",
      data_nascimento: "",
      cargo: "",
      setor: "",
      email: "",
    })
    setFormErrors({})
  }

  const handleSave = async () => {
    if (!validateForm() || !selectedCompany) return

    try {
      if (editingEmployee) {
        // Atualizar funcionário existente
        const { error } = await supabase
          .from("funcionarios")
          .update({
            nome: formData.nome,
            cpf: formData.cpf,
            matricula_esocial: formData.matricula_esocial || null,
            data_nascimento: formData.data_nascimento,
            cargo: formData.cargo,
            setor: formData.setor,
            email: formData.email || null,
          })
          .eq("id", editingEmployee.id)

        if (error) {
          console.error("Erro ao atualizar funcionário:", error)
          return
        }
      } else {
        // Criar novo funcionário
        const { error } = await supabase.from("funcionarios").insert({
          empresa_id: selectedCompany.id,
          nome: formData.nome,
          cpf: formData.cpf,
          matricula_esocial: formData.matricula_esocial || null,
          data_nascimento: formData.data_nascimento,
          cargo: formData.cargo,
          setor: formData.setor,
          email: formData.email || null,
          status: true,
        })

        if (error) {
          console.error("Erro ao criar funcionário:", error)
          return
        }
      }

      // Recarregar lista de funcionários
      await loadEmployees()
      handleCancel()
    } catch (error) {
      console.error("Erro ao salvar funcionário:", error)
    }
  }

  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Funcionários</h2>
          <p className="text-muted-foreground">Gerencie os funcionários da empresa</p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Selecione uma empresa para visualizar e gerenciar os funcionários.</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Funcionários</h2>
          <p className="text-muted-foreground">Carregando funcionários...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Funcionários</h2>
          <p className="text-muted-foreground">Gerencie os funcionários de {selectedCompany.name}</p>
        </div>
        <Button onClick={handleNewEmployee}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Funcionário
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.filter((e) => e.status).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Funcionários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários</CardTitle>
          <CardDescription>Visualize e gerencie todos os funcionários da empresa</CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum funcionário cadastrado</p>
              <Button onClick={handleNewEmployee} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Funcionário
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {employee.nome
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{employee.nome}</div>
                              {employee.email && <div className="text-sm text-muted-foreground">{employee.email}</div>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.cpf}</TableCell>
                        <TableCell>{employee.cargo}</TableCell>
                        <TableCell>{employee.setor}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(employee.status)}>{getStatusText(employee.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedEmployee(employee)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(employee)}>Editar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {employees.map((employee) => (
                  <Card key={employee.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {employee.nome
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{employee.nome}</div>
                            <div className="text-sm text-muted-foreground">{employee.cargo}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedEmployee(employee)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(employee)}>Editar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="text-sm">
                          <span className="text-muted-foreground">CPF:</span> {employee.cpf}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Setor:</span> {employee.setor}
                        </div>
                        <div className="flex items-center justify-between">
                          <Badge variant={getStatusColor(employee.status)}>{getStatusText(employee.status)}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Visualização */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Funcionário</DialogTitle>
            <DialogDescription>Informações completas do funcionário selecionado</DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {selectedEmployee.nome
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedEmployee.nome}</h3>
                  <p className="text-muted-foreground">{selectedEmployee.cargo}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">CPF</Label>
                  <p className="text-sm">{selectedEmployee.cpf}</p>
                </div>
                {selectedEmployee.matricula_esocial && (
                  <div>
                    <Label className="text-sm font-medium">Matrícula eSocial</Label>
                    <p className="text-sm">{selectedEmployee.matricula_esocial}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Data de Nascimento</Label>
                  <p className="text-sm">{new Date(selectedEmployee.data_nascimento).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Setor</Label>
                  <p className="text-sm">{selectedEmployee.setor}</p>
                </div>
                {selectedEmployee.email && (
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm">{selectedEmployee.email}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedEmployee.status)}>
                      {getStatusText(selectedEmployee.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Novo Funcionário */}
      <Dialog open={isNewEmployeeDialogOpen} onOpenChange={setIsNewEmployeeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Funcionário</DialogTitle>
            <DialogDescription>Cadastre um novo funcionário na empresa</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={formErrors.nome ? "border-red-500" : ""}
              />
              {formErrors.nome && <p className="text-sm text-red-500">{formErrors.nome}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                className={formErrors.cpf ? "border-red-500" : ""}
              />
              {formErrors.cpf && <p className="text-sm text-red-500">{formErrors.cpf}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="matricula_esocial">Matrícula eSocial</Label>
              <Input
                id="matricula_esocial"
                value={formData.matricula_esocial}
                onChange={(e) => setFormData({ ...formData, matricula_esocial: e.target.value })}
                maxLength={20}
                className={formErrors.matricula_esocial ? "border-red-500" : ""}
              />
              {formErrors.matricula_esocial && <p className="text-sm text-red-500">{formErrors.matricula_esocial}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className={formErrors.data_nascimento ? "border-red-500" : ""}
              />
              {formErrors.data_nascimento && <p className="text-sm text-red-500">{formErrors.data_nascimento}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo *</Label>
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                className={formErrors.cargo ? "border-red-500" : ""}
              />
              {formErrors.cargo && <p className="text-sm text-red-500">{formErrors.cargo}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="setor">Setor *</Label>
              <Input
                id="setor"
                value={formData.setor}
                onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                className={formErrors.setor ? "border-red-500" : ""}
              />
              {formErrors.setor && <p className="text-sm text-red-500">{formErrors.setor}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Funcionário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Funcionário</DialogTitle>
            <DialogDescription>Atualize as informações do funcionário</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome Completo *</Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={formErrors.nome ? "border-red-500" : ""}
              />
              {formErrors.nome && <p className="text-sm text-red-500">{formErrors.nome}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cpf">CPF *</Label>
              <Input
                id="edit-cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                className={formErrors.cpf ? "border-red-500" : ""}
              />
              {formErrors.cpf && <p className="text-sm text-red-500">{formErrors.cpf}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-matricula_esocial">Matrícula eSocial</Label>
              <Input
                id="edit-matricula_esocial"
                value={formData.matricula_esocial}
                onChange={(e) => setFormData({ ...formData, matricula_esocial: e.target.value })}
                maxLength={20}
                className={formErrors.matricula_esocial ? "border-red-500" : ""}
              />
              {formErrors.matricula_esocial && <p className="text-sm text-red-500">{formErrors.matricula_esocial}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-data_nascimento">Data de Nascimento *</Label>
              <Input
                id="edit-data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                className={formErrors.data_nascimento ? "border-red-500" : ""}
              />
              {formErrors.data_nascimento && <p className="text-sm text-red-500">{formErrors.data_nascimento}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cargo">Cargo *</Label>
              <Input
                id="edit-cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                className={formErrors.cargo ? "border-red-500" : ""}
              />
              {formErrors.cargo && <p className="text-sm text-red-500">{formErrors.cargo}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-setor">Setor *</Label>
              <Input
                id="edit-setor"
                value={formData.setor}
                onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                className={formErrors.setor ? "border-red-500" : ""}
              />
              {formErrors.setor && <p className="text-sm text-red-500">{formErrors.setor}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
