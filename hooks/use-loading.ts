"use client"

import { useState, useCallback } from "react"

interface UseLoadingOptions {
  initialState?: boolean
}

interface UseLoadingReturn {
  isLoading: boolean
  startLoading: () => void
  stopLoading: () => void
  withLoading: <T>(asyncFn: () => Promise<T>) => Promise<T>
}

/**
 * Hook padronizado para gerenciar estados de loading
 * @param options - Opções de configuração
 * @returns Objeto com estado e funções de controle de loading
 */
export function useLoading(options: UseLoadingOptions = {}): UseLoadingReturn {
  const { initialState = false } = options
  const [isLoading, setIsLoading] = useState(initialState)

  const startLoading = useCallback(() => {
    setIsLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  const withLoading = useCallback(async (asyncFn: () => Promise<any>): Promise<any> => {
    try {
      setIsLoading(true)
      return await asyncFn()
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  }
}
