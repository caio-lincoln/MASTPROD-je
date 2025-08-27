"use client"

import { useCompany } from "@/contexts/company-context"
import { useMemo } from "react"

export interface BaseEntity {
  id: string
  companyId: string
  [key: string]: any
}

export function useCompanyData<T extends BaseEntity>(data: T[]): T[] {
  const { selectedCompany } = useCompany()

  return useMemo(() => {
    if (!selectedCompany) return []
    return data.filter((item) => item.companyId === selectedCompany.id)
  }, [data, selectedCompany])
}

export function useCompanyFilter() {
  const { selectedCompany } = useCompany()

  const filterByCompany = useMemo(() => {
    return <T extends BaseEntity>(data: T[]): T[] => {
      if (!selectedCompany) return []
      return data.filter((item) => item.companyId === selectedCompany.id)
    }
  }, [selectedCompany])

  return {
    selectedCompany,
    filterByCompany,
    hasCompanySelected: !!selectedCompany,
  }
}
