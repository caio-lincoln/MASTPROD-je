"use client"

import useSWR, { mutate } from "swr"
import { supabaseFetcher, cacheKeys, cacheInvalidation } from "@/lib/cache/swr-config"
import { useCompany } from "@/contexts/company-context"
import { useCallback, useMemo } from "react"

interface UseSupabaseQueryOptions {
  enabled?: boolean
  refreshInterval?: number
  revalidateOnFocus?: boolean
  filters?: Record<string, unknown>
}

export function useSupabaseQuery<T = unknown>(table: string, options: UseSupabaseQueryOptions = {}) {
  const { selectedCompany } = useCompany()
  const { enabled = true, filters, ...swrOptions } = options

  const cacheKey = useMemo(() => {
    if (!selectedCompany?.id || !enabled) return null

    switch (table) {
      case "funcionarios":
        return cacheKeys.funcionarios(selectedCompany.id, filters)
      case "exames_aso":
        return cacheKeys.examesAso(selectedCompany.id, filters)
      case "nao_conformidades":
        return cacheKeys.naoConformidades(selectedCompany.id, filters)
      case "treinamento_funcionarios":
        return cacheKeys.treinamentos(selectedCompany.id, filters)
      case "gestao_riscos":
        return cacheKeys.gestaoRiscos(selectedCompany.id, filters)
      case "entregas_epi":
        return cacheKeys.entregas_epi(selectedCompany.id, filters)
      default:
        return `${table}|*|${JSON.stringify({ empresa_id: selectedCompany.id, ...filters })}`
    }
  }, [table, selectedCompany?.id, enabled, filters])

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: mutateSingle,
  } = useSWR<T[]>(cacheKey, (key: string) => supabaseFetcher(key) as Promise<T[]>, {
    ...swrOptions,
    revalidateOnMount: true,
  })

  const optimisticUpdate = useCallback(
    async (updateFn: (currentData: T[]) => T[], asyncUpdate?: () => Promise<void>) => {
      if (!cacheKey) return

      try {
        // Optimistically update the cache
        await mutateSingle((currentData: T[] | undefined) => {
          if (!currentData) return []
          return updateFn(currentData)
        }, false)

        // Perform the actual update if provided
        if (asyncUpdate) {
          await asyncUpdate()
        }

        // Revalidate to ensure consistency
        await mutateSingle()
      } catch (error) {
        // Revert on error
        await mutateSingle()
        throw error
      }
    },
    [cacheKey, mutateSingle],
  )

  const invalidateCache = useCallback(() => {
    if (selectedCompany?.id) {
      cacheInvalidation.invalidateTable(mutate, table, selectedCompany.id)
    }
  }, [table, selectedCompany?.id])

  const invalidateAll = useCallback(() => {
    if (selectedCompany?.id) {
      cacheInvalidation.invalidateCompany(mutate, selectedCompany.id)
    }
  }, [selectedCompany?.id])

  return {
    data: data || [],
    error,
    isLoading,
    isValidating,
    mutate: mutateSingle,
    optimisticUpdate,
    invalidateCache,
    invalidateAll,
    // Computed properties
    isEmpty: !isLoading && !data?.length,
    isError: !!error,
  }
}

export function useDashboardData() {
  const { selectedCompany } = useCompany()

  const cacheKey = useMemo(() => {
    return selectedCompany?.id ? cacheKeys.dashboardStats(selectedCompany.id) : null
  }, [selectedCompany?.id])

  const {
    data,
    error,
    isLoading,
    mutate: mutateDashboard,
  } = useSWR(
    cacheKey,
    async () => {
      if (!selectedCompany?.id) return null

      // This would be replaced with the actual dashboard data fetching logic
      // For now, return null to indicate it should use the existing logic
      return null
    },
    {
      refreshInterval: 2 * 60 * 1000, // Refresh every 2 minutes
      revalidateOnFocus: true,
    },
  )

  const invalidateDashboard = useCallback(() => {
    if (selectedCompany?.id) {
      cacheInvalidation.invalidateDashboard(mutate, selectedCompany.id)
    }
  }, [selectedCompany?.id])

  return {
    data,
    error,
    isLoading,
    mutate: mutateDashboard,
    invalidateDashboard,
    isEmpty: !isLoading && !data,
    isError: !!error,
  }
}

export function useSupabaseCount(table: string, filters?: Record<string, unknown>, options: UseSupabaseQueryOptions = {}) {
  const { selectedCompany } = useCompany()
  const { enabled = true } = options

  const cacheKey = useMemo(() => {
    if (!selectedCompany?.id || !enabled) return null
    return cacheKeys.count(table, selectedCompany.id, filters)
  }, [table, selectedCompany?.id, enabled, filters])

  const {
    data,
    error,
    isLoading,
    mutate: mutateCount,
  } = useSWR<number>(
    cacheKey,
    async () => {
      if (!selectedCompany?.id) return 0

      const { supabaseFetcher } = await import("@/lib/cache/swr-config")
      const result = await supabaseFetcher(cacheKey!)
      return Array.isArray(result) ? result.length : 0
    },
    {
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    },
  )

  return {
    count: data || 0,
    error,
    isLoading,
    mutate: mutateCount,
    isError: !!error,
  }
}
