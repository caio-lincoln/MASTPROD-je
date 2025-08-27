"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

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
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

// Mock data para demonstração
const mockCompanies: Company[] = [
  {
    id: "1",
    name: "Empresa Alpha Ltda",
    cnpj: "12.345.678/0001-90",
    address: "Rua das Flores, 123 - São Paulo/SP",
    phone: "(11) 3456-7890",
    email: "contato@alpha.com.br",
    isActive: true,
    createdAt: new Date("2023-01-15"),
  },
  {
    id: "2",
    name: "Beta Indústria S.A.",
    cnpj: "98.765.432/0001-10",
    address: "Av. Industrial, 456 - Rio de Janeiro/RJ",
    phone: "(21) 2345-6789",
    email: "admin@beta.com.br",
    isActive: true,
    createdAt: new Date("2023-02-20"),
  },
  {
    id: "3",
    name: "Gamma Serviços",
    cnpj: "11.222.333/0001-44",
    address: "Rua do Comércio, 789 - Belo Horizonte/MG",
    phone: "(31) 3456-7890",
    email: "info@gamma.com.br",
    isActive: true,
    createdAt: new Date("2023-03-10"),
  },
]

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simular carregamento das empresas
    const loadCompanies = async () => {
      setIsLoading(true)
      // Simular delay de API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setCompanies(mockCompanies)

      // Verificar se há empresa salva no localStorage
      const savedCompanyId = localStorage.getItem("selectedCompanyId")
      if (savedCompanyId) {
        const savedCompany = mockCompanies.find((c) => c.id === savedCompanyId)
        if (savedCompany) {
          setSelectedCompany(savedCompany)
        }
      }

      setIsLoading(false)
    }

    loadCompanies()
  }, [])

  const handleSetSelectedCompany = (company: Company | null) => {
    setSelectedCompany(company)
    if (company) {
      localStorage.setItem("selectedCompanyId", company.id)
    } else {
      localStorage.removeItem("selectedCompanyId")
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
