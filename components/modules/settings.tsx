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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  role: string // Mudado para string para aceitar funções customizadas
  department: string
  status: "active" | "inactive"
  lastLogin: string
  created_at?: string
}

interface Role {
  id: string
  name: string
  description: string
  permissions: { [key: string]: boolean }
  isDefault: boolean
  isEditable?: boolean
}

interface Integration {
  name: string
  status: "active" | "inactive" | "error"
  lastSync?: string
  description: string
}

export function SettingsComponent() {
  const { selectedCompany, companies, setSelectedCompany } = useCompany()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      name: "eSocial",
      status: "inactive",
      description: "Integração com o sistema eSocial do governo"
    },
    {
      name: "E-mail",
      status: "active",
      lastSync: "2024-01-15T10:30:00Z",
      description: "Configuração de envio de e-mails"
    },
    {
      name: "SMS",
      status: "inactive",
      description: "Envio de notificações via SMS"
    },
    {
      name: "Backup",
      status: "active",
      lastSync: "2024-01-15T02:00:00Z",
      description: "Backup automático dos dados"
    }
  ])

  // Estados para diálogos
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false)
  const [isEsocialDialogOpen, setIsEsocialDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false)
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false)

  // Estados para edição
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)

  // Estados para erros
  const [userError, setUserError] = useState<string | null>(null)

  // Estados para gerenciar funções customizadas
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [newRolePermissions, setNewRolePermissions] = useState<{ [key: string]: boolean }>({})

  // Estados para formulários
  const [companyForm, setCompanyForm] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: ''
  })

  // Módulos disponíveis no sistema
  const availableModules = [
    "Dashboard",
    "Funcionários",
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
  ]

  // Função para carregar funções padrão do sistema
  const loadRoles = async () => {
    if (!selectedCompany) return
    
    setLoadingRoles(true)
    try {
      // Definir apenas as 4 funções padrão do sistema
      const defaultRoles = [
        {
          id: 'admin',
          name: 'Administrador',
          description: 'Acesso total ao sistema',
          isEditable: false // Administrador não pode ser editado
        },
        {
          id: 'manager',
          name: 'Gerente',
          description: 'Acesso de gerenciamento',
          isEditable: true // Gerente pode ser editado
        },
        {
          id: 'user',
          name: 'Usuário',
          description: 'Acesso básico',
          isEditable: true // Usuário pode ser editado
        },
        {
          id: 'viewer',
          name: 'Visualizador',
          description: 'Apenas visualização',
          isEditable: true // Visualizador pode ser editado
        }
      ]

      const formattedRoles: Role[] = defaultRoles.map(role => {
        const permissions: { [key: string]: boolean } = {}
        
        // Definir permissões específicas para cada função
        availableModules.forEach(module => {
          if (role.id === 'admin') {
            // Administrador tem acesso a tudo
            permissions[module] = true
          } else if (role.id === 'manager') {
            // Gerente tem acesso a quase tudo, exceto configurações
            permissions[module] = module !== 'Configurações'
          } else if (role.id === 'user') {
            // Usuário tem acesso básico
            permissions[module] = ['Dashboard', 'Funcionários', 'Treinamentos', 'Relatórios'].includes(module)
          } else if (role.id === 'viewer') {
            // Visualizador apenas visualiza
            permissions[module] = ['Dashboard', 'Relatórios'].includes(module)
          } else {
            permissions[module] = false
          }
        })
        
        return {
          id: role.id,
          name: role.name,
          description: role.description,
          permissions,
          isDefault: true,
          isEditable: role.isEditable
        }
      })

      setRoles(formattedRoles)
    } catch (error) {
      console.error('Erro ao carregar funções:', error)
    } finally {
      setLoadingRoles(false)
    }
  }

  // Função para abrir dialog de função
  const openRoleDialog = (role?: Role) => {
    if (role) {
      setEditingRole(role)
      setNewRoleName(role.name)
      setNewRoleDescription(role.description)
      setNewRolePermissions(role.permissions)
    } else {
      setEditingRole(null)
      setNewRoleName('')
      setNewRoleDescription('')
      // Inicializar todas as permissões como false
      const initialPermissions: { [key: string]: boolean } = {}
      availableModules.forEach(module => {
        initialPermissions[module] = false
      })
      setNewRolePermissions(initialPermissions)
    }
    setIsRoleDialogOpen(true)
  }

  // Função para salvar função
  const handleSaveRole = async () => {
    if (!selectedCompany || !newRoleName.trim()) return

    try {
      const supabase = createClient()
      
      if (editingRole && !editingRole.isDefault) {
        // Atualizar função existente
        const { error: updateError } = await supabase
          .from('custom_roles')
          .update({
            name: newRoleName,
            description: newRoleDescription
          })
          .eq('id', editingRole.id)

        if (updateError) throw updateError
      } else if (!editingRole) {
        // Criar nova função
        const { data: newRole, error: insertError } = await supabase
          .from('custom_roles')
          .insert({
            name: newRoleName,
            description: newRoleDescription,
            empresa_id: selectedCompany.id
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Deletar permissões existentes
        await supabase
          .from('permissions')
          .delete()
          .eq('role_id', newRole.id)

        // Inserir novas permissões
        const permissionsToInsert = Object.entries(newRolePermissions)
          .filter(([_, hasPermission]) => hasPermission)
          .map(([module, _]) => ({
            role_id: newRole.id,
            module,
            can_read: true,
            can_write: true,
            can_delete: false
          }))

        if (permissionsToInsert.length > 0) {
          await supabase.from('permissions').insert(permissionsToInsert)
        }
      }

      // Recarregar funções
      await loadRoles()
      setIsRoleDialogOpen(false)
    } catch (error) {
      console.error('Erro ao salvar função:', error)
    }
  }

  // Função para deletar função
  const handleDeleteRole = async (role: Role) => {
    if (!confirm('Tem certeza que deseja deletar esta função?')) return

    try {
      // Verificar se a função não é padrão
      if (role.isDefault) {
        alert('Não é possível deletar funções padrão do sistema.')
        return
      }

      // Deletar função (as permissões serão deletadas automaticamente por CASCADE)
      const supabase = createClient()
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', role.id)

      if (error) throw error

      // Recarregar funções
      await loadRoles()
    } catch (error) {
      console.error('Erro ao deletar função:', error)
    }
  }

  // Função para atualizar permissão de módulo
  const handlePermissionChange = (module: string, hasPermission: boolean) => {
    setNewRolePermissions(prev => ({
      ...prev,
      [module]: hasPermission
    }))
  }

  // Função para carregar usuários reais do Supabase
  const loadUsers = async () => {
    if (!selectedCompany) {
      setUsers([])
      return
    }

    try {
      // Buscar usuários relacionados à empresa selecionada via API route
      const response = await fetch(`/api/users?empresa_id=${selectedCompany.id}`)
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar usuários: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      // Transformar os dados para o formato esperado
      const transformedUsers: User[] = data.users.map((user: any) => {
        // Determinar status baseado nos campos do Supabase Auth
        // Usuário é considerado ativo se:
        // - Email foi confirmado (email_confirmed_at não é null)
        // - Não está banido (banned_until é null ou já passou)
        // - Não foi deletado (deleted_at é null)
        const isActive = user.email_confirmed_at && 
                        !user.deleted_at && 
                        (!user.banned_until || new Date(user.banned_until) < new Date())
        
        return {
          id: user.id,
          name: user.name || user.email?.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || `Usuário ${user.id.substring(0, 8)}`,
          email: user.email,
          role: user.role || 'Usuário',
          department: user.role === 'admin' ? 'Administração' : user.role === 'manager' ? 'Gestão' : 'Operacional',
          status: isActive ? 'active' : 'inactive',
          lastLogin: user.last_sign_in_at || new Date().toISOString(),
          created_at: user.created_at
        }
      })
      
      setUsers(transformedUsers)
      setUserError(null)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
      setUserError('Erro ao carregar usuários. Tente novamente.')
      setUsers([])
    }
  }

  // Carregar dados quando o componente montar ou a empresa mudar
  useEffect(() => {
    loadRoles()
  }, [selectedCompany])

  // Carregar usuários quando a empresa selecionada mudar
  useEffect(() => {
    loadUsers()
  }, [selectedCompany])

  // Dados mock para empresa (você pode substituir por dados reais)
  const companyData = {
    name: selectedCompany?.name || "Empresa Exemplo",
    cnpj: "12.345.678/0001-90",
    address: "Rua das Indústrias, 123 - São Paulo, SP",
    phone: "(11) 1234-5678",
    email: "contato@empresa.com",
    responsibleTechnician: "João Silva",
  }

  // Estados para formulários de integração
  const [esocialForm, setEsocialForm] = useState({
    cnpj: '',
    razaoSocial: '',
    certificado: null as File | null,
    senha: '',
    ambiente: 'producao' as 'producao' | 'homologacao'
  })

  const [emailForm, setEmailForm] = useState({
    servidor: '',
    porta: 587,
    usuario: '',
    senha: '',
    ssl: true,
    remetente: ''
  })

  const [smsForm, setSmsForm] = useState({
    provedor: '',
    apiKey: '',
    apiSecret: '',
    numeroRemetente: '',
    testeEnvio: ''
  })

  const [backupForm, setBackupForm] = useState({
    frequencia: 'diario',
    horario: '02:00',
    destino: 'local',
    chaveAcesso: '',
    chaveSecreta: '',
    retencao: 30,
    ativo: true
  })

  const openCompanyDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company)
      setCompanyForm({
        name: company.name,
        cnpj: company.cnpj || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || ''
      })
    } else {
      setEditingCompany(null)
      setCompanyForm({
        name: '',
        cnpj: '',
        email: '',
        phone: '',
        address: ''
      })
    }
    setIsCompanyDialogOpen(true)
  }

  const openUserDialog = (user?: User) => {
    if (!selectedCompany) {
      setUserError('Selecione uma empresa antes de gerenciar usuários')
      return
    }
    
    if (user) {
      setEditingUser(user)
    } else {
      setEditingUser(null)
    }
    setUserError(null)
    setIsUserDialogOpen(true)
  }

  const handleSaveUser = async (userData: Partial<User> & { password?: string, confirmPassword?: string }) => {
    if (!selectedCompany) {
      setUserError('Selecione uma empresa antes de gerenciar usuários')
      return
    }

    try {
      // Validação para novos usuários
      if (!editingUser) {
        if (!userData.password) {
          setUserError('A senha é obrigatória para novos usuários')
          return
        }
        if (userData.password !== userData.confirmPassword) {
          setUserError('As senhas não coincidem')
          return
        }
      }

      const method = editingUser ? 'PUT' : 'POST'
      const url = editingUser 
        ? `/api/users?id=${editingUser.id}&empresa_id=${selectedCompany.id}`
        : `/api/users?empresa_id=${selectedCompany.id}`
      
      const payload: any = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        status: userData.status,
        empresa_id: selectedCompany.id
      }
      
      // Para novos usuários, incluir a senha no payload
      if (!editingUser && userData.password) {
        payload.password = userData.password
      }
      
      // Para edição de usuários, incluir user_id no payload
      if (editingUser) {
        payload.user_id = editingUser.id
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error('Erro ao salvar usuário')
      }
      
      setIsUserDialogOpen(false)
      setEditingUser(null)
      loadUsers() // Recarrega a lista de usuários
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      setUserError('Erro ao salvar usuário. Tente novamente.')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!selectedCompany) {
      setUserError('Selecione uma empresa antes de gerenciar usuários')
      return
    }
    
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return

    try {
      const response = await fetch(`/api/users?id=${userId}&empresa_id=${selectedCompany.id}`, {
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

  const handleSaveEsocialConfig = async (testConnection = false) => {
    // Validações básicas
    if (!esocialForm.cnpj || !esocialForm.razaoSocial) {
      toast({
        title: "Erro de validação",
        description: "CNPJ e Razão Social são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    if (!esocialForm.certificado || !esocialForm.senha) {
      toast({
        title: "Erro de validação",
        description: "Certificado digital e senha são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    try {
      // Simular salvamento da configuração
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Aqui você implementaria a lógica real de salvamento
      // const supabase = createClient()
      // const { error } = await supabase
      //   .from('integracoes')
      //   .upsert({
      //     empresa_id: selectedCompany?.id,
      //     tipo: 'esocial',
      //     configuracao: esocialForm,
      //     ativo: true
      //   })
      
      // Atualizar estado das integrações
      setIntegrations(prev => prev.map(integration => 
        integration.name === 'eSocial' 
          ? { 
              ...integration, 
              status: 'active' as const,
              lastSync: new Date().toISOString()
            }
          : integration
      ))
      
      setIsEsocialDialogOpen(false)
      
      toast({
        title: "Configuração salva",
        description: "Integração eSocial configurada com sucesso.",
      })
      
      // Teste de conexão se solicitado
      if (testConnection) {
        toast({
          title: "Testando conexão",
          description: "Verificando conectividade com eSocial...",
        })
        
        // Simular teste de conexão
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        toast({
          title: "Teste concluído",
          description: "Conexão com eSocial estabelecida com sucesso.",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração do eSocial.",
        variant: "destructive",
      })
    }
  }

  const handleSaveEmailConfig = async (testConnection = false) => {
    // Validações básicas
    if (!emailForm.servidor || !emailForm.usuario || !emailForm.senha || !emailForm.remetente) {
      toast({
        title: "Erro de validação",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    try {
      // Simular salvamento da configuração
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Aqui você implementaria a lógica real de salvamento
      // const supabase = createClient()
      // const { error } = await supabase
      //   .from('integracoes')
      //   .upsert({
      //     empresa_id: selectedCompany?.id,
      //     tipo: 'email',
      //     configuracao: emailForm,
      //     ativo: true
      //   })
      
      // Atualizar estado das integrações
      setIntegrations(prev => prev.map(integration => 
        integration.name === 'E-mail' 
          ? { 
              ...integration, 
              status: 'active' as const,
              lastSync: new Date().toISOString()
            }
          : integration
      ))
      
      setIsEmailDialogOpen(false)
      
      toast({
        title: "Configuração salva",
        description: "Configuração de e-mail salva com sucesso.",
      })
      
      // Teste de conexão se solicitado
      if (testConnection) {
        toast({
          title: "Testando conexão",
          description: "Verificando configuração SMTP...",
        })
        
        // Simular teste de conexão
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Aqui você implementaria o teste real de SMTP
        // const testResult = await testSmtpConnection(emailForm)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração de e-mail.",
        variant: "destructive",
      })
    }
  }

  const handleSaveSmsConfig = async (testConnection = false) => {
    // Validações básicas
    if (!smsForm.provedor || !smsForm.apiKey || !smsForm.apiSecret) {
      toast({
        title: "Erro de validação",
        description: "Provedor, API Key e API Secret são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    try {
      // Simular salvamento da configuração
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Aqui você implementaria a lógica real de salvamento
      // const supabase = createClient()
      // const { error } = await supabase
      //   .from('integracoes')
      //   .upsert({
      //     empresa_id: selectedCompany?.id,
      //     tipo: 'sms',
      //     configuracao: smsForm,
      //     ativo: true
      //   })
      
      // Atualizar estado das integrações
      setIntegrations(prev => prev.map(integration => 
        integration.name === 'SMS' 
          ? { 
              ...integration, 
              status: 'active' as const,
              lastSync: new Date().toISOString()
            }
          : integration
      ))
      
      setIsSmsDialogOpen(false)
      
      toast({
        title: "Configuração salva",
        description: "Configuração de SMS salva com sucesso.",
      })
      
      // Teste de conexão se solicitado
      if (testConnection) {
        toast({
          title: "Testando conexão",
          description: "Verificando configuração do provedor...",
        })
        
        // Simular teste de conexão
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // Aqui você implementaria o teste real de SMS
        // const testResult = await testSmsProvider(smsForm)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração de SMS.",
        variant: "destructive",
      })
    }
  }

  const handleSaveBackupConfig = async () => {
    // Validações básicas
    if (!backupForm.frequencia || !backupForm.horario || !backupForm.destino) {
      toast({
        title: "Erro de validação",
        description: "Frequência, horário e destino são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    if (backupForm.destino !== 'local' && (!backupForm.chaveAcesso || !backupForm.chaveSecreta)) {
      toast({
        title: "Erro de validação",
        description: "Chaves de acesso são obrigatórias para destinos externos.",
        variant: "destructive",
      })
      return
    }

    try {
      // Simular salvamento da configuração
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Aqui você implementaria a lógica real de salvamento
      // const supabase = createClient()
      // const { error } = await supabase
      //   .from('integracoes')
      //   .upsert({
      //     empresa_id: selectedCompany?.id,
      //     tipo: 'backup',
      //     configuracao: backupForm,
      //     ativo: backupForm.ativo
      //   })
      
      // Atualizar estado das integrações
      setIntegrations(prev => prev.map(integration => 
        integration.name === 'Backup' 
          ? { 
              ...integration, 
              status: backupForm.ativo ? 'active' as const : 'inactive' as const,
              lastSync: new Date().toISOString()
            }
          : integration
      ))
      
      setIsBackupDialogOpen(false)
      
      toast({
        title: "Configuração salva",
        description: "Configuração de backup salva com sucesso.",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração de backup.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie configurações do sistema e usuários</p>
      </div>

      <Tabs defaultValue="company" className="space-y-4">
        <TabsList>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="companies">Empresas</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5" />
                <span>Informações da Empresa</span>
              </CardTitle>
              <CardDescription>Configure os dados básicos da sua empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Razão Social</Label>
                  <Input
                    id="company-name"
                    value={companyData.name}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={companyData.cnpj}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={companyData.address}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={companyData.phone}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    value={companyData.email}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="responsible">Responsável Técnico</Label>
                  <Input
                    id="responsible"
                    value={companyData.responsibleTechnician}
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    <span>Gestão de Empresas</span>
                  </CardTitle>
                  <CardDescription>Gerencie todas as empresas do sistema</CardDescription>
                </div>
                <Button onClick={() => openCompanyDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Empresa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {companies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {company.cnpj} • {company.phone} • {company.email}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={selectedCompany?.id === company.id ? "default" : "secondary"}>
                        {selectedCompany?.id === company.id ? "Selecionada" : "Disponível"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCompany(company)}
                      >
                        Selecionar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCompanyDialog(company)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dialog para Empresa */}
        <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingCompany ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
              <DialogDescription>
                {editingCompany 
                  ? "Edite as informações da empresa selecionada."
                  : "Cadastre uma nova empresa no sistema."
                }
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Razão Social *</Label>
                  <Input
                    id="company-name"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Digite a razão social"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-cnpj">CNPJ *</Label>
                  <Input
                    id="company-cnpj"
                    value={companyForm.cnpj}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                  {companyForm.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(companyForm.cnpj) && (
                    <p className="text-sm text-red-500">Formato de CNPJ inválido</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Endereço *</Label>
                <Input
                  id="company-address"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Digite o endereço completo"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Telefone</Label>
                  <Input
                    id="company-phone"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">E-mail</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@empresa.com"
                  />
                  {companyForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email) && (
                    <p className="text-sm text-red-500">Formato de e-mail inválido</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                // Aqui você implementaria a lógica de salvamento
                console.log('Salvando empresa:', companyForm)
                setIsCompanyDialogOpen(false)
              }}>
                <Save className="h-4 w-4 mr-2" />
                {editingCompany ? "Salvar Alterações" : "Cadastrar Empresa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Gestão de Usuários</span>
                  </CardTitle>
                  <CardDescription>Gerencie usuários e suas permissões</CardDescription>
                </div>
                <Button onClick={() => openUserDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedCompany ? (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Carregando usuários...</p>
                </div>
              ) : users.length === 0 ? (
                !selectedCompany ? (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Selecione uma empresa</h3>
                    <p className="text-sm text-muted-foreground">Selecione uma empresa para visualizar os usuários</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
                    <p className="text-sm text-muted-foreground">Nenhum usuário encontrado para esta empresa</p>
                    <p className="text-xs text-muted-foreground">Adicione usuários para começar</p>
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {userError && (
                    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">{userError}</p>
                    </div>
                  )}
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{user.name}</h3>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>
                            {user.status === "active" 
                              ? "Ativo" 
                              : user.status === "inactive" 
                              ? "Inativo" 
                              : "Usuário"
                            }
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {user.email} • {user.role}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.department} • Último acesso: {new Date(user.lastLogin).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openUserDialog(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Gestão de Funções e Permissões</span>
                  </CardTitle>
                  <CardDescription>Configure as permissões das funções do sistema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingRoles ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Carregando funções...</p>
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="mt-2 text-sm font-semibold text-muted-foreground">Nenhuma função cadastrada</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Comece criando sua primeira função personalizada.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roles.map((role) => (
                    <div key={role.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-semibold flex items-center space-x-2">
                              <span>{role.name}</span>
                              {role.isDefault && (
                                <Badge variant="outline" className="text-xs">
                                  Padrão
                                </Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {role.isEditable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRoleDialog(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {!role.isEditable && (
                            <Badge variant="secondary" className="text-xs">
                              Não editável
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Object.entries(role.permissions).map(([module, hasPermission]) => (
                          <div key={module} className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              hasPermission ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span className="text-xs text-muted-foreground">{module}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Configurações de Notificações</span>
              </CardTitle>
              <CardDescription>Configure como e quando receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações por E-mail</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações importantes por e-mail
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações push no navegador
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Relatórios Semanais</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba um resumo semanal das atividades
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertas de Vencimento</Label>
                    <p className="text-sm text-muted-foreground">
                      Seja notificado sobre documentos e certificados próximos do vencimento
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => (
              <Card key={integration.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>{integration.name}</span>
                    </CardTitle>
                    <Badge 
                      variant={
                        integration.status === "active" 
                          ? "default" 
                          : integration.status === "error" 
                          ? "destructive" 
                          : "secondary"
                      }
                    >
                      {integration.status === "active" 
                        ? "Ativo" 
                        : integration.status === "error" 
                        ? "Erro" 
                        : "Inativo"
                      }
                    </Badge>
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {integration.lastSync && (
                      <p className="text-sm text-muted-foreground">
                        Última sincronização: {new Date(integration.lastSync).toLocaleString("pt-BR")}
                      </p>
                    )}
                    <Button 
                      className="w-full" 
                      variant={integration.status === "active" ? "outline" : "default"}
                      onClick={() => {
                        if (integration.name === "eSocial") {
                          setIsEsocialDialogOpen(true)
                        } else if (integration.name === "E-mail") {
                          setIsEmailDialogOpen(true)
                        } else if (integration.name === "SMS") {
                          setIsSmsDialogOpen(true)
                        } else if (integration.name === "Backup") {
                          setIsBackupDialogOpen(true)
                        }
                      }}
                    >
                      {integration.status === "active" ? "Configurar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Usuário */}
      <Dialog open={isUserDialogOpen} onOpenChange={(open) => {
        setIsUserDialogOpen(open)
        if (!open) setEditingUser(null)
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? "Edite as informações do usuário selecionado."
                : "Cadastre um novo usuário no sistema."
              }
            </DialogDescription>
          </DialogHeader>
          <UserForm
            user={editingUser}
            onSave={handleSaveUser}
            onCancel={() => setIsUserDialogOpen(false)}
            error={userError}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de Função */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Editar Função" : "Nova Função"}</DialogTitle>
            <DialogDescription>
              {editingRole 
                ? "Edite as informações e permissões da função selecionada."
                : "Crie uma nova função personalizada com permissões específicas."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Função</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="Ex: Supervisor de Segurança"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={newRoleDescription}
                onChange={(e) => setNewRoleDescription(e.target.value)}
                placeholder="Descreva as responsabilidades desta função..."
              />
            </div>
            <div className="space-y-3">
              <Label>Permissões de Módulos</Label>
              <div className="grid grid-cols-2 gap-3">
                {availableModules.map((module) => (
                  <div key={module} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`module-${module}`}
                      checked={newRolePermissions[module] || false}
                      onChange={(e) => handlePermissionChange(module, e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor={`module-${module}`} className="text-sm">
                      {module}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRole}>
              <Save className="h-4 w-4 mr-2" />
              {editingRole ? "Salvar Alterações" : "Criar Função"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Configuração eSocial */}
      <Dialog open={isEsocialDialogOpen} onOpenChange={setIsEsocialDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuração eSocial</DialogTitle>
            <DialogDescription>
              Configure a integração com o sistema eSocial do governo federal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>CNPJ da Empresa</Label>
                <Input
                  value={esocialForm.cnpj}
                  onChange={(e) => setEsocialForm(prev => ({ ...prev, cnpj: e.target.value }))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>Razão Social</Label>
                <Input
                  value={esocialForm.razaoSocial}
                  onChange={(e) => setEsocialForm(prev => ({ ...prev, razaoSocial: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Certificado Digital (A1)</Label>
              <Input
                type="file"
                accept=".p12,.pfx"
                onChange={(e) => setEsocialForm(prev => ({ ...prev, certificado: e.target.files?.[0] || null }))}
              />
              <p className="text-xs text-muted-foreground">
                Selecione o arquivo do certificado digital A1 (.p12 ou .pfx)
              </p>
            </div>
            
            <div className="space-y-2">
               <Label>Senha do Certificado</Label>
               <Input
                 type="password"
                 value={esocialForm.senha}
                 onChange={(e) => setEsocialForm(prev => ({ ...prev, senha: e.target.value }))}
                 placeholder="Digite a senha do certificado"
               />
             </div>
             
             <div className="space-y-2">
               <Label>Ambiente</Label>
               <Select 
                 value={esocialForm.ambiente} 
                 onValueChange={(value: 'producao' | 'homologacao') => setEsocialForm(prev => ({ ...prev, ambiente: value }))}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="homologacao">Homologação</SelectItem>
                   <SelectItem value="producao">Produção</SelectItem>
                 </SelectContent>
               </Select>
             </div>
           </div>
           
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsEsocialDialogOpen(false)}>
               Cancelar
             </Button>
             <Button onClick={() => handleSaveEsocialConfig()}>
               <Save className="h-4 w-4 mr-2" />
               Salvar Configuração
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Dialog de Configuração de E-mail */}
       <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
         <DialogContent className="max-w-xl">
           <DialogHeader>
             <DialogTitle>Configuração de E-mail</DialogTitle>
             <DialogDescription>
               Configure o servidor SMTP para envio de e-mails do sistema
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="grid gap-4 md:grid-cols-2">
               <div className="space-y-2">
                 <Label>Servidor SMTP</Label>
                 <Input
                   value={emailForm.servidor}
                   onChange={(e) => setEmailForm(prev => ({ ...prev, servidor: e.target.value }))}
                   placeholder="smtp.gmail.com"
                 />
               </div>
               
               <div className="space-y-2">
                 <Label>Porta</Label>
                 <Input
                   type="number"
                   value={emailForm.porta}
                   onChange={(e) => setEmailForm(prev => ({ ...prev, porta: parseInt(e.target.value) }))}
                   placeholder="587"
                 />
               </div>
             </div>
             
             <div className="space-y-2">
               <Label>Usuário/E-mail</Label>
               <Input
                 value={emailForm.usuario}
                 onChange={(e) => setEmailForm(prev => ({ ...prev, usuario: e.target.value }))}
                 placeholder="seu-email@empresa.com"
               />
             </div>
             
             <div className="space-y-2">
               <Label>Senha</Label>
               <Input
                 type="password"
                 value={emailForm.senha}
                 onChange={(e) => setEmailForm(prev => ({ ...prev, senha: e.target.value }))}
                 placeholder="Digite a senha"
               />
             </div>
             
             <div className="space-y-2">
               <Label>E-mail Remetente</Label>
               <Input
                 value={emailForm.remetente}
                 onChange={(e) => setEmailForm(prev => ({ ...prev, remetente: e.target.value }))}
                 placeholder="noreply@empresa.com"
               />
             </div>
             
             <div className="flex items-center space-x-2">
               <input
                 type="checkbox"
                 id="ssl"
                 checked={emailForm.ssl}
                 onChange={(e) => setEmailForm(prev => ({ ...prev, ssl: e.target.checked }))}
                 className="rounded"
               />
               <Label htmlFor="ssl">Usar SSL/TLS</Label>
             </div>
           </div>
           
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
               Cancelar
             </Button>
             <Button onClick={() => handleSaveEmailConfig()}>
               <Save className="h-4 w-4 mr-2" />
               Salvar Configuração
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Dialog de Configuração de SMS */}
       <Dialog open={isSmsDialogOpen} onOpenChange={setIsSmsDialogOpen}>
         <DialogContent className="max-w-xl">
           <DialogHeader>
             <DialogTitle>Configuração SMS</DialogTitle>
             <DialogDescription>
               Configure o provedor de SMS para envio de mensagens
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Provedor</Label>
               <Select 
                 value={smsForm.provedor} 
                 onValueChange={(value) => setSmsForm(prev => ({ ...prev, provedor: value }))}
               >
                 <SelectTrigger>
                   <SelectValue placeholder="Selecione um provedor" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="twilio">Twilio</SelectItem>
                   <SelectItem value="zenvia">Zenvia</SelectItem>
                   <SelectItem value="totalvoice">TotalVoice</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div className="grid gap-4 md:grid-cols-2">
               <div className="space-y-2">
                 <Label>API Key</Label>
                 <Input
                   value={smsForm.apiKey}
                   onChange={(e) => setSmsForm(prev => ({ ...prev, apiKey: e.target.value }))}
                   placeholder="Sua chave da API"
                 />
               </div>
               
               <div className="space-y-2">
                 <Label>API Secret</Label>
                 <Input
                   type="password"
                   value={smsForm.apiSecret}
                   onChange={(e) => setSmsForm(prev => ({ ...prev, apiSecret: e.target.value }))}
                   placeholder="Seu secret da API"
                 />
               </div>
             </div>
             
             <div className="space-y-2">
               <Label>Número Remetente</Label>
               <Input
                 value={smsForm.numeroRemetente}
                 onChange={(e) => setSmsForm(prev => ({ ...prev, numeroRemetente: e.target.value }))}
                 placeholder="+5511999999999"
               />
             </div>
           </div>
           
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsSmsDialogOpen(false)}>
               Cancelar
             </Button>
             <Button onClick={() => handleSaveSmsConfig()}>
               <Save className="h-4 w-4 mr-2" />
               Salvar Configuração
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

       {/* Dialog de Configuração de Backup */}
       <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
         <DialogContent className="max-w-xl">
           <DialogHeader>
             <DialogTitle>Configuração de Backup</DialogTitle>
             <DialogDescription>
               Configure backups automáticos do sistema
             </DialogDescription>
           </DialogHeader>
           
           <div className="space-y-4">
             <div className="space-y-2">
               <Label>Frequência</Label>
               <Select 
                 value={backupForm.frequencia} 
                 onValueChange={(value) => setBackupForm(prev => ({ ...prev, frequencia: value }))}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="diario">Diário</SelectItem>
                   <SelectItem value="semanal">Semanal</SelectItem>
                   <SelectItem value="mensal">Mensal</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             <div className="space-y-2">
               <Label>Horário</Label>
               <Input
                 type="time"
                 value={backupForm.horario}
                 onChange={(e) => setBackupForm(prev => ({ ...prev, horario: e.target.value }))}
               />
             </div>
             
             <div className="space-y-2">
               <Label>Destino</Label>
               <Select 
                 value={backupForm.destino} 
                 onValueChange={(value) => setBackupForm(prev => ({ ...prev, destino: value }))}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="local">Armazenamento Local</SelectItem>
                   <SelectItem value="aws">Amazon S3</SelectItem>
                   <SelectItem value="google">Google Drive</SelectItem>
                   <SelectItem value="dropbox">Dropbox</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             
             {backupForm.destino !== 'local' && (
               <div className="grid gap-4 md:grid-cols-2">
                 <div className="space-y-2">
                   <Label>Chave de Acesso</Label>
                   <Input
                     value={backupForm.chaveAcesso}
                     onChange={(e) => setBackupForm(prev => ({ ...prev, chaveAcesso: e.target.value }))}
                     placeholder="Chave de acesso"
                   />
                 </div>
                 
                 <div className="space-y-2">
                   <Label>Chave Secreta</Label>
                   <Input
                     type="password"
                     value={backupForm.chaveSecreta}
                     onChange={(e) => setBackupForm(prev => ({ ...prev, chaveSecreta: e.target.value }))}
                     placeholder="Chave secreta"
                   />
                 </div>
               </div>
             )}
             
             <div className="space-y-2">
               <Label>Retenção (dias)</Label>
               <Input
                 type="number"
                 value={backupForm.retencao}
                 onChange={(e) => setBackupForm(prev => ({ ...prev, retencao: parseInt(e.target.value) }))}
                 placeholder="30"
               />
             </div>
             
             <div className="flex items-center space-x-2">
               <input
                 type="checkbox"
                 id="backupAtivo"
                 checked={backupForm.ativo}
                 onChange={(e) => setBackupForm(prev => ({ ...prev, ativo: e.target.checked }))}
                 className="rounded"
               />
               <Label htmlFor="backupAtivo">Ativar backup automático</Label>
             </div>
           </div>
           
           <DialogFooter>
             <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>
               Cancelar
             </Button>
             <Button onClick={() => handleSaveBackupConfig()}>
               <Save className="h-4 w-4 mr-2" />
               Salvar Configuração
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   )
 }

 // Componente UserForm que precisa ser criado
 function UserForm({ user, onSave, onCancel, error }: {
   user: User | null
   onSave: (userData: Partial<User> & { password?: string, confirmPassword?: string }) => void
   onCancel: () => void
   error: string | null
 }) {
   const [formData, setFormData] = useState({
     name: user?.name || '',
     email: user?.email || '',
     role: user?.role || 'Usuário',
     department: user?.department || '',
     status: user?.status || 'active' as 'active' | 'inactive',
     password: '',
     confirmPassword: ''
   })

   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault()
     onSave(formData)
   }

   return (
     <form onSubmit={handleSubmit} className="space-y-4">
       {error && (
         <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
           <p className="text-sm text-red-600">{error}</p>
         </div>
       )}
       
       <div className="space-y-2">
         <Label htmlFor="name">Nome *</Label>
         <Input
           id="name"
           value={formData.name}
           onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
           placeholder="Digite o nome completo"
           required
         />
       </div>
       
       <div className="space-y-2">
         <Label htmlFor="email">E-mail *</Label>
         <Input
           id="email"
           type="email"
           value={formData.email}
           onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
           placeholder="usuario@empresa.com"
           required
         />
       </div>
       
       <div className="space-y-2">
         <Label htmlFor="role">Função *</Label>
         <Select
           value={formData.role}
           onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
         >
           <SelectTrigger>
             <SelectValue placeholder="Selecione uma função" />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="Administrador">Administrador</SelectItem>
             <SelectItem value="Gerente">Gerente</SelectItem>
             <SelectItem value="Usuário">Usuário</SelectItem>
             <SelectItem value="Visualizador">Visualizador</SelectItem>
           </SelectContent>
         </Select>
       </div>
       
       <div className="space-y-2">
         <Label htmlFor="department">Departamento</Label>
         <Input
           id="department"
           value={formData.department}
           onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
           placeholder="Ex: Recursos Humanos, Segurança do Trabalho"
         />
       </div>
       
       <div className="space-y-2">
         <Label htmlFor="status">Status</Label>
         <Select
           value={formData.status}
           onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, status: value }))}
         >
           <SelectTrigger>
             <SelectValue />
           </SelectTrigger>
           <SelectContent>
             <SelectItem value="active">Ativo</SelectItem>
             <SelectItem value="inactive">Inativo</SelectItem>
           </SelectContent>
         </Select>
       </div>
       
       {!user && (
         <>
           <div className="space-y-2">
             <Label htmlFor="password">Senha *</Label>
             <Input
               id="password"
               type="password"
               value={formData.password}
               onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
               placeholder="Digite a senha (mínimo 6 caracteres)"
               required={!user}
             />
           </div>
           
           <div className="space-y-2">
             <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
             <Input
               id="confirmPassword"
               type="password"
               value={formData.confirmPassword}
               onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
               placeholder="Confirme a senha"
               required={!user}
             />
           </div>
         </>
       )}
       
       <DialogFooter>
         <Button type="button" variant="outline" onClick={onCancel}>
           Cancelar
         </Button>
         <Button type="submit">
           <Save className="h-4 w-4 mr-2" />
           {user ? "Salvar Alterações" : "Criar Usuário"}
         </Button>
       </DialogFooter>
     </form>
   )
 }

 // Função toast mock (você deve substituir pela implementação real)
 function toast({ title, description, variant }: { title: string; description: string; variant?: 'default' | 'destructive' }) {
   console.log(`Toast: ${title} - ${description} (${variant || 'default'})`)
 }

 // Export default para compatibilidade com lazy loading
 export default SettingsComponent
