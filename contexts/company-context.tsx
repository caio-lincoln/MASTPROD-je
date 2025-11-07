"use client"

import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export interface Company {
  id: string
  name: string
  cnpj: string
  address: string
  phone: string
  email: string
  logo?: string
  isActive: boolean
  createdAt: Date
}

interface CompanyContextType {
  selectedCompany: Company | null
  companies: Company[]
  setSelectedCompany: (company: Company | null) => void
  setCompanies: (companies: Company[]) => void
  isLoading: boolean
  user: User | null
  addCompany: (company: Omit<Company, "id" | "createdAt">) => Promise<Company | null>
  updateCompany: (id: string, updates: Partial<Company>) => Promise<boolean>
  deleteCompany: (id: string) => Promise<boolean>
  loadAllCompanies: () => Promise<void>
  showAllCompanies: boolean
  setShowAllCompanies: (show: boolean) => void
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showAllCompanies, setShowAllCompanies] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadUserAndCompanies = async () => {
      try {
        setIsLoading(true)
        
        // Se já estamos mostrando todas as empresas, carregar diretamente todas
        if (showAllCompanies) {
          await loadAllCompanies()
          setIsLoading(false)
          return
        }

        // Verificar usuário autenticado
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser()

        setUser(currentUser)

        if (currentUser) {
          // Buscar empresas do usuário através da tabela usuario_empresas
          const { data: userCompanies, error: userCompaniesError } = await supabase
            .from("usuario_empresas")
            .select(`
              empresa_id,
              role,
              empresas (
                id,
                nome,
                cnpj,
                endereco,
                telefone,
                email,
                logo_url,
                status,
                created_at
              )
            `)
            .eq("user_id", currentUser.id)

          if (userCompaniesError) {
            console.error("Erro ao buscar empresas do usuário:", userCompaniesError)
            setIsLoading(false)
            return
          }

          if (!userCompanies || userCompanies.length === 0) {
            // Fallback: buscar todas as empresas se o usuário não tem associações
            const { data: allCompanies, error: allCompaniesError } = await supabase
              .from("empresas")
              .select("id, nome, cnpj, endereco, telefone, email, logo_url, status, created_at")
              .eq("status", true)

            if (allCompaniesError) {
              console.error("Erro ao buscar todas as empresas:", allCompaniesError)
              setIsLoading(false)
              return
            }

            const formattedAllCompanies: Company[] =
              allCompanies?.map((empresa) => ({
                id: empresa.id,
                name: empresa.nome,
                cnpj: empresa.cnpj || "",
                address: empresa.endereco || "",
                phone: empresa.telefone || "",
                email: empresa.email || "",
                logo: empresa.logo_url || undefined,
                isActive: empresa.status,
                createdAt: new Date(empresa.created_at),
              })) || []

            setCompanies(formattedAllCompanies)

            if (formattedAllCompanies.length > 0 && !selectedCompany) {
              const savedCompanyId = typeof window !== 'undefined' ? localStorage.getItem("selectedCompanyId") : null
              const companyToSelect = savedCompanyId
                ? formattedAllCompanies.find((c) => c.id === savedCompanyId) || formattedAllCompanies[0]
                : formattedAllCompanies[0]

              setSelectedCompany(companyToSelect)
              if (typeof window !== 'undefined') {
                localStorage.setItem("selectedCompanyId", companyToSelect.id)
              }
            }

            setIsLoading(false)
            return
          }

          // Transformar dados para o formato esperado
          const formattedCompanies: Company[] =
            userCompanies
              ?.filter((uc) => uc.empresas)
              .map((uc) => ({
                id: (uc.empresas as any).id,
                name: (uc.empresas as any).nome,
                cnpj: (uc.empresas as any).cnpj || "",
                address: (uc.empresas as any).endereco || "",
                phone: (uc.empresas as any).telefone || "",
                email: (uc.empresas as any).email || "",
                logo: (uc.empresas as any).logo_url || undefined,
                isActive: (uc.empresas as any).status,
                createdAt: new Date((uc.empresas as any).created_at),
              })) || []

          setCompanies(formattedCompanies)

          if (formattedCompanies.length > 0) {
            // Verificar se há empresa salva no localStorage
            const savedCompanyId = typeof window !== 'undefined' ? localStorage.getItem("selectedCompanyId") : null
            let companyToSelect: Company | null = null

            if (savedCompanyId) {
              companyToSelect = formattedCompanies.find((c) => c.id === savedCompanyId) || null
            }

            // Se não encontrou empresa salva ou não há empresa salva, selecionar a primeira
            if (!companyToSelect && formattedCompanies.length > 0) {
              companyToSelect = formattedCompanies[0]
            }

            if (companyToSelect) {
              setSelectedCompany(companyToSelect)
              if (typeof window !== 'undefined') {
                localStorage.setItem("selectedCompanyId", companyToSelect.id)
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao carregar usuário e empresas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserAndCompanies()

    // Escutar mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null)
        setCompanies([])
        setSelectedCompany(null)
        setShowAllCompanies(false) // Reset showAllCompanies
        if (typeof window !== 'undefined') {
          localStorage.removeItem("selectedCompanyId")
        }
      } else if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        // Carregar conforme preferência atual
        if (showAllCompanies) {
          loadAllCompanies()
        } else {
          loadUserAndCompanies()
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [showAllCompanies]) // Adicionar showAllCompanies como dependência

  const handleSetSelectedCompany = (company: Company | null) => {
    setSelectedCompany(company)
    if (company) {
      if (typeof window !== 'undefined') {
        localStorage.setItem("selectedCompanyId", company.id)
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem("selectedCompanyId")
      }
    }
  }

  const addCompany = async (companyData: Omit<Company, "id" | "createdAt">): Promise<Company | null> => {
    try {
      // Verificar se o usuário está autenticado
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error("Erro de autenticação:", authError)
        return null
      }

      if (!currentUser) {
        console.error("Usuário não autenticado")
        return null
      }

      // Verificar se o usuário é super admin
      const { data: isSuperAdmin, error: superAdminError } = await supabase
        .rpc('is_super_admin')

      if (superAdminError) {
        console.error("Erro ao verificar super admin:", superAdminError)
      }

      console.log("Usuário é super admin:", isSuperAdmin)
      console.log("Dados da empresa a ser criada:", companyData)

      // Inserir empresa
      const { data: newCompany, error: companyError } = await supabase
        .from("empresas")
        .insert({
          nome: companyData.name,
          cnpj: companyData.cnpj,
          endereco: companyData.address,
          telefone: companyData.phone,
          email: companyData.email,
          logo_url: companyData.logo,
          status: companyData.isActive,
        })
        .select()
        .single()

      if (companyError) {
        console.error("Erro ao criar empresa:", companyError)
        return null
      }

      console.log("Empresa criada com sucesso:", newCompany)

      // Criar relacionamento usuário-empresa apenas se não for super admin
      // Super admins podem criar empresas sem se associar automaticamente
      if (!isSuperAdmin) {
        const { error: relationError } = await supabase.from("usuario_empresas").insert({
          user_id: currentUser.id,
          empresa_id: newCompany.id,
          role: "admin",
        })

        if (relationError) {
          console.error("Erro ao criar relacionamento usuário-empresa:", relationError)
          return null
        }
        console.log("Relacionamento usuário-empresa criado")
      } else {
        console.log("Super admin - relacionamento não criado automaticamente")
      }

      const formattedCompany: Company = {
        id: newCompany.id,
        name: newCompany.nome,
        cnpj: newCompany.cnpj || "",
        address: newCompany.endereco || "",
        phone: newCompany.telefone || "",
        email: newCompany.email || "",
        logo: newCompany.logo_url || undefined,
        isActive: newCompany.status,
        createdAt: new Date(newCompany.created_at),
      }

      setCompanies((prev) => [...prev, formattedCompany])
      
      // Atualizar o estado do usuário se necessário
      if (!user) {
        setUser(currentUser)
      }
      
      return formattedCompany
    } catch (error) {
      console.error("Erro ao adicionar empresa:", error)
      return null
    }
  }

  const updateCompany = async (id: string, updates: Partial<Company>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: updates.name,
          cnpj: updates.cnpj,
          endereco: updates.address,
          telefone: updates.phone,
          email: updates.email,
          logo_url: updates.logo,
          status: updates.isActive,
        })
        .eq("id", id)

      if (error) {
        console.error("Erro ao atualizar empresa:", error)
        return false
      }

      // Atualizar estado local
      setCompanies((prev) => prev.map((company) => (company.id === id ? { ...company, ...updates } : company)))

      // Atualizar empresa selecionada se for a mesma
      if (selectedCompany?.id === id) {
        setSelectedCompany((prev) => (prev ? { ...prev, ...updates } : null))
      }

      return true
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error)
      return false
    }
  }

  const deleteCompany = async (id: string): Promise<boolean> => {
    try {
      // Com as constraints CASCADE configuradas, podemos deletar diretamente a empresa
      // Todos os registros relacionados serão automaticamente removidos
      const { error } = await supabase.from("empresas").delete().eq("id", id)

      if (error) {
        console.error("Erro ao deletar empresa:", error)
        return false
      }

      // Atualizar estado local
      setCompanies((prev) => prev.filter((company) => company.id !== id))

      // Limpar empresa selecionada se for a mesma
      if (selectedCompany?.id === id) {
        setSelectedCompany(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem("selectedCompanyId")
        }
      }

      return true
    } catch (error) {
      console.error("Erro ao deletar empresa:", error)
      return false
    }
  }

  const loadAllCompanies = async (): Promise<void> => {
    try {
      setIsLoading(true)
      console.log("Carregando todas as empresas...")
      
      // Buscar todas as empresas ativas
      const { data: allCompanies, error } = await supabase
        .from("empresas")
        .select("id, nome, cnpj, endereco, telefone, email, logo_url, status, created_at")
        .eq("status", true)
        .order("created_at", { ascending: false })

      console.log("Dados recebidos do Supabase:", allCompanies)
      console.log("Erro do Supabase:", error)

      if (error) {
        console.error("Erro ao buscar todas as empresas:", error)
        return
      }

      const formattedCompanies: Company[] =
        allCompanies?.map((empresa) => ({
          id: empresa.id,
          name: empresa.nome,
          cnpj: empresa.cnpj || "",
          address: empresa.endereco || "",
          phone: empresa.telefone || "",
          email: empresa.email || "",
          logo: empresa.logo_url || undefined,
          isActive: empresa.status,
          createdAt: new Date(empresa.created_at),
        })) || []

      console.log("Empresas formatadas:", formattedCompanies)
      console.log("Total de empresas:", formattedCompanies.length)

      setCompanies(formattedCompanies)
      setShowAllCompanies(true)
      console.log("Estado atualizado - showAllCompanies:", true)
    } catch (error) {
      console.error("Erro ao carregar todas as empresas:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <CompanyContext.Provider
      value={{
        selectedCompany,
        companies,
        setSelectedCompany: handleSetSelectedCompany,
        setCompanies,
        isLoading,
        user,
        addCompany,
        updateCompany,
        deleteCompany,
        loadAllCompanies,
        showAllCompanies,
        setShowAllCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error("useCompany must be used within a CompanyProvider")
  }
  return context
}
