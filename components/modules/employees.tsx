"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { LoadingButton } from "@/components/ui/loading-button"
import { LoadingSkeleton } from "@/components/ui/loading-skeleton"
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
import { useLoading } from "@/hooks/use-loading"
import { createClient } from "@/lib/supabase/client"
import { formatDateSafe, isValidDate } from "@/lib/utils/date-utils"

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
  const { isLoading, withLoading } = useLoading({ initialState: true })
  const { isLoading: isSaving, withLoading: withSaving } = useLoading()
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
    }
  }, [selectedCompany])

  const loadEmployees = async () => {
    if (!selectedCompany) return

    await withLoading(async () => {
      try {
        const { data, error } = await supabase
          .from("funcionarios")
          .select("*")
          .eq("empresa_id", selectedCompany.id)
          .order("nome")

        if (error) {
          return
        }

        setEmployees(data || [])
      } catch (error) {
        // Error handling
      }
    })
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
      if (!isValidDate(formData.data_nascimento)) {
        errors.data_nascimento = "Data de nascimento inválida"
      } else {
        const birthDate = new Date(formData.data_nascimento)
        const today = new Date()
        const age = today.getFullYear() - birthDate.getFullYear()
        if (age < 14) {
          errors.data_nascimento = "Funcionário deve ter pelo menos 14 anos"
        }
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

    await withSaving(async () => {
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
            return
          }
        }

        // Recarregar lista de funcionários
        await loadEmployees()
        handleCancel()
      } catch (error) {
        // Error handling
      }
    })
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Funcionários</h2>
            <p className="text-muted-foreground">Carregando funcionários de {selectedCompany.name}...</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Novo Funcionário
          </Button>
        </div>
        <LoadingSkeleton variant="table" count={5} />
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
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Funcionário</TableHead>
                      <TableHead className="min-w-[120px]">CPF</TableHead>
                      <TableHead className="min-w-[120px]">Cargo</TableHead>
                      <TableHead className="min-w-[100px]">Setor</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="w-[70px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="min-w-[200px]">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback>
                                {employee.nome
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{employee.nome}</div>
                              {employee.email && (
                                <div className="text-sm text-muted-foreground truncate">{employee.email}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[120px]">{employee.cpf}</TableCell>
                        <TableCell className="min-w-[120px]">
                          <span className="truncate block">{employee.cargo}</span>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <span className="truncate block">{employee.setor}</span>
                        </TableCell>
                        <TableCell className="min-w-[80px]">
                          <Badge variant={getStatusColor(employee.status)}>{getStatusText(employee.status)}</Badge>
                        </TableCell>
                        <TableCell className="w-[70px]">
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

              {/* Tablet Table - Simplified */}
              <div className="hidden md:block lg:hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Funcionário</TableHead>
                      <TableHead className="min-w-[120px]">Cargo</TableHead>
                      <TableHead className="min-w-[80px]">Status</TableHead>
                      <TableHead className="w-[70px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="min-w-[180px]">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback>
                                {employee.nome
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{employee.nome}</div>
                              <div className="text-xs text-muted-foreground truncate">{employee.cpf}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          <div>
                            <div className="truncate">{employee.cargo}</div>
                            <div className="text-xs text-muted-foreground truncate">{employee.setor}</div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[80px]">
                          <Badge variant={getStatusColor(employee.status)}>{getStatusText(employee.status)}</Badge>
                        </TableCell>
                        <TableCell className="w-[70px]">
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
              <div className="md:hidden space-y-3">
                {employees.map((employee) => (
                  <Card key={employee.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="text-sm">
                            {employee.nome
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{employee.nome}</div>
                          <div className="text-xs text-muted-foreground truncate">{employee.cargo}</div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
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
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">CPF:</span>
                        <span className="font-mono">{employee.cpf}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Setor:</span>
                        <span className="truncate ml-2">{employee.setor}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <Badge variant={getStatusColor(employee.status)} className="text-xs">
                          {getStatusText(employee.status)}
                        </Badge>
                      </div>
                    </div>
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
                  <p className="text-sm">{formatDateSafe(selectedEmployee.data_nascimento)}</p>
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
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleSave} isLoading={isSaving} loadingText="Salvando...">
              Salvar Funcionário
            </LoadingButton>
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
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleSave} isLoading={isSaving} loadingText="Salvando...">
              Salvar Alterações
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Export default para compatibilidade com importações dinâmicas
export default Employees
