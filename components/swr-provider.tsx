"use client"

import { SWRConfig } from "swr"
import { swrConfig } from "@/lib/cache/swr-config"
import type { ReactNode } from "react"

interface SWRProviderProps {
  children: ReactNode
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  )
}
