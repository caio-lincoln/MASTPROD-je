"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"

interface MobileSidebarOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebarOverlay({ isOpen, onClose }: MobileSidebarOverlayProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }

    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      onClick={onClose}
      aria-hidden="true"
    />
  )
}
