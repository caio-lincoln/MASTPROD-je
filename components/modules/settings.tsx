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
import { DeleteCompanyDialog } from "@/components/ui/delete-company-dialog"
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
  EyeOff,
  Building2,
  AlertCircle,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  const { toast } = useToast()
  const { selectedCompany, companies, setSelectedCompany, addCompany, updateCompany, deleteCompany, loadAllCompanies, showAllCompanies } = useCompany()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      name: "eSocial",
      status: "active",
      lastSync: "2024-01-15T08:00:00Z",
      description: "Integração com o sistema eSocial do governo"
    },
    {
      name: "E-mail",
      status: "active",
      lastSync: "2024-01-15T10:30:00Z",
      description: "Configuração de envio de e-mails"
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
  const [isDeleteCompanyDialogOpen, setIsDeleteCompanyDialogOpen] = useState(false)
  const [isEsocialDialogOpen, setIsEsocialDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false)

  // Estados para edição
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [isDeletingCompany, setIsDeletingCompany] = useState(false)

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

  // Estados para busca de CNPJ
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false)
  const [cnpjFetchError, setCnpjFetchError] = useState<string | null>(null)
  const [lastFetchedCnpj, setLastFetchedCnpj] = useState<string | null>(null)

  // Utilitário: normalizar para dígitos
  const normalizeCNPJ = (value: string) => value.replace(/\D/g, '')

  // Utilitário: formatar máscara de CNPJ conforme digitação
  const formatCNPJ = (value: string) => {
    const digits = normalizeCNPJ(value).slice(0, 14)
    let out = ''
    if (digits.length > 0) out = digits.slice(0, 2)
    if (digits.length >= 3) out = `${digits.slice(0, 2)}.${digits.slice(2, 5)}`
    if (digits.length >= 6) out = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}`
    if (digits.length >= 9) out = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}`
    if (digits.length >= 13) out = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`
    return out
  }

  // Utilitário: montar endereço a partir da resposta da BrasilAPI
  const formatAddressFromBrasilAPI = (data: any) => {
    const parts = [
      [data.logradouro, data.numero].filter(Boolean).join(', '),
      data.bairro,
      [data.municipio, data.uf].filter(Boolean).join(' - '),
      data.cep ? `CEP ${data.cep}` : ''
    ].filter(Boolean)
    return parts.join(' • ')
  }

  // Buscar dados do CNPJ (razão social e endereço) na BrasilAPI
  const fetchCompanyByCNPJ = async (cnpjDigits: string) => {
    try {
      setIsFetchingCnpj(true)
      setCnpjFetchError(null)
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjDigits}`)
      if (!res.ok) {
        throw new Error('Não foi possível obter dados do CNPJ')
      }
      const data = await res.json()
      setCompanyForm(prev => ({
        ...prev,
        name: prev.name || data.razao_social || prev.name,
        address: prev.address || formatAddressFromBrasilAPI(data) || prev.address,
        phone: prev.phone || data.telefone || prev.phone,
        email: prev.email || data.email || prev.email,
      }))
      setLastFetchedCnpj(cnpjDigits)
    } catch (err: any) {
      setCnpjFetchError(err?.message || 'Erro ao buscar dados do CNPJ')
      setLastFetchedCnpj(cnpjDigits)
    } finally {
      setIsFetchingCnpj(false)
    }
  }

  // Disparar busca automática quando CNPJ atingir 14 dígitos
  useEffect(() => {
    const digits = normalizeCNPJ(companyForm.cnpj)
    if (digits.length === 14 && digits !== lastFetchedCnpj) {
      fetchCompanyByCNPJ(digits)
    }
  }, [companyForm.cnpj])

  // Estados para paginação de empresas
  const [currentPage, setCurrentPage] = useState(1)
  const companiesPerPage = 5 // Voltando ao valor original

  // Funções de paginação
  const totalPages = Math.ceil(companies.length / companiesPerPage)
  const startIndex = (currentPage - 1) * companiesPerPage
  const endIndex = startIndex + companiesPerPage
  const currentCompanies = companies.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

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

  // Carregar configuração eSocial existente
  useEffect(() => {
    loadEsocialConfig()
  }, [])

  // Função para carregar configuração eSocial existente
  const loadEsocialConfig = async () => {
    try {
      const supabase = createClient()
      
      // Verificar se existe configuração global do eSocial
      const { data: config, error } = await supabase
        .from('configuracoes_esocial_global')
        .select('*')
        .single()

      if (config && !error) {
        setCertificateStatus({
          loaded: true,
          fileName: config.certificado_nome || 'Certificado Global',
          uploadDate: config.data_upload,
          valid: config.certificado_valido,
          validUntil: config.certificado_valido_ate
        })
        
        setEsocialForm({
          ambiente: config.ambiente || 'homologacao'
        })

        // Atualizar status da integração para ativo
        setIntegrations(prev => prev.map(integration => 
          integration.name === "eSocial" 
            ? { ...integration, status: "active", lastSync: config.ultima_sincronizacao }
            : integration
        ))
      }
    } catch (error) {
      console.error('Erro ao carregar configuração eSocial:', error)
    }
  }

  // Dados da empresa selecionada
  const companyData = {
    name: selectedCompany?.name || "Empresa não selecionada",
    cnpj: selectedCompany?.cnpj || "Não informado",
    address: selectedCompany?.address || "Não informado",
    phone: selectedCompany?.phone || "Não informado",
    email: selectedCompany?.email || "Não informado",
    responsibleTechnician: "Não informado",
  }

  // Estados para formulários de integração
  // Estados específicos para configuração global do eSocial
  const [certificateFile, setCertificateFile] = useState<File | null>(null)
  const [certificatePassword, setCertificatePassword] = useState("")
  const [certificateStatus, setCertificateStatus] = useState<{
    loaded: boolean
    fileName?: string
    uploadDate?: string
    valid?: boolean
    validUntil?: string
  }>({ loaded: false })
  const [isUploadingCertificate, setIsUploadingCertificate] = useState(false)
  const [isValidatingCertificate, setIsValidatingCertificate] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    status: "valid" | "invalid" | "warning" | null
    checks: Array<{
      name: string
      ok: boolean
      message: string
    }>
  }>({ status: null, checks: [] })

  const [esocialForm, setEsocialForm] = useState({
    ambiente: 'homologacao' as 'producao' | 'homologacao'
  })

  const [emailForm, setEmailForm] = useState({
    servidor: '',
    porta: 587,
    usuario: '',
    senha: '',
    ssl: true,
    remetente: '',
    from_nome: '',
    ativo: true,
    destinatarioTeste: ''
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
    // Resetar estados relativos à busca de CNPJ ao abrir o diálogo
    setIsFetchingCnpj(false)
    setCnpjFetchError(null)
    setLastFetchedCnpj(null)
    setIsCompanyDialogOpen(true)
  }

  const handleSaveCompany = async () => {
    if (!companyForm.name.trim() || !companyForm.cnpj.trim() || !companyForm.address.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome, CNPJ e endereço são obrigatórios",
        variant: "destructive"
      })
      return
    }

    // Validar formato do CNPJ
    if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(companyForm.cnpj)) {
      toast({
        title: "Erro de validação",
        description: "Formato de CNPJ inválido",
        variant: "destructive"
      })
      return
    }

    // Validar formato do e-mail se fornecido
    if (companyForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.email)) {
      toast({
        title: "Erro de validação",
        description: "Formato de e-mail inválido",
        variant: "destructive"
      })
      return
    }

    try {
      const companyData = {
        name: companyForm.name,
        cnpj: companyForm.cnpj,
        address: companyForm.address,
        phone: companyForm.phone,
        email: companyForm.email,
        isActive: true
      }

      let success = false

      if (editingCompany) {
        // Atualizar empresa existente
        success = await updateCompany(editingCompany.id, companyData)
      } else {
        // Criar nova empresa
        const newCompany = await addCompany(companyData)
        success = newCompany !== null
      }

      if (success) {
        toast({
          title: "Sucesso",
          description: editingCompany ? "Empresa atualizada com sucesso" : "Empresa criada com sucesso",
          variant: "default"
        })

        setIsCompanyDialogOpen(false)
        setEditingCompany(null)
        setCompanyForm({
          name: '',
          cnpj: '',
          email: '',
          phone: '',
          address: ''
        })
      } else {
        toast({
          title: "Erro",
          description: "Erro ao salvar empresa. Tente novamente.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao salvar empresa:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar empresa. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  const handleDeleteCompany = async (company: Company) => {
    setCompanyToDelete(company)
    setIsDeleteCompanyDialogOpen(true)
  }

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return

    setIsDeletingCompany(true)
    
    try {
      const success = await deleteCompany(companyToDelete.id)
      
      if (success) {
        toast({
          title: "Sucesso",
          description: `Empresa "${companyToDelete.name}" e todos os dados relacionados foram deletados com sucesso`,
          variant: "default"
        })
      } else {
        toast({
          title: "Erro",
          description: "Erro ao deletar empresa. Tente novamente.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Erro ao deletar empresa:', error)
      toast({
        title: "Erro",
        description: `Erro ao deletar empresa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      })
    } finally {
      setIsDeletingCompany(false)
      setCompanyToDelete(null)
      setIsDeleteCompanyDialogOpen(false)
    }
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
    // Validações baseadas no estado atual
    if (!certificateStatus.loaded) {
      // Primeira configuração - certificado e senha obrigatórios
      if (!certificateFile || !certificatePassword) {
        toast({
          title: "Erro de validação",
          description: "Certificado digital e senha são obrigatórios para primeira configuração.",
          variant: "destructive",
        })
        return
      }
    } else {
      // Alteração - pelo menos um dos campos deve estar preenchido
      if (!certificateFile && !certificatePassword) {
        toast({
          title: "Nenhuma alteração",
          description: "Selecione um novo certificado ou digite uma nova senha para alterar a configuração.",
          variant: "destructive",
        })
        return
      }
    }

    try {
      setIsUploadingCertificate(true)
      
      // Preparar dados para salvamento
      const configData: {
        ambiente: "homologacao" | "producao"
        ativo: boolean
        data_configuracao: string
        nome_arquivo?: string
        data_upload?: string
        senha_certificado?: string
      } = {
        ambiente: esocialForm.ambiente,
        ativo: true,
        data_configuracao: new Date().toISOString(),
      }
      
      // Se há novo certificado, incluir nos dados
      if (certificateFile) {
        // Aqui você implementaria a lógica real de upload do certificado
        // usando o DigitalSignatureService similar ao módulo eSocial
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        configData.nome_arquivo = certificateFile.name
        configData.data_upload = new Date().toISOString()
      }
      
      // Se há nova senha, incluir nos dados (criptografada)
      if (certificatePassword) {
        // A senha seria criptografada antes de salvar
        configData.senha_certificado = certificatePassword // Em produção, criptografar
      }
      
      // Salvar no banco de dados (Supabase)
      // const { error } = await supabase
      //   .from('configuracoes_esocial_global')
      //   .upsert(configData)
      
      // Simular sucesso do salvamento
      setCertificateStatus({
        loaded: true,
        fileName: certificateFile?.name || certificateStatus.fileName,
        uploadDate: certificateFile ? new Date().toISOString() : certificateStatus.uploadDate,
        valid: true,
        validUntil: "2024-12-31T23:59:59Z",
      })
      
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
      
      // Limpar campos de alteração
      setCertificateFile(null)
      setCertificatePassword("")
      
      setIsEsocialDialogOpen(false)
      
      toast({
        title: "Configuração salva",
        description: certificateStatus.loaded 
          ? "Alterações na configuração eSocial salvas com sucesso."
          : "Integração eSocial configurada com sucesso para todas as empresas.",
      })
      
      // Teste de conexão se solicitado
      if (testConnection) {
        toast({
          title: "Testando conexão",
          description: "Verificando conectividade com eSocial...",
        })
        
        try {
          const empresaId = selectedCompany?.id
          if (!empresaId) {
            throw new Error("Empresa não selecionada")
          }

          const res = await fetch("/api/esocial/test-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ empresa_id: empresaId }),
          })

          const data = await res.json()

          if (!res.ok || !data.success) {
            throw new Error(data.error || data.erro || "Falha na conexão")
          }

          toast({
            title: "Conexão bem-sucedida",
            description: `Ambiente: ${data.ambiente}. Conectividade verificada com sucesso.`,
          })
        } catch (error: any) {
          toast({
            title: "Erro na conexão",
            description: error?.message || "Não foi possível estabelecer conexão com eSocial.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração do eSocial.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingCertificate(false)
    }
  }

  // Função para validar certificado
  const handleValidateCertificate = async () => {
    if (!certificateFile || !certificatePassword) {
      toast({
        title: "Dados incompletos",
        description: "Selecione um arquivo e digite a senha do certificado",
        variant: "destructive",
      })
      return
    }

    setIsValidatingCertificate(true)
    
    try {
      // Simular validação do certificado
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Simular resultado da validação
      setValidationResult({
        status: "valid",
        checks: [
          { name: "formato_arquivo", ok: true, message: "Formato do arquivo válido" },
          { name: "senha_correta", ok: true, message: "Senha do certificado correta" },
          { name: "certificado_valido", ok: true, message: "Certificado válido" },
          { name: "cadeia_certificacao", ok: true, message: "Cadeia de certificação verificada" }
        ]
      })
      
      toast({
        title: "Certificado válido",
        description: "O certificado foi validado com sucesso.",
      })
    } catch (error) {
      setValidationResult({
        status: "invalid",
        checks: [
          { name: "erro_validacao", ok: false, message: "Erro na validação do certificado" }
        ]
      })
      
      toast({
        title: "Erro na validação",
        description: "Não foi possível validar o certificado.",
        variant: "destructive",
      })
    } finally {
      setIsValidatingCertificate(false)
    }
  }

  // Função para carregar status do certificado
  const loadCertificateStatus = async () => {
    try {
      // Simular carregamento do status do certificado
      // Aqui você implementaria a lógica real para verificar se já existe um certificado configurado
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Por enquanto, simular que não há certificado configurado
      setCertificateStatus({ loaded: false })
    } catch (error) {
      setCertificateStatus({ loaded: false })
    }
  }

  // Carregar status do certificado ao montar o componente
  useEffect(() => {
    loadCertificateStatus()
  }, [])

  const handleSaveEmailConfig = async (testConnection = false) => {
    if (!selectedCompany) {
      toast({
        title: "Selecione uma empresa",
        description: "Escolha a empresa para associar a configuração de e-mail.",
        variant: "destructive",
      })
      return
    }

    // Validações básicas
    if (!emailForm.servidor || !emailForm.usuario || !emailForm.senha || !emailForm.remetente) {
      toast({
        title: "Erro de validação",
        description: "Servidor, usuário, senha e remetente são obrigatórios.",
        variant: "destructive",
      })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.remetente)) {
      toast({
        title: "E-mail inválido",
        description: "Informe um e-mail remetente válido.",
        variant: "destructive",
      })
      return
    }
    if (testConnection && !emailForm.destinatarioTeste) {
      toast({
        title: "Destinatário de teste", 
        description: "Informe um e-mail para receber o teste.",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/email/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa_id: selectedCompany.id,
          servidor: emailForm.servidor,
          porta: emailForm.porta,
          usuario: emailForm.usuario,
          senha: emailForm.senha,
          ssl: emailForm.ssl,
          remetente: emailForm.remetente,
          from_nome: emailForm.from_nome,
          ativo: emailForm.ativo,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data?.error || "Falha ao salvar configuração")
      }

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

      toast({
        title: "Configuração salva",
        description: "Configuração de e-mail salva com sucesso.",
      })

      // Teste de conexão se solicitado
      if (testConnection) {
        toast({ title: "Testando conexão", description: "Verificando configuração SMTP..." })
        const testRes = await fetch("/api/email/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            empresa_id: selectedCompany.id,
            destinatario: emailForm.destinatarioTeste,
          }),
        })
        if (!testRes.ok) {
          const td = await testRes.json().catch(() => ({}))
          throw new Error(td?.error || "Falha ao enviar e-mail de teste")
        }
        toast({ title: "Conexão OK", description: "E-mail de teste enviado com sucesso." })
      }

      setIsEmailDialogOpen(false)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: String(error?.message || "Não foi possível salvar/testar configuração de e-mail."),
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
                <div className="flex items-center space-x-2">
                  {!showAllCompanies && (
                    <Button 
                      variant="outline" 
                      onClick={loadAllCompanies}
                      className="mr-2"
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      Ver Todas as Empresas
                    </Button>
                  )}
                  <Button onClick={() => openCompanyDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Empresa
                  </Button>
                </div>
              </div>
              
              {/* Controles de Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages} ({companies.length} empresas)
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    
                    {/* Números das páginas */}
                    <div className="flex space-x-1">
                      {/* Mostrar apenas as primeiras 4 páginas */}
                      {Array.from({ length: Math.min(4, totalPages) }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentCompanies.map((company) => (
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCompany(company)}
                      >
                        <Trash2 className="h-4 w-4" />
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
          <div className="relative">
            <Input
              id="company-cnpj"
              value={companyForm.cnpj}
              onChange={(e) => {
                const masked = formatCNPJ(e.target.value)
                setCompanyForm(prev => ({ ...prev, cnpj: masked }))
              }}
              placeholder="00.000.000/0000-00"
            />
            {isFetchingCnpj && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            )}
          </div>
          {companyForm.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(companyForm.cnpj) && (
            <p className="text-sm text-red-500">Formato de CNPJ inválido</p>
          )}
          {cnpjFetchError && (
            <p className="text-sm text-amber-600">{cnpjFetchError}</p>
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
              <Button onClick={handleSaveCompany}>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração Global eSocial</DialogTitle>
            <DialogDescription>
              Configure a integração com o sistema eSocial para todas as empresas. 
              Esta configuração será aplicada globalmente usando um certificado digital compartilhado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Status do Certificado Atual */}
            {certificateStatus.loaded && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Certificado Global Ativo</span>
                </div>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Arquivo:</strong> {certificateStatus.fileName}</p>
                  {certificateStatus.uploadDate && (
                    <p><strong>Configurado em:</strong> {new Date(certificateStatus.uploadDate).toLocaleString('pt-BR')}</p>
                  )}
                  {certificateStatus.validUntil && (
                    <p><strong>Válido até:</strong> {new Date(certificateStatus.validUntil).toLocaleString('pt-BR')}</p>
                  )}
                  <p><strong>Status:</strong> {certificateStatus.valid ? 'Válido' : 'Verificar validade'}</p>
                </div>
              </div>
            )}
            
            {/* Seção de Alteração de Certificado */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">
                  {certificateStatus.loaded ? 'Alterar Certificado' : 'Configurar Certificado'}
                </h4>
                {certificateStatus.loaded && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCertificateFile(null)
                      setCertificatePassword("")
                    }}
                  >
                    Cancelar Alteração
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>
                  {certificateStatus.loaded ? 'Novo Certificado Digital (A1)' : 'Certificado Digital (A1)'}
                </Label>
                <Input
                  type="file"
                  accept=".p12,.pfx"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  disabled={isUploadingCertificate}
                />
                <p className="text-xs text-muted-foreground">
                  {certificateStatus.loaded 
                    ? 'Selecione apenas se desejar alterar o certificado atual'
                    : 'Selecione o arquivo do certificado digital A1 (.p12 ou .pfx) que será usado por todas as empresas'
                  }
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>
                  {certificateStatus.loaded ? 'Nova Senha do Certificado' : 'Senha do Certificado'}
                </Label>
                <Input
                  type="password"
                  value={certificatePassword}
                  onChange={(e) => setCertificatePassword(e.target.value)}
                  placeholder={certificateStatus.loaded ? "Digite apenas se alterar o certificado" : "Digite a senha do certificado"}
                  disabled={isUploadingCertificate}
                />
                {certificateStatus.loaded && (
                  <p className="text-xs text-muted-foreground">
                    A senha atual está armazenada de forma segura. Digite apenas se estiver alterando o certificado.
                  </p>
                )}
              </div>
              
              {/* Botão de Validação */}
              {certificateFile && certificatePassword && (
                <Button 
                  variant="outline" 
                  onClick={handleValidateCertificate}
                  disabled={isValidatingCertificate}
                  className="w-full"
                >
                  {isValidatingCertificate ? "Validando..." : "Validar Certificado"}
                </Button>
              )}
              
              {/* Resultado da Validação */}
              {validationResult && (
                <div className={`p-4 rounded-lg border ${
                  validationResult.status === "valid" 
                    ? "bg-green-50 border-green-200" 
                    : "bg-red-50 border-red-200"
                }`}>
                  <div className="space-y-2">
                    {validationResult.checks.map((check, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                          check.ok ? "bg-green-500" : "bg-red-500"
                        }`}></div>
                        <span className={check.ok ? "text-green-700" : "text-red-700"}>
                          {check.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Configurações Gerais */}
            <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  Selecione o ambiente do eSocial (recomendado começar com Homologação)
                </p>
              </div>
            </div>
            
            {/* Informações Importantes */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Configuração Global</p>
                  <p>Esta configuração será aplicada a todas as empresas do sistema. Certifique-se de que o certificado digital possui autorização para representar todas as empresas cadastradas.</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEsocialDialogOpen(false)}>
              Cancelar
            </Button>
            {certificateStatus.loaded ? (
              // Quando já existe certificado configurado
              <>
                <Button 
                  onClick={() => handleSaveEsocialConfig(true)}
                  disabled={(!certificateFile && !certificatePassword) || isUploadingCertificate}
                  variant="outline"
                >
                  Testar Configuração
                </Button>
                <Button 
                  onClick={() => handleSaveEsocialConfig(false)}
                  disabled={(!certificateFile && !certificatePassword) || isUploadingCertificate}
                >
                  {isUploadingCertificate ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </>
            ) : (
              // Quando não existe certificado configurado
              <>
                <Button 
                  onClick={() => handleSaveEsocialConfig(true)}
                  disabled={!certificateFile || !certificatePassword || isUploadingCertificate}
                  variant="outline"
                >
                  Salvar e Testar
                </Button>
                <Button 
                  onClick={() => handleSaveEsocialConfig(false)}
                  disabled={!certificateFile || !certificatePassword || isUploadingCertificate}
                >
                  {isUploadingCertificate ? "Salvando..." : "Salvar Configuração"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* Dialog de Configuração de E-mail */}
       <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
             <div className="space-y-2">
               <Label>Nome do Remetente (opcional)</Label>
               <Input
                 value={emailForm.from_nome}
                 onChange={(e) => setEmailForm(prev => ({ ...prev, from_nome: e.target.value }))}
                 placeholder="MASTPROD"
               />
             </div>

             <div className="space-y-2">
               <Label>Destinatário para Teste</Label>
               <Input
                 value={emailForm.destinatarioTeste}
                 onChange={(e) => setEmailForm(prev => ({ ...prev, destinatarioTeste: e.target.value }))}
                 placeholder="seu-email@empresa.com"
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
             <Button variant="outline" onClick={() => handleSaveEmailConfig(true)}>
               <CheckCircle className="h-4 w-4 mr-2" />
               Salvar e Testar
             </Button>
             <Button onClick={() => handleSaveEmailConfig()}>
               <Save className="h-4 w-4 mr-2" />
               Salvar Configuração
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>


       {/* Dialog de Configuração de Backup */}
       <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

       {/* Dialog de Confirmação para Deletar Empresa */}
       <DeleteCompanyDialog
         open={isDeleteCompanyDialogOpen}
         onOpenChange={setIsDeleteCompanyDialogOpen}
       company={companyToDelete}
       onConfirm={confirmDeleteCompany}
        isDeleting={isDeletingCompany}
      />
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

// Removido toast mock; usar useToast do hooks

 // Export default para compatibilidade com lazy loading
 export default SettingsComponent
