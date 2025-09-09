import type { SWRConfiguration } from "swr"
import { createBrowserClient } from "@/lib/supabase/client"

export const swrConfig: SWRConfiguration = {
  // Cache for 5 minutes by default
  dedupingInterval: 5 * 60 * 1000,
  // Revalidate on focus after 1 minute
  focusThrottleInterval: 60 * 1000,
  // Retry failed requests up to 3 times
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  // Revalidate when window regains focus
  revalidateOnFocus: true,
  // Revalidate when network reconnects
  revalidateOnReconnect: true,
  // Don't revalidate on mount if data exists and is fresh
  revalidateIfStale: false,
  // Keep data fresh for 5 minutes
  refreshInterval: 5 * 60 * 1000,
  // Global error handler
  onError: (error) => {
    console.error("SWR Error:", error)
  },
  // Global success handler for debugging
  onSuccess: (data, key) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`SWR Success for ${key}:`, data)
    }
  },
}

export const supabaseFetcher = async (key: string) => {
  const supabase = createBrowserClient()

  // Parse the cache key to extract query information
  const [table, query, filters] = key.split("|")

  if (!table) {
    throw new Error("Invalid cache key: missing table name")
  }

  let queryBuilder = supabase.from(table).select(query || "*")

  // Apply filters if provided
  if (filters) {
    try {
      const filterObj = JSON.parse(filters)
      Object.entries(filterObj).forEach(([column, value]) => {
        if (Array.isArray(value)) {
          queryBuilder = queryBuilder.in(column, value)
        } else if (typeof value === "object" && value !== null) {
          // Handle complex filters like gte, lte, etc.
          Object.entries(value).forEach(([operator, operatorValue]) => {
            queryBuilder = (queryBuilder as any)[operator](column, operatorValue)
          })
        } else {
          queryBuilder = queryBuilder.eq(column, value)
        }
      })
    } catch (error) {
      console.warn("Failed to parse filters:", filters, error)
    }
  }

  const { data, error } = await queryBuilder

  if (error) {
    throw error
  }

  return data
}

export const cacheKeys = {
  funcionarios: (empresaId: string, filters?: Record<string, any>) =>
    `funcionarios|*|${JSON.stringify({ empresa_id: empresaId, ...filters })}`,

  examesAso: (empresaId: string, filters?: Record<string, any>) =>
    `exames_aso|*|${JSON.stringify({ empresa_id: empresaId, ...filters })}`,

  naoConformidades: (empresaId: string, filters?: Record<string, any>) =>
    `nao_conformidades|*|${JSON.stringify({ empresa_id: empresaId, ...filters })}`,

  treinamentos: (empresaId: string, filters?: Record<string, any>) =>
    `treinamento_funcionarios|*|${JSON.stringify({ empresa_id: empresaId, ...filters })}`,

  gestaoRiscos: (empresaId: string, filters?: Record<string, any>) =>
    `gestao_riscos|*|${JSON.stringify({ empresa_id: empresaId, ...filters })}`,

  entregas_epi: (empresaId: string, filters?: Record<string, any>) =>
    `entregas_epi|*|${JSON.stringify({ empresa_id: empresaId, ...filters })}`,

  // Dashboard specific cache keys
  dashboardStats: (empresaId: string) => `dashboard-stats-${empresaId}`,

  // Count queries
  count: (table: string, empresaId: string, filters?: Record<string, any>) =>
    `${table}-count|id|${JSON.stringify({ empresa_id: empresaId, ...filters })}`,
}

export const cacheInvalidation = {
  // Invalidate all data for a specific company
  invalidateCompany: (mutate: any, empresaId: string) => {
    const patterns = [
      `funcionarios|*|*${empresaId}*`,
      `exames_aso|*|*${empresaId}*`,
      `nao_conformidades|*|*${empresaId}*`,
      `treinamento_funcionarios|*|*${empresaId}*`,
      `gestao_riscos|*|*${empresaId}*`,
      `entregas_epi|*|*${empresaId}*`,
      `dashboard-stats-${empresaId}`,
    ]

    patterns.forEach((pattern) => {
      mutate((key) => typeof key === "string" && key.includes(empresaId), undefined, { revalidate: true })
    })
  },

  // Invalidate specific table data
  invalidateTable: (mutate: any, table: string, empresaId: string) => {
    mutate((key) => typeof key === "string" && key.startsWith(table) && key.includes(empresaId), undefined, {
      revalidate: true,
    })
  },

  // Invalidate dashboard data
  invalidateDashboard: (mutate: any, empresaId: string) => {
    mutate(cacheKeys.dashboardStats(empresaId), undefined, { revalidate: true })
  },
}
