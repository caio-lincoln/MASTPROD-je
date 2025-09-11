"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useCompany, type Company } from "@/contexts/company-context"
import {
  Users,
  Building,
  Shield,
  Bell,
  Database,
  Key,
  Globe,
  Save,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "user" | "viewer"
  department: string
  status: "active" | "inactive"
  lastLogin: string
  created_at?: string
}

interface CompanyInfo {
  name: string
  cnpj: string
  address: string
  phone: string
  email: string
  responsibleTechnician: string
  crea: string
}

const SettingsComponent = () => {
  const { companies, setCompanies, selectedCompany } = useCompany()
  const supabase = createClient()

  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userError, setUserError] = useState<string | null>(null)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "manager" | "user" | "viewer",
    department: ""
  })

  // Função para carregar usuários reais do Supabase
  const loadUsers = async () => {
    if (!selectedCompany) {
      setUsers([])
      setLoadingUsers(false)
      return
    }

    try {
      setLoadingUsers(true)
      setUserError(null)

      // Buscar usuários relacionados à empresa selecionada via API route
      const response = await fetch(`/api/users?empresa_id=${selectedCompany.id}`)
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar usuários: ${response.statusText}`)
      }

      const { users: fetchedUsers, error } = await response.json()
      
      if (error) {
        throw new Error(error)
      }

      // Transformar dados para o formato esperado
      const transformedUsers: User[] = fetchedUsers.map((user: any) => ({
        id: user.id,
        name: user.name || user.email?.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || `Usuário ${user.id.substring(0, 8)}`,
        email: user.email || `usuario-${user.id.substring(0, 8)}@empresa.com`,
        role: user.role as "admin" | "manager" | "user" | "viewer",
        department: user.role === 'admin' ? 'Administração' : user.role === 'manager' ? 'Gestão' : 'Operacional',
        status: 'active' as const,
        lastLogin: user.last_sign_in_at || user.created_at,
        created_at: user.created_at
      }))

      setUsers(transformedUsers)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      setUserError('Erro ao carregar usuários. Tente novamente.')
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Carregar usuários quando a empresa selecionada mudar
  useEffect(() => {
    loadUsers()
  }, [selectedCompany])

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "Empresa Exemplo Ltda",
    cnpj: "12.345.678/0001-90",
    address: "Rua das Indústrias, 123 - São Paulo, SP",
    phone: "(11) 1234-5678",
    email: "contato@empresa.com",
    responsibleTechnician: "João Silva",
    crea: "SP123456",
  })

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    systemNotifications: true,
    weeklyReports: true,
    monthlyReports: true,
    incidentAlerts: true,
    trainingReminders: true,
    inspectionReminders: true,
  })

  const [integrations, setIntegrations] = useState({
    esocial: { enabled: true, status: "connected" },
    email: { enabled: true, status: "connected" },
    sms: { enabled: false, status: "disconnected" },
    backup: { enabled: true, status: "connected" },
  })

  const [showPassword, setShowPassword] = useState(false)

  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [companyForm, setCompanyForm] = useState({
    name: "",
    cnpj: "",
    address: "",
    phone: "",
    email: "",
    logo: "",
    isActive: true,
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800 border-red-200"
      case "manager":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "user":
        return "bg-green-100 text-green-800 border-green-200"
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200"
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200"
      case "connected":
        return "bg-green-100 text-green-800 border-green-200"
      case "disconnected":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleCompanyInfoChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
  }

  const handleCompanyFormChange = (field: string, value: string | boolean) => {
    setCompanyForm((prev) => ({ ...prev, [field]: value }))
  }

  const openCompanyDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company)
      setCompanyForm({
        name: company.name,
        cnpj: company.cnpj,
        address: company.address,
        phone: company.phone,
        email: company.email,
        logo: company.logo || "",
        isActive: company.isActive,
      })
    } else {
      setEditingCompany(null)
      setCompanyForm({
        name: "",
        cnpj: "",
        address: "",
        phone: "",
        email: "",
        logo: "",
        isActive: true,
      })
    }
    setIsCompanyDialogOpen(true)
  }

  const handleSaveCompany = () => {
    if (editingCompany) {
      const updatedCompanies = companies.map((company) =>
        company.id === editingCompany.id ? { ...company, ...companyForm } : company,
      )
      setCompanies(updatedCompanies)
    } else {
      const newCompany: Company = {
        id: Date.now().toString(),
        ...companyForm,
        createdAt: new Date(),
      }
      setCompanies([...companies, newCompany])
    }
    setIsCompanyDialogOpen(false)
  }

  const handleDeleteCompany = (companyId: string) => {
    const updatedCompanies = companies.filter((company) => company.id !== companyId)
    setCompanies(updatedCompanies)
  }

  const validateCNPJ = (cnpj: string) => {
    const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/
    return cnpjRegex.test(cnpj)
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleUserFormChange = (field: string, value: string) => {
    setUserForm(prev => ({ ...prev, [field]: value }))
  }

  const openUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setUserForm({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      })
    } else {
      setEditingUser(null)
      setUserForm({
        name: "",
        email: "",
        role: "user",
        department: ""
      })
    }
    setIsUserDialogOpen(true)
  }

  const handleSaveUser = async () => {
    if (!selectedCompany) return

    try {
      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser 
        ? `/api/users?user_id=${editingUser.id}&empresa_id=${selectedCompany.id}`
        : `/api/users?empresa_id=${selectedCompany.id}`

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userForm)
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar usuário')
      }

      setIsUserDialogOpen(false)
      loadUsers() // Recarrega a lista de usuários
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      setUserError('Erro ao salvar usuário. Tente novamente.')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!selectedCompany) return
    
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return

    try {
      const response = await fetch(`/api/users?user_id=${userId}&empresa_id=${selectedCompany.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar usuário')
      }

      loadUsers() // Recarrega a lista de usuários
    } catch (error) {
      console.error('Erro ao deletar usuário:', error)
      setUserError('Erro ao deletar usuário. Tente novamente.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie configurações do sistema e usuários</p>
        </div>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Informações da Empresa
              </CardTitle>
              <CardDescription>Configure os dados básicos da sua empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Razão Social</Label>
                  <Input
                    id="company-name"
                    value={companyInfo.name}
                    onChange={(e) => handleCompanyInfoChange("name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={companyInfo.cnpj}
                    onChange={(e) => handleCompanyInfoChange("cnpj", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={companyInfo.address}
                    onChange={(e) => handleCompanyInfoChange("address", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={companyInfo.phone}
                    onChange={(e) => handleCompanyInfoChange("phone", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyInfo.email}
                    onChange={(e) => handleCompanyInfoChange("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsible">Responsável Técnico</Label>
                  <Input
                    id="responsible"
                    value={companyInfo.responsibleTechnician}
                    onChange={(e) => handleCompanyInfoChange("responsibleTechnician", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crea">CREA</Label>
                  <Input
                    id="crea"
                    value={companyInfo.crea}
                    onChange={(e) => handleCompanyInfoChange("crea", e.target.value)}
                  />
                </div>
              </div>
              <Button className="w-full md:w-auto">
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Gestão de Empresas
                  </CardTitle>
                  <CardDescription>Cadastre e gerencie as empresas do sistema</CardDescription>
                </div>
                <Button onClick={() => openCompanyDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Empresa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companies.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-semibold text-muted-foreground">Nenhuma empresa cadastrada</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Comece cadastrando sua primeira empresa.</p>
                  </div>
                ) : (
                  companies.map((company) => (
                    <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{company.name}</h4>
                          <Badge className={getStatusColor(company.isActive ? "active" : "inactive")}>
                            {company.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">CNPJ: {company.cnpj}</p>
                        <p className="text-sm text-muted-foreground">{company.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {company.phone} • {company.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cadastrada em: {company.createdAt.toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openCompanyDialog(company)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCompany(company.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingCompany ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
                <DialogDescription>
                  {editingCompany
                    ? "Edite as informações da empresa selecionada."
                    : "Preencha os dados para cadastrar uma nova empresa."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Razão Social *</Label>
                    <Input
                      id="company-name"
                      value={companyForm.name}
                      onChange={(e) => handleCompanyFormChange("name", e.target.value)}
                      placeholder="Digite a razão social"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-cnpj">CNPJ *</Label>
                    <Input
                      id="company-cnpj"
                      value={companyForm.cnpj}
                      onChange={(e) => handleCompanyFormChange("cnpj", e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                    {companyForm.cnpj && !validateCNPJ(companyForm.cnpj) && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Formato de CNPJ inválido
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-address">Endereço *</Label>
                  <Textarea
                    id="company-address"
                    value={companyForm.address}
                    onChange={(e) => handleCompanyFormChange("address", e.target.value)}
                    placeholder="Digite o endereço completo"
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Telefone *</Label>
                    <Input
                      id="company-phone"
                      value={companyForm.phone}
                      onChange={(e) => handleCompanyFormChange("phone", e.target.value)}
                      placeholder="(00) 0000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">E-mail *</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => handleCompanyFormChange("email", e.target.value)}
                      placeholder="contato@empresa.com"
                    />
                    {companyForm.email && !validateEmail(companyForm.email) && (
                      <p className="text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Formato de e-mail inválido
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company-logo">Logo (URL)</Label>
                  <Input
                    id="company-logo"
                    value={companyForm.logo}
                    onChange={(e) => handleCompanyFormChange("logo", e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="company-active"
                    checked={companyForm.isActive}
                    onCheckedChange={(value) => handleCompanyFormChange("isActive", value)}
                  />
                  <Label htmlFor="company-active">Empresa ativa</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveCompany}
                  disabled={
                    !companyForm.name ||
                    !companyForm.cnpj ||
                    !companyForm.address ||
                    !companyForm.phone ||
                    !companyForm.email ||
                    !validateCNPJ(companyForm.cnpj) ||
                    !validateEmail(companyForm.email)
                  }
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingCompany ? "Salvar Alterações" : "Cadastrar Empresa"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de Usuário */}
          <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "Editar Usuário" : "Novo Usuário"}
                </DialogTitle>
                <DialogDescription>
                  {editingUser ? "Edite as informações do usuário" : "Adicione um novo usuário ao sistema"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="user-name" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="user-name"
                    value={userForm.name}
                    onChange={(e) => handleUserFormChange("name", e.target.value)}
                    className="col-span-3"
                    placeholder="Nome completo"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="user-email" className="text-right">
                    E-mail
                  </Label>
                  <Input
                    id="user-email"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => handleUserFormChange("email", e.target.value)}
                    className="col-span-3"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="user-role" className="text-right">
                    Função
                  </Label>
                  <select
                    id="user-role"
                    value={userForm.role}
                    onChange={(e) => handleUserFormChange("role", e.target.value)}
                    className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="user">Usuário</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="user-department" className="text-right">
                    Departamento
                  </Label>
                  <Input
                    id="user-department"
                    value={userForm.department}
                    onChange={(e) => handleUserFormChange("department", e.target.value)}
                    className="col-span-3"
                    placeholder="Departamento"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  onClick={handleSaveUser}
                  disabled={!userForm.name || !userForm.email || !validateEmail(userForm.email)}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {editingUser ? "Salvar Alterações" : "Criar Usuário"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gestão de Usuários
                  </CardTitle>
                  <CardDescription>Gerencie usuários e suas permissões</CardDescription>
                </div>
                <Button onClick={() => openUserDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Carregando usuários...</p>
                    </div>
                  </div>
                ) : userError ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                      <p className="text-sm text-red-600">{userError}</p>
                      <Button variant="outline" size="sm" onClick={loadUsers}>
                        Tentar Novamente
                      </Button>
                    </div>
                  </div>
                ) : !selectedCompany ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Selecione uma empresa para visualizar os usuários</p>
                    </div>
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <Users className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">Nenhum usuário encontrado para esta empresa</p>
                      <p className="text-xs text-muted-foreground">Adicione usuários para começar</p>
                    </div>
                  </div>
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{user.name}</h4>
                          <Badge className={getRoleColor(user.role)}>
                            {user.role === "admin"
                              ? "Administrador"
                              : user.role === "manager"
                                ? "Gerente"
                                : user.role === "user"
                                  ? "Usuário"
                                  : "Visualizador"}
                          </Badge>
                          <Badge className={getStatusColor(user.status)}>
                            {user.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.department} • Último acesso: {new Date(user.lastLogin).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openUserDialog(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configuração de Permissões
              </CardTitle>
              <CardDescription>Configure permissões por perfil de usuário</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="font-medium">Módulo</div>
                  <div className="font-medium text-center">Administrador</div>
                  <div className="font-medium text-center">Gerente</div>
                  <div className="font-medium text-center">Usuário</div>
                </div>

                {[
                  "Dashboard",
                  "Gestão de Riscos",
                  "Saúde Ocupacional",
                  "Funcionários",
                  "Treinamentos",
                  "Biblioteca Digital",
                  "Relatórios",
                  "eSocial",
                  "Não Conformidades",
                  "Segurança do Trabalho",
                  "Configurações",
                ].map((module) => (
                  <div key={module} className="grid gap-4 md:grid-cols-4 items-center py-2 border-b">
                    <div>{module}</div>
                    <div className="flex justify-center">
                      <Switch defaultChecked />
                    </div>
                    <div className="flex justify-center">
                      <Switch defaultChecked={module !== "Configurações"} />
                    </div>
                    <div className="flex justify-center">
                      <Switch defaultChecked={!["Configurações", "eSocial"].includes(module)} />
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-4">
                <Save className="mr-2 h-4 w-4" />
                Salvar Permissões
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Configurações de Notificações
              </CardTitle>
              <CardDescription>Configure como e quando receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas por E-mail</Label>
                    <p className="text-sm text-muted-foreground">Receba alertas importantes por e-mail</p>
                  </div>
                  <Switch
                    checked={notifications.emailAlerts}
                    onCheckedChange={(value) => handleNotificationChange("emailAlerts", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas por SMS</Label>
                    <p className="text-sm text-muted-foreground">Receba alertas críticos por SMS</p>
                  </div>
                  <Switch
                    checked={notifications.smsAlerts}
                    onCheckedChange={(value) => handleNotificationChange("smsAlerts", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações do Sistema</Label>
                    <p className="text-sm text-muted-foreground">Notificações dentro do sistema</p>
                  </div>
                  <Switch
                    checked={notifications.systemNotifications}
                    onCheckedChange={(value) => handleNotificationChange("systemNotifications", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Relatórios Semanais</Label>
                    <p className="text-sm text-muted-foreground">Receba resumos semanais automaticamente</p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReports}
                    onCheckedChange={(value) => handleNotificationChange("weeklyReports", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Relatórios Mensais</Label>
                    <p className="text-sm text-muted-foreground">Receba relatórios mensais detalhados</p>
                  </div>
                  <Switch
                    checked={notifications.monthlyReports}
                    onCheckedChange={(value) => handleNotificationChange("monthlyReports", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas de Incidentes</Label>
                    <p className="text-sm text-muted-foreground">Notificações imediatas para incidentes</p>
                  </div>
                  <Switch
                    checked={notifications.incidentAlerts}
                    onCheckedChange={(value) => handleNotificationChange("incidentAlerts", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes de Treinamento</Label>
                    <p className="text-sm text-muted-foreground">Lembretes de treinamentos vencendo</p>
                  </div>
                  <Switch
                    checked={notifications.trainingReminders}
                    onCheckedChange={(value) => handleNotificationChange("trainingReminders", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Lembretes de Inspeção</Label>
                    <p className="text-sm text-muted-foreground">Lembretes de inspeções programadas</p>
                  </div>
                  <Switch
                    checked={notifications.inspectionReminders}
                    onCheckedChange={(value) => handleNotificationChange("inspectionReminders", value)}
                  />
                </div>
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Integrações Externas
              </CardTitle>
              <CardDescription>Configure integrações com sistemas externos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">eSocial</h4>
                    <p className="text-sm text-muted-foreground">Integração com o sistema eSocial do governo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(integrations.esocial.status)}>
                      {integrations.esocial.status === "connected" ? "Conectado" : "Desconectado"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">E-mail</h4>
                    <p className="text-sm text-muted-foreground">Servidor SMTP para envio de e-mails</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(integrations.email.status)}>
                      {integrations.email.status === "connected" ? "Conectado" : "Desconectado"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">SMS</h4>
                    <p className="text-sm text-muted-foreground">Serviço de envio de SMS para alertas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(integrations.sms.status)}>
                      {integrations.sms.status === "connected" ? "Conectado" : "Desconectado"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Backup Automático</h4>
                    <p className="text-sm text-muted-foreground">Backup automático dos dados do sistema</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(integrations.backup.status)}>
                      {integrations.backup.status === "connected" ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button variant="outline" size="sm">
                      Configurar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Backup e Restauração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Último Backup</Label>
                  <p className="text-sm text-muted-foreground">15/01/2024 às 03:00</p>
                </div>
                <div className="space-y-2">
                  <Label>Próximo Backup</Label>
                  <p className="text-sm text-muted-foreground">16/01/2024 às 03:00</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Fazer Backup Agora</Button>
                  <Button variant="outline">Restaurar</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Segurança
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha atual"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input id="new-password" type="password" placeholder="Digite a nova senha" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha</Label>
                  <Input id="confirm-password" type="password" placeholder="Confirme a nova senha" />
                </div>
                <Button>Alterar Senha</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Versão do Sistema</Label>
                  <p className="text-sm text-muted-foreground">v2.1.0</p>
                </div>
                <div className="space-y-1">
                  <Label>Última Atualização</Label>
                  <p className="text-sm text-muted-foreground">10/01/2024</p>
                </div>
                <div className="space-y-1">
                  <Label>Licença</Label>
                  <p className="text-sm text-muted-foreground">Empresarial - Válida até 31/12/2024</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export { SettingsComponent as Settings }
export default SettingsComponent
