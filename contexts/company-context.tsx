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
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadUserAndCompanies = async () => {
      try {
        setIsLoading(true)

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
                id: uc.empresas.id,
                name: uc.empresas.nome,
                cnpj: uc.empresas.cnpj || "",
                address: uc.empresas.endereco || "",
                phone: uc.empresas.telefone || "",
                email: uc.empresas.email || "",
                logo: uc.empresas.logo_url || undefined,
                isActive: uc.empresas.status,
                createdAt: new Date(uc.empresas.created_at),
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem("selectedCompanyId")
        }
      } else if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        loadUserAndCompanies()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

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
    if (!user) return null

    try {
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

      // Criar relacionamento usuário-empresa
      const { error: relationError } = await supabase.from("usuario_empresas").insert({
        user_id: user.id,
        empresa_id: newCompany.id,
        role: "admin",
      })

      if (relationError) {
        console.error("Erro ao criar relacionamento usuário-empresa:", relationError)
        return null
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
