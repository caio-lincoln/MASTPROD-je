"use client"

import { useEffect } from "react"
import { preloadCriticalModules } from "@/components/lazy-module-loader"

export function ModulePreloader() {
  useEffect(() => {
    const preloadTimer = setTimeout(() => {
      preloadCriticalModules()
    }, 1000) // Wait 1 second after initial load

    const handleUserInteraction = () => {
      preloadCriticalModules()
      // Remove listeners after first interaction
      document.removeEventListener("mouseenter", handleUserInteraction)
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }

    document.addEventListener("mouseenter", handleUserInteraction, { once: true })
    document.addEventListener("click", handleUserInteraction, { once: true })
    document.addEventListener("keydown", handleUserInteraction, { once: true })

    return () => {
      clearTimeout(preloadTimer)
      document.removeEventListener("mouseenter", handleUserInteraction)
      document.removeEventListener("click", handleUserInteraction)
      document.removeEventListener("keydown", handleUserInteraction)
    }
  }, [])

  return null // This component doesn't render anything
}
